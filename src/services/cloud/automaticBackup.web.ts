import AsyncStorage from '@react-native-async-storage/async-storage';
import {getSession,cloudConfigured} from './account';

// Each device owns its own backup history. Never overwrite another device's data.
const url=(process.env.EXPO_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const anon=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||'';
const deviceKey='norya.cloud.device-id.v1';
const lastKey='norya.cloud.last-snapshot.v1';
const databases=['norya-finalized-courses','norya-course-reading','norya-revision-cards','norya-validations','norya-anomalies','norya-private-pdfs'];
const MAX_SNAPSHOT=45*1024*1024;
type Entry={key:string;value:any};
type Snapshot={schemaVersion:1;createdAt:string;deviceId:string;asyncEntries:Record<string,string>;databases:Record<string,Record<string,Entry[]>>;excluded:string[]};
function toBase64(data:Uint8Array):string {let out='';for(let i=0;i<data.length;i+=8192)out+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(out);}
function fromBase64(value:string):Uint8Array{const raw=atob(value);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
async function encode(value:any):Promise<any>{
 if(value instanceof Blob)return {__noryaBlob:true,type:value.type,base64:toBase64(new Uint8Array(await value.arrayBuffer()))};
 if(value instanceof ArrayBuffer)return {__noryaArrayBuffer:true,base64:toBase64(new Uint8Array(value))};
 if(ArrayBuffer.isView(value))return {__noryaArrayBuffer:true,base64:toBase64(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))};
 return value;
}
function decode(value:any){if(value?.__noryaBlob)return new Blob([fromBase64(value.base64)],{type:value.type});if(value?.__noryaArrayBuffer)return fromBase64(value.base64).buffer;return value;}
async function dbOpen(name:string):Promise<IDBDatabase|null>{return new Promise((resolve,reject)=>{const r=indexedDB.open(name);let created=false;r.onupgradeneeded=()=>{created=true;r.transaction?.abort();};r.onsuccess=()=>{if(created){r.result.close();resolve(null);}else resolve(r.result);};r.onerror=()=>{if(created)resolve(null);else reject(r.error);};});}
async function readDatabase(name:string):Promise<Record<string,Entry[]>>{
 let db:IDBDatabase|null;try{db=await dbOpen(name);}catch{return {};};if(!db)return {};
 const result:Record<string,Entry[]>={};try{for(const storeName of Array.from(db.objectStoreNames)){
 result[storeName]=await new Promise<Entry[]>((resolve,reject)=>{const tx=db!.transaction(storeName,'readonly');const store=tx.objectStore(storeName);const keys=store.getAllKeys();const values=store.getAll();tx.oncomplete=()=>{Promise.all(values.result.map(encode)).then(v=>resolve(keys.result.map((key,i)=>({key:String(key),value:v[i]}))),reject);};tx.onerror=()=>reject(tx.error);});
 }}finally{db.close();}return result;
}
async function deviceId(){let id=await AsyncStorage.getItem(deviceKey);if(!id){id=`device-${Date.now()}-${Math.random().toString(36).slice(2)}`;await AsyncStorage.setItem(deviceKey,id);}return id;}
async function collect():Promise<Snapshot>{const id=await deviceId();const asyncEntries:Record<string,string>={};
 const keys=await AsyncStorage.getAllKeys();for(const k of keys){if(k.startsWith('norya.')&&!k.startsWith('norya.cloud.')){const v=await AsyncStorage.getItem(k);if(v!==null)asyncEntries[k]=v;}}
 const dbs:Snapshot['databases']={};const excluded:string[]=[];
 for(const name of databases){try{dbs[name]=await readDatabase(name);}catch(e){throw new Error(`Sauvegarde interrompue : lecture de ${name} impossible (${String(e)}).`);}}
 return {schemaVersion:1,createdAt:new Date().toISOString(),deviceId:id,asyncEntries,databases:dbs,excluded};}
async function upload(path:string,body:string,token:string){const res=await fetch(`${url}/storage/v1/object/norya-device-backups/${path}`,{method:'POST',headers:{apikey:anon,Authorization:`Bearer ${token}`,'Content-Type':'application/json','x-upsert':'false'},body});if(!res.ok)throw new Error(`Sauvegarde cloud refusée (${res.status}) : ${(await res.text()).slice(0,220)}`);}
let running:Promise<string>|null=null;
export function saveAutomaticSnapshot():Promise<string>{if(running)return running;running=(async()=>{
 const session=await getSession();if(!session)throw new Error('Compte non connecté.');
 const snapshot=await collect();const body=JSON.stringify(snapshot);
 if(body.length>MAX_SNAPSHOT)throw new Error('Sauvegarde trop volumineuse (>45 Mo). Exporter les PDF et images séparément : aucune sauvegarde cloud n’a été déclarée.');
 // Immutable timestamped object; each device gets its own files. No cross-device overwrite.
 const path=`${session.user.id}/${snapshot.deviceId}/${Date.now()}.json`;
 await upload(path,body,session.access_token);await AsyncStorage.setItem(lastKey,new Date().toISOString());return snapshot.createdAt;
 })().finally(()=>{running=null;});return running;}
export async function lastAutomaticSnapshot(){return AsyncStorage.getItem(lastKey);}
export async function listDeviceSnapshots():Promise<{name:string;id:string;created_at:string}[]>{const session=await getSession();if(!session)throw new Error('Compte non connecté.');const id=await deviceId();const res=await fetch(`${url}/storage/v1/object/list/norya-device-backups`,{method:'POST',headers:{apikey:anon,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({prefix:`${session.user.id}/${id}/`,limit:100,sortBy:{column:'created_at',order:'desc'}})});if(!res.ok)throw new Error('Impossible de vérifier les sauvegardes.');return res.json();}
/** Only insert absent records. A separate user-triggered recovery is required. */
export async function restoreSnapshotMissingOnly(path:string):Promise<{added:number;skipped:number}>{
 const session=await getSession();if(!session)throw new Error('Compte non connecté.');if(!path.startsWith(`${session.user.id}/`)||!path.endsWith('.json'))throw new Error('Chemin de sauvegarde invalide.');
 const res=await fetch(`${url}/storage/v1/object/authenticated/norya-device-backups/${path}`,{headers:{apikey:anon,Authorization:`Bearer ${session.access_token}`}});if(!res.ok)throw new Error('Téléchargement impossible.');const snap=await res.json() as Snapshot;
 if(snap.schemaVersion!==1||!snap.asyncEntries||!snap.databases)throw new Error('Format incompatible.');let added=0,skipped=0;
 for(const [key,val] of Object.entries(snap.asyncEntries)){if(!key.startsWith('norya.')||key.startsWith('norya.cloud.'))continue;if(await AsyncStorage.getItem(key)===null){await AsyncStorage.setItem(key,val);added++;}else skipped++;}
 for(const [name,stores] of Object.entries(snap.databases)){if(!databases.includes(name))continue;const db=await dbOpen(name);if(!db)continue;try{for(const [storeName,entries] of Object.entries(stores)){if(!db.objectStoreNames.contains(storeName))continue;for(const entry of entries){await new Promise<void>((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');const store=tx.objectStore(storeName);const r=store.get(entry.key);r.onsuccess=()=>{if(r.result===undefined){store.put(decode(entry.value),entry.key);added++;}else skipped++;};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}}}finally{db.close();}}
 return {added,skipped};
}
export async function listAllSnapshots():Promise<{path:string;date:string}[]>{
 const session=await getSession();if(!session)throw new Error('Compte non connecté.');
 async function list(prefix:string){const r=await fetch(`${url}/storage/v1/object/list/norya-device-backups`,{method:'POST',headers:{apikey:anon,Authorization:`Bearer ${session!.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:1000,sortBy:{column:'created_at',order:'desc'}})});if(!r.ok)throw new Error(`Liste des sauvegardes indisponible (${r.status}).`);return await r.json() as {name:string;created_at:string;id:string|null}[];}
 const base=`${session.user.id}/`;const devices=await list(base);const result:{path:string;date:string}[]=[];
 for(const device of devices){if(device.id!==null)continue;const folder=`${base}${device.name}/`;for(const f of await list(folder)){if(f.name.endsWith('.json')&&f.id!==null)result.push({path:folder+f.name,date:f.created_at});}}
 return result.sort((a,b)=>b.date.localeCompare(a.date));
}
