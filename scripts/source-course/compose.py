#!/usr/bin/env python3
"""Compose a private, lossless draft from source PDF blocks and a private layout plan."""
import argparse
import base64
from collections import Counter
import json
from pathlib import Path
import re
import pipeline as p


def all_lines(blocks):
    return [{'id': f'{b["id"]}:line-{i}', 'blockId': b['id'], **line}
            for b in blocks for i, line in enumerate(b['lines'])]


def line_text(line):
    return ''.join(span['text'] for span in line['spans'])


def contains(rect, line):
    box = line['bbox']
    x, y = (box[0] + box[2])/2, (box[1]+box[3])/2
    return rect[0] <= x < rect[2] and rect[1] <= y < rect[3]


def check_partition(regions, width, height):
    area = 0
    for i, region in enumerate(regions):
        x0,y0,x1,y1 = region['bbox']
        if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
            raise ValueError('Invalid layout rectangle')
        area += (x1-x0)*(y1-y0)
        for other in regions[:i]:
            a,b,c,d = other['bbox']
            if min(c,x1)-max(a,x0)>0.01 and min(d,y1)-max(b,y0)>0.01:
                raise ValueError('Overlapping layout rectangles')
    if abs(area-width*height)>0.1:
        raise ValueError('Layout does not cover the entire page')


def compose_page(page, blocks, regions, alerts):
    check_partition(regions, page.rect.width, page.rect.height)
    lines = all_lines(blocks)
    nodes = []
    assigned = []
    def node(kind, role, bbox, source, reasons):
        identity = f'part-{len(nodes)+1}'
        rect = p.pymupdf.Rect(bbox) & page.rect
        visual = page.get_pixmap(matrix=p.pymupdf.Matrix(2,2), clip=rect, alpha=False).tobytes('png')
        nodes.append({'id':identity, 'kind':kind, 'role':role, 'bbox':list(rect),
                      'status':'unverified', 'sourceLineIds':[l['id'] for l in source],
                      'text':'\n'.join(line_text(l) for l in source),
                      'lines': [[{'text':s['text'],'bold':bool(s['flags'] & 16),'italic':bool(s['flags'] & 2)} for s in l['spans']] for l in source],
                      'reasons': sorted(set(reasons)),
                      'image':'data:image/png;base64,'+base64.b64encode(visual).decode()})
        assigned.extend(l['id'] for l in source)
    for region in regions:
        selected = [line for line in lines if contains(region['bbox'],line)]
        if region['kind'] == 'visual':
            node('visual',region['role'],region['bbox'],selected,['original-visual-retained'])
            continue
        groups = {}
        for line in selected:
            box=line['bbox']; zone=region['bbox']
            if box[0]<zone[0]-1 or box[1]<zone[1]-1 or box[2]>zone[2]+1 or box[3]>zone[3]+1:
                raise ValueError(f'Layout boundary cuts source line {line["id"]}')
            groups.setdefault(line['blockId'],[]).append(line)
        # Explicit zone order, then top-to-bottom blocks; source line order remains intact.
        for block_id, source in sorted(groups.items(),key=lambda item:min(l['bbox'][1] for l in item[1])):
            box=[min(l['bbox'][0] for l in source),min(l['bbox'][1] for l in source),
                 max(l['bbox'][2] for l in source),max(l['bbox'][3] for l in source)]
            box=[box[0]-2,box[1]-2,box[2]+2,box[3]+2]
            text='\n'.join(line_text(l) for l in source)
            reasons=alerts.get(block_id,{}).get('reasons',[])
            # Known ambiguous glyph sequence seen in this source; preserve the visual, do not replace it.
            glyph_ambiguity=bool(re.search(r'\b[PpB]-lact',text))
            superscript=any(s['flags'] & 1 for l in source for s in l['spans'])
            fallback=alerts.get(block_id,{}).get('priority')=='high' or glyph_ambiguity or superscript
            if superscript: reasons=reasons+['superscript-layout']
            if glyph_ambiguity: reasons=reasons+['source-glyph-ambiguity']
            sizes=[s['size'] for line in source for s in line['spans'] if s['text'].strip()]
            role='heading' if len(text)<200 and sizes and min(sizes)>=9 else 'list' if re.search(r'[•■]|^\s*\d+\.',text) else 'paragraph'
            node('visual' if fallback else 'text', 'uncertain-text' if fallback else role,box,source,reasons)
    expected=[line['id'] for line in lines]
    if Counter(assigned)!=Counter(expected):
        raise ValueError('Source lines omitted or duplicated')
    lookup={line['id']:line_text(line) for line in lines}
    for part in nodes:
        if part['text']!='\n'.join(lookup[key] for key in part['sourceLineIds']):
            raise ValueError('Source text changed')
    return nodes, expected


