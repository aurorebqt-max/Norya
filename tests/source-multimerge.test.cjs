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
const edits = require('../.test-build/domain/sourceCourse/blockEdits');
const nav = require('../.test-build/domain/sourceCourse/reviewNavigation');

const part = (id, text) => ({ id, role: 'paragraph', kind: 'text', text, lines: [[{ text, bold: false, italic: false }]],
  bbox: [0, 0, 10, 10], reasons: [], image: 'data:image/png;base64,iVBORw0KGgo=', sourceLineIds: [`${id}-l`] });
const packet = () => ({ chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
  pages: [
    { printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'x', image: 'x', sourceLineIds: [],
      parts: ['A', 'B', 'C'].map((t, i) => part(`p${i + 1}`, `Text ${t}`)) },
    { printedPage: 161, pdfPage: 184, width: 100, height: 100, pdf: 'x', image: 'x', sourceLineIds: [],
      parts: [part('p1', 'Text D')] },
  ] });
const item = (page, id, text) => ({ sources: [{ printedPage: page, blockId: id }], sourceTexts: [text], text });

test('repeated merges 2→3→4, non adjacent, chained undo', () => {
  const src = packet();
  let v = review.reconcileReviewValidation(null, src);
  v.anomalies = [{ id: 'a1', chapterId: 'kum-08', printedPage: 160, blockId: 'p2', status: 'resolved', description: 'old' }];
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'p1', text: 'Text A' }, { printedPage: 160, blockId: 'p3', text: 'Text C' }), 'm1');
  const ab = merges.mergeAtAnchor(v.merges, 160, 'p1');
  assert.equal(ab.joinedText, 'Text A Text C');
  v = merges.recordMerge(v, merges.buildMergeDraft('kum-08', [{ ...item(160, 'p1', ab.joinedText), sources: ab.sources, sourceTexts: ab.sourceTexts, mergeId: 'm1' }, item(160, 'p2', 'Text B')]), 'm2');
  const d = merges.buildMergeDraft('kum-08', [
    { ...item(160, 'p1', 'x'), sources: merges.mergeAtAnchor(v.merges, 160, 'p1').sources, sourceTexts: ['a', 'c', 'b'], text: merges.mergeAtAnchor(v.merges, 160, 'p1').joinedText, mergeId: 'm2' },
    item(161, 'p1', 'Text D')]);
  assert.ok(merges.mergeWarnings(d).some(w => /pages différentes/.test(w)));
  v = merges.recordMerge(v, d, 'm3');
  assert.equal(merges.activeMerges(v.merges).length, 1);
  assert.equal(merges.mergeAtAnchor(v.merges, 160, 'p1').sources.length, 4);
  assert.equal(merges.mergeAtAnchor(v.merges, 160, 'p1').joinedText, 'Text A Text C Text B Text D');
  assert.ok(merges.isAbsorbedByMerge(v.merges, 161, 'p1'));
  assert.equal(nav.reviewTargets(src, v).length, 1);
  assert.equal(v.pages[0].blocks[0].status, 'pending');
  assert.equal(v.anomalies[0].description, 'old');
  assert.throws(() => merges.undoMerge(v, 'm1'));
  v = merges.undoMerge(v, 'm3');
  assert.equal(merges.mergeAtAnchor(v.merges, 160, 'p1').joinedText, 'Text A Text C Text B');
  v = merges.undoMerge(v, 'm2');
  v = merges.undoMerge(v, 'm1');
  assert.equal(merges.activeMerges(v.merges).length, 0);
  assert.equal(nav.reviewTargets(src, v).length, 4);
  assert.equal(v.mergeLog.length, 6);
});

