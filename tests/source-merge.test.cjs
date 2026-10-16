const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { IDBFactory } = require('fake-indexeddb');
const memory = new Map();
const native = { Platform: { OS: 'web' } };
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async k => memory.get(k) ?? null,
    setItem: async (k, v) => { memory.set(k, v); },
  };
  return original.call(this, name, ...args);
};
const merges = require('../.test-build/domain/sourceCourse/merges');
const review = require('../.test-build/domain/sourceCourse/verification');
const { sourcePresentation } = require('../.test-build/domain/sourceCourse/displayCorrections');
const exporter = require('../.test-build/domain/sourceCourse/structureExport');

function packet() {
  const part = (id, text) => ({
    id, role: 'paragraph', kind: 'text', text, lines: [[{ text, bold: false, italic: false }]],
    bbox: [0, 0, 10, 10], reasons: [], image: 'data:image/png;base64,iVBORw0KGgo=', sourceLineIds: [`${id}-line`],
  });
  return {
    chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false,
    sourceSha256: 'a'.repeat(64),
    pages: [{
      printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'JVBERi0=', image: part('part-1', 'A').image,
      sourceLineIds: ['part-1-line', 'part-2-line', 'part-3-line'],
      parts: [part('part-1', 'Synthetic first'), part('part-2', 'Synthetic second'), part('part-3', 'Synthetic distant')],
    }],
  };
}

test('junctions, order swap and identity across pages', () => {
  assert.equal(merges.joinWithJunction('a', 'b', 'space'), 'a b');
  assert.equal(merges.joinWithJunction('a', 'b', 'linebreak'), 'a\nb');
  assert.equal(merges.joinWithJunction('a', 'b', 'none'), 'ab');
  assert.equal(merges.joinWithJunction('anti-', 'biotic', 'hyphen'), 'antibiotic');
  const draft = merges.buildMergePreview('kum-08',
    { printedPage: 160, blockId: 'part-1', text: 'One' },
    { printedPage: 161, blockId: 'part-1', text: 'Two' }, 'space');
  assert.equal(draft.sources[0].printedPage, 160);
  assert.equal(draft.sources[1].printedPage, 161);
  assert.equal(draft.joinedText, 'One Two');
  const swapped = merges.withSwappedOrder(draft);
  assert.equal(swapped.sources[0].printedPage, 161);
  assert.equal(swapped.joinedText, 'Two One');
});

test('record and undo preserve anomalies and never mutate source packet', () => {
  const source = packet();
  const beforePacket = JSON.stringify(source);
  let validation = review.reconcileReviewValidation(null, source);
  validation.anomalies = [{
    id: 'keep', chapterId: 'kum-08', printedPage: 160, blockId: 'part-2', status: 'resolved',
    description: 'Keep original comment', descriptionHistory: [{ description: 'Earlier' }],
  }];
  validation.pages[0].blocks[0].status = 'verified';
  validation.pages[0].blocks[0].notes = 'Human note unrelated to merge';
  const draft = merges.buildMergePreview('kum-08',
    { printedPage: 160, blockId: 'part-1', text: 'Synthetic first' },
    { printedPage: 160, blockId: 'part-3', text: 'Synthetic distant' }, 'space');
  draft.joinedText = 'Synthetic joined correction';
  const withMerge = merges.recordMerge(validation, draft, 'merge-1', '2026-10-16T12:00:00Z');
  assert.equal(withMerge.merges.length, 1);
  assert.equal(withMerge.anomalies[0].description, 'Keep original comment');
  assert.equal(withMerge.pages[0].blocks[0].status, 'verified');
  assert.equal(withMerge.pages[0].blocks[0].notes, 'Human note unrelated to merge');
  assert.equal(JSON.stringify(source), beforePacket);
  const shown = merges.presentationAfterMerges(160, source.pages[0].parts[0], sourcePresentation(160, source.pages[0].parts[0]), withMerge.merges);
  assert.equal(shown.text, 'Synthetic joined correction');
  assert.equal(merges.presentationAfterMerges(160, source.pages[0].parts[2], sourcePresentation(160, source.pages[0].parts[2]), withMerge.merges), null);
  assert.ok(merges.presentationAfterMerges(160, source.pages[0].parts[1], sourcePresentation(160, source.pages[0].parts[1]), withMerge.merges));
  const undone = merges.undoMerge(withMerge, 'merge-1');
  assert.equal((undone.merges ?? []).length, 0);
  assert.equal(undone.anomalies[0].descriptionHistory[0].description, 'Earlier');
  assert.equal(undone.pages[0].blocks[0].notes, 'Human note unrelated to merge');
});

