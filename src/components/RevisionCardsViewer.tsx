import { useRef } from 'react';
import { CourseReaderPane, courseParagraphStyle } from './CourseReaderPane';
import { CourseReadingProvider, CourseReadingToolbar, ReadingAction } from './CourseReadingTools';
import { CourseReaderNavigation } from './CourseReaderNavigation';
import { CourseReadingText } from './CourseReadingText';
import { revisionCardStructure } from '../domain/sourceCourse/revisionCardStructure';
import { buildCourseStructure } from '../domain/sourceCourse/courseStructure';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Txt, s } from './ui';
import { buildRevisionCardSet, type RevisionCardSet, type CardSection } from '../domain/sourceCourse/revisionCards';
import { loadRevisionCards, saveRevisionCards, exportRevisionCards, importRevisionCards } from '../domain/sourceCourse/revisionCardsStorage';
import type { CourseStructure } from '../domain/sourceCourse/courseStructure';
import type { FinalCourseArchive } from '../domain/sourceCourse/finalization';
import { loadValidation } from '../domain/sourceCourse/verification';
import { loadPrivateCourse } from '../services/storage/privateCourse';
import { router } from 'expo-router';
import { colors as c } from '../design/theme';

export function RevisionCardsViewer({ chapterId, archive, structure }: {
  chapterId: string;
  archive: FinalCourseArchive | null;
  structure: CourseStructure | null;
}) {
  const [cards, setCards] = useState<RevisionCardSet | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RevisionCardSet | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [exportText, setExportText] = useState('');
  const scroll = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const existing = await loadRevisionCards(chapterId);
      if (existing) {
        setCards(existing);
        setDraft(JSON.parse(JSON.stringify(existing)));
        return;
      }
      setCards(null);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoaded(true); }
  }, [chapterId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerate(sectionId?: string) {
    setBusy(true); setError('');
    try {
      if (!archive || archive.status !== 'finalized') throw new Error('Cours finalisé indisponible.');
      const current = archive.versions.find(v => v.version === archive.activeVersion);
      if (!current || archive.chapterId !== chapterId) throw new Error('Version finalisée incompatible.');
      const frozen = buildCourseStructure(current.packet, current.validation, current.presentations);
      const set = buildRevisionCardSet(chapterId, archive, frozen, current.validation, new Date().toISOString());
      if (!set) throw new Error('Génération impossible.');
      if (sectionId) {
        const existing = await loadRevisionCards(chapterId);
        if (existing) {
          const keep = existing.sections.filter(s => s.id !== sectionId);
          const replace = set.sections.find(s => s.id === sectionId);
          set.sections = replace ? [...keep, replace] : keep;
          set.createdAt = existing.createdAt;
          set.manualEdits = existing.manualEdits || false;
        }
      }
      const saved = await saveRevisionCards(set);
      setCards(saved);
      setDraft(JSON.parse(JSON.stringify(saved)));
      setEditing(false); setConfirmRegenerate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!draft) return;
    setBusy(true); setError('');
    try {
      draft.updatedAt = new Date().toISOString();
      draft.manualEdits = true;
      const saved = await saveRevisionCards(draft);
      setCards(saved);
      setDraft(JSON.parse(JSON.stringify(saved)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function editSection(section: CardSection, index: number) {
    if (!draft) return;
    const items = section.items.join('\n');
    return (
      <Card key={section.id} style={{ gap: 8 }}>
        <Txt bold>{section.title}</Txt>
        <TextInput
          multiline
          value={items}
          onChangeText={(text) => {
            const next = { ...draft };
            next.sections = [...draft.sections];
            next.sections[index] = { ...section, items: text.split('\n').filter(line => line.trim()) };
            setDraft(next);
          }}
          style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
        />
      </Card>
    );
  }

  async function handleExport() {
    setBusy(true); setError('');
    try {
      const raw = await exportRevisionCards(chapterId);
      setExportText(raw);
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(raw);
      }
      setError('Fiche exportée en JSON (copiée dans le presse-papier si disponible).');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true); setError('');
    try {
      if (!importText.trim()) throw new Error('Coller le JSON de la fiche.');
      const saved = await importRevisionCards(importText.trim(), chapterId);
      setCards(saved);
      setDraft(JSON.parse(JSON.stringify(saved)));
      setShowImport(false);
      setImportText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <Card><Txt>Chargement de la fiche…</Txt></Card>;
  const readingStructure = cards ? revisionCardStructure(cards) : { authors: [], intro: [], sections: [], outline: [] };
  const index = Math.min(sectionIndex, Math.max(0, readingStructure.sections.length - 1));
  const shown = readingStructure.sections.length
    ? [...(index === 0 ? readingStructure.intro : []), ...readingStructure.sections[index].items] : readingStructure.intro;
  const change = (i: number) => { setSectionIndex(i); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return <CourseReadingProvider key={chapterId} chapterId={chapterId}
    sourceSha256={`revision-cards:${chapterId}:${cards?.sourceVersion ?? ''}`}
    version={`cards:${cards?.sourceVersion ?? ''}:${cards?.createdAt ?? ''}`}
    structure={readingStructure} enabled={!!cards && !editing} sectionIndex={index} onSectionChange={change}>
    <Card>
      <View style={{ gap: 16, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt>Fiches</Txt>
          <ReadingAction label="Gérer la fiche" icon="create-outline" onPress={() => setMenuOpen(!menuOpen)} />
        </View>
        {!!error && <Txt>{error}</Txt>}
        {menuOpen && <View style={{ gap: 8 }}>
          {cards && <Txt size={12}>Source : {cards.sourceVersion} · {cards.manualEdits ? 'Modifiée manuellement' : 'Fiche enregistrée'}</Txt>}
          <Button title={editing ? 'Annuler' : 'Modifier'} secondary disabled={busy || !cards} onPress={() => { setDraft(cards ? JSON.parse(JSON.stringify(cards)) : null); setEditing(!editing); }} />
          {editing && <Button title="Enregistrer" disabled={busy} onPress={() => void saveEdit()} />}
          <Button title="Régénérer" disabled={busy || !cards || archive?.status !== 'finalized'} onPress={() => setConfirmRegenerate(true)} />
          {confirmRegenerate && <>
            <Txt>Une nouvelle fiche sera générée. La fiche actuelle sera conservée dans l’historique local.</Txt>
            <Button title="Confirmer la régénération" disabled={busy} onPress={() => void regenerate()} />
            <Button title="Annuler la régénération" secondary onPress={() => setConfirmRegenerate(false)} />
          </>}
          <Button title="Exporter JSON" disabled={busy || !cards} onPress={() => void handleExport()} />
          {!!exportText && <TextInput multiline readOnly value={exportText} accessibilityLabel="JSON de la fiche exportée" style={[s.input, { height: 120 }]} />}
          <Button title="Importer JSON" secondary disabled={busy} onPress={() => setShowImport(!showImport)} />
          {showImport && <>
            <TextInput multiline accessibilityLabel="JSON de la fiche" value={importText} onChangeText={setImportText} style={[s.input, { minHeight: 100 }]} />
            <Button title="Importer la fiche et conserver la précédente" disabled={busy} onPress={() => void handleImport()} />
          </>}
        </View>}
        {!cards && <>
          <Txt>Aucune fiche enregistrée pour ce chapitre.</Txt>
          <Button title="Créer la fiche depuis le cours finalisé" disabled={busy || archive?.status !== 'finalized'} onPress={() => void regenerate()} />
        </>}
        {cards && !editing && <>
          <CourseReadingToolbar />
          <CourseReaderNavigation structure={readingStructure} index={index} onChange={change} />
          <CourseReaderPane ref={scroll} contentKey={String(index)}>
            {shown.map(item => <View key={item.key} style={item.kind ? undefined : courseParagraphStyle}>
              <CourseReadingText presentation={item.presentation} printedPage={item.printedPage} blockId={item.blockId}
                level={item.kind === 'h1' || item.kind === 'h2' || item.kind === 'h3' || item.kind === 'h4' ? item.kind : undefined} />
            </View>)}
          </CourseReaderPane>
        </>}
        {editing && draft && draft.sections.map((section, i) => editSection(section, i))}
      </View>
    </Card>
  </CourseReadingProvider>;
}
