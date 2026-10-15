import type { AnomalyReport } from './anomalies';
import type { SourcePacket, SourcePage } from './packet';
import type { BlockValidationStatus, ChapterValidation } from './verification';

export type ReviewFilter = 'pending' | 'verified' | 'all';
export type ReviewTarget = {
  key: string; printedPage: number; pageIndex: number; blockIndex: number;
  blockId: string; status: BlockValidationStatus;
};
export const isVerified = (status: BlockValidationStatus) => status === 'verified' || status === 'corrected';
export const reviewBlocks = (page: SourcePage | undefined) => (page?.parts ?? []).filter(p => p.role !== 'page-header');
export const reviewKey = (chapterId: string, page: number, blockId: string) => JSON.stringify([chapterId, page, blockId]);

function visibleStatus(status: BlockValidationStatus | undefined, hasActiveAnomaly: boolean): BlockValidationStatus {
  return hasActiveAnomaly && (!status || isVerified(status)) ? 'issue-found' : status ?? 'pending';
}

/** Derived only from the current packet and existing validation: no second registry. */
export function reviewTargets(packet: SourcePacket, validation: ChapterValidation | null,
  anomalies: AnomalyReport[] = validation?.anomalies ?? []): ReviewTarget[] {
  // Legacy saves can contain a verified block with an unresolved report.
  // Keep that work visible without rewriting its validation or resolving anything.
  const active = new Set(anomalies.filter(a => a.status !== 'resolved')
    .map(a => reviewKey(a.chapterId, a.printedPage, a.blockId)));
  return packet.pages.flatMap((page, pageIndex) => {
    const saved = validation?.pages.find(p => p.printedPage === page.printedPage);
    return reviewBlocks(page).map((block, blockIndex) => ({
      key: reviewKey(packet.chapterId, page.printedPage, block.id), printedPage: page.printedPage,
      pageIndex, blockIndex, blockId: block.id,
      status: visibleStatus(saved?.blocks.find(b => b.id === block.id)?.status,
        active.has(reviewKey(packet.chapterId, page.printedPage, block.id))),
    }));
  });
}
export function filterReviewTargets(targets: ReviewTarget[], filter: ReviewFilter) {
  return targets.filter(t => filter === 'all' || isVerified(t.status) === (filter === 'verified'));
}
/** Keep the stable selection or advance past the removed block; wrap to earlier work if needed. */
export function selectReviewTarget(all: ReviewTarget[], visible: ReviewTarget[], key: string | null) {
  const current = visible.find(t => t.key === key);
  if (current) return current;
  const previousIndex = all.findIndex(t => t.key === key);
  return visible.find(t => all.indexOf(t) > previousIndex) ?? visible[0] ?? null;
}
