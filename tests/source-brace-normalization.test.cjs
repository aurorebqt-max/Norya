const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
  return original.call(this, name, ...args);
};
const review = require('../.test-build/domain/sourceCourse/verification');
const braces = require('../.test-build/domain/sourceCourse/braceNormalization');
const cls = require('../.test-build/domain/sourceCourse/classification');
const exporter = require('../.test-build/domain/sourceCourse/structureExport');

const part = (id, text, role = 'paragraph') => ({
  id, role, kind: role === 'paragraph' ? 'text' : 'visual', text,
  lines: text.split('\n').map(line => [{ text: line, bold: false, italic: false }]),
  bbox: [0, 0, 100, 100], reasons: [], image: 'data:image/png;base64,synthetic', sourceLineIds: [`${id}-line`],
});
const source = () => ({
  chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
  pages: [{ printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'JVBERi0=', image: 'data:image/png;base64,synthetic',
    sourceLineIds: ['p1-line', 'p2-line', 'p3-line'], parts: [
      part('p1', 'Se recomandă {tratament antibiotic}.'),
      part('p2', 'Mulțimea {0,1} rămâne neschimbată.'),
      part('p3', 'Table', 'table'),
    ] }],
});

test('brace proposals prefer round parentheses for prose, preserve authentic numeric braces, and re-review verified tables', () => {
  const packet = source();
  let validation = review.reconcileReviewValidation(null, packet);
  validation.pages[0].blocks[0] = { ...validation.pages[0].blocks[0], status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' };
  validation = cls.setBlockKind(validation, { printedPage: 160, blockId: 'p3' }, 'table');
  let table = cls.createTable(1, 2);
  table = cls.setCellText(table, 0, 0, '{administrare orală}');
  table = cls.setCellText(table, 0, 1, '{0,1}');
  validation = cls.saveBlockTable(validation, { printedPage: 160, blockId: 'p3' }, table);
  validation.pages[0].blocks[2] = { ...validation.pages[0].blocks[2], status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' };
  const plan = braces.planBraceNormalization(packet, validation);
  assert.equal(plan.proposals.length, 2);
  assert.equal(plan.proposals[0].after, 'Se recomandă (tratament antibiotic).');
  assert.equal(plan.proposals[1].kind, 'table');
  assert.equal(plan.proposals[1].afterTable.rows[0][0].text, '(administrare orală)');
  assert.equal(plan.proposals[1].afterTable.rows[0][1].text, '{0,1}');
  const applied = braces.applyBraceNormalization(validation, plan.proposals, '2026-10-16T16:35:00Z');
  assert.equal(applied.pages[0].blocks[0].correction, 'Se recomandă (tratament antibiotic).');
  assert.equal(applied.pages[0].blocks[0].status, 'in-review');
  assert.equal(applied.pages[0].blocks[2].table.rows[0][0].text, '(administrare orală)');
  assert.equal(applied.pages[0].blocks[2].status, 'in-review');
  const exported = exporter.buildStructureExport(packet, applied);
  const reimported = exporter.importStructureExport(exported, packet, review.reconcileReviewValidation(null, packet));
  assert.equal(reimported.pages[0].blocks[2].table.rows[0][0].text, '(administrare orală)');
});
