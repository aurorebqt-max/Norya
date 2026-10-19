"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewKey = exports.reviewBlocks = exports.isVerified = exports.REVIEW_FILTERS = void 0;
exports.reviewTargets = reviewTargets;
exports.filterReviewTargets = filterReviewTargets;
exports.countReviewTargets = countReviewTargets;
exports.selectReviewTarget = selectReviewTarget;
const merges_1 = require("./merges");
const manualBlocks_1 = require("./manualBlocks");
exports.REVIEW_FILTERS = [
    { id: 'all', label: 'Tous' }, { id: 'mine', label: 'Mes anomalies' },
    { id: 'verified', label: 'Vérifiés' }, { id: 'pending', label: 'À vérifier' },
];
const isVerified = (status) => status === 'verified' || status === 'corrected';
exports.isVerified = isVerified;
const reviewBlocks = (page) => (page?.parts ?? []).filter(p => p.role !== 'page-header');
exports.reviewBlocks = reviewBlocks;
const reviewKey = (chapterId, page, blockId) => JSON.stringify([chapterId, page, blockId]);
exports.reviewKey = reviewKey;
function visibleStatus(status, hasActiveAnomaly) {
    return hasActiveAnomaly && (!status || (0, exports.isVerified)(status)) ? 'issue-found' : status ?? 'pending';
}
/** Derived only from the current packet and existing validation: no second registry.
 * Les blocs absorbés par une fusion active n'ont pas de cible ; leur statut, leurs
 * anomalies et leurs corrections comptent pour l'ancre (bloc logique). */
function reviewTargets(packet, validation, anomalies = validation?.anomalies ?? []) {
    const merges = validation?.merges;
    const keyOf = (page, id) => (0, exports.reviewKey)(packet.chapterId, page, id);
    const active = new Set(anomalies.filter(a => a.status !== 'resolved').map(a => (0, exports.reviewKey)(a.chapterId, a.printedPage, a.blockId)));
    const any = new Set(anomalies.map(a => (0, exports.reviewKey)(a.chapterId, a.printedPage, a.blockId)));
    const saved = (page, id) => validation?.pages.find(p => p.printedPage === page)?.blocks.find(b => b.id === id);
    return (0, manualBlocks_1.logicalBlocks)(packet, validation)
        .filter(block => block.part.role !== 'page-header' && !(0, merges_1.isAbsorbedByMerge)(merges, block.printedPage, block.blockId))
        .map((block, blockIndex) => {
        const pageIndex = packet.pages.findIndex(page => page.printedPage === block.printedPage);
        const merge = (0, merges_1.mergeAtAnchor)(merges, block.printedPage, block.blockId);
        const sources = merge ? merge.sources : [{ printedPage: block.printedPage, blockId: block.blockId }];
        const statuses = sources.map(s => saved(s.printedPage, s.blockId)?.status ?? 'pending');
        const status = statuses.every(exports.isVerified) ? 'verified'
            : statuses.find(x => !(0, exports.isVerified)(x) && x !== 'pending') ?? 'pending';
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
function filterReviewTargets(targets, filter) {
    if (filter === 'all')
        return targets;
    if (filter === 'mine')
        return targets.filter(t => t.mine);
    return targets.filter(t => (0, exports.isVerified)(t.status) === (filter === 'verified'));
}
function countReviewTargets(targets) {
    return Object.fromEntries(exports.REVIEW_FILTERS.map(f => [f.id, filterReviewTargets(targets, f.id).length]));
}
/** Keep the stable selection or advance past the removed block; wrap to earlier work if needed. */
function selectReviewTarget(all, visible, key) {
    const current = visible.find(t => t.key === key);
    if (current)
        return current;
    const previousIndex = all.findIndex(t => t.key === key);
    return visible.find(t => all.indexOf(t) > previousIndex) ?? visible[0] ?? null;
}
