import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Icon, Txt, type IconName } from './ui';
import { colors as c } from '../design/theme';
import type { CourseItem, CourseStructure } from '../domain/sourceCourse/courseStructure';
import { anchorMatches, emptyReadingData, highlightColors, putAnnotation, readingAnchor, removeAnnotation, restoreReadingData,
  type HighlightColor, type ReadingAnchor, type ReadingAnnotation, type ReadingData, type ReadingRef } from '../domain/sourceCourse/readingData';
import { loadReadingData, updateReadingData } from '../domain/sourceCourse/readingStorage';

type Selection = { anchor: ReadingAnchor; x?: number; y?: number; annotationId?: string };
type ReadingContextValue = {
  data: ReadingData; version: string; refFor: (page: number, block: string) => ReadingRef;
  select: (value: Selection) => void; selected: Selection | null; enabled: boolean;
  openPanel: (panel: 'annotations' | 'audio' | 'translation' | null) => void;
};
export const CourseReadingContext = createContext<ReadingContextValue | null>(null);
export const useCourseReading = () => useContext(CourseReadingContext);

export function ReadingAction({ label, icon, onPress, selected = false, disabled = false }: {
  label: string; icon?: IconName; onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled}
    onPress={onPress} style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, backgroundColor: selected ? c.mint : undefined, opacity: disabled ? 0.4 : 1 }}>
    {icon ? <Icon name={icon} size={19} color={c.ink} /> : <Txt size={12}>{label}</Txt>}
  </Pressable>;
}

