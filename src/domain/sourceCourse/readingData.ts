import type { BlockTable } from './classification';
/** Personal overlays. Neither the packet nor its human validations are stored here. */
export const highlightColors = { yellow: '#FFF0A8', green: '#DFF2CF', pink: '#F9DCE7', blue: '#DDEBFA' } as const;
export type HighlightColor = keyof typeof highlightColors;
export type ReadingRef = { chapterId: string; sourceSha256: string; printedPage: number; blockId: string };
export type ReadingAnchor = ReadingRef & { version: string; sourceText: string; start: number; end: number; quote: string };
export type ReadingAnnotation = ReadingAnchor & {
  id: string; color?: HighlightColor; note: string; updatedAt: string; deletedAt?: string;
};
export type ReadingTranslation = ReadingAnchor & {
  id: string; french: string; frenchTable?: BlockTable; provider: string; updatedAt: string; warnings: string[];
};
export type ReadingData = {
  schemaVersion: 1; chapterId: string; annotations: ReadingAnnotation[]; translations: ReadingTranslation[];
  preferences: { rate: number; voice?: string; voices?: Partial<Record<'ro' | 'fr', string>>; language: 'ro' | 'fr' | 'both' };
};
export const emptyReadingData = (chapterId: string): ReadingData => ({ schemaVersion: 1, chapterId,
  annotations: [], translations: [], preferences: { rate: 1, language: 'ro' } });
export const sameReadingBlock = (a: ReadingRef, b: ReadingRef) => a.chapterId === b.chapterId &&
  a.sourceSha256 === b.sourceSha256 && a.printedPage === b.printedPage && a.blockId === b.blockId;
export function readingAnchor(ref: ReadingRef, version: string, text: string, start: number, end: number): ReadingAnchor {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length)
    throw new Error('Sélection invalide. Sélectionnez un passage précis du texte roumain.');
  return { ...ref, version, sourceText: text, start, end, quote: text.slice(start, end) };
}
/** Exact full text + provenance required. Never guess the first occurrence after republication. */
export const anchorMatches = (a: ReadingAnchor, ref: ReadingRef, text: string) =>
  sameReadingBlock(a, ref) && a.sourceText === text && text.slice(a.start, a.end) === a.quote;
export function putAnnotation(data: ReadingData, anchor: ReadingAnchor, color: HighlightColor | undefined, note: string,
  id?: string, now = new Date().toISOString()): ReadingData {
  if (anchor.chapterId !== data.chapterId) throw new Error('Chapitre incompatible.');
  readingAnchor(anchor, anchor.version, anchor.sourceText, anchor.start, anchor.end);
  const existing = id ? data.annotations.find(a => a.id === id) : data.annotations.find(a => !a.deletedAt &&
    anchorMatches(a, anchor, anchor.sourceText) && a.start === anchor.start && a.end === anchor.end);
  const value: ReadingAnnotation = { ...anchor, color, note, id: existing?.id ?? `mark-${Date.now()}-${Math.random().toString(36).slice(2)}`, updatedAt: now };
  return { ...data, annotations: [...data.annotations.filter(a => a.id !== value.id), value] };
}
export function removeAnnotation(data: ReadingData, id: string, now = new Date().toISOString()): ReadingData {
  return { ...data, annotations: data.annotations.map(a => a.id === id ? { ...a, deletedAt: now, updatedAt: now } : a) };
}
export function decodeReadingData(raw: string, chapterId: string): ReadingData {
  const value = JSON.parse(raw) as ReadingData;
  const anchorValid = (a: ReadingAnchor) => a && a.chapterId === chapterId && typeof a.sourceSha256 === 'string' &&
    Number.isInteger(a.printedPage) && typeof a.blockId === 'string' && typeof a.version === 'string' &&
    typeof a.sourceText === 'string' && typeof a.quote === 'string' && Number.isInteger(a.start) && Number.isInteger(a.end) &&
    a.start >= 0 && a.end > a.start && a.end <= a.sourceText.length && a.sourceText.slice(a.start, a.end) === a.quote;
  const recordValid = (a: { id: string; updatedAt: string }) => typeof a.id === 'string' && !!a.id && Number.isFinite(Date.parse(a.updatedAt));
  if (!value || value.schemaVersion !== 1 || value.chapterId !== chapterId || !Array.isArray(value.annotations) || !Array.isArray(value.translations) ||
    value.annotations.some(a => !anchorValid(a) || !recordValid(a) || typeof a.note !== 'string' ||
      (a.color !== undefined && !Object.hasOwn(highlightColors, a.color)) || (a.deletedAt !== undefined && !Number.isFinite(Date.parse(a.deletedAt)))) ||
    value.translations.some(a => !anchorValid(a) || !recordValid(a) || typeof a.french !== 'string' || !a.french.trim() ||
      (a.frenchTable !== undefined && (!Array.isArray(a.frenchTable.rows) || a.frenchTable.rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell?.text !== 'string')))) ||
      typeof a.provider !== 'string' || !Array.isArray(a.warnings) || a.warnings.some(w => typeof w !== 'string')) ||
    !value.preferences || ![0.7, 0.85, 1, 1.15, 1.3].includes(value.preferences.rate) ||
    !['ro', 'fr', 'both'].includes(value.preferences.language) || (value.preferences.voice !== undefined && typeof value.preferences.voice !== 'string') ||
    (value.preferences.voices !== undefined && (!value.preferences.voices || typeof value.preferences.voices !== 'object' || Array.isArray(value.preferences.voices) || Object.entries(value.preferences.voices).some(([key, voice]) => !['ro', 'fr'].includes(key) || typeof voice !== 'string'))) ||
    new Set(value.annotations.map(a => a.id)).size !== value.annotations.length ||
    new Set(value.translations.map(a => a.id)).size !== value.translations.length)
    throw new Error('Sauvegarde de révision invalide ou appartenant à un autre chapitre. Données conservées.');
  return value;
}
/** Merge, never reset. Tombstones and prior translations survive restoration. */
export function restoreReadingData(current: ReadingData, raw: string): ReadingData {
  const imported = decodeReadingData(raw, current.chapterId);
  const merge = <T extends { id: string; updatedAt: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map(v => [v.id, v]));
    for (const value of b) if (!map.has(value.id) || Date.parse(map.get(value.id)!.updatedAt) < Date.parse(value.updatedAt)) map.set(value.id, value);
    return [...map.values()];
  };
  return { ...current, annotations: merge(current.annotations, imported.annotations), translations: merge(current.translations, imported.translations) };
}
