import { exportAnomaliesToMarkdown, type AnomalyReport } from './anomalies';
import { buildCourseStructure } from './courseStructure';
import type { SourcePacket } from './packet';
import { activeMerges, sameMergeRef, type BlockMerge } from './merges';
import { workingPresentation } from './blockEdits';
import { calculateChapterStats, reconcileReviewValidation, type ChapterValidation } from './verification';
import type { ManualBlock } from './manualBlocks';

export const STRUCTURE_FORMAT = 'norya-source-structure';
export const STRUCTURE_VERSION = 2;

/**
 * Export unique et réimportable (v2) : texte original (lignes, styles, bbox), corrections, fusions, classifications,
 * tableaux, statuts, anomalies et historiques. La v1 reste lisible à l'import. Contient du texte médical privé.
 */
export function buildStructureExport(packet: SourcePacket, validation: ChapterValidation | null,
  anomalies: AnomalyReport[] = validation?.anomalies ?? [], exportedAt = new Date().toISOString()) {
  const merges = validation?.merges ?? [];
  const structure = validation ? safeStructure(packet, validation) : null;
  const active = activeMerges(merges);
  const blocks = packet.pages.flatMap(page => (page.parts ?? []).map(part => {
    const saved = validation?.pages.find(p => p.printedPage === page.printedPage)?.blocks.find(b => b.id === part.id);
    const ref = { printedPage: page.printedPage, blockId: part.id };
    const absorbedBy = active.find(m => m.sources.slice(1).some(s => sameMergeRef(s, ref)));
    const shown = workingPresentation(page.printedPage, part, validation);
    return {
      printedPage: page.printedPage, pdfPage: page.pdfPage, id: part.id, role: part.role,
      rawText: part.text, correctedText: saved?.correction ?? null, displayedText: shown ? shown.text : null,
      hyphenation: shown?.hyphenation ?? [],
      status: saved?.status ?? 'pending', notes: saved?.notes ?? null,
      verifiedAt: saved?.verifiedAt ?? null, statusHistory: saved?.statusHistory ?? [], correctionHistory: saved?.correctionHistory ?? [],
      kind: saved?.kind ?? null, kindHistory: saved?.kindHistory ?? [], table: saved?.table ?? null,
      mergedInto: absorbedBy?.id ?? null, isMergeAnchor: active.some(m => sameMergeRef(m.sources[0], ref)),
      bbox: part.bbox, sourceLineIds: part.sourceLineIds, lines: part.lines, reasons: part.reasons,
      savedBlock: saved ?? null,
      isImageOnly: part.role === 'figure' || part.role === 'table',
    };
  }));
  return {
    format: STRUCTURE_FORMAT, version: STRUCTURE_VERSION, exportedAt,
    chapterId: packet.chapterId, sourceSha256: packet.sourceSha256 ?? null, schemaVersion: packet.schemaVersion,
    privacy: 'Contient du texte médical privé : ne jamais publier sur GitHub. À ranger sous references-privees/.',
    chapter: { id: packet.chapterId, title: structure?.title ?? null, authors: structure?.authors ?? [], mode: packet.mode },
    progress: validation ? {
      startedAt: validation.startedAt ?? null, lastUpdatedAt: validation.lastUpdatedAt ?? null, complete: validation.complete,
      verifiedBlocks: validation.verifiedBlocks, totalBlocks: validation.totalBlocks,
      verifiedPages: validation.verifiedPages, totalPages: validation.totalPages,
    } : null,
    pages: packet.pages.map(p => ({
      printedPage: p.printedPage, pdfPage: p.pdfPage, width: p.width, height: p.height,
      status: validation?.pages.find(v => v.printedPage === p.printedPage)?.status ?? null,
      verifiedAt: validation?.pages.find(v => v.printedPage === p.printedPage)?.verifiedAt ?? null,
      originalPdfRef: `references-privees: page PDF ${p.pdfPage}`,
    })),
    blocks,
    displayOrder: blocks.filter(b => !b.mergedInto && b.role !== 'page-header')
      .map(b => ({ printedPage: b.printedPage, blockId: b.id, mergeId: active.find(m => sameMergeRef(m.sources[0], { printedPage: b.printedPage, blockId: b.id }))?.id ?? null })),
    merges, splits: validation?.splits ?? [], activeMergeIds: active.map(m => m.id), mergeLog: validation?.mergeLog ?? [],
    manualBlocks: validation?.manualBlocks ?? [],
    associations: validation?.associations ?? [],
    manualBlockReviews: (validation?.manualBlocks ?? []).map(manual => ({
      id: manual.id, printedPage: manual.sourceRef.printedPage,
      savedBlock: validation?.pages.find(page => page.printedPage === manual.sourceRef.printedPage)?.blocks.find(block => block.id === manual.id) ?? null,
    })),
    anomalies, anomalyReportMarkdown: exportAnomaliesToMarkdown(anomalies),
    references: {
      figures: blocks.filter(b => b.role === 'figure').map(b => ({ printedPage: b.printedPage, blockId: b.id })),
      tables: blocks.filter(b => b.role === 'table' || b.kind === 'table').map(b => ({
        printedPage: b.printedPage, blockId: b.id,
        digital: b.table ? (b.table.validated ? 'validated' : b.table.keepOriginal ? 'original-kept' : 'draft') : 'original-image',
      })),
      sections: blocks.filter(b => b.kind === 'h2' && !b.mergedInto).map(b => ({ printedPage: b.printedPage, blockId: b.id, title: b.displayedText })),
    },
  };
}
function safeStructure(packet: SourcePacket, validation: ChapterValidation) {
  try { return buildCourseStructure(packet, validation); } catch { return null; }
}
export type StructureExport = ReturnType<typeof buildStructureExport>;

