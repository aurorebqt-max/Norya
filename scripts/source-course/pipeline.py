#!/usr/bin/env python3
"""Private, non-generative PDF extraction. No application data imports."""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'references-privees'
CHECKS = ('folio', 'reading_order', 'headings', 'paragraphs', 'lists', 'numbers_units',
          'tables_cells', 'boxes', 'illustrations_captions', 'scope_and_completeness')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(path):
    return sha(path.read_bytes())


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def private_path(path):
    path = path.resolve()
    if not path.is_relative_to(PRIVATE.resolve()):
        raise ValueError('All source and output files must remain inside references-privees/.')
    return path


def scope_from_tematica(document):
    text = document[0].get_text()
    match = re.search(r'CAP\.\s*8\s*-\s*SEPSISUL.*?p\.\s*(\d+)\s*[-–]\s*(\d+)', text, re.S)
    if not match or tuple(map(int, match.groups())) != (151, 168):
        raise ValueError('Unexpected Kumar 8 scope: manually review the supplied Tematica.')
    if not all(term in text for term in ('2026', '2021', 'Hipocrate', '10-a')):
        raise ValueError('Tematica edition/session evidence missing.')
    return {'printedPages': list(range(151, 169)), 'tematicaPdfPage': 1,
            'verbatimEntry': match.group(0), 'editionEvidence': text[:match.start()],
            'exclusionEvidencePage': 2, 'exclusionEvidence': document[1].get_text(),
            'authentication': 'supplied-document; independent-authentication-not-performed'}


def page_content(page):
    # Preserve extractor order and characters; never merge columns, fix OCR or dehyphenate.
    raw = page.get_text('text', sort=False)
    data = page.get_text('dict', sort=False)
    blocks = []
    for number, block in enumerate(data['blocks']):
        if block['type'] != 0:
            continue
        blocks.append({'id': f'block-{number}', 'bbox': block['bbox'],
                       'lines': block['lines']})
    return raw, blocks


def extract(book, tematica, output):
    book, tematica, output = map(private_path, (book, tematica, output))
    if output.exists():
        raise ValueError('Output already exists. Use a new version directory; previous reviews are retained.')
    source = pymupdf.open(book)
    program = pymupdf.open(tematica)
    scope = scope_from_tematica(program)
    if len(source) != 1568:
        raise ValueError('Unexpected PDF edition/layout. Page mapping must be reviewed first.')
    output.mkdir(parents=True)
    manifest = {'schemaVersion': 1, 'chapterId': 'kum-08', 'scope': scope,
                'source': {'file': str(book.relative_to(PRIVATE)), 'sha256': digest(book),
                           'pdfPages': len(source)},
                'tematica': {'file': str(tematica.relative_to(PRIVATE)), 'sha256': digest(tematica)},
                'extractor': {'name': 'PyMuPDF', 'version': pymupdf.__version__,
                              'sort': False, 'ocr': False, 'rewriting': False},
                'mapping': {'offset': 23, 'status': 'requires-visual-confirmation-per-page'},
                'pages': []}
    for printed in scope['printedPages']:
        pdf_number = printed + 23
        page = source[pdf_number - 1]
        folder = output / str(printed)
        folder.mkdir()
        raw, blocks = page_content(page)
        (folder / 'raw.txt').write_bytes(raw.encode('utf-8'))
        write_json(folder / 'blocks.json', blocks)
        # Whole-page render preserves composite diagrams, vector graphics, captions and tables.
        page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False).save(folder / 'original.png')
        candidates = []
        for index, info in enumerate(page.get_image_info()):
            candidates.append({'id': f'image-{index}', 'bbox': info['bbox'],
                               'status': 'candidate-not-semantic-illustration'})
        write_json(folder / 'visual-inventory.json', {
            'rasterCandidates': candidates, 'vectorDrawingCount': len(page.get_drawings()),
            'completeOriginalVisual': 'original.png',
            'semanticInventoryStatus': 'pending',
            'note': 'A full-page scan or image count does not identify all tables, boxes or figures.'})
        folio_found = any(re.search(r'\b' + str(printed) + r'\b', b[4])
                          and (b[1] < 60 or b[3] > page.rect.height - 50)
                          for b in page.get_text('blocks') if b[6] == 0)
        issues = [{'id': 'visual-review', 'detail': 'Every block and visual must be compared against the PDF.'}]
        if not folio_found:
            issues.append({'id': 'folio-not-extracted', 'detail': 'Printed folio absent from extracted margin text.'})
        if '\ufffd' in raw:
            issues.append({'id': 'replacement-characters', 'detail': 'Unrecognized characters in the text layer.'})
        artifacts = {name: digest(folder / name) for name in
                     ('raw.txt', 'blocks.json', 'original.png', 'visual-inventory.json')}
        entry = {'printedPage': printed, 'pdfPage': pdf_number, 'size': list(page.rect),
                 'characters': len(raw), 'blockCount': len(blocks),
                 'folioDetectedInText': folio_found, 'artifacts': artifacts}
        manifest['pages'].append(entry)
        write_json(folder / 'review.json', {
            'sourceSha256': manifest['source']['sha256'], 'artifacts': artifacts,
            'reviewer': '', 'reviewedAt': '', 'checks': {key: 'pending' for key in CHECKS},
            'blockReviews': {b['id']: 'pending' for b in blocks},
            'visualRegions': [], 'issues': issues,
            'note': 'Control metadata only; never textbook content. Preserve unresolved readings verbatim.'})
    write_json(output / 'manifest.json', manifest)
    make_reader(output, manifest)
    return verify(output)


