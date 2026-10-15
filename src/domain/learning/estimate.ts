import type { RomanianLesson } from '../../data/romanianLessons';
import { revisionTables } from '../../data/revisionTables';

export type StudyEstimate = { readingMinutes: number; attentiveMinutes: number; sectionReadingMinutes: number[] };

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateLesson(lesson: RomanianLesson, wordsPerMinute = 200): StudyEstimate {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    throw new Error('La vitesse de lecture doit être positive.');
  }
  const sectionReadingMinutes = lesson.sections.map(section => {
    const tableCount = revisionTables[section.id ?? '']?.length ?? 0;
    return Math.max(1, Math.ceil(wordCount(section.text.ro) / wordsPerMinute + tableCount * 0.75 + (section.illustrations ?? 0) * 1.5));
  });
  const words = lesson.sections.reduce((total, section) => total + wordCount(section.text.ro), 0);
  const tableCount = lesson.sections.reduce((total, section) => total + (revisionTables[section.id ?? '']?.length ?? 0), 0);
  const illustrations = lesson.sections.reduce((total, section) => total + (section.illustrations ?? 0), 0);
  const questionMinutes = lesson.questions.length * 0.75;
  const readingMinutes = sectionReadingMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const attentiveMinutes = Math.max(readingMinutes, Math.ceil(words / (wordsPerMinute * 0.55) + tableCount + illustrations * 1.5 + questionMinutes));
  return { readingMinutes, attentiveMinutes, sectionReadingMinutes };
}
