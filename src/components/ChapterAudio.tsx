import {useEffect,useRef,useState} from 'react';
import {Platform,View} from 'react-native';
import * as Speech from 'expo-speech';
import {Button,Txt,s,Chip} from './ui';
import {useDemo} from '../state/DemoProvider';
import type {RomanianLesson} from '../data/romanianLessons';
export function ChapterAudio({lesson,language}:{lesson:RomanianLesson;language:'RO'|'FR'}){
 const {audioProgress,saveAudioProgress}=useDemo();
 const key=`reader:${lesson.chapterId}:${language}`;
 const [rate,setRate]=useState(1);
 const rateRef=useRef(rate);
 const [position,setPosition]=useState(audioProgress[key]??0),[playing,setPlaying]=useState(false),[paused,setPaused]=useState(false),[voice,setVoice]=useState<string|undefined>(),[ready,setReady]=useState(false),[message,setMessage]=useState('');
 const generation=useRef(0),positionRef=useRef(position),saveRef=useRef(saveAudioProgress);
 saveRef.current=saveAudioProgress;
 useEffect(()=>{let active=true;setReady(false);setPosition(audioProgress[key]??0);positionRef.current=audioProgress[key]??0;void Speech.getAvailableVoicesAsync().then(voices=>{if(!active)return;const selected=voices.find(v=>v.language.toLowerCase().startsWith(language.toLowerCase()));setVoice(selected?.identifier);setReady(!!selected);setMessage(selected?'':'Aucune voix '+language+' disponible sur cet appareil. Installez une voix système compatible.');}).catch(()=>setMessage('Lecture vocale indisponible.'));return()=>{active=false;generation.current++;void Speech.stop();};},[key,language]);
 function speak(index:number,token:number){
  if(token!==generation.current)return;
  if(index>=lesson.sections.length){setPlaying(false);setMessage('Écoute terminée. Validez le passage séparément si le chapitre a été travaillé.');return;}
  positionRef.current=index;setPosition(index);
  const section=lesson.sections[index];
  Speech.speak(language==='RO'?section.text.ro:section.text.fr,{language:language==='RO'?'ro-RO':'fr-FR',voice,rate:rateRef.current,onDone:()=>{if(token!==generation.current)return;const next=index+1;positionRef.current=next;setPosition(next);void saveRef.current(key,next).catch(e=>setMessage(e.message));speak(next,token);},onError:()=>{setPlaying(false);setMessage('La voix a rencontré une erreur. Reprenez ce paragraphe.');}});
 }
 async function start(){await Speech.stop();const token=++generation.current;setPlaying(true);setPaused(false);speak(positionRef.current>=lesson.sections.length?0:positionRef.current,token);}
 async function pause(){try{if(Platform.OS==='android'){generation.current++;await Speech.stop();setPlaying(false);setMessage('Android : reprise au début du paragraphe courant.');}else{await Speech.pause();setPaused(true);}}catch{generation.current++;await Speech.stop();setPlaying(false);setMessage('Pause non disponible : reprise au début du paragraphe.');}}
 return <View style={{ flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:6 }}>
  {!playing?<Button title={`Écouter en ${language}`} disabled={!ready} onPress={()=>void start()}/>:paused?<Button title="Reprendre" onPress={()=>void Speech.resume().then(()=>setPaused(false)).catch(()=>void start())}/>:<Button title="Pause" onPress={()=>void pause()}/>}
  <View style={s.row}><Txt size={11}>Vitesse</Txt>{[0.8,1,1.2].map(value=><Chip key={value} label={`${value}×`} selected={rate===value} onPress={()=>{rateRef.current=value;setRate(value);}}/>)}</View>
  <Txt size={11}>{position}/{lesson.sections.length}</Txt>
  {!!message&&<Txt size={11}>{message}</Txt>}
 </View>;
}
