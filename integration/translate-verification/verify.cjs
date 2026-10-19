'use strict';
// Offline and read-only. Does not import Translate, Supabase or environment files.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { domain, proxy } = require('./runtime/load.cjs');
const { build } = require('./generate.cjs');
const root = __dirname;
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const clean = v => JSON.parse(JSON.stringify(v));
const sha = v => createHash('sha256').update(v).digest('hex');
const { bridge, load } = domain();
const snapshot = read('fixtures/snapshot.json');
let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('PASS ' + name); passed++; }
  catch (e) { console.error('FAIL ' + name + ': ' + e.message); failed++; }
}
async function main() {
  await check('01 integrity: all packaged files and exact source copies', () => {
    const lines = fs.readFileSync(path.join(root, 'SHA256SUMS'), 'utf8').trim().split('\n');
    for (const line of lines) {
      const match = /^([a-f0-9]{64})  (.+)$/.exec(line); assert.ok(match);
      assert.equal(sha(fs.readFileSync(path.join(root, match[2]))), match[1], match[2]);
    }
    for (const source of read('SOURCE_MANIFEST.json').files)
      assert.equal(sha(fs.readFileSync(path.join(root, 'source', source.path))), source.sha256);
  });
  await check('02 regenerate all 31 fixture/expected JSON files without writing', async () => {
    const generated = await build(); assert.equal(Object.keys(generated).length, 31);
    for (const [file, value] of Object.entries(generated)) assert.deepEqual(value, read(file), file);
  });
  await check('03 real v2 packet parser, export and reconstruction; originals immutable', async () => {
    const packet = read('fixtures/packet-v2.json'), validation = read('fixtures/validation.json');
    const before = JSON.stringify({ packet, validation });
    load('packet').parseSourcePacket(JSON.stringify(packet));
    const actual = bridge.translationSnapshot(packet, validation); actual.provenance.exportedAt = snapshot.provenance.exportedAt;
    assert.deepEqual(clean(actual), snapshot);
    const restored = load('structureExport').importStructureExport(read('fixtures/norya-source-structure-v2.json'), packet, validation);
    const prepared = await bridge.prepareTranslation(bridge.translationSnapshot(packet, restored), { kind: 'chapter' });
    assert.equal(prepared.request.sourceRevision, read('fixtures/request-chapter.json').sourceRevision);
    assert.equal(JSON.stringify({ packet, validation }), before);
  });
  await check('04 canonical UTF-8 SHA-256 vectors match independent node:crypto', async () => {
    for (const vector of read('expected/hash-vectors.json')) {
      assert.equal(bridge.canonical(vector.value), vector.canonical);
      assert.equal(await bridge.digest(vector.value), vector.sha256);
      assert.equal(sha(Buffer.from(vector.canonical, 'utf8')), vector.sha256);
    }
    assert.equal(bridge.canonical({ b: undefined, a: 1 }), '{"a":1}');
    assert.notEqual(await bridge.digest('é'), await bridge.digest('e\u0301'));
  });
  await check('05 exact chapter/page requests, identities and independent per-unit hashes', async () => {
    const cases = read('expected/cases.json');
    for (const key of ['chapter', 'page-101', 'page-102']) {
      const p = await bridge.prepareTranslation(snapshot, cases[key].scope);
      assert.deepEqual(clean(p.request), read(`fixtures/request-${key}.json`));
      assert.equal(p.request.blocks.length, cases[key].units);
      assert.equal(new Set(p.request.blocks.map(b => b.id)).size, p.request.blocks.length);
      for (const b of p.request.blocks) assert.equal(b.id, sha(bridge.canonical([snapshot.chapterId, b.meta])));
    }
    const chapter = read('fixtures/request-chapter.json'), page = read('fixtures/request-page-101.json');
    assert.notEqual(chapter.sourceRevision, page.sourceRevision);
    for (const b of page.blocks) assert.ok(chapter.blocks.some(c => c.id === b.id));
    assert.equal(chapter.blocks.filter(b => b.meta.blockId === 'same-block').length, 3);
  });
  await check('06 French overlay retains spans, covered text, styles, images; no source writes', async () => {
    const before = JSON.stringify(snapshot);
    for (const key of ['chapter', 'page-101', 'page-102']) {
      const p = await bridge.prepareTranslation(snapshot, read('expected/cases.json')[key].scope);
      assert.deepEqual(clean(bridge.frenchNodes(p, read(`fixtures/response-${key}.json`))), read(`expected/french-${key}.json`));
    }
    const nodes = read('expected/french-chapter.json');
    const table = nodes.find(n => n.blockId === 'grid').table;
    assert.equal(table.rows[0][0].colSpan, 2); assert.equal(table.rows[1][0].rowSpan, 2);
    assert.equal(table.rows[2][0].covered, true); assert.match(table.rows[2][0].text, /^FR fictif/);
    assert.equal(table.rows[2][1].text, '');
    assert.equal(nodes.find(n => n.blockId === 'styled').lines[0][2].italic, true);
    assert.equal(nodes.find(n => n.blockId === 'figure').image, snapshot.nodes.find(n => n.blockId === 'figure').image);
    assert.equal(JSON.stringify(snapshot), before);
    assert.equal(JSON.stringify(read('fixtures/request-chapter.json')).includes('data:image'), false);
  });
  for (const bad of read('expected/rejections.json')) await check('07 reject ' + bad.name, async () => {
    const p = await bridge.prepareTranslation(snapshot, { kind: 'chapter' });
    assert.throws(() => bridge.validateTranslation(p, read(bad.file)));
  });
  await check('08 modified remote page invalidates page 101; IDs remain stable', async () => {
    const p = await bridge.prepareTranslation(read('fixtures/snapshot-revised.json'), { kind: 'page', printedPage: 101 });
    assert.deepEqual(clean(p.request), read('fixtures/request-page-101-revised.json'));
    assert.throws(() => bridge.validateTranslation(p, read('fixtures/response-page-101.json')), /obsolète/);
    assert.deepEqual(p.request.blocks.map(b => b.id), read('fixtures/request-page-101.json').blocks.map(b => b.id));
  });
  await check('09 timestamp ignored, source correction/style/table changes change revision', async () => {
    const baseline = read('fixtures/request-chapter.json').sourceRevision;
    const s = clean(snapshot); s.provenance.exportedAt = '2040-01-01';
    assert.equal((await bridge.prepareTranslation(s, { kind: 'chapter' })).request.sourceRevision, baseline);
    for (const mutate of [s => s.nodes[0].text += '!', s => s.nodes.find(n => n.blockId === 'grid').table.rows[1][1].text += '!',
      s => s.nodes.find(n => n.blockId === 'styled').lines[0][0].italic = true]) {
      const changed = clean(snapshot); mutate(changed);
      assert.notEqual((await bridge.prepareTranslation(changed, { kind: 'chapter' })).request.sourceRevision, baseline);
    }
  });
  await check('10 unsafe style alignment, missing page and oversized text refused', async () => {
    const s = clean(snapshot); s.nodes.find(n => n.blockId === 'styled').text += ' correction';
    await assert.rejects(bridge.prepareTranslation(s, { kind: 'chapter' }), /Styles/);
    await assert.rejects(bridge.prepareTranslation(snapshot, { kind: 'page', printedPage: 999 }), /Page absente/);
    const large = clean(snapshot); large.nodes.find(n => n.blockId === 'same-block').text = 'a'.repeat(30001);
    await assert.rejects(bridge.prepareTranslation(large, { kind: 'chapter' }), /30 000/);
  });
  await check('11 client: only 404 is missing; auth/network/HTML/stale responses fail', async () => {
    let mode = 'missing';
    const client = domain(async (url, options) => {
      assert.ok(url.startsWith('/api/translate?action=lookup'));
      assert.equal(options.credentials, 'same-origin'); assert.equal(options.cache, 'no-store');
      if (mode === 'network') throw new Error('fictional offline');
      if (mode === 'html') return new Response('<html>');
      if (mode === 'ok') return new Response(JSON.stringify(read('fixtures/response-chapter.json')));
      if (mode === 'stale') return new Response(JSON.stringify(read('fixtures/reject-wrong-revision.json')));
      return new Response('{}', { status: mode === 'missing' ? 404 : 401 });
    }).client;
    const p = await bridge.prepareTranslation(snapshot, { kind: 'chapter' });
    assert.equal(await client.lookupFrench(p), null);
    for (mode of ['network', 'html', 'auth', 'stale']) await assert.rejects(client.lookupFrench(p));
    mode = 'ok'; assert.deepEqual(clean(await client.lookupFrench(p)), read('fixtures/response-chapter.json'));
  });
  await check('12 actual client + actual proxy: login/enqueue/persist/publish/retrieve offline', async () => {
    const { createHandler } = proxy();
    const id = '22222222-2222-4222-8222-222222222222';
    const env = { NORYA_TRANSLATE_ENABLED: 'true', NORYA_APP_ORIGIN: 'https://norya.example',
      SUPABASE_URL: 'https://auth.example', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-marker',
      NORYA_ADMIN_USER_ID: '11111111-1111-4111-8111-111111111111', TRANSLATE_API_URL: 'https://translate.example',
      TRANSLATE_SHARED_SECRET: randomBytes(32).toString('hex') }; // generated ONLY in memory
    const jobs = new Map(); let published, cookie = '', downstream = 0;
    const json = (v, status = 200) => new Response(JSON.stringify(v), { status });
    const handler = createHandler(env, async (url, options) => {
      if (url.includes('/auth/v1/token')) return json({ access_token: 'fictional-admin-token', expires_in: 3600 });
      if (url.includes('/auth/v1/user')) {
        if (options.headers.Authorization.includes('expired')) return json({}, 401);
        return json({ id: options.headers.Authorization.includes('outsider') ? id : env.NORYA_ADMIN_USER_ID, email_confirmed_at: '2026-01-01' });
      }
      downstream++; assert.equal(options.headers.Authorization, 'Bearer ' + env.TRANSLATE_SHARED_SECRET);
      assert.equal(options.redirect, 'error');
      if (url.endsWith('/api/jobs') && options.method === 'POST') {
        const source = JSON.parse(options.body); jobs.set(id, { id, source_revision: source.sourceRevision, source_json: source, status: 'pending' });
        return json({ id, status: 'pending' }, 201);
      }
      if (url.endsWith('/complete')) { published = JSON.parse(options.body); return json({ ok: true }); }
      if (url.endsWith('/api/jobs/' + id)) return json(jobs.get(id));
      if (url.includes('/api/translations/')) return published ? json({ chapter_id: snapshot.chapterId,
        source_revision: published.sourceRevision, translations: published.translations }) : json({ status: 'missing' }, 404);
      throw new Error('Unexpected fake route');
    });
    async function transport(url, options = {}, origin = env.NORYA_APP_ORIGIN) {
      const req = { url, method: options.method || 'GET', body: options.body, headers: { ...options.headers,
        'content-type': 'application/json', origin, cookie } };
      let raw; const headers = {};
      const res = { statusCode: 200, setHeader(k, v) { headers[k] = v; }, end(s) { raw = s; } };
      await handler(req, res);
      if (headers['Set-Cookie']) { assert.match(headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict/); cookie = headers['Set-Cookie'].split(';')[0]; }
      assert.equal(headers['Cache-Control'], 'no-store');
      assert.equal(raw.includes(env.TRANSLATE_SHARED_SECRET), false);
      return new Response(raw, { status: res.statusCode, headers });
    }
    const { client } = domain(transport);
    const p = await bridge.prepareTranslation(snapshot, { kind: 'chapter' });
    await assert.rejects(client.translateApi('enqueue', {}, p.request)); assert.equal(downstream, 0);
    for (const token of ['expired', 'outsider']) {
      cookie = '__Host-norya-admin=' + token;
      const response = await transport('/api/translate?action=enqueue', { method: 'POST', body: JSON.stringify(p.request) });
      assert.equal(response.status, token === 'expired' ? 401 : 403); assert.equal(downstream, 0);
    }
    cookie = '';
    const login = await client.translateApi('login', {}, { email: 'fiction@example.test', password: 'fictional-not-an-account' });
    assert.deepEqual(clean(login), { administrator: true });
    assert.equal((await transport('/api/translate?action=enqueue', { method: 'POST', body: '{}' }, 'https://evil.example')).status, 403);
    assert.equal(await client.lookupFrench(p), null);
    assert.equal((await client.translateApi('enqueue', {}, p.request)).id, id);
    assert.deepEqual(jobs.get(id).source_json, clean(p.request));
    const incomplete = read('fixtures/publish-chapter.json'); incomplete.translations.pop();
    await assert.rejects(client.translateApi('publish', { id }, incomplete)); assert.equal(published, undefined);
    await client.translateApi('publish', { id }, read('fixtures/publish-chapter.json'));
    assert.deepEqual(clean(await client.lookupFrench(p)), read('fixtures/response-chapter.json'));
    assert.deepEqual(clean(bridge.frenchNodes(p, await client.lookupFrench(p))), read('expected/french-chapter.json'));
  });
  await check('13 closed boundaries: private presentation and storage cannot run', () => {
    assert.throws(() => load('./displayCorrections').sourcePresentation(1, {}), /Forbidden/);
    assert.throws(() => load('@react-native-async-storage/async-storage').getItem('x'), /Forbidden/);
  });
  console.log(`RESULT: ${passed} passed, ${failed} failed. Offline simulation; no real Supabase/API/browser validation.`);
  if (failed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
