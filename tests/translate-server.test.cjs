const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../server/translate.cjs');
const admin = '11111111-1111-4111-8111-111111111111';
const jobId = '22222222-2222-4222-8222-222222222222';
const env = { NORYA_TRANSLATE_ENABLED: 'true', NORYA_APP_ORIGIN: 'https://norya.example',
  SUPABASE_URL: 'https://auth.example', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', NORYA_ADMIN_USER_ID: admin,
  TRANSLATE_API_URL: 'https://translate.example', TRANSLATE_SHARED_SECRET: 'fiction-only-secret-not-a-real-credential' };
const source = { schemaVersion: 1, chapterId: 'fiction', title: 'Fiction', sourceLang: 'ro', targetLang: 'fr',
  sourceRevision: 'a'.repeat(64), blocks: [{ id: 'b'.repeat(64), type: 'paragraph', text: 'Pacient fictiv.' }] };
function harness() {
  const calls = []; const records = new Map(); let published;
  const fetcher = async (url, opts) => {
    calls.push({ url, opts });
    const json = (v, status = 200) => new Response(JSON.stringify(v), { status });
    if (url.includes('/auth/v1/token')) return json({ access_token: 'valid.admin.jwt', expires_in: 3600 });
    if (url.includes('/auth/v1/user')) {
      if (opts.headers.Authorization === 'Bearer expired') return json({}, 401);
      return json({ id: opts.headers.Authorization === 'Bearer outsider' ? jobId : admin, email_confirmed_at: '2026-01-01' });
    }
    assert.equal(opts.headers.Authorization, `Bearer ${env.TRANSLATE_SHARED_SECRET}`);
    assert.equal(opts.redirect, 'error');
    if (url.endsWith('/api/jobs') && opts.method === 'POST') {
      const s = JSON.parse(opts.body); records.set(jobId, { id: jobId, status: 'pending', source_revision: s.sourceRevision, source_json: s });
      return json({ id: jobId, status: 'pending' }, 201);
    }
    if (url.endsWith('/complete')) { published = JSON.parse(opts.body); return json({ ok: true }); }
    if (url.includes('/api/translations/')) return published ? json({ chapter_id: source.chapterId, source_revision: published.sourceRevision,
      translations: published.translations }) : json({ status: 'missing' }, 404);
    if (url.endsWith('/api/jobs/' + jobId)) return json(records.get(jobId));
    throw new Error('unexpected route');
  };
  return { calls, records, fetcher, handler: createHandler(env, fetcher) };
}
async function call(handler, action, { method = 'GET', body, token = 'valid.admin.jwt', origin, query = '', headers = {} } = {}) {
  const req = { url: '/api/translate?action=' + action + query, method, body,
    headers: { ...(token ? { cookie: '__Host-norya-admin=' + token } : {}),
      ...(method === 'POST' ? { origin: env.NORYA_APP_ORIGIN, 'content-type': 'application/json' } : {}),
      ...(origin ? { origin } : {}), ...headers } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(raw) { this.data = JSON.parse(raw); } };
  await handler(req, res); return res;
}
test('anonymous, expired and non-admin requests never access Translate', async () => {
  for (const [token, status] of [[null, 401], ['expired', 401], ['outsider', 403]]) {
    const h = harness(); const r = await call(h.handler, 'enqueue', { method: 'POST', body: source, token });
    assert.equal(r.statusCode, status); assert.equal(h.calls.some(c => c.url.includes('translate.example')), false);
  }
});
test('same-origin policy, method whitelist, disabled config, SSRF query and no CORS bypass', async () => {
  const h = harness();
  assert.equal((await call(h.handler, 'enqueue', { method: 'POST', body: source, origin: 'https://evil.example' })).statusCode, 403);
  assert.equal((await call(h.handler, 'login', { method: 'POST', body: {}, headers: { origin: '' } })).statusCode, 403);
  assert.equal((await call(h.handler, 'lookup', { origin: 'https://evil.example' })).statusCode, 403);
  assert.equal((await call(h.handler, 'login')).statusCode, 405);
  assert.equal((await call(h.handler, 'https://evil.example')).statusCode, 404);
  assert.equal((await call(createHandler({}, h.fetcher), 'session')).statusCode, 503);
  assert.equal(h.calls.length, 0);
  const bad = await call(h.handler, 'job', { query: '&id=https://evil.example' }); assert.equal(bad.statusCode, 400);
  assert.equal(bad.headers['Access-Control-Allow-Origin'], undefined);
});
test('login returns only HttpOnly Secure SameSite cookie, no access/refresh token or shared secret in JSON', async () => {
  const h = harness(); const r = await call(h.handler, 'login', { method: 'POST', token: null, body: { email: 'fiction@example.test', password: 'fiction-only' } });
  assert.equal(r.statusCode, 200); assert.deepEqual(r.data, { administrator: true });
  assert.match(r.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.equal((await call(h.handler, 'logout', { method: 'POST', body: {} })).headers['Set-Cookie'].includes('Max-Age=0'), true);
});
test('fictional enqueue → simulated persistence → strict publication → retrieval', async () => {
  const h = harness();
  const enqueued = await call(h.handler, 'enqueue', { method: 'POST', body: source }); assert.equal(enqueued.statusCode, 201);
  assert.deepEqual(h.records.get(jobId).source_json, source);
  const query = '&chapterId=fiction&revision=' + source.sourceRevision;
  assert.equal((await call(h.handler, 'lookup', { query })).statusCode, 404);
  const valid = { sourceRevision: source.sourceRevision, translations: [{ id: source.blocks[0].id, text: 'Patient fictif.', validated: true }] };
  for (const b of [{ ...valid, sourceRevision: 'old' }, { ...valid, translations: [] },
    { ...valid, translations: [{ ...valid.translations[0], validated: false }] },
    { ...valid, translations: [{ ...valid.translations[0], text: '' }] }])
    assert.equal((await call(h.handler, 'publish', { method: 'POST', query: '&id=' + jobId, body: b })).statusCode, 422);
  assert.equal((await call(h.handler, 'publish', { method: 'POST', query: '&id=' + jobId, body: valid })).statusCode, 200);
  const r = await call(h.handler, 'lookup', { query }); assert.deepEqual(r.data.translations, valid.translations);
});
test('oversize and duplicate input rejected; network details and secrets never reflected', async () => {
  const h = harness();
  assert.equal((await call(h.handler, 'enqueue', { method: 'POST', body: { ...source, blocks: [source.blocks[0], source.blocks[0]] } })).statusCode, 400);
  assert.equal((await call(h.handler, 'enqueue', { method: 'POST', body: 'x'.repeat(2_000_001) })).statusCode, 413);
  const r = await call(createHandler(env, async () => { throw new Error(env.TRANSLATE_SHARED_SECRET); }), 'session');
  assert.equal(r.statusCode, 502); assert.equal(JSON.stringify(r.data).includes(env.TRANSLATE_SHARED_SECRET), false);
});
