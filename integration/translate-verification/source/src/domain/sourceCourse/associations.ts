import type { SourcePacket } from './packet';
import type { LogicalBlock } from './manualBlocks';
import { isAbsorbedByMerge, splitAtAnchor } from './merges';
import type { ChapterValidation } from './verification';

export type LogicalBlockRef = { printedPage: number; blockId: string };
export type AssociationDestinationType = 'text' | 'heading' | 'figure' | 'table';
export type AssociationState = 'active' | 'reassociation-required';
export type AssociationAnchor = { text: string; occurrence: number; start: number; end: number };
export type AssociationHistoryEntry = {
  at: string; action: 'created' | 'updated' | 'invalidated' | 'deleted';
  reason?: string;
};
export type ManualAssociation = {
  id: string;
  source: LogicalBlockRef;
  anchor: AssociationAnchor;
  target: LogicalBlockRef;
  destinationType: AssociationDestinationType;
  state: AssociationState;
  createdAt: string;
  updatedAt: string;
  history: AssociationHistoryEntry[];
  deletedAt?: string;
};

const sameRef = (a: LogicalBlockRef, b: LogicalBlockRef) =>
  a.printedPage === b.printedPage && a.blockId === b.blockId;

function occurrences(text: string, needle: string): number[] {
  if (!needle) return [];
  const found: number[] = [];
  let at = 0;
  while (at <= text.length - needle.length) {
    const index = text.indexOf(needle, at);
    if (index < 0) break;
    found.push(index);
    at = index + needle.length;
  }
  return found;
}

export function anchorForText(sourceText: string, text: string, occurrence = 0): AssociationAnchor {
  if (!text) throw new Error('Le texte d’ancre ne peut pas être vide.');
  const found = occurrences(sourceText, text);
  if (!Number.isInteger(occurrence) || occurrence < 0 || !found[occurrence] && found[occurrence] !== 0) {
    throw new Error('Occurrence d’ancre introuvable dans le texte source actuel.');
  }
  return { text, occurrence, start: found[occurrence], end: found[occurrence] + text.length };
}

export function destinationType(block: LogicalBlock, validation: ChapterValidation): AssociationDestinationType {
  const kind = validation.pages.find(page => page.printedPage === block.printedPage)?.blocks
    .find(saved => saved.id === block.blockId)?.kind;
  if (kind === 'table' || block.part.role === 'table') return 'table';
  if (block.part.role === 'figure') return 'figure';
  if (kind === 'h1' || kind === 'h2' || kind === 'h3' || kind === 'h4' || block.part.role === 'heading') return 'heading';
  return 'text';
}

