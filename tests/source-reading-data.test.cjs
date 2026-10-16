const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
const { IDBFactory } = require('fake-indexeddb');
const native = { Platform: { OS: 'web' } };
const records = new Map();
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === '@react-native-async-storage/async-storage') return { getItem: async k => records.get(k) ?? null, setItem: async (k, v) => records.set(k, v) };
  return original.call(this, name, ...args);
};
const data = require('../.test-build/domain/sourceCourse/readingData');
const storage = require('../.test-build/domain/sourceCourse/readingStorage');
const ref = { chapterId: 'other-01', sourceSha256: 'a'.repeat(64), printedPage: 12, blockId: 'same-id' };
const text = 'Cuvânt repetat. Cuvânt repetat. Doza este 2 mg.';
test('precise repeated-word and phrase highlights coexist, change color and delete without changing source', () => {
  let value = data.emptyReadingData(ref.chapterId);
  const word = data.readingAnchor(ref, '1', text, 16, 22);
  value = data.putAnnotation(value, word, 'yellow', '');
  value = data.putAnnotation(value, data.readingAnchor(ref, '1', text, 32, text.length), 'green', 'Une note');
  assert.equal(value.annotations.length, 2);
  assert.equal(value.annotations[0].quote, 'Cuvânt');
  value = data.putAnnotation(value, word, 'pink', 'Précision');
  assert.equal(value.annotations.length, 2);
  assert.equal(value.annotations.find(a => a.start === 16).color, 'pink');
  value = data.removeAnnotation(value, value.annotations[0].id);
  assert.equal(value.annotations.filter(a => !a.deletedAt).length, 1);
  assert.equal(word.sourceText, text);
  assert.ok(data.anchorMatches(word, ref, text));
  assert.ok(!data.anchorMatches(word, { ...ref, printedPage: 13 }, text));
  assert.ok(!data.anchorMatches(word, ref, `${text} Ajout.`));
  assert.throws(() => data.readingAnchor(ref, '1', text, 1, 1000));
});
test('web/native durable storage, independent mutations and backup restore preserve tombstones', async () => {
  for (const platform of ['web', 'ios']) {
    native.Platform.OS = platform; global.indexedDB = new IDBFactory(); records.clear();
    await Promise.all([storage.updateReadingData(ref.chapterId, v => data.putAnnotation(v, data.readingAnchor(ref, '1', text, 0, 6), 'yellow', '')),
      storage.updateReadingData(ref.chapterId, v => data.putAnnotation(v, data.readingAnchor(ref, '1', text, 16, 22), 'blue', ''))]);
    const saved = await storage.loadReadingData(ref.chapterId);
    assert.equal(saved.annotations.length, 2);
    const restored = data.restoreReadingData(data.emptyReadingData(ref.chapterId), JSON.stringify(saved));
    assert.deepEqual(restored.annotations, saved.annotations);
    const removed = data.removeAnnotation(restored, restored.annotations[0].id, '2099-01-01T00:00:00Z');
    assert.deepEqual(data.restoreReadingData(removed, JSON.stringify(saved)).annotations, removed.annotations);
    await assert.rejects(storage.updateReadingData(ref.chapterId, () => data.emptyReadingData('wrong')));
    assert.equal((await storage.loadReadingData(ref.chapterId)).annotations.length, 2);
    assert.throws(() => data.decodeReadingData(JSON.stringify(saved), 'wrong'));
  }
});
