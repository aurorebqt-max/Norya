const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
  return original.call(this, name, ...args);
};
const associations = require('../.test-build/domain/sourceCourse/associations');
const manual = require('../.test-build/domain/sourceCourse/manualBlocks');
const edits = require('../.test-build/domain/sourceCourse/blockEdits');
const exporter = require('../.test-build/domain/sourceCourse/structureExport');
const finalization = require('../.test-build/domain/sourceCourse/finalization');
const merges = require('../.test-build/domain/sourceCourse/merges');

const part = (id, text, role = 'paragraph') => ({ id, kind: 'text', role, text, lines: [[{ text, bold: false, italic: false }]],
  sourceLineIds: [`${id}-line`], bbox: [0, 0, 10, 10], reasons: [], image: 'data:image/png;base64,synthetic', status: 'unverified' });
function fixture() {
  const packet = { chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
    pages: [{ printedPage: 160, pdfPage: 183, width: 100, height: 100, image: 'data:image/png;base64,synthetic', pdf: 'x',
      sourceLineIds: ['source-line', 'target-line'], parts: [part('source', 'Alpha target Alpha target'), part('target', 'Destination')] }] };
  const validation = { chapterId: 'kum-08', pages: [{ printedPage: 160, pdfPage: 183, status: 'verified',
    blocks: [{ id: 'source', page: 160, status: 'verified', verifiedAt: '2026-10-16T10:00:00Z' }, { id: 'target', page: 160, status: 'verified', verifiedAt: '2026-10-16T10:00:00Z' }] }],
    complete: true, verifiedPages: 1, totalPages: 1, highPriorityBlocks: 0, mediumPriorityBlocks: 0, verifiedBlocks: 2, totalBlocks: 2 };
  return { packet, validation };
}

test('manual association preserves exact occurrence, logical ids, history and round trips', () => {
  const { packet, validation } = fixture();
  const logical = manual.logicalBlocks(packet, validation);
  let value = associations.createAssociation(validation, { printedPage: 160, blockId: 'source' }, 'Alpha target Alpha target',
    'target', 1, { printedPage: 160, blockId: 'target' }, logical, '2026-10-16T11:00:00Z');
  const link = value.associations[0];
  assert.deepEqual(link.anchor, { text: 'target', occurrence: 1, start: 19, end: 25 });
  assert.equal(link.destinationType, 'text');
  assert.equal(link.state, 'active');
  const restored = exporter.importStructureExport(exporter.buildStructureExport(packet, value), packet, validation);
  assert.deepEqual(restored.associations, value.associations);
  value = associations.deleteAssociation(value, link.id, '2026-10-16T12:00:00Z');
  assert.ok(value.associations[0].deletedAt);
  assert.equal(value.associations[0].history.at(-1).action, 'deleted');
});

test('edits and unavailable destinations require reassociation and block finalization', () => {
  const { packet, validation } = fixture();
  const logical = manual.logicalBlocks(packet, validation);
  let value = associations.createAssociation(validation, { printedPage: 160, blockId: 'source' }, 'Alpha target Alpha target',
    'target', 0, { printedPage: 160, blockId: 'target' }, logical, '2026-10-16T11:00:00Z');
  value = edits.saveBlockCorrection(value, 160, 'source', 'Alpha target Alpha target', 'Alpha changed', '2026-10-16T12:00:00Z');
  assert.equal(value.associations[0].state, 'reassociation-required');
  assert.ok(finalization.finalizationBlockages({ packet, validation: value, anomalies: [] }).some(x => /Association/.test(x.message)));
  value = associations.updateAssociation(value, value.associations[0].id, { printedPage: 160, blockId: 'source' }, 'Alpha changed',
    'changed', 0, { printedPage: 160, blockId: 'target' }, manual.logicalBlocks(packet, value), '2026-10-16T13:00:00Z');
  assert.equal(value.associations[0].state, 'active');
  value = merges.recordSplit(value, { printedPage: 160, blockId: 'target' }, 'Destination', 4, 'split-target', '2026-10-16T14:00:00Z');
  value = associations.validateAssociations(value, manual.logicalBlocks(packet, value), ref =>
    ref.blockId === 'source' ? 'Alpha changed' : 'Destination', '2026-10-16T14:00:01Z');
  assert.equal(value.associations[0].state, 'reassociation-required');
});

test('deleting a manual block deletes incoming and outgoing links, preserving other links and export history', () => {
  const { packet, validation } = fixture();
  let value = manual.createManualBlock(validation, packet, { printedPage: 160, blockId: 'source' }, 'Manual passage');
  const blockId = value.manualBlocks[0].id;
  const logical = manual.logicalBlocks(packet, value);
  value = associations.createAssociation(value, { printedPage: 160, blockId: 'source' }, 'Alpha target Alpha target',
    'target', 0, { printedPage: 160, blockId }, logical);
  value = associations.createAssociation(value, { printedPage: 160, blockId }, 'Manual passage',
    'passage', 0, { printedPage: 160, blockId: 'target' }, logical);
  value = associations.createAssociation(value, { printedPage: 160, blockId: 'source' }, 'Alpha target Alpha target',
    'target', 1, { printedPage: 160, blockId: 'target' }, logical);
  const unaffected = value.associations[2];
  const before = JSON.stringify(value);
  const now = '2026-10-16T16:00:00.000Z';
  const removed = manual.undoManualBlockCreation(value, blockId, now);
  assert.equal(JSON.stringify(value), before, 'The prior state is immutable');
  assert.deepEqual(associations.activeAssociations(removed), [unaffected]);
  for (const link of removed.associations.slice(0, 2)) {
    assert.equal(link.deletedAt, now);
    assert.equal(link.history.at(-1).action, 'deleted');
    assert.equal(link.history[0].action, 'created');
  }
  const restored = exporter.importStructureExport(exporter.buildStructureExport(packet, removed), packet, validation);
  assert.deepEqual(restored.associations, removed.associations);
  assert.deepEqual(associations.activeAssociations(restored), [unaffected]);
  assert.ok(!finalization.finalizationBlockages({ packet, validation: restored, anomalies: [] })
    .some(blockage => /Association/.test(blockage.message)));
});

test('legacy repair requires explicit deletion and is idempotent without changing human reviews', () => {
  const { packet, validation } = fixture();
  let value = manual.createManualBlock(validation, packet, { printedPage: 160, blockId: 'source' }, 'Old manual');
  const block = value.manualBlocks[0];
  value = associations.createAssociation(value, { printedPage: 160, blockId: 'source' }, 'Alpha target Alpha target',
    'target', 0, { printedPage: 160, blockId: block.id }, manual.logicalBlocks(packet, value));
  value.manualBlocks[0] = { ...block, undoneAt: '2026-10-16T12:00:00Z' };
  value.associations.push({ ...value.associations[0], id: 'unknown-target', target: { printedPage: 160, blockId: 'unknown' } });
  assert.equal(associations.associationsForDeletedBlocks(value).length, 1);
  const repaired = associations.repairDeletedBlockAssociations(value);
  assert.deepEqual(repaired.pages, value.pages);
  assert.equal(associations.activeAssociations(repaired)[0].id, 'unknown-target');
  assert.equal(associations.activeAssociations(repaired).length, 1);
  assert.strictEqual(associations.repairDeletedBlockAssociations(repaired), repaired);
  assert.ok(!value.associations[0].deletedAt);
});
