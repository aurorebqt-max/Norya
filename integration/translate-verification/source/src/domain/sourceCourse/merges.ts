import type { SourcePart } from './packet';
import type { CoursePresentation } from './displayCorrections';
import type { ChapterValidation } from './verification';
import { markAssociationsForReassociation } from './associations';

/** Jonctions contrôlées à la frontière des deux textes. */
export type MergeJunction = 'space' | 'linebreak' | 'none' | 'hyphen';

/** Identité stable d'un bloc : la page imprimée est obligatoire (les IDs se répètent). */
export type MergeBlockRef = { printedPage: number; blockId: string };

/** Entrée d'historique d'un texte : `after: null` signifie « correction annulée ». */
export type CorrectionEntry = { at: string; before: string; after: string | null };

/**
 * Fusion persistée, réversible, indépendante de la source PDF.
 * `sources` liste TOUS les blocs d'origine, dans l'ordre d'affichage choisi ; la première
 * entrée est l'ancre visible. Une fusion ultérieure remplace la précédente (`replaces`) qui
 * reste stockée (`supersededBy`) pour permettre l'annulation successive.
 */
export type BlockMerge = {
  id: string;
  chapterId: string;
  createdAt: string;
  sources: MergeBlockRef[];
  junction: MergeJunction;
  joinedText: string;
  /** Texte affiché de chaque bloc d'origine au moment de la fusion (aligné sur `sources`). */
  sourceTexts: string[];
  /** Texte confirmé à la création ; sert de base si une correction ultérieure est annulée. */
  autoText?: string;
  editHistory?: CorrectionEntry[];
  replaces?: string[];
  supersededBy?: string;
};
/** Séparation réversible d'un bloc logique ; les sources, validations et anomalies restent attachées à l'ancre. */
export type BlockSplit = {
  id: string;
  chapterId: string;
  createdAt: string;
  anchor: MergeBlockRef;
  mergeId?: string;
  beforeText: string;
  firstText: string;
  secondText: string;
};

export type MergeLogEntry = {
  at: string; action: 'merge' | 'undo'; mergeId: string; sources: MergeBlockRef[]; text: string;
};

export const mergeRefKey = (ref: MergeBlockRef) => JSON.stringify([ref.printedPage, ref.blockId]);

const TEXT_ROLES = new Set([
  'paragraph', 'list', 'heading', 'uncertain-text', 'section-title', 'chapter-title', 'box',
]);

export function isMergeableRole(role: string): boolean {
  return TEXT_ROLES.has(role);
}

/** Concatène deux textes selon la jonction demandée (aperçu ou enregistrement). */
export function joinWithJunction(first: string, second: string, junction: MergeJunction): string {
  const a = first ?? '';
  const b = second ?? '';
  if (junction === 'space') return `${a} ${b}`;
  if (junction === 'linebreak') return `${a}\n${b}`;
  if (junction === 'none') return `${a}${b}`;
  // hyphen : retrait d'un trait d'union de fin de premier fragment, puis collage.
  const trimmed = a.replace(/[-‐‑\u00ad]\s*$/u, '');
  return `${trimmed}${b}`;
}

export function sameMergeRef(a: MergeBlockRef, b: MergeBlockRef): boolean {
  return a.printedPage === b.printedPage && a.blockId === b.blockId;
}

/** Fusions actives : celles qui n'ont pas été englobées par une fusion plus récente. */
export const activeMerges = (merges: BlockMerge[] | undefined) => (merges ?? []).filter(m => !m.supersededBy);

export function findMergeForBlock(merges: BlockMerge[] | undefined, printedPage: number, blockId: string): BlockMerge | undefined {
  const key = mergeRefKey({ printedPage, blockId });
  return activeMerges(merges).find(m => m.sources.some(s => mergeRefKey(s) === key));
}

/** Bloc absorbé : présent dans la source, masqué à l'affichage (toute source sauf l'ancre). */
export function isAbsorbedByMerge(merges: BlockMerge[] | undefined, printedPage: number, blockId: string): boolean {
  return activeMerges(merges).some(m => m.sources.slice(1).some(s => sameMergeRef(s, { printedPage, blockId })));
}

/** Ancre visible de la fusion (première source dans l'ordre choisi). */
export function isMergeAnchor(merges: BlockMerge[] | undefined, printedPage: number, blockId: string): boolean {
  return activeMerges(merges).some(m => sameMergeRef(m.sources[0], { printedPage, blockId }));
}

