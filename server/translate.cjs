'use strict';
// Server-only. No imports from app/ or src/. No payload, password or token logging.
const COOKIE = '__Host-norya-admin';
const ID = /^[a-zA-Z0-9_-]{1,120}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
class Failure extends Error { constructor(status, message) { super(message); this.status = status; } }
function sourceValid(s) {
  return s && s.schemaVersion === 1 && typeof s.chapterId === 'string' && ID.test(s.chapterId) && HASH.test(s.sourceRevision) &&
    s.sourceLang === 'ro' && s.targetLang === 'fr' && typeof s.title === 'string' && s.title.length <= 500 &&
    Array.isArray(s.blocks) && s.blocks.length > 0 && s.blocks.length <= 3000 &&
    s.blocks.every(b => b && HASH.test(b.id) && typeof b.type === 'string' && b.type.length <= 60 &&
      typeof b.text === 'string' && b.text.trim() && b.text.length <= 30000) &&
    new Set(s.blocks.map(b => b.id)).size === s.blocks.length;
}
function completeValid(source, data) {
  if (!data || data.sourceRevision !== source.source_revision || !Array.isArray(data.translations)) return false;
  const blocks = source.source_json?.blocks;
  if (!Array.isArray(blocks) || data.translations.length !== blocks.length) return false;
  const ids = new Set(blocks.map(b => b.id));
  return data.translations.every(t => t && ids.delete(t.id) && t.validated === true &&
    typeof t.text === 'string' && t.text.trim() && t.text.length <= 30000) && ids.size === 0;
}
function createHandler(env = process.env, fetcher = fetch) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin, Cookie');
    const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    res.setHeader('Content-Type', 'application/json');
    try {
      if (env.NORYA_TRANSLATE_ENABLED !== 'true') throw new Failure(503, 'Intégration Translate non configurée.');
      const origin = new URL(env.NORYA_APP_ORIGIN).origin;
      const supabase = new URL(env.SUPABASE_URL);
      const translate = new URL(env.TRANSLATE_API_URL);
      if (![origin, supabase.origin, translate.origin].every(s => s.startsWith('https://')) ||
          !UUID.test(env.NORYA_ADMIN_USER_ID || '') || !env.SUPABASE_PUBLISHABLE_KEY ||
          (env.TRANSLATE_SHARED_SECRET || '').length < 24 || translate.username || translate.password ||
          translate.pathname !== '/' || translate.search || translate.hash) throw new Failure(503, 'Configuration serveur invalide.');
      const url = new URL(req.url, origin);
      const action = url.searchParams.get('action');
      const methods = { login: 'POST', logout: 'POST', session: 'GET', lookup: 'GET', enqueue: 'POST', job: 'GET', publish: 'POST' };
      if (!Object.hasOwn(methods, action || '')) throw new Failure(404, 'Route inconnue.');
      if (req.method !== methods[action]) throw new Failure(405, 'Méthode refusée.');
      // Reject cross-origin reads too; missing Origin is normal for same-origin GET only.
      if ((req.headers.origin && req.headers.origin !== origin) ||
          (req.method === 'POST' && req.headers.origin !== origin) ||
          (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])))
        throw new Failure(403, 'Origine refusée.');
      const remote = async (address, options = {}) => {
        try { return await fetcher(address, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' }); }
        catch { throw new Failure(502, 'Service distant indisponible.'); }
      };
      const body = () => {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Failure(415, 'JSON requis.');
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (!raw || Buffer.byteLength(raw) > 2_000_000) throw new Failure(413, 'Demande trop volumineuse.');
        try { return JSON.parse(raw); } catch { throw new Failure(400, 'JSON invalide.'); }
      };
      const auth = async token => {
        if (!token || token.length > 8000 || !/^[A-Za-z0-9_.-]+$/.test(token)) throw new Failure(401, 'Connexion requise.');
        const r = await remote(supabase.origin + '/auth/v1/user', { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Failure(r.status >= 500 ? 502 : 401, 'Session invalide ou expirée.');
        const user = await r.json();
        if (user.id !== env.NORYA_ADMIN_USER_ID || !user.email_confirmed_at || user.is_anonymous === true)
          throw new Failure(403, 'Accès réservé à l’administratrice.');
      };
      const cookie = (token, age) => res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
      if (action === 'login') {
        const b = body();
        if (typeof b.email !== 'string' || b.email.length > 320 || typeof b.password !== 'string' || b.password.length > 1024)
          throw new Failure(400, 'Identifiants invalides.');
        const r = await remote(supabase.origin + '/auth/v1/token?grant_type=password', { method: 'POST',
          headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: b.email, password: b.password }) });
        if (!r.ok) throw new Failure(r.status === 429 ? 429 : 401, 'Connexion refusée.');
        const session = await r.json(); await auth(session.access_token);
        cookie(session.access_token, Math.min(3600, Math.max(0, Math.floor(session.expires_in || 0))));
        return send(200, { administrator: true });
      }
      if (action === 'logout') { cookie('', 0); return send(200, { administrator: false }); }
      const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
      await auth(token);
      if (action === 'session') return send(200, { administrator: true });
      const upstream = async (path, method = 'GET', data) => {
        const r = await remote(translate.origin + path, { method, headers: {
          Authorization: `Bearer ${env.TRANSLATE_SHARED_SECRET}`, 'Content-Type': 'application/json' },
          ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
        if (r.status === 404) return { status: 404, value: { status: 'missing' } };
        if (!r.ok) throw new Failure(r.status === 409 ? 409 : 502, 'Translate a refusé la demande.');
        return { status: r.status, value: await r.json() };
      };
      if (action === 'enqueue') {
        const b = body(); if (!sourceValid(b)) throw new Failure(400, 'Source Translate invalide.');
        const r = await upstream('/api/jobs', 'POST', b); return send(r.status, r.value);
      }
      if (action === 'lookup') {
        const chapter = url.searchParams.get('chapterId'), revision = url.searchParams.get('revision');
        if (!ID.test(chapter || '') || !HASH.test(revision || '')) throw new Failure(400, 'Référence invalide.');
        const r = await upstream(`/api/translations/${chapter}?revision=${revision}`); return send(r.status, r.value);
      }
      const id = url.searchParams.get('id');
      if (!UUID.test(id || '')) throw new Failure(400, 'Identifiant de tâche invalide.');
      const job = await upstream(`/api/jobs/${id}`);
      if (job.status === 404) return send(404, job.value);
      if (action === 'job') return send(200, job.value);
      const b = body();
      if (!completeValid(job.value, b)) throw new Failure(422, 'Chaque texte doit être complet et validé humainement.');
      const r = await upstream(`/api/jobs/${id}/complete`, 'POST', b); return send(r.status, r.value);
    } catch (error) { return send(error instanceof Failure ? error.status : 500,
      { error: error instanceof Failure ? error.message : 'Erreur serveur. Aucune donnée affichée.' }); }
  };
}
module.exports = { createHandler, sourceValid, completeValid };