def verify(output):
    output = private_path(output)
    manifest = json.loads((output / 'manifest.json').read_text())
    source_path = private_path(PRIVATE / manifest['source']['file'])
    tematica_path = private_path(PRIVATE / manifest['tematica']['file'])
    errors = []
    if digest(source_path) != manifest['source']['sha256']:
        errors.append('Source PDF fingerprint changed')
    if digest(tematica_path) != manifest['tematica']['sha256']:
        errors.append('Tematica fingerprint changed')
    with pymupdf.open(tematica_path) as program:
        scope = scope_from_tematica(program)
    if scope != manifest['scope']:
        errors.append('Scope differs from original Tematica')
    if manifest['extractor']['version'] != pymupdf.__version__:
        errors.append('Extraction engine version changed; create a new version')
    expected = scope['printedPages']
    actual = [p['printedPage'] for p in manifest['pages']]
    missing = sorted(set(expected) - set(actual))
    if actual != expected:
        errors.append('Page sequence missing, duplicated or outside scope')
    source = pymupdf.open(source_path)
    reports = []
    for entry in manifest['pages']:
        printed = entry['printedPage']
        folder = output / str(printed)
        failures = []
        if entry['pdfPage'] != printed + 23:
            failures.append('Unexpected source page mapping')
        page = source[entry['pdfPage'] - 1]
        raw, blocks = page_content(page)
        for name, checksum in entry['artifacts'].items():
            artifact = folder / name
            if not artifact.is_file() or digest(artifact) != checksum:
                failures.append(f'Missing or modified artifact: {name}')
        if not (folder / 'raw.txt').exists() or (folder / 'raw.txt').read_bytes() != raw.encode('utf-8'):
            failures.append('Text differs from fresh original-PDF extraction')
        if not (folder / 'blocks.json').exists() or json.loads((folder / 'blocks.json').read_text()) != json.loads(json.dumps(blocks)):
            failures.append('Positioned blocks differ from original PDF')
        # Compare decoded pixels, not PNG encoder metadata.
        if (folder / 'original.png').exists():
            rendered = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
            stored = pymupdf.Pixmap(str(folder / 'original.png'))
            if (stored.width, stored.height, stored.samples) != (rendered.width, rendered.height, rendered.samples):
                failures.append('Original visual differs from fresh PDF render')
        review_path = folder / 'review.json'
        review = json.loads(review_path.read_text()) if review_path.exists() else {}
        if review.get('sourceSha256') != manifest['source']['sha256'] or review.get('artifacts') != entry['artifacts']:
            failures.append('Review absent or tied to different source/artifacts')
        pending = [key for key in CHECKS if review.get('checks', {}).get(key) != 'verified']
        pending_blocks = [b['id'] for b in blocks if review.get('blockReviews', {}).get(b['id']) != 'verified']
        issues = review.get('issues', [])
        identity = bool(review.get('reviewer', '').strip() and re.fullmatch(r'\d{4}-\d{2}-\d{2}T.+', review.get('reviewedAt', '')))
        regions = review.get('visualRegions', [])
        regions_valid = bool(regions) and all(
            r.get('kind') in ('table', 'box', 'figure', 'other')
            and len(r.get('bbox', [])) == 4 and r.get('status') == 'verified'
            and r.get('reference') for r in regions)
        verified = not (failures or pending or pending_blocks or issues) and identity and regions_valid
        reports.append({'printedPage': printed, 'pdfPage': entry['pdfPage'],
                        'technicalErrors': failures, 'pendingChecks': pending,
                        'pendingBlocks': pending_blocks, 'issues': issues,
                        'reviewIdentityPresent': identity, 'visualInventoryVerified': regions_valid,
                        'verified': verified})
    report = {'chapterId': manifest['chapterId'], 'expectedPages': len(expected),
              'processedPages': len(actual), 'missingPages': missing, 'errors': errors,
              'verifiedPages': sum(p['verified'] for p in reports),
              'complete': not errors and len(reports) == len(expected) and all(p['verified'] for p in reports),
              'pages': reports,
              'limitation': 'Automated comparison proves reproducibility, not correctness of the PDF text layer. Visual review is required.'}
    write_json(output / 'verification.json', report)
    return report


