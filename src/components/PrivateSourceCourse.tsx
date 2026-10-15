import { SourcePresentationText } from './SourcePresentationText';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, Txt } from './ui';
import { colors as c } from '../design/theme';
import type { SourcePacket, SourcePart } from '../domain/sourceCourse/packet';
import { importPrivateCourse, loadPrivateCourse, openOriginalPage } from '../services/storage/privateCourse';
import { SourceCourseVerification } from './SourceCourseVerification';
import { loadChapterValidation } from '../services/storage/sourceValidation';
import { sourcePresentation } from '../domain/sourceCourse/displayCorrections';

type Mode = 'Cours reconstitué' | 'À vérifier' | 'Pages originales' | 'Vérification manuelle';
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
function Part({ part, printed, pdf, original, showAsText }: {part:SourcePart;printed:number;pdf:number;original:()=>void;showAsText?:boolean}) {
  const [compare, setCompare] = useState(false);
  // Dans le cours Norya (showAsText=true), on affiche TOUT comme texte SAUF les vraies illustrations
  // Une VRAIE illustration est un bloc avec role='figure' ET texte court (schémas chimiques avec symboles)
  // Les blocs 'figure' ou 'table' avec du texte long sont en réalité des tableaux/listes à afficher en texte
  const presentation = sourcePresentation(printed, part);
  if (showAsText && presentation.hide) return null;
  const isTrueIllustration = part.role === 'figure' && part.text && part.text.trim().length < 200;
  const showImage = showAsText ? (isTrueIllustration || presentation.imageOnly) : (part.kind === 'visual' || compare);
  const heading=part.role==='heading';
  return <View testID={`source-part-${part.id}`} style={{gap:10,paddingVertical:18,borderBottomWidth:1,borderBottomColor:c.line}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
      <Txt size={11} color={c.muted}>{roles[part.role] ?? 'Élément source'} · p. {printed} · {showAsText ? (isTrueIllustration ? 'Illustration médicale' : 'Texte') : (part.kind==='visual' ? 'Visuel original' : 'Texte extrait')}</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`PDF ${pdf}, ${part.id}`} onPress={original}><Txt size={11} color={c.primary}>Voir dans le PDF ↗</Txt></Pressable>
    </View>
    {showImage ? <OriginalVisual image={part.image} ratio={(part.bbox[3]-part.bbox[1])/(part.bbox[2]-part.bbox[0])}
      wide={['table','contents','box'].includes(part.role)} label={`${roles[part.role]} original, page ${printed}`} />
      : showAsText && presentation.contents ? <View style={{flexDirection:'row',gap:18,flexWrap:'wrap'}}>
        {presentation.contents.map((column, ci) => <View key={ci} style={{flex:1,minWidth:245,gap:5}}>
          {column.map((entry, ri) => <View key={ri} style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
            <Text selectable style={{color:c.ink,fontSize:14,flex:1}}>{entry.label}</Text>
            <Text selectable style={{color:c.ink,fontSize:14,minWidth:28,textAlign:'right'}}>{entry.page}</Text>
          </View>)}
        </View>)}
      </View>
      : <View style={{borderLeftWidth: part.reasons.length>0 ? 3 : 0, borderLeftColor: c.peach, paddingLeft: part.reasons.length>0 ? 8 : 0}}>
        {showAsText ? <SourcePresentationText presentation={presentation} heading={heading} /> : (
          <Text selectable accessibilityRole={heading ? 'header' : undefined} testID="source-original-text" style={{fontSize:heading?23:17,lineHeight:heading?32:29,color:c.ink,fontWeight:heading?'600':'400'}}>{part.text}</Text>
        )}
        {part.reasons.length>0 && showAsText && <Txt size={10} color={c.peach} style={{marginTop:4}}>⚠️ Passage à vérifier</Txt>}
      </View>}
    {!showAsText && (part.kind==='text' || part.text) && <Pressable accessibilityRole="button" onPress={()=>setCompare(!compare)} style={{paddingVertical:6}}>
      <Txt size={12} color={c.primary}>{compare?'Revenir au texte extrait':'Comparer ce passage au visuel original'}</Txt>
    </Pressable>}
  </View>;
}