test('web persistence reloads merges without changing block statuses', async () => {
  native.Platform.OS = 'web';
  global.indexedDB = new IDBFactory();
  memory.clear();
  const source = packet();
  let validation = review.reconcileReviewValidation(null, source);
  validation = merges.recordMerge(validation, merges.buildMergePreview('kum-08',
    { printedPage: 160, blockId: 'part-1', text: 'Synthetic first' },
    { printedPage: 160, blockId: 'part-2', text: 'Synthetic second' }, 'space'));
  await review.saveValidation(validation);
  const reloaded = await review.loadValidation('kum-08');
  assert.equal(reloaded.merges.length, 1);
  assert.equal(reloaded.merges[0].joinedText, 'Synthetic first Synthetic second');
  assert.equal(reloaded.pages[0].blocks[0].status, 'pending');
});

test('splitting a block or an active merge is reversible and keeps source, validation, anomalies, and export data', () => {
  const source = packet();
  const before = JSON.stringify(source);
  let validation = review.reconcileReviewValidation(null, source);
  validation.pages[0].blocks[0].status = 'verified';
  validation.pages[0].blocks[0].kind = 'h3';
  validation.anomalies = [{ id: 'keep', chapterId: 'kum-08', printedPage: 160, blockId: 'part-1', status: 'open', description: 'Keep me' }];
  validation = merges.recordSplit(validation, { printedPage: 160, blockId: 'part-1' }, 'Synthetic first', 9, 'split-1', '2026-10-16T15:00:00Z');
  assert.equal(validation.splits.length, 1);
  const split = merges.presentationAfterMerges(160, source.pages[0].parts[0], sourcePresentation(160, source.pages[0].parts[0]), validation.merges, validation.splits);
  assert.equal(split.text, 'Synthetic\n\nfirst');
  assert.equal(validation.pages[0].blocks[0].kind, 'h3');
  assert.equal(validation.pages[0].blocks[0].status, 'verified');
  assert.equal(validation.anomalies[0].description, 'Keep me');
  assert.equal(JSON.stringify(source), before);
  validation = merges.undoSplit(validation, 'split-1');
  assert.equal(validation.splits.length, 0);
  validation = merges.recordMerge(validation, merges.buildMergePreview('kum-08',
    { printedPage: 160, blockId: 'part-1', text: 'Synthetic first' },
    { printedPage: 160, blockId: 'part-2', text: 'Synthetic second' }, 'space'), 'merge-split', '2026-10-16T15:01:00Z');
  validation = merges.recordSplit(validation, { printedPage: 160, blockId: 'part-1' }, 'Synthetic first Synthetic second', 15, 'split-merge', '2026-10-16T15:02:00Z');
  assert.equal(merges.presentationAfterMerges(160, source.pages[0].parts[0], sourcePresentation(160, source.pages[0].parts[0]),
    validation.merges, validation.splits).text, 'Synthetic first\n\nSynthetic second');
  const imported = exporter.importStructureExport(exporter.buildStructureExport(source, validation), source, review.reconcileReviewValidation(null, source));
  assert.equal(imported.splits[0].id, 'split-merge');
  assert.equal(imported.splits[0].beforeText, 'Synthetic first Synthetic second');
});