test('corrections keep history, do not verify, work on merges, and feed filters', () => {
  const src = packet();
  let v = review.reconcileReviewValidation(null, src);
  const shown = () => edits.workingPresentation(160, src.pages[0].parts[0], v).text;
  v = edits.saveDisplayedCorrection(v, { printedPage: 160, blockId: 'p1' }, shown(), 'Text A fixed');
  assert.equal(shown(), 'Text A fixed');
  assert.equal(src.pages[0].parts[0].text, 'Text A');
  assert.equal(v.pages[0].blocks[0].status, 'pending');
  assert.equal(nav.reviewTargets(src, v)[0].mine, true);
  assert.equal(nav.filterReviewTargets(nav.reviewTargets(src, v), 'mine').length, 1);
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'p1', text: shown() }, { printedPage: 160, blockId: 'p2', text: 'Text B' }));
  assert.equal(shown(), 'Text A fixed Text B');
  v = edits.saveDisplayedCorrection(v, { printedPage: 160, blockId: 'p1' }, shown(), 'AB final');
  assert.equal(shown(), 'AB final');
  v = edits.undoDisplayedCorrection(v, { printedPage: 160, blockId: 'p1' });
  assert.equal(shown(), 'Text A fixed Text B');
  const id = merges.activeMerges(v.merges)[0].id;
  v = merges.undoMerge(v, id);
  assert.equal(shown(), 'Text A fixed');
  v = edits.undoBlockCorrection(v, 160, 'p1');
  assert.equal(shown(), 'Text A');
  assert.equal(v.pages[0].blocks[0].correctionHistory.length, 2);
});

test('verifying a merged block verifies all sources and leaves pending filter', () => {
  const src = packet();
  let v = review.reconcileReviewValidation(null, src);
  v.anomalies = [{ id: 'a', chapterId: 'kum-08', printedPage: 160, blockId: 'p2', status: 'open', description: 'x' }];
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'p1', text: 'a' }, { printedPage: 160, blockId: 'p2', text: 'b' }));
  let t = nav.reviewTargets(src, v);
  assert.equal(nav.filterReviewTargets(t, 'pending').length, 3);
  v = edits.reviewLogicalBlock(v, v.anomalies, edits.logicalSources(v, { printedPage: 160, blockId: 'p1' }), 'verified');
  t = nav.reviewTargets(src, v);
  assert.equal(nav.filterReviewTargets(t, 'verified').length, 1);
  assert.equal(nav.filterReviewTargets(t, 'pending').length, 2);
  assert.equal(v.anomalies[0].status, 'resolved');
  assert.equal(nav.filterReviewTargets(t, 'mine').length, 1);
  assert.deepEqual(nav.countReviewTargets(t), { all: 3, mine: 1, verified: 1, pending: 2 });
});

test('structure export/import restores merges and corrections without duplication', () => {
  const xp = require('../.test-build/domain/sourceCourse/structureExport');
  const src = packet();
  let v = review.reconcileReviewValidation(null, src);
  v = edits.saveDisplayedCorrection(v, { printedPage: 160, blockId: 'p1' }, 'Text A', 'Text A fixed');
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'p1', text: 'Text A fixed' }, { printedPage: 160, blockId: 'p3', text: 'Text C' }), 'm1');
  v = merges.recordMerge(v, merges.buildMergeDraft('kum-08', [
    { sources: merges.mergeAtAnchor(v.merges, 160, 'p1').sources, sourceTexts: ['x', 'y'], text: 'Text A fixed Text C', mergeId: 'm1' },
    { sources: [{ printedPage: 161, blockId: 'p1' }], sourceTexts: ['Text D'], text: 'Text D' }]), 'm2');
  const out = JSON.stringify(xp.buildStructureExport(src, v));
  const data = JSON.parse(out);
  assert.deepEqual(data.activeMergeIds, ['m2']);
  assert.equal(data.blocks.find(b => b.id === 'p1' && b.printedPage === 160).rawText, 'Text A');
  assert.equal(data.displayOrder.length, 2);
  const restored = xp.importStructureExport(out, src, review.reconcileReviewValidation(null, src));
  assert.equal(merges.activeMerges(restored.merges).length, 1);
  assert.equal(restored.merges.length, 2);
  assert.equal(edits.workingPresentation(160, src.pages[0].parts[0], restored).text, 'Text A fixed Text C Text D');
  const twice = xp.importStructureExport(out, src, restored);
  assert.equal(twice.merges.length, 2);
  assert.equal(twice.mergeLog.length, restored.mergeLog.length);
  assert.throws(() => xp.importStructureExport(out.replace('kum-08', 'kum-09'), src, null));
});
