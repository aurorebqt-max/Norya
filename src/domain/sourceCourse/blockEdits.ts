import type { SourcePart } from './packet';
import { sourcePresentation, type CoursePresentation } from './displayCorrections';
import {
  correctMerge, findMergeForBlock, mergeAtAnchor, presentationAfterMerges, undoMergeCorrection,
  type MergeBlockRef,
} from './merges';
import { reviewBlock, type BlockValidation, type BlockValidationStatus, type ChapterValidation } from './verification';
import type { AnomalyReport } from './anomalies';
import { applyClassification } from './classification';
import { markAssociationsForReassociation } from './associations';

export function savedBlock(validation: ChapterValidation | null | undefined, printedPage: number, blockId: string): BlockValidation | undefined {
  return validation?.pages.find(p => p.printedPage === printedPage)?.blocks.find(b => b.id === blockId);
}

/**
 * Présentation de travail unique, partagée par « Cours reconstitué » et « Vérification manuelle » :
 * règles de présentation du chapitre, puis correction manuelle du bloc, puis fusion active.
 * Retourne `null` pour un bloc absorbé par une fusion.
 */
export function workingPresentation(printedPage: number, part: SourcePart,
  validation: ChapterValidation | null | undefined): CoursePresentation | null {
  let base = sourcePresentation(printedPage, part);
  const correction = savedBlock(validation, printedPage, part.id)?.correction;
  if (correction !== undefined && !base.imageOnly && !base.hide) {
    base = { ...base, text: correction, heading: undefined, contents: undefined };
  }
  base = applyClassification(base, savedBlock(validation, printedPage, part.id));
  return presentationAfterMerges(printedPage, part, base, validation?.merges, validation?.splits);
}

const now = () => new Date().toISOString();

/** Enregistre une correction sans changer le statut de vérification ni la source. */
export function saveBlockCorrection(validation: ChapterValidation, printedPage: number, blockId: string,
  currentText: string, newText: string, at = now()): ChapterValidation {
  if (!newText.trim()) throw new Error('Le texte corrigé ne peut pas être vide.');
  const pageIndex = validation.pages.findIndex(p => p.printedPage === printedPage);
  const block = validation.pages[pageIndex]?.blocks.find(b => b.id === blockId);
  if (!block) throw new Error('Bloc de validation introuvable');
  if (newText === currentText) return validation;
  const pages = validation.pages.map((page, i) => i !== pageIndex ? page : {
    ...page, blocks: page.blocks.map(b => b.id !== blockId ? b : {
      ...b, correction: newText,
      correctionHistory: [...(b.correctionHistory ?? []), { at, before: currentText, after: newText }],
    }),
  });
  return markAssociationsForReassociation({ ...validation, pages, lastUpdatedAt: at }, [{ printedPage, blockId }],
    'Le texte source affiché a été modifié.', at);
}

/** Retire la correction : le texte de présentation d'origine réapparaît, l'historique reste. */
export function undoBlockCorrection(validation: ChapterValidation, printedPage: number, blockId: string,
  at = now()): ChapterValidation {
  const pageIndex = validation.pages.findIndex(p => p.printedPage === printedPage);
  const block = validation.pages[pageIndex]?.blocks.find(b => b.id === blockId);
  if (!block) throw new Error('Bloc de validation introuvable');
  if (block.correction === undefined) return validation;
  const pages = validation.pages.map((page, i) => i !== pageIndex ? page : {
    ...page, blocks: page.blocks.map(b => b.id !== blockId ? b : {
      ...b, correction: undefined,
      correctionHistory: [...(b.correctionHistory ?? []), { at, before: block.correction!, after: null }],
    }),
  });
  return markAssociationsForReassociation({ ...validation, pages, lastUpdatedAt: at }, [{ printedPage, blockId }],
    'La correction du texte source a été annulée.', at);
}

/** Corrige le bloc affiché : un bloc simple ou, pour une fusion, le texte de la fusion. */
export function saveDisplayedCorrection(validation: ChapterValidation, ref: MergeBlockRef,
  currentText: string, newText: string, at = now()): ChapterValidation {
  const merge = mergeAtAnchor(validation.merges, ref.printedPage, ref.blockId);
  return merge ? correctMerge(validation, merge.id, newText, at)
    : saveBlockCorrection(validation, ref.printedPage, ref.blockId, currentText, newText, at);
}

export function undoDisplayedCorrection(validation: ChapterValidation, ref: MergeBlockRef, at = now()): ChapterValidation {
  const merge = mergeAtAnchor(validation.merges, ref.printedPage, ref.blockId);
  return merge ? undoMergeCorrection(validation, merge.id, at) : undoBlockCorrection(validation, ref.printedPage, ref.blockId, at);
}

/** Vrai si le bloc affiché possède une correction active qu'on peut annuler. */
export function hasActiveCorrection(validation: ChapterValidation | null, ref: MergeBlockRef): boolean {
  const merge = mergeAtAnchor(validation?.merges, ref.printedPage, ref.blockId);
  if (merge) return (merge.autoText ?? merge.joinedText) !== merge.joinedText;
  return savedBlock(validation, ref.printedPage, ref.blockId)?.correction !== undefined;
}

/** Vrai si une correction manuelle a déjà été enregistrée (même annulée) pour l'un des blocs d'origine. */
export function hasCorrectionRecord(validation: ChapterValidation | null, sources: MergeBlockRef[]): boolean {
  return sources.some(ref => {
    const block = savedBlock(validation, ref.printedPage, ref.blockId);
    if (block?.correction !== undefined || block?.correctionHistory?.length) return true;
    return false;
  }) || (validation?.merges ?? []).some(m => m.editHistory?.length &&
    m.sources.some(s => sources.some(r => r.printedPage === s.printedPage && r.blockId === s.blockId)));
}

/** Blocs d'origine du bloc logique affiché (une fusion en regroupe plusieurs). */
export function logicalSources(validation: ChapterValidation | null | undefined, ref: MergeBlockRef): MergeBlockRef[] {
  const merge = findMergeForBlock(validation?.merges, ref.printedPage, ref.blockId);
  return merge ? merge.sources : [ref];
}

/** Statut appliqué à tous les blocs d'origine : seul un clic humain l'appelle. */
export function reviewLogicalBlock(validation: ChapterValidation, anomalies: AnomalyReport[], sources: MergeBlockRef[],
  status: BlockValidationStatus): ChapterValidation {
  let current = validation;
  for (const ref of sources) {
    current = reviewBlock(current, current.anomalies ?? anomalies, ref.printedPage, ref.blockId, status);
  }
  return current;
}
