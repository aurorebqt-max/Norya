import {useRef,useState} from 'react';
import {View,Linking,useWindowDimensions} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Screen,Card,Txt,Chip,Button,Progress,s} from '../components/ui';
import {BilingualText} from '../components/BilingualText';
import {useLearning} from '../state/LearningProvider';
import {usePreparation} from '../state/PreparationProvider';
import {filterQuestions,makeAttempt,questionBank,shuffle,type Question} from '../domain/learning/quiz';
import {romanianLessons} from '../data/romanianLessons';
import {examRules} from '../data/examRules';
import type {Attempt,Language,PracticeSession} from '../domain/learning/types';
export default function Quiz(){
 const params=useLocalSearchParams<{chapter?:string;filter?:string;section?:string;sectionId?:string;questionId?:string}>();
 const {learning,commit}=useLearning();const {today}=usePreparation();
 const {width}=useWindowDimensions();
 const [chapter,setChapter]=useState(params.chapter??'Tous'),[book,setBook]=useState('Tous'),[filter,setFilter]=useState(params.filter??'Toutes');
 const [language,setLanguage]=useState<Language>('RO'),[scoring,setScoring]=useState<Attempt['scoring']>('romanian-draft');
 const [mix,setMix]=useState(true);
 const savedSession=learning.practiceSession;
 const restoredQuestions=savedSession?.questionIds.map(id=>questionBank.find(q=>q.id===id)).filter((q):q is Question=>!!q)??null;
 const savedSessionMatchesRequest=!!savedSession&&!!restoredQuestions?.length&&restoredQuestions.length===savedSession.questionIds.length
  &&(!params.chapter||restoredQuestions.every(q=>q.chapterId===params.chapter))
  &&(!params.sectionId||restoredQuestions.every(q=>q.sectionId===params.sectionId))
  &&(params.section===undefined||restoredQuestions.every(q=>q.sectionIndex===Number(params.section)))
  &&(!params.questionId||savedSession.questionIds.includes(params.questionId));
 const [session,setSession]=useState<Question[]|null>(savedSessionMatchesRequest?restoredQuestions:null);
 const [index,setIndex]=useState(savedSession?.index??0),[selected,setSelected]=useState<number[]>(savedSession?.selected??[]);
 const [result,setResult]=useState<Attempt|null>(savedSession?.attemptId?learning.attempts.find(a=>a.id===savedSession.attemptId)??null:null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [finished,setFinished]=useState(false),[results,setResults]=useState<Attempt[]>(savedSession?.attemptIds?.map(id=>learning.attempts.find(a=>a.id===id)).filter((a):a is Attempt=>!!a)??[]);
 const lock=useRef(false),attemptId=useRef(savedSession?.attemptId??'');
 const available=filterQuestions(learning,chapter,book,filter).filter(q=>(params.sectionId!==undefined?q.sectionId===params.sectionId:params.section===undefined||q.sectionIndex===Number(params.section))&&(!params.questionId||q.id===params.questionId));
 const question=session?.[index];
 const linkedLesson=question?romanianLessons.find(lesson=>lesson.chapterId===question.chapterId):undefined;
 const linkedSection=linkedLesson?.sections.find(section=>section.id===question?.sectionId);
 const visibleLanguage=language==='FR'?'FR':'RO';
 async function submit(){
  if(!question||result||lock.current)return;
  lock.current=true;setBusy(true);setError('');
  if(!attemptId.current)attemptId.current=`quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const attempt=makeAttempt(question,selected,scoring,today,attemptId.current,0);
  try{
   await commit({type:'attempt',attempt});
   const attemptIds=[...new Set([...(learning.practiceSession?.attemptIds??results.map(value=>value.id)),attempt.id])];
   const saved:PracticeSession={questionIds:session!.map(value=>value.id),index,selected,attemptId:attempt.id,attemptIds};
   await commit({type:'practice-session',value:saved});
   setResult(attempt);setResults(r=>[...r,attempt]);
  }catch(e){setError(e instanceof Error?e.message:'Sauvegarde impossible. Réessayez.');}finally{lock.current=false;setBusy(false);}
 }
 async function start(){
  const list=mix?shuffle(available):available;if(!list.length)return;
  const saved:PracticeSession={questionIds:list.map(value=>value.id),index:0,selected:[],attemptIds:[]};
  try{await commit({type:'practice-session',value:saved});setSession(list);setIndex(0);setSelected([]);setResult(null);setResults([]);setFinished(false);attemptId.current='';}
  catch(e){setError(e instanceof Error?e.message:'Impossible de sauvegarder la séance.');}
 }
 function selectChoice(choiceIndex:number){
  const answers=question?.answers??(question?[question.answer]:[]);
  const value=answers.length===1?[choiceIndex]:selected.includes(choiceIndex)?selected.filter(n=>n!==choiceIndex):[...selected,choiceIndex];
  setSelected(value);setResult(null);attemptId.current='';
  if(session)void commit({type:'practice-session',value:{questionIds:session.map(item=>item.id),index,selected:value,attemptIds:learning.practiceSession?.attemptIds??results.map(item=>item.id)}}).catch(e=>setError(e instanceof Error?e.message:'Sauvegarde impossible.'));
 }
 async function pause(){
  setSession(null);setError('');
 }
 return <Screen title="Entraînement Rezidențiat" subtitle="QCM originaux Norya · aucune annale officielle vérifiée disponible" back>
  {!session?<>
   <Card><Txt>{examRules.notice}</Txt><Button title="Consulter le document ministériel" secondary onPress={()=>void Linking.openURL(examRules.source)}/><View style={s.wrap}><Chip label="Projet de barème 2026" selected={scoring==='romanian-draft'} onPress={()=>setScoring('romanian-draft')}/><Chip label="Score exact /1" selected={scoring==='exact'} onPress={()=>setScoring('exact')}/></View><Txt size={12}>{examRules.simpleScoring} {examRules.multipleScoring} Mode d’entraînement sans chronomètre ; réponses sauvegardées et séance reprenable. Barème provisoire, à confirmer pour la session cible.</Txt></Card>
   {savedSession&&<Button title="Reprendre la séance sauvegardée" secondary onPress={()=>{const list=savedSession.questionIds.map(id=>questionBank.find(q=>q.id===id)).filter((q):q is Question=>!!q);if(list.length===savedSession.questionIds.length){setSession(list);setIndex(savedSession.index);setSelected(savedSession.selected);setResult(savedSession.attemptId?learning.attempts.find(a=>a.id===savedSession.attemptId)??null:null);attemptId.current=savedSession.attemptId??'';setResults(savedSession.attemptIds?.map(id=>learning.attempts.find(a=>a.id===id)).filter((a):a is Attempt=>!!a)??[]);}}}/>}
   <Card><Txt bold>Choisir mes questions</Txt><View style={s.wrap}>{['Tous','kumar','lawrence','sinopsis'].map(v=><Chip key={v} label={v} selected={book===v} onPress={()=>{setBook(v);setChapter('Tous');}}/>)}</View><View style={s.wrap}><Chip label="Tous les chapitres" selected={chapter==='Tous'} onPress={()=>setChapter('Tous')}/>{romanianLessons.map(l=><Chip key={l.chapterId} label={l.title.fr} selected={chapter===l.chapterId} onPress={()=>{setChapter(l.chapterId);setBook('Tous');}}/>)}</View><View style={s.wrap}>{['Toutes','Déjà ratées','Jamais faites'].map(v=><Chip key={v} label={v} selected={filter===v} onPress={()=>setFilter(v)}/>)}</View><Chip label="Ordre mélangé" selected={mix} onPress={()=>setMix(!mix)}/><Txt>{available.length} questions disponibles · QCM Norya originaux uniquement, sans annales vérifiées.</Txt><Button title="Commencer une séance" disabled={!available.length} onPress={()=>void start()}/></Card>
  </>:finished?<Card><Txt bold>Séance terminée</Txt><Txt>{results.filter(r=>r.correct).length}/{session.length} réponses entièrement correctes · {results.reduce((n,r)=>n+r.score,0)}/{results.reduce((n,r)=>n+r.maxScore,0)} points sur les réponses enregistrées.</Txt><Txt>{session.length-results.length} question(s) non répondues. Vos tentatives et erreurs sont sauvegardées, aucun tour n’est validé.</Txt><Button title="Carnet d’erreurs" onPress={()=>router.push('/errors')}/><Button title="Nouvelle séance" secondary onPress={()=>{setSession(null);void commit({type:'practice-session'});}}/></Card>:question&&<>
   <View style={s.wrap}>{(['RO','FR'] as Language[]).map(v=><Chip key={v} label={v} selected={language===v} onPress={()=>setLanguage(v)}/>)}</View>
   <View style={s.between}><Txt>{index+1}/{session.length} · {(question.answers??[question.answer]).length>1?'Complément multiple':'Complément simple'}</Txt><Button title="Mettre en pause" secondary onPress={()=>void pause()}/></View><Progress value={index/session.length*100}/>
   <View style={{flexDirection:result&&width>=900?'row':'column',gap:16}}>
   <Card style={{flex:1}}><Txt size={12}>QCM Norya — Entraînement · question originale, non issue d’une annale officielle.</Txt><BilingualText text={question.prompt} language={language} bold/>{question.choices.map((choice,i)=><Chip key={i} label={`${String.fromCharCode(65+i)} · ${language==='RO'?choice.ro:language==='FR'?choice.fr:choice.ro+' / '+choice.fr}`} selected={selected.includes(i)} onPress={()=>{if(result||busy)return;selectChoice(i);}}/>)}
    {!result?<Button title="Valider ma réponse" disabled={busy||!selected.length} onPress={()=>void submit()}/>:<>
      <Txt bold>{result.correct?'Réponse correcte selon la clé Norya':'À revoir'} · {result.score}/{result.maxScore}</Txt>
      <Txt size={12}>QCM original Norya · clé et explications en attente de relecture médicale.</Txt>
      {question.choices.map((_,i)=><View key={i}>
        <Txt bold>{String.fromCharCode(65+i)} · {result.correctAnswers.includes(i)?'Clé Norya : réponse attendue':'Non retenue par la clé Norya'}</Txt>
        {question.choiceReasons?.[i]&&<BilingualText text={question.choiceReasons[i]} language={language}/>}
      </View>)}
      {!question.choiceReasons&&<><Txt bold>Explication générale</Txt><BilingualText text={question.explanation} language={language}/></>}
      <Button title={index+1===session.length?'Terminer':'Question suivante'} onPress={()=>{if(index+1===session.length){setFinished(true);void commit({type:'practice-session'});}else{const next=index+1;setIndex(next);setSelected([]);setResult(null);attemptId.current='';void commit({type:'practice-session',value:{questionIds:session.map(item=>item.id),index:next,selected:[],attemptIds:results.map(item=>item.id)}});}}}/>
    </>}
    <Txt size={12}>Notion : {question.notion??'Fondamentaux'} · {question.chapterId} · source pédagogique locale, p. {question.pages} · v{question.version}</Txt><Button title="Ouvrir la fiche" secondary onPress={()=>router.push({pathname:'/chapter',params:{id:question.chapterId,...(question.sectionId?{sectionId:question.sectionId}:{})}})}/>
   </Card>
   {result&&<Card style={{flex:1,backgroundColor:'#F6F3E8',borderColor:'#E7D9AA'}}>
    <Txt bold size={19}>Passage correspondant dans le cours</Txt>
    {linkedSection
      ? <><Txt size={12}>Repère {question.sectionId} · association à vérifier · contenu original Norya à relire médicalement · p. {question.pages}</Txt><Txt style={{backgroundColor:'#F3E7A6',padding:10}}>{visibleLanguage==='FR'?linkedSection.text.fr:linkedSection.text.ro}</Txt><Button title="Voir dans le cours" secondary onPress={()=>router.push({pathname:'/chapter',params:{id:question.chapterId,sectionId:question.sectionId}})}/></>
      : <><Txt>Passage à vérifier. Aucune association fiable n’est enregistrée.</Txt><Button title="Ouvrir le chapitre" secondary onPress={()=>router.push({pathname:'/chapter',params:{id:question.chapterId}})}/></>}
   </Card>}
   </View>
  </>}{!!error&&<Txt>{error}</Txt>}
 </Screen>;
}
