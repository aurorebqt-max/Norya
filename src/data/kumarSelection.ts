import type { RomanianLesson } from './romanianLessons';
import type { Flashcard } from '../domain/medical/types';
/** Whole-object replacement: never concatenate legacy sections, questions or translations. */
export function replaceKumarLessons(legacy: RomanianLesson[], imported: RomanianLesson[]): RomanianLesson[] {
  const replacements = new Map(imported.map(lesson => [lesson.chapterId, lesson]));
  if (replacements.size !== 2 || !replacements.has('kum-08') || !replacements.has('kum-09')) throw new Error('Import Kumar 8–9 incomplet.');
  return legacy.map(lesson => replacements.get(lesson.chapterId) ?? lesson);
}
export function replaceKumarCards(legacy: Flashcard[], imported: Flashcard[]): Flashcard[] {
  return [...legacy.filter(card => !['kum-08', 'kum-09'].includes(card.objectiveId)), ...imported];
}
