import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Txt, Chip, Button, s } from '../components/ui';
import { useLearning } from '../state/LearningProvider';
import { useDemo } from '../state/DemoProvider';
import { latestAttempts } from '../domain/learning/store';
import { documentaryMap } from '../data/documentation';

type ErrorGroup = {
  id: string;
  chapterId: string;
  notion: string;
  attempts: ReturnType<typeof latestAttempts>;
  latest: ReturnType<typeof latestAttempts>[number];
  latestFailure: ReturnType<typeof latestAttempts>[number];
};

export default function Errors() {
  const { learning } = useLearning();
  const { practiceErrors } = useDemo();
  const [filter, setFilter] = useState('À revoir');
  const groups = useMemo(() => {
    const all = new Map<string, ErrorGroup>();
    const failedIds = new Set(learning.attempts.filter(attempt => !attempt.correct).map(attempt => attempt.questionId));
    for (const attempt of learning.attempts) {
      if (!failedIds.has(attempt.questionId)) continue;
      const notion = attempt.snapshot.notion?.trim() || attempt.snapshot.prompt.split('\n')[0];
      const id = `${attempt.chapterId}:${notion}`;
      const group = all.get(id);
      if (group) {
        group.attempts.push(attempt);
        group.latest = attempt;
        if (!attempt.correct) group.latestFailure = attempt;
      } else if (!attempt.correct) {
        all.set(id, { id, chapterId: attempt.chapterId, notion, attempts: [attempt], latest: attempt, latestFailure: attempt });
      } else {
        all.set(id, { id, chapterId: attempt.chapterId, notion, attempts: [attempt], latest: attempt, latestFailure: attempt });
      }
    }
    const recentByQuestion = latestAttempts(learning)
      .sort((a, b) => learning.attempts.indexOf(a) - learning.attempts.indexOf(b));
    for (const group of all.values()) {
      group.attempts = learning.attempts.filter(attempt =>
        attempt.chapterId === group.chapterId &&
        (attempt.snapshot.notion?.trim() || attempt.snapshot.prompt.split('\n')[0]) === group.notion
      );
      group.latest = group.attempts.at(-1)!;
      group.latestFailure = [...group.attempts].reverse().find(attempt => !attempt.correct)!;
    }
    const latestByNotion = new Map<string, boolean>();
    for (const attempt of recentByQuestion) {
      const notion = attempt.snapshot.notion?.trim() || attempt.snapshot.prompt.split('\n')[0];
      latestByNotion.set(`${attempt.chapterId}:${notion}`, attempt.correct);
    }
    return [...all.values()]
      .map(group => {
        const saved=learning.errorCards.find(card=>card.id===group.id);
        return {...group,corrected:latestByNotion.get(group.id)??false,nextReviewOn:saved?.nextReviewOn??group.latest.nextReviewOn};
      })
      .sort((a, b) => b.latest.on.localeCompare(a.latest.on));
  }, [learning]);
  const visible = groups.filter(group => filter === 'Tout' || (filter === 'Réponse correcte' ? group.corrected : !group.corrected));

  return <Screen title="Mes erreurs" subtitle="Mini-fiches personnelles dédupliquées par notion · tentatives et échéances conservées" back>
    <View style={s.wrap}>{['À revoir', 'Réponse correcte', 'Tout'].map(value =>
      <Chip key={value} label={value} selected={value === filter} onPress={() => setFilter(value)} />
    )}</View>
    {!visible.length && <Card>
      <Txt>Aucune erreur dans ce filtre. Les erreurs de QCM alimenteront ce deck automatiquement.</Txt>
      <Button title="M’entraîner" onPress={() => router.push('/quiz')} />
    </Card>}
    {visible.map(group => {
      const failed = group.latestFailure;
      const chapter = documentaryMap.find(value => value.id === group.chapterId);
      const wrongAnswer = failed.selected.map(index => `${String.fromCharCode(65 + index)} · ${failed.snapshot.choices[index]}`).join('\n') || 'Aucune réponse sélectionnée';
      const correctAnswer = failed.correctAnswers.map(index => `${String.fromCharCode(65 + index)} · ${failed.snapshot.choices[index]}`).join('\n');
      return <Card key={group.id}>
        <View style={s.between}>
          <Txt bold size={19}>{group.notion}</Txt>
          <Chip label={group.corrected ? 'Réponse correcte · vérification en attente' : 'À revoir'} selected={!group.corrected} />
        </View>
        <Txt size={12}>{chapter?.chapter ?? group.chapterId} · {failed.snapshot.sectionIndex === undefined ? 'partie non précisée' : `partie ${failed.snapshot.sectionIndex + 1}`} · prochaine révision : {group.nextReviewOn}</Txt>
        <Txt bold>{failed.snapshot.prompt}</Txt>
        <Txt>Réponse donnée : {wrongAnswer}</Txt>
        <Txt>Clé du QCM Norya (non officielle, vérification en attente) : {correctAnswer}</Txt>
        <Txt size={12}>Fiche en attente de vérification médicale : Norya conserve la question et vos choix sans inventer un rappel médical. {failed.snapshot.explanation}</Txt>
        <Txt size={12}>Référence déclarée : Kumar RO 2021, p. {failed.snapshot.pages}. La fiche est reliée au chapitre ; sa révision éditoriale reste requise.</Txt>
        <Txt size={12}>Historique de la notion : {group.attempts.map(attempt => `${attempt.on} · ${attempt.correct ? 'correct' : 'erreur'} · ${attempt.score}/${attempt.maxScore}`).join(' ; ')}</Txt>
        <Button title="Revoir la partie du cours" onPress={() => router.push({
          pathname: '/chapter',
          params: { id: group.chapterId, ...(failed.snapshot.sectionId ? { sectionId: failed.snapshot.sectionId } : failed.snapshot.sectionIndex === undefined ? {} : { section: String(failed.snapshot.sectionIndex) }) },
        })} />
        <Button title="Réviser cette erreur" secondary onPress={() => router.push({ pathname: '/quiz', params: { chapter: group.chapterId, questionId: failed.questionId } })} />
      </Card>;
    })}
    {!!practiceErrors.length && <Card>
      <Txt>{practiceErrors.length} erreurs d’exercices historiques conservées. Aucune réponse ni date de révision n’ayant été sauvegardée, elles ne sont pas transformées en mini-fiches.</Txt>
      <Button title="Anciens exercices" secondary onPress={() => router.push('/training')} />
    </Card>}
  </Screen>;
}
