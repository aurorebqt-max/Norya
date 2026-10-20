import type { Reading } from '../learning/types';
import { parseSourcePacket, type SourcePacket } from './packet';
import { importStructureExport, type StructureExport } from './structureExport';
import { decodeReadingData, type ReadingData } from './readingData';
import type { ChapterValidation } from './verification';
import type { FinalCourseArchive } from './finalization';

export type ChapterBackup = {
  format: 'norya-chapter-backup'; version: 1; chapterId: string; exportedAt: string;
  packet: SourcePacket; validation: ChapterValidation | null;
  archive: FinalCourseArchive | null; reading: ReadingData | null; legacyStructure?: StructureExport; learningReading?: Reading | null;
};
/** No inference of human finalization from an export's progress counters. */
export function packageLegacyExport(packet: SourcePacket, structure: StructureExport): ChapterBackup {
  parseSourcePacket(JSON.stringify(packet));
  const source = packet.pages.flatMap(p => (p.parts ?? []).map(b => ({ page: p.printedPage, b })));
  if (source.length !== structure.blocks.length || source.some(({ page, b }) => {
    const incoming = structure.blocks.find(x => x.printedPage === page && x.id === b.id);
    return !incoming || incoming.rawText !== b.text;
  })) throw new Error('Les blocs bruts ne correspondent pas au paquet source.');
  const validation = importStructureExport(structure, packet, null);
  validation.startedAt = structure.progress?.startedAt ?? validation.startedAt;
  validation.lastUpdatedAt = structure.progress?.lastUpdatedAt ?? validation.lastUpdatedAt;
  validation.pages = validation.pages.map(page => {
    const incomingPage = structure.pages.find(p => p.printedPage === page.printedPage);
    return { ...page, ...(incomingPage?.status ? { status: incomingPage.status } : {}),
      ...(incomingPage?.verifiedAt ? { verifiedAt: incomingPage.verifiedAt } : {}), blocks: page.blocks.map(block => {
        const original = structure.blocks.find(b => b.printedPage === page.printedPage && b.id === block.id)?.savedBlock;
        return original ? { ...original, id: block.id, page: page.printedPage } : block;
      }) };
  });
  return { format: 'norya-chapter-backup', version: 1, chapterId: packet.chapterId,
    exportedAt: new Date().toISOString(), packet, validation, legacyStructure: structure, archive: null, reading: null };
}
export function parseChapterBackup(raw: string, chapterId: string): ChapterBackup {
  const data = JSON.parse(raw) as ChapterBackup;
  if (data.format !== 'norya-chapter-backup' || data.version !== 1 || data.chapterId !== chapterId)
    throw new Error('Sauvegarde portable attendue pour ce chapitre. Un export de structure seul ne contient pas les images.');
  parseSourcePacket(JSON.stringify(data.packet));
  if (data.packet.chapterId !== chapterId || (data.validation && (data.validation.chapterId !== chapterId || !Array.isArray(data.validation.pages))))
    throw new Error('Chapitre ou vérification incompatible.');
  if (data.reading) decodeReadingData(JSON.stringify(data.reading), chapterId);
  if (data.archive) {
    const a = data.archive;
    if (a.chapterId !== chapterId || a.schemaVersion !== 1 || !['editing', 'finalized'].includes(a.status) ||
      !Number.isInteger(a.revision) || !Array.isArray(a.versions) || !a.versions.some(v => v.version === a.activeVersion))
      throw new Error('Archive finalisée invalide.');
    for (const v of a.versions) {
      parseSourcePacket(JSON.stringify(v.packet));
      if (v.packet.chapterId !== chapterId || v.validation?.chapterId !== chapterId || !v.presentations || !v.humanConfirmation?.visualsAndMergesChecked)
        throw new Error('Version finalisée incomplète.');
    }
  }
  return data;
}
