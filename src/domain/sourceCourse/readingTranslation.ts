import { Platform } from 'react-native';
import type { ReadingAnchor } from './readingData';

export type TranslationProvider = {
  name: string;
  canTranslate: boolean;
  translate(text: string, from: string, to: string): Promise<string>;
};

const MAX_CHARS = 5000;

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

export async function translateBlocks(provider: TranslationProvider, blocks: Array<{ anchor: ReadingAnchor; text: string }>): Promise<Array<{ anchor: ReadingAnchor; french: string; warnings: string[] }>> {
  const results: Array<{ anchor: ReadingAnchor; french: string; warnings: string[] }> = [];
  for (const block of blocks) {
    const text = block.text.trim();
    if (!text) continue;
    try {
      const chunks = chunkText(text);
      const parts: string[] = [];
      for (const c of chunks) {
        parts.push(await provider.translate(c, 'ro', 'fr'));
      }
      results.push({ anchor: block.anchor, french: parts.join(' ').replace(/\s+/g, ' ').trim(), warnings: [] });
    } catch (e) {
      results.push({ anchor: block.anchor, french: text, warnings: [e instanceof Error ? e.message : String(e)] });
    }
  }
  return results;
}

class LibreTranslateProvider implements TranslationProvider {
  name = 'libretranslate';
  canTranslate = false;
  constructor(private url: string = 'http://localhost:5000') {}
  async translate(text: string, from: string, to: string): Promise<string> {
    try {
      const res = await fetch(`${this.url}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: from, target: to, format: 'text' })
      });
      if (!res.ok) throw new Error(`translate_${res.status}`);
      const data = await res.json();
      if (typeof data?.translatedText === 'string') return data.translatedText;
    } catch (e) {
      throw e;
    }
    return text;
  }
}

export function getDefaultProvider(): TranslationProvider {
  if (Platform.OS === 'web') {
    return {
      name: 'browser-free',
      canTranslate: false,
      async translate(text: string) { return text; }
    };
  }
  return new LibreTranslateProvider();
}
