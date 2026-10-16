const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
  return original.call(this, name, ...args);
};
const merges = require('../.test-build/domain/sourceCourse/merges');
const review = require('../.test-build/domain/sourceCourse/verification');
const cls = require('../.test-build/domain/sourceCourse/classification');
const exp = require('../.test-build/domain/sourceCourse/structureExport');

const part = (id, text, role = 'paragraph') => ({ id, role, kind: 'text', text, lines: [[{ text, bold: id === 'p1', italic: false }]],
  bbox: [0, 0, 10, 10], reasons: ['r'], image: 'data:image/png;base64,iVBORw0KGgo=', sourceLineIds: [`${id}-l`] });
const packet = () => ({ chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
  pages: [
    { printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'x', image: 'x', sourceLineIds: [],
      parts: [part('p1', 'Titre'), part('p2', 'Auteur X'), part('p3', 'Text A'), part('p4', 'Text B'), part('p5', 'Text C'), part('p6', 'Dose  5 mg')] },
    { printedPage: 161, pdfPage: 184, width: 100, height: 100, pdf: 'x', image: 'x', sourceLineIds: [],
      parts: [part('p1', 'Text D'), part('p2', 'Section 2')] },
  ] });
const R = (printedPage, blockId) => ({ printedPage, blockId });

function worked(src) {
  let v = review.reconcileReviewValidation(null, src);
  v = cls.setBlockKind(v, R(160, 'p1'), 'h1');
  v = cls.setBlockKind(v, R(160, 'p2'), 'authors');
  v = cls.setBlockKind(v, R(161, 'p2'), 'h2');
  v = cls.setBlockKind(v, R(160, 'p6'), 'table');
  let t = cls.setCellText(cls.tableFromText('Dose  5 mg'), 0, 1, '5 mg/kg');
  t = { ...t, title: 'Tableau 1', notes: 'Note ®' };
  v = cls.decideBlockTable(cls.saveBlockTable(v, R(160, 'p6'), t), R(160, 'p6'), 'validate');
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'p3', text: 'Text A' }, { printedPage: 160, blockId: 'p4', text: 'Text B' }), 'm1');
  const m1 = merges.mergeAtAnchor(v.merges, 160, 'p3');
  v = merges.recordMerge(v, merges.buildMergeDraft('kum-08', [
    { sources: m1.sources, sourceTexts: m1.sourceTexts, text: m1.joinedText, mergeId: 'm1' },
    { sources: [R(160, 'p5')], sourceTexts: ['Text C'], text: 'Text C' },
    { sources: [R(161, 'p1')], sourceTexts: ['Text D'], text: 'Text D' }]), 'm2');
  v = merges.correctMerge(v, 'm2', 'Text A Text B Text C Text D corrigé');
  v.pages = v.pages.map(p => p.printedPage === 160 ? { ...p, blocks: p.blocks.map(b => b.id === 'p2' ? { ...b, status: 'verified', verifiedAt: 'T', notes: 'ok' } : b) } : p);
  v.anomalies = [
    { id: 'a1', chapterId: 'kum-08', manual: 'Kumar', printedPage: 160, pdfPage: 183, blockId: 'p2', blockRole: 'paragraph', blockTextPreview: 'Auteur X',
      description: 'nom coupé', descriptionHistory: [{ description: 'v0', updatedAt: 'T0' }], status: 'resolved', createdAt: 'T1', updatedAt: 'T2' },
    { id: 'a2', chapterId: 'kum-08', manual: 'Kumar', printedPage: 161, pdfPage: 184, blockId: 'p2', blockRole: 'paragraph', blockTextPreview: 'Section 2',
      description: 'ouverte', status: 'open', createdAt: 'T1', updatedAt: 'T1' },
  ];
  return v;
}

test('export complet : contient tout, se réimporte à l’identique, sans doublon', () => {
  const src = packet(); const v = worked(src);
  const data = JSON.parse(JSON.stringify(exp.buildStructureExport(src, v)));
  assert.equal(data.version, 2);
  assert.equal(data.chapter.title, 'Titre'); assert.deepEqual(data.chapter.authors, ['Auteur X']);
  const b = (p, id) => data.blocks.find(x => x.printedPage === p && x.id === id);
  assert.equal(b(160, 'p3').rawText, 'Text A');
  assert.equal(b(160, 'p3').lines[0][0].text, 'Text A'); assert.deepEqual(b(160, 'p3').bbox, [0, 0, 10, 10]);
  assert.equal(b(160, 'p6').table.rows[0][1].text, '5 mg/kg'); assert.equal(b(160, 'p6').table.validated, true);
  assert.equal(data.merges.length, 2); assert.equal(data.activeMergeIds.length, 1);
  assert.equal(data.merges.find(m => m.id === 'm2').sources.length, 4);
  assert.match(data.merges.find(m => m.id === 'm2').joinedText, /corrigé|Text D/);
  assert.equal(data.anomalies.length, 2); assert.equal(data.anomalies[0].descriptionHistory.length, 1);
  assert.match(data.anomalyReportMarkdown, /nom coupé/);
  assert.deepEqual(data.displayOrder.map(o => o.blockId), ['p1', 'p2', 'p3', 'p6', 'p2']);
  assert.equal(data.blocks.length, 8);

  const restored = exp.importStructureExport(JSON.stringify(data), src, review.reconcileReviewValidation(null, src));
  const strip = x => JSON.parse(JSON.stringify({ pages: x.pages, merges: x.merges, mergeLog: x.mergeLog, anomalies: x.anomalies }));
  const a = strip(v), r = strip(restored);
  a.pages.forEach(p => p.blocks.forEach(blk => { for (const k of Object.keys(blk)) if (blk[k] === undefined) delete blk[k]; }));
  assert.deepEqual(r.merges, a.merges); assert.deepEqual(r.anomalies, a.anomalies); assert.deepEqual(r.mergeLog, a.mergeLog);
  for (const [i, p] of a.pages.entries()) for (const [j, blk] of p.blocks.entries()) {
    const got = r.pages[i].blocks[j];
    for (const k of ['id', 'status', 'notes', 'correction', 'kind', 'table', 'verifiedAt']) assert.deepEqual(got[k], blk[k], `${p.printedPage}/${blk.id}/${k}`);
  }
  const again = exp.importStructureExport(data, src, restored);
  assert.equal(again.merges.length, 2); assert.equal(again.anomalies.length, 2);
  assert.deepEqual(exp.buildStructureExport(src, again, undefined, 'T').displayOrder, exp.buildStructureExport(src, v, undefined, 'T').displayOrder);
});

test('anciens exports v1 (sans classification ni champs v2) restent importables', () => {
  const src = packet(); const v = worked(src);
  const old = JSON.parse(JSON.stringify(exp.buildStructureExport(src, v)));
  old.version = 1;
  for (const k of ['chapter', 'progress', 'anomalyReportMarkdown']) delete old[k];
  old.blocks.forEach(x => { for (const k of ['kind', 'kindHistory', 'table', 'bbox', 'lines', 'savedBlock']) delete x[k]; });
  const restored = exp.importStructureExport(old, src, null);
  assert.equal(restored.merges.length, 2); assert.equal(restored.anomalies.length, 2);
  assert.equal(restored.pages[0].blocks[2].correction === undefined, true);
});
