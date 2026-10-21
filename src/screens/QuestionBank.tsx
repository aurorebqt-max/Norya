import { useEffect, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { extractQcmPdf } from '../services/qcmPdf';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Button, Chip, s } from '../components/ui';
import { colors as c } from '../design/theme';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';
import { examChapters } from '../data/rezidentiat2026';
import { loadPrivateCourse } from '../services/storage/privateCourse';
import { loadValidation } from '../domain/sourceCourse/verification';
import { loadFinalCourse } from '../domain/sourceCourse/finalizedStorage';
import { buildCourseStructure } from '../domain/sourceCourse/courseStructure';
import { isContentEditor, listSharedQcm, parseBatch, qcmExportTemplate, saveQcm, deleteQcm, type NoryaQcm } from '../services/cloud/qcmBank';

export default function QuestionBank() {
  const { chapterId } = useLocalSearchParams<{ chapterId?: string }>();
  const [rows, setRows] = useState<{ q: NoryaQcm; published: boolean }[]>([]);
  const [editor, setEditor] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<NoryaQcm | null>(null);
  const [chapterInput, setChapterInput] = useState('');
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [courseHeadings, setCourseHeadings] = useState<{ level: 'h2' | 'h3' | 'h4'; title: string; printedPage: number; blockId: string; sectionId: string }[]>([]);
  const [courseHeadingsLoading, setCourseHeadingsLoading] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);

  const refresh = async () => {
    const [q, admin] = await Promise.all([listSharedQcm(), isContentEditor()]);
    setRows(q);
    setEditor(admin);
  };
  useEffect(() => { void refresh().catch(e => setError(String(e))); }, []);

  useEffect(() => {
    let active = true;
    if (!chapterInput) { setCourseHeadings([]); return () => { active = false; }; }
    setCourseHeadingsLoading(true);
    Promise.all([loadPrivateCourse(chapterInput), loadValidation(chapterInput), loadFinalCourse(chapterInput)])
      .then(([packet, validation, archive]) => {
        if (!active) return;
        const finalVersion = archive?.versions.find(version => version.version === archive.activeVersion);
        const structure = finalVersion
          ? buildCourseStructure(finalVersion.packet, finalVersion.validation, finalVersion.presentations)
          : buildCourseStructure(packet, validation);
        const headings: { level: 'h2' | 'h3' | 'h4'; title: string; printedPage: number; blockId: string; sectionId: string }[] = [];
        for (const section of structure.sections) {
          const h2 = section.items.find(item => item.kind === 'h2');
          if (h2) headings.push({ level: 'h2', title: h2.presentation.text.replace(/\s+/gu, ' ').trim(), printedPage: h2.printedPage, blockId: h2.blockId, sectionId: section.id });
          for (const item of section.items) {
            if (item.kind === 'h3') headings.push({ level: 'h3', title: item.presentation.text.replace(/\s+/gu, ' ').trim(), printedPage: item.printedPage, blockId: item.blockId, sectionId: section.id });
            if (item.kind === 'h4') headings.push({ level: 'h4', title: item.presentation.text.replace(/\s+/gu, ' ').trim(), printedPage: item.printedPage, blockId: item.blockId, sectionId: section.id });
          }
        }
        setCourseHeadings(headings.filter(item => item.title));
      })
      .catch(() => { if (active) setCourseHeadings([]); })
      .finally(() => { if (active) setCourseHeadingsLoading(false); });
    return () => { active = false; };
  }, [chapterInput]);

  const visible = rows.filter(r => !chapterId || r.q.chapterIds.includes(chapterId));
  const safeIndex = visible.length ? Math.min(index, visible.length - 1) : 0;
  const active = visible[safeIndex];

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  function pdfPrefix(name: string) {
    const year = name.match(/20\d{2}/)?.[0];
    if (year) return `rez-${year}`;
    const clean = name.replace(/\.pdf$/i, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45);
    return `pdf-${clean || Date.now()}`;
  }

  async function importPdf() {
    if (Platform.OS !== 'web') throw new Error('Ouvrez Norya dans Safari pour importer un PDF.');
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const blob = asset.file ?? await (await fetch(asset.uri)).blob();
    if (!(await blob.slice(0, 1024).text()).includes('%PDF-')) throw new Error('PDF invalide.');
    const value: any = await extractQcmPdf(blob, setPdfProgress);
    const prefix = pdfPrefix(asset.name || 'annales.pdf');
    const questions = value.questions.map((q, i) => {
      const n = q.id.match(/q(\d+)$/i)?.[1] ?? String(i + 1);
      return { ...q, id: `${prefix}-q${n}` };
    });
    const normalized = { ...value, sourceFile: asset.name, questions };
    setDraft(JSON.stringify(normalized, null, 2));
    setPdfProgress(`${questions.length} question(s) détectée(s). Cet import s'ajoute aux QCM déjà enregistrés ; il ne les efface pas.`);
  }

  const move = (next: number) => {
    setIndex(next); setChoices([]); setShowCorrect(false); setEditingId(null); setQuestionDraft(null); setConfirmDeleteId(null);
  };
  const blankChoices = () => ['A', 'B', 'C', 'D', 'E'].map(id => ({ id, text: '' }));
  const beginEdit = (q: NoryaQcm) => {
    const byId = new Map(q.choices.map(choice => [choice.id.toUpperCase(), choice]));
    setEditingId(q.id);
    setQuestionDraft({ ...q, choices: ['A', 'B', 'C', 'D', 'E'].map(id => ({ ...byId.get(id), id, text: byId.get(id)?.text || '' })) });
    setChapterInput(q.chapterIds[0] || '');
    setChapterMenuOpen(false); setScopeMenuOpen(false); setConfirmDeleteId(null);
  };
  const beginAdd = () => {
    setEditingId('__new__');
    setQuestionDraft({ id: `manuel-${Date.now()}`, chapterIds: chapterId ? [chapterId] : [], stem: '', choices: blankChoices(), verified: false });
    setChapterInput(chapterId || ''); setChapterMenuOpen(false); setScopeMenuOpen(false); setConfirmDeleteId(null);
  };
  const updateChoice = (id: string, value: string) => setQuestionDraft(prev => prev ? { ...prev, choices: prev.choices.map(choice => choice.id === id ? { ...choice, text: value } : choice) } : prev);
  const toggleCorrect = (id: string) => setQuestionDraft(prev => prev ? { ...prev, choices: prev.choices.map(choice => choice.id === id ? { ...choice, correct: !choice.correct } : choice) } : prev);

  const selectedChapter = examChapters.find(ch => ch.id === chapterInput);
  const chooseChapter = (id: string) => {
    setChapterInput(id); setChapterMenuOpen(false); setScopeMenuOpen(false);
    setQuestionDraft(prev => prev ? { ...prev, chapterIds: id ? [id] : [], courseReference: id ? { chapterId: id } : undefined } : prev);
  };
  const chooseScope = (headingIndex: number) => {
    const heading = courseHeadings[headingIndex];
    const chapter = examChapters.find(ch => ch.id === chapterInput);
    if (!chapter || !heading) return;
    setQuestionDraft(prev => prev ? { ...prev, courseReference: {
      chapterId: chapter.id, scopeIndex: headingIndex, scopeTitle: heading.title,
      printedPage: heading.printedPage, blockId: heading.blockId,
    } } : prev);
    setScopeMenuOpen(false);
  };

  async function saveEdit(publish = false) {
    if (!questionDraft) throw new Error('Aucune question à enregistrer.');
    const selected = chapterInput.trim();
    if (selected && !examChapters.some(ch => ch.id === selected)) throw new Error(`Chapitre inconnu : ${selected}.`);
    const chapterIds = selected ? [selected] : [];
    const courseReference = questionDraft.courseReference?.chapterId === selected ? questionDraft.courseReference : undefined;
    const allFive = ['A', 'B', 'C', 'D', 'E'].map(id => {
      const choice = questionDraft.choices.find(item => item.id === id);
      return { id, text: choice?.text.trim() || '', ...(typeof choice?.correct === 'boolean' ? { correct: choice.correct } : {}) };
    });
    const item: NoryaQcm = {
      ...questionDraft,
      chapterIds,
      courseReference,
      choices: publish ? allFive.map(choice => ({ ...choice, correct: !!choice.correct })) : allFive.filter(choice => choice.text),
      verified: publish,
    };
    if (!item.stem.trim()) throw new Error('Saisissez l’énoncé de la question.');
    if (publish && !chapterIds.length) throw new Error('Choisissez le chapitre avant de publier la question.');
    if (publish && allFive.some(choice => !choice.text)) throw new Error('Complétez les cinq propositions A, B, C, D et E.');
    if (publish && !allFive.some(choice => choice.correct)) throw new Error('Cochez au moins une bonne réponse.');
    if (editingId !== '__new__' && item.id !== editingId) throw new Error('Ne modifiez pas l’identifiant du QCM.');
    if (editingId === '__new__' && rows.some(row => row.q.id === item.id)) throw new Error('Cet identifiant existe déjà.');
    await saveQcm([item], publish);
    await refresh();
    setEditingId(null); setQuestionDraft(null); setShowCorrect(false); setChoices([]);
    if (editingId === '__new__') setIndex(0);
  }

  const editForm = questionDraft && <View style={{ gap: 10 }}>
    <Txt bold>Énoncé de la question</Txt>
    <TextInput multiline value={questionDraft.stem} onChangeText={value => setQuestionDraft(prev => prev ? { ...prev, stem: value } : prev)} accessibilityLabel="Énoncé du QCM" placeholder="Saisir la question" style={[s.input, { minHeight: 95, textAlignVertical: 'top' }]} />
    <Txt bold>Propositions A à E</Txt>
    {questionDraft.choices.map(choice => <View key={choice.id} style={{ gap: 6 }}>
      <Txt bold>{choice.id}</Txt>
      <TextInput multiline value={choice.text} onChangeText={value => updateChoice(choice.id, value)} accessibilityLabel={`Proposition ${choice.id}`} placeholder={`Texte de la proposition ${choice.id}`} style={[s.input, { minHeight: 55, textAlignVertical: 'top' }]} />
      <Chip label={choice.correct ? 'Bonne réponse ✓' : 'Marquer comme bonne réponse'} selected={!!choice.correct} onPress={() => toggleCorrect(choice.id)} />
    </View>)}

    <Txt bold>Chapitre associé</Txt>
    <Button secondary title={selectedChapter ? selectedChapter.chapter : 'À classer plus tard'} onPress={() => setChapterMenuOpen(value => !value)} />
    {chapterMenuOpen && <View style={{ gap: 7 }}>
      <Chip label="À classer plus tard" selected={!chapterInput} onPress={() => chooseChapter('')} />
      {examChapters.map(ch => <Chip key={ch.id} label={ch.chapter} selected={chapterInput === ch.id} onPress={() => chooseChapter(ch.id)} />)}
    </View>}

    {selectedChapter && <>
      <Txt bold>Partie du chapitre (facultatif)</Txt>
      <Button secondary title={questionDraft.courseReference?.scopeTitle || 'Choisir la partie du cours'} onPress={() => setScopeMenuOpen(value => !value)} />
      {scopeMenuOpen && <View style={{ gap: 7 }}>
        <Chip label="Chapitre entier / à préciser plus tard" selected={!questionDraft.courseReference?.scopeTitle} onPress={() => { setQuestionDraft(prev => prev ? { ...prev, courseReference: { chapterId: selectedChapter.id } } : prev); setScopeMenuOpen(false); }} />
        {courseHeadingsLoading && <Txt size={12}>Chargement des titres H2/H3/H4 du cours…</Txt>}
        {!courseHeadingsLoading && !courseHeadings.length && <Txt size={12}>Aucun titre H2/H3/H4 n’est encore disponible dans le cours enregistré de ce chapitre. Vous pouvez laisser « chapitre entier » et préciser plus tard.</Txt>}
        {courseHeadings.map((part, partIndex) => <View key={`${selectedChapter.id}-${part.blockId}`} style={{ paddingLeft: part.level === 'h4' ? 42 : part.level === 'h3' ? 22 : 0 }}>
          <Pressable accessibilityRole="button" onPress={() => chooseScope(partIndex)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: questionDraft.courseReference?.blockId === part.blockId ? c.primary : c.line, borderRadius: 12, backgroundColor: questionDraft.courseReference?.blockId === part.blockId ? c.mint : '#fff' }}>
            <Txt bold={part.level === 'h2'} size={part.level === 'h2' ? 14 : part.level === 'h3' ? 13 : 12}>{part.level === 'h2' ? part.title : part.level === 'h3' ? `↳ ${part.title}` : `↳↳ ${part.title}`}</Txt>
          </Pressable>
        </View>)}
      </View>}
      <Txt size={12}>H2 = grande partie · H3 = sous-partie · H4 = sous-sous-partie encore plus décalée. Après correction, « Voir dans le cours » ouvrira directement le passage choisi.</Txt>
    </>}

    <Button title="Enregistrer en brouillon" disabled={busy} onPress={() => void run(() => saveEdit(false))} />
    <Button title="Valider et ajouter cette question à la banque d’entraînement" secondary disabled={busy} onPress={() => void run(() => saveEdit(true))} />
    <Txt size={12}>Une question publiée est immédiatement disponible dans les séances et dans les QCM de son chapitre. Les autres questions de l’annale peuvent rester en brouillon.</Txt>
    <Button title="Annuler les modifications" secondary disabled={busy} onPress={() => { setEditingId(null); setQuestionDraft(null); }} />
  </View>;

  const statusComplete = (row: { q: NoryaQcm; published: boolean }) => row.published && row.q.verified && row.q.chapterIds.length > 0 && row.q.choices.length === 5;

  return <Screen title="Banque de QCM" subtitle={chapterId ? `QCM du chapitre ${chapterId}` : 'Questions partagées validées et brouillons administrateur'} back>
    {!!error && <Card><Txt>{error}</Txt></Card>}
    {editor && <Card style={{ gap: 10 }}>
      <Txt bold>Administration des QCM</Txt>
      <Button title="Ajouter une question" secondary disabled={busy} onPress={beginAdd} />
      {editingId === '__new__' && editForm}
      <Button title="Importer un nouveau PDF de QCM" secondary disabled={busy} onPress={() => void run(importPdf)} />
      {!!pdfProgress && <Txt size={12}>{pdfProgress}</Txt>}
      <Button title="Exporter le brouillon PDF/JSON pour ChatGPT" secondary disabled={!draft || busy} onPress={() => { try { downloadPrivateJson('norya-qcm-a-classer.json', JSON.parse(draft)); } catch { setError('Le JSON doit être valide pour être exporté.'); } }} />
      <Button title="Exporter le modèle pour ChatGPT (39 chapitres)" secondary disabled={busy} onPress={() => downloadPrivateJson('norya-modele-qcm.json', qcmExportTemplate())} />
      <Button title="Charger un JSON de QCM" secondary disabled={busy} onPress={() => void run(async () => { const raw = await pickPrivateJson(); if (raw) { parseBatch(raw); setDraft(raw); } })} />
      <Txt size={12}>Chaque nouvel import s’ajoute à la banque Supabase. Les QCM déjà enregistrés restent disponibles. Les brouillons peuvent être incomplets ; seule la validation individuelle les rend disponibles à l’entraînement.</Txt>
      <TextInput multiline value={draft} onChangeText={setDraft} accessibilityLabel="Questions JSON" style={[s.input, { minHeight: 115, textAlignVertical: 'top' }]} />
      <Button title="Enregistrer les QCM en brouillon" disabled={!draft || busy} onPress={() => void run(async () => { await saveQcm(parseBatch(draft), false); await refresh(); setDraft(''); })} />
      <Button title="Publier les QCM déjà vérifiés du JSON" disabled={!draft || busy} onPress={() => void run(async () => { await saveQcm(parseBatch(draft), true); await refresh(); setDraft(''); })} />
    </Card>}

    <Card style={{ gap: 10 }}>
      <Txt bold>{visible.length} question(s) dans la banque</Txt>
      <Button title={navigatorOpen ? 'Masquer le menu des questions' : 'Afficher le menu des questions'} secondary onPress={() => setNavigatorOpen(value => !value)} />
      {navigatorOpen && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {visible.map((row, i) => {
          const current = i === safeIndex;
          const complete = statusComplete(row);
          return <Pressable key={row.q.id} accessibilityRole="button" onPress={() => move(i)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: current ? c.primary : c.line, backgroundColor: current ? c.primary : complete ? c.lime : c.peach }}>
            <Txt size={12} bold={complete || current} color={current ? '#fff' : c.ink}>{complete ? '✓ ' : ''}{i + 1}</Txt>
          </Pressable>;
        })}
      </View>}
      <Txt size={12}>Vert = publiée et classée dans un chapitre · beige = brouillon / à compléter · foncé = question affichée.</Txt>
    </Card>

    {active && <Card style={{ gap: 10 }}>
      <Txt size={12}>{safeIndex + 1}/{visible.length} · {active.q.chapterIds.length ? active.q.chapterIds.map(id => examChapters.find(ch => ch.id === id)?.chapter || id).join(' / ') : 'À classer'} · {active.published ? 'Publiée' : 'Brouillon'}</Txt>
      <Txt bold size={20}>{active.q.stem}</Txt>
      {active.q.choices.map(choice => <Chip key={choice.id} label={`${choice.id}. ${choice.text}`} selected={choices.includes(choice.id)} onPress={() => { if (!showCorrect) setChoices(prev => prev.includes(choice.id) ? prev.filter(id => id !== choice.id) : [...prev, choice.id]); }} />)}
      {editor && <Button title="Modifier ce QCM (administrateur)" secondary disabled={busy} onPress={() => editingId === active.q.id ? setEditingId(null) : beginEdit(active.q)} />}
      {editor && <Button title="Supprimer cette question" secondary disabled={busy} onPress={() => { setConfirmDeleteId(active.q.id); setEditingId(null); }} />}
      {editor && confirmDeleteId === active.q.id && <View style={{ gap: 8 }}>
        <Txt>Confirmer la suppression définitive de {active.q.id} ?</Txt>
        <Button title="Oui, supprimer définitivement" disabled={busy} onPress={() => void run(async () => { await deleteQcm(active.q.id); setConfirmDeleteId(null); await refresh(); setIndex(0); })} />
        <Button title="Annuler" secondary onPress={() => setConfirmDeleteId(null)} />
      </View>}
      {editor && editingId === active.q.id && editForm}
      <Button title="Corriger" disabled={showCorrect || !choices.length || !active.q.verified || active.q.choices.some(choice => typeof choice.correct !== 'boolean')} onPress={() => setShowCorrect(true)} />
      {!active.q.verified && <Txt size={12}>Correction indisponible : réponses non vérifiées. L’administrateur peut modifier cette question.</Txt>}
      {showCorrect && <>
        <Txt bold>{active.q.choices.every(choice => choices.includes(choice.id) === choice.correct) ? 'Réponse correcte' : 'À revoir'}</Txt>
        {active.q.choices.map(choice => <Txt key={choice.id}>{choice.id} : {choice.correct ? 'Vrai' : 'Faux'}{choice.explanation ? ` — ${choice.explanation}` : ''}</Txt>)}
        {active.q.courseReference && <Button secondary title={`Voir dans le cours · ${examChapters.find(ch => ch.id === active.q.courseReference?.chapterId)?.chapter || active.q.courseReference.chapterId}${active.q.courseReference.scopeTitle ? ` · ${active.q.courseReference.scopeTitle}` : ''}`} onPress={() => router.push({ pathname: '/chapter', params: { id: active.q.courseReference!.chapterId, ...(active.q.courseReference!.printedPage ? { page: String(active.q.courseReference!.printedPage) } : {}), ...(active.q.courseReference!.blockId ? { blockId: active.q.courseReference!.blockId } : {}) } })} />}
        {!active.q.courseReference && active.q.chapterIds[0] && <Button secondary title="Voir dans le cours" onPress={() => router.push({ pathname: '/chapter', params: { id: active.q.chapterIds[0] } })} />}
        {!!active.q.explanation && <Txt>{active.q.explanation}</Txt>}
      </>}
      <Button title="Question suivante" secondary disabled={safeIndex >= visible.length - 1} onPress={() => move(safeIndex + 1)} />
      {safeIndex > 0 && <Button title="Question précédente" secondary onPress={() => move(safeIndex - 1)} />}
    </Card>}
    {!active && <Card><Txt>Aucun QCM disponible.</Txt></Card>}
  </Screen>;
}