def run(output):
    output=p.private_path(output)
    technical=p.verify(output)
    if technical['errors'] or any(page['technicalErrors'] for page in technical['pages']):
        raise ValueError('Source verification failed')
    manifest=json.loads((output/'manifest.json').read_text())
    plan=json.loads((output/'layout-plan.json').read_text())
    if plan['sourceSha256']!=manifest['source']['sha256']:
        raise ValueError('Layout plan is bound to a different PDF')
    report=json.loads((output/'control-report.json').read_text())
    if report['sourceSha256']!=manifest['source']['sha256']:
        raise ValueError('Control report is stale')
    base=json.loads((output/'norya-private-course.json').read_text())
    source=p.pymupdf.open(p.private_path(p.PRIVATE/manifest['source']['file']))
    summary=[]
    for entry, packet_page, analysis in zip(manifest['pages'],base['pages'],report['pages'],strict=True):
        n=entry['printedPage']; pdf=entry['pdfPage']
        if packet_page['printedPage']!=n or analysis['printedPage']!=n:
            raise ValueError('Page order mismatch')
        # Facsimile and PDF bytes must still be the private verified artifacts.
        if base64.b64decode(packet_page['image'].split(',')[1]) != (output/str(n)/'original.png').read_bytes():
            raise ValueError('Facsimile package changed')
        if base64.b64decode(packet_page['pdf']) != (output/str(n)/'original-page.pdf').read_bytes():
            raise ValueError('PDF package changed')
        blocks=json.loads((output/str(n)/'blocks.json').read_text())
        nodes, expected=compose_page(source[pdf-1],blocks,plan['pages'][str(n)],{b['id']:b for b in analysis['blocks']})
        packet_page['parts']=nodes
        packet_page['sourceLineIds']=expected
        packet_page['layoutStatus']='assistant-inspected; human-review-pending'
        stats={'printedPage':n,'pdfPage':pdf,'sourceBlocks':len(blocks),'sourceLines':len(expected),
               'parts':len(nodes),'textParts':sum(x['kind']=='text' for x in nodes),
               'visualParts':sum(x['kind']=='visual' for x in nodes),'omittedLines':0,'duplicateLines':0,
               'exactExtractedCharacters':True,'humanVerified':False}
        summary.append(stats)
    base.update(schemaVersion=2,mode='structured-source-draft',complete=False,
                layoutSha256=p.digest(output/'layout-plan.json'))
    p.write_json(output/'norya-private-course-v2.json',base)
    p.write_json(output/'composition-report.json',{'complete':False,'sourceSha256':manifest['source']['sha256'],
        'pages':summary,'limits':'All source lines preserved exactly. Visual equivalence of text and semantic paragraph boundaries still require review.'})
    print(json.dumps({'pages':len(summary),'textParts':sum(x['textParts'] for x in summary),
        'visualParts':sum(x['visualParts'] for x in summary),'sourceLines':sum(x['sourceLines'] for x in summary),'complete':False}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run(parser.parse_args().output)
