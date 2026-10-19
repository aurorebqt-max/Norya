"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateHttpError = void 0;
exports.translateApi = translateApi;
exports.lookupFrench = lookupFrench;
const translateBridge_1 = require("./translateBridge");
class TranslateHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.TranslateHttpError = TranslateHttpError;
async function translateApi(action, query = {}, body) {
    const response = await fetch('/api/translate?' + new URLSearchParams({ action, ...query }), {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let value;
    try {
        value = await response.json();
    }
    catch {
        throw new Error('Réponse serveur invalide.');
    }
    if (!response.ok)
        throw new TranslateHttpError(response.status, value.error ?? 'Traduction indisponible.');
    return value;
}
async function lookupFrench(prepared) {
    try {
        return (0, translateBridge_1.validateTranslation)(prepared, await translateApi('lookup', {
            chapterId: prepared.request.chapterId, revision: prepared.request.sourceRevision,
        }));
    }
    catch (e) {
        if (e instanceof TranslateHttpError && e.status === 404)
            return null;
        throw e;
    }
}
