"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeManualBlocks = activeManualBlocks;
exports.createManualBlock = createManualBlock;
exports.undoManualBlockCreation = undoManualBlockCreation;
exports.logicalBlocks = logicalBlocks;
const verification_1 = require("./verification");
const associations_1 = require("./associations");
const manualId = (validation, now) => {
    const base = `manual-${now.replace(/[^0-9A-Za-z]/g, '')}`;
    const used = new Set((validation.manualBlocks ?? []).map(block => block.id));
    let suffix = 1;
    while (used.has(`${base}-${suffix}`))
        suffix += 1;
    return `${base}-${suffix}`;
};
function activeManualBlocks(validation) {
    return (validation?.manualBlocks ?? []).filter(block => !block.undoneAt);
}
function createManualBlock(validation, packet, after, text, now = new Date().toISOString()) {
    if (!text.trim())
        throw new Error('Le texte du nouveau bloc ne peut pas être vide.');
    const source = packet.pages.find(page => page.printedPage === after.printedPage)?.parts?.find(part => part.id === after.blockId);
    const existing = activeManualBlocks(validation).find(block => block.id === after.blockId);
    const sourceRef = existing?.sourceRef ?? (source ? {
        printedPage: after.printedPage, pdfPage: packet.pages.find(page => page.printedPage === after.printedPage).pdfPage,
        blockId: source.id, sourceSha256: packet.sourceSha256,
    } : null);
    if (!sourceRef)
        throw new Error('Bloc d’insertion introuvable dans cette source.');
    const id = manualId(validation, now);
    const manual = { id, text, sourceRef, after, createdAt: now };
    const pageIndex = validation.pages.findIndex(page => page.printedPage === sourceRef.printedPage);
    if (pageIndex < 0)
        throw new Error('Page de validation introuvable.');
    const pages = validation.pages.map((page, index) => index !== pageIndex ? page : {
        ...page, blocks: [...page.blocks, { id, page: sourceRef.printedPage, status: 'pending' }],
    });
    return { ...validation, pages, ...(0, verification_1.calculateChapterStats)(pages), manualBlocks: [...(validation.manualBlocks ?? []), manual], lastUpdatedAt: now };
}
function undoManualBlockCreation(validation, blockId, now = new Date().toISOString()) {
    const block = activeManualBlocks(validation).find(candidate => candidate.id === blockId);
    if (!block)
        throw new Error('Bloc manuel actif introuvable.');
    const hasChildren = activeManualBlocks(validation).some(candidate => candidate.after.printedPage === block.sourceRef.printedPage &&
        candidate.after.blockId === blockId);
    if (hasChildren)
        throw new Error('Annulez d’abord les blocs ajoutés après ce bloc manuel.');
    let next = validation;
    for (const association of (0, associations_1.activeAssociations)(validation)) {
        if ([association.source, association.target].some(ref => ref.printedPage === block.sourceRef.printedPage && ref.blockId === block.id)) {
            next = (0, associations_1.deleteAssociation)(next, association.id, now);
        }
    }
    return {
        ...next,
        manualBlocks: (validation.manualBlocks ?? []).map(candidate => candidate.id === blockId ? { ...candidate, undoneAt: now } : candidate),
        lastUpdatedAt: now,
    };
}
function partForManual(block, source) {
    return {
        id: block.id, kind: 'text', role: 'paragraph', bbox: source.bbox, status: 'unverified',
        sourceLineIds: [], text: block.text, lines: [[{ text: block.text, bold: false, italic: false }]],
        reasons: [], image: source.image,
    };
}
/** Source order plus active user blocks. The packet is only read, never changed. */
function logicalBlocks(packet, validation) {
    const children = new Map();
    for (const block of activeManualBlocks(validation)) {
        const key = JSON.stringify([block.after.printedPage, block.after.blockId]);
        children.set(key, [...(children.get(key) ?? []), block].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
    }
    const result = [];
    const appendChildren = (parent, source) => {
        const key = JSON.stringify([parent.printedPage, parent.blockId]);
        for (const manual of children.get(key) ?? []) {
            const sourcePage = packet.pages.find(candidate => candidate.printedPage === manual.sourceRef.printedPage);
            const referencedSource = sourcePage?.parts?.find(candidate => candidate.id === manual.sourceRef.blockId) ?? source;
            if (!referencedSource)
                continue; // stale imports remain persisted but are not falsely attached to another source.
            const manualPart = partForManual(manual, referencedSource);
            result.push({ printedPage: manual.sourceRef.printedPage, pdfPage: manual.sourceRef.pdfPage, blockId: manual.id, part: manualPart, manual });
            appendChildren({ printedPage: manual.sourceRef.printedPage, blockId: manual.id }, manualPart);
        }
    };
    for (const page of packet.pages)
        for (const part of page.parts ?? []) {
            result.push({ printedPage: page.printedPage, pdfPage: page.pdfPage, blockId: part.id, part });
            appendChildren({ printedPage: page.printedPage, blockId: part.id }, part);
        }
    return result;
}
