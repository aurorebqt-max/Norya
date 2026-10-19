import { validateTranslation, type PreparedTranslation, type ValidatedTranslation } from './translateBridge';

export class TranslateHttpError extends Error {
  constructor(public status: number, message: string) { super(message); Object.setPrototypeOf(this, new.target.prototype); }
}
export async function translateApi(action: string, query: Record<string, string> = {}, body?: unknown) {
  const response = await fetch('/api/translate?' + new URLSearchParams({ action, ...query }), {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let value;
  try { value = await response.json(); } catch { throw new Error('Réponse serveur invalide.'); }
  if (!response.ok) throw new TranslateHttpError(response.status, value.error ?? 'Traduction indisponible.');
  return value;
}
export async function lookupFrench(prepared: PreparedTranslation): Promise<ValidatedTranslation | null> {
  try { return validateTranslation(prepared, await translateApi('lookup', {
    chapterId: prepared.request.chapterId, revision: prepared.request.sourceRevision,
  })); } catch (e) { if (e instanceof TranslateHttpError && e.status === 404) return null; throw e; }
}
