import type { CourseItem, CourseStructure } from './courseStructure';
import type { RevisionCardSet } from './revisionCards';

/** Read-only adapter: never condenses or rewrites a saved sheet. */
export function revisionCardStructure(cards: RevisionCardSet): CourseStructure {
  const result: CourseStructure = { authors: [], intro: [], sections: [], outline: [] };
  cards.sections.forEach((section, at) => {
    const item = (text: string, suffix: string, heading = false): CourseItem => {
      const blockId = `card:${section.id}:${suffix}`;
      return { key: JSON.stringify([at + 1, blockId]), printedPage: at + 1, pdfPage: 0, blockId,
        kind: heading ? section.level : undefined,
        presentation: { text, hide: false, imageOnly: false },
        part: { id: blockId, kind: 'text', role: heading ? 'heading' : 'paragraph', bbox: [0, 0, 1, 1],
          status: 'unverified', sourceLineIds: [], text, lines: [], reasons: [], image: '' } };
    };
    const content = [item(section.title, 'title', true), ...section.items.map((text, i) => item(text, String(i)))];
    if (section.level === 'h2') result.sections.push({ id: section.id, title: section.title, items: content });
    else if (result.sections.length) result.sections[result.sections.length - 1].items.push(...content);
    else result.intro.push(...content);
  });
  return result;
}