export function associationId(validation: ChapterValidation, now: string) {
  const base = `association-${now.replace(/[^0-9A-Za-z]/g, '')}`;
  const used = new Set((validation.associations ?? []).map(value => value.id));
  let suffix = 1;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function targetUsable(value: ManualAssociation, logical: LogicalBlock[], validation: ChapterValidation): boolean {
  const target = logical.find(block => sameRef(block, value.target));
  return !!target && !isAbsorbedByMerge(validation.merges, value.target.printedPage, value.target.blockId) &&
    !splitAtAnchor(validation.splits, value.target.printedPage, value.target.blockId);
}

export function associationProblems(value: ManualAssociation, sourceText: string, logical: LogicalBlock[],
  validation: ChapterValidation): string[] {
  const expected = occurrences(sourceText, value.anchor.text)[value.anchor.occurrence];
  const problems: string[] = [];
  if (expected !== value.anchor.start || expected === undefined || value.anchor.end !== expected + value.anchor.text.length) {
    problems.push('Le texte ou l’occurrence de l’ancre source a changé.');
  }
  if (!targetUsable(value, logical, validation)) problems.push('La destination est absente, absorbée ou séparée.');
  return problems;
}

export function createAssociation(validation: ChapterValidation, source: LogicalBlockRef, sourceText: string,
  anchorText: string, occurrence: number, target: LogicalBlockRef, logical: LogicalBlock[],
  now = new Date().toISOString()): ChapterValidation {
  const anchor = anchorForText(sourceText, anchorText, occurrence);
  if (sameRef(source, target)) throw new Error('La destination doit être un autre bloc logique.');
  const targetBlock = logical.find(block => sameRef(block, target));
  if (!targetBlock || !targetUsable({ source, target } as ManualAssociation, logical, validation)) {
    throw new Error('Destination logique indisponible pour une association.');
  }
  const value: ManualAssociation = {
    id: associationId(validation, now), source, anchor, target, destinationType: destinationType(targetBlock, validation),
    state: 'active', createdAt: now, updatedAt: now, history: [{ at: now, action: 'created' }],
  };
  return { ...validation, associations: [...(validation.associations ?? []), value], lastUpdatedAt: now };
}

/** Does not silently retarget: any source or destination transformation requires human reassociation. */
export function markAssociationsForReassociation(validation: ChapterValidation, refs: LogicalBlockRef[],
  reason: string, now = new Date().toISOString()): ChapterValidation {
  const keys = new Set(refs.map(ref => JSON.stringify([ref.printedPage, ref.blockId])));
  let changed = false;
  const associations = (validation.associations ?? []).map(value => {
    if (value.deletedAt || (!keys.has(JSON.stringify([value.source.printedPage, value.source.blockId])) &&
        !keys.has(JSON.stringify([value.target.printedPage, value.target.blockId])))) return value;
    changed = true;
    return { ...value, state: 'reassociation-required' as const, updatedAt: now,
      history: [...value.history, { at: now, action: 'invalidated' as const, reason }] };
  });
  return changed ? { ...validation, associations, lastUpdatedAt: now } : validation;
}

export function validateAssociations(validation: ChapterValidation, logical: LogicalBlock[],
  textFor: (ref: LogicalBlockRef) => string, now = new Date().toISOString()): ChapterValidation {
  let changed = false;
  const associations = (validation.associations ?? []).map(value => {
    if (value.deletedAt) return value;
    const problems = associationProblems(value, textFor(value.source), logical, validation);
    if (!problems.length || value.state === 'reassociation-required') return value;
    changed = true;
    return { ...value, state: 'reassociation-required' as const, updatedAt: now,
      history: [...value.history, { at: now, action: 'invalidated' as const, reason: problems.join(' ') }] };
  });
  return changed ? { ...validation, associations, lastUpdatedAt: now } : validation;
}

export function updateAssociation(validation: ChapterValidation, id: string, source: LogicalBlockRef, sourceText: string,
  anchorText: string, occurrence: number, target: LogicalBlockRef, logical: LogicalBlock[], now = new Date().toISOString()) {
  const old = (validation.associations ?? []).find(value => value.id === id && !value.deletedAt);
  if (!old) throw new Error('Association active introuvable.');
  const created = createAssociation({ ...validation, associations: (validation.associations ?? []).filter(value => value.id !== id) },
    source, sourceText, anchorText, occurrence, target, logical, now).associations!;
  const replacement = created[created.length - 1];
  const value: ManualAssociation = { ...replacement, id, createdAt: old.createdAt,
    history: [...old.history, { at: now, action: 'updated' }] };
  return { ...validation, associations: (validation.associations ?? []).map(item => item.id === id ? value : item), lastUpdatedAt: now };
}

export function deleteAssociation(validation: ChapterValidation, id: string, now = new Date().toISOString()): ChapterValidation {
  const found = (validation.associations ?? []).find(value => value.id === id && !value.deletedAt);
  if (!found) throw new Error('Association active introuvable.');
  return { ...validation, associations: (validation.associations ?? []).map(value => value.id !== id ? value : {
    ...value, deletedAt: now, updatedAt: now, history: [...value.history, { at: now, action: 'deleted' }],
  }), lastUpdatedAt: now };
}

export function activeAssociations(validation: ChapterValidation | null | undefined) {
  return (validation?.associations ?? []).filter(value => !value.deletedAt);
}

/** Only explicit deletion records justify cleanup; absent/merged blocks still need review. */
export function associationsForDeletedBlocks(validation: ChapterValidation | null | undefined) {
  const deleted = new Set((validation?.manualBlocks ?? []).filter(block => block.undoneAt)
    .map(block => JSON.stringify([block.sourceRef.printedPage, block.id])));
  return activeAssociations(validation).filter(link => [link.source, link.target]
    .some(ref => deleted.has(JSON.stringify([ref.printedPage, ref.blockId]))));
}

export function repairDeletedBlockAssociations(validation: ChapterValidation, now = new Date().toISOString()) {
  return associationsForDeletedBlocks(validation).reduce((next, link) => deleteAssociation(next, link.id, now), validation);
}

export function sourceTextFromPacket(packet: SourcePacket, ref: LogicalBlockRef) {
  return packet.pages.find(page => page.printedPage === ref.printedPage)?.parts?.find(part => part.id === ref.blockId)?.text ?? '';
}
