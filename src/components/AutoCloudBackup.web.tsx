import {useEffect} from 'react';
import {cloudConfigured,getSession} from '../services/cloud/account';
import {saveAutomaticSnapshot} from '../services/cloud/automaticBackup.web';
export default function AutoCloudBackup(){
 useEffect(()=>{
 if(!cloudConfigured)return;
 let alive=true;let lastAttempt=0;
 const sync=async()=>{if(!alive||!navigator.onLine||document.visibilityState==='hidden'||Date.now()-lastAttempt<5*60_000)return;
 lastAttempt=Date.now();try{if(await getSession())await saveAutomaticSnapshot();}catch(e){console.warn('Norya: sauvegarde automatique non effectuée',e);}};
 const onVisible=()=>{if(document.visibilityState==='visible')void sync();};
 const interval=setInterval(()=>void sync(),5*60_000);
 const startup=setTimeout(()=>void sync(),20000);
 window.addEventListener('online',sync);document.addEventListener('visibilitychange',onVisible);
 return()=>{alive=false;clearInterval(interval);clearTimeout(startup);window.removeEventListener('online',sync);document.removeEventListener('visibilitychange',onVisible);};
 },[]);return null;
}
