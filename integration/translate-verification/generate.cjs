'use strict';
// Generates a NEW candidate fixture directory only; never overwrites checked-in expectations.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { domain } = require('./runtime/load.cjs');
const { bridge, load } = domain();
const FIXED = '2026-01-01T00:00:00.000Z';
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');
const clean = x => JSON.parse(JSON.stringify(x));
function fixture() {
  // Synthetic one-pixel PNG and synthetic PDF text; no source image/document is read.
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=';
  const pdf = Buffer.from('%PDF-1.4\n% FICTION ONLY - no patient or medical source\n%%EOF\n').toString('base64');
  function part(page, id, lines, role = 'paragraph', suggestedKind) {
    return { id, kind: ['paragraph', 'heading', 'list'].includes(role) ? 'text' : 'visual', role,
      bbox: [20, 40, 480, 180], suggestedKind, status: 'unverified',
      sourceLineIds: lines.map((_, i) => `${page}:${id}:line:${i}`),
      text: lines.map(l => l.map(r => r.text).join('')).join('\n'), lines, reasons: [], image };
  }
  const plain = text => [[{ text, bold: false, italic: false }]];
  const pages = [101, 102, 103].map((printedPage, i) => {
    const parts = [part(printedPage, 'same-block', plain(`Pacient fictiv ${i + 1}. Text de test fără valoare clinică.`))];
    if (i === 0) parts.unshift(part(printedPage, 'title', [[{ text: 'Capitol fictiv', bold: true, italic: false }]], 'heading', 'h1'));
    if (i === 0) parts.push(part(printedPage, 'styled', [[
      { text: 'Exemplu', bold: true, italic: false }, { text: ' ', bold: false, italic: false },
      { text: 'inventat', bold: false, italic: true },
    ], [{ text: 'Linia a doua.', bold: false, italic: false }]]));
    if (i === 0) parts.push(part(printedPage, 'grid', plain('Tabel de test fictiv.'), 'table'));
    if (i === 1) parts.push(part(printedPage, 'section', plain('Secțiune fictivă'), 'heading', 'h2'));
    if (i === 2) parts.push(part(printedPage, 'figure', plain(''), 'figure'));
    return { printedPage, pdfPage: i + 11, width: 600, height: 800, image, pdf,
      control: { status: 'human-review-pending', counts: {} }, parts, sourceLineIds: parts.flatMap(p => p.sourceLineIds) };
  });
  const packet = { schemaVersion: 2, chapterId: 'fiction-contract-01', mode: 'structured-source-draft',
    sourceSha256: sha('Synthetic source; no real PDF'), complete: false, pages };
  const validation = { chapterId: packet.chapterId, complete: false, startedAt: FIXED, lastUpdatedAt: FIXED,
    verifiedPages: 0, totalPages: 3, highPriorityBlocks: 0, mediumPriorityBlocks: 0, verifiedBlocks: 0,
    totalBlocks: pages.reduce((n, p) => n + p.parts.length, 0),
    pages: pages.map(p => ({ printedPage: p.printedPage, pdfPage: p.pdfPage, status: 'in-progress',
      blocks: p.parts.map(b => ({ id: b.id, page: p.printedPage, status: 'pending',
        ...(b.suggestedKind ? { kind: b.suggestedKind } : {}),
        ...(p.printedPage === 101 && b.id === 'same-block' ? { correction: 'Pacient fictiv unu. Corecție de test.',
          correctionHistory: [{ at: FIXED, before: b.text, after: 'Pacient fictiv unu. Corecție de test.' }] } : {}),
        ...(b.id === 'grid' ? { kind: 'table', table: { validated: true, validatedAt: FIXED,
          title: 'Tabel fictiv', notes: 'Date inventate. Nu utilizați clinic.', rowRoles: ['header', 'normal', 'category'], rows: [
            [{ text: 'Antet comun', colSpan: 2, header: true }, { text: '', covered: true }, { text: 'Coloană C', header: true }],
            [{ text: 'Celulă verticală', rowSpan: 2 }, { text: 'Valoare inventată B' }, { text: 'Valoare inventată C' }],
            [{ text: 'Text acoperit păstrat', covered: true }, { text: '' }, { text: 'Ultima celulă' }],
          ] } } : {}) })) })) };
  return { packet, validation };
}
async function build() {
  const files = {}; const { packet, validation } = fixture();
  load('packet').parseSourcePacket(JSON.stringify(packet));
  const snapshot = bridge.translationSnapshot(packet, validation); snapshot.provenance.exportedAt = FIXED;
  files['fixtures/packet-v2.json'] = packet;
  files['fixtures/validation.json'] = validation;
  files['fixtures/norya-source-structure-v2.json'] = snapshot.provenance;
  files['fixtures/snapshot.json'] = snapshot;
  const cases = {};
  for (const [key, scope] of [['chapter', { kind: 'chapter' }], ['page-101', { kind: 'page', printedPage: 101 }], ['page-102', { kind: 'page', printedPage: 102 }]]) {
    const prepared = await bridge.prepareTranslation(snapshot, scope);
    const response = { chapter_id: packet.chapterId, source_revision: prepared.request.sourceRevision,
      translations: prepared.request.blocks.map(b => ({ id: b.id, text: 'FR fictif : ' + b.text, validated: true })) };
    files[`fixtures/request-${key}.json`] = prepared.request;
    files[`fixtures/response-${key}.json`] = response;
    files[`fixtures/publish-${key}.json`] = { sourceRevision: response.source_revision, translations: response.translations };
    files[`expected/french-${key}.json`] = bridge.frenchNodes(prepared, response);
    cases[key] = { scope, chapterRevision: prepared.request.norya.chapterRevision, sourceRevision: prepared.request.sourceRevision,
      units: prepared.request.blocks.length, identities: prepared.request.blocks.map(b => ({ id: b.id, ...b.meta })) };
  }
  const modified = clean(snapshot); modified.nodes.find(n => n.printedPage === 103 && n.blockId === 'same-block').text += ' Modificare fictivă.';
  const revised = await bridge.prepareTranslation(modified, { kind: 'page', printedPage: 101 });
  files['fixtures/snapshot-revised.json'] = modified;
  files['fixtures/request-page-101-revised.json'] = revised.request;
  files['expected/cases.json'] = { ...cases, revised: { sourceRevision: revised.request.sourceRevision,
    chapterRevision: revised.request.norya.chapterRevision, oldResponse: 'fixtures/response-page-101.json', expected: 'reject-stale' } };
  const negative = [];
  for (const [name, change] of [
    ['missing', r => r.translations.pop()], ['duplicate', r => r.translations[0] = r.translations[1]],
    ['unknown', r => r.translations[0].id = '0'.repeat(64)], ['empty', r => r.translations[0].text = ''],
    ['whitespace', r => r.translations[0].text = '\t\n\u00a0'], ['unvalidated', r => r.translations[0].validated = false],
    ['string-validation', r => r.translations[0].validated = 'true'], ['wrong-chapter', r => r.chapter_id = 'fiction-other'],
    ['wrong-revision', r => r.source_revision = '0'.repeat(64)], ['extra', r => r.translations.push({ id: 'f'.repeat(64), text: 'Fictif', validated: true })],
  ]) {
    const response = clean(files['fixtures/response-chapter.json']); change(response);
    files[`fixtures/reject-${name}.json`] = response;
    negative.push({ file: `fixtures/reject-${name}.json`, expected: 'reject', name });
  }
  files['expected/rejections.json'] = negative;
  files['expected/hash-vectors.json'] = [
    { b: 2, a: 1 }, ['page', 101, 'same-block'], 'Știință fictivă 😀', 'é', 'e\u0301', null,
    { z: ['b', 'a'], a: { field: 'cell', row: 1, column: 0 } },
    { chapterRevision: cases.chapter.chapterRevision, scope: { kind: 'chapter' }, contract: 1 },
  ].map(value => { const canonical = bridge.canonical(value); return { value, canonical, sha256: sha(canonical) }; });
  return clean(files);
}
module.exports = { build, fixture };
if (require.main === module) {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: node generate.cjs /path/to/NEW-directory');
  fs.mkdirSync(target); // fails if already exists
  build().then(files => { for (const [name, value] of Object.entries(files)) {
    const file = path.join(target, name); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  } console.log(`${Object.keys(files).length} fictional JSON files generated in new directory.`);
  }).catch(e => { console.error(e); process.exitCode = 1; });
}