/** Private source reader; navigation is ephemeral and never updates learning/progress. */
export function PrivateSourceCourse() {
  const [packet,setPacket]=useState<SourcePacket|null>(null);
  const [index,setIndex]=useState(0);
  const [mode,setMode]=useState<Mode>('Cours reconstitué');
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [toc,setToc]=useState(false);
  const [contentWidth,setContentWidth]=useState(900);
  const [controlReport, setControlReport] = useState<any>(null);
  const [verificationVisible, setVerificationVisible] = useState(false);
  const scroll=useRef<ScrollView>(null);
  const positions=useRef<Record<string,number>>({});
  const {height}=useWindowDimensions();
  
  // Charger le control-report localement si on est en mode v2
  useEffect(() => {
    if (packet?.schemaVersion === 2 && !controlReport) {
      // Essayer de charger depuis le filesystem local (dans Codespaces/dev)
      // Ce n'est pas nécessaire en production, seulement pour le développement
      // En production, le control-report sera chargé via importPrivateCourse
      const loadReport = async () => {
        try {
          // Sur mobile, on ne peut pas accéder directement au filesystem
          // Le rapport doit être inclus dans le paquet ou chargé séparément
          // Pour l'instant, on laisse controlReport à null et on désactive le mode vérification
          // Le mode vérification sera activé quand on passera explicitement le rapport
        } catch {
          // Ignorer
        }
      };
      loadReport();
    }
  }, [packet, controlReport]);
  
  useEffect(()=>{
    let active=true;
    loadPrivateCourse().then(value=>{if(active){setPacket(value);if(value?.schemaVersion===1)setMode('Pages originales');}})
      .catch(reason=>{if(active)setError(String(reason));}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[]);
  async function pick(){
    setBusy(true);setError('');
    try{const value=await importPrivateCourse();if(value){setPacket(value);setIndex(0);setMode(value.schemaVersion===2?'Cours reconstitué':'Pages originales');}}
    catch(reason){setError(reason instanceof Error?reason.message:'Import impossible.');}
    finally{setBusy(false);}
  }
  const page=packet?.pages[index];
  const parts=page?.parts ?? [];
  const wide=contentWidth>=900;
  function changePage(next:number){setIndex(next);positions.current={};scroll.current?.scrollTo({y:0,animated:false});}
  function open(){if(page)void openOriginalPage(page).catch(reason=>setError(String(reason)));}
  const sections=parts.filter(part=>part.role==='heading'||part.kind==='visual'&&part.role!=='page-header');
  const menu=<View style={{gap:8}}>
    <Txt bold size={13}>Sur cette page</Txt>
    {sections.map(part=><Pressable key={part.id} accessibilityRole="button" onPress={()=>{setMode('Cours reconstitué');setToc(false);requestAnimationFrame(()=>scroll.current?.scrollTo({y:positions.current[part.id]??0,animated:true}));}} style={{paddingVertical:8,paddingHorizontal:10,borderLeftWidth:2,borderLeftColor:c.line}}>
      <Txt size={12}>{part.role==='heading'?part.text:(part.text&&part.text.trim()?(part.text.length>50?part.text.substring(0,47)+'…':part.text):(roles[part.role]??'Passage original'))}</Txt>
    </Pressable>)}
  </View>;
  return <Card>
    <View testID="private-source-reader" onLayout={e=>setContentWidth(e.nativeEvent.layout.width)} style={{gap:16,minWidth:0}}>
      <View style={{gap:5}}>
        <Txt size={12} color={c.primary} bold>KUMAR · CHAPITRE 8 · ROUMAIN</Txt>
        <Txt size={27} bold>Cours source</Txt>
        <View style={{backgroundColor:'#FFF4DD',padding:14,borderRadius:12,gap:4}}>
          <Txt bold size={13}>Chapitre non validé</Txt>
          <Txt size={13}>Cours numérique reconstruit. Toutes les informations sont présentées sous forme de texte natif. La fidélité de chaque passage reste à vérifier par rapport au PDF original.</Txt>
        </View>
      </View>
      <Button title={packet?'Importer une nouvelle version privée':'Importer le cours privé'} secondary disabled={busy} onPress={()=>void pick()} />
      {!!error&&<Txt>{error}</Txt>}
      {packet?.schemaVersion===1&&<View style={{backgroundColor:'#FFF3CD',padding:14,borderRadius:12,gap:8,marginVertical:12}}>
        <Txt bold size={13} color={'#856404'}>⚠️ Version obsolète du paquet</Txt>
        <Txt size={13}>Ce paquet contient seulement les pages originales (mode facsimile). Pour accéder au cours structuré avec texte natif, importez le fichier :</Txt>
        <Txt size={13}><Txt bold>norya-private-course-</Txt>v2.json</Txt>
        <Txt size={12}>Ce fichier se trouve dans : references-privees/cours/kum-08/v1/</Txt>
      </View>}
      {packet?.schemaVersion===2&&(
        <View style={{backgroundColor:'#E8F4FD',padding:14,borderRadius:12,gap:8,marginVertical:12}}>
          <Txt bold size={13} color={c.primary}>🔍 Vérification manuelle</Txt>
          <Txt size={13}>
            {controlReport 
              ? 'Sélectionnez le mode "Vérification manuelle" pour contrôler la fidélité du texte extrait.'
              : 'Pour activer la vérification, importez un paquet contenant le rapport de contrôle.'
            }
          </Txt>
          <Txt size={12}>Priorités : Pages 162, 152-157, 163-164</Txt>
        </View>
      )}
      {page&&<>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(['Cours reconstitué','À vérifier','Pages originales', packet?.schemaVersion===2 ? 'Vérification manuelle' : null].filter(Boolean) as Mode[]).map(value=>
          <Chip key={value} label={value} selected={mode===value} onPress={()=>{setMode(value);scroll.current?.scrollTo({y:0,animated:false});}} />)}</View>
        <View style={{gap:10,borderBottomWidth:1,borderBottomColor:c.line,paddingBottom:14}}>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
            <Txt bold>Page {page.printedPage} du livre · PDF {page.pdfPage}</Txt>
            <Pressable accessibilityRole="button" onPress={open}><Txt color={c.primary} size={13}>Ouvrir la page PDF ↗</Txt></Pressable>
          </View>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>{packet.pages.map((p,i)=><Pressable accessibilityRole="button" accessibilityLabel={`Page ${p.printedPage}`} accessibilityState={{selected:index===i}} key={p.printedPage} onPress={()=>changePage(i)} style={{padding:9,minWidth:40,borderRadius:8,backgroundColor:index===i?c.primary:c.mint}}>
            <Txt size={12} color={index===i?'white':c.ink}>{p.printedPage}</Txt></Pressable>)}</View>
        </View>
        {!wide&&mode==='Cours reconstitué'&&<Button title={toc?'Masquer les sections':'Sections de cette page'} secondary onPress={()=>setToc(!toc)} />}
        {!wide&&toc&&menu}
        <View style={{flexDirection:wide?'row':'column',gap:22,minWidth:0}}>
          {wide&&mode==='Cours reconstitué'&&<View style={{width:190}}>{menu}</View>}
          <ScrollView ref={scroll} testID="source-reading-pane" nestedScrollEnabled style={{flex:1,height:Math.max(420,Math.min(height*.74,900)),minWidth:0}} contentContainerStyle={{paddingHorizontal:4,paddingBottom:24}}>
            <View key={`${index}-${mode}`} style={{maxWidth:760,width:'100%',alignSelf:'center'}}>
              {mode==='Pages originales'&&<OriginalVisual image={page.image} ratio={page.height/page.width} wide={false} label={`Page originale ${page.printedPage}`} />}
              {mode==='Cours reconstitué'&&!parts.length&&<Txt>Importez le paquet structuré pour afficher le cours.</Txt>}
              {mode==='Cours reconstitué'&&parts.map(part=><View key={part.id} onLayout={e=>{positions.current[part.id]=e.nativeEvent.layout.y;}}>
                <Part part={part} printed={page.printedPage} pdf={page.pdfPage} original={open} showAsText={true} />
              </View>)}
              {mode==='À vérifier'&&<View style={{gap:14}}>
                <Txt bold>Contrôles séparés du texte du livre</Txt>
                <Txt size={13}>Aucun élément n’est marqué comme vérifié. Les alertes sont des points à examiner, pas des erreurs médicales confirmées.</Txt>
                {parts.map(part=><View key={part.id} style={{padding:14,backgroundColor:c.mint,borderRadius:12,gap:7}}>
                  <Txt bold size={13}>{roles[part.role]} · {part.id} · p. {page.printedPage}</Txt>
                  <Txt size={12}>{part.reasons.length?part.reasons.map(reason=>reasons[reason]??reason).join('\n'):'Aucune alerte automatique. Contrôle visuel et ordre de lecture à confirmer.'}</Txt>
                  <Pressable accessibilityRole="button" onPress={()=>{setMode('Cours reconstitué');requestAnimationFrame(()=>scroll.current?.scrollTo({y:positions.current[part.id]??0,animated:false}));}}><Txt color={c.primary} size={12}>Afficher ce passage</Txt></Pressable>
                </View>)}
              </View>}
            </View>
          </ScrollView>
        </View>
        <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
          <Button title="Page précédente" secondary disabled={index===0} onPress={()=>changePage(index-1)} />
          <Button title="Page suivante" secondary disabled={index===17} onPress={()=>changePage(index+1)} />
        </View>
        <Txt size={11} color={c.muted}>Navigation de lecture uniquement · aucune validation de progression. Les titres et limites de paragraphes reconstitués restent à contrôler.</Txt>
      </>}
      {mode==='Vérification manuelle' && packet?.schemaVersion===2 && (
        <SourceCourseVerification
          packet={packet}
          controlReport={controlReport}
          onClose={() => setMode('Cours reconstitué')}
        />
      )}
    </View>
  </Card>;
}
