import { CourseSelectionOverlay } from './CourseSelectionOverlay';
import { useLearning } from '../state/LearningProvider';
import { readingSpeechDriver } from '../services/readingSpeech';
import { getFreeTranslator } from '../domain/sourceCourse/translateFree';
import { ReadingAudioController, audioQueue, splitSpeech, preferredVoices, type ReadingVoice, type AudioStatus } from '../domain/sourceCourse/readingAudio';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Icon, Txt, type IconName } from './ui';
import { colors as c } from '../design/theme';
import type { CourseItem, CourseStructure } from '../domain/sourceCourse/courseStructure';
import { anchorMatches, emptyReadingData, highlightColors, putAnnotation, readingAnchor, removeAnnotation, restoreReadingData,
  type HighlightColor, type ReadingAnchor, type ReadingAnnotation, type ReadingData, type ReadingRef } from '../domain/sourceCourse/readingData';
import { loadReadingData, updateReadingData } from '../domain/sourceCourse/readingStorage';

type Selection = { language?: 'ro' | 'fr'; anchor: ReadingAnchor; x?: number; y?: number; annotationId?: string };
type ReadingContextValue = {
  language: 'ro' | 'fr'; changeLanguage: (language: 'ro' | 'fr') => void;
  audioStatus?: AudioStatus; controlAudio: (action: 'pause' | 'resume' | 'stop') => void;
  translated: (page: number, block: string, text: string) => string | undefined;
  data: ReadingData; version: string; refFor: (page: number, block: string) => ReadingRef;
  select: (value: Selection) => void; selected: Selection | null; enabled: boolean;
  openPanel: (panel: 'audio' | 'translation' | null) => void;
  panel: 'audio' | 'translation' | null;
  listen: (scope: 'selection' | 'section' | 'chapter' | 'preview') => Promise<void>;
  sectionIndex: number; structure: CourseStructure; onSectionChange: (index: number) => void;
  save: (change: (value: ReadingData) => ReadingData) => Promise<boolean>;
  setRate: (rate: number) => Promise<void>;
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

export function CourseReadingProvider({ chapterId, sourceSha256, version, structure, enabled, children, sectionIndex = 0, onSectionChange = () => {}, translations = {}, translatePanel, manualTranslationOnly = false }: {
  translatePanel?: ReactNode; manualTranslationOnly?: boolean;
  translations?: Record<string, string>; sectionIndex?: number; onSectionChange?: (index: number) => void;
  chapterId: string; sourceSha256: string; version: string; structure: CourseStructure; enabled: boolean; children: ReactNode;
}) {
  const { learning, commit } = useLearning();
  const [language, setLanguage] = useState<'ro' | 'fr'>('ro');
  const [audioStatus, setAudioStatus] = useState<AudioStatus>();
  const audioRequest = useRef(0);
  const audio = useRef<ReadingAudioController | null>(null);
  const [data, setData] = useState<ReadingData>(() => emptyReadingData(chapterId));
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'audio' | 'translation' | null>(null);
  const panelRef = useRef<typeof panel>(null);
  const [choosingPassage, setChoosingPassage] = useState(false);
  const [passageItem, setPassageItem] = useState<CourseItem | null>(null);
  const [passageRange, setPassageRange] = useState({ start: 0, end: 0 });
  const [voices, setVoices] = useState<ReadingVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  function openPanel(value: typeof panel) {
    panelRef.current = value; setPanel(value);
    if (value) void loadReadingData(chapterId).then(next => { if (alive.current) { setData(next); setLoaded(true); } }).catch(e => setError(String(e)));
  }

  const [selected, setSelected] = useState<Selection | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [backup, setBackup] = useState('');
  const [restore, setRestore] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [translating, setTranslating] = useState(false); const [reposition, setReposition] = useState<string | undefined>();
  const alive = useRef(true);
  const { width, height } = useWindowDimensions();
  const items = [...structure.intro, ...structure.sections.flatMap(s => s.items)];
  const refFor = (printedPage: number, blockId: string): ReadingRef => ({ chapterId, sourceSha256, printedPage, blockId });
  useEffect(() => {
    alive.current = true; setLoaded(false);
    let active = true;
    loadReadingData(chapterId).then(value => { if (active) { setData(value); setLanguage(value.preferences.language === 'fr' ? 'fr' : 'ro'); setLoaded(true); } }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; alive.current = false; };
  }, [chapterId]);
  useEffect(() => { setSelected(null); openPanel(null); }, [enabled, version]);
  async function save(change: (value: ReadingData) => ReadingData) {
    if (!loaded) { setError('Annotations non chargées. Aucune donnée remplacée.'); return false; }
    try { const value = await updateReadingData(chapterId, change); if (alive.current) { setData(value); setError(''); } return true; }
    catch (e) { if (alive.current) setError(String(e)); return false; }
  }
  function controlAudio(action: 'pause' | 'resume' | 'stop') {
    if (action === 'stop') {
      audioRequest.current++;
      setAudioStatus(status => status ? { ...status, state: 'idle' } : undefined);
    }
    void audio.current?.[action]().catch(e => setError(String(e)));
  }
  function changeLanguage(lang: 'ro' | 'fr') {
    controlAudio('stop');
    const visible = structure.sections[sectionIndex]?.items ?? structure.intro;
    if (lang === 'fr' && !visible.some(item => !!translated(item.printedPage, item.blockId, item.presentation.text))) {
      setError('Aucune traduction française disponible pour cette section. Utilisez la traduction ci-dessous pour la générer.');
      openPanel('translation'); return;
    }
    setError(''); setLanguage(lang);
    void save(d => ({ ...d, preferences: { ...d.preferences, language: lang } }));
  }
  function select(value: Selection) {
    const original = items.find(i => i.printedPage === value.anchor.printedPage && i.blockId === value.anchor.blockId)?.presentation.text;
    setSelected({ ...value, language: value.language ?? (original === value.anchor.sourceText ? 'ro' : 'fr') }); const mark = data.annotations.find(a => a.id === (value.annotationId ?? reposition));
    setNote(mark?.note ?? ''); setShowNote(!!mark?.note); openPanel(null);
  }
  // selectionchange is emitted by Safari's touch handles, unlike mouseup-only implementations.
  useEffect(() => {
    if (!enabled || panel || showNote || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const capture = () => {
      if (panelRef.current) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const element = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
      const root = element?.closest('[data-reading-key]');
      if (!root || root.getAttribute('data-reading-chapter') !== chapterId || !root.contains(range.endContainer)) return;
      const item = items.find(i => i.key === root.getAttribute('data-reading-key'));
      if (!item) return;
      const fullText = language === 'fr' ? translated(item.printedPage, item.blockId, item.presentation.text) : item.presentation.text;
      const offset = Number(root.getAttribute('data-reading-start') ?? 0);
      if (!fullText || fullText.slice(offset, offset + (root.textContent?.length ?? 0)) !== root.textContent) return;
      const prefix = document.createRange(); prefix.selectNodeContents(root); prefix.setEnd(range.startContainer, range.startOffset);
      const start = offset + prefix.toString().length; const end = start + range.toString().length;
      if (end <= start) return;
      const rect = range.getBoundingClientRect();
      select({ language, anchor: readingAnchor(refFor(item.printedPage, item.blockId), version, fullText, start, end),
        x: rect.left, y: rect.bottom });
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [enabled, chapterId, sourceSha256, version, structure, data, language, panel, showNote]);
  function dismissSelection() {
    setSelected(null); setShowNote(false);
    // Keep selection on web so user can still see highlighted text; on mobile handled separately
    if (Platform.OS !== 'web' && typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
  }
  async function mark(color?: HighlightColor) {
    if (!selected) return;
    const id = reposition ?? selected.annotationId;
    if (!await save(value => putAnnotation(value, selected.anchor, color, note, id))) return;
    setReposition(undefined); dismissSelection();
  }
  function translated(page: number, block: string, text: string) {
    return data.translations.filter(t => t.version === version && t.start === 0 && t.end === text.length &&
      anchorMatches(t, refFor(page, block), text)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.french ?? translations[JSON.stringify([page, block])];
  }
  useEffect(() => { return () => { audioRequest.current++; void audio.current?.stop(); }; }, []);
  useEffect(() => { if (!enabled) { audioRequest.current++; setAudioStatus(undefined); void audio.current?.stop(); } }, [enabled]);
  useEffect(() => {
    if (panel !== 'audio') return;
    let active = true; setVoicesLoading(true); setVoices([]);
    readingSpeechDriver(language).then(driver => driver.voices()).then(values => {
      if (active) setVoices(preferredVoices(values, language));
    }).catch(e => { if (active) setError(String(e)); }).finally(() => { if (active) setVoicesLoading(false); });
    return () => { active = false; };
  }, [panel, language]);
  const translationLock = useRef(false);
  async function translateScope(scope: 'selection' | 'paragraph' | 'section' | 'chapter') {
    if (manualTranslationOnly) { setError('Importez votre traduction JSON depuis le menu crayon.'); return; }
    if (!enabled || !loaded || translationLock.current) return;
    translationLock.current = true; setTranslating(true); setError('');
    const translator = getFreeTranslator();
    try {
      const visible = [...(sectionIndex === 0 ? structure.intro : []), ...(structure.sections[sectionIndex]?.items ?? [])];
      const candidates = (scope === 'chapter' ? items : visible).filter(i => !i.presentation.imageOnly && i.kind !== 'table' && i.part.role !== 'table' && i.presentation.text.trim());
      const paragraph = candidates.find(i => !['h2', 'h3', 'h4'].includes(i.kind ?? '') && i.part.role !== 'heading');
      const targets = scope === 'selection' ? (selected ? [selected.anchor] : []) :
        (scope === 'paragraph' ? (paragraph ? [paragraph] : []) : candidates)
          .filter(i => !translated(i.printedPage, i.blockId, i.presentation.text))
          .map(i => readingAnchor(refFor(i.printedPage, i.blockId), version, i.presentation.text, 0, i.presentation.text.length));
      for (const anchor of targets) {
        const french = await translator.translate(anchor.quote, 'ro', 'fr');
        if (!alive.current) return;
        const ok = await save(d => ({ ...d,
          preferences: { ...d.preferences, language: scope === 'selection' ? d.preferences.language : 'fr' },
          translations: [...d.translations.filter(x => !(x.version === anchor.version && anchorMatches(x, anchor, anchor.sourceText) && x.start === anchor.start && x.end === anchor.end)),
            { ...anchor, id: `tr-${Date.now()}-${Math.random().toString(36).slice(2)}`, french, provider: translator.name, updatedAt: new Date().toISOString(), warnings: [] }],
        }));
        if (!ok) return;
        if (scope !== 'selection') setLanguage('fr');
      }
      if (scope !== 'selection' && !targets.length && candidates.some(i => translated(i.printedPage, i.blockId, i.presentation.text))) changeLanguage('fr');
      setError(targets.length ? `${targets.length} passage(s) traduit(s) et enregistré(s).` : 'Aucun nouveau passage à traduire.');
    } catch (e) { setError(`${e instanceof Error ? e.message : String(e)} Les traductions déjà enregistrées sont conservées.`); }
    finally { translationLock.current = false; if (alive.current) setTranslating(false); }
  }
  function selectionTranslation() {
    if (!selected) return undefined;
    if (selected.language === 'fr') return selected.anchor.quote;
    const a = selected.anchor;
    return data.translations.filter(t => t.version === version && anchorMatches(t, a, a.sourceText) && t.start === a.start && t.end === a.end)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.french ??
      (a.start === 0 && a.end === a.sourceText.length ? translated(a.printedPage, a.blockId, a.sourceText) : undefined);
  }
  async function listen(scope: 'selection' | 'section' | 'chapter' | 'preview') {
    const request = ++audioRequest.current;
    try {
      await audio.current?.stop();
      const driver = await readingSpeechDriver(language);
      const voices = await driver.voices();
      if (!alive.current || request !== audioRequest.current) return;
      const compatible = preferredVoices(voices, language);
      const voice = compatible.find(v => v.id === (data.preferences.voices?.[language] ?? data.preferences.voice)) ?? compatible[0];
      if (!voice && Platform.OS !== 'web') throw new Error(`Aucune voix ${language === 'ro' ? 'roumaine' : 'française'} disponible sur cet appareil.`);
      let queue;
      if (scope === 'preview') {
        queue = [{ text: language === 'fr' ? 'Bonjour. Voici un aperçu de la voix utilisée pour la lecture du cours.' : 'Bună ziua. Aceasta este vocea folosită pentru lectura cursului.', section: sectionIndex, blockKey: 'voice-preview' }];
      } else if (scope === 'selection') {
        if (!selected) throw new Error('Sélectionnez un passage.');
        if (selected.language === 'fr' && language === 'ro') throw new Error('Sélectionnez le texte original en mode RO.');
        const text = selected.language === language ? selected.anchor.quote : selectionTranslation();
        if (!text) throw new Error('Traduction française du passage indisponible.');
        queue = splitSpeech(text).map(text => ({ text, section: sectionIndex, blockKey: selected.anchor.blockId }));
      } else {
        const convert = (item: CourseItem): CourseItem => {
          if (language === 'ro') return item;
          if (item.presentation.imageOnly || item.kind === 'table' || item.part.role === 'table' || item.part.role === 'figure') return { ...item, table: undefined };
          const french = translated(item.printedPage, item.blockId, item.presentation.text);
          if (!french && item.presentation.text.trim()) throw new Error('Traduction française de cette section indisponible.');
          return { ...item, presentation: { ...item.presentation, text: french ?? '' } };
        };
        const target = { ...structure, intro: scope === 'chapter' || sectionIndex === 0 ? structure.intro.map(convert) : [],
          sections: structure.sections.map((s, i) => ({ ...s, items: scope === 'chapter' || i === sectionIndex ? s.items.map(convert) : [] })) };
        queue = audioQueue(target, scope === 'section' ? sectionIndex : undefined);
      }
      audio.current = new ReadingAudioController(driver, status => {
        if (!alive.current || request !== audioRequest.current) return;
        setAudioStatus(status);
        if (scope === 'chapter' && status.state === 'playing') onSectionChange(status.section);
      });
      await audio.current.start(queue, voice?.id ?? "", data.preferences.rate);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

function CompactAudioPlayer() {
  const context = useCourseReading();
  if (!context) return null;
  const { language, changeLanguage, audioStatus, controlAudio, data, selected, enabled } = context as any;
  const [showSettings, setShowSettings] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voices, setVoices] = useState<ReadingVoice[]>([]);
  const audio = useRef<any>(null);
  const alive = useRef(true);
  const audioRequest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!showSettings) return;
    let active = true; setVoicesLoading(true); setVoices([]);
    readingSpeechDriver(language).then((driver: any) => driver.voices()).then((values: ReadingVoice[]) => {
      if (active) setVoices(preferredVoices(values, language));
    }).catch(() => {}).finally(() => { if (active) setVoicesLoading(false); });
    return () => { active = false; };
  }, [showSettings, language]);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt bold>Écouter</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ReadingAction label="Réglages" icon="settings-outline" onPress={() => setShowSettings(!showSettings)} />
          <ReadingAction label="Fermer" icon="close" onPress={() => context.openPanel(null)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <ReadingAction label="Sélection" onPress={() => void (context as any).listen('selection')} disabled={!selected} selected={false} />
        <ReadingAction label="Section" onPress={() => void (context as any).listen('section')} />
        <ReadingAction label="Chapitre" onPress={() => void (context as any).listen('chapter')} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <ReadingAction label="Précédent" icon="chevron-back" onPress={() => {}} disabled />
        <ReadingAction label={audioStatus?.state === 'playing' ? 'Pause' : 'Lecture'} icon={audioStatus?.state === 'playing' ? 'pause' : 'play'} onPress={() => controlAudio(audioStatus?.state === 'playing' ? 'pause' : audioStatus?.state === 'paused' ? 'resume' : 'section')} disabled={false} />
        <ReadingAction label="Stop" icon="stop" onPress={() => controlAudio('stop')} />
        <ReadingAction label="Suivant" icon="chevron-forward" onPress={() => {}} disabled />
        <ReadingAction label={`${data.preferences.rate}×`} onPress={async () => {
          const rates = [0.7, 0.85, 1, 1.15, 1.3];
          const i = rates.indexOf(data.preferences.rate); const next = rates[(i + 1) % rates.length];
          await (context as any).save((d: any) => ({ ...d, preferences: { ...d.preferences, rate: next } }));
          await context.setRate(next);
        }} />
      </View>
      {showSettings && <View style={{ gap: 4 }}>
        {voicesLoading && <Txt size={12}>Chargement…</Txt>}
        {voices.slice(0, 3).map((voice, index) => <ReadingAction key={voice.id} label={voice.name.slice(0, 30)} selected={voice.id === (data.preferences.voices?.[language] ?? voice.id)} onPress={() => { controlAudio('stop'); void (context as any).save((d: any) => ({ ...d, preferences: { ...d.preferences, voices: { ...d.preferences.voices, [language]: voice.id } } })); }} />)}
        <ReadingAction label="Aperçu" disabled={!voices.length} onPress={() => void (context as any).listen('preview')} />
      </View>}
      {!!audioStatus?.error && <Txt size={12}>{audioStatus.error}</Txt>}
    </View>
  );
}

  const stale = (a: ReadingAnnotation) => !items.some(item => (anchorMatches(a, refFor(item.printedPage, item.blockId), item.presentation.text) || anchorMatches(a, refFor(item.printedPage, item.blockId), translated(item.printedPage, item.blockId, item.presentation.text) ?? '')));
  const palette = selected && enabled && !panel ? <View style={{ backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 8, gap: 4, maxWidth: Math.min(width - 24, 340) }}>
    {!!error && <Txt size={12} color="#9b2c2c">{error}</Txt>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {(Object.keys(highlightColors) as HighlightColor[]).map(color => <Pressable key={color} accessibilityRole="button"
        accessibilityLabel={`Surligner en ${{ yellow: 'jaune', green: 'vert', pink: 'rose', blue: 'bleu' }[color]}`} disabled={!loaded} onPress={() => void mark(color)}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: highlightColors[color], borderWidth: 1, borderColor: c.line }} />
      </Pressable>)}
      <ReadingAction label="Écouter la sélection" icon="headset-outline" onPress={() => { openPanel('audio'); }} />
      <ReadingAction label="Traduire la sélection" icon="language-outline" onPress={() => { openPanel('translation'); }} />
      <ReadingAction label="Ajouter une note" icon="create-outline" onPress={() => setShowNote(!showNote)} />
      {selected.annotationId && <ReadingAction label="Supprimer l’annotation" icon="trash-outline" onPress={() => {
        const id = selected.annotationId!; void save(value => removeAnnotation(value, id)).then(ok => { if (ok) dismissSelection(); });
      }} />}
      <ReadingAction label="Fermer la sélection" icon="close" onPress={dismissSelection} />
    </View>
    {showNote && <>
      <TextInput accessibilityLabel="Note du passage" multiline value={note} onChangeText={setNote}
        style={{ color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 8, minHeight: 70, fontSize: 16 }} />
      <ReadingAction label="Enregistrer la note" onPress={() => void mark(data.annotations.find(a => a.id === selected.annotationId)?.color)} />
    </>}
  </View> : null;
  return <CourseReadingContext.Provider value={{ language, changeLanguage, audioStatus, controlAudio, translated, data, version, refFor, selected, select, enabled, openPanel, panel, listen, sectionIndex, structure, onSectionChange, save, setRate: async (rate:number) => await audio.current?.setRate(rate) }}>
    {children}
    {enabled && <View testID="course-reading-tools" style={{ gap: 4 }}>
      {!!error && <Txt size={12} color="#9b2c2c">{error}</Txt>}
    </View>}
    {palette && <CourseSelectionOverlay onClose={dismissSelection}
      x={Math.max(12, Math.min(selected?.x ?? 12, width - 352))}
      y={Math.max(12, Math.min((selected?.y ?? 80) + 8, height - (showNote ? 320 : 160)))}>{palette}</CourseSelectionOverlay>}
    {enabled && panel && <Modal transparent visible animationType="fade" onRequestClose={() => openPanel(null)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,.25)' }} onTouchEnd={() => openPanel(null)} onStartShouldSetResponder={() => true} onResponderRelease={() => openPanel(null)}>
        <View onTouchEnd={e => e.stopPropagation()} onStartShouldSetResponder={() => true} onResponderRelease={e => e.stopPropagation()}
          style={{ backgroundColor: c.paper, borderRadius: 12, padding: 10, width: '100%', maxWidth: 380, alignSelf: 'center', gap: 8 }}>
          {panel === 'audio' && <CompactAudioPlayer />}
          {panel === 'translation' && <View style={{ gap: 8 }}>
            {translatePanel}
            <Txt size={13} selectable>{selected ? selectionTranslation() ?? 'Traduction de ce passage indisponible.' : 'Mode FR : traductions enregistrées localement.'}</Txt>
            {!!error && <Txt size={12}>{error}</Txt>}
            {translating && <Txt size={12}>Traduction en cours…</Txt>}
            {!manualTranslationOnly && selected && <ReadingAction label="Traduire ce passage" onPress={() => void translateScope('selection')} disabled={translating || !loaded || selected.language === 'fr'} />}
            {!manualTranslationOnly && <ReadingAction label="Traduire un paragraphe" onPress={() => void translateScope('paragraph')} disabled={translating || !loaded} />}
            {!manualTranslationOnly && <ReadingAction label="Traduire la section" onPress={() => void translateScope('section')} disabled={translating || !loaded} />}
            {!manualTranslationOnly && <ReadingAction label="Traduire tout le chapitre" onPress={() => void translateScope('chapter')} disabled={translating || !loaded} />}
            <ReadingAction label="Fermer la traduction" onPress={() => openPanel(null)} />
          </View>}
        </View>
      </View>
    </Modal>}
  </CourseReadingContext.Provider>;
}

// The toolbar is rendered at the top of the reader, not outside its scroll/navigation layout.
export function CourseReadingToolbar() {
  const context = useCourseReading();
  if (!context?.enabled) return null;
  return <View accessibilityLabel="Outils du cours" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ReadingAction label="Écouter" icon="headset-outline" onPress={() => context.openPanel('audio')} selected={context.panel === 'audio'} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ReadingAction label="RO" onPress={() => context.changeLanguage('ro')} selected={context.language === 'ro'} />
      <ReadingAction label="FR" onPress={() => context.changeLanguage('fr')} selected={context.language === 'fr'} />
    </View>
  </View>;
}
