import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LearningRepository} from '../domain/learning/store';
import type {LearningAction,LearningState} from '../domain/learning/types';
import {Card,Txt,Button} from '../components/ui';
const Context=createContext<{learning:LearningState;commit:(a:LearningAction)=>Promise<void>;reattachAnnotation:(annotationId:string,sectionId:string)=>Promise<void>}|null>(null);
export function LearningProvider({children}:{children:React.ReactNode}) {
 const repo=useRef(new LearningRepository(AsyncStorage)).current;
 const [learning,setLearning]=useState<LearningState|null>(null),[error,setError]=useState('');
 const load=()=>{setError('');void repo.load().then(setLearning).catch(e=>setError(e.message));};
 useEffect(load,[repo]);
 if(!learning)return <Card><Txt>{error||'Chargement des révisions…'}</Txt>{!!error&&<Button title="Réessayer sans effacer mes données" onPress={load}/>}</Card>;
 return <Context.Provider value={{learning,commit:async(a)=>{setLearning(await repo.commit(a));},reattachAnnotation:async(annotationId,sectionId)=>{setLearning(await repo.reattachAnnotation(annotationId,sectionId));}}}>{children}</Context.Provider>;
}
export function useLearning(){const value=useContext(Context);if(!value)throw new Error('LearningProvider required');return value;}
