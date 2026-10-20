import {useEffect,useState} from 'react';
import {View,TextInput} from 'react-native';
import {Screen,Card,Txt,Button,s} from '../src/components/ui';
import {cloudConfigured,getSession,signIn,signOut,signUp,saveProgressCloud,checkCloudProgress,restoreMissingProgress} from '../src/services/cloud/account';
export default function Account(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[signed,setSigned]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void getSession().then(s=>setSigned(s?.user?.email||'')).catch(e=>setMessage(String(e)));},[]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <Screen title="Mon compte Norya" subtitle="Compte personnel et sauvegarde de progression" back>
 <Card><Txt bold size={18}>Connexion Supabase</Txt>
 {!cloudConfigured?<Txt>Supabase n'est pas encore configuré. Ajoute les deux variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sur Vercel, puis redéploie.</Txt>:
 signed?<><Txt>Connectée : {signed}</Txt><Button title="Déconnexion" secondary disabled={busy} onPress={()=>void run(async()=>{await signOut();setSigned('');})}/></>:
 <><Txt>Adresse e-mail</Txt><TextInput accessibilityLabel="Adresse e-mail" style={s.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/><Txt>Mot de passe (au moins 6 caractères)</Txt><TextInput accessibilityLabel="Mot de passe" style={s.input} secureTextEntry value={password} onChangeText={setPassword}/><Button title="Se connecter" disabled={busy||!email||!password} onPress={()=>void run(async()=>{const session=await signIn(email,password);setSigned(session.user.email||email);setPassword('');})}/><Button title="Créer un compte" secondary disabled={busy||!email||password.length<6} onPress={()=>void run(async()=>{setMessage(await signUp(email,password));setPassword('');const session=await getSession();if(session)setSigned(session.user.email||email);})}/></>}
 </Card>
 {signed?<Card><Txt bold size={18}>Sauvegarde de la progression</Txt><Txt>Cette première version sauvegarde le profil, la progression et les cartes. Les PDF, chapitres vérifiés, images, annotations et traductions ne sont PAS encore synchronisés.</Txt><Button title="Sauvegarder ma progression sur Supabase" disabled={busy} onPress={()=>void run(async()=>{const count=await saveProgressCloud();setMessage(`${count} espaces de progression sauvegardés.`);})}/><Button title="Vérifier la sauvegarde disponible" secondary disabled={busy} onPress={()=>void run(async()=>{const backup=await checkCloudProgress();setMessage(backup?`Sauvegarde du ${new Date(backup.date).toLocaleString()} (${backup.keys.length} espaces).`:'Aucune sauvegarde distante.');})}/><Button title="Récupérer sur un nouvel appareil (sans écraser)" secondary disabled={busy} onPress={()=>void run(async()=>{const result=await restoreMissingProgress();setMessage(`${result.added} espaces récupérés, ${result.skipped} espaces locaux conservés. Recharge Norya pour afficher la progression.`);})}/><Txt>Important : la récupération ignore tout espace déjà présent dans ce navigateur. N'efface aucune donnée locale. Pour le moment, ne fais pas de modification de progression sur deux appareils sans sauvegarder et vérifier : la fusion automatique n'est pas encore activée.</Txt></Card>:null}
 {!!message?<Card><Txt>{message}</Txt></Card>:null}
 </Screen>;
}
