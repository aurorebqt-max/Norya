#!/usr/bin/env python3
"""Read-only source analysis; outputs only to the private chapter directory."""
import argparse
import base64
from collections import Counter
import html
import json
import re
from pathlib import Path
from urllib.parse import quote
import os
from pypdf import PdfReader
import pipeline as p


def tokens(text):
    return re.findall(r'\w+|[^\w\s]', text, re.UNICODE)


def text_of(block):
    return '\n'.join(''.join(s['text'] for s in line['spans']) for line in block['lines'])


def analyse_blocks(blocks, independent, width, height):
    """Heuristics are alerts, never corrections or attestations of source fidelity."""
    other = Counter(tokens(independent))
    whole = Counter(token for block in blocks for token in tokens(text_of(block)))
    excess = whole - other
    repeated = Counter(text_of(b).strip() for b in blocks)
    results = []
    for index, block in enumerate(blocks):
        text = text_of(block)
        bbox = block['bbox']
        reasons = []
        if any(t in excess for t in tokens(text)):
            reasons.append('independent-extractor-disagreement')
        if '\ufffd' in text or any(ord(c) < 32 and c not in '\n\t\r' for c in text):
            reasons.append('unrecognized-character')
        if repeated[text.strip()] > 1 and len(text.strip()) > 12:
            reasons.append('repeated-block-candidate')
        if not (0 <= bbox[0] <= bbox[2] <= width + 1 and 0 <= bbox[1] <= bbox[3] <= height + 1):
            reasons.append('outside-page')
        # An upward jump within the same horizontal lane may invert reading order.
        if index:
            previous = blocks[index-1]['bbox']
            overlap = min(bbox[2], previous[2]) - max(bbox[0], previous[0])
            if overlap > min(bbox[2]-bbox[0], previous[2]-previous[0]) * .5 and bbox[1] < previous[1] - 20:
                reasons.append('reading-order-jump')
        if any(abs(line['dir'][1]) > .1 for line in block['lines']):
            reasons.append('rotated-text')
        # Multi-lane lines in one block often belong to a table or a composite diagram.
        lanes = {round(line['bbox'][0] / 30) for line in block['lines']}
        if len(lanes) >= 3:
            reasons.append('multiple-text-lanes')
        if re.search(r'\d', text):
            reasons.append('numbers-or-units-to-visually-check')
        if re.search(r'(?:Cadran|Fig\.|Figura)', text, re.I):
            reasons.append('table-box-or-figure-reference')
        structural = set(reasons) - {'numbers-or-units-to-visually-check', 'table-box-or-figure-reference'}
        priority = 'high' if structural else 'medium' if reasons else 'page-review'
        results.append({'id': block['id'], 'bbox': bbox, 'priority': priority,
                        'automatedStatus': 'alerts' if reasons else 'no-heuristic-alert',
                        'humanStatus': 'pending', 'reasons': reasons,
                        'checks': ['geometry', 'repetition', 'reading-order', 'independent-token-comparison', 'numeric-content']})
    return results, {'sourceTokensAbsentFromIndependent': dict(excess),
                     'independentTokensAbsentFromSource': dict(other - whole)}


