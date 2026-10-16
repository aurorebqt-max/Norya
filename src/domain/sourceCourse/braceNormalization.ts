import type { SourcePacket } from './packet';
import { sourcePresentation } from './displayCorrections';
import { correctMerge, isAbsorbedByMerge, mergeAtAnchor, type MergeBlockRef } from './merges';
import { saveBlockCorrection, savedBlock } from './blockEdits';
import { calculateChapterStats, type BlockValidationStatus, type ChapterValidation } from './verification';
import { saveBlockTable, type BlockTable } from './classification';

export type BraceProposal = {
  id: string;
  kind: 'block' | 'merge' | 'table';
  refs: MergeBlockRef[];
  before: string;
  after: string;
  beforeTable?: BlockTable;
  afterTable?: BlockTable;
  wasVerified: boolean;
};
export type BracePlan = { proposals: BraceProposal[]; skipped: number };

const verified = (status: BlockValidationStatus | undefined) => status === 'verified' || status === 'corrected';
const suspectBraces = /\{([A-Za-zÀ-ÖØ-öø-ÿĂÂÎȘȚăâîșț][^{}\n]{0,180})\}/g;

/** Converts only prose-like brace pairs to a human-review proposal.
 * Numeric sets, nested braces and source text with no clear prose content are deliberately preserved. */
export function preferRoundParentheses(text: string): string {
  return text.replace(suspectBraces, (_match, inside: string) => {
    const trimmed = inside.trim();
    return /[A-Za-zÀ-ÖØ-öø-ÿĂÂÎȘȚăâîșț]/.test(trimmed) && !/[;:]/.test(trimmed) ? `(${inside})` : _match;
  });
}

function tableText(table: BlockTable) {
  return table.rows.map(row => row.filter(cell => !cell.covered).map(cell => cell.text).join('\t')).join('\n');
}
function correctedTable(table: BlockTable): BlockTable {
  return {
    ...JSON.parse(JSON.stringify(table)),
    rows: table.rows.map(row => row.map(cell => ({ ...cell, text: cell.covered ? cell.text : preferRoundParentheses(cell.text) }))),
  };
}
function requireReview(validation: ChapterValidation, refs: MergeBlockRef[], at: string): ChapterValidation {
  const wanted = new Set(refs.map(ref => `${ref.printedPage}:${ref.blockId}`));
  const pages = validation.pages.map(page => ({
    ...page,
    blocks: page.blocks.map(block => {
      if (!wanted.has(`${page.printedPage}:${block.id}`) || !verified(block.status)) return block;
      return {
        ...block, status: 'in-review' as const,
        statusHistory: [...(block.statusHistory ?? []), {
          at, before: block.status, after: 'in-review' as const,
          reason: 'Correction de parenthèses acceptée : confirmation humaine requise.',
        }],
      };
    }),
  }));
  return { ...validation, pages, ...calculateChapterStats(pages), lastUpdatedAt: at };
}

/** Analyzes without writing. Existing manual text corrections and edited merges are excluded. */
export function planBraceNormalization(packet: SourcePacket, validation: ChapterValidation): BracePlan {
  const proposals: BraceProposal[] = [];
  let skipped = 0;
  for (const page of packet.pages) for (const part of page.parts ?? []) {
    const ref = { printedPage: page.printedPage, blockId: part.id };
    if (isAbsorbedByMerge(validation.merges, ref.printedPage, ref.blockId)) continue;
    const saved = savedBlock(validation, ref.printedPage, ref.blockId);
    if (saved?.kind === 'table' && saved.table) {
      const before = tableText(saved.table); const afterTable = correctedTable(saved.table); const after = tableText(afterTable);
      if (before !== after) proposals.push({ id: `${ref.printedPage}:${ref.blockId}:table`, kind: 'table', refs: [ref], before, after,
        beforeTable: saved.table, afterTable, wasVerified: verified(saved.status) });
      continue;
    }
    const base = sourcePresentation(page.printedPage, part);
    if (base.imageOnly || base.hide || ['figure', 'table'].includes(part.role)) { skipped++; continue; }
    const merge = mergeAtAnchor(validation.merges, ref.printedPage, ref.blockId);
    const refs = merge ? merge.sources : [ref];
    const manuallyEdited = refs.some(source => {
      const block = savedBlock(validation, source.printedPage, source.blockId);
      return block?.correction !== undefined || !!block?.correctionHistory?.length;
    }) || !!merge?.editHistory?.length;
    if (manuallyEdited) { skipped++; continue; }
    const before = merge?.joinedText ?? base.text;
    const after = preferRoundParentheses(before);
    if (before !== after) proposals.push({ id: merge?.id ?? `${ref.printedPage}:${ref.blockId}`, kind: merge ? 'merge' : 'block', refs, before, after,
      wasVerified: refs.some(source => verified(savedBlock(validation, source.printedPage, source.blockId)?.status)) });
  }
  return { proposals, skipped };
}

/** Applies explicitly accepted proposals through the existing reversible correction/table mechanisms. */
export function applyBraceNormalization(validation: ChapterValidation, proposals: BraceProposal[], at = new Date().toISOString()): ChapterValidation {
  let next = validation;
  for (const proposal of proposals) {
    if (proposal.kind === 'merge') next = correctMerge(next, proposal.id, proposal.after, at);
    else if (proposal.kind === 'table' && proposal.afterTable) next = saveBlockTable(next, proposal.refs[0], proposal.afterTable, at);
    else next = saveBlockCorrection(next, proposal.refs[0].printedPage, proposal.refs[0].blockId, proposal.before, proposal.after, at);
    next = requireReview(next, proposal.refs, at);
  }
  return next;
}