def make_reader(output, manifest):
    sections = []
    for entry in manifest['pages']:
        number = entry['printedPage']
        text = (output / str(number) / 'raw.txt').read_text()
        sections.append(f'''<section id="p{number}"><h2>Page imprimée {number} · PDF {entry['pdfPage']}</h2>
        <div class="comparison"><a href="{number}/original.png"><img loading="lazy" src="{number}/original.png" alt="Page originale {number}"></a>
        <div><h3>Couche texte brute — non validée</h3><pre>{html.escape(text)}</pre></div></div>
        <aside>Contrôle séparé : <a href="{number}/review.json">observations et grille de vérification</a> ·
        <a href="{number}/blocks.json">blocs et coordonnées</a> · <a href="{number}/visual-inventory.json">inventaire visuel</a></aside></section>''')
    content = '''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Kumar 8 — contrôle privé</title><style>
    body{font:16px system-ui;margin:0;background:#f5f5ef;color:#172b29}header,main{max-width:1500px;margin:auto;padding:24px}
    header{position:sticky;top:0;background:#f5f5ef;border-bottom:1px solid #ccc}nav{display:flex;gap:12px;flex-wrap:wrap}
    a{color:#17635b}section{scroll-margin-top:180px;margin-bottom:40px}img{width:100%;height:auto}
    .comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.7 monospace;background:white;padding:16px}
    aside{padding:16px;background:#fff0cc}@media(max-width:800px){.comparison{grid-template-columns:1fr}header{position:static}}
    </style><header><h1>Kumar 8 · espace privé de comparaison</h1>
    <p>Extraction non validée. Le visuel original fait foi. Les annotations ne font pas partie du livre.</p>
    <p><a href="verification.json">Rapport de fidélité</a> · <a href="manifest.json">Provenance</a></p><nav>'''
    content += ' '.join(f'<a href="#p{p["printedPage"]}">{p["printedPage"]}</a>' for p in manifest['pages'])
    content += '</nav></header><main>' + '\n'.join(sections) + '</main></html>'
    (output / 'review.html').write_text(content, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['extract', 'verify'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--book', type=Path, default=PRIVATE / 'KUMAR EDITABIL.pdf')
    parser.add_argument('--tematica', type=Path, default=PRIVATE / 'rezidentiat-M-2026.pdf')
    args = parser.parse_args()
    result = extract(args.book, args.tematica, args.output) if args.action == 'extract' else verify(args.output)
    print(json.dumps({k: v for k, v in result.items() if k != 'pages'}, ensure_ascii=False, indent=2))
    if args.action == 'verify' and not result['complete']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
