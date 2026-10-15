import { importedKumarEnabled } from "../data/importedKumar";
import { useLearning } from "./LearningProvider";
import { usePreparation } from "./PreparationProvider";
import { Card, Txt } from "../components/ui";
import { romanianFlashcards } from "../data/romanianLessons";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDays, todayInZone } from "../domain/preparation/dates";
import { medicalFlashcards } from "../data/medical";
import type { CardProgress, FlashcardReviewRating } from "../domain/medical/types";

const STORAGE_KEY = "norya.medical-learning";
type Persisted = {
  validatedSheets: string[];
  cards: Record<string, CardProgress>;
  audioCompleted: string[];
  audioProgress: Record<string, number>;
  practiceResults: Record<string, { correct: number; total: number; lastOn: string }>;
  practiceErrors: string[];
};
type Store = {
  done: string[];
  complete: (id: string) => void;
  resolved: string[];
  resolve: (id: string) => void;
  reviewedCards: string[];
  validatedSheets: string[];
  validateSheet: (sheetId: string, cardIds: string[]) => Promise<void>;
  addCards: (cardIds: string[]) => Promise<void>;
  availableCards: typeof medicalFlashcards;
  cardProgress: Record<string, CardProgress>;
  legacyCourseCardIds: string[];
  reviewCard: (cardId: string, rating?: FlashcardReviewRating) => Promise<void>;
  audioCompleted: string[];
  audioProgress: Record<string, number>;
  saveAudioProgress: (sheetId: string, seconds: number) => Promise<void>;
  completeAudio: (sheetId: string, cardIds: string[]) => Promise<void>;
  practiceResults: Persisted["practiceResults"];
  practiceErrors: string[];
  recordPractice: (questionId: string, objectiveId: string, correct: boolean) => Promise<void>;
};
const Context = createContext<Store | null>(null);
const initial: Persisted = { validatedSheets: [], cards: {}, audioCompleted: [], audioProgress: {}, practiceResults: {}, practiceErrors: [] };

