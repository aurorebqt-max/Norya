import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useLearning } from '../state/LearningProvider';
import { passProgress } from '../domain/preparation/passes';
import { usePreparation } from '../state/PreparationProvider';
import { documentaryMap } from '../data/documentation';
import { ReadingAction } from './CourseReadingTools';
import { Txt } from './ui';
import type { CourseStructure } from '../domain/sourceCourse/courseStructure';

export function CourseReadingProgress({ chapterId, structure, index, next }: {
  chapterId: string; structure: CourseStructure; index: number; next: (index: number) => void;
}) {
  const { learning, commit } = useLearning();
  const { record, today, state, plan, profile } = usePreparation();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const reading = learning.reading[chapterId];
  const sections = structure.sections;
  const catalog = documentaryMap.find(c => c.id === chapterId)?.lesson;
  // Preserve existing numeric progress by retaining its section order. New source H2s
  // receive stable indices instead of replacing the catalog's existing positions.
  const sectionIds = [...new Set([...(reading?.sectionIds ?? catalog?.sections.map((s, i) => s.id ?? `section-${i}`) ?? []), ...sections.map(s => s.id)])];
  const keys = [...new Set([...(reading?.sourceSections ?? []), ...(reading?.readSections ?? []).flatMap(i => sectionIds[i] ? [sectionIds[i]] : [])])];
  const [pass] = useState(() => reading?.courseCompletedPass ?? (passProgress(state.progress[chapterId], 1).completedOn ? 1 :
    plan.passes.find(p => p.completed < p.total)?.number ?? profile.targetPasses ?? 2));
  const alreadyCompleted = !!reading?.courseCompleted || !!passProgress(state.progress[chapterId], pass).completedOn;
  async function complete() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const done = [...new Set([...keys, ...sections.map(s => s.id)])];
      // Stable event ID makes retries safe if one of the two stores fails.
      if (!alreadyCompleted) await record({ id: `course-finished-${chapterId}-${pass}`, objectiveId: chapterId, kind: 'pass', pass,
        minutes: 1, completed: true, source: 'self' });
      if (!reading?.courseCompleted) await commit({ type: 'reading', id: chapterId, value: {
        ...(reading ?? { section: 0, readSections: [], language: 'RO' as const, mode: 'Complet' as const }),
        sectionIds,
        readSections: [...new Set([...(reading?.readSections ?? []), ...done.map(id => sectionIds.indexOf(id)).filter(i => i >= 0)])],
        completedByPass: { ...reading?.completedByPass, [pass]: [...new Set([...(reading?.completedByPass?.[pass] ?? []), ...done.map(id => sectionIds.indexOf(id)).filter(i => i >= 0)])] },
        section: Math.max(0, sectionIds.indexOf(sections[Math.min(index + 1, sections.length - 1)]?.id)),
        courseCompletedPass: pass,
        sourceSections: done, sourceSection: sections[Math.min(index + 1, sections.length - 1)]?.id,
        courseCompleted: true, updatedOn: today,
      } });
      {
        const questions = documentaryMap.find(c => c.id === chapterId)?.lesson?.questions;
        if (questions?.length) router.push({ pathname: '/quiz', params: { chapter: chapterId } });
        else setMessage('QCM bientôt disponibles');
      }
    } catch (e) { setMessage(String(e)); } finally { lock.current = false; setBusy(false); }
  }
  if (!sections.length || index !== sections.length - 1) return null;
  return <View style={{ gap: 4, paddingVertical: 20 }}>
    <ReadingAction label="Terminer le chapitre et passer aux QCM" disabled={busy} onPress={() => void complete()} />
    {!!message && <Txt size={12}>{message}</Txt>}
  </View>;
}
