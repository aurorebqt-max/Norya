import {useEffect} from 'react';
import {cloudConfigured,getSession} from '../services/cloud/account';
import {saveAutomaticSnapshot} from '../services/cloud/automaticBackup.web';

// Avoid repeatedly serializing large IndexedDB stores while Safari is busy.
const CLOUD_INTERVAL_MS = 15 * 60_000;
const START_DELAY_MS = 60_000;
export default function AutoCloudBackup(){
 useEffect(()=>{
  if(!cloudConfigured)return;
  let alive=true;
  let inFlight=false;
  let lastAttempt=Date.now();
  const sync=async()=>{
   if(!alive||inFlight||!navigator.onLine||document.visibilityState==='hidden'||Date.now()-lastAttempt<CLOUD_INTERVAL_MS)return;
   inFlight=true;
   lastAttempt=Date.now();
   try{if(await getSession())await saveAutomaticSnapshot();}
   catch(e){console.warn('Norya: sauvegarde automatique non effectuée',e);}
   finally{inFlight=false;}
  };
  const onVisible=()=>{if(document.visibilityState==='visible')void sync();};
  const interval=setInterval(()=>void sync(),CLOUD_INTERVAL_MS);
  const startup=setTimeout(()=>{lastAttempt=Date.now()-CLOUD_INTERVAL_MS;void sync();},START_DELAY_MS);
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',onVisible);
  return()=>{alive=false;clearInterval(interval);clearTimeout(startup);window.removeEventListener('online',sync);document.removeEventListener('visibilitychange',onVisible);};
 },[]);
 return null;
}
