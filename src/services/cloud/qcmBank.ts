import { getSession } from './account';
import { examChapters } from '../../data/rezidentiat2026';
export type NoryaQcm = {id:string; chapterIds:string[]; stem:string; choices:{id:string;text:string;correct?:boolean;explanation?:string;chapterId?:string;printedPage?:number;blockId?:string}[]; explanation?:string; verified:boolean};
const base=(process.env.EXPO_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const apiKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||'';
const chapterSet=new Set(examChapters.map(c=>c.id));
async function call(path:string,options:RequestInit={}){
 const session=await getSession();if(!session)throw new Error('Connecte-toi dans Mon compte Norya.');
 if(!base||!apiKey)throw new Error('Configuration Supabase manquante.');
 const resp=await fetch(base+path,{...options,headers:{apikey:apiKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...options.headers}});
 const body=await resp.text();let data:any=null;try{data=body?JSON.parse(body):null;}catch{}
 if(!resp.ok)throw new Error(data?.message||data?.error||`Supabase ${resp.status}: ${body.slice(0,100)}`);
 return {data,userId:session.user.id};
}
export function validateQcm(value:unknown):NoryaQcm {
 if(!value||typeof value!=='object')throw new Error('Question JSON invalide.');
 const q=value as NoryaQcm;
 if(typeof q.id!=='string'||!q.id.trim()||q.id.length>160||typeof q.stem!=='string'||!q.stem.trim())throw new Error('Identifiant ou énoncé manquant.');
 if(q.chapterIds!==undefined&&(!Array.isArray(q.chapterIds)||q.chapterIds.some(id=>typeof id!=='string')))throw new Error(`Liste des chapitres invalide pour ${q.id}.`);
 if(!Array.isArray(q.choices)||q.choices.length>8)throw new Error(`La question ${q.id} ne peut pas dépasser 8 propositions.`);
 const choices=q.choices.map((choice:any,index:number)=>{
   // Les annales non corrigées n'ont pas nécessairement de champ correct.
   // Une valeur manquante n'est JAMAIS considérée comme une correction fiable.
   const id=String(choice?.id??String.fromCharCode(65+index)).trim().toUpperCase();
   const txt=choice?.text;
   if(!id||typeof txt!=='string'||!txt.trim())throw new Error(`Proposition ${index+1} incomplète pour ${q.id} : identifiant ou texte manquant.`);
   if(choice.chapterId!==undefined&&typeof choice.chapterId!=='string')throw new Error(`Chapitre de proposition invalide pour ${q.id}, ${id}.`);
   if(choice.correct!==undefined&&typeof choice.correct!=='boolean')throw new Error(`Correction invalide pour ${q.id}, ${id}.`);
   return {...choice,id,text:txt,...(typeof choice.correct==='boolean'?{correct:choice.correct}:{correct:undefined})};
 });
 if(new Set(choices.map(c=>c.id)).size!==choices.length)throw new Error(`Identifiants des propositions en double pour ${q.id}.`);
 // Jamais de publication si les corrections sont absentes ou non relues.
 const verified=q.verified===true;
 if(q.verified!==undefined&&typeof q.verified!=='boolean')throw new Error(`verified doit être vrai ou faux pour ${q.id}.`);
 if(verified&&q.choices.some((c:any)=>typeof c.correct!=='boolean'))throw new Error(`Corrections manquantes pour ${q.id} : laissez verified:false.`);
 return {id:q.id,chapterIds:(q.chapterIds??[]).filter(id=>chapterSet.has(id)),stem:q.stem,choices,explanation:q.explanation||'',verified};
}
export async function isContentEditor():Promise<boolean>{const {data}=await call('/rest/v1/norya_content_editors?select=user_id&limit=1');return Array.isArray(data)&&data.length>0;}
export async function listSharedQcm():Promise<{q:NoryaQcm;published:boolean}[]> {
 const {data}=await call('/rest/v1/norya_qcm?select=payload,published&order=updated_at.desc&limit=1000');
 return (data||[]).flatMap((row:any)=>{try{return [{q:validateQcm(row.payload),published:!!row.published}];}catch{return [];}});
}
export async function saveQcm(items:NoryaQcm[],publish:boolean):Promise<number>{
 if(!await isContentEditor())throw new Error('Seul un administrateur peut importer ou publier des QCM.');
 const s=await getSession();if(!s)throw new Error('Connexion requise.');
 if(items.length>300)throw new Error('Importer au maximum 300 QCM par fichier.');
 const validated=items.map(validateQcm);
 if(new Set(validated.map(q=>q.id)).size!==validated.length)throw new Error('Questions en double.');
 if(publish&&validated.some(q=>!q.verified))throw new Error('Vérifiez chaque QCM avant publication (verified: true).');
 if(publish&&validated.some(q=>q.choices.length<2||q.choices.length>8||/^\[Transcription à compléter/.test(q.stem)))throw new Error('Publication impossible : certaines questions sont incomplètes ou sans propositions. Elles peuvent rester en brouillon.');
 const rows=validated.map(q=>({id:q.id,chapter_ids:q.chapterIds,payload:q,published:publish,updated_at:new Date().toISOString(),updated_by:s.user.id}));
 await call('/rest/v1/norya_qcm?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
 return rows.length;
}
export const qcmExportTemplate=()=>({format:'norya-qcm-batch',schemaVersion:1,chapters:examChapters.map(c=>({id:c.id,title:c.chapter,pages:c.pages})),instructions:'Conserver exactement id, stem, choices et les corrections. chapterIds peut rester vide en attendant un classement manuel. Affecter chapterIds parmi les IDs fournis si connus. Pour chaque proposition, ajouter chapterId, printedPage, blockId uniquement si une correspondance fiable est présente dans les cours fournis. Ne pas inventer des références. Laisser verified=false jusqu’à relecture. Retourner un JSON valide avec questions.',questions:[] as NoryaQcm[]});
export function parseBatch(raw:string):NoryaQcm[]{const obj=JSON.parse(raw);if(obj?.format!=='norya-qcm-batch'||obj?.schemaVersion!==1||!Array.isArray(obj.questions))throw new Error('Format attendu : norya-qcm-batch, schemaVersion 1, questions[].');return obj.questions.map(validateQcm);}
