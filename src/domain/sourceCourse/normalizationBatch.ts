import type { SourcePacket } from './packet';
import { sourcePresentation } from './displayCorrections';
import { correctMerge, isAbsorbedByMerge, mergeAtAnchor, type MergeBlockRef } from './merges';
import { normalizeParagraphLines } from './paragraphNormalization';
import { saveBlockCorrection, savedBlock } from './blockEdits';
import { calculateChapterStats, type BlockValidationStatus, type ChapterValidation } from './verification';

export type NormalizationProposal = {
  id: string;
  kind: 'block' | 'merge';
  refs: MergeBlockRef[];
  before: string;
  after: string;
  wasVerified: boolean;
};
export type NormalizationAmbiguity = { ref: MergeBlockRef; reason: string };
export type NormalizationPlan = { proposals: NormalizationProposal[]; ambiguities: NormalizationAmbiguity[]; skipped: number };

const manualRecord = (validation: ChapterValidation, refs: MergeBlockRef[]) => refs.some(ref => {
  const block = savedBlock(validation, ref.printedPage, ref.blockId);
  return block?.correction !== undefined || !!block?.correctionHistory?.length;
});
const verified = (status: BlockValidationStatus | undefined) => status === 'verified' || status === 'corrected';

/** Analyse sans écrire : seuls les blocs structurés comme prose et sans modification humaine sont proposés. */
export function planParagraphNormalization(packet: SourcePacket, validation: ChapterValidation): NormalizationPlan {
  const proposals: NormalizationProposal[] = [];
  const ambiguities: NormalizationAmbiguity[] = [];
  let skipped = 0;
  for (const page of packet.pages) for (const part of page.parts ?? []) {
    const ref = { printedPage: page.printedPage, blockId: part.id };
    if (isAbsorbedByMerge(validation.merges, ref.printedPage, ref.blockId)) continue;
    const saved = savedBlock(validation, ref.printedPage, ref.blockId);
    const base = sourcePresentation(page.printedPage, part);
    if (base.imageOnly || base.hide || saved?.kind === 'table' || ['table', 'figure', 'contents'].includes(part.role)) { skipped++; continue; }
    const merge = mergeAtAnchor(validation.merges, ref.printedPage, ref.blockId);
    const refs = merge ? merge.sources : [ref];
    if (manualRecord(validation, refs) || (merge?.editHistory?.length)) { skipped++; continue; }
    const before = merge?.joinedText ?? base.text;
    const result = normalizeParagraphLines(before, part.role);
    for (const decision of result.decisions) if (decision.status === 'ambiguous') ambiguities.push({ ref, reason: decision.reason });
    for (const decision of result.hyphenation) if (decision.status === 'ambiguous') ambiguities.push({ ref, reason: decision.reason });
    if (result.text === before) continue;
    proposals.push({
      id: merge?.id ?? `${ref.printedPage}:${ref.blockId}`, kind: merge ? 'merge' : 'block',
      refs, before, after: result.text,
      wasVerified: refs.some(source => verified(savedBlock(validation, source.printedPage, source.blockId)?.status)),
    });
  }
  return { proposals, ambiguities, skipped };
}

function requireReview(validation: ChapterValidation, refs: MergeBlockRef[], at: string): ChapterValidation {
  const wanted = new Set(refs.map(ref => JSON.stringify([ref.printedPage, ref.blockId])));
  const pages = validation.pages.map(page => ({
    ...page,
    blocks: page.blocks.map(block => {
      if (!wanted.has(JSON.stringify([page.printedPage, block.id])) || !verified(block.status)) return block;
      return {
        ...block, status: 'in-review' as const,
        statusHistory: [...(block.statusHistory ?? []), {
          at, before: block.status, after: 'in-review' as const,
          reason: 'Normalisation de paragraphes acceptée : confirmation humaine requise.',
        }],
      };
    }),
  }));
  return { ...validation, pages, ...calculateChapterStats(pages), lastUpdatedAt: at };
}

/** Applique les propositions explicitement acceptées, dans l’historique existant et sans modifier la source. */
export function applyParagraphNormalization(validation: ChapterValidation, proposals: NormalizationProposal[],
  at = new Date().toISOString()): ChapterValidation {
  let next = validation;
  for (const proposal of proposals) {
    next = proposal.kind === 'merge'
      ? correctMerge(next, proposal.id, proposal.after, at)
      : saveBlockCorrection(next, proposal.refs[0].printedPage, proposal.refs[0].blockId, proposal.before, proposal.after, at);
    next = requireReview(next, proposal.refs, at);
  }
  return next;
}
