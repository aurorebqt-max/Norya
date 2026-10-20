import { CatalogCourseReader } from '../components/CatalogCourseReader';
import { loadPrivateCourse } from '../services/storage/privateCourse';
import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Screen, Card, Txt, Chip, Button, Progress, s } from '../components/ui';
import { BilingualText } from '../components/BilingualText';
import { ChapterAudio } from '../components/ChapterAudio';
import { documentaryMap } from '../data/documentation';
import { romanianFlashcards } from '../data/romanianLessons';
import { glossary } from '../data/glossary';
import { estimateLesson } from '../domain/learning/estimate';
import { revisionTables } from '../data/revisionTables';
import { RevisionTable } from '../components/RevisionTable';
import { CourseWorkspace } from '../components/CourseWorkspace';
import { RevisionCardsViewer } from '../components/RevisionCardsViewer';
import { loadFinalCourse } from '../domain/sourceCourse/finalizedStorage';
import type { CourseStructure } from '../domain/sourceCourse/courseStructure';
import { readingTime, type FinalCourseArchive } from '../domain/sourceCourse/finalization';
import { MarkdownCourseContent } from '../components/MarkdownCourseContent';
import { passProgress } from '../domain/preparation/passes';
import { usePreparation } from '../state/PreparationProvider';
import { useDemo } from '../state/DemoProvider';
import { useLearning } from '../state/LearningProvider';
import type { Language, Reading } from '../domain/learning/types';
import { colors as c } from '../design/theme';

type ChapterMode = 'COURS SOURCE' | 'COURS COMPLET' | 'FICHES' | 'FLASHCARDS';

