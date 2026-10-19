import type { AnomalyReport } from './anomalies';
import type { SourcePacket, SourcePage } from './packet';
import type { BlockValidationStatus, ChapterValidation } from './verification';
import { isAbsorbedByMerge, mergeAtAnchor } from './merges';
import { logicalBlocks } from './manualBlocks';

export type ReviewFilter = 'all' | 'mine' | 'verified' | 'pending';
export const REVIEW_FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'mine', label: 'Mes anomalies' },
  { id: 'verified', label: 'Vérifiés' }, { id: 'pending', label: 'À vérifier' },
];
export type ReviewTarget = {
  key: string; printedPage: number; pageIndex: number; blockIndex: number;
  blockId: string; status: BlockValidationStatus;
  manual?: boolean;
  /** Anomalie (tous statuts) ou correction manuelle enregistrée sur ce bloc logique. */
  mine: boolean;
};
export const isVerified = (status: BlockValidationStatus) => status === 'verified' || status === 'corrected';
export const reviewBlocks = (page: SourcePage | undefined) => (page?.parts ?? []).filter(p => p.role !== 'page-header');
export const reviewKey = (chapterId: string, page: number, blockId: string) => JSON.stringify([chapterId, page, blockId]);

function visibleStatus(status: BlockValidationStatus | undefined, hasActiveAnomaly: boolean): BlockValidationStatus {
  return hasActiveAnomaly && (!status || isVerified(status)) ? 'issue-found' : status ?? 'pending';
}

/** Derived only from the current packet and existing validation: no second registry.
 * Les blocs absorbés par une fusion active n'ont pas de cible ; leur statut, leurs
 * anomalies et leurs corrections comptent pour l'ancre (bloc logique). */
export function reviewTargets(packet: SourcePacket, validation: ChapterValidation | null,
  anomalies: AnomalyReport[] = validation?.anomalies ?? []): ReviewTarget[] {
  const merges = validation?.merges;
  const keyOf = (page: number, id: string) => reviewKey(packet.chapterId, page, id);
  const active = new Set(anomalies.filter(a => a.status !== 'resolved').map(a => reviewKey(a.chapterId, a.printedPage, a.blockId)));
  const any = new Set(anomalies.map(a => reviewKey(a.chapterId, a.printedPage, a.blockId)));
  const saved = (page: number, id: string) => validation?.pages.find(p => p.printedPage === page)?.blocks.find(b => b.id === id);
  return logicalBlocks(packet, validation)
    .filter(block => block.part.role !== 'page-header' && !isAbsorbedByMerge(merges, block.printedPage, block.blockId))
    .map((block, blockIndex) => {
      const pageIndex = packet.pages.findIndex(page => page.printedPage === block.printedPage);
      const merge = mergeAtAnchor(merges, block.printedPage, block.blockId);
      const sources = merge ? merge.sources : [{ printedPage: block.printedPage, blockId: block.blockId }];
      const statuses = sources.map(s => saved(s.printedPage, s.blockId)?.status ?? 'pending');
      const status: BlockValidationStatus = statuses.every(isVerified) ? 'verified'
        : statuses.find(x => !isVerified(x) && x !== 'pending') ?? 'pending';
      const hasActive = sources.some(s => active.has(keyOf(s.printedPage, s.blockId)));
      const mine = sources.some(s => any.has(keyOf(s.printedPage, s.blockId)) ||
        !!saved(s.printedPage, s.blockId)?.correctionHistory?.length ||
        saved(s.printedPage, s.blockId)?.correction !== undefined) ||
        (merge ? !!merge.editHistory?.length : false);
      return {
        key: keyOf(block.printedPage, block.blockId), printedPage: block.printedPage, pageIndex, blockIndex,
        blockId: block.blockId, status: visibleStatus(status, hasActive), mine, manual: !!block.manual,
      };
    });
}
export function filterReviewTargets(targets: ReviewTarget[], filter: ReviewFilter) {
  if (filter === 'all') return targets;
  if (filter === 'mine') return targets.filter(t => t.mine);
  return targets.filter(t => isVerified(t.status) === (filter === 'verified'));
}
export function countReviewTargets(targets: ReviewTarget[]): Record<ReviewFilter, number> {
  return Object.fromEntries(REVIEW_FILTERS.map(f => [f.id, filterReviewTargets(targets, f.id).length])) as Record<ReviewFilter, number>;
}
/** Keep the stable selection or advance past the removed block; wrap to earlier work if needed. */
export function selectReviewTarget(all: ReviewTarget[], visible: ReviewTarget[], key: string | null) {
  const current = visible.find(t => t.key === key);
  if (current) return current;
  const previousIndex = all.findIndex(t => t.key === key);
  return visible.find(t => all.indexOf(t) > previousIndex) ?? visible[0] ?? null;
}
