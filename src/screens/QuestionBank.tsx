import { useEffect, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { extractQcmPdf } from '../services/qcmPdf';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Txt, Button, Chip, s } from '../components/ui';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';
import { examChapters } from '../data/rezidentiat2026';
import { isContentEditor, listSharedQcm, parseBatch, qcmExportTemplate, saveQcm, deleteQcm, type NoryaQcm } from '../services/cloud/qcmBank';
export default function QuestionBank(){
 const {chapterId}=useLocalSearchParams<{chapterId?:string}>();
 const [rows,setRows]=useState<{q:NoryaQcm;published:boolean}[]>([]),[editor,setEditor]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [pdfProgress,setPdfProgress]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null),[questionDraft,setQuestionDraft]=useState<NoryaQcm|null>(null);
 const [chapterInput,setChapterInput]=useState('');
 const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
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
 const move=(next:number)=>{setIndex(next);setChoices([]);setShowCorrect(false);setEditingId(null);setQuestionDraft(null);setConfirmDeleteId(null);};
 const blankChoices=()=>['A','B','C','D','E'].map(id=>({id,text:''}));
 const beginEdit=(q:NoryaQcm)=>{
  const byId=new Map(q.choices.map(c=>[c.id.toUpperCase(),c]));
  setEditingId(q.id);
  setQuestionDraft({...q,choices:['A','B','C','D','E'].map(id=>({...byId.get(id),id,text:byId.get(id)?.text||''}))});
  setChapterInput(q.chapterIds.join(', '));setConfirmDeleteId(null);
 };
 const beginAdd=()=>{
  setEditingId('__new__');
  setQuestionDraft({id:`manuel-${Date.now()}`,chapterIds:chapterId?[chapterId]:[],stem:'',choices:blankChoices(),verified:false});
  setChapterInput(chapterId||'');setConfirmDeleteId(null);
 };
 const updateChoice=(id:string,value:string)=>setQuestionDraft(prev=>prev?{...prev,choices:prev.choices.map(c=>c.id===id?{...c,text:value}:c)}:prev);
 const toggleCorrect=(id:string)=>setQuestionDraft(prev=>prev?{...prev,choices:prev.choices.map(c=>c.id===id?{...c,correct:!c.correct}:c)}:prev);
 const saveEdit=async(publish=false)=>{
  if(!questionDraft)throw new Error('Aucune question à enregistrer.');
  const chapterIds=chapterInput.split(',').map(v=>v.trim()).filter(Boolean);
  const invalid=chapterIds.filter(id=>!examChapters.some(c=>c.id===id));
  if(invalid.length)throw new Error(`Chapitre(s) inconnu(s) : ${invalid.join(', ')}. Laissez le champ vide pour classer plus tard.`);
  const allFive=questionDraft.choices.map(c=>({...c,text:c.text.trim(),correct:!!c.correct}));
  const item={...questionDraft,chapterIds,choices:publish?allFive:allFive.filter(c=>c.text),verified:publish};
  if(!item.stem.trim())throw new Error('Saisissez l’énoncé de la question.');
  if(publish&&allFive.some(c=>!c.text))throw new Error('Pour ajouter cette question à la banque d’entraînement, complétez les cinq propositions A, B, C, D et E.');
  if(publish&&!allFive.some(c=>c.correct))throw new Error('Cochez au moins une bonne réponse avant de valider cette question.');
  if(editingId!=='__new__'&&item.id!==editingId)throw new Error('Ne modifiez pas l’identifiant du QCM.');
  if(editingId==='__new__'&&rows.some(r=>r.q.id===item.id))throw new Error('Cet identifiant existe déjà.');
  await saveQcm([item],publish);await refresh();setEditingId(null);setQuestionDraft(null);setShowCorrect(false);setChoices([]);
  if(editingId==='__new__')setIndex(0);
 };
 const editForm=questionDraft&&<View style={{gap:10}}>
  <Txt bold>Énoncé de la question</Txt>
  <TextInput multiline value={questionDraft.stem} onChangeText={value=>setQuestionDraft(prev=>prev?{...prev,stem:value}:prev)} accessibilityLabel="Énoncé du QCM" placeholder="Saisir la question" style={[s.input,{minHeight:95,textAlignVertical:'top'}]}/>
  <Txt bold>Propositions (A à E)</Txt>
  <Txt size={12}>Les cases restent disponibles même si le PDF n’a pas reconnu les propositions. Laissez vides celles qui sont encore à transcrire.</Txt>
  {questionDraft.choices.map(c=><View key={c.id} style={{gap:6}}>
   <Txt bold>{c.id}</Txt>
   <TextInput multiline value={c.text} onChangeText={value=>updateChoice(c.id,value)} accessibilityLabel={`Proposition ${c.id}`} placeholder={`Texte de la proposition ${c.id}`} style={[s.input,{minHeight:55,textAlignVertical:'top'}]}/>
   <Chip label={c.correct?'Bonne réponse ✓':'Marquer comme bonne réponse'} selected={!!c.correct} onPress={()=>toggleCorrect(c.id)}/>
  </View>)}
  <Txt bold>Chapitres associés (facultatif)</Txt>
  <TextInput value={chapterInput} onChangeText={setChapterInput} accessibilityLabel="Identifiants des chapitres" placeholder="Laisser vide pour classer plus tard" style={s.input}/>
  <Txt size={12}>Identifiants séparés par des virgules, par exemple kum-08, kum-09. Aucun chapitre n’est obligatoire.</Txt>
  <Txt size={12}>Les bonnes réponses cochées sont enregistrées même en brouillon. Elles restent privées tant que vous ne validez pas cette question.</Txt>
  <Button title="Enregistrer en brouillon" disabled={busy} onPress={()=>void run(()=>saveEdit(false))}/>
  <Button title="Valider et ajouter cette question à la banque" secondary disabled={busy} onPress={()=>void run(()=>saveEdit(true))}/>
  <Txt size={12}>La validation publie uniquement cette question. Vous n’avez pas besoin de terminer les 200 QCM de l’annale. Il faut un énoncé, les cinq propositions A à E et au moins une bonne réponse.</Txt>
  <Button title="Annuler les modifications" secondary disabled={busy} onPress={()=>{setEditingId(null);setQuestionDraft(null);}}/>
 </View>;
 return <Screen title="Banque de QCM" subtitle={chapterId?`QCM du chapitre ${chapterId}`:'Questions partagées validées et brouillons administrateur'} back>
  {!!error&&<Card><Txt>{error}</Txt></Card>}
  {editor&&<Card style={{gap:10}}>
   <Txt bold>Administration des QCM</Txt>
   <Button title="Ajouter une question" secondary disabled={busy} onPress={beginAdd}/>
   {editingId==='__new__'&&editForm}
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
   {editor&&<Button title="Supprimer cette question" secondary disabled={busy} onPress={()=>{setConfirmDeleteId(active.q.id);setEditingId(null);}}/>}
   {editor&&confirmDeleteId===active.q.id&&<View style={{gap:8}}>
    <Txt>Confirmer la suppression définitive de {active.q.id} ? Cette action supprimera ce QCM de Supabase pour tous les comptes.</Txt>
    <Button title="Oui, supprimer définitivement" disabled={busy} onPress={()=>void run(async()=>{await deleteQcm(active.q.id);setConfirmDeleteId(null);await refresh();setIndex(0);})}/>
    <Button title="Annuler" secondary onPress={()=>setConfirmDeleteId(null)}/>
   </View>}
   {editor&&editingId===active.q.id&&editForm}
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
