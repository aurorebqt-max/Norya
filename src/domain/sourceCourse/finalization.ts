import type { SourcePacket } from './packet';
import type { ChapterValidation } from './verification';
import type { AnomalyReport } from './anomalies';
import { sourcePresentation, type CoursePresentation } from './displayCorrections';
import { isAbsorbedByMerge, mergeAtAnchor } from './merges';
import { applyClassification, tableProblems } from './classification';
import { activeManualBlocks } from './manualBlocks';
import { activeAssociations, associationProblems } from './associations';
import { logicalBlocks } from './manualBlocks';
import { workingPresentation } from './blockEdits';

export type CoursePacket = Omit<SourcePacket, 'chapterId'> & { chapterId: string };
export type Blockage = { message: string; printedPage?: number; blockId?: string };
export type FinalizationBlockageSummary = {
  activeBlocks: number; manualBlocks: number; anomalies: number; tables: number; structure: number;
};
export type FinalizationEvidence = { packet: CoursePacket; validation: ChapterValidation | null; anomalies: AnomalyReport[] };
export type FinalCourseVersion = {
  version: number; finalizedAt: string; packet: CoursePacket;
  presentations: Record<string, CoursePresentation>;
  validation: ChapterValidation; anomalies: AnomalyReport[];
  humanConfirmation: { visualsAndMergesChecked: true };
  reading?: ReadingTime;
};
export type ReadingTime = { minutes: number; words: number; wordsPerMinute: number };
/** Vitesse de lecture documentée : 200 mots/minute, valeur par défaut de l'estimateur de leçons de Norya. */
export const READING_WORDS_PER_MINUTE = 200;
export type FinalCourseArchive = {
  schemaVersion: 1; chapterId: string; revision: number;
  status: 'finalized' | 'editing'; activeVersion: number; versions: FinalCourseVersion[];
};
export const presentationKey = (page: number, block: string) => JSON.stringify([page, block]);
const verified = (status?: string) => status === 'verified' || status === 'corrected';

