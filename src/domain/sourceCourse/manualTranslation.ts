import { readingAnchor, type ReadingData, type ReadingTranslation } from './readingData';
import { translationSnapshot, digest } from './translateBridge';
import type { FinalCourseVersion } from './finalization';

export async function manualTranslationTemplate(final: FinalCourseVersion) {
  const snapshot = translationSnapshot(final.packet, final.validation, final.presentations);
  return { format: 'norya-manual-fr', schemaVersion: 1, chapterId: final.packet.chapterId,
    sourceSha256: final.packet.sourceSha256, version: String(final.version),
    revision: await digest({ packet: final.packet, presentations: final.presentations, validation: final.validation }),
    blocks: snapshot.nodes.filter(n => !n.hide && !n.imageOnly && n.text.trim()).map(n => ({
      printedPage: n.printedPage, blockId: n.blockId, sourceText: n.text, french: '',
      ...(n.kind === 'table' && n.table?.validated && !n.table.keepOriginal ? { table: n.table, frenchCells: n.table.rows.map(row => row.map(() => '')), frenchTitle: '', frenchNotes: '' } : {}),
    })) };
}
export async function parseManualTranslation(raw: string, final: FinalCourseVersion) {
  const expected = await manualTranslationTemplate(final); const data = JSON.parse(raw);
  if (data.format !== expected.format || data.schemaVersion !== 1 || data.chapterId !== expected.chapterId ||
    data.sourceSha256 !== expected.sourceSha256 || data.version !== expected.version || data.revision !== expected.revision || !Array.isArray(data.blocks))
    throw new Error('Traduction incompatible avec ce chapitre ou sa version finalisée.');
  const seen = new Set<string>(); const translations: ReadingTranslation[] = []; const now = new Date().toISOString();
  for (const block of data.blocks) {
    const key = JSON.stringify([block.printedPage, block.blockId]);
    const source = expected.blocks.find(b => b.printedPage === block.printedPage && b.blockId === block.blockId);
    if (!source || seen.has(key) || source.sourceText !== block.sourceText || typeof block.french !== 'string')
      throw new Error(`Bloc inconnu, dupliqué ou texte source modifié : ${key}`);
    seen.add(key);
    if (!block.french.trim()) continue;
    let frenchTable;
    if (source.table) {
      if (!Array.isArray(block.frenchCells) || block.frenchCells.length !== source.table.rows.length ||
        source.table.rows.some((row, r) => !Array.isArray(block.frenchCells[r]) || block.frenchCells[r].length !== row.length ||
          row.some((cell, c) => typeof block.frenchCells[r][c] !== 'string' || (cell.text.trim() && !block.frenchCells[r][c].trim()))) ||
        typeof block.frenchTitle !== 'string' || typeof block.frenchNotes !== 'string' ||
        (source.table.title?.trim() && !block.frenchTitle.trim()) || (source.table.notes?.trim() && !block.frenchNotes.trim()))
        throw new Error(`Traduction du tableau incomplète : ${key}`);
      frenchTable = { ...source.table, title: block.frenchTitle, notes: block.frenchNotes,
        rows: source.table.rows.map((row, r) => row.map((cell, c) => ({ ...cell, text: block.frenchCells[r][c] }))) };
    }
    translations.push({ ...readingAnchor({ chapterId: expected.chapterId, sourceSha256: expected.sourceSha256,
      printedPage: block.printedPage, blockId: block.blockId }, expected.version, source.sourceText, 0, source.sourceText.length),
      id: `manual-fr:${expected.revision}:${key}:${now}`, french: block.french, ...(frenchTable ? { frenchTable } : {}), provider: 'manual-json', updatedAt: now, warnings: [] });
  }
  if (!translations.length) throw new Error('Aucun bloc français renseigné.');
  return { translations, missing: expected.blocks.length - translations.length };
}
export function appendManualTranslation(data: ReadingData, translations: ReadingTranslation[]): ReadingData {
  if (translations.some(t => t.chapterId !== data.chapterId)) throw new Error('Chapitre incompatible.');
  return { ...data, translations: [...data.translations, ...translations.filter(t => !data.translations.some(old => old.id === t.id))] };
}