export default function Chapter() {
  const { id, section: requestedSection, sectionId: requestedSectionId } = useLocalSearchParams<{ id: string; section?: string; sectionId?: string }>();
  const [finalArchive, setFinalArchive] = useState<FinalCourseArchive | null>();
  const [hasPrivate, setHasPrivate] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true; setFinalArchive(undefined); setArchiveError('');
    loadPrivateCourse(id).then(p => { if (active) { setHasPrivate(!!p); if (p) setMode('COURS SOURCE'); } }).catch(e => { if (active) setArchiveError(String(e)); });
    loadFinalCourse(id).then(a => {
      if (!active) return;
      setFinalArchive(a);
      if (a) setMode('COURS SOURCE');
    })
      .catch(e => { if (active) setArchiveError(String(e)); });
    return () => { active = false; };
  }, [id]));
  const source = documentaryMap.find(chapter => chapter.id === id);
  const lesson = source?.lesson;
  const { state, today, record, plan, profile } = usePreparation();
  const { addCards } = useDemo();
  const { learning, commit, reattachAnnotation } = useLearning();
  const savedReading = learning.reading[id];
  const stableSectionTarget = lesson?.sections.findIndex(part => part.id === requestedSectionId) ?? -1;
  const sectionTarget = stableSectionTarget >= 0 ? stableSectionTarget : Number(requestedSection);
  const requestedIsValid = (requestedSectionId !== undefined && stableSectionTarget >= 0)
    || (requestedSection !== undefined && Number.isInteger(sectionTarget) && sectionTarget >= 0 && sectionTarget < (lesson?.sections.length ?? 0));
  const initial: Reading = savedReading
    ? { ...savedReading, ...(requestedIsValid ? { section: sectionTarget } : {}) }
    : { section: requestedIsValid ? sectionTarget : 0, readSections: [], language: 'RO', mode: 'Complet', updatedOn: today };
  const [reading, setReading] = useState<Reading>(initial);
  const [mode, setMode] = useState<ChapterMode>('COURS SOURCE');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const [sectionNotesDraft, setSectionNotesDraft] = useState<Record<string, string>>({});
  const [selectedPassage, setSelectedPassage] = useState<{ blockId: string; start: number; end: number; text: string } | null>(null);
  const [highlightPaletteOpen, setHighlightPaletteOpen] = useState(false);
  const noteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lock = useRef(false);
  const showSourceWorkspace = true;
  if (archiveError) return <Screen title="Cours" back><Txt>{archiveError}</Txt></Screen>;
  // Chapitre hors catalogue documentaire : n'afficher que l'archive finalisée, sans masquer
  // fiches/flashcards des chapitres qui en ont déjà.
  if (!source) {
    if (finalArchive === undefined) return <Screen title="Cours" back><Txt>Chargement…</Txt></Screen>;
    return <Screen title={id} back>
      <View style={s.wrap}><Chip label="Cours" selected={mode !== 'FICHES'} onPress={() => setMode('COURS SOURCE')} /><Chip label="Fiches" selected={mode === 'FICHES'} onPress={() => setMode('FICHES')} /></View>
      {mode === 'FICHES' ? <RevisionCardsViewer key={id} chapterId={id} archive={finalArchive ?? null} structure={structure} /> : <CourseWorkspace key={id} chapterId={id} onArchiveChange={setFinalArchive} onStructure={setStructure} />}
    </Screen>;
  }

  const sectionCount = lesson?.sections.length ?? 0;
  const index = Math.min(reading.section, Math.max(0, sectionCount - 1));
  const section = lesson?.sections[index];
  const cards = romanianFlashcards.filter(card => card.objectiveId === id);
  const activePass = plan.passes.find(pass => pass.completed < pass.total)?.number ?? (profile.targetPasses ?? 2);
  const completedThisPass = reading.completedByPass?.[activePass] ?? [];
  const sectionQuestions = lesson?.questions.filter(question => question.sectionIndex === index) ?? [];
  const selectedTerm = glossary.find(value => value.id === term);
  const estimate = lesson ? estimateLesson(lesson) : null;
  const sectionTables = section ? revisionTables[section.id ?? ''] ?? [] : [];
  const sectionNoteKey = section?.id ? `${id}:${section.id}` : '';
  const sectionNote = sectionNoteKey
    ? sectionNotesDraft[sectionNoteKey] ?? learning.sectionNotes?.[sectionNoteKey] ?? ''
    : '';
  const displayLanguage: 'RO' | 'FR' = reading.language === 'FR' ? 'FR' : 'RO';
  const hasFrench = !!lesson?.title.fr && lesson.sections.every(part => !!part.text.fr && !!part.express.fr);
  const displayText = section ? (displayLanguage === 'FR' ? section.text.fr : section.text.ro) : '';
  const activeHighlights = (learning.highlights ?? []).filter(value =>
    value.chapterId === id && value.sectionId === section?.id && value.language === displayLanguage,
  );
  const currentPass = passProgress(state.progress[id], activePass);
  const sectionDone = completedThisPass.includes(index);
  const allPartsDone = !!lesson?.sections.every((_, partIndex) => completedThisPass.includes(partIndex));
  const progress = sectionCount ? reading.readSections.length / sectionCount * 100 : 0;

  async function save(action: () => Promise<void>, success = 'Enregistré.') {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sauvegarde impossible.');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  function remember(patch: Partial<Reading>) {
    const value = { ...reading, ...patch, updatedOn: today };
    void save(async () => {
      await commit({ type: 'reading', id, value });
      setReading(value);
    }, 'Lecture enregistrée.');
  }

  const highlightColors = {
    yellow: '#FFF0A8',
    green: '#DFF2CF',
    pink: '#F9DCE7',
    blue: '#DDEBFA',
  } as const;

  function selectPassage(paragraph: string, paragraphIndex: number, selection = paragraph) {
    const text = selection.trim();
    const start = paragraph.indexOf(text);
    if (!text || start < 0 || !section?.id) return;
    setSelectedPassage({ blockId: `${section.id}:p${paragraphIndex}`, start, end: start + text.length, text });
    setHighlightPaletteOpen(true);
  }

  function selectWebPassage() {
    const nativeSelection = typeof window !== 'undefined' ? window.getSelection() : null;
    const range = nativeSelection?.rangeCount ? nativeSelection.getRangeAt(0) : null;
    const selection = nativeSelection?.toString().trim() ?? '';
    if (!selection || !section || !range) {
      setMessage('Sélectionne d’abord un passage du cours.');
      return;
    }
    const anchorElement = range.startContainer.nodeType === 1
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    const block = anchorElement?.closest('[id^="norya-course-"]');
    const blockIndex = block?.id.match(/-p(\d+)$/);
    if (!block || !blockIndex) {
      setMessage('La sélection doit rester dans un seul paragraphe.');
      return;
    }
    const paragraphIndex = Number(blockIndex[1]);
    const paragraph = block.textContent ?? '';
    const prefix = document.createRange();
    prefix.selectNodeContents(block);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    if (paragraph.slice(start, start + selection.length) === selection) {
      setSelectedPassage({ blockId: `${section.id}:p${paragraphIndex}`, start, end: start + selection.length, text: selection });
      setHighlightPaletteOpen(true);
      return;
    }
    selectPassage(paragraph, paragraphIndex, selection);
  }

  function renderPassage(paragraph: string, paragraphIndex: number) {
    const blockId = `${section?.id}:p${paragraphIndex}`;
    const marks = activeHighlights.flatMap(highlight => {
      if (highlight.blockId && highlight.blockId !== blockId) return [];
      const start = highlight.start !== undefined && paragraph.slice(highlight.start, highlight.end) === highlight.text
        ? highlight.start
        : paragraph.indexOf(highlight.text);
      return start < 0 ? [] : [{ start, end: start + highlight.text.length, highlight }];
    });
    const terms = glossary.filter(value => value.chapterId === id).flatMap(value => {
      const word = displayLanguage === 'RO' ? value.ro : value.fr;
      const start = paragraph.indexOf(word);
      const before = start > 0 ? paragraph[start - 1] : '';
      const after = start >= 0 ? paragraph[start + word.length] ?? '' : '';
      const isLetter = (character: string) => !!character && /[\p{L}\p{M}]/u.test(character);
      return start < 0 || isLetter(before) || isLetter(after) ? [] : [{ start, end: start + word.length, term: value }];
    });
    const tokens = [...marks.map(value => ({ ...value, kind: 'mark' as const })), ...terms.map(value => ({ ...value, kind: 'term' as const }))]
      .sort((a, b) => a.start - b.start || (a.kind === 'mark' ? -1 : 1));
    const pieces: ReactNode[] = [];
    let cursor = 0;
    for (const token of tokens) {
      if (token.start < cursor) continue;
      if (token.start > cursor) pieces.push(paragraph.slice(cursor, token.start));
      const content = paragraph.slice(token.start, token.end);
      if (token.kind === 'mark') {
        pieces.push(<Text key={token.highlight.id} onPress={() => void commit({ type: 'highlight', value: token.highlight, enabled: false })}
          accessibilityRole="button" accessibilityLabel="Retirer ce surlignage"
          style={{ backgroundColor: highlightColors[token.highlight.color ?? 'yellow'] }}>{content}</Text>);
      } else {
        pieces.push(<Text key={token.term.id} onPress={() => setTerm(term === token.term.id ? null : token.term.id)}
          style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: c.primary }}>{content}</Text>);
      }
      cursor = token.end;
    }
    if (cursor < paragraph.length) pieces.push(paragraph.slice(cursor));
    return <Text selectable onLongPress={Platform.OS === 'web' ? undefined : () => selectPassage(paragraph, paragraphIndex)}
      style={{ color: c.ink, fontSize: 16, lineHeight: 27 }}>{pieces}</Text>;
  }

  function saveSectionNote(value: string) {
    if (!sectionNoteKey) return;
    setSectionNotesDraft(current => ({ ...current, [sectionNoteKey]: value }));
    const existing = noteTimers.current.get(sectionNoteKey);
    if (existing) clearTimeout(existing);
    const key = sectionNoteKey;
    const timer = setTimeout(() => {
      noteTimers.current.delete(key);
      void commit({ type: 'section-note', id: key, text: value })
        .then(() => setMessage('Note de partie enregistrée.'))
        .catch(error => setMessage(error instanceof Error ? error.message : 'Enregistrement de la note impossible.'));
    }, 450);
    noteTimers.current.set(key, timer);
  }

  function flushSectionNote(value: string) {
    if (!sectionNoteKey) return;
    const pending = noteTimers.current.get(sectionNoteKey);
    if (pending) clearTimeout(pending);
    noteTimers.current.delete(sectionNoteKey);
    void commit({ type: 'section-note', id: sectionNoteKey, text: value })
      .then(() => setMessage('Note de partie enregistrée.'))
      .catch(error => setMessage(error instanceof Error ? error.message : 'Enregistrement de la note impossible.'));
  }

  function addHighlight(color: keyof typeof highlightColors) {
    if (!section?.id || !selectedPassage) return;
    const { blockId, start, end, text } = selectedPassage;
    const value = {
      id: `${id}:${section.id}:${displayLanguage}:${blockId}:${start}:${end}`,
      chapterId: id, sectionId: section.id, language: displayLanguage, text, blockId, start, end, color,
    };
    void save(async () => {
      await commit({ type: 'highlight', value, enabled: true });
      setSelectedPassage(null);
      setHighlightPaletteOpen(false);
      if (Platform.OS === 'web') window.getSelection()?.removeAllRanges();
    }, 'Surlignage enregistré.');
  }

  async function finishSection() {
    if (!lesson || !section || sectionDone || !estimate) return;
    const completedByPass = {
      ...reading.completedByPass,
      [activePass]: [...new Set([...completedThisPass, index])],
    };
    const allPartsDone = lesson.sections.every((_, partIndex) => completedByPass[activePass].includes(partIndex));
    const value: Reading = {
      ...reading,
      section: Math.min(index + 1, lesson.sections.length - 1),
      readSections: [...new Set([...reading.readSections, index])],
      completedByPass,
      updatedOn: today,
    };
    await save(async () => {
      await record({
        id: `reading-${id}-${activePass}-${section.id}`,
        objectiveId: id,
        kind: 'pass',
        pass: activePass,
        minutes: Math.max(1, Math.ceil(estimate.sectionReadingMinutes[index] * (activePass === 1 ? 1 : activePass === 2 ? 0.65 : 0.4))),
        completed: allPartsDone,
        source: 'self',
      });
      await commit({ type: 'reading', id, value });
      await addCards(cards.filter(card => card.sectionId === section.id).map(card => card.id));
      setReading(value);
    }, allPartsDone ? `Tour ${activePass} terminé pour ce chapitre. Le calendrier et les rappels sont actualisés.` : 'Partie terminée. Progression, calendrier et flashcards actualisés.');
  }

  const finalVersion = finalArchive?.status === 'finalized' ? finalArchive.versions.find(v => v.version === finalArchive.activeVersion) : undefined;
  const finalReading = finalVersion ? (finalVersion.reading ?? readingTime(finalVersion.presentations)) : undefined;
  const chapterNumber = /(\d+)$/.exec(id)?.[1];
  const headerSubtitle = [
    `${source.book.title} · ${source.book.edition} · ${source.book.year}`,
    structure?.authors.length ? structure.authors.join('\n') : '',
    finalReading ? `Lecture estimée : ${finalReading.minutes} min` : '',
  ].filter(Boolean).join('\n');
  return <Screen title={structure?.title ?? source.chapter} subtitle={headerSubtitle} eyebrow={chapterNumber ? `CHAPITRE ${chapterNumber}` : undefined} back>
    {mode !== 'COURS SOURCE' && lesson?.verification === 'beta' && <Card style={{ borderLeftWidth: 4, borderLeftColor: c.primary }}>
      <Txt bold size={13} color={c.primary}>Version bêta — vérification en cours</Txt>
      <Txt size={12}>Cours documenté à partir des pages indiquées, mais non intégralement vérifié. Les passages incertains sont signalés « De verificat / À vérifier ». Les traitements du manuel 2021 sont historiques et ne constituent pas des recommandations cliniques actuelles.</Txt>
    </Card>}
    {mode === 'FICHES' && !showSourceWorkspace && <Card>
      <View style={s.between}>
        <Txt bold>Progression de lecture</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={learning.favorites.includes(id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onPress={() => void save(() => commit({ type: 'favorite', id }))}>
          <Txt size={20} color={c.primary}>{learning.favorites.includes(id) ? '★' : '☆'}</Txt>
        </Pressable>
      </View>
      <Progress value={progress} />
      <View style={s.between}>
        <Txt size={12}>{reading.readSections.length}/{sectionCount} parties</Txt>
        <Txt size={11} color={c.muted}>{lesson?.verification === 'beta' ? 'Version bêta · couverture documentaire, validation en cours' : lesson ? 'Contenu partiel · non vérifié' : 'Contenu en préparation'}</Txt>
      </View>
    </Card>}
    {id !== 'kum-08' && (learning.archivedReadings?.[id] || learning.archivedReadingHistory?.[id]?.length || learning.orphanedAnnotations?.some(annotation => annotation.chapterId === id)) && <Card>
      <Txt bold>Anciennes données conservées</Txt>
      {!!learning.archivedReadings?.[id] && <Txt size={12}>
        Ancienne reprise de lecture archivée ({learning.archivedReadings[id].readSections.length} parties lues). Elle n’est pas reportée sur le cours reconstruit.
      </Txt>}
      {!!learning.archivedReadingHistory?.[id]?.length && <Txt size={12}>
        {learning.archivedReadingHistory[id].length} reprise(s) de lecture antérieure(s) sont également conservées.
      </Txt>}
      {(learning.orphanedAnnotations ?? []).filter(annotation => annotation.chapterId === id).map(annotation =>
        <View key={annotation.id} style={{ gap: 6 }}>
          <Txt size={12}>{annotation.kind === 'note' ? 'Note' : 'Surlignage'} · ancienne partie « {annotation.previousSectionId} » · à réassocier</Txt>
          <Txt size={12} selectable>{annotation.text}</Txt>
          {section && <Button title={`Associer à « ${section.title.ro} »`} secondary disabled={busy}
            onPress={() => void save(() => reattachAnnotation(annotation.id, section.id ?? ''), 'Annotation réassociée.')} />}
        </View>
      )}
    </Card>}

    <View style={s.wrap}>
      {((showSourceWorkspace
        ? ['COURS SOURCE', 'FICHES', 'FLASHCARDS']
        : ['COURS COMPLET', 'FICHES', 'FLASHCARDS']) as ChapterMode[]).map(choice =>
        <Chip key={choice} label={choice === 'COURS SOURCE' || choice === 'COURS COMPLET' ? 'COURS' : choice} selected={mode === choice} onPress={() => setMode(choice)} />
      )}
    </View>
    {mode === 'FICHES' && !showSourceWorkspace && lesson && <View style={[s.row, { flexWrap: 'wrap', alignItems: 'center' }]}>
      {hasFrench && <>
        <Button title={displayLanguage === 'RO' ? 'Traduire en français' : 'Retour au roumain'} secondary
          onPress={() => remember({ language: displayLanguage === 'RO' ? 'FR' : 'RO' })} />
      </>}
      <ChapterAudio key={`${id}:${displayLanguage}`} lesson={lesson} language={displayLanguage} />
    </View>}

    {mode === 'FICHES' && showSourceWorkspace ? <RevisionCardsViewer key={id} chapterId={id} archive={finalArchive ?? null} structure={structure} /> : null}
    {mode === 'FICHES' && !showSourceWorkspace && lesson ? (
      <Card>
        <Txt>Générer une fiche à partir du cours finalisé enregistré dans Safari.</Txt>
        <Button title="Ouvrir le cours finalisé" onPress={() => { setReviewOpen(true); setMode('COURS SOURCE'); }} />
      </Card>
    ) : null}

    {reviewOpen && !hasPrivate && !finalArchive && <Pressable accessibilityRole="button" onPress={() => { setReviewOpen(false); setMode('COURS COMPLET'); }}><Txt size={12} color={c.primary}>Revenir au cours disponible</Txt></Pressable>}
    {mode === 'FICHES' ? null : (mode === 'COURS SOURCE' || !lesson && mode === 'COURS COMPLET') && showSourceWorkspace ? <CourseWorkspace chapterId={id} initialReview={reviewOpen} onArchiveChange={setFinalArchive} onStructure={setStructure} /> : mode === 'COURS COMPLET' && lesson ? <CatalogCourseReader key={id} lesson={lesson} onReview={() => { setReviewOpen(true); setMode('COURS SOURCE'); }} /> : mode === 'FLASHCARDS' ? <Card>
      <Txt bold size={21}>Mémoriser les notions du chapitre</Txt>
      <Txt>{cards.length} cartes liées aux cours et fiches. Les cartes sont consultables avant toute validation de partie ; les réponses et échéances restent enregistrées.</Txt>
      <Button title="Commencer les flashcards" disabled={busy || !cards.length} onPress={() => void save(async () => {
        await addCards(cards.map(card => card.id));
        router.push({ pathname: '/flashcards', params: { chapter: id, free: '1' } });
      }, 'Cartes ajoutées au deck sans valider un tour.')} />
      <Txt size={12}>Une carte n’est maîtrisée qu’après une réponse évaluée (Oublié, Difficile, Correct ou Facile).</Txt>
    </Card> : !lesson ? <Card>
      <Txt>Le contenu pédagogique de ce chapitre est en préparation.</Txt>
    </Card> : section && <>
      <Card>
        <View style={s.between}>
          <Txt bold size={21}>{`Partie ${index + 1} sur ${sectionCount}`}</Txt>
          <Txt size={12}>Reprise {index + 1}</Txt>
        </View>
        <Progress value={(index + 1) / sectionCount * 100} />
        <View style={{ gap: 15 }}>
          <BilingualText text={section.title} language={displayLanguage} bold />
          {mode === 'COURS COMPLET'
            ? <MarkdownCourseContent markdown={displayText} title={section.title[displayLanguage.toLowerCase() as 'ro' | 'fr']} renderParagraph={(paragraph, paragraphIndex) =>
                <View key={`${section.id}:${paragraphIndex}`} nativeID={`norya-course-${section.id}-p${paragraphIndex}`} style={{ gap: 5 }}>
                  {renderPassage(paragraph, paragraphIndex)}
                </View>
              } />
            : <View style={{ gap: 10 }}>
              <View style={[s.row, { alignItems: 'flex-start' }]}>
                <Txt bold style={{ width: 128 }}>Repère essentiel</Txt>
                <View style={{ flex: 1 }}><BilingualText text={section.express} language={displayLanguage} /></View>
              </View>
              {lesson.format !== 'markdown' && <View style={[s.row, { alignItems: 'flex-start' }]}>
                <Txt bold style={{ width: 128 }}>À retenir</Txt>
                <View style={{ flex: 1 }}><BilingualText text={section.text} language={displayLanguage} /></View>
              </View>}
            </View>}
        </View>
        {mode === 'COURS COMPLET' && <>
          <View style={s.wrap}>
            <Button title="Surligner la sélection" secondary onPress={() => {
              if (Platform.OS === 'web') selectWebPassage();
              else if (selectedPassage) setHighlightPaletteOpen(true);
              else setMessage('Maintiens le doigt sur un paragraphe pour le sélectionner.');
            }} />
            {highlightPaletteOpen && selectedPassage && (Object.keys(highlightColors) as (keyof typeof highlightColors)[]).map(color =>
              <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Surligner en ${color}`}
                onPress={() => addHighlight(color)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: highlightColors[color], borderWidth: 1, borderColor: c.line }} />
            )}
            {highlightPaletteOpen && <Button title="Annuler" secondary onPress={() => { setHighlightPaletteOpen(false); setSelectedPassage(null); }} />}
          </View>
          {activeHighlights.filter(highlight => !displayText.includes(highlight.text)).map(highlight =>
            <View key={highlight.id} style={s.between}>
              <Txt size={12}>Un ancien surlignage n’a pas été retrouvé dans cette partie.</Txt>
              <Button title="Supprimer" secondary onPress={() => void commit({ type: 'highlight', value: highlight, enabled: false })} />
            </View>
          )}
        </>}
        {selectedTerm && <View style={{ backgroundColor: c.mint, padding: 12, borderRadius: 12, gap: 6 }}>
          <Txt bold>{selectedTerm.ro} · {selectedTerm.fr}</Txt>
          <Txt>{displayLanguage === 'RO' ? selectedTerm.definition.ro : selectedTerm.definition.fr}</Txt>
          <Txt size={11} color={c.muted}>Définition pédagogique Norya · traduction non certifiée officiellement · p. {selectedTerm.pages}.</Txt>
          {selectedTerm.chapterId !== id && <Button title="Ouvrir le cours associé" secondary onPress={() => router.push({ pathname: '/chapter', params: { id: selectedTerm.chapterId } })} />}
          <Button title="Fermer" secondary onPress={() => setTerm(null)} />
        </View>}
        <View style={{ gap: 6 }}>
          <Txt bold>Mes notes</Txt>
          <TextInput accessibilityLabel="Notes personnelles de cette partie" multiline
            placeholder="Ajouter une note…" style={[s.input, { minHeight: sectionNote ? 74 : 48 }]} value={sectionNote}
            onChangeText={saveSectionNote} onEndEditing={event => flushSectionNote(event.nativeEvent.text)} />
        </View>
        <View style={s.wrap}>
          {lesson.sections.map((part, partIndex) =>
            <Chip key={partIndex} label={`${partIndex + 1}. ${part.title.ro}`} selected={partIndex === index}
              onPress={() => remember({ section: partIndex })} />
          )}
        </View>
        {index > 0 && <Button title="Partie précédente" secondary disabled={busy} onPress={() => remember({ section: index - 1 })} />}
        <Button title={sectionDone ? 'Partie terminée ✓' : index === sectionCount - 1 ? 'Valider la dernière partie' : 'Partie suivante'}
          disabled={busy || sectionDone || currentPass.completedOn !== undefined}
          onPress={() => void finishSection()} />
      </Card>

      {allPartsDone && <Card>
        <Txt bold>Chapitre terminé</Txt>
        <Txt>{lesson?.questions.length
          ? `${lesson.questions.length} QCM disponibles liés au chapitre. Leur relecture médicale n’est pas documentée ; le test est facultatif et ne bloque pas la validation de lecture.`
          : 'Aucun QCM disponible pour le moment. Ta lecture reste enregistrée et tu peux terminer sans entraînement.'}</Txt>
        {!!lesson?.questions.length && <Button title="Faire les QCM" onPress={() => router.push({ pathname: '/quiz', params: { chapter: id } })} />}
        <Button title="Faire plus tard" secondary onPress={() => router.replace('/library')} />
      </Card>}
    </>}

    {!!message && <Txt>{message}</Txt>}
  </Screen>;
}
