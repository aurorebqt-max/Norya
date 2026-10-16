const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { IDBFactory } = require('fake-indexeddb');

const memory = new Map();
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => { memory.set(key, value); },
  };
  return original.call(this, name, ...args);
};

const review = require('../.test-build/domain/sourceCourse/verification');
const edits = require('../.test-build/domain/sourceCourse/blockEdits');
const merges = require('../.test-build/domain/sourceCourse/merges');
const batch = require('../.test-build/domain/sourceCourse/normalizationBatch');
const exporter = require('../.test-build/domain/sourceCourse/structureExport');

const part = (id, text, role = 'paragraph') => ({
  id, role, kind: role === 'paragraph' ? 'text' : 'visual', text,
  lines: text.split('\n').map(line => [{ text: line, bold: false, italic: false }]),
  bbox: [0, 0, 100, 100], reasons: [], image: 'data:image/png;base64,synthetic', sourceLineIds: [`${id}-line`],
});
const packet = () => ({
  chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
  pages: [{ printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'JVBERi0=',
    image: 'data:image/png;base64,synthetic', sourceLineIds: ['part-1-line', 'part-2-line', 'part-3-line', 'part-4-line'],
    parts: [
      part('part-1', 'Tratamentul trebuie\ninițiat rapid.'),
      part('part-2', 'Correction\nmanuelle.'),
      part('part-3', 'Prima propoziție.\nAl doilea paragraf.'),
      part('part-4', 'A\tB\nC\tD', 'table'),
    ] }],
});

test('batch preview applies safe blocks once, preserves manual corrections, and sends verified blocks back to review', () => {
  const source = packet();
  let validation = review.reconcileReviewValidation(null, source);
  validation.pages[0].blocks[0].status = 'verified';
  validation.pages[0].blocks[0].verifiedAt = '2026-01-01T00:00:00Z';
  validation = edits.saveBlockCorrection(validation, 160, 'part-2', 'Correction\nmanuelle.', 'Correction manuelle revue.');
  const plan = batch.planParagraphNormalization(source, validation);
  assert.equal(plan.proposals.length, 1);
  assert.equal(plan.proposals[0].before, 'Tratamentul trebuie\ninițiat rapid.');
  assert.equal(plan.proposals[0].after, 'Tratamentul trebuie inițiat rapid.');
  assert.ok(plan.ambiguities.length >= 1);
  assert.equal(plan.skipped, 2);
  const normalized = batch.applyParagraphNormalization(validation, plan.proposals, '2026-10-16T15:00:00Z');
  const block = normalized.pages[0].blocks[0];
  assert.equal(block.correction, 'Tratamentul trebuie inițiat rapid.');
  assert.equal(block.status, 'in-review');
  assert.equal(block.verifiedAt, '2026-01-01T00:00:00Z');
  assert.equal(block.statusHistory[0].before, 'verified');
  assert.equal(block.statusHistory[0].after, 'in-review');
  assert.equal(normalized.pages[0].blocks[1].correction, 'Correction manuelle revue.');
  assert.equal(batch.planParagraphNormalization(source, normalized).proposals.length, 0, 'operation is idempotent');
  const exported = exporter.buildStructureExport(source, normalized);
  const reimported = exporter.importStructureExport(exported, source, review.reconcileReviewValidation(null, source));
  assert.deepEqual(reimported.pages[0].blocks[0].statusHistory, block.statusHistory);
});

test('batch normalizes an unedited active merge and skips a manually edited merge', () => {
  const source = packet();
  let validation = review.reconcileReviewValidation(null, source);
  const draft = merges.buildMergePreview('kum-08',
    { printedPage: 160, blockId: 'part-1', text: 'Texte continu\nsur deux lignes' },
    { printedPage: 160, blockId: 'part-2', text: 'suite' },
  );
  validation = merges.recordMerge(validation, draft, 'merge-safe', '2026-10-16T15:00:00Z');
  let plan = batch.planParagraphNormalization(source, validation);
  assert.equal(plan.proposals[0].kind, 'merge');
  validation = batch.applyParagraphNormalization(validation, plan.proposals, '2026-10-16T15:01:00Z');
  assert.equal(validation.merges.find(merge => merge.id === 'merge-safe').joinedText, 'Texte continu sur deux lignes suite');
  plan = batch.planParagraphNormalization(source, validation);
  assert.ok(!plan.proposals.some(proposal => proposal.id === 'merge-safe'));
});
