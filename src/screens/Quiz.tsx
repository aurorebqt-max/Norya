import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Chip, Button, Progress, s } from '../components/ui';
import { useLearning } from '../state/LearningProvider';
import { usePreparation } from '../state/PreparationProvider';
import { examChapters } from '../data/rezidentiat2026';
import { examRules } from '../data/examRules';
import { scoreRomanianQuestion } from '../domain/learning/examScoring';
import { addDays } from '../domain/preparation/dates';
import { listPublishedQcm, type NoryaQcm } from '../services/cloud/qcmBank';
import type { Attempt, PracticeSession } from '../domain/learning/types';

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeCloudAttempt(q: NoryaQcm, selected: number[], scoring: Attempt['scoring'], on: string, id: string): Attempt {
  const correctAnswers = q.choices.map((choice, index) => choice.correct ? index : -1).filter(index => index >= 0);
  const exact = correctAnswers.length === selected.length && correctAnswers.every(index => selected.includes(index));
  const scored = scoring === 'romanian-draft' && q.choices.length === 5
    ? scoreRomanianQuestion(correctAnswers.length === 1 ? 'single' : 'multiple', correctAnswers, selected, 5)
    : { correct: exact, score: exact ? 1 : 0, maxScore: 1 };
  const chapterId = q.courseReference?.chapterId || q.chapterIds[0] || '';
  return {
    id,
    questionId: q.id,
    chapterId,
    on,
    selected: [...selected],
    correctAnswers,
    correct: scored.correct,
    score: scored.score,
    maxScore: scored.maxScore,
    scoring,
    elapsedSeconds: 0,
    nextReviewOn: addDays(on, scored.correct ? 7 : 1),
    snapshot: {
      prompt: q.stem,
      choices: q.choices.map(choice => choice.text),
      explanation: q.explanation || '',
      pages: q.courseReference?.printedPage ? String(q.courseReference.printedPage) : '',
      version: 'supabase-v1',
      notion: q.courseReference?.scopeTitle,
      sectionIndex: q.courseReference?.scopeIndex,
    },
  };
}

