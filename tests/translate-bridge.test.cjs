const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return {};
  return original.call(this, name, ...args);
};
const bridge = require('../.test-build/domain/sourceCourse/translateBridge');
const { fixture } = require('./fixtures/translate-fiction.cjs');
const response = p => ({ chapter_id: p.request.chapterId, source_revision: p.request.sourceRevision,
  translations: p.request.blocks.map(b => ({ id: b.id, text: 'FR ' + b.text, validated: true })) });
test('v2: repeated IDs, tables, styled title, images and corrections retained without source mutation', async () => {
  const { packet, validation } = fixture(); validation.pages[0].blocks[0].correction = 'Text fictiv corectat.';
  const before = JSON.stringify({ packet, validation });
  const p = await bridge.prepareTranslation(bridge.translationSnapshot(packet, validation), { kind: 'chapter' });
  assert.equal(new Set(p.request.blocks.map(b => b.id)).size, p.request.blocks.length);
  assert.equal(p.request.blocks.filter(b => b.meta.blockId === 'same').length, 2);
  assert.ok(p.request.blocks.some(b => b.text === 'Text fictiv corectat.'));
  assert.ok(p.request.blocks.some(b => b.meta.field === 'run'));
  assert.ok(p.request.blocks.some(b => b.meta.field === 'notes'));
  assert.equal(p.request.blocks.filter(b => b.meta.field === 'cell').length, 3);
  assert.equal(JSON.stringify(p.request).includes('fiction-image'), false);
  const fr = bridge.frenchNodes(p, response(p));
  assert.equal(fr.find(n => n.blockId === 'table').table.rows[0][0].colSpan, 2);
  assert.equal(fr.find(n => n.blockId === 'table').table.rows[0][1].covered, true);
  assert.equal(fr.find(n => n.blockId === 'heading').lines[0][0].bold, true);
  assert.match(fr.find(n => n.blockId === 'heading').text, /^FR /);
  assert.equal(fr.find(n => n.blockId === 'figure').image, 'fiction-image');
  assert.equal(JSON.stringify({ packet, validation }), before);
});
test('page/chapter revisions differ; changes anywhere in chapter invalidate page translations; export timestamps do not', async () => {
  const { packet, validation } = fixture(); const snap = bridge.translationSnapshot(packet, validation);
  const a = await bridge.prepareTranslation(snap, { kind: 'page', printedPage: 1 });
  const chapter = await bridge.prepareTranslation(snap, { kind: 'chapter' });
  assert.notEqual(a.request.sourceRevision, chapter.request.sourceRevision);
  assert.ok(a.request.blocks.every(b => b.meta.printedPage === 1));
  snap.provenance.exportedAt = '2040-01-01';
  assert.equal((await bridge.prepareTranslation(snap, a.scope)).request.sourceRevision, a.request.sourceRevision);
  snap.nodes.find(n => n.printedPage === 2).text += ' Schimbare.';
  const changed = await bridge.prepareTranslation(snap, a.scope);
  assert.notEqual(changed.request.sourceRevision, a.request.sourceRevision);
  assert.throws(() => bridge.validateTranslation(changed, response(a)), /obsolète/);
});
test('reject missing, duplicate, unknown, blank, unvalidated and wrong chapter responses', async () => {
  const { packet, validation } = fixture(); const p = await bridge.prepareTranslation(bridge.translationSnapshot(packet, validation), { kind: 'chapter' });
  for (const mutate of [r => r.translations.pop(), r => r.translations[0] = r.translations[1],
    r => r.translations[0].id = 'unknown', r => r.translations[0].text = ' ', r => r.translations[0].validated = false,
    r => r.chapter_id = 'other']) { const r = response(p); mutate(r); assert.throws(() => bridge.validateTranslation(p, r)); }
});
test('refuse silently lost styles and out-of-range requests', async () => {
  const { packet, validation } = fixture(); const snap = bridge.translationSnapshot(packet, validation);
  snap.nodes.find(n => n.blockId === 'heading').text = 'Texte corrigé sans alignement';
  await assert.rejects(bridge.prepareTranslation(snap, { kind: 'chapter' }), /Styles/);
  await assert.rejects(bridge.prepareTranslation(snap, { kind: 'page', printedPage: 99 }), /Page absente/);
  const other = bridge.translationSnapshot(packet, validation); other.nodes[0].text = 'x'.repeat(30001);
  await assert.rejects(bridge.prepareTranslation(other, { kind: 'chapter' }), /30 000/);
});
test('client treats only 404 as missing; network, auth, stale and invalid JSON remain errors', async () => {
  const { lookupFrench } = require('../.test-build/domain/sourceCourse/translateClient');
  const { packet, validation } = fixture(); const p = await bridge.prepareTranslation(bridge.translationSnapshot(packet, validation), { kind: 'chapter' });
  const previous = global.fetch;
  try {
    global.fetch = async () => new Response(JSON.stringify({ status: 'missing' }), { status: 404 });
    assert.equal(await lookupFrench(p), null);
    global.fetch = async () => new Response('{}', { status: 401 }); await assert.rejects(lookupFrench(p));
    global.fetch = async () => { throw new Error('offline'); }; await assert.rejects(lookupFrench(p), /offline/);
    global.fetch = async () => new Response('<html>'); await assert.rejects(lookupFrench(p), /invalide/);
    global.fetch = async () => new Response(JSON.stringify(response(p))); assert.deepEqual(await lookupFrench(p), response(p));
  } finally { global.fetch = previous; }
});
