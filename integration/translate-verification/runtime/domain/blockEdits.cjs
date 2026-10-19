"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedBlock = savedBlock;
exports.workingPresentation = workingPresentation;
exports.saveBlockCorrection = saveBlockCorrection;
exports.undoBlockCorrection = undoBlockCorrection;
exports.saveDisplayedCorrection = saveDisplayedCorrection;
exports.undoDisplayedCorrection = undoDisplayedCorrection;
exports.hasActiveCorrection = hasActiveCorrection;
exports.hasCorrectionRecord = hasCorrectionRecord;
exports.logicalSources = logicalSources;
exports.reviewLogicalBlock = reviewLogicalBlock;
const displayCorrections_1 = require("./displayCorrections");
const merges_1 = require("./merges");
const verification_1 = require("./verification");
const classification_1 = require("./classification");
const associations_1 = require("./associations");
function savedBlock(validation, printedPage, blockId) {
    return validation?.pages.find(p => p.printedPage === printedPage)?.blocks.find(b => b.id === blockId);
}
/**
 * Présentation de travail unique, partagée par « Cours reconstitué » et « Vérification manuelle » :
 * règles de présentation du chapitre, puis correction manuelle du bloc, puis fusion active.
 * Retourne `null` pour un bloc absorbé par une fusion.
 */
function workingPresentation(printedPage, part, validation, chapterId = validation?.chapterId ?? 'kum-08') {
    let base = chapterId === 'kum-08' ? (0, displayCorrections_1.sourcePresentation)(printedPage, part) : {
        text: part.text, imageOnly: part.role === 'figure' || part.role === 'table', hide: part.role === 'page-header',
    };
    const correction = savedBlock(validation, printedPage, part.id)?.correction;
    if (correction !== undefined && !base.imageOnly && !base.hide) {
        base = { ...base, text: correction, heading: undefined, contents: undefined };
    }
    base = (0, classification_1.applyClassification)(base, savedBlock(validation, printedPage, part.id));
    return (0, merges_1.presentationAfterMerges)(printedPage, part, base, validation?.merges, validation?.splits);
}
const now = () => new Date().toISOString();
/** Enregistre une correction sans changer le statut de vérification ni la source. */
function saveBlockCorrection(validation, printedPage, blockId, currentText, newText, at = now()) {
    if (!newText.trim())
        throw new Error('Le texte corrigé ne peut pas être vide.');
    const pageIndex = validation.pages.findIndex(p => p.printedPage === printedPage);
    const block = validation.pages[pageIndex]?.blocks.find(b => b.id === blockId);
    if (!block)
        throw new Error('Bloc de validation introuvable');
    if (newText === currentText)
        return validation;
    const pages = validation.pages.map((page, i) => i !== pageIndex ? page : {
        ...page, blocks: page.blocks.map(b => b.id !== blockId ? b : {
            ...b, correction: newText,
            correctionHistory: [...(b.correctionHistory ?? []), { at, before: currentText, after: newText }],
        }),
    });
    return (0, associations_1.markAssociationsForReassociation)({ ...validation, pages, lastUpdatedAt: at }, [{ printedPage, blockId }], 'Le texte source affiché a été modifié.', at);
}
/** Retire la correction : le texte de présentation d'origine réapparaît, l'historique reste. */
function undoBlockCorrection(validation, printedPage, blockId, at = now()) {
    const pageIndex = validation.pages.findIndex(p => p.printedPage === printedPage);
    const block = validation.pages[pageIndex]?.blocks.find(b => b.id === blockId);
    if (!block)
        throw new Error('Bloc de validation introuvable');
    if (block.correction === undefined)
        return validation;
    const pages = validation.pages.map((page, i) => i !== pageIndex ? page : {
        ...page, blocks: page.blocks.map(b => b.id !== blockId ? b : {
            ...b, correction: undefined,
            correctionHistory: [...(b.correctionHistory ?? []), { at, before: block.correction, after: null }],
        }),
    });
    return (0, associations_1.markAssociationsForReassociation)({ ...validation, pages, lastUpdatedAt: at }, [{ printedPage, blockId }], 'La correction du texte source a été annulée.', at);
}
/** Corrige le bloc affiché : un bloc simple ou, pour une fusion, le texte de la fusion. */
function saveDisplayedCorrection(validation, ref, currentText, newText, at = now()) {
    const merge = (0, merges_1.mergeAtAnchor)(validation.merges, ref.printedPage, ref.blockId);
    return merge ? (0, merges_1.correctMerge)(validation, merge.id, newText, at)
        : saveBlockCorrection(validation, ref.printedPage, ref.blockId, currentText, newText, at);
}
function undoDisplayedCorrection(validation, ref, at = now()) {
    const merge = (0, merges_1.mergeAtAnchor)(validation.merges, ref.printedPage, ref.blockId);
    return merge ? (0, merges_1.undoMergeCorrection)(validation, merge.id, at) : undoBlockCorrection(validation, ref.printedPage, ref.blockId, at);
}
/** Vrai si le bloc affiché possède une correction active qu'on peut annuler. */
function hasActiveCorrection(validation, ref) {
    const merge = (0, merges_1.mergeAtAnchor)(validation?.merges, ref.printedPage, ref.blockId);
    if (merge)
        return (merge.autoText ?? merge.joinedText) !== merge.joinedText;
    return savedBlock(validation, ref.printedPage, ref.blockId)?.correction !== undefined;
}
/** Vrai si une correction manuelle a déjà été enregistrée (même annulée) pour l'un des blocs d'origine. */
function hasCorrectionRecord(validation, sources) {
    return sources.some(ref => {
        const block = savedBlock(validation, ref.printedPage, ref.blockId);
        if (block?.correction !== undefined || block?.correctionHistory?.length)
            return true;
        return false;
    }) || (validation?.merges ?? []).some(m => m.editHistory?.length &&
        m.sources.some(s => sources.some(r => r.printedPage === s.printedPage && r.blockId === s.blockId)));
}
/** Blocs d'origine du bloc logique affiché (une fusion en regroupe plusieurs). */
function logicalSources(validation, ref) {
    const merge = (0, merges_1.findMergeForBlock)(validation?.merges, ref.printedPage, ref.blockId);
    return merge ? merge.sources : [ref];
}
/** Statut appliqué à tous les blocs d'origine : seul un clic humain l'appelle. */
function reviewLogicalBlock(validation, anomalies, sources, status) {
    let current = validation;
    for (const ref of sources) {
        current = (0, verification_1.reviewBlock)(current, current.anomalies ?? anomalies, ref.printedPage, ref.blockId, status);
    }
    return current;
}
