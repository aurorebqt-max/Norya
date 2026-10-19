"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anchorForText = anchorForText;
exports.destinationType = destinationType;
exports.associationId = associationId;
exports.associationProblems = associationProblems;
exports.createAssociation = createAssociation;
exports.markAssociationsForReassociation = markAssociationsForReassociation;
exports.validateAssociations = validateAssociations;
exports.updateAssociation = updateAssociation;
exports.deleteAssociation = deleteAssociation;
exports.activeAssociations = activeAssociations;
exports.associationsForDeletedBlocks = associationsForDeletedBlocks;
exports.repairDeletedBlockAssociations = repairDeletedBlockAssociations;
exports.sourceTextFromPacket = sourceTextFromPacket;
const merges_1 = require("./merges");
const sameRef = (a, b) => a.printedPage === b.printedPage && a.blockId === b.blockId;
function occurrences(text, needle) {
    if (!needle)
        return [];
    const found = [];
    let at = 0;
    while (at <= text.length - needle.length) {
        const index = text.indexOf(needle, at);
        if (index < 0)
            break;
        found.push(index);
        at = index + needle.length;
    }
    return found;
}
function anchorForText(sourceText, text, occurrence = 0) {
    if (!text)
        throw new Error('Le texte d’ancre ne peut pas être vide.');
    const found = occurrences(sourceText, text);
    if (!Number.isInteger(occurrence) || occurrence < 0 || !found[occurrence] && found[occurrence] !== 0) {
        throw new Error('Occurrence d’ancre introuvable dans le texte source actuel.');
    }
    return { text, occurrence, start: found[occurrence], end: found[occurrence] + text.length };
}
function destinationType(block, validation) {
    const kind = validation.pages.find(page => page.printedPage === block.printedPage)?.blocks
        .find(saved => saved.id === block.blockId)?.kind;
    if (kind === 'table' || block.part.role === 'table')
        return 'table';
    if (block.part.role === 'figure')
        return 'figure';
    if (kind === 'h1' || kind === 'h2' || kind === 'h3' || kind === 'h4' || block.part.role === 'heading')
        return 'heading';
    return 'text';
}
function associationId(validation, now) {
    const base = `association-${now.replace(/[^0-9A-Za-z]/g, '')}`;
    const used = new Set((validation.associations ?? []).map(value => value.id));
    let suffix = 1;
    while (used.has(`${base}-${suffix}`))
        suffix += 1;
    return `${base}-${suffix}`;
}
function targetUsable(value, logical, validation) {
    const target = logical.find(block => sameRef(block, value.target));
    return !!target && !(0, merges_1.isAbsorbedByMerge)(validation.merges, value.target.printedPage, value.target.blockId) &&
        !(0, merges_1.splitAtAnchor)(validation.splits, value.target.printedPage, value.target.blockId);
}
function associationProblems(value, sourceText, logical, validation) {
    const expected = occurrences(sourceText, value.anchor.text)[value.anchor.occurrence];
    const problems = [];
    if (expected !== value.anchor.start || expected === undefined || value.anchor.end !== expected + value.anchor.text.length) {
        problems.push('Le texte ou l’occurrence de l’ancre source a changé.');
    }
    if (!targetUsable(value, logical, validation))
        problems.push('La destination est absente, absorbée ou séparée.');
    return problems;
}
function createAssociation(validation, source, sourceText, anchorText, occurrence, target, logical, now = new Date().toISOString()) {
    const anchor = anchorForText(sourceText, anchorText, occurrence);
    if (sameRef(source, target))
        throw new Error('La destination doit être un autre bloc logique.');
    const targetBlock = logical.find(block => sameRef(block, target));
    if (!targetBlock || !targetUsable({ source, target }, logical, validation)) {
        throw new Error('Destination logique indisponible pour une association.');
    }
    const value = {
        id: associationId(validation, now), source, anchor, target, destinationType: destinationType(targetBlock, validation),
        state: 'active', createdAt: now, updatedAt: now, history: [{ at: now, action: 'created' }],
    };
    return { ...validation, associations: [...(validation.associations ?? []), value], lastUpdatedAt: now };
}
/** Does not silently retarget: any source or destination transformation requires human reassociation. */
function markAssociationsForReassociation(validation, refs, reason, now = new Date().toISOString()) {
    const keys = new Set(refs.map(ref => JSON.stringify([ref.printedPage, ref.blockId])));
    let changed = false;
    const associations = (validation.associations ?? []).map(value => {
        if (value.deletedAt || (!keys.has(JSON.stringify([value.source.printedPage, value.source.blockId])) &&
            !keys.has(JSON.stringify([value.target.printedPage, value.target.blockId]))))
            return value;
        changed = true;
        return { ...value, state: 'reassociation-required', updatedAt: now,
            history: [...value.history, { at: now, action: 'invalidated', reason }] };
    });
    return changed ? { ...validation, associations, lastUpdatedAt: now } : validation;
}
function validateAssociations(validation, logical, textFor, now = new Date().toISOString()) {
    let changed = false;
    const associations = (validation.associations ?? []).map(value => {
        if (value.deletedAt)
            return value;
        const problems = associationProblems(value, textFor(value.source), logical, validation);
        if (!problems.length || value.state === 'reassociation-required')
            return value;
        changed = true;
        return { ...value, state: 'reassociation-required', updatedAt: now,
            history: [...value.history, { at: now, action: 'invalidated', reason: problems.join(' ') }] };
    });
    return changed ? { ...validation, associations, lastUpdatedAt: now } : validation;
}
function updateAssociation(validation, id, source, sourceText, anchorText, occurrence, target, logical, now = new Date().toISOString()) {
    const old = (validation.associations ?? []).find(value => value.id === id && !value.deletedAt);
    if (!old)
        throw new Error('Association active introuvable.');
    const created = createAssociation({ ...validation, associations: (validation.associations ?? []).filter(value => value.id !== id) }, source, sourceText, anchorText, occurrence, target, logical, now).associations;
    const replacement = created[created.length - 1];
    const value = { ...replacement, id, createdAt: old.createdAt,
        history: [...old.history, { at: now, action: 'updated' }] };
    return { ...validation, associations: (validation.associations ?? []).map(item => item.id === id ? value : item), lastUpdatedAt: now };
}
function deleteAssociation(validation, id, now = new Date().toISOString()) {
    const found = (validation.associations ?? []).find(value => value.id === id && !value.deletedAt);
    if (!found)
        throw new Error('Association active introuvable.');
    return { ...validation, associations: (validation.associations ?? []).map(value => value.id !== id ? value : {
            ...value, deletedAt: now, updatedAt: now, history: [...value.history, { at: now, action: 'deleted' }],
        }), lastUpdatedAt: now };
}
function activeAssociations(validation) {
    return (validation?.associations ?? []).filter(value => !value.deletedAt);
}
/** Only explicit deletion records justify cleanup; absent/merged blocks still need review. */
function associationsForDeletedBlocks(validation) {
    const deleted = new Set((validation?.manualBlocks ?? []).filter(block => block.undoneAt)
        .map(block => JSON.stringify([block.sourceRef.printedPage, block.id])));
    return activeAssociations(validation).filter(link => [link.source, link.target]
        .some(ref => deleted.has(JSON.stringify([ref.printedPage, ref.blockId]))));
}
function repairDeletedBlockAssociations(validation, now = new Date().toISOString()) {
    return associationsForDeletedBlocks(validation).reduce((next, link) => deleteAssociation(next, link.id, now), validation);
}
function sourceTextFromPacket(packet, ref) {
    return packet.pages.find(page => page.printedPage === ref.printedPage)?.parts?.find(part => part.id === ref.blockId)?.text ?? '';
}
