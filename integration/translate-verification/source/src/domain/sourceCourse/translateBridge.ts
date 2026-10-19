import type { SourcePacket, SourceRun } from './packet';
import type { ChapterValidation } from './verification';
import type { CoursePresentation } from './displayCorrections';
import type { BlockTable } from './classification';
import { logicalBlocks } from './manualBlocks';
import { savedBlock, workingPresentation } from './blockEdits';
import { buildStructureExport } from './structureExport';

export type TranslateScope = { kind: 'chapter' } | { kind: 'page'; printedPage: number };
export type TranslateNode = {
  printedPage: number; pdfPage: number; blockId: string; role: string; kind?: string;
  text: string; rawText: string; bbox: number[]; lines: SourceRun[][];
  table?: BlockTable; imageOnly: boolean; hide: boolean; image: string;
};
export type TranslateSnapshot = {
  chapterId: string; sourceSha256: string; nodes: TranslateNode[];
  pages: Array<{ printedPage: number; pdfPage: number; width: number; height: number }>;
  /** Local provenance only. Never used to overwrite review data. */
  provenance: ReturnType<typeof buildStructureExport>;
};
export type TranslateUnit = { id: string; type: string; text: string; meta: {
  printedPage: number; blockId: string; field: 'text' | 'title' | 'notes' | 'cell' | 'run'; row?: number; column?: number;
} };
export type TranslateRequest = {
  schemaVersion: 1; chapterId: string; title: string; sourceLang: 'ro'; targetLang: 'fr'; sourceRevision: string;
  blocks: TranslateUnit[]; norya: { contract: 1; scope: TranslateScope; chapterRevision: string; sourceSha256: string; layout: unknown };
};
export type PreparedTranslation = { request: TranslateRequest; snapshot: TranslateSnapshot; scope: TranslateScope };
export type ValidatedTranslation = { chapter_id: string; source_revision: string; translations: Array<{ id: string; text: string; validated: true }> };

