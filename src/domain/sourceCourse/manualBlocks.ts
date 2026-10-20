import type { SourcePacket, SourcePart } from './packet';
import type { ChapterValidation } from './verification';
import { calculateChapterStats } from './verification';
import { activeAssociations, deleteAssociation } from './associations';

export type ManualBlockRef = { printedPage: number; blockId: string };
export type ManualSourceRef = ManualBlockRef & { pdfPage: number; sourceSha256: string };
export type ManualBlock = {
  /** Stable user-generated ID; it is never derived from a mutable position. */
  id: string;
  text: string;
  imageDataUrl?: string;
  sourceRef: ManualSourceRef;
  /** The source or manual block immediately preceding this block in the reconstruction. */
  after: ManualBlockRef;
  createdAt: string;
  /** Creation undo is non-destructive so exports retain the audit trail. */
  undoneAt?: string;
};

export type LogicalBlock = {
  printedPage: number;
  pdfPage: number;
  blockId: string;
  part: SourcePart;
  manual?: ManualBlock;
};

const manualId = (validation: ChapterValidation, now: string) => {
  const base = `manual-${now.replace(/[^0-9A-Za-z]/g, '')}`;
  const used = new Set((validation.manualBlocks ?? []).map(block => block.id));
  let suffix = 1;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export function activeManualBlocks(validation: ChapterValidation | null | undefined): ManualBlock[] {
  return (validation?.manualBlocks ?? []).filter(block => !block.undoneAt);
}

export function createManualBlock(validation: ChapterValidation, packet: SourcePacket, after: ManualBlockRef,
  text: string, now = new Date().toISOString(), imageDataUrl?: string): ChapterValidation {
  if (!text.trim() && !imageDataUrl) throw new Error('Ajoutez un texte ou une image.');
  if (imageDataUrl && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) throw new Error('Image invalide.');
  const source = packet.pages.find(page => page.printedPage === after.printedPage)?.parts?.find(part => part.id === after.blockId);
  const existing = activeManualBlocks(validation).find(block => block.id === after.blockId);
  const sourceRef = existing?.sourceRef ?? (source ? {
    printedPage: after.printedPage, pdfPage: packet.pages.find(page => page.printedPage === after.printedPage)!.pdfPage,
    blockId: source.id, sourceSha256: packet.sourceSha256,
  } : null);
  if (!sourceRef) throw new Error('Bloc d’insertion introuvable dans cette source.');
  const id = manualId(validation, now);
  const manual: ManualBlock = { id, text, ...(imageDataUrl ? { imageDataUrl } : {}), sourceRef, after, createdAt: now };
  const pageIndex = validation.pages.findIndex(page => page.printedPage === sourceRef.printedPage);
  if (pageIndex < 0) throw new Error('Page de validation introuvable.');
  const pages = validation.pages.map((page, index) => index !== pageIndex ? page : {
    ...page, blocks: [...page.blocks, { id, page: sourceRef.printedPage, status: 'pending' as const }],
  });
  return { ...validation, pages, ...calculateChapterStats(pages), manualBlocks: [...(validation.manualBlocks ?? []), manual], lastUpdatedAt: now };
}

export function undoManualBlockCreation(validation: ChapterValidation, blockId: string, now = new Date().toISOString()): ChapterValidation {
  const block = activeManualBlocks(validation).find(candidate => candidate.id === blockId);
  if (!block) throw new Error('Bloc manuel actif introuvable.');
  const hasChildren = activeManualBlocks(validation).some(candidate => candidate.after.printedPage === block.sourceRef.printedPage &&
    candidate.after.blockId === blockId);
  if (hasChildren) throw new Error('Annulez d’abord les blocs ajoutés après ce bloc manuel.');
  let next = validation;
  for (const association of activeAssociations(validation)) {
    if ([association.source, association.target].some(ref =>
      ref.printedPage === block.sourceRef.printedPage && ref.blockId === block.id)) {
      next = deleteAssociation(next, association.id, now);
    }
  }
  return {
    ...next,
    manualBlocks: (validation.manualBlocks ?? []).map(candidate => candidate.id === blockId ? { ...candidate, undoneAt: now } : candidate),
    lastUpdatedAt: now,
  };
}

function partForManual(block: ManualBlock, source: SourcePart): SourcePart {
  return {
    id: block.id, kind: block.imageDataUrl ? 'visual' : 'text', role: block.imageDataUrl ? 'figure' : 'paragraph', bbox: source.bbox, status: 'unverified',
    sourceLineIds: [], text: block.text, lines: [[{ text: block.text, bold: false, italic: false }]],
    reasons: [], image: block.imageDataUrl ?? source.image,
  };
}

/** Source order plus active user blocks. The packet is only read, never changed. */
export function logicalBlocks(packet: SourcePacket, validation: ChapterValidation | null | undefined): LogicalBlock[] {
  const children = new Map<string, ManualBlock[]>();
  for (const block of activeManualBlocks(validation)) {
    const key = JSON.stringify([block.after.printedPage, block.after.blockId]);
    children.set(key, [...(children.get(key) ?? []), block].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  }
  const result: LogicalBlock[] = [];
  const appendChildren = (parent: ManualBlockRef, source: SourcePart) => {
    const key = JSON.stringify([parent.printedPage, parent.blockId]);
    for (const manual of children.get(key) ?? []) {
      const sourcePage = packet.pages.find(candidate => candidate.printedPage === manual.sourceRef.printedPage);
      const referencedSource = sourcePage?.parts?.find(candidate => candidate.id === manual.sourceRef.blockId) ?? source;
      if (!referencedSource) continue; // stale imports remain persisted but are not falsely attached to another source.
      const manualPart = partForManual(manual, referencedSource);
      result.push({ printedPage: manual.sourceRef.printedPage, pdfPage: manual.sourceRef.pdfPage, blockId: manual.id, part: manualPart, manual });
      appendChildren({ printedPage: manual.sourceRef.printedPage, blockId: manual.id }, manualPart);
    }
  };
  for (const page of packet.pages) for (const part of page.parts ?? []) {
    result.push({ printedPage: page.printedPage, pdfPage: page.pdfPage, blockId: part.id, part });
    appendChildren({ printedPage: page.printedPage, blockId: part.id }, part);
  }
  return result;
}