export function mergeAtAnchor(merges: BlockMerge[] | undefined, printedPage: number, blockId: string): BlockMerge | undefined {
  return activeMerges(merges).find(m => sameMergeRef(m.sources[0], { printedPage, blockId }));
}

export function splitAtAnchor(splits: BlockSplit[] | undefined, printedPage: number, blockId: string, mergeId?: string): BlockSplit | undefined {
  return (splits ?? []).find(split => sameMergeRef(split.anchor, { printedPage, blockId }) && split.mergeId === mergeId);
}

export function splitPreview(text: string, at: number) {
  if (!Number.isInteger(at) || at <= 0 || at >= text.length) throw new Error('Choisissez une position située à l’intérieur du texte.');
  const firstText = text.slice(0, at).trimEnd();
  const secondText = text.slice(at).trimStart();
  if (!firstText || !secondText) throw new Error('Chaque nouveau bloc doit contenir du texte.');
  return { firstText, secondText };
}

export function suggestedSplitPosition(text: string) {
  const middle = Math.floor(text.length / 2);
  for (let distance = 0; distance < text.length; distance++) {
    for (const index of [middle - distance, middle + distance]) {
      if (index > 0 && index < text.length && /\s/u.test(text[index])) return index;
    }
  }
  return middle;
}

export function recordSplit(validation: ChapterValidation, anchor: MergeBlockRef, text: string, at: number,
  id = `split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt = new Date().toISOString()): ChapterValidation {
  const merge = mergeAtAnchor(validation.merges, anchor.printedPage, anchor.blockId);
  const expected = merge?.joinedText ?? text;
  if (merge && text !== expected) throw new Error('Le texte de la fusion a changé : rechargez avant de le séparer.');
  if (splitAtAnchor(validation.splits, anchor.printedPage, anchor.blockId, merge?.id)) throw new Error('Ce bloc est déjà séparé.');
  const preview = splitPreview(expected, at);
  return markAssociationsForReassociation({
    ...validation,
    splits: [...(validation.splits ?? []), {
      id, chapterId: validation.chapterId, createdAt, anchor, mergeId: merge?.id, beforeText: expected, ...preview,
    }],
    lastUpdatedAt: createdAt,
  }, [anchor], 'La destination a été séparée.', createdAt);
}

export function undoSplit(validation: ChapterValidation, splitId: string, at = new Date().toISOString()): ChapterValidation {
  const split = (validation.splits ?? []).find(value => value.id === splitId);
  if (!split) throw new Error('Séparation introuvable.');
  return markAssociationsForReassociation({ ...validation, splits: (validation.splits ?? []).filter(value => value.id !== splitId), lastUpdatedAt: at },
    [split.anchor], 'La séparation de la destination a été annulée.', at);
}

/**
 * Applique les fusions à une présentation déjà calculée.
 * Retourne `null` pour un bloc absorbé (ne pas afficher une deuxième fois).
 */
export function presentationAfterMerges(
  printedPage: number,
  part: SourcePart,
  base: CoursePresentation,
  merges: BlockMerge[] | undefined,
  splits?: BlockSplit[] | undefined,
): CoursePresentation | null {
  if (base.hide) return base;
  if (isAbsorbedByMerge(merges, printedPage, part.id)) return null;
  const merge = mergeAtAnchor(merges, printedPage, part.id);
  if (base.imageOnly) return base;
  const text = merge?.joinedText ?? base.text;
  const split = splitAtAnchor(splits, printedPage, part.id, merge?.id);
  return split ? { ...base, text: `${split.firstText}\n\n${split.secondText}`, heading: undefined, contents: undefined }
    : merge ? { ...base, text, heading: undefined, contents: undefined } : base;
}

/** Bloc logique à fusionner : un bloc simple ou le résultat d'une fusion déjà enregistrée. */
export type MergeItem = {
  sources: MergeBlockRef[];
  sourceTexts: string[];
  text: string;
  role?: string;
  mergeId?: string;
  /** Position de lecture (page puis bloc) pour détecter un ordre inversé. */
  position?: number;
};

export type MergeDraft = {
  chapterId: string;
  items: MergeItem[];
  sources: MergeBlockRef[];
  sourceTexts: string[];
  junction: MergeJunction;
  joinedText: string;
  /** Vrai quand l'utilisateur a modifié le texte à la main (un changement d'ordre ou de jonction le remplace). */
  edited?: boolean;
};

export function joinItems(items: MergeItem[], junction: MergeJunction): string {
  return items.map(i => i.text).reduce((acc, text, index) => index === 0 ? text : joinWithJunction(acc, text, junction), '');
}

export function buildMergeDraft(chapterId: string, items: MergeItem[], junction: MergeJunction = 'space'): MergeDraft {
  if (items.length < 2) throw new Error('Au moins deux blocs sont requis.');
  const sources = items.flatMap(i => i.sources);
  if (new Set(sources.map(mergeRefKey)).size !== sources.length) throw new Error('Deux blocs distincts sont requis.');
  return {
    chapterId, items, sources, junction,
    sourceTexts: items.flatMap(i => i.sourceTexts),
    joinedText: joinItems(items, junction),
  };
}

/** Raccourci pour deux blocs simples. */
export function buildMergePreview(
  chapterId: string,
  first: MergeBlockRef & { text: string },
  second: MergeBlockRef & { text: string },
  junction: MergeJunction = 'space',
): MergeDraft {
  const item = (b: MergeBlockRef & { text: string }): MergeItem =>
    ({ sources: [{ printedPage: b.printedPage, blockId: b.blockId }], sourceTexts: [b.text], text: b.text });
  return buildMergeDraft(chapterId, [item(first), item(second)], junction);
}

export function withJunction(draft: MergeDraft, junction: MergeJunction): MergeDraft {
  return buildMergeDraft(draft.chapterId, draft.items, junction);
}

/** Déplace un bloc dans l'ordre final (delta -1 = vers le début). */
export function withMovedItem(draft: MergeDraft, index: number, delta: -1 | 1): MergeDraft {
  const target = index + delta;
  if (target < 0 || target >= draft.items.length) return draft;
  const items = [...draft.items];
  [items[index], items[target]] = [items[target], items[index]];
  return buildMergeDraft(draft.chapterId, items, draft.junction);
}

export function withSwappedOrder(draft: MergeDraft): MergeDraft {
  return buildMergeDraft(draft.chapterId, [...draft.items].reverse(), draft.junction);
}

export function withEditedText(draft: MergeDraft, joinedText: string): MergeDraft {
  return { ...draft, joinedText, edited: true };
}

/** Avertissements non bloquants : la fusion volontaire reste toujours possible. */
export function mergeWarnings(draft: MergeDraft): string[] {
  const warnings: string[] = [];
  const pages = new Set(draft.sources.map(s => s.printedPage));
  if (pages.size > 1) warnings.push('Les blocs proviennent de pages différentes.');
  const positions = draft.items.map(i => i.position);
  if (positions.every(p => p !== undefined)) {
    const sorted = [...(positions as number[])].sort((a, b) => a - b);
    if ((positions as number[]).some((p, i) => p !== sorted[i])) warnings.push('L’ordre choisi diffère de l’ordre de lecture du livre.');
  }
  const roles = new Set(draft.items.map(i => i.role).filter(Boolean));
  if (roles.size > 1) warnings.push('Les blocs ont des rôles différents (' + [...roles].join(', ') + ').');
  if (draft.items.some(i => i.role === 'heading' || i.role === 'section-title' || i.role === 'chapter-title') && draft.items.length > 1) {
    warnings.push('Un titre est inclus dans la fusion.');
  }
  if (draft.junction === 'hyphen' && draft.items.slice(0, -1).some(i => !/[-‐‑\u00ad]\s*$/u.test(i.text))) {
    warnings.push('Aucun tiret de coupure à retirer à la fin d’un des textes : vérifiez la jonction.');
  }
  if (draft.junction !== 'hyphen' && draft.items.slice(0, -1).some(i => /[-‐‑\u00ad]\s*$/u.test(i.text))) {
    warnings.push('Un texte se termine par un tiret : choisissez « Retirer le tiret » si c’est une coupure artificielle.');
  }
  return warnings;
}

const log = (validation: ChapterValidation, entry: MergeLogEntry) => [...(validation.mergeLog ?? []), entry];

/** Enregistre une fusion (simple ou répétée) sans toucher aux statuts, anomalies ni à la source. */
export function recordMerge(
  validation: ChapterValidation,
  draft: MergeDraft,
  id = `merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt = new Date().toISOString(),
): ChapterValidation {
  if (draft.chapterId !== validation.chapterId) throw new Error('Chapitre incompatible.');
  if (!draft.joinedText.trim()) throw new Error('Le texte fusionné ne peut pas être vide.');
  if (draft.items.length < 2) throw new Error('Au moins deux blocs sont requis.');
  const all = validation.merges ?? [];
  const consumed: string[] = [];
  const seen = new Set<string>();
  for (const item of draft.items) {
    for (const ref of item.sources) {
      const key = mergeRefKey(ref);
      if (seen.has(key)) throw new Error('Un bloc ne peut apparaître qu’une fois dans la fusion.');
      seen.add(key);
      const page = validation.pages.find(p => p.printedPage === ref.printedPage);
      if (!page?.blocks.some(b => b.id === ref.blockId)) throw new Error('Bloc introuvable dans les validations de ce chapitre.');
      if (splitAtAnchor(validation.splits, ref.printedPage, ref.blockId)) {
        throw new Error('Ce bloc est séparé : annulez d’abord la séparation avant de le fusionner.');
      }
    }
    const existing = findMergeForBlock(all, item.sources[0].printedPage, item.sources[0].blockId);
    if (item.mergeId || existing) {
      const same = existing && existing.id === item.mergeId && existing.sources.length === item.sources.length &&
        existing.sources.every((s, i) => sameMergeRef(s, item.sources[i]));
      if (!same) throw new Error('Ce bloc participe déjà à une autre fusion. Rechargez ou annulez-la d’abord.');
      consumed.push(existing!.id);
    }
  }
  const merge: BlockMerge = {
    id, chapterId: draft.chapterId, createdAt,
    sources: draft.sources, junction: draft.junction,
    joinedText: draft.joinedText, autoText: draft.joinedText, sourceTexts: draft.sourceTexts,
    ...(consumed.length ? { replaces: consumed } : {}),
  };
  return markAssociationsForReassociation({
    ...validation,
    merges: [...all.map(m => consumed.includes(m.id) ? { ...m, supersededBy: id } : m), merge],
    mergeLog: log(validation, { at: createdAt, action: 'merge', mergeId: id, sources: draft.sources, text: draft.joinedText }),
    lastUpdatedAt: createdAt,
  }, draft.sources, 'La destination a été fusionnée ou absorbée.', createdAt);
}

