import { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Button, Chip, s } from '../components/ui';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';
import { examChapters } from '../data/rezidentiat2026';
import { isContentEditor, listSharedQcm, parseBatch, qcmExportTemplate, saveQcm, type NoryaQcm } from '../services/cloud/qcmBank';
export default function QuestionBank(){
 const {chapterId}=useLocalSearchParams<{chapterId?:string}>();
 const [rows,setRows]=useState<{q:NoryaQcm;published:boolean}[]>([]),[editor,setEditor]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [draft,setDraft]=useState(''),[choices,setChoices]=useState<string[]>([]),[index,setIndex]=useState(0),[showCorrect,setShowCorrect]=useState(false);
 const refresh=async()=>{const [q,admin]=await Promise.all([listSharedQcm(),isContentEditor()]);setRows(q);setEditor(admin);};
 useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[]);
 const visible=rows.filter(r=>!chapterId||r.q.chapterIds.includes(chapterId));
 const active=visible[index];
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 const move=(next:number)=>{setIndex(next);setChoices([]);setShowCorrect(false);};
 return <Screen title="Banque de QCM" subtitle={chapterId?`QCM du chapitre ${chapterId}`:'Questions partagées validées et brouillons administrateur'} back>
  {!!error&&<Card><Txt>{error}</Txt></Card>}
  {editor&&<Card style={{gap:10}}>
   <Txt bold>Administration des QCM</Txt>
   <Button title="Exporter le modèle pour ChatGPT (39 chapitres)" secondary disabled={busy} onPress={()=>downloadPrivateJson('norya-modele-qcm.json',qcmExportTemplate())}/>
   <Button title="Charger un JSON de QCM" secondary disabled={busy} onPress={()=>void run(async()=>{const raw=await pickPrivateJson();if(raw){parseBatch(raw);setDraft(raw);}})}/>
   <Txt size={12}>Vous pouvez aussi corriger le JSON ci-dessous avant de l’enregistrer. Les questions restent en brouillon jusqu’à la publication explicite.</Txt>
   <TextInput multiline value={draft} onChangeText={setDraft} accessibilityLabel="Questions JSON" style={[s.input,{minHeight:115,textAlignVertical:'top'}]} />
   <Button title="Enregistrer les QCM en brouillon" disabled={!draft||busy} onPress={()=>void run(async()=>{await saveQcm(parseBatch(draft),false);await refresh();setDraft('');})}/>
   <Button title="Finaliser et publier les QCM vérifiés" disabled={!draft||busy} onPress={()=>void run(async()=>{await saveQcm(parseBatch(draft),true);await refresh();setDraft('');})}/>
  </Card>}
  <Card><Txt bold>{visible.length} question(s) accessibles</Txt><Txt size={12}>Les corrections et liens doivent être vérifiés. Aucun PDF privé n'est publié automatiquement.</Txt></Card>
  {active&&<Card style={{gap:10}}>
   <Txt size={12}>{index+1}/{visible.length} · {active.q.chapterIds.map(id=>examChapters.find(c=>c.id===id)?.chapter||id).join(' / ')} · {active.published?'Publiée':'Brouillon'}</Txt>
   <Txt bold size={20}>{active.q.stem}</Txt>
   {active.q.choices.map(c=><Chip key={c.id} label={`${c.id}. ${c.text}`} selected={choices.includes(c.id)} onPress={()=>{if(!showCorrect)setChoices(prev=>prev.includes(c.id)?prev.filter(id=>id!==c.id):[...prev,c.id]);}}/>)}
   <Button title="Corriger" disabled={showCorrect||!choices.length} onPress={()=>setShowCorrect(true)}/>
   {showCorrect&&<>
    <Txt bold>{active.q.choices.every(c=>choices.includes(c.id)===c.correct)?'Réponse correcte':'À revoir'}</Txt>
    {active.q.choices.map(c=><View key={c.id} style={{gap:3}}><Txt>{c.id} : {c.correct?'Vrai':'Faux'}{c.explanation?` — ${c.explanation}`:''}</Txt>
     {(c.chapterId||active.q.chapterIds[0])&&<Button secondary title={`Voir dans le cours · ${c.chapterId||active.q.chapterIds[0]}${c.printedPage?' p. '+c.printedPage:''}`} onPress={()=>router.push({pathname:'/chapter',params:{id:c.chapterId||active.q.chapterIds[0]}})}/>}</View>)}
    {!!active.q.explanation&&<Txt>{active.q.explanation}</Txt>}
   </>}
   <Button title="Question suivante" secondary disabled={index>=visible.length-1} onPress={()=>move(index+1)}/>
   {index>0&&<Button title="Question précédente" secondary onPress={()=>move(index-1)}/>}
  </Card>}
  {!active&&<Card><Txt>Aucun QCM disponible. Connectez-vous et publiez une banque vérifiée pour commencer.</Txt></Card>}
 </Screen>;
}