function valid(raw: string | null): Persisted {
  if (!raw) return initial;
  try {
    const value = JSON.parse(raw) as Partial<Persisted>;
    if (
      !Array.isArray(value.validatedSheets) ||
      !value.validatedSheets.every((x) => typeof x === "string") ||
      !value.cards ||
      typeof value.cards !== "object"
    )
      throw new Error("Données pédagogiques illisibles : conservation sans remplacement.");
    return {
      validatedSheets: value.validatedSheets,
      cards: value.cards as Record<string, CardProgress>,
      audioCompleted: Array.isArray(value.audioCompleted) ? value.audioCompleted : [],
      audioProgress: value.audioProgress && typeof value.audioProgress === "object" ? value.audioProgress as Record<string, number> : {},
      practiceResults: value.practiceResults && typeof value.practiceResults === "object" ? value.practiceResults as Persisted["practiceResults"] : {},
      practiceErrors: Array.isArray(value.practiceErrors) ? value.practiceErrors : [],
    };
  } catch {
    throw new Error("Données pédagogiques illisibles : conservation sans remplacement.");
  }
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const {learning}=useLearning();
  const preparation=usePreparation();
  const [saved, setSaved] = useState<Persisted>(initial);
  const stored = useRef<Persisted>(initial);
  const ready = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [loadError,setLoadError] = useState("");
  const [loaded,setLoaded] = useState(false);
  const [resolved, setResolved] = useState<string[]>([]);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {stored.current=valid(raw);setSaved(stored.current);ready.current=true;setLoaded(true);}).catch(e=>setLoadError(e instanceof Error?e.message:"Lecture impossible. Vos données sont conservées."));
  }, []);
  const persist = async (next: Persisted) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    stored.current=next;
    setSaved(next);
  };
  const serialized = (action:()=>Promise<void>) => {
    const task=queue.current.then(()=>{if(!ready.current)throw new Error("Stockage pédagogique indisponible : aucune donnée remplacée.");return action();});
    queue.current=task.catch(()=>undefined);
    return task;
  };
  const validateSheet = async (sheetId: string, cardIds: string[]) => {
    const saved=stored.current;
    const next: Persisted = { ...saved, validatedSheets: saved.validatedSheets.includes(sheetId) ? saved.validatedSheets : [...saved.validatedSheets, sheetId], cards: { ...saved.cards } };
    const today = todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris");
    for (const cardId of cardIds) {
      if (!next.cards[cardId])
        next.cards[cardId] = { cardId, addedOn: today, nextReviewOn: today, repetitions: 0, intervalDays: 0, easeFactor: 2.5, historyCount: 0 };
    }
    await persist(next);
  };
  const reviewCard = async (cardId: string, rating: FlashcardReviewRating = "good") => {
    const saved=stored.current;
    const current = saved.cards[cardId];
    if (!current) return;
    const today = todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris");
    const interval = rating === "again" ? 1 : rating === "hard" ? Math.max(1, Math.round(current.intervalDays * 1.2)) : rating === "good" ? Math.max(1, current.intervalDays ? current.intervalDays * 2 : 2) : Math.max(2, current.intervalDays ? current.intervalDays * 3 : 4);
    await persist({
      ...saved,
      cards: { ...saved.cards, [cardId]: { ...current, lastRating: rating, historyCount: current.historyCount + 1, repetitions: rating === "again" ? 0 : current.repetitions + 1, intervalDays: interval, nextReviewOn: addDays(today, interval), easeFactor: Math.max(1.3, current.easeFactor + (rating === "easy" ? 0.15 : rating === "again" ? -0.2 : 0)) } },
    });
  };
  const saveAudioProgress = async (sheetId: string, seconds: number) => {
    const saved=stored.current;
    await persist({ ...saved, audioProgress: { ...saved.audioProgress, [sheetId]: Math.max(0, Math.floor(seconds)) } });
  };
  const completeAudio = async (sheetId: string, cardIds: string[]) => {
    const saved=stored.current;
    const next: Persisted = {
      ...saved,
      validatedSheets: saved.validatedSheets.includes(sheetId) ? saved.validatedSheets : [...saved.validatedSheets, sheetId],
      audioCompleted: saved.audioCompleted.includes(sheetId) ? saved.audioCompleted : [...saved.audioCompleted, sheetId],
      cards: { ...saved.cards },
    };
    const today = todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris");
    for (const cardId of cardIds)
      if (!next.cards[cardId]) next.cards[cardId] = { cardId, addedOn: today, nextReviewOn: today, repetitions: 0, intervalDays: 0, easeFactor: 2.5, historyCount: 0 };
    await persist(next);
  };
  const recordPractice = async (questionId: string, objectiveId: string, correct: boolean) => {
    const saved=stored.current;
    const today = todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris");
    const previous = saved.practiceResults[objectiveId] ?? { correct: 0, total: 0, lastOn: today };
    await persist({
      ...saved,
      practiceResults: { ...saved.practiceResults, [objectiveId]: { correct: previous.correct + (correct ? 1 : 0), total: previous.total + 1, lastOn: today } },
      practiceErrors: correct ? saved.practiceErrors : saved.practiceErrors.includes(questionId) ? saved.practiceErrors : [...saved.practiceErrors, questionId],
    });
  };
  useEffect(()=>{
    if(!loaded)return;
    const chapters=[...new Set(preparation.state.events.filter(e=>e.completed&&(e.kind==='initial'||e.kind==='pass')).map(e=>e.objectiveId))];
    for(const id of chapters){
      const ids=romanianFlashcards.filter(c=>c.objectiveId===id).map(c=>c.id);
      if(ids.length&&ids.some(card=>!saved.cards[card]))void serialized(()=>validateSheet(id,ids)).catch(e=>setLoadError(e.message));
    }
    const missing=learning.personalCards.filter(c=>!saved.cards[c.id]).map(c=>c.id);
    if(missing.length)void serialized(()=>validateSheet('personal',missing)).catch(e=>setLoadError(e.message));
  },[loaded,preparation.state.events,learning.personalCards,saved.cards]);
  if (loadError || !loaded) return <Card><Txt>{loadError || "Chargement des acquis pédagogiques…"}</Txt></Card>;
  return (
    <Context.Provider value={{
      done: saved.validatedSheets,
      complete: (id) => void serialized(()=>validateSheet(id, [])),
      resolved,
      resolve: (id) => setResolved((current) => current.includes(id) ? current : [...current, id]),
      reviewedCards: Object.values(saved.cards).filter((card) => card.historyCount > 0).map((card) => card.cardId),
      validatedSheets: saved.validatedSheets,
      validateSheet: (id,cards)=>serialized(()=>validateSheet(id,cards)),
      addCards: (cardIds)=>serialized(async()=>{
        const saved=stored.current;
        const next:Persisted={...saved,cards:{...saved.cards}};
        const today=todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Paris");
        for(const cardId of cardIds)if(!next.cards[cardId])next.cards[cardId]={cardId,addedOn:today,nextReviewOn:today,repetitions:0,intervalDays:0,easeFactor:2.5,historyCount:0};
        await persist(next);
      }),
      availableCards: [...medicalFlashcards.filter(card => !importedKumarEnabled || !["kum-08", "kum-09"].includes(card.objectiveId)), ...romanianFlashcards, ...learning.personalCards].filter((card) => Object.prototype.hasOwnProperty.call(saved.cards, card.id)),
      cardProgress: saved.cards,
      legacyCourseCardIds: Object.keys(saved.cards).filter(id => /^kum-(08|09|10)-card-\d+$/.test(id) || (importedKumarEnabled && !romanianFlashcards.some(card=>card.id===id) && /^(norya-kum-(08|09)-|glossary-)/.test(id))),
      reviewCard: (id,rating)=>serialized(()=>reviewCard(id,rating)),
      audioCompleted: saved.audioCompleted,
      audioProgress: saved.audioProgress,
      saveAudioProgress: (id,seconds)=>serialized(()=>saveAudioProgress(id,seconds)),
      completeAudio: (id,cards)=>serialized(()=>completeAudio(id,cards)),
      practiceResults: saved.practiceResults,
      practiceErrors: saved.practiceErrors,
      recordPractice: (id,objective,correct)=>serialized(()=>recordPractice(id,objective,correct)),
    }}>
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider required");
  return value;
}