/** Annule la fusion active indiquée et réactive celles qu'elle avait englobées. */
export function undoMerge(validation: ChapterValidation, mergeId: string, at = new Date().toISOString()): ChapterValidation {
  const merges = validation.merges ?? [];
  const target = merges.find(m => m.id === mergeId);
  if (!target) throw new Error('Fusion introuvable.');
  if (target.supersededBy) throw new Error('Cette fusion a été englobée par une fusion plus récente : annulez d’abord celle-ci.');
  return markAssociationsForReassociation({
    ...validation,
    merges: merges.filter(m => m.id !== mergeId).map(m => m.supersededBy === mergeId ? { ...m, supersededBy: undefined } : m),
    mergeLog: log(validation, { at, action: 'undo', mergeId, sources: target.sources, text: target.joinedText }),
    lastUpdatedAt: at,
  }, target.sources, 'La fusion de la destination a été annulée.', at);
}

/** Corrige le texte d'une fusion active en conservant l'historique avant/après. */
export function correctMerge(validation: ChapterValidation, mergeId: string, text: string, at = new Date().toISOString()): ChapterValidation {
  const merge = activeMerges(validation.merges).find(m => m.id === mergeId);
  if (!merge) throw new Error('Fusion active introuvable.');
  if (!text.trim()) throw new Error('Le texte corrigé ne peut pas être vide.');
  if (text === merge.joinedText) return validation;
  return markAssociationsForReassociation({
    ...validation,
    merges: (validation.merges ?? []).map(m => m.id === mergeId
      ? { ...m, joinedText: text, editHistory: [...(m.editHistory ?? []), { at, before: m.joinedText, after: text }] } : m),
    lastUpdatedAt: at,
  }, merge.sources, 'Le texte de la destination fusionnée a été modifié.', at);
}

export function undoMergeCorrection(validation: ChapterValidation, mergeId: string, at = new Date().toISOString()): ChapterValidation {
  const merge = activeMerges(validation.merges).find(m => m.id === mergeId);
  if (!merge) throw new Error('Fusion active introuvable.');
  const base = merge.autoText ?? merge.joinedText;
  if (base === merge.joinedText) return validation;
  return markAssociationsForReassociation({
    ...validation,
    merges: (validation.merges ?? []).map(m => m.id === mergeId
      ? { ...m, joinedText: base, editHistory: [...(m.editHistory ?? []), { at, before: m.joinedText, after: null }] } : m),
    lastUpdatedAt: at,
  }, merge.sources, 'La correction de la destination fusionnée a été annulée.', at);
}
