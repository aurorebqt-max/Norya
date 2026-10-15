import {useState} from 'react';
import {TextInput,View} from 'react-native';
import {router} from 'expo-router';
import {Screen,Card,Txt,Chip,Button,s} from '../components/ui';
import {glossary} from '../data/glossary';
import {useLearning} from '../state/LearningProvider';
export default function Vocabulary(){
 const {learning,commit}=useLearning();const [query,setQuery]=useState(''),[difficult,setDifficult]=useState(false),[error,setError]=useState('');
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const terms=glossary.filter(t=>(!difficult||learning.difficultTerms.includes(t.id))&&normalize(`${t.ro} ${t.fr}`).includes(normalize(query)));
 return <Screen title="Mon vocabulaire médical" subtitle="Glossaire RO–FR · repères accessibles pendant la lecture" back><TextInput accessibilityLabel="Rechercher un terme" style={s.input} value={query} onChangeText={setQuery} placeholder="Terme roumain ou français…"/><View style={s.wrap}><Chip label="Tous" selected={!difficult} onPress={()=>setDifficult(false)}/><Chip label="Mots difficiles" selected={difficult} onPress={()=>setDifficult(true)}/></View>{terms.map(t=><Card key={t.id}><Txt bold>{t.ro} → {t.fr}</Txt><Txt>{t.definition.ro}</Txt><Txt>{t.definition.fr}</Txt><Txt size={12}>Kumar RO 2021 · p. {t.pages}</Txt><Chip label={learning.difficultTerms.includes(t.id)?'Mot difficile ✓':'Marquer difficile'} selected={learning.difficultTerms.includes(t.id)} onPress={()=>void commit({type:'term',id:t.id}).catch(e=>setError(e.message))}/><Button title="Lire dans la fiche" secondary onPress={()=>router.push({pathname:'/chapter',params:{id:t.chapterId}})}/></Card>)}{!terms.length&&<Txt>Aucun terme dans ce filtre.</Txt>}{!!error&&<Txt>{error}</Txt>}</Screen>;
}