/** Resolve the same corrections, manual blocks, splits and merges as the reader. */
export function translationSnapshot(packet: SourcePacket, validation: ChapterValidation | null,
  frozen?: Record<string, CoursePresentation>): TranslateSnapshot {
  if (packet.schemaVersion !== 2) throw new Error('Un cours structuré v2 est requis.');
  if (validation && validation.chapterId !== packet.chapterId)
    throw new Error('Provenance des corrections incompatible.');
  const nodes: TranslateNode[] = [];
  for (const { printedPage, pdfPage, blockId, part } of logicalBlocks(packet, validation)) {
    const p = frozen ? frozen[JSON.stringify([printedPage, blockId])] : workingPresentation(printedPage, part, validation, packet.chapterId);
    if (!p) continue;
    const saved = savedBlock(validation, printedPage, blockId);
    nodes.push({ printedPage, pdfPage, blockId, role: part.role, kind: saved?.kind ?? part.suggestedKind,
      text: p.text, rawText: part.text, bbox: part.bbox, lines: part.lines, table: saved?.table,
      imageOnly: p.imageOnly, hide: p.hide, image: part.image });
  }
  return JSON.parse(JSON.stringify({ chapterId: packet.chapterId, sourceSha256: packet.sourceSha256, nodes,
    pages: packet.pages.map(({ printedPage, pdfPage, width, height }) => ({ printedPage, pdfPage, width, height })),
    provenance: buildStructureExport(packet, validation) }));
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export async function digest(value: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 nécessite un navigateur HTTPS.');
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export async function prepareTranslation(snapshot: TranslateSnapshot, scope: TranslateScope): Promise<PreparedTranslation> {
  if (scope.kind === 'page' && !snapshot.pages.some(p => p.printedPage === scope.printedPage)) throw new Error('Page absente.');
  // All chapter content participates even for a page request. Any RO/layout change invalidates the result.
  const layout = await Promise.all(snapshot.nodes.map(async ({ image, table, ...n }) => ({ ...n,
    imageSha256: await digest(image), ...(table ? { table: { rows: table.rows, rowRoles: table.rowRoles,
      title: table.title, notes: table.notes, validated: table.validated, keepOriginal: table.keepOriginal } } : {}) })));
  const chapterRevision = await digest({ chapterId: snapshot.chapterId, sourceSha256: snapshot.sourceSha256, pages: snapshot.pages, layout,
    originals: snapshot.provenance.blocks.map(b => ({ page: b.printedPage, id: b.id, text: b.rawText, correction: b.correctedText,
      lines: b.lines, bbox: b.bbox, mergedInto: b.mergedInto, sourceLineIds: b.sourceLineIds })) });
  const selected = layout.filter(n => scope.kind === 'chapter' || n.printedPage === scope.printedPage);
  const blocks: TranslateUnit[] = [];
  const add = async (n: typeof layout[number], field: TranslateUnit['meta']['field'], text: string | undefined, row?: number, column?: number) => {
    if (!text?.trim()) return;
    if (text.length > 30000) throw new Error('Un texte dépasse la limite Translate (30 000 caractères). Aucun découpage automatique.');
    const meta = { printedPage: n.printedPage, blockId: n.blockId, field, ...(row === undefined ? {} : { row, column }) };
    blocks.push({ id: await digest([snapshot.chapterId, meta]), type: field === 'cell' ? 'table-cell' : n.kind ?? n.role, text, meta });
  };
  for (const n of selected) {
    if (n.hide || n.imageOnly) continue;
    if (n.table && n.kind === 'table') {
      if (!n.table.validated || n.table.keepOriginal) throw new Error('Tableau numérique non validé.');
      await add(n, 'title', n.table.title); await add(n, 'notes', n.table.notes);
      for (const [r, row] of n.table.rows.entries()) for (const [c, cell] of row.entries()) await add(n, 'cell', cell.text, r, c);
    } else {
      const styled = n.lines.flat().some(r => r.bold || r.italic);
      if (styled) {
        if (n.text !== n.lines.map(l => l.map(r => r.text).join('')).join('\n'))
          throw new Error(`Styles du bloc ${n.blockId}, p. ${n.printedPage} : alignement avec le texte corrigé à contrôler avant traduction.`);
        for (const [r, line] of n.lines.entries()) for (const [c, run] of line.entries()) await add(n, 'run', run.text, r, c);
      } else await add(n, 'text', n.text);
    }
  }
  if (!blocks.length || blocks.length > 3000) throw new Error('Translate exige entre 1 et 3 000 textes par demande.');
  const request: TranslateRequest = { schemaVersion: 1, chapterId: snapshot.chapterId, title: snapshot.chapterId,
    sourceLang: 'ro', targetLang: 'fr', sourceRevision: await digest({ chapterRevision, scope, contract: 1 }), blocks,
    norya: { contract: 1, scope, chapterRevision, sourceSha256: snapshot.sourceSha256, layout: { pages: snapshot.pages, nodes: selected } } };
  if (new TextEncoder().encode(JSON.stringify(request)).length > 2_000_000) throw new Error('La demande dépasse 2 Mo. Choisissez une page.');
  return { request, snapshot, scope };
}
export function validateTranslation(prepared: PreparedTranslation, value: unknown): ValidatedTranslation {
  const v = value as ValidatedTranslation;
  if (!v || v.chapter_id !== prepared.request.chapterId || v.source_revision !== prepared.request.sourceRevision)
    throw new Error('Traduction obsolète ou chapitre incompatible.');
  if (!Array.isArray(v.translations) || v.translations.length !== prepared.request.blocks.length) throw new Error('Traduction incomplète.');
  const expected = new Set(prepared.request.blocks.map(b => b.id));
  for (const t of v.translations) {
    if (!t || !expected.delete(t.id) || t.validated !== true || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 30000)
      throw new Error('Traduction incomplète, dupliquée ou non validée humainement.');
  }
  return v;
}
/** Copy-on-write overlay. No writes to packet, corrections, annotations or local translations. */
export function frenchNodes(prepared: PreparedTranslation, response: unknown): TranslateNode[] {
  const valid = validateTranslation(prepared, response);
  const texts = new Map(valid.translations.map(t => [t.id, t.text]));
  const nodes: TranslateNode[] = JSON.parse(JSON.stringify(prepared.snapshot.nodes.filter(n => prepared.scope.kind === 'chapter' || n.printedPage === prepared.scope.printedPage)));
  for (const b of prepared.request.blocks) {
    const n = nodes.find(n => n.printedPage === b.meta.printedPage && n.blockId === b.meta.blockId)!;
    const text = texts.get(b.id)!;
    if (b.meta.field === 'text') n.text = text;
    else if (b.meta.field === 'cell') n.table!.rows[b.meta.row!][b.meta.column!].text = text;
    else if (b.meta.field === 'run') n.lines[b.meta.row!][b.meta.column!].text = text;
    else n.table![b.meta.field] = text;
  }
  for (const n of nodes) if (prepared.request.blocks.some(b => b.meta.field === 'run' && b.meta.printedPage === n.printedPage && b.meta.blockId === n.blockId))
    n.text = n.lines.map(l => l.map(r => r.text).join('')).join('\n');
  return nodes;
}
