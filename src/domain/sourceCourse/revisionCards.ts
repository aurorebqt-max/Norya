import type { FinalCourseArchive, FinalCourseVersion } from './finalization';
import type { CourseStructure, CourseOutlineItem, CourseItem, CourseSection } from './courseStructure';
import type { ChapterValidation } from './verification';
import { savedBlock } from './blockEdits';
import { mergeAtAnchor } from './merges';
import { activeManualBlocks } from './manualBlocks';

export type CardSection = {
  id: string;
  level: 'h1' | 'h2' | 'h3' | 'h4';
  title: string;
  items: string[];
};

export type RevisionCardSet = {
  schemaVersion: 1;
  chapterId: string;
  version: number;
  sourceVersion: string;
  sections: CardSection[];
  structureKey: string;
  createdAt: string;
  updatedAt: string;
  evidence: {
    activeVersion: number;
    finalizedAt?: string;
    hasValidation: boolean;
    hasMerges: boolean;
    manualBlocks: number;
    readingMinutes?: number;
  };
  manualEdits?: boolean;
};

function presentText(item: CourseItem, validation: ChapterValidation | null | undefined): string | null {
  const merge = mergeAtAnchor(validation?.merges, item.printedPage, item.blockId);
  if (merge && merge.joinedText.trim()) return merge.joinedText;
  const saved = savedBlock(validation, item.printedPage, item.blockId);
  if (saved?.correction && saved.correction.trim()) return saved.correction;
  return item.presentation.text.trim() || null;
}



function condenseItem(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[-•*+]\s+/u.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    if (/\t/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    if (/^[0-9]+\.\s+/u.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    // keep as coherent phrase; don't split mid-unit
    const normalized = trimmed.replace(/\s+/g, ' ');
    out.push(normalized);
  }
  return out;
}

export function buildRevisionCardSet(
  chapterId: string,
  archive: FinalCourseArchive | null,
  structure: CourseStructure | null,
  validation: ChapterValidation | null | undefined,
  date = new Date().toISOString()
): RevisionCardSet | null {
  if (!archive || archive.status !== 'finalized') return null;
  const version = archive.versions.find(v => v.version === archive.activeVersion);
  if (!version) return null;
  if (!structure) return null;
  const sections: CardSection[] = [];
  const manualCount = activeManualBlocks(validation).length;
  const hasMerges = !!validation?.merges && validation.merges.length > 0;
  const structureKey = JSON.stringify({
    title: structure.title,
    authors: structure.authors,
    sections: structure.sections.map(s => ({
      id: s.id,
      title: s.title,
      items: s.items.map(i => ({ key: i.key, blockId: i.blockId, printedPage: i.printedPage, kind: i.kind })),
    })),
    outline: structure.outline.map((o: CourseOutlineItem) => ({ key: o.key, sectionId: o.sectionId, level: o.level, title: o.title })),
  });

  if (structure.title) {
    sections.push({ id: 'h1', level: 'h1', title: structure.title, items: [] });
  }
  for (const author of structure.authors) {
    const authorText = author.trim();
    if (authorText) {
      sections.push({ id: `authors-${sections.length}`, level: 'h1', title: 'Auteurs', items: [`• ${authorText}`] });
    }
  }
  const allItems: CourseItem[] = [...structure.intro, ...structure.sections.flatMap((s: CourseSection) => s.items)];
  for (const item of allItems) {
    const kind = item.kind;
    if (kind === 'h2' || kind === 'h3' || kind === 'h4') {
      const title = item.presentation.text.replace(/\s+/gu, ' ').trim();
      if (title) {
        sections.push({ id: `sec-${item.key}`, level: kind, title, items: [] });
      }
      continue;
    }
    const text = presentText(item, validation);
    if (!text) continue;
    let target = sections[sections.length - 1];
    if (!target || target.level === 'h1') {
      target = { id: `body-${sections.length}`, level: 'h2', title: 'Contenu', items: [] };
      sections.push(target);
    }
    for (const bullet of condenseItem(text)) {
      target.items.push(bullet);
    }
  }
  const filtered = sections.filter(s => s.level !== 'h1' || s.items.length > 0 || s.title);
  const set: RevisionCardSet = {
    schemaVersion: 1,
    chapterId,
    version: version.version,
    sourceVersion: `final-v${version.version}-${archive.activeVersion}`,
    sections: filtered,
    structureKey,
    createdAt: date,
    updatedAt: date,
    evidence: {
      activeVersion: archive.activeVersion,
      finalizedAt: version.finalizedAt,
      hasValidation: !!validation,
      hasMerges,
      manualBlocks: manualCount,
      readingMinutes: version.reading?.minutes,
    },
  };
  return set;
}

export function revisionCardsEqual(a: RevisionCardSet, b: RevisionCardSet): boolean {
  return a.structureKey === b.structureKey && a.version === b.version && a.chapterId === b.chapterId;
}