/** Read-only gate. Counts in reports and chapter-level totals are never trusted. */
export function finalizationBlockages({ packet, validation, anomalies }: FinalizationEvidence, previous?: FinalCourseArchive | null): Blockage[] {
  const result: Blockage[] = [];
  if (packet.schemaVersion !== 2 || !packet.pages.length) result.push({ message: 'Un cours numérique structuré est requis.' });
  if (!validation || validation.chapterId !== packet.chapterId) result.push({ message: 'Les validations de ce chapitre sont absentes.' });
  const last = previous?.versions[previous.versions.length - 1];
  const pages = new Set<number>();
  for (const page of packet.pages) {
    const at = { printedPage: page.printedPage };
    if (pages.has(page.printedPage)) result.push({ ...at, message: 'Page présente plusieurs fois.' });
    pages.add(page.printedPage);
    if (!page.pdf || !page.parts?.length) result.push({ ...at, message: 'Source PDF ou blocs de la page manquants.' });
    const ids = new Set<string>();
    const lines: string[] = [];
    for (const part of page.parts ?? []) {
      const target = { ...at, blockId: part.id };
      if (ids.has(part.id)) result.push({ ...target, message: 'Identifiant de bloc dupliqué.' });
      ids.add(part.id);
      lines.push(...part.sourceLineIds);
      const saved = validation?.pages.find(p => p.printedPage === page.printedPage)?.blocks.find(b => b.id === part.id);
      if (part.role !== 'page-header' && !verified(saved?.status)) result.push({ ...target, message: 'Bloc non vérifié.' });
      const oldPart = last?.packet.pages.find(p => p.printedPage === page.printedPage)?.parts?.find(p => p.id === part.id);
      const oldReview = last?.validation.pages.find(p => p.printedPage === page.printedPage)?.blocks.find(b => b.id === part.id);
      if (last && part.role !== 'page-header' &&
          (JSON.stringify(oldPart) !== JSON.stringify(part) || oldReview?.correction !== saved?.correction ||
           JSON.stringify(oldReview?.table) !== JSON.stringify(saved?.table)) &&
          (!saved?.verifiedAt || Date.parse(saved.verifiedAt) <= Date.parse(last.finalizedAt) || !Number.isFinite(Date.parse(saved.verifiedAt)))) {
        result.push({ ...target, message: 'Ce bloc a changé depuis la dernière version : une nouvelle vérification humaine est requise.' });
      }
      if (saved?.kind === 'table' && saved.table && !saved.table.validated && !saved.table.keepOriginal) {
        result.push({ ...target, message: 'Tableau numérique non validé : validez-le ou conservez explicitement l’image originale.' });
      }
      if (saved?.kind === 'table' && saved.table?.validated && tableProblems(saved.table).length) {
        result.push({ ...target, message: 'Tableau numérique validé mais vide ou incomplet.' });
      }
      if (saved?.notes && /MERGED_INTO|FUSION DES BLOCS/.test(saved.notes)) {
        result.push({ ...target, message: 'Fusion ancienne à récupérer : son rendu et son enregistrement ne peuvent pas être garantis. Les notes sont conservées.' });
      }
      if (['figure', 'table'].includes(part.role) && (!part.image?.startsWith('data:image/') ||
          part.bbox.length !== 4 || !part.bbox.every(Number.isFinite) || part.bbox[2] <= part.bbox[0] || part.bbox[3] <= part.bbox[1])) {
        result.push({ ...target, message: 'Figure ou tableau sans visuel ou association géométrique valide.' });
      }
    }
    if (!page.sourceLineIds?.length || new Set(lines).size !== lines.length ||
        lines.length !== page.sourceLineIds.length || page.sourceLineIds.some(id => !lines.includes(id))) {
      result.push({ ...at, message: 'Couverture des lignes source incomplète ou dupliquée.' });
    }
  }
  // A manual block is a logical active item, not a child of every source part.
  // Checking it inside the source loop multiplied each blockage by the number of PDF blocks.
  for (const manual of activeManualBlocks(validation)) {
    const saved = validation?.pages.find(page => page.printedPage === manual.sourceRef.printedPage)?.blocks.find(block => block.id === manual.id);
    if (manual.sourceRef.sourceSha256 !== packet.sourceSha256 || !packet.pages.some(page => page.printedPage === manual.sourceRef.printedPage &&
        page.pdfPage === manual.sourceRef.pdfPage && page.parts?.some(part => part.id === manual.sourceRef.blockId))) {
      result.push({ printedPage: manual.sourceRef.printedPage, blockId: manual.id, message: 'Bloc manuel sans provenance PDF compatible.' });
    }
    if (!verified(saved?.status)) result.push({ printedPage: manual.sourceRef.printedPage, blockId: manual.id, message: 'Bloc manuel non vérifié.' });
  }
  for (const association of activeAssociations(validation)) {
    const logical = validation ? logicalBlocks(packet as SourcePacket, validation) : [];
    const source = logical.find(block => block.printedPage === association.source.printedPage && block.blockId === association.source.blockId);
    const problems = !validation || !source ? ['Source indisponible.'] :
      associationProblems(association, workingPresentation(source.printedPage, source.part, validation)?.text ?? '', logical, validation);
    if (association.state !== 'active' || problems.length) result.push({ printedPage: association.source.printedPage, blockId: association.source.blockId,
      message: 'Association à rétablir avant finalisation.' });
  }
  // Inspect orphaned saved merge records too: they must not disappear in an archive.
  for (const page of validation?.pages ?? []) for (const block of page.blocks) {
    if (/MERGED_INTO|FUSION DES BLOCS/.test(block.notes ?? '') &&
        !packet.pages.find(p => p.printedPage === page.printedPage)?.parts?.some(p => p.id === block.id)) {
      result.push({ printedPage: page.printedPage, blockId: block.id, message: 'Fusion enregistrée liée à un bloc absent du cours.' });
    }
  }
  const reports = [...anomalies, ...(validation?.anomalies ?? [])];
  const seen = new Set<string>();
  for (const report of reports) if (report.chapterId === packet.chapterId && report.status !== 'resolved' && !seen.has(report.id)) {
    seen.add(report.id);
    result.push({ printedPage: report.printedPage, blockId: report.blockId,
      message: `Anomalie ${report.status === 'open' ? 'ouverte' : 'à revérifier'} : ${report.description}` });
  }
  return result;
}

/** Stable UI summary; categorization is derived from the exact read-only gate output. */
export function summarizeFinalizationBlockages(blockages: Blockage[]): FinalizationBlockageSummary {
  return blockages.reduce<FinalizationBlockageSummary>((summary, blockage) => {
    if (/^Bloc manuel/.test(blockage.message)) summary.manualBlocks++;
    else if (/^Anomalie /.test(blockage.message)) summary.anomalies++;
    else if (/^Tableau numérique/.test(blockage.message)) summary.tables++;
    else if (/^Bloc non vérifié/.test(blockage.message)) summary.activeBlocks++;
    else summary.structure++;
    return summary;
  }, { activeBlocks: 0, manualBlocks: 0, anomalies: 0, tables: 0, structure: 0 });
}