/**
 * Reconstitue une validation à partir d'un export. Les fusions et corrections importées
 * remplacent celles de même identifiant : aucune duplication. Rien de ce qui existe n'est supprimé :
 * une fusion locale chevauchant une fusion importée est conservée mais marquée comme englobée.
 */
export function importStructureExport(raw: string | StructureExport, packet: SourcePacket,
  current: ChapterValidation | null): ChapterValidation {
  const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as StructureExport;
  if (data?.format !== STRUCTURE_FORMAT) throw new Error('Fichier non reconnu (format norya-source-structure attendu).');
  if (data.version > STRUCTURE_VERSION) throw new Error('Version d’export plus récente que cette application.');
  if (data.chapterId !== packet.chapterId) throw new Error('Cet export concerne un autre chapitre.');
  if (data.sourceSha256 && packet.sourceSha256 && data.sourceSha256 !== packet.sourceSha256) {
    throw new Error('La version de la source ne correspond pas : import refusé.');
  }
  const base = reconcileReviewValidation(current, packet);
  const importedManual = (data.manualBlocks ?? []) as ManualBlock[];
  const knownManual = new Set((base.manualBlocks ?? []).map(block => block.id));
  for (const manual of importedManual) {
    if (!manual || typeof manual.id !== 'string' || !manual.text || manual.sourceRef?.sourceSha256 !== packet.sourceSha256 ||
      !Number.isFinite(manual.sourceRef?.printedPage) || !Number.isFinite(manual.sourceRef?.pdfPage) || !manual.sourceRef?.blockId) {
      throw new Error('Bloc manuel importé invalide ou lié à une autre source.');
    }
  }
  const manualBlocks = [...(base.manualBlocks ?? []), ...importedManual.filter(block => !knownManual.has(block.id))];
  const pages = base.pages.map(page => ({
    ...page, blocks: [...page.blocks, ...manualBlocks.filter(manual => manual.sourceRef.printedPage === page.printedPage &&
      !page.blocks.some(block => block.id === manual.id)).map(manual => {
        const review = data.manualBlockReviews?.find((entry: any) => entry.id === manual.id)?.savedBlock;
        return review ? { ...review, id: manual.id, page: page.printedPage } : { id: manual.id, page: page.printedPage, status: 'pending' as const };
      })].map(block => {
      const incoming = data.blocks.find(b => b.printedPage === page.printedPage && b.id === block.id);
      if (!incoming) return block;
      return {
        ...block, status: incoming.status as typeof block.status, notes: incoming.notes ?? block.notes,
        verifiedAt: incoming.verifiedAt ?? block.verifiedAt,
        statusHistory: incoming.statusHistory ?? incoming.savedBlock?.statusHistory ?? block.statusHistory,
        correction: incoming.correctedText ?? undefined, correctionHistory: incoming.correctionHistory ?? [],
        ...('kind' in incoming ? { kind: incoming.kind ?? undefined, kindHistory: incoming.kindHistory ?? [], table: incoming.table ?? undefined } : {}),
      };
    }),
  }));
  const incomingMerges: BlockMerge[] = data.merges ?? [];
  const incomingActive = incomingMerges.filter(m => !m.supersededBy);
  const ids = new Set(incomingMerges.map(m => m.id));
  const kept = (base.merges ?? []).filter(m => !ids.has(m.id)).map(m => !m.supersededBy &&
    incomingActive.some(i => i.sources.some(s => m.sources.some(t => sameMergeRef(s, t))))
    ? { ...m, supersededBy: incomingActive[0].id } : m);
  const logKey = (e: { at: string; action: string; mergeId: string }) => `${e.at}|${e.action}|${e.mergeId}`;
  const log = [...(base.mergeLog ?? [])];
  for (const e of data.mergeLog ?? []) if (!log.some(x => logKey(x) === logKey(e))) log.push(e);
  const anomalies = [...(base.anomalies ?? [])];
  for (const a of data.anomalies ?? []) {
    const index = anomalies.findIndex(x => x.id === a.id);
    if (index < 0) anomalies.push(a); else anomalies[index] = a;
  }
  const incomingSplits = data.splits ?? [];
  const splitIds = new Set(incomingSplits.map(split => split.id));
  return {
    ...base, ...calculateChapterStats(pages), pages, merges: [...kept, ...incomingMerges],
    splits: [...(base.splits ?? []).filter(split => !splitIds.has(split.id)), ...incomingSplits], manualBlocks,
    associations: data.associations ?? base.associations ?? [],
    mergeLog: log, anomalies, lastUpdatedAt: new Date().toISOString(),
  };
}
