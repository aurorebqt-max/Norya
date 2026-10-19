"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnCount = exports.kindLabel = exports.BLOCK_KINDS = void 0;
exports.createTable = createTable;
exports.tableFromText = tableFromText;
exports.setCellText = setCellText;
exports.addRow = addRow;
exports.addColumn = addColumn;
exports.removeRow = removeRow;
exports.removeColumn = removeColumn;
exports.setCellSpan = setCellSpan;
exports.rowRole = rowRole;
exports.setRowRole = setRowRole;
exports.setCellHeader = setCellHeader;
exports.tableProblems = tableProblems;
exports.flattenTable = flattenTable;
exports.applyClassification = applyClassification;
exports.setBlockKind = setBlockKind;
exports.setBlocksKind = setBlocksKind;
exports.saveBlockTable = saveBlockTable;
exports.decideBlockTable = decideBlockTable;
exports.BLOCK_KINDS = [
    { id: 'h1', label: 'Titre 1 (H1)' }, { id: 'h2', label: 'Titre 2 (H2)' },
    { id: 'h3', label: 'Titre 3 (H3)' }, { id: 'h4', label: 'Titre 4 (H4)' },
    { id: 'h5', label: 'Titre 5 (H5)' },
    { id: 'authors', label: 'Auteurs du chapitre' }, { id: 'toc', label: 'Sommaire original' },
    { id: 'bibliography', label: 'Bibliographie / Références' }, { id: 'table', label: 'Tableau' },
];
const kindLabel = (kind) => exports.BLOCK_KINDS.find(k => k.id === kind)?.label ?? 'Texte normal';
exports.kindLabel = kindLabel;
const now = () => new Date().toISOString();
const cell = (text = '') => ({ text });
const clone = (table) => JSON.parse(JSON.stringify(table));
const touch = (table) => ({ ...table, validated: false, validatedAt: undefined, keepOriginal: undefined, updatedAt: now() });
function createTable(rows = 2, columns = 2) {
    return { rows: Array.from({ length: Math.max(1, rows) }, () => Array.from({ length: Math.max(1, columns) }, () => cell())), validated: false };
}
const columnCount = (table) => table.rows.reduce((max, row) => Math.max(max, row.length), 0);
exports.columnCount = columnCount;
/** Proposition de départ : les cellules reprennent exactement les segments du texte extrait (séparés par tabulation ou 2 espaces). */
function tableFromText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const split = lines.map(line => line.split(/\t| {2,}/).map(part => part.trim()));
    const width = Math.max(1, ...split.map(r => r.length));
    return { rows: (split.length ? split : [['']]).map(r => Array.from({ length: width }, (_, i) => cell(r[i] ?? ''))), validated: false };
}
function setCellText(table, row, column, text) {
    if (!table.rows[row]?.[column])
        throw new Error('Cellule introuvable.');
    const next = clone(table);
    next.rows[row][column].text = text;
    return touch(next);
}
/** Cellule d'origine d'une cellule recouverte. */
function owner(table, row, column) {
    for (let r = row; r >= 0; r--)
        for (let c = column; c >= 0; c--) {
            const origin = table.rows[r]?.[c];
            if (origin && !origin.covered && r + (origin.rowSpan ?? 1) > row && c + (origin.colSpan ?? 1) > column)
                return [r, c];
        }
    return [row, column];
}
const crossesSpan = (table, row, column) => {
    const [r, c] = owner(table, row, column);
    return r !== row || c !== column;
};
function addRow(table, at) {
    if (at < 0 || at > table.rows.length)
        throw new Error('Position de ligne invalide.');
    const width = (0, exports.columnCount)(table);
    for (let c = 0; c < width && at > 0 && at < table.rows.length; c++) {
        if (crossesSpan(table, at, c))
            throw new Error('Insertion au milieu d’une cellule fusionnée : défusionnez-la d’abord.');
    }
    const next = clone(table);
    next.rows.splice(at, 0, Array.from({ length: width }, () => cell()));
    if (next.rowRoles)
        next.rowRoles.splice(at, 0, 'normal');
    return touch(next);
}
function addColumn(table, at) {
    const width = (0, exports.columnCount)(table);
    if (at < 0 || at > width)
        throw new Error('Position de colonne invalide.');
    for (let r = 0; r < table.rows.length && at > 0 && at < width; r++) {
        if (crossesSpan(table, r, at))
            throw new Error('Insertion au milieu d’une cellule fusionnée : défusionnez-la d’abord.');
    }
    const next = clone(table);
    next.rows.forEach(row => row.splice(at, 0, cell()));
    return touch(next);
}
function removeRow(table, row) {
    if (table.rows.length <= 1)
        throw new Error('Un tableau doit garder au moins une ligne.');
    if (!table.rows[row])
        throw new Error('Ligne introuvable.');
    const next = clone(table);
    for (let originRow = 0; originRow < row; originRow++) {
        for (const cell of next.rows[originRow]) {
            const rowSpan = cell.rowSpan ?? 1;
            if (originRow + rowSpan > row)
                cell.rowSpan = rowSpan === 2 ? undefined : rowSpan - 1;
        }
    }
    if (next.rows[row].some(cell => (cell.rowSpan ?? 1) > 1)) {
        throw new Error('Défusionnez les cellules verticales qui commencent sur cette ligne avant de la supprimer.');
    }
    next.rows.splice(row, 1);
    next.rowRoles?.splice(row, 1);
    return touch(next);
}
function removeColumn(table, column) {
    if ((0, exports.columnCount)(table) <= 1)
        throw new Error('Un tableau doit garder au moins une colonne.');
    if (column < 0 || column >= (0, exports.columnCount)(table))
        throw new Error('Colonne introuvable.');
    const next = clone(table);
    for (const row of next.rows) {
        for (let originColumn = 0; originColumn < column; originColumn++) {
            const cell = row[originColumn];
            const colSpan = cell.colSpan ?? 1;
            if (originColumn + colSpan > column)
                cell.colSpan = colSpan === 2 ? undefined : colSpan - 1;
        }
        if ((row[column]?.colSpan ?? 1) > 1) {
            throw new Error('Défusionnez les cellules horizontales qui commencent dans cette colonne avant de la supprimer.');
        }
    }
    next.rows.forEach(currentRow => currentRow.splice(column, 1));
    return touch(next);
}
/** Fusion horizontale/verticale : les cellules recouvertes sont masquées, leur texte reste enregistré. */
function setCellSpan(table, row, column, rowSpan, colSpan) {
    const origin = table.rows[row]?.[column];
    if (!origin || origin.covered)
        throw new Error('Cellule introuvable.');
    rowSpan = Math.max(1, rowSpan);
    colSpan = Math.max(1, colSpan);
    if (row + rowSpan > table.rows.length || column + colSpan > (0, exports.columnCount)(table))
        throw new Error('La fusion dépasse du tableau.');
    const next = clone(table);
    const target = next.rows[row][column];
    for (let r = row; r < row + (target.rowSpan ?? 1); r++)
        for (let c = column; c < column + (target.colSpan ?? 1); c++) {
            if (r !== row || c !== column)
                delete next.rows[r][c].covered;
        }
    for (let r = row; r < row + rowSpan; r++)
        for (let c = column; c < column + colSpan; c++) {
            if (r === row && c === column)
                continue;
            const other = next.rows[r][c];
            if (other.covered || (other.rowSpan ?? 1) > 1 || (other.colSpan ?? 1) > 1)
                throw new Error('La zone chevauche une autre cellule fusionnée.');
            other.covered = true;
        }
    target.rowSpan = rowSpan > 1 ? rowSpan : undefined;
    target.colSpan = colSpan > 1 ? colSpan : undefined;
    return touch(next);
}
function rowRole(table, row) {
    return table.rowRoles?.[row] ?? (row === 0 ? 'header' : 'normal');
}
function setRowRole(table, row, role) {
    if (!table.rows[row])
        throw new Error('Ligne introuvable.');
    const next = clone(table);
    const roles = Array.from({ length: next.rows.length }, (_, index) => next.rowRoles?.[index] ?? (index === 0 ? 'header' : 'normal'));
    roles[row] = role;
    next.rowRoles = roles;
    return touch(next);
}
function setCellHeader(table, row, column, header) {
    if (!table.rows[row]?.[column] || table.rows[row][column].covered)
        throw new Error('Cellule introuvable.');
    const next = clone(table);
    next.rows[row][column].header = header || undefined;
    return touch(next);
}
function tableProblems(table) {
    const problems = [];
    if (!table.rows.length || (0, exports.columnCount)(table) < 1)
        problems.push('Le tableau est vide.');
    else if (!table.rows.some(r => r.some(x => !x.covered && x.text.trim())))
        problems.push('Aucune cellule ne contient de texte.');
    return problems;
}
/** Texte des cellules visibles, ligne par ligne : sert au temps de lecture et à l'export. */
function flattenTable(table) {
    const lines = [];
    if (table.title?.trim())
        lines.push(table.title.trim());
    for (const row of table.rows)
        lines.push(row.filter(x => !x.covered).map(x => x.text).join('\t'));
    if (table.notes?.trim())
        lines.push(table.notes.trim());
    return lines.join('\n');
}
/** Un tableau remplace l'image seulement une fois validé humainement ; sinon l'original reste affiché. */
function applyClassification(presentation, block) {
    if (block?.kind !== 'table')
        return presentation;
    if (block.table?.validated && !block.table.keepOriginal) {
        return { ...presentation, imageOnly: false, hide: false, text: flattenTable(block.table), heading: undefined, contents: undefined };
    }
    return { ...presentation, imageOnly: true };
}
function updateBlock(validation, ref, change, at) {
    const index = validation.pages.findIndex(p => p.printedPage === ref.printedPage);
    if (!validation.pages[index]?.blocks.some(b => b.id === ref.blockId))
        throw new Error('Bloc de validation introuvable');
    const pages = validation.pages.map((page, i) => i !== index ? page : {
        ...page, blocks: page.blocks.map(b => b.id === ref.blockId ? change(b) : b),
    });
    return { ...validation, pages, lastUpdatedAt: at };
}
/** Classe ou déclasse un bloc sans toucher au texte, au statut ni aux anomalies. */
function setBlockKind(validation, ref, kind, at = now()) {
    return updateBlock(validation, ref, block => {
        if ((block.kind ?? null) === kind)
            return block;
        return { ...block, kind: kind ?? undefined, kindHistory: [...(block.kindHistory ?? []), { at, before: block.kind ?? null, after: kind }] };
    }, at);
}
/** Classe tous les blocs d’un bloc logique fusionné en préservant statuts, corrections et historique. */
function setBlocksKind(validation, refs, kind, at = now()) {
    if (!refs.length)
        throw new Error('Aucun bloc à classer.');
    return refs.reduce((next, ref) => setBlockKind(next, ref, kind, at), validation);
}
/** Enregistre un brouillon de tableau : toute modification retire la validation précédente. */
function saveBlockTable(validation, ref, table, at = now()) {
    return updateBlock(validation, ref, block => {
        if (block.kind !== 'table')
            throw new Error('Classez d’abord le bloc comme « Tableau ».');
        return { ...block, table: { ...table, validated: false, validatedAt: undefined, keepOriginal: undefined, updatedAt: at } };
    }, at);
}
/** Décision humaine : valider la reconstruction, conserver l'image originale, ou revenir au brouillon. */
function decideBlockTable(validation, ref, decision, at = now()) {
    return updateBlock(validation, ref, block => {
        if (block.kind !== 'table' || !block.table)
            throw new Error('Aucun tableau numérique à valider.');
        if (decision === 'validate') {
            const problems = tableProblems(block.table);
            if (problems.length)
                throw new Error(problems.join(' '));
            return { ...block, table: { ...block.table, validated: true, validatedAt: at, keepOriginal: undefined } };
        }
        if (decision === 'keep-original')
            return { ...block, table: { ...block.table, validated: false, validatedAt: undefined, keepOriginal: true } };
        return { ...block, table: { ...block.table, validated: false, validatedAt: undefined, keepOriginal: undefined } };
    }, at);
}
