import AsyncStorage from '@react-native-async-storage/async-storage';

const sessionKey = 'norya.cloud.session.v1';
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const cloudConfigured = !!(url && apiKey);
type Session = {access_token:string; refresh_token:string; expires_at:number; user:{id:string;email?:string}};
const keys = ['norya.preparation','norya.learning.v1','norya.medical-learning'];
function endpoint(path:string) { if (!cloudConfigured) throw new Error('Configurer EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans Vercel.'); return `${url}${path}`; }
async function request(path:string, opts:RequestInit = {}, bearer?:string) {
 const res=await fetch(endpoint(path),{...opts,headers:{apikey:apiKey,'Content-Type':'application/json',...(bearer?{Authorization:`Bearer ${bearer}`}:{Authorization:`Bearer ${apiKey}`}),...opts.headers}});
 const raw=await res.text(); let data:any; try{data=raw?JSON.parse(raw):null;}catch{data=null;}
 if(!res.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Supabase : erreur ${res.status}`);
 return data;
}
export async function getSession():Promise<Session|null>{
 const raw=await AsyncStorage.getItem(sessionKey); if(!raw)return null;
 let saved:Session;try{saved=JSON.parse(raw);}catch{return null;}
 if(!saved.access_token || !saved.refresh_token || !saved.user?.id)return null;
 if(saved.expires_at > Date.now()+90_000)return saved;
 try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:saved.refresh_token})}); const next:Session={...data,expires_at:Date.now()+data.expires_in*1000}; await AsyncStorage.setItem(sessionKey,JSON.stringify(next));return next;}
 catch { await AsyncStorage.removeItem(sessionKey);return null; }
}
export async function signIn(email:string,password:string):Promise<Session>{
 const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:email.trim(),password})});
 const session:Session={...data,expires_at:Date.now()+data.expires_in*1000}; await AsyncStorage.setItem(sessionKey,JSON.stringify(session));return session;
}
export async function signUp(email:string,password:string):Promise<string>{
 const data=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:email.trim(),password})});
 if(data.access_token){const session:Session={...data,expires_at:Date.now()+data.expires_in*1000};await AsyncStorage.setItem(sessionKey,JSON.stringify(session));return 'Compte créé et connecté.';}
 return 'Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.';
}
export async function signOut(){const s=await getSession();if(s)try{await request('/auth/v1/logout',{method:'POST'},s.access_token);}catch{}await AsyncStorage.removeItem(sessionKey);}
export type ProgressBackup={schemaVersion:1;createdAt:string;entries:Record<string,string>};
export async function saveProgressCloud():Promise<number>{
 const s=await getSession();if(!s)throw new Error('Connecte-toi avant de sauvegarder.');
 const entries:Record<string,string>={};for(const k of keys){const v=await AsyncStorage.getItem(k);if(v!==null)entries[k]=v;}
 if(!Object.keys(entries).length)throw new Error('Aucune progression locale à sauvegarder.');
 const backup:ProgressBackup={schemaVersion:1,createdAt:new Date().toISOString(),entries};
 await request('/rest/v1/norya_progress_backups?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:s.user.id,payload:backup,updated_at:backup.createdAt})},s.access_token);
 return Object.keys(entries).length;
}
export async function checkCloudProgress():Promise<{date:string;keys:string[]}|null>{
 const s=await getSession();if(!s)throw new Error('Connecte-toi.');
 const data=await request(`/rest/v1/norya_progress_backups?user_id=eq.${encodeURIComponent(s.user.id)}&select=updated_at,payload`,{},s.access_token);
 const entry=data?.[0];if(!entry)return null;
 const payload=entry.payload as ProgressBackup;
 if(payload?.schemaVersion!==1 || !payload.entries || typeof payload.entries!=='object')throw new Error('Sauvegarde distante illisible : aucune donnée modifiée.');
 return {date:entry.updated_at,keys:Object.keys(payload.entries)};
}
/** Recovery is additive only: never overwrite existing local progress. */
export async function restoreMissingProgress():Promise<{added:number;skipped:number}>{
 const s=await getSession();if(!s)throw new Error('Connecte-toi.');
 const data=await request(`/rest/v1/norya_progress_backups?user_id=eq.${encodeURIComponent(s.user.id)}&select=payload`,{},s.access_token);
 const payload=data?.[0]?.payload as ProgressBackup|undefined;
 if(!payload || payload.schemaVersion!==1 || !payload.entries || typeof payload.entries!=='object')throw new Error('Aucune sauvegarde compatible trouvée.');
 let added=0,skipped=0;
 for(const k of keys){const value=payload.entries[k];if(typeof value!=='string')continue;JSON.parse(value); if(await AsyncStorage.getItem(k)!==null){skipped++;continue;}await AsyncStorage.setItem(k,value);added++;}
 return {added,skipped};
}
