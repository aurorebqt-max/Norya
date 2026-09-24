import React, { createContext, useContext, useState } from 'react';
import { profile as initialProfile } from '../data/demo';
import { Profile } from '../types';
type Store = { profile: Profile; setProfile: (p: Profile) => void; done: string[]; complete: (id: string) => void; notes: Record<string,string>; saveNote: (id:string,note:string)=>void; resolved: string[]; resolve: (id:string)=>void; onboarded: boolean; finishOnboarding: ()=>void };
const Context = createContext<Store | null>(null);
export function DemoProvider({children}:{children:React.ReactNode}) {
 const [profile,setProfile]=useState(initialProfile); const [done,setDone]=useState<string[]>([]); const [notes,setNotes]=useState<Record<string,string>>({}); const [resolved,setResolved]=useState<string[]>([]); const [onboarded,setOnboarded]=useState(false);
 return <Context.Provider value={{profile,setProfile,done,complete:id=>setDone(v=>v.includes(id)?v:[...v,id]),notes,saveNote:(id,note)=>setNotes(v=>({...v,[id]:note})),resolved,resolve:id=>setResolved(v=>v.includes(id)?v:[...v,id]),onboarded,finishOnboarding:()=>setOnboarded(true)}}>{children}</Context.Provider>;
}
export function useDemo(){const value=useContext(Context);if(!value)throw new Error('DemoProvider required');return value;}
