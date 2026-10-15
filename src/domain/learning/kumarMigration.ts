import type { LearningState } from './types';
import type { RomanianLesson } from '../../data/romanianLessons';
/** Archive positional reading and old annotations; never reinterpret them against new text. */
export function migrateKumarMarkdown(state: LearningState, lessons: RomanianLesson[]): LearningState {
  const changed = lessons.filter(l => l.format === 'markdown' && state.markdownCourseVersions?.[l.chapterId] !== l.version);
  if (!changed.length) return state;
  const next: LearningState = {
    ...state, reading:{...state.reading}, sectionNotes:{...state.sectionNotes}, highlights:[...(state.highlights ?? [])],
    orphanedAnnotations:[...(state.orphanedAnnotations ?? [])], archivedReadings:{...state.archivedReadings},
    archivedReadingHistory:{...state.archivedReadingHistory}, markdownCourseVersions:{...state.markdownCourseVersions},
  };
  for (const lesson of changed) {
    const id=lesson.chapterId;
    if (!['kum-08','kum-09'].includes(id) || !lesson.version) throw new Error('Migration Markdown hors périmètre.');
    const current=next.reading[id], previous=next.archivedReadings![id];
    if (current) {
      if(previous)next.archivedReadingHistory![id]=[...(next.archivedReadingHistory![id]??[]),previous];
      next.archivedReadings![id]=current;
      delete next.reading[id];
    }
    for(const [key,text] of Object.entries(next.sectionNotes!)) {
      if(!key.startsWith(`${id}:`))continue;
      // Archive even stable IDs when the content hash changes: their text may have changed.
      if(text.trim())next.orphanedAnnotations!.push({id:`md:${lesson.version}:note:${key}`,chapterId:id,kind:'note',previousSectionId:key.slice(id.length+1),text});
      delete next.sectionNotes![key];
    }
    for(const mark of next.highlights!.filter(h=>h.chapterId===id))next.orphanedAnnotations!.push({
      id:`md:${lesson.version}:highlight:${mark.id}`,chapterId:id,kind:'highlight',previousSectionId:mark.sectionId,
      text:mark.text,language:mark.language,color:mark.color,
    });
    next.highlights=next.highlights!.filter(h=>h.chapterId!==id);
    next.markdownCourseVersions![id]=lesson.version;
  }
  // Attempts (including answer snapshots), personal cards, errors, favorites and other chapters retain their original values.
  return next;
}
