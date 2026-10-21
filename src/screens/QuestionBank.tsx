import { useEffect, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { extractQcmPdf } from '../services/qcmPdf';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Button, Chip, s } from '../components/ui';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';
import { examChapters } from '../data/rezidentiat2026';
import { isContentEditor, listSharedQcm, parseBatch, qcmExportTemplate, saveQcm, type NoryaQcm } from '../services/cloud/qcmBank';
export default function QuestionBank(){
 const {chapterId}=useLocalSearchParams<{chapterId?:string}>();
 const [rows,setRows]=useState<{q:NoryaQcm;published:boolean}[]>([]),[editor,setEditor]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [pdfProgress,setPdfProgress]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null),[questionDraft,setQuestionDraft]=useState('');
 const [draft,setDraft]=useState(''),[choices,setChoices]=useState<string[]>([]),[index,setIndex]=useState(0),[showCorrect,setShowCorrect]=useState(false);
 const refresh=async()=>{const [q,admin]=await Promise.all([listSharedQcm(),isContentEditor()]);setRows(q);setEditor(admin);};
 useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[]);
 const visible=rows.filter(r=>!chapterId||r.q.chapterIds.includes(chapterId));
 const active=visible[index];
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function importPdf() {
  if(Platform.OS!=='web')throw new Error('Ouvrez Norya dans Safari pour importer un PDF.');
  const result=await DocumentPicker.getDocumentAsync({type:'application/pdf',copyToCacheDirectory:true});
  if(result.canceled)return;
  const asset=result.assets[0];
  const blob=asset.file??await(await fetch(asset.uri)).blob();
  if(!(await blob.slice(0,1024).text()).includes('%PDF-'))throw new Error('PDF invalide.');
  const value=await extractQcmPdf(blob,setPdfProgress);
  setDraft(JSON.stringify(value,null,2));
  setPdfProgress(`${value.questions.length} question(s) détectée(s). Vérifiez le JSON et ses pages brutes avant import : réponses et chapitres ne sont pas devinés.`);
 }
 const move=(next:number)=>{setIndex(next);setChoices([]);setShowCorrect(false);setEditingId(null);setQuestionDraft('');};
 const beginEdit=(q:NoryaQcm)=>{setEditingId(q.id);setQuestionDraft(JSON.stringify(q,null,2));};
 const saveEdit=async()=>{const item=parseBatch(JSON.stringify({format:'norya-qcm-batch',schemaVersion:1,questions:[JSON.parse(questionDraft)]}))[0];if(item.id!==editingId)throw new Error('Ne modifiez pas l’identifiant du QCM.');await saveQcm([item],false);await refresh();setEditingId(null);setQuestionDraft('');setShowCorrect(false);setChoices([]);};
 return <Screen title="Banque de QCM" subtitle={chapterId?`QCM du chapitre ${chapterId}`:'Questions partagées validées et brouillons administrateur'} back>
  {!!error&&<Card><Txt>{error}</Txt></Card>}
  {editor&&<Card style={{gap:10}}>
   <Txt bold>Administration des QCM</Txt>
   <Button title="Importer un PDF de QCM (brouillon local)" secondary disabled={busy} onPress={()=>void run(importPdf)}/>
   {!!pdfProgress&&<Txt size={12}>{pdfProgress}</Txt>}
   <Button title="Exporter le brouillon PDF/JSON pour ChatGPT" secondary disabled={!draft||busy} onPress={()=>{try{downloadPrivateJson('norya-qcm-a-classer.json',JSON.parse(draft));}catch(e){setError('Le JSON doit être valide pour être exporté.');}}}/>
   <Button title="Exporter le modèle pour ChatGPT (39 chapitres)" secondary disabled={busy} onPress={()=>downloadPrivateJson('norya-modele-qcm.json',qcmExportTemplate())}/>
   <Button title="Charger un JSON de QCM" secondary disabled={busy} onPress={()=>void run(async()=>{const raw=await pickPrivateJson();if(raw){parseBatch(raw);setDraft(raw);}})}/>
   <Txt size={12}>Le PDF est extrait localement et produit un brouillon : le texte et les réponses sont à vérifier. Les 39 chapitres figurent dans le JSON exporté. ChatGPT peut ensuite classer les questions. Vous pouvez enregistrer des QCM sans chapitre (chapterIds: []). Vous les classerez plus tard. verified:true uniquement après votre relecture.</Txt>
   <Txt size={12}>Vous pouvez corriger le JSON ci-dessous avant enregistrement. Pour des annales sans corrigé, omettez correct et laissez verified:false : l’import conserve les questions en brouillon, sans inventer de bonnes réponses.</Txt>
   <TextInput multiline value={draft} onChangeText={setDraft} accessibilityLabel="Questions JSON" style={[s.input,{minHeight:115,textAlignVertical:'top'}]} />
   <Button title="Enregistrer les QCM en brouillon" disabled={!draft||busy} onPress={()=>void run(async()=>{await saveQcm(parseBatch(draft),false);await refresh();setDraft('');})}/>
   <Button title="Finaliser et publier les QCM vérifiés" disabled={!draft||busy} onPress={()=>void run(async()=>{await saveQcm(parseBatch(draft),true);await refresh();setDraft('');})}/>
  </Card>}
  <Card><Txt bold>{visible.length} question(s) accessibles</Txt><Txt size={12}>Les corrections et liens doivent être vérifiés. Aucun PDF privé n'est publié automatiquement.</Txt></Card>
  {active&&<Card style={{gap:10}}>
   <Txt size={12}>{index+1}/{visible.length} · {(active.q.chapterIds.length?active.q.chapterIds.map(id=>examChapters.find(c=>c.id===id)?.chapter||id).join(' / '):'À classer')} · {active.published?'Publiée':'Brouillon'}</Txt>
   <Txt bold size={20}>{active.q.stem}</Txt>
   {active.q.choices.map(c=><Chip key={c.id} label={`${c.id}. ${c.text}`} selected={choices.includes(c.id)} onPress={()=>{if(!showCorrect)setChoices(prev=>prev.includes(c.id)?prev.filter(id=>id!==c.id):[...prev,c.id]);}}/>)}
   {editor&&<Button title="Modifier ce QCM (administrateur)" secondary disabled={busy} onPress={()=>editingId===active.q.id?setEditingId(null):beginEdit(active.q)}/>}
   {editor&&editingId===active.q.id&&<View style={{gap:8}}>
    <Txt size={12}>Modifiez l'énoncé (stem), les propositions (choices) et les chapitres (chapterIds). Pour une annale non corrigée, laissez verified à false et n'inventez pas les réponses.</Txt>
    <TextInput multiline value={questionDraft} onChangeText={setQuestionDraft} accessibilityLabel="Modifier le JSON de cette question" style={[s.input,{minHeight:280,textAlignVertical:'top'}]}/>
    <Button title="Enregistrer les modifications en brouillon" disabled={busy} onPress={()=>void run(saveEdit)}/>
    <Button title="Annuler les modifications" secondary onPress={()=>{setEditingId(null);setQuestionDraft('');}}/>
   </View>}
   <Button title="Corriger" disabled={showCorrect||!choices.length||!active.q.verified||active.q.choices.some(c=>typeof c.correct!=='boolean')} onPress={()=>setShowCorrect(true)}/>
   {!active.q.verified&&<Txt size={12}>Correction indisponible : réponses non vérifiées. L'administrateur peut modifier cette question.</Txt>}
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
