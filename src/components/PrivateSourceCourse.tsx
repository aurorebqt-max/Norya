import { PrivatePdfImport } from './PrivatePdfImport';
import { CourseReaderPane, courseParagraphStyle } from './CourseReaderPane';
import type { ReactNode } from 'react';
import { CourseReadingProgress } from './CourseReadingProgress';
import { CourseReaderNavigation } from './CourseReaderNavigation';
import { useLearning } from '../state/LearningProvider';
import { presentationKey, type FinalCourseVersion } from '../domain/sourceCourse/finalization';
import type { CoursePresentation } from '../domain/sourceCourse/displayCorrections';
import { SourcePresentationText } from './SourcePresentationText';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, Txt } from './ui';
import { colors as c } from '../design/theme';
import type { SourcePacket, SourcePage, SourcePart } from '../domain/sourceCourse/packet';
import type { BlockTable } from '../domain/sourceCourse/classification';
import { translationSnapshot } from '../domain/sourceCourse/translateBridge';
import { TranslateAdminPanel } from './TranslateAdminPanel';
import { importPrivateCourse, loadPrivateCourse, openOriginalPage } from '../services/storage/privateCourse';
import { SourceCourseVerification } from './SourceCourseVerification';
import { loadValidation, type ChapterValidation } from '../domain/sourceCourse/verification';
import { workingPresentation } from '../domain/sourceCourse/blockEdits';
import { sourcePresentation } from '../domain/sourceCourse/displayCorrections';
import { mergeAtAnchor } from '../domain/sourceCourse/merges';
import { buildCourseStructure, type CourseItem, type CourseOutlineItem, type CourseStructure } from '../domain/sourceCourse/courseStructure';
import { CourseHeading, CourseTable } from './CourseBlocks';
import { activeAssociations, type ManualAssociation } from '../domain/sourceCourse/associations';
import { CourseReadingProvider, CourseReadingToolbar, useCourseReading } from './CourseReadingTools';
import { CourseReadingText } from './CourseReadingText';

type Mode = 'Cours reconstitué' | 'Pages originales' | 'Vérification manuelle';
const roles: Record<string,string> = { heading:'Titre', paragraph:'Paragraphe', list:'Liste', table:'Tableau',
  figure:'Illustration', box:'Encadré', contents:'Sommaire original', 'chapter-title':'Titre du chapitre',
  'section-title':'Titre de section', 'page-header':'En-tête original', 'uncertain-text':'Passage incertain' };