export default function Quiz() {
  const params = useLocalSearchParams<{ chapter?: string; filter?: string; questionId?: string }>();
  const { learning, commit } = useLearning();
  const { today } = usePreparation();
  const [questions, setQuestions] = useState<NoryaQcm[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState(params.chapter ?? 'Tous');
  const [book, setBook] = useState('Tous');
  const [filter, setFilter] = useState(params.filter ?? 'Toutes');
  const [scoring, setScoring] = useState<Attempt['scoring']>('romanian-draft');
  const [mix, setMix] = useState(true);
  const [session, setSession] = useState<NoryaQcm[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<Attempt | null>(null);
  const [results, setResults] = useState<Attempt[]>([]);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const attemptId = useRef('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    listPublishedQcm().then(rows => { if (active) setQuestions(rows); }).catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const available = useMemo(() => questions.filter(q => {
    const chapterId = q.courseReference?.chapterId || q.chapterIds[0];
    const chapterMeta = examChapters.find(item => item.id === chapterId);
    if (params.questionId && q.id !== params.questionId) return false;
    if (chapter !== 'Tous' && chapterId !== chapter) return false;
    if (book !== 'Tous' && chapterMeta?.bookId !== book) return false;
    if (filter === 'Jamais faites' && learning.attempts.some(a => a.questionId === q.id)) return false;
    if (filter === 'Déjà ratées' && !learning.attempts.some(a => a.questionId === q.id && !a.correct)) return false;
    return true;
  }), [questions, params.questionId, chapter, book, filter, learning.attempts]);

  const question = session?.[index];

  useEffect(() => {
    const saved = learning.practiceSession;
    if (!saved || !questions.length || session) return;
    const list = saved.questionIds.map(id => questions.find(q => q.id === id)).filter((q): q is NoryaQcm => !!q);
    if (list.length !== saved.questionIds.length) return;
    if (params.chapter && list.some(q => !(q.chapterIds.includes(params.chapter!) || q.courseReference?.chapterId === params.chapter))) return;
    setSession(list);
    setIndex(Math.min(saved.index, list.length - 1));
    setSelected(saved.selected);
    setResult(saved.attemptId ? learning.attempts.find(a => a.id === saved.attemptId) ?? null : null);
    setResults(saved.attemptIds?.map(id => learning.attempts.find(a => a.id === id)).filter((a): a is Attempt => !!a) ?? []);
    attemptId.current = saved.attemptId ?? '';
  }, [questions, learning.practiceSession, learning.attempts, params.chapter, session]);

  async function start() {
    const list = (mix ? shuffle(available) : [...available]).slice(0, 200);
    if (!list.length) return;
    const saved: PracticeSession = { questionIds: list.map(q => q.id), index: 0, selected: [], attemptIds: [] };
    try {
      await commit({ type: 'practice-session', value: saved });
      setSession(list); setIndex(0); setSelected([]); setResult(null); setResults([]); setFinished(false); attemptId.current = '';
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de sauvegarder la séance.'); }
  }

  function selectChoice(choiceIndex: number) {
    if (!question || result) return;
    const correctCount = question.choices.filter(choice => choice.correct).length;
    const value = correctCount === 1 ? [choiceIndex] : selected.includes(choiceIndex) ? selected.filter(n => n !== choiceIndex) : [...selected, choiceIndex];
    setSelected(value);
    if (session) void commit({ type: 'practice-session', value: { questionIds: session.map(q => q.id), index, selected: value, attemptIds: results.map(a => a.id) } }).catch(() => {});
  }

  async function submit() {
    if (!question || result || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    if (!attemptId.current) attemptId.current = `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const attempt = makeCloudAttempt(question, selected, scoring, today, attemptId.current);
    try {
      await commit({ type: 'attempt', attempt });
      const attemptIds = [...new Set([...results.map(value => value.id), attempt.id])];
      await commit({ type: 'practice-session', value: { questionIds: session!.map(q => q.id), index, selected, attemptId: attempt.id, attemptIds } });
      setResult(attempt); setResults(prev => [...prev, attempt]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Sauvegarde impossible.'); }
    finally { lock.current = false; setBusy(false); }
  }

  const goNext = () => {
    if (!session) return;
    if (index + 1 === session.length) { setFinished(true); void commit({ type: 'practice-session' }); return; }
    const next = index + 1;
    setIndex(next); setSelected([]); setResult(null); attemptId.current = '';
    void commit({ type: 'practice-session', value: { questionIds: session.map(q => q.id), index: next, selected: [], attemptIds: results.map(a => a.id) } });
  };

  return <Screen title="Entraînement Rezidențiat" subtitle="Questions publiées depuis la banque Supabase" back>
    {loading && <Card><Txt>Chargement de la banque de QCM…</Txt></Card>}
    {!!error && <Card><Txt>{error}</Txt></Card>}
    {!loading && !session ? <>
      <Card>
        <Txt bold>Banque d’entraînement</Txt>
        <Txt>{questions.length} question(s) publiées et classées sont disponibles. Les anciens QCM intégrés à l’application ne sont plus utilisés.</Txt>
        <Txt size={12}>Une séance générale tire au hasard jusqu’à 200 questions. La répartition officielle par chapitre pourra être ajoutée plus tard.</Txt>
      </Card>
      <Card style={{ gap: 10 }}>
        <Txt bold>Choisir mes questions</Txt>
        <View style={s.wrap}>{['Tous', 'kumar', 'lawrence', 'sinopsis'].map(value => <Chip key={value} label={value} selected={book === value} onPress={() => { setBook(value); setChapter('Tous'); }} />)}</View>
        <View style={s.wrap}><Chip label="Tous les chapitres" selected={chapter === 'Tous'} onPress={() => setChapter('Tous')} />{examChapters.map(item => <Chip key={item.id} label={item.chapter} selected={chapter === item.id} onPress={() => { setChapter(item.id); setBook('Tous'); }} />)}</View>
        <View style={s.wrap}>{['Toutes', 'Déjà ratées', 'Jamais faites'].map(value => <Chip key={value} label={value} selected={filter === value} onPress={() => setFilter(value)} />)}</View>
        <Chip label="Ordre mélangé" selected={mix} onPress={() => setMix(!mix)} />
        <Txt>{available.length} question(s) correspondent à ce filtre.</Txt>
        <Button title={available.length > 200 ? 'Commencer une séance de 200 questions' : 'Commencer la séance'} disabled={!available.length} onPress={() => void start()} />
      </Card>
    </> : finished && session ? <Card>
      <Txt bold>Séance terminée</Txt>
      <Txt>{results.filter(item => item.correct).length}/{session.length} réponses entièrement correctes.</Txt>
      <Button title="Carnet d’erreurs" onPress={() => router.push('/errors')} />
      <Button title="Nouvelle séance" secondary onPress={() => { setSession(null); setFinished(false); void commit({ type: 'practice-session' }); }} />
    </Card> : question && session ? <>
      <View style={s.between}><Txt>{index + 1}/{session.length} · {question.choices.filter(choice => choice.correct).length > 1 ? 'Complément multiple' : 'Complément simple'}</Txt><Button title="Mettre en pause" secondary onPress={() => setSession(null)} /></View>
      <Progress value={(index / session.length) * 100} />
      <Card style={{ gap: 10 }}>
        <Txt size={12}>{examChapters.find(ch => ch.id === (question.courseReference?.chapterId || question.chapterIds[0]))?.chapter}</Txt>
        <Txt bold size={20}>{question.stem}</Txt>
        {question.choices.map((choice, choiceIndex) => <Chip key={choice.id} label={`${choice.id}. ${choice.text}`} selected={selected.includes(choiceIndex)} onPress={() => selectChoice(choiceIndex)} />)}
        {!result ? <Button title="Valider ma réponse" disabled={busy || !selected.length} onPress={() => void submit()} /> : <>
          <Txt bold>{result.correct ? 'Réponse correcte' : 'À revoir'} · {result.score}/{result.maxScore}</Txt>
          {question.choices.map((choice, choiceIndex) => <Txt key={choice.id}>{choice.id} · {result.correctAnswers.includes(choiceIndex) ? 'Bonne réponse' : 'Faux'}</Txt>)}
          {!!question.explanation && <Txt>{question.explanation}</Txt>}
          {(question.courseReference || question.chapterIds[0]) && <Button title="Voir le passage dans le cours" secondary onPress={() => router.push({ pathname: '/chapter', params: { id: question.courseReference?.chapterId || question.chapterIds[0], ...(question.courseReference?.printedPage ? { page: String(question.courseReference.printedPage) } : {}), ...(question.courseReference?.blockId ? { blockId: question.courseReference.blockId } : {}) } })} />}
          <Button title={index + 1 === session.length ? 'Terminer' : 'Question suivante'} onPress={goNext} />
        </>}
      </Card>
    </> : null}
    <Card><Txt size={12}>{examRules.questions} questions composent l’épreuve de référence. La sélection par pourcentage de chapitre sera configurée séparément quand la règle de répartition sera définie.</Txt></Card>
  </Screen>;
}
