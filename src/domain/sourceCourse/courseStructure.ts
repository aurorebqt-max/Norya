import type { SourcePacket, SourcePart } from './packet';
import type { CoursePresentation } from './displayCorrections';
import type { ChapterValidation } from './verification';
import type { BlockKind, BlockTable } from './classification';
import { savedBlock, workingPresentation } from './blockEdits';
import { isAbsorbedByMerge } from './merges';
import { logicalBlocks } from './manualBlocks';

export type CourseItem = {
  key: string; printedPage: number; pdfPage: number; blockId: string; part: SourcePart;
  presentation: CoursePresentation; kind?: BlockKind; table?: BlockTable;
};
export type CourseSection = { id: string; title: string; items: CourseItem[] };
export type CourseOutlineItem = {
  key: string;
  sectionId: string;
  level: 'h2' | 'h3' | 'h4';
  title: string;
};
export type CourseStructure = {
  /** Texte du bloc H1 : affiché dans l'en-tête, jamais dans le corps. */
  title?: string;
  /** Un élément par bloc « Auteurs », texte exact. */
  authors: string[];
  /** Blocs situés avant le premier H2 (conservés, affichés avec la première section). */
  intro: CourseItem[];
  sections: CourseSection[];
  /** Sommaire de navigation dérivé uniquement des titres classés et vérifiés. */
  outline: CourseOutlineItem[];
};

const HEADER_KINDS: BlockKind[] = ['h1', 'authors', 'toc', 'bibliography'];
const key = (page: number, block: string) => JSON.stringify([page, block]);

/**
 * Organise le cours par grandes sections H2, dans l'ordre d'origine du paquet.
 * Les blocs absorbés par une fusion, masqués, ainsi que H1, auteurs et sommaire original
 * n'entrent pas dans le corps ; leur contenu source reste intact dans le paquet.
 * `frozen` : présentations figées d'une version publiée.
 */
export function buildCourseStructure(packet: SourcePacket | null | undefined, validation: ChapterValidation | null | undefined,
  frozen?: Record<string, CoursePresentation>): CourseStructure {
  const result: CourseStructure = { authors: [], intro: [], sections: [], outline: [] };
  const titles: string[] = [];
  for (const logical of packet ? logicalBlocks(packet, validation) : []) {
    const { printedPage, pdfPage, blockId, part } = logical;
    if (isAbsorbedByMerge(validation?.merges, printedPage, blockId)) continue;
    const saved = savedBlock(validation, printedPage, blockId);
    const presentation = frozen ? frozen[key(printedPage, blockId)] : workingPresentation(printedPage, part, validation);
    if (!presentation) continue;
    const kind = saved?.kind;
    if (kind === 'h1') { if (presentation.text.trim()) titles.push(presentation.text.trim()); continue; }
    if (kind === 'authors') { if (presentation.text.trim()) result.authors.push(presentation.text.trim()); continue; }
    if (kind === 'toc' || kind === 'bibliography' || presentation.hide) continue;
    const item: CourseItem = { key: key(printedPage, blockId), printedPage, pdfPage,
      blockId, part, presentation, kind, table: kind === 'table' ? saved?.table : undefined };
    if (kind === 'h2') {
      const section = { id: `h2:${item.key}`, title: presentation.text.replace(/\s+/gu, ' ').trim(), items: [item] };
      result.sections.push(section);
      if (saved?.status === 'verified' || saved?.status === 'corrected') {
        result.outline.push({ key: item.key, sectionId: section.id, level: 'h2', title: section.title });
      }
    } else if (result.sections.length) {
      const section = result.sections[result.sections.length - 1];
      section.items.push(item);
      if ((kind === 'h3' || kind === 'h4') && (saved?.status === 'verified' || saved?.status === 'corrected')) {
        result.outline.push({ key: item.key, sectionId: section.id, level: kind, title: presentation.text.replace(/\s+/gu, ' ').trim() });
      }
    }
    else result.intro.push(item);
  }
  if (titles.length) result.title = titles.join(' ');
  return result;
}

/** Types qui sortent du corps du cours publié (conservés dans les données et masqués dans la lecture). */
export const isHeaderKind = (kind?: BlockKind) => !!kind && HEADER_KINDS.includes(kind);
