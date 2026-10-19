
export type FreeTranslator = {
  name: string;
  canTranslate: boolean;
  translate(text: string, from: string, to: string): Promise<string>;
};

function chunkText(text: string, size = 4000): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > i + size / 2) end = space;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks.filter(c => c.trim());
}

async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  const params = new URLSearchParams({ q: text, sl: from, tl: to, client: 'gtx', dt: 't' });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
        if (!res.ok) throw new Error(`GTX : erreur HTTP ${res.status}. Réessayez plus tard.`);
        const data: unknown = await res.json();
        if (!Array.isArray(data) || !Array.isArray(data[0]) || !data[0].length ||
            data[0].some((part: unknown) => !Array.isArray(part) || typeof part[0] !== 'string')) {
          throw new Error('GTX : réponse de traduction invalide. Aucun texte enregistré.');
        }
        const out = data[0].map((part: string[]) => part[0]).join('').trim();
        if (!out) throw new Error('GTX : traduction vide. Aucun texte enregistré.');
        return out;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('GTX : délai de 20 secondes dépassé. Vérifiez la connexion puis réessayez.'));
          controller.abort();
        }, 20000);
      }),
    ]);
  } catch (e) {
    if (e instanceof TypeError) throw new Error('GTX inaccessible : connexion, CORS ou blocage du navigateur. Aucune traduction reçue.');
    throw e;
  } finally { if (timer) clearTimeout(timer); }
}

export class GoogleFreeTranslator implements FreeTranslator {
  name = 'google-free-gtx';
  canTranslate = true;
  async translate(text: string, from: string, to: string): Promise<string> {
    const parts = chunkText(text);
    const results: string[] = [];
    for (const p of parts) results.push(await googleTranslate(p, from, to));
    return results.join(' ').replace(/\s+/g, ' ').trim();
  }
}

export function getFreeTranslator(): FreeTranslator {
  return new GoogleFreeTranslator();
}