/** Mots du texte numérique final : chaque bloc une seule fois, sans blocs masqués, absorbés ni images. */
export function readingTime(presentations: Record<string, CoursePresentation>, wordsPerMinute = READING_WORDS_PER_MINUTE): ReadingTime {
  const words = Object.values(presentations).filter(p => !p.hide && !p.imageOnly)
    .reduce((sum, p) => sum + (p.text.trim() ? p.text.trim().split(/\s+/u).length : 0), 0);
  return { minutes: Math.max(1, Math.round(words / wordsPerMinute)), words, wordsPerMinute };
}

export function archiveFinalCourse(previous: FinalCourseArchive | null, evidence: FinalizationEvidence,
  confirmed: boolean, date = new Date().toISOString()): FinalCourseArchive {
  const blockages = finalizationBlockages(evidence, previous);
  if (!confirmed) throw new Error('La confirmation humaine des figures, tableaux et fusions est requise.');
  if (blockages.length) throw new Error(blockages.map(b => b.message).join('\n'));
  if (previous && previous.chapterId !== evidence.packet.chapterId) throw new Error('Chapitre incompatible.');
  if (previous?.status === 'finalized') throw new Error('Rouvrez le cours avant de créer une nouvelle version.');
  const packet = JSON.parse(JSON.stringify(evidence.packet)) as CoursePacket;
  const merges = evidence.validation?.merges;
  const presentations: Record<string, CoursePresentation> = {};
  for (const page of packet.pages) for (const part of page.parts ?? []) {
    const presentation = packet.chapterId === 'kum-08' ? sourcePresentation(page.printedPage, part)
      : { imageOnly: part.role === 'figure' || part.role === 'table', hide: part.role === 'page-header', text: part.text };
    if (isAbsorbedByMerge(merges, page.printedPage, part.id)) {
      presentations[presentationKey(page.printedPage, part.id)] = { ...presentation, hide: true };
      continue;
    }
    const corrected = evidence.validation?.pages.find(p => p.printedPage === page.printedPage)?.blocks.find(b => b.id === part.id)?.correction;
    let shown = corrected !== undefined && !presentation.imageOnly
      ? { ...presentation, text: corrected, heading: undefined, contents: undefined } : presentation;
    const merge = mergeAtAnchor(merges, page.printedPage, part.id);
    if (merge && !shown.imageOnly) shown = { ...shown, text: merge.joinedText, heading: undefined, contents: undefined };
    const block = evidence.validation?.pages.find(p => p.printedPage === page.printedPage)?.blocks.find(b => b.id === part.id);
    shown = applyClassification(shown, block);
    // Les références restent dans les données privées/exportées, mais quittent le cours de révision.
    if (part.role === 'page-header' || block?.kind === 'h1' || block?.kind === 'authors' || block?.kind === 'toc' || block?.kind === 'bibliography') {
      shown = { ...shown, hide: true };
    }
    presentations[presentationKey(page.printedPage, part.id)] = shown;
  }
  for (const manual of activeManualBlocks(evidence.validation)) {
    const block = evidence.validation?.pages.find(page => page.printedPage === manual.sourceRef.printedPage)?.blocks.find(item => item.id === manual.id);
    let shown: CoursePresentation = { imageOnly: false, hide: false, text: block?.correction ?? manual.text };
    shown = applyClassification(shown, block);
    if (block?.kind === 'h1' || block?.kind === 'authors' || block?.kind === 'toc' || block?.kind === 'bibliography') shown = { ...shown, hide: true };
    presentations[presentationKey(manual.sourceRef.printedPage, manual.id)] = shown;
  }
  const version = (previous?.versions.reduce((max, v) => Math.max(max, v.version), 0) ?? 0) + 1;
  const snapshot: FinalCourseVersion = JSON.parse(JSON.stringify({ version, finalizedAt: date, packet, presentations, reading: readingTime(presentations),
    validation: evidence.validation!, anomalies: evidence.anomalies, humanConfirmation: { visualsAndMergesChecked: true } }));
  return { schemaVersion: 1, chapterId: packet.chapterId, revision: (previous?.revision ?? 0) + 1,
    status: 'finalized', activeVersion: version, versions: [...(previous?.versions ?? []), snapshot] };
}
export function reopenFinalCourse(archive: FinalCourseArchive): FinalCourseArchive {
  return { ...archive, revision: archive.revision + 1, status: 'editing' };
}
export function activateFinalVersion(archive: FinalCourseArchive, version: number): FinalCourseArchive {
  if (!archive.versions.some(v => v.version === version)) throw new Error('Version introuvable.');
  return { ...archive, revision: archive.revision + 1, status: 'finalized', activeVersion: version };
}