const reasons: Record<string,string> = {
  'original-visual-retained':'Visuel conservé pour préserver sa structure.',
  'source-glyph-ambiguity':'Un symbole de la couche texte est ambigu.',
  'superscript-layout':'Exposants : mise en page originale conservée.',
  'independent-extractor-disagreement':'Les extracteurs produisent des résultats différents.',
  'multiple-text-lanes':'Plusieurs axes de texte dans le même bloc.',
  'unrecognized-character':'Caractère non reconnu.', 'repeated-block-candidate':'Répétition possible à examiner.',
  'numbers-or-units-to-visually-check':'Chiffres et unités à comparer au livre.',
  'table-box-or-figure-reference':'Référence à un tableau, encadré ou schéma.',
};
function OriginalVisual({ image, ratio, wide, label }: { image:string; ratio:number; wide:boolean; label:string }) {
  const [container, setContainer] = useState(280);
  const [zoom, setZoom] = useState(false);
  const size = zoom ? Math.max(container * 1.5, 1000) : wide ? Math.max(container, 720) : container;
  return <View style={{ gap:8, maxWidth:'100%' }} onLayout={e => setContainer(e.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator testID="source-visual-scroll">
      <Image source={{uri:image}} accessibilityLabel={label} resizeMode="contain" style={{width:size,height:size*ratio}} />
    </ScrollView>
    <Pressable accessibilityRole="button" onPress={() => setZoom(!zoom)} style={{paddingVertical:8}}>
      <Txt size={12} color={c.primary}>{zoom ? 'Réduire le visuel' : 'Agrandir le visuel'}{wide ? ' · défilement horizontal' : ''}</Txt>
    </Pressable>
  </View>;
}
function Part({ chapterId, part, printed, pdf, original, showAsText, frozen, validation, associations = [], onAssociation }: {
  chapterId?: string; frozen?: CoursePresentation; validation?: ChapterValidation | null; part: SourcePart; printed: number; pdf: number;
  original: () => void; showAsText?: boolean; associations?: ManualAssociation[]; onAssociation?: (value: ManualAssociation) => void;
}) {
  const [compare, setCompare] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const base = frozen ?? sourcePresentation(printed, part);
  const presentation = frozen ? (base.hide ? null : base) : workingPresentation(printed, part, validation, chapterId);
  if (!presentation || (showAsText && presentation.hide)) return null;
  const merge = mergeAtAnchor(validation?.merges, printed, part.id);
  const showImage = showAsText ? presentation.imageOnly : (part.kind === 'visual' || compare);
  const heading = part.role === 'heading';
  return <View testID={`source-part-${part.id}`} style={courseParagraphStyle}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <Txt size={11} color={c.muted}>{roles[part.role] ?? 'Élément source'} · p. {printed} · {showAsText ? (presentation.imageOnly ? 'Illustration médicale' : (merge ? 'Texte fusionné' : 'Texte')) : (part.kind === 'visual' ? 'Visuel original' : 'Texte extrait')}</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`PDF ${pdf}, ${part.id}`} onPress={original}><Txt size={11} color={c.primary}>Voir dans le PDF ↗</Txt></Pressable>
    </View>
    {showImage ? <OriginalVisual image={part.image} ratio={(part.bbox[3] - part.bbox[1]) / (part.bbox[2] - part.bbox[0])}
      wide={['table', 'contents', 'box'].includes(part.role)} label={`${roles[part.role]} original, page ${printed}`} />
      : <View>
        {showAsText ? <CourseReadingText presentation={presentation} printedPage={printed} blockId={part.id}
          associations={associations} heading={heading} onAssociation={onAssociation} /> : (
          <Text selectable accessibilityRole={heading ? 'header' : undefined} testID="source-original-text" style={{ fontSize: heading ? 23 : 17, lineHeight: heading ? 32 : 29, color: c.ink, fontWeight: heading ? '600' : '400' }}>{part.text}</Text>
        )}
        {merge && showAsText && <>
          <Pressable accessibilityRole="button" onPress={() => setShowSources(!showSources)} style={{ paddingVertical: 6 }}>
            <Txt size={12} color={c.primary}>{showSources ? 'Masquer les sources de la fusion' : 'Voir les sources de la fusion'}</Txt>
          </Pressable>
          {showSources && merge.sourceTexts.map((text, i) => <View key={i} style={{ padding: 10, backgroundColor: c.mint, borderRadius: 8, gap: 4 }}>
            <Txt size={11} bold>Source {i + 1} · p. {merge.sources[i].printedPage} · {merge.sources[i].blockId}</Txt>
            <Text selectable style={{ color: c.ink, fontSize: 14, lineHeight: 22 }}>{text}</Text>
          </View>)}
        </>}
      </View>}
    {!showAsText && (part.kind === 'text' || part.text) && <Pressable accessibilityRole="button" onPress={() => setCompare(!compare)} style={{ paddingVertical: 6 }}>
      <Txt size={12} color={c.primary}>{compare ? 'Revenir au texte extrait' : 'Comparer ce passage au visuel original'}</Txt>
    </Pressable>}
  </View>;
}

/** Shared private reader; review decisions remain separate from learning progress. */
export function PrivateSourceCourse({ managementAction, managementMenu, chapterId = 'kum-08', initialReview = false, finalizedVersion, initialPacket, onPacketLoaded, onStructure, reviewTarget }: {
  managementAction?: ReactNode; managementMenu?: ReactNode; chapterId?: string; initialReview?: boolean; finalizedVersion?: FinalCourseVersion; initialPacket?: SourcePacket;
  onPacketLoaded?: (packet: SourcePacket | null) => void;
  /** Titre H1, auteurs et sections du cours, pour l'en-tête du chapitre. */
  onStructure?: (structure: CourseStructure) => void;
  reviewTarget?: { printedPage?: number; blockId?: string; nonce: number };
} = {}) {
  const { learning } = useLearning();
  const resumed = useRef(false);
  const [packet,setPacket]=useState<SourcePacket|null>((finalizedVersion?.packet as SourcePacket) ?? initialPacket ?? null);
  const [index,setIndex]=useState(0);
  const [mode,setMode]=useState<Mode>(initialReview ? 'Vérification manuelle' : 'Cours reconstitué');
  const [busy,setBusy]=useState(true);
  const [pdfImport, setPdfImport] = useState(false);
  const [error,setError]=useState('');
  const [sectionIndex,setSectionIndex]=useState(0);
  const [outlineOpen,setOutlineOpen]=useState(false);
  const [outlineTarget,setOutlineTarget]=useState<string | null>(null);
  const [inspector, setInspector] = useState<CourseItem | null>(null);
  const [contentWidth,setContentWidth]=useState(900);
  const [controlReport, setControlReport] = useState<any>(null);
  const [validation, setValidation] = useState<ChapterValidation | null>(finalizedVersion?.validation ?? null);
  const scroll=useRef<ScrollView>(null);
  const itemOffsets=useRef(new Map<string,number>());
  const {height}=useWindowDimensions();

  useEffect(()=>{
    let active=true;
    const loading = finalizedVersion ? Promise.resolve(finalizedVersion.packet as SourcePacket)
      : loadPrivateCourse(chapterId).then(value => value ?? initialPacket ?? null);
    loading.then(async value=>{
      if(!active) return;
      setPacket(value);onPacketLoaded?.(value);if(value?.schemaVersion===1)setMode('Pages originales');
      if (!finalizedVersion && value?.chapterId) {
        try {
          const saved = await loadValidation(value.chapterId);
          if (active) setValidation(saved ?? null);
        } catch { /* lecture seule : l'absence de fusions ne bloque pas le cours */ }
      }
    })
      .catch(reason=>{if(active)setError(String(reason));}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[]);
  useEffect(() => { if (reviewTarget && !finalizedVersion) setMode('Vérification manuelle'); }, [reviewTarget]);
  // Recharger les fusions à la sortie de la vérification manuelle.
  useEffect(() => {
    if (finalizedVersion || mode === 'Vérification manuelle' || !packet?.chapterId) return;
    let active = true;
    loadValidation(packet.chapterId).then(saved => { if (active) setValidation(saved ?? null); }).catch(() => {});
    return () => { active = false; };
  }, [mode, packet?.chapterId, finalizedVersion]);
  async function pick(){
    setBusy(true);setError('');
    try{const value=await importPrivateCourse(chapterId);if(value){setPacket(value);onPacketLoaded?.(value);setIndex(0);setMode(value.schemaVersion===2?(initialReview?'Vérification manuelle':'Cours reconstitué'):'Pages originales');}}
    catch(reason){setError(reason instanceof Error?reason.message:'Import impossible.');}
    finally{setBusy(false);}
  }
  const page=packet?.pages[index];
  const wide=contentWidth>=900;
  const activeValidation=finalizedVersion ? finalizedVersion.validation : validation;
  const structure=useMemo(()=>buildCourseStructure(packet,activeValidation,finalizedVersion?.presentations),[packet,activeValidation,finalizedVersion]);
  const translateSnapshot = useMemo(() => process.env.EXPO_PUBLIC_NORYA_TRANSLATE_ENABLED === 'true' && packet?.schemaVersion === 2
    ? translationSnapshot(packet, activeValidation, finalizedVersion?.presentations) : null, [packet, activeValidation, finalizedVersion]);
  useEffect(()=>{ if(packet) onStructure?.(structure); },[structure]);
  useEffect(() => {
    if (resumed.current || !structure.sections.length) return;
    resumed.current = true;
    const at = structure.sections.findIndex(s => s.id === learning.reading[chapterId]?.sourceSection);
    if (at >= 0) setSectionIndex(at);
  }, [structure, chapterId, learning.reading]);
  const sectionCount=structure.sections.length;
  const sectionAt=Math.min(sectionIndex,Math.max(0,sectionCount-1));
  const shown: CourseItem[]=sectionCount
    ? [...(sectionAt===0 ? structure.intro : []),...structure.sections[sectionAt].items]
    : structure.intro;
  const associationList = activeAssociations(activeValidation);
  function changePage(next:number){setIndex(next);scroll.current?.scrollTo({y:0,animated:false});}
  function changeSection(next:number){setSectionIndex(Math.max(0,Math.min(sectionCount-1,next)));scroll.current?.scrollTo({y:0,animated:false});}
  function openOutlineItem(item: CourseOutlineItem) {
    const targetSection = structure.sections.findIndex(section => section.id === item.sectionId);
    if (targetSection < 0) return;
    setOutlineTarget(item.key);
    setOutlineOpen(false);
    changeSection(targetSection);
  }
  function registerItemOffset(item: CourseItem, y: number) {
    itemOffsets.current.set(item.key, y);
    if (outlineTarget === item.key) {
      scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      setOutlineTarget(null);
    }
  }
  function openAssociation(value: ManualAssociation) {
    if (typeof window !== 'undefined' && window.getSelection?.()?.toString()) return;
    if (value.state !== 'active') { setError('Cette association doit être revue dans la vérification manuelle.'); return; }
    const destination = [...structure.intro, ...structure.sections.flatMap(section => section.items)]
      .find(item => item.printedPage === value.target.printedPage && item.blockId === value.target.blockId);
    if (!destination) { setError('Destination d’association indisponible : réassociation manuelle requise.'); return; }
    setError('');
    setInspector(destination);
  }
  function open(target:SourcePage|undefined=page){if(target)void openOriginalPage(target).catch(reason=>setError(String(reason)));}
  const pageOf=(item:CourseItem)=>packet?.pages.find(p=>p.printedPage===item.printedPage);
  const sectionNav = <CourseReaderNavigation structure={structure} index={sectionAt} onChange={changeSection} />;
  const courseOutline = null;
  return <CourseReadingProvider key={`${packet?.chapterId}-${packet?.sourceSha256}`} chapterId={packet?.chapterId ?? ''}
    translatePanel={translateSnapshot ? <TranslateAdminPanel snapshot={translateSnapshot} eligible={!!finalizedVersion} /> : undefined}
    sourceSha256={packet?.sourceSha256 ?? ''} version={finalizedVersion ? String(finalizedVersion.version) : 'draft'}
    structure={structure} sectionIndex={sectionAt} onSectionChange={changeSection} enabled={mode === 'Cours reconstitué' && !!packet}>
    <Card>
    <View testID="private-source-reader" onLayout={e=>setContentWidth(e.nativeEvent.layout.width)} style={{gap:16,minWidth:0}}>
      {!finalizedVersion && <Txt size={12} color={c.muted}>Chapitre non finalisé · cours numérique en préparation : la fidélité de chaque passage reste à vérifier par rapport au PDF original.</Txt>}
      {!finalizedVersion && !packet && <Button title="Importer un cours privé (PDF)" disabled={busy} onPress={() => setPdfImport(true)} />}
      {pdfImport && <PrivatePdfImport chapterId={chapterId} onClose={() => setPdfImport(false)} onImported={value => { setPacket(value); onPacketLoaded?.(value); setValidation(null); setIndex(0); setSectionIndex(0); setMode('Vérification manuelle'); setPdfImport(false); }} />}
      {!finalizedVersion && true && <Button title={packet?'Importer une nouvelle version du cours (JSON)':'Importer le cours structuré (JSON)'} secondary disabled={busy} onPress={()=>void pick()} />}
      {!!error&&<Txt>{error}</Txt>}
      {packet?.schemaVersion===1&&<View style={{backgroundColor:'#FFF3CD',padding:14,borderRadius:12,gap:8,marginVertical:12}}>
        <Txt bold size={13} color={'#856404'}>⚠️ Version obsolète du paquet</Txt>
        <Txt size={13}>Ce paquet contient seulement les pages originales (mode facsimile). Pour accéder au cours structuré avec texte natif, importez le fichier :</Txt>
        <Txt size={13}><Txt bold>norya-private-course-</Txt>v2.json</Txt>
        <Txt size={12}>Ce fichier se trouve dans : le dossier privé du chapitre</Txt>
      </View>}
      {page&&<>
        {(finalizedVersion ? false : true)&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(['Cours reconstitué','Pages originales', packet?.schemaVersion===2 ? 'Vérification manuelle' : null].filter(Boolean) as Mode[]).map(value=>
          <Chip key={value} label={value} selected={mode===value} onPress={()=>{setMode(value);scroll.current?.scrollTo({y:0,animated:false});}} />)}</View>}
        {finalizedVersion&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center'}}>{(['Cours reconstitué','Pages originales'] as Mode[]).map(value=>
          <Chip key={value} label={value==='Cours reconstitué'?'Cours':value} selected={mode===value} onPress={()=>{setMode(value);scroll.current?.scrollTo({y:0,animated:false});}} />)}{managementAction}</View>}
        {managementMenu}
        {mode==='Pages originales'&&<View style={{gap:10,borderBottomWidth:1,borderBottomColor:c.line,paddingBottom:14}}>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
            <Txt bold>Page {page.printedPage} du livre · PDF {page.pdfPage}</Txt>
            <Pressable accessibilityRole="button" onPress={()=>open()}><Txt color={c.primary} size={13}>Ouvrir la page PDF ↗</Txt></Pressable>
          </View>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>{packet.pages.map((p,i)=><Pressable accessibilityRole="button" accessibilityLabel={`Page ${p.printedPage}`} accessibilityState={{selected:index===i}} key={p.printedPage} onPress={()=>changePage(i)} style={{padding:9,minWidth:40,borderRadius:8,backgroundColor:index===i?c.primary:c.mint}}>
            <Txt size={12} color={index===i?'white':c.ink}>{p.printedPage}</Txt></Pressable>)}</View>
        </View>}
        {mode==='Cours reconstitué'&&<CourseReadingToolbar />}
        {mode==='Cours reconstitué'&&courseOutline}
        {mode==='Cours reconstitué'&&sectionNav}
        {mode!=='Vérification manuelle'&&<CourseReaderPane ref={scroll} contentKey={`${mode}-${sectionAt}-${index}`}>
            {mode==='Pages originales'&&<OriginalVisual image={page.image} ratio={page.height/page.width} wide={false} label={`Page originale ${page.printedPage}`} />}
            {mode==='Cours reconstitué'&&!shown.length&&<Txt>{packet.schemaVersion===2?'Aucun contenu à afficher pour cette section.':'Importez le paquet structuré pour afficher le cours.'}</Txt>}
            {mode==='Cours reconstitué'&&shown.map(item=>{
              const heading=item.kind==='h2'||item.kind==='h3'||item.kind==='h4' ? item.kind : undefined;
              const digital=item.kind==='table'&&item.table?.validated&&!item.table.keepOriginal ? item.table : undefined;
              return <View key={item.key} testID={`course-item-${item.blockId}`} onLayout={event=>registerItemOffset(item,event.nativeEvent.layout.y)}>
                {heading && !associationList.some(value => value.source.printedPage === item.printedPage && value.source.blockId === item.blockId) ? <CourseReadingText level={heading} presentation={item.presentation} printedPage={item.printedPage} blockId={item.blockId} />
                  : digital ? <TableItem item={item} table={digital} onOpen={()=>open(pageOf(item))} />
                  : <AssociatedPart chapterId={packet.chapterId} part={item.part} printed={item.printedPage} pdf={item.pdfPage} original={()=>open(pageOf(item))} showAsText={true}
                    validation={activeValidation}
                    frozen={finalizedVersion?.presentations[presentationKey(item.printedPage, item.blockId)]}
                    associations={associationList.filter(value => value.source.printedPage === item.printedPage && value.source.blockId === item.blockId)}
                    onAssociation={openAssociation} />}
              </View>;
            })}
            {mode==='Cours reconstitué' && <CourseReadingProgress chapterId={chapterId} structure={structure} index={sectionAt} next={changeSection} />}
        </CourseReaderPane>}
        {inspector && <Modal visible transparent animationType="fade" onRequestClose={() => setInspector(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.paper, borderRadius: 14, padding: 16, gap: 10, maxHeight: '90%', width: '100%', maxWidth: 900, alignSelf: 'center' }}>
            <Txt bold>Destination associée · p. {inspector.printedPage} · {inspector.blockId}</Txt>
            <Button title="Fermer l’inspecteur" secondary onPress={() => setInspector(null)} />
            <Txt size={12} color={c.muted}>Fermez cette référence pour revenir au même passage du cours.</Txt>
            <ScrollView nestedScrollEnabled style={{ flexShrink: 1 }}>
            {inspector.kind === 'table' && inspector.table?.validated && !inspector.table.keepOriginal ? <CourseTable table={inspector.table} />
              : !(inspector.presentation.imageOnly || inspector.part.role === 'figure' || inspector.part.role === 'table')
                ? <SourcePresentationText presentation={inspector.presentation} heading={inspector.part.role === 'heading'} /> : null}
            {(inspector.presentation.imageOnly || inspector.part.role === 'figure' || inspector.part.role === 'table' || inspector.kind === 'table') &&
            <OriginalVisual image={inspector.part.image} ratio={(inspector.part.bbox[3] - inspector.part.bbox[1]) / Math.max(1, inspector.part.bbox[2] - inspector.part.bbox[0])} wide label={`Destination originale p. ${inspector.printedPage}`} />
            }
            </ScrollView>
          </View>
          </View>
        </Modal>}
        {mode==='Pages originales'&&<View style={{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
          <Button title="Page précédente" secondary disabled={index===0} onPress={()=>changePage(index-1)} />
          <Button title="Page suivante" secondary disabled={index===(packet?.pages.length ?? 1)-1} onPress={()=>changePage(index+1)} />
        </View>}
      </>}
      {mode==='Vérification manuelle' && packet?.schemaVersion===2 && !finalizedVersion && (
        <SourceCourseVerification
          packet={packet}
          initialTarget={reviewTarget}
          controlReport={controlReport}
          onClose={() => setMode('Cours reconstitué')}
        />
      )}
    </View>
  </Card></CourseReadingProvider>;
}

function AssociatedPart(props: Parameters<typeof Part>[0] & { associations: ManualAssociation[]; onAssociation: (value: ManualAssociation) => void }) {
  const { associations, onAssociation, ...partProps } = props;
  return <View style={{ gap: 6 }}>
    <Part {...partProps} associations={associations} onAssociation={onAssociation} />
    {associations.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {associations.map(value => <Pressable key={value.id} accessibilityRole="link" onPress={() => onAssociation(value)}
        style={{ paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: value.state === 'active' ? c.mint : '#FFF3CD' }}>
        <Txt size={12} color={c.primary}>↗ {value.anchor.text} {value.state === 'active' ? '' : '(à réassocier)'}</Txt>
      </Pressable>)}
    </View>}
  </View>;
}

function AnchoredText({ text, associations, heading, onAssociation }: { text: string; associations: ManualAssociation[]; heading: boolean; onAssociation: (value: ManualAssociation) => void }) {
  const anchors = associations.filter(value => value.state === 'active' && text.slice(value.anchor.start, value.anchor.end) === value.anchor.text)
    .sort((a, b) => a.anchor.start - b.anchor.start || a.anchor.end - b.anchor.end);
  const pieces: Array<string | ManualAssociation> = []; let cursor = 0;
  for (const value of anchors) {
    if (value.anchor.start < cursor) continue;
    if (value.anchor.start > cursor) pieces.push(text.slice(cursor, value.anchor.start));
    pieces.push(value); cursor = value.anchor.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return <Text selectable style={{ fontSize: heading ? 23 : 17, lineHeight: heading ? 32 : 29, color: c.ink, fontWeight: heading ? '600' : '400' }}>
    {pieces.map((piece, index) => typeof piece === 'string' ? piece : <Text key={`${piece.id}-${index}`} accessibilityRole="link" onPress={() => onAssociation(piece)}
      style={{ color: c.primary, textDecorationLine: 'underline' }}>{piece.anchor.text}</Text>)}
  </Text>;
}

function TableItem({ item, table, onOpen }: { item: CourseItem; table: BlockTable; onOpen: () => void }) {
  const [original, setOriginal] = useState(false);
  const reading = useCourseReading();
  if (reading?.language === 'fr') return <Txt size={13}>Traduction française du tableau indisponible.</Txt>;
  return <View style={{ gap: 8, paddingVertical: 14 }}>
    <CourseTable table={table} />
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <Pressable accessibilityRole="button" onPress={() => setOriginal(!original)}><Txt size={12} color={c.primary}>{original ? 'Masquer l’image originale' : 'Comparer à l’image originale'}</Txt></Pressable>
      <Pressable accessibilityRole="button" onPress={onOpen}><Txt size={12} color={c.primary}>Voir dans le PDF ↗ (p. {item.printedPage})</Txt></Pressable>
    </View>
    {original && <OriginalVisual image={item.part.image} ratio={(item.part.bbox[3] - item.part.bbox[1]) / Math.max(1, item.part.bbox[2] - item.part.bbox[0])} wide label={`Tableau original, page ${item.printedPage}`} />}
  </View>;
}