export function CourseReadingProvider({ chapterId, sourceSha256, version, structure, enabled, children }: {
  chapterId: string; sourceSha256: string; version: string; structure: CourseStructure; enabled: boolean; children: ReactNode;
}) {
  const [data, setData] = useState<ReadingData>(() => emptyReadingData(chapterId));
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'annotations' | 'audio' | 'translation' | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [backup, setBackup] = useState('');
  const [restore, setRestore] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [reposition, setReposition] = useState<string | undefined>();
  const alive = useRef(true);
  const { width, height } = useWindowDimensions();
  const items = [...structure.intro, ...structure.sections.flatMap(s => s.items)];
  const refFor = (printedPage: number, blockId: string): ReadingRef => ({ chapterId, sourceSha256, printedPage, blockId });
  useEffect(() => {
    alive.current = true; setLoaded(false);
    let active = true;
    loadReadingData(chapterId).then(value => { if (active) { setData(value); setLoaded(true); } }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; alive.current = false; };
  }, [chapterId]);
  useEffect(() => { setSelected(null); setPanel(null); }, [enabled, version]);
  async function save(change: (value: ReadingData) => ReadingData) {
    if (!loaded) { setError('Annotations non chargées. Aucune donnée remplacée.'); return false; }
    try { const value = await updateReadingData(chapterId, change); if (alive.current) { setData(value); setError(''); } return true; }
    catch (e) { if (alive.current) setError(String(e)); return false; }
  }
  function select(value: Selection) {
    setSelected(value); const mark = data.annotations.find(a => a.id === (value.annotationId ?? reposition));
    setNote(mark?.note ?? ''); setShowNote(!!mark?.note); setPanel(null);
  }
  // selectionchange is emitted by Safari's touch handles, unlike mouseup-only implementations.
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const capture = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const element = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
      const root = element?.closest('[data-reading-key]');
      if (!root || root.getAttribute('data-reading-chapter') !== chapterId || !root.contains(range.endContainer)) return;
      const item = items.find(i => i.key === root.getAttribute('data-reading-key'));
      if (!item || root.textContent !== item.presentation.text) return;
      const prefix = document.createRange(); prefix.selectNodeContents(root); prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length; const end = start + range.toString().length;
      if (end <= start) return;
      const rect = range.getBoundingClientRect();
      select({ anchor: readingAnchor(refFor(item.printedPage, item.blockId), version, item.presentation.text, start, end),
        x: rect.left, y: rect.bottom });
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [enabled, chapterId, sourceSha256, version, structure, data]);
  async function mark(color?: HighlightColor) {
    if (!selected) return;
    const id = reposition ?? selected.annotationId;
    if (!await save(value => putAnnotation(value, selected.anchor, color, note, id))) return;
    setReposition(undefined); setSelected(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
  }
  const stale = (a: ReadingAnnotation) => !items.some(item => anchorMatches(a, refFor(item.printedPage, item.blockId), item.presentation.text));
  const palette = selected && enabled ? <View style={{ backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 8, gap: 4, maxWidth: Math.min(width - 24, 340) }}>
    {!!error && <Txt size={12} color="#9b2c2c">{error}</Txt>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {(Object.keys(highlightColors) as HighlightColor[]).map(color => <Pressable key={color} accessibilityRole="button"
        accessibilityLabel={`Surligner ${color}`} disabled={!loaded} onPress={() => void mark(color)}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: highlightColors[color], borderWidth: 1, borderColor: c.line }} />
      </Pressable>)}
      <ReadingAction label="Ajouter une note" icon="create-outline" onPress={() => setShowNote(!showNote)} />
      {selected.annotationId && <ReadingAction label="Supprimer l’annotation" icon="trash-outline" onPress={() => {
        const id = selected.annotationId!; void save(value => removeAnnotation(value, id)); setSelected(null);
      }} />}
      <ReadingAction label="Fermer la sélection" icon="close" onPress={() => setSelected(null)} />
    </View>
    {showNote && <>
      <TextInput accessibilityLabel="Note du passage" multiline value={note} onChangeText={setNote}
        style={{ color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 8, minHeight: 70, fontSize: 16 }} />
      <ReadingAction label="Enregistrer la note" onPress={() => void mark(data.annotations.find(a => a.id === selected.annotationId)?.color)} />
    </>}
  </View> : null;
  return <CourseReadingContext.Provider value={{ data, version, refFor, selected, select, enabled, openPanel: setPanel }}>
    {children}
    {enabled && <View testID="course-reading-tools" style={{ gap: 4 }}>
      {!!error && <Txt size={12} color="#9b2c2c">{error}</Txt>}
    </View>}
    {palette && (Platform.OS === 'web' ? createElement('div', { style: { position: 'fixed', zIndex: 10000,
      left: Math.max(12, Math.min(selected?.x ?? 12, width - 352)), top: Math.max(12, Math.min((selected?.y ?? 80) + 8, height - (showNote ? 230 : 120))), maxWidth: 'calc(100vw - 24px)' },
      onMouseDown: (event: { target: EventTarget; preventDefault(): void }) => { if ((event.target as HTMLElement).tagName !== 'TEXTAREA') event.preventDefault(); } }, palette)
      : <Modal transparent visible onRequestClose={() => setSelected(null)}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.2)' }}>{palette}</View></Modal>)}
    {enabled && panel && <Modal transparent visible animationType="fade" onRequestClose={() => setPanel(null)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,.25)' }}>
        <View style={{ backgroundColor: c.paper, borderRadius: 14, padding: 12, width: '100%', maxWidth: 580, maxHeight: '85%', alignSelf: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt bold>{panel === 'annotations' ? 'Annotations' : panel === 'audio' ? 'Écouter' : 'Traduire'}</Txt>
            <ReadingAction label="Fermer les outils de lecture" icon="close" onPress={() => setPanel(null)} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {panel === 'annotations' && <View style={{ gap: 8 }}>
              <Txt size={12}>Sélectionnez un passage roumain pour choisir une couleur ou ajouter une note.</Txt>
              {reposition && <Txt size={12}>Sélectionnez maintenant le nouveau passage, puis choisissez sa couleur.</Txt>}
              {data.annotations.filter(a => !a.deletedAt).map(a => <View key={a.id} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Txt size={12}>p. {a.printedPage} · {stale(a) ? 'À repositionner : source modifiée' : 'Passage annoté'}</Txt>
                <Text selectable style={{ color: c.ink, backgroundColor: a.color ? highlightColors[a.color] : undefined }}>{a.quote}</Text>
                {!!a.note && <Txt size={13}>{a.note}</Txt>}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {!stale(a) && <ReadingAction label="Modifier la note ou la couleur" onPress={() => select({ anchor: a, annotationId: a.id })} />}
                  {stale(a) && <ReadingAction label="Repositionner" onPress={() => { setReposition(a.id); setPanel(null); }} />}
                  <ReadingAction label="Supprimer" onPress={() => void save(value => removeAnnotation(value, a.id))} />
                </View>
              </View>)}
              <ReadingAction label="Sauvegarde / restauration" icon="download-outline" onPress={() => { setShowBackup(!showBackup); setBackup(JSON.stringify(data)); }} />
              {showBackup && <>
                <Txt size={12}>Sauvegarde privée : annotations et traductions uniquement. Copiez ce JSON dans un fichier privé.</Txt>
                <TextInput accessibilityLabel="Sauvegarde des données de lecture" multiline readOnly value={backup} style={{ height: 100, color: c.ink }} />
                <TextInput accessibilityLabel="Restaurer les données de lecture" multiline value={restore} onChangeText={setRestore} placeholder="Collez une sauvegarde de ce chapitre" style={{ height: 100, color: c.ink }} />
                <ReadingAction label="Restaurer sans effacer les données actuelles" disabled={!loaded || !restore.trim()} onPress={() => void save(value => restoreReadingData(value, restore))} />
              </>}
            </View>}
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </CourseReadingContext.Provider>;
}

// The toolbar is rendered at the top of the reader, not outside its scroll/navigation layout.
export function CourseReadingToolbar() {
  const context = useCourseReading();
  if (!context?.enabled) return null;
  return <View accessibilityLabel="Outils du cours" style={{ flexDirection: 'row', gap: 2, justifyContent: 'flex-end' }}>
    <ReadingAction label="Surligner et annoter" icon="color-wand-outline" onPress={() => context.openPanel('annotations')} />
    <ReadingAction label="Écouter le cours" icon="headset-outline" onPress={() => context.openPanel('audio')} />
    <ReadingAction label="Traduire le cours" icon="language-outline" onPress={() => context.openPanel('translation')} />
  </View>;
}
