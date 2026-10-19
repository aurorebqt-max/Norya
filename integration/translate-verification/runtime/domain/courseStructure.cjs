"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHeaderKind = void 0;
exports.buildCourseStructure = buildCourseStructure;
const blockEdits_1 = require("./blockEdits");
const merges_1 = require("./merges");
const manualBlocks_1 = require("./manualBlocks");
const HEADER_KINDS = ['h1', 'authors', 'toc', 'bibliography'];
const key = (page, block) => JSON.stringify([page, block]);
/**
 * Organise le cours par grandes sections H2, dans l'ordre d'origine du paquet.
 * Les blocs absorbés par une fusion, masqués, ainsi que H1, auteurs et sommaire original
 * n'entrent pas dans le corps ; leur contenu source reste intact dans le paquet.
 * `frozen` : présentations figées d'une version publiée.
 */
function buildCourseStructure(packet, validation, frozen) {
    const result = { authors: [], intro: [], sections: [], outline: [] };
    const titles = [];
    for (const logical of packet ? (0, manualBlocks_1.logicalBlocks)(packet, validation) : []) {
        const { printedPage, pdfPage, blockId, part } = logical;
        if ((0, merges_1.isAbsorbedByMerge)(validation?.merges, printedPage, blockId))
            continue;
        const saved = (0, blockEdits_1.savedBlock)(validation, printedPage, blockId);
        const presentation = frozen ? frozen[key(printedPage, blockId)] : (0, blockEdits_1.workingPresentation)(printedPage, part, validation, packet?.chapterId);
        if (!presentation)
            continue;
        const kind = saved ? saved.kind : part.suggestedKind;
        if (kind === 'h1') {
            if (presentation.text.trim())
                titles.push(presentation.text.trim());
            continue;
        }
        if (kind === 'authors') {
            if (presentation.text.trim())
                result.authors.push(presentation.text.trim());
            continue;
        }
        if (kind === 'toc' || kind === 'bibliography' || presentation.hide)
            continue;
        if (part.role === 'page-header')
            continue;
        const item = { key: key(printedPage, blockId), printedPage, pdfPage,
            blockId, part, presentation, kind, table: kind === 'table' ? saved?.table : undefined };
        if (kind === 'h2') {
            const section = { id: `h2:${item.key}`, title: presentation.text.replace(/\s+/gu, ' ').trim(), items: [item] };
            result.sections.push(section);
            if (saved?.status === 'verified' || saved?.status === 'corrected') {
                result.outline.push({ key: item.key, sectionId: section.id, level: 'h2', title: section.title });
            }
        }
        else if (result.sections.length) {
            const section = result.sections[result.sections.length - 1];
            section.items.push(item);
            if ((kind === 'h3' || kind === 'h4') && (saved?.status === 'verified' || saved?.status === 'corrected')) {
                result.outline.push({ key: item.key, sectionId: section.id, level: kind, title: presentation.text.replace(/\s+/gu, ' ').trim() });
            }
        }
        else
            result.intro.push(item);
    }
    if (titles.length)
        result.title = titles.join(' ');
    return result;
}
/** Types qui sortent du corps du cours publié (conservés dans les données et masqués dans la lecture). */
const isHeaderKind = (kind) => !!kind && HEADER_KINDS.includes(kind);
exports.isHeaderKind = isHeaderKind;
