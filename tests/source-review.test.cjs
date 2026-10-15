const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const platform = { OS: 'ios' };
const records = new Map();
let fail = false;
const storage = {
  getItem: async key => records.get(key) ?? null,
  setItem: async (key, value) => {
    if (fail) throw new Error('Storage full');
    records.set(key, value);
  },
};
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: platform };
  if (name === '@react-native-async-storage/async-storage') return storage;
  return original.call(this, name, ...args);
};
const review = require('../.test-build/domain/sourceCourse/verification');
const reports = require('../.test-build/domain/sourceCourse/anomalies');
// Exercise IndexedDB requests and transaction rollback using its standard event model.
const { IDBFactory, IDBObjectStore } = require('fake-indexeddb');
const put = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function(...args) {
  const request = put.apply(this, args);
  if (fail) queueMicrotask(() => this.transaction.abort());
  return request;
};
global.indexedDB = new IDBFactory();

for (const os of ['ios', 'web']) {
  test(`${os}: validate, isolate blocks/pages, preserve history, reload and reopen atomically`, async () => {
    platform.OS = os;
    records.clear(); global.indexedDB = new IDBFactory(); fail = false;
    let validation = review.initializeValidationFromControlReport('kum-08', { pages: [
      { printedPage: 151, pdfPage: 174, blocks: [{ id: 'a' }, { id: 'b' }] },
      { printedPage: 152, pdfPage: 175, blocks: [{ id: 'a' }] },
    ] });
    const make = (page, block, status = 'open', chapter = 'kum-08') => ({
      ...reports.createAnomalyReport(chapter, 'Kumar', page, page + 23, block, 'paragraph', 'Text', 'Keep comment'), status,
    });
    const history = [make(151, 'a'), make(151, 'a', 'corrected-pending-review'),
      make(151, 'b'), make(152, 'a'), make(151, 'a', 'resolved'), make(151, 'a', 'open', 'other')];
    const before = structuredClone(history);
    // Existing records remain readable before the first combined save.
    for (const a of history.filter(a => a.chapterId === 'kum-08')) await reports.saveAnomaly(a);
    assert.equal((await reports.loadChapterAnomalies('kum-08')).length, 5);
    validation = await review.saveBlockReview(validation, history, 151, 'a', 'verified');
    assert.deepEqual(validation.anomalies.map(a => a.status), ['resolved', 'resolved', 'open', 'open', 'resolved', 'open']);
    validation.anomalies.forEach((a, i) => {
      assert.deepEqual({ ...a, status: before[i].status, updatedAt: before[i].updatedAt }, before[i]);
    });
    assert.deepEqual(history, before);
    assert.equal(validation.verifiedBlocks, 1);
    assert.equal(validation.verifiedPages, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(await review.loadValidation('kum-08'))), JSON.parse(JSON.stringify(validation)));
    assert.deepEqual(await reports.loadChapterAnomalies('kum-08'), validation.anomalies);
    validation = await review.saveBlockReview(validation, [], 151, 'b', 'verified');
    validation = await review.saveBlockReview(validation, [], 152, 'a', 'verified');
    assert.equal(validation.complete, true);
    assert.equal(validation.verifiedPages, 2);
    const fresh = make(151, 'a');
    const committed = structuredClone(validation);
    fail = true;
    await assert.rejects(review.saveBlockReview(validation, [], 151, 'a', 'issue-found', fresh));
    assert.deepEqual(await review.loadValidation('kum-08'), committed);
    assert.deepEqual(validation, committed);
    fail = false;
    validation = await review.saveBlockReview(validation, [], 151, 'a', 'issue-found', fresh);
    assert.equal(validation.anomalies.length, 7);
    assert.equal(validation.anomalies.at(-1).status, 'open');
    assert.equal(validation.anomalies[0].status, 'resolved');
    assert.equal(validation.verifiedBlocks, 2);
    assert.equal(validation.verifiedPages, 1);
    assert.equal(validation.complete, false);
    assert.equal(validation.pages[0].blocks[0].verifiedAt, undefined);
    assert.equal(validation.pages[0].verifiedAt, undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(await review.loadValidation('kum-08'))), JSON.parse(JSON.stringify(validation)));
    await assert.rejects(review.saveBlockReview(validation, [], 999, 'a', 'verified'));
    const edited = { ...fresh, description: 'Updated comment' };
    validation = await review.saveBlockReview(validation, [], 151, 'a', 'issue-found', edited, 'edit');
    assert.equal(validation.anomalies.length, 7);
    assert.equal(validation.anomalies.at(-1).id, fresh.id);
    assert.equal(validation.anomalies.at(-1).descriptionHistory[0].description, fresh.description);
    assert.equal((await reports.loadChapterAnomalies('kum-08')).at(-1).description, 'Updated comment');
    await assert.rejects(review.saveBlockReview(validation, [], 151, 'a', 'issue-found', { ...before[4], status: 'open' }, 'edit'));
    await assert.rejects(review.saveBlockReview(validation, [], 151, 'b', 'issue-found', edited, 'edit'));
  });
}
