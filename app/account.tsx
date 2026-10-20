import {saveAutomaticSnapshot,lastAutomaticSnapshot,listAllSnapshots,restoreSnapshotMissingOnly} from '../src/services/cloud/automaticBackup.web';
import {useEffect,useState} from 'react';
import {View,TextInput} from 'react-native';
import {Screen,Card,Txt,Button,s} from '../src/components/ui';
import {cloudConfigured,getSession,signIn,signOut,signUp,saveProgressCloud,checkCloudProgress,restoreMissingProgress} from '../src/services/cloud/account';
export default function Account(){
 const [backups,setBackups]=useState<{path:string;date:string}[]>([]);const [lastBackup,setLastBackup]=useState(''); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[signed,setSigned]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void lastAutomaticSnapshot().then(x=>setLastBackup(x||'')).catch(()=>{});void getSession().then(s=>setSigned(s?.user?.email||'')).catch(e=>setMessage(String(e)));},[]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <Screen title="Mon compte Norya" subtitle="Compte personnel et sauvegarde de progression" back>
 <Card><Txt bold size={18}>Connexion Supabase</Txt>
 {!cloudConfigured?<Txt>Supabase n'est pas encore configuré. Ajoute les deux variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sur Vercel, puis redéploie.</Txt>:
 signed?<><Txt>Connectée : {signed}</Txt><Button title="Déconnexion" secondary disabled={busy} onPress={()=>void run(async()=>{await signOut();setSigned('');})}/></>:
 <><Txt>Adresse e-mail</Txt><TextInput accessibilityLabel="Adresse e-mail" style={s.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/><Txt>Mot de passe (au moins 6 caractères)</Txt><TextInput accessibilityLabel="Mot de passe" style={s.input} secureTextEntry value={password} onChangeText={setPassword}/><Button title="Se connecter" disabled={busy||!email||!password} onPress={()=>void run(async()=>{const session=await signIn(email,password);setSigned(session.user.email||email);setPassword('');})}/><Button title="Créer un compte" secondary disabled={busy||!email||password.length<6} onPress={()=>void run(async()=>{setMessage(await signUp(email,password));setPassword('');const session=await getSession();if(session)setSigned(session.user.email||email);})}/></>}
 </Card>
 {signed?<Card><Txt bold>Compte connecté</Txt><Txt>Les sauvegardes automatiques sont tentées lorsque Norya est ouvert et connecté.</Txt><Txt>Dernière archive confirmée ici : {lastBackup?new Date(lastBackup).toLocaleString():"aucune"}.</Txt><Button title="Vérifier mes archives" secondary disabled={busy} onPress={()=>void run(async()=>{const items=await listAllSnapshots();setBackups(items);setMessage(`${items.length} archive(s) disponible(s).`);})}/>{backups.slice(0,12).map(item=><Button key={item.path} title={`Récupérer les données absentes du ${new Date(item.date).toLocaleString()}`} secondary disabled={busy} onPress={()=>void run(async()=>{const result=await restoreSnapshotMissingOnly(item.path);setMessage(`${result.added} éléments récupérés, ${result.skipped} conservés. Recharge Norya.`);})}/>)}</Card>:null}
 {!!message?<Card><Txt>{message}</Txt></Card>:null}
 </Screen>;
}
