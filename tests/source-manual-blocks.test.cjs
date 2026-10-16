const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
  return original.call(this, name, ...args);
};
const manual = require('../.test-build/domain/sourceCourse/manualBlocks');
const review = require('../.test-build/domain/sourceCourse/reviewNavigation');
const structure = require('../.test-build/domain/sourceCourse/courseStructure');
const exported = require('../.test-build/domain/sourceCourse/structureExport');
const finalization = require('../.test-build/domain/sourceCourse/finalization');

const part = (id, text) => ({ id, kind: 'text', role: 'paragraph', text, lines: [[{ text, bold: false, italic: false }]],
  sourceLineIds: [`${id}-line`], bbox: [0, 0, 10, 10], reasons: [], image: 'data:image/png;base64,synthetic', status: 'unverified' });
function fixture() {
  const packet = { chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
    pages: [{ printedPage: 160, pdfPage: 183, width: 100, height: 100, image: 'data:image/png;base64,synthetic', pdf: 'JVBERi0=',
      sourceLineIds: ['one-line', 'two-line'], parts: [part('one', 'Source one'), part('two', 'Source two')] }] };
  const validation = { chapterId: 'kum-08', pages: [{ printedPage: 160, pdfPage: 183, status: 'not-started',
    blocks: [{ id: 'one', page: 160, status: 'pending' }, { id: 'two', page: 160, status: 'pending' }] }],
    complete: false, verifiedPages: 0, totalPages: 1, highPriorityBlocks: 0, mediumPriorityBlocks: 0, verifiedBlocks: 0, totalBlocks: 2 };
  return { packet, validation };
}

test('manual blocks are stable, independently reviewable, ordered, reversible and do not mutate source', () => {
  const { packet, validation } = fixture();
  const original = JSON.stringify(packet);
  const first = manual.createManualBlock(validation, packet, { printedPage: 160, blockId: 'one' }, 'Manual first', '2026-10-16T10:00:00.000Z');
  const second = manual.createManualBlock(first, packet, { printedPage: 160, blockId: first.manualBlocks[0].id }, 'Manual second', '2026-10-16T10:00:01.000Z');
  assert.deepEqual(manual.logicalBlocks(packet, second).map(block => block.blockId), ['one', first.manualBlocks[0].id, second.manualBlocks[1].id, 'two']);
  assert.equal(JSON.stringify(packet), original);
  assert.equal(review.reviewTargets(packet, second).length, 4);
  assert.equal(structure.buildCourseStructure(packet, second).intro.map(item => item.presentation.text).join('|'),
    'Source one|Manual first|Manual second|Source two');
  assert.throws(() => manual.undoManualBlockCreation(second, first.manualBlocks[0].id), /Annulez/);
  const undoneSecond = manual.undoManualBlockCreation(second, second.manualBlocks[1].id, '2026-10-16T10:01:00.000Z');
  const undone = manual.undoManualBlockCreation(undoneSecond, first.manualBlocks[0].id, '2026-10-16T10:02:00.000Z');
  assert.equal(manual.logicalBlocks(packet, undone).length, 2);
  assert.equal(undone.manualBlocks.length, 2);
});

test('manual blocks round-trip through export and require independent verification for finalization', () => {
  const { packet, validation } = fixture();
  let value = manual.createManualBlock(validation, packet, { printedPage: 160, blockId: 'one' }, 'Manual final', '2026-10-16T10:00:00.000Z');
  const serialized = exported.buildStructureExport(packet, value);
  value = exported.importStructureExport(serialized, packet, validation);
  const id = value.manualBlocks[0].id;
  assert.equal(value.pages[0].blocks.find(block => block.id === id).status, 'pending');
  assert.ok(finalization.finalizationBlockages({ packet, validation: value, anomalies: [] }).some(blockage => blockage.blockId === id));
  value.pages[0].blocks = value.pages[0].blocks.map(block => ({ ...block, status: 'verified', verifiedAt: '2026-10-16T11:00:00.000Z' }));
  assert.deepEqual(finalization.finalizationBlockages({ packet, validation: value, anomalies: [] }), []);
  const archive = finalization.archiveFinalCourse(null, { packet, validation: value, anomalies: [] }, true);
  assert.equal(archive.versions[0].presentations['[160,"' + id + '"]'].text, 'Manual final');
});

test('finalization counts each active manual block once, never once per source part', () => {
  const { packet, validation } = fixture();
  validation.pages[0].blocks = validation.pages[0].blocks.map(block => ({ ...block, status: 'verified', verifiedAt: '2026-10-16T11:00:00.000Z' }));
  let value = manual.createManualBlock(validation, packet, { printedPage: 160, blockId: 'one' }, 'Manual A', '2026-10-16T10:00:00.000Z');
  value = manual.createManualBlock(value, packet, { printedPage: 160, blockId: 'two' }, 'Manual B', '2026-10-16T10:00:01.000Z');
  const blockages = finalization.finalizationBlockages({ packet, validation: value, anomalies: [] });
  assert.equal(blockages.filter(blockage => blockage.message === 'Bloc manuel non vérifié.').length, 2);
  assert.deepEqual(finalization.summarizeFinalizationBlockages(blockages), {
    activeBlocks: 0, manualBlocks: 2, anomalies: 0, tables: 0, structure: 0,
  });
});
