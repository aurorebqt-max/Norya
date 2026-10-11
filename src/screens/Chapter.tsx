import { useState } from 'react';
import { TextInput, View, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Chip, Button, s } from '../components/ui';
import { examChapters, errataByChapter } from '../data/rezidentiat2026';
import { romanianLessons, romanianFlashcards, type Bilingual } from '../data/romanianLessons';
import { usePreparation } from '../state/PreparationProvider';
import { useDemo } from '../state/DemoProvider';
export default function Chapter() {
  const {id, tab} = useLocalSearchParams<{id:string;tab?:string}>();
  const chapter=examChapters.find(c=>c.id===id), lesson=romanianLessons.find(l=>l.chapterId===id);
  const {state,saveNote}=usePreparation();
  const {validateSheet,recordPractice,practiceResults}=useDemo();
  const [language,setLanguage]=useState('Bilingue'),[mode,setMode]=useState(tab === 'qcm' ? 'QCM' : 'Complet');
  const [note,setNote]=useState(state.notes[id] ?? ''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const render=(text:Bilingual)=>language==='RO'?text.ro:language==='FR'?text.fr:`RO · ${text.ro}\n\nFR · ${text.fr}`;
  async function save(action:()=>Promise<void>, success:string) {setBusy(true);setMessage('');try{await action();setMessage(success);}catch(e){setMessage(e instanceof Error?e.message:'Enregistrement impossible.');}finally{setBusy(false);}}
  if(!chapter) return <Screen title="Chapitre introuvable" back><Button title="Bibliothèque" onPress={()=>router.replace('/library')}/></Screen>;
  return <Screen title={chapter.chapter} subtitle={`Tematica 2026 · pages ${chapter.pages}`} back>
    <View style={s.wrap}>{['Référentiel privé','Complet','Express','QCM','Annotations'].map(m=><Chip key={m} label={m} selected={mode===m} onPress={()=>setMode(m)}/>)}</View>
    <View style={s.wrap}>{['RO','FR','Bilingue'].map(l=><Chip key={l} label={l} selected={language===l} onPress={()=>setLanguage(l)}/>)}</View>
    {mode==='Référentiel privé' ? <Card><Txt>Texte original dans votre PDF personnel. Les modes linguistiques concernent les fiches originales Norya ; le PDF reste dans sa langue d’origine.</Txt><Button title="Ouvrir / importer le PDF privé" onPress={()=>router.push({pathname:'/references',params:{id}})}/></Card> : mode==='Annotations' ? <Card><TextInput accessibilityLabel="Annotations du chapitre" multiline style={[s.input,{minHeight:150}]} value={note} onChangeText={setNote}/><Button title="Enregistrer" disabled={busy} onPress={()=>void save(()=>saveNote(id,note),'Annotation enregistrée.')}/></Card> : !lesson ? <Card><Txt>Fiche originale et exercices en préparation. Le référentiel privé est disponible dès l’import de votre PDF.</Txt></Card> : <>
      <Card><Txt bold>{render(lesson.title)}</Txt><Txt>{lesson.status}</Txt><Txt size={12}>Source : Kumar și Clark, édition roumaine 2021, chapitre 8, p.151–168 (SEPSIS.pdf, p.1–18). Tematica 2026, PDF p.1. Errata fourni : 2021, PDF p.1 ; pages concernées : {errataByChapter[id]?.bookPages}.</Txt><Txt size={12}>Repère clinique complémentaire : le qSOFA seul ne suffit pas au dépistage. Les recommandations actuelles ne remplacent pas le périmètre du manuel du concours.</Txt><Button secondary title="Source complémentaire · SCCM 2026" onPress={()=>void Linking.openURL('https://www.sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-adult-guidelines')}/></Card>
      {mode==='QCM' ? <>
        <Txt>QCM pédagogiques à réponse unique · format d’entraînement, sans notation officielle. Résultats cumulés : {practiceResults[id]?.correct ?? 0}/{practiceResults[id]?.total ?? 0}.</Txt>
        {lesson.questions.map(q=><Card key={q.id}><Txt bold>{render(q.prompt)}</Txt>{q.choices.map((choice,i)=><Chip key={i} label={render(choice)} selected={answers[q.id]===i} onPress={()=>{if(busy || answers[q.id]!==undefined)return;void save(async()=>{await recordPractice(q.id,id,i===q.answer);setAnswers(a=>({...a,[q.id]:i}));},'Réponse enregistrée. Aucun tour validé.');}}/>)}{answers[q.id]!==undefined && <><Txt bold>{answers[q.id]===q.answer?'Correct':'À revoir'}</Txt><Txt>{render(q.explanation)}</Txt><Txt>Réponse : {render(q.choices[q.answer])}</Txt></>}<Txt size={12}>Kumar RO 2021, p. {q.pages}</Txt></Card>)}
        <Button title="Nouvelle séance" secondary onPress={()=>setAnswers({})}/>
      </> : lesson.sections.map((section,i)=><Card key={i}><Txt bold>{render(section.title)}</Txt><Txt>{render(mode==='Express'?section.express:section.text)}</Txt><Txt size={12}>Source : Kumar RO 2021, p. {section.pages}</Txt></Card>)}
      <Button title="Ajouter les 5 flashcards au deck" disabled={busy} onPress={()=>void save(()=>validateSheet(id,romanianFlashcards.filter(c=>c.objectiveId===id).map(c=>c.id)),'Cartes disponibles, sans doublon ni validation de tour.')}/>
    </>}
    {!!message && <Txt>{message}</Txt>}
    <Card><Txt>La consultation libre, les QCM et les flashcards ne valident aucun tour.</Txt><Button title="Enregistrer mon travail / valider un tour" secondary onPress={()=>router.push({pathname:'/study',params:{objectiveId:id}})}/></Card>
  </Screen>;
}