def run(output):
    output = p.private_path(output)
    verification = p.verify(output)
    if verification['errors'] or any(page['technicalErrors'] for page in verification['pages']):
        raise ValueError('Technical verification failed; analysis/export blocked.')
    manifest = json.loads((output / 'manifest.json').read_text())
    source_path = p.private_path(p.PRIVATE / manifest['source']['file'])
    original = p.pymupdf.open(source_path)
    independent = PdfReader(source_path)
    pages, packet_pages = [], []
    for entry in manifest['pages']:
        printed, number = entry['printedPage'], entry['pdfPage']
        folder = output / str(printed)
        blocks = json.loads((folder / 'blocks.json').read_text())
        independent_text = independent.pages[number - 1].extract_text() or ''
        (folder / 'independent-pypdf.txt').write_text(independent_text, encoding='utf-8')
        checked, differences = analyse_blocks(blocks, independent_text, entry['size'][2], entry['size'][3])
        single = p.pymupdf.open()
        single.insert_pdf(original, from_page=number - 1, to_page=number - 1)
        pdf_bytes = single.tobytes(garbage=4, deflate=True)
        single.close()
        with p.pymupdf.open(stream=pdf_bytes, filetype='pdf') as isolated:
            rendered = isolated[0].get_pixmap(matrix=p.pymupdf.Matrix(2, 2), alpha=False)
            stored = p.pymupdf.Pixmap(str(folder / 'original.png'))
            if (rendered.width, rendered.height, rendered.samples) != (stored.width, stored.height, stored.samples):
                raise ValueError(f'Isolated PDF render mismatch on printed page {printed}')
        (folder / 'original-page.pdf').write_bytes(pdf_bytes)
        page = {'printedPage': printed, 'pdfPage': number, 'status': 'human-review-pending',
                'technicalComparison': 'passed', 'blocks': checked, 'tokenDifferences': differences,
                'folioDetected': entry['folioDetectedInText'],
                'originalPdfLink': quote(os.path.relpath(source_path, output)) + f'#page={number}',
                'singlePagePdfLink': f'{printed}/original-page.pdf',
                'counts': dict(Counter(b['priority'] for b in checked)),
                'visualFallback': 'full-original-page', 'textApprovedForFinalDisplay': False}
        pages.append(page)
        packet_pages.append({'printedPage': printed, 'pdfPage': number,
                             'width': entry['size'][2], 'height': entry['size'][3],
                             'image': 'data:image/png;base64,' + base64.b64encode((folder/'original.png').read_bytes()).decode(),
                             'pdf': base64.b64encode(pdf_bytes).decode(),
                             'control': {'status': 'human-review-pending', 'counts': page['counts']}})
    report = {'schemaVersion': 1, 'chapterId': manifest['chapterId'],
              'sourceSha256': manifest['source']['sha256'], 'complete': False,
              'method': 'PyMuPDF reproducibility + pypdf independent text layer + geometric heuristics; no OCR',
              'limits': 'Both engines read the same PDF text layer. Agreement cannot establish visual fidelity. No corrections performed.',
              'pages': pages,
              'totals': dict(Counter(b['priority'] for page in pages for b in page['blocks']))}
    p.write_json(output / 'control-report.json', report)
    packet = {'schemaVersion': 1, 'chapterId': manifest['chapterId'], 'mode': 'original-facsimile-preview',
              'sourceSha256': manifest['source']['sha256'], 'complete': False, 'pages': packet_pages}
    p.write_json(output / 'norya-private-course.json', packet)
    render_report(output, report)
    print(json.dumps({'pages': len(pages), 'totals': report['totals'], 'complete': False}))
    return report


def render_report(output, report):
    parts = []
    for page in report['pages']:
        n = page['printedPage']
        blocks = {b['id']: b for b in json.loads((output / str(n) / 'blocks.json').read_text())}
        rows = []
        for item in sorted(page['blocks'], key=lambda b: {'high':0,'medium':1,'page-review':2}[b['priority']]):
            rows.append(f'<details><summary>{html.escape(item["id"])} · {item["priority"]} · {html.escape(", ".join(item["reasons"]) or "aucune alerte heuristique")}</summary><p>Zone PDF : {item["bbox"]}</p><pre>{html.escape(text_of(blocks[item["id"]]))}</pre></details>')
        parts.append(f'''<section id="p{n}"><h2>Page {n} · PDF {page['pdfPage']}</h2>
        <p>Comparaison technique réussie · validation visuelle en attente · {html.escape(str(page['counts']))}</p>
        <p><a href="{page['originalPdfLink']}">Livre original à cette page</a> · <a href="{page['singlePagePdfLink']}">Page PDF isolée</a> · <a href="{n}/review.json">Grille de validation</a></p>
        <div class="grid"><a href="{n}/original.png"><img loading="lazy" src="{n}/original.png" alt="Page originale {n}"></a><div>{''.join(rows)}</div></div></section>''')
    (output / 'control-report.html').write_text('''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contrôle privé Kumar 8</title>
    <style>body{font:16px/1.5 system-ui;background:#f8f9f5;color:#203d36;margin:24px}main{max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{width:100%}details{background:white;padding:12px;margin:8px 0}pre{white-space:pre-wrap}section{border-top:1px solid #aaa;margin-top:32px}nav{display:flex;flex-wrap:wrap;gap:14px}a{color:#28745b}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style>
    <main><h1>Kumar 8 — contrôle par page</h1><p>Annotations de contrôle séparées du livre. Les alertes sont des candidats, pas des erreurs médicales confirmées. Aucun texte reconstitué n’est validé.</p>
    <p>High : désaccord ou structure suspecte. Medium : chiffres/unités ou référence visuelle. Page-review : aucune alerte détectée, contrôle visuel global encore nécessaire. Les deux moteurs lisent la même couche texte ; ils peuvent partager ses erreurs.</p><nav>'''
    + ''.join(f'<a href="#p{page["printedPage"]}">{page["printedPage"]}</a>' for page in report['pages'])
    + '</nav>' + ''.join(parts) + '</main></html>', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    run(parser.parse_args().output)
