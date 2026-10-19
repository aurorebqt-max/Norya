import { importedKumarEnabled, importedKumarLessons } from "../../data/importedKumar";
import { romanianLessons } from "../../data/romanianLessons";
import { migrateKumarMarkdown } from "./kumarMigration";
import type { ErrorCard, LearningAction, LearningState, OrphanedAnnotation } from './types';
import { isDay } from '../preparation/dates';
import type { KeyValueStorage } from '../../services/storage/repository';
import { reconstructedLessons } from '../../data/reconstructedLessons';
export const LEARNING_KEY = 'norya.learning.v1';
const REBUILT_CHAPTER_IDS = new Set(reconstructedLessons.map(lesson => lesson.chapterId));
const REBUILT_SECTION_IDS = new Set(reconstructedLessons.flatMap(lesson => lesson.sections.map(section => section.id)));
export function emptyLearning(): LearningState {
  return {schemaVersion:1,attempts:[],favorites:[],difficultTerms:[],reading:{},personalCards:[],errorCards:[],sectionNotes:{},highlights:[]};
}
export function decodeLearning(raw: string): LearningState {
  const s = JSON.parse(raw) as LearningState;
  if (!s || s.schemaVersion !== 1 || !Array.isArray(s.attempts) || !Array.isArray(s.favorites) || !Array.isArray(s.difficultTerms) || !s.reading || typeof s.reading !== 'object' || Array.isArray(s.reading) || !Array.isArray(s.personalCards) || (s.errorCards!==undefined&&!Array.isArray(s.errorCards))) throw new Error('Version ou données pédagogiques invalides. Aucune donnée remplacée.');
  s.errorCards??=[];
  s.sectionNotes??={};
  s.highlights??=[];
  s.orphanedAnnotations??=[];
  s.archivedReadings??={};
  s.archivedReadingHistory??={};
  if (![...s.favorites,...s.difficultTerms].every(x=>typeof x==='string') || new Set(s.attempts.map(a=>a.id)).size!==s.attempts.length) throw new Error('Historique pédagogique invalide.');
  for(const a of s.attempts) if(!a.id || !a.questionId || !a.chapterId || !isDay(a.on) || !isDay(a.nextReviewOn) || !Array.isArray(a.selected) || !a.selected.every(Number.isInteger) || !Array.isArray(a.correctAnswers) || typeof a.correct!=='boolean' || !Number.isFinite(a.score) || !a.snapshot || !Array.isArray(a.snapshot.choices)) throw new Error('Tentative illisible. Historique conservé.');
  for(const r of Object.values(s.reading)) if(!Number.isInteger(r.section) || r.section<0 || !Array.isArray(r.readSections) || !r.readSections.every(n=>Number.isInteger(n)&&n>=0) || (r.completedByPass!==undefined&&(!r.completedByPass||typeof r.completedByPass!=='object'||Object.entries(r.completedByPass).some(([pass,sections])=>!/^([1-9]|10)$/.test(pass)||!Array.isArray(sections)||!sections.every(n=>Number.isInteger(n)&&n>=0)))) || !['RO','FR','Bilingue'].includes(r.language) || !['Complet','Express'].includes(r.mode)) throw new Error('Repère de lecture invalide.');
  for (const r of Object.values(s.reading)) {
    if ([r.sectionIds, r.sourceSections].some(ids => ids !== undefined && (!Array.isArray(ids) || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length)) ||
      (r.sourceSection !== undefined && typeof r.sourceSection !== 'string') ||
      (r.courseCompleted !== undefined && typeof r.courseCompleted !== 'boolean') ||
      (r.courseCompletedPass !== undefined && (!Number.isInteger(r.courseCompletedPass) || r.courseCompletedPass < 1 || r.courseCompletedPass > 10)))
      throw new Error('Progression du cours invalide. Données conservées.');
  }
  for(const c of s.personalCards) if(!c.id || !c.objectiveId || !c.recto || !c.verso) throw new Error('Carte personnelle invalide.');
  for(const c of s.errorCards) if(!c.id||!c.chapterId||!c.notion||!Array.isArray(c.questionIds)||!isDay(c.nextReviewOn)||!['awaiting-verification','fragile','corrected'].includes(c.status)||!Number.isInteger(c.attemptCount))throw new Error('Mini-fiche d’erreur invalide. Historique conservé.');
  if(!s.sectionNotes||typeof s.sectionNotes!=='object'||Array.isArray(s.sectionNotes)||Object.values(s.sectionNotes).some(value=>typeof value!=='string'))throw new Error('Notes de section invalides. Données conservées.');
  if(!Array.isArray(s.highlights)||s.highlights.some(value=>!value.id||!value.chapterId||!value.sectionId||!['RO','FR'].includes(value.language)||!value.text||(value.start!==undefined&&(!Number.isInteger(value.start)||value.start<0))||(value.end!==undefined&&(!Number.isInteger(value.end)||value.end<= (value.start??0)))||(value.color!==undefined&&!['yellow','green','pink','blue'].includes(value.color))))throw new Error('Surlignages invalides. Données conservées.');
  if(s.practiceSession&&(!Array.isArray(s.practiceSession.questionIds)||!s.practiceSession.questionIds.length||!Number.isInteger(s.practiceSession.index)||s.practiceSession.index<0||s.practiceSession.index>=s.practiceSession.questionIds.length||!Array.isArray(s.practiceSession.selected)||!s.practiceSession.selected.every(Number.isInteger)||(s.practiceSession.attemptIds!==undefined&&(!Array.isArray(s.practiceSession.attemptIds)||!s.practiceSession.attemptIds.every(value=>typeof value==='string')))))throw new Error('Séance de QCM invalide. Données conservées.');
  if(s.orphanedAnnotations!==undefined&&(!Array.isArray(s.orphanedAnnotations)||s.orphanedAnnotations.some(annotation=>!annotation.id||!annotation.chapterId||!annotation.previousSectionId||!annotation.text||(annotation.kind!=='note'&&annotation.kind!=='highlight')||(annotation.kind==='highlight'&&(!['RO','FR'].includes(annotation.language)||!['yellow','green','pink','blue',undefined].includes(annotation.color))))))throw new Error('Annotations à réassocier invalides. Données conservées.');
  if(s.archivedReadings!==undefined&&(!s.archivedReadings||typeof s.archivedReadings!=='object'||Array.isArray(s.archivedReadings)||Object.values(s.archivedReadings).some(r=>!Number.isInteger(r.section)||r.section<0||!Array.isArray(r.readSections)||!r.readSections.every(n=>Number.isInteger(n)&&n>=0)||!['RO','FR','Bilingue'].includes(r.language)||!['Complet','Express'].includes(r.mode))))throw new Error('Historique de lecture invalide. Données conservées.');
  if(s.archivedReadingHistory!==undefined&&(!s.archivedReadingHistory||typeof s.archivedReadingHistory!=='object'||Array.isArray(s.archivedReadingHistory)||Object.values(s.archivedReadingHistory).some(history=>!Array.isArray(history)||history.some(r=>!Number.isInteger(r.section)||r.section<0||!Array.isArray(r.readSections)||!r.readSections.every(n=>Number.isInteger(n)&&n>=0)||!['RO','FR','Bilingue'].includes(r.language)||!['Complet','Express'].includes(r.mode)))))throw new Error('Historique de lecture antérieur invalide. Données conservées.');
  return s;
}
export function migrateRebuiltCourseData(state: LearningState): LearningState {
  if ((state.courseContentVersion ?? 0) >= 2) return state;
  const next: LearningState = {
    ...state,
    reading: { ...state.reading },
    sectionNotes: { ...(state.sectionNotes ?? {}) },
    highlights: [...(state.highlights ?? [])],
    orphanedAnnotations: [...(state.orphanedAnnotations ?? [])],
    archivedReadings: { ...(state.archivedReadings ?? {}) },
    archivedReadingHistory: Object.fromEntries(Object.entries(state.archivedReadingHistory ?? {}).map(([chapterId, history]) => [chapterId, [...history]])),
    courseContentVersion: 2,
  };
  next.errorCards = next.errorCards.map(card => REBUILT_CHAPTER_IDS.has(card.chapterId)
    ? { ...card, status: 'awaiting-verification' }
    : card);
  for (const chapterId of REBUILT_CHAPTER_IDS) {
    const reading = next.reading[chapterId];
    if (reading) {
      const olderReading = next.archivedReadings![chapterId];
      if (olderReading && JSON.stringify(olderReading) !== JSON.stringify(reading)) {
        const history = next.archivedReadingHistory![chapterId] ?? [];
        if (!history.some(entry => JSON.stringify(entry) === JSON.stringify(olderReading))) {
          next.archivedReadingHistory![chapterId] = [...history, olderReading];
        }
      }
      next.archivedReadings![chapterId] = reading;
      delete next.reading[chapterId];
    }
  }
  for (const [key, text] of Object.entries(next.sectionNotes ?? {})) {
    const separator = key.indexOf(':');
    const chapterId = separator < 0 ? '' : key.slice(0, separator);
    const sectionId = separator < 0 ? '' : key.slice(separator + 1);
    if (!REBUILT_CHAPTER_IDS.has(chapterId) || REBUILT_SECTION_IDS.has(sectionId)) continue;
    const annotation: OrphanedAnnotation = {
      id: `note:${key}`,
      chapterId,
      kind: 'note',
      previousSectionId: sectionId,
      text,
    };
    if (!next.orphanedAnnotations!.some(item => item.id === annotation.id)) next.orphanedAnnotations!.push(annotation);
    delete next.sectionNotes![key];
  }
  const retained: NonNullable<LearningState['highlights']> = [];
  for (const highlight of next.highlights ?? []) {
    if (!REBUILT_CHAPTER_IDS.has(highlight.chapterId) || REBUILT_SECTION_IDS.has(highlight.sectionId)) {
      retained.push(highlight);
      continue;
    }
    const annotation: OrphanedAnnotation = {
      id: `highlight:${highlight.id}`,
      chapterId: highlight.chapterId,
      kind: 'highlight',
      previousSectionId: highlight.sectionId,
      text: highlight.text,
      language: highlight.language,
      color: highlight.color,
    };
    if (!next.orphanedAnnotations!.some(item => item.id === annotation.id)) next.orphanedAnnotations!.push(annotation);
  }
  next.highlights = retained;
  return next;
}
export function reduceLearning(s:LearningState,a:LearningAction):LearningState {
  if(a.type==='attempt') {
    if(s.attempts.some(x=>x.id===a.attempt.id))return s;
    const next={...s,attempts:[...s.attempts,a.attempt]};
    const notion=a.attempt.snapshot.notion?.trim()||a.attempt.snapshot.prompt.split('\n')[0];
    const existing=s.errorCards.some(card=>card.id===`${a.attempt.chapterId}:${notion}`);
    return !a.attempt.correct||existing?reduceLearning(next,{type:'error-card',attempt:a.attempt}):next;
  }
  if(a.type==='error-card') {
    const attempt=a.attempt;
    const notion=attempt.snapshot.notion?.trim()||attempt.snapshot.prompt.split('\n')[0];
    const id=`${attempt.chapterId}:${notion}`;
    const existing=s.errorCards.find(card=>card.id===id);
    const card:ErrorCard={id,chapterId:attempt.chapterId,notion,questionIds:[...new Set([...(existing?.questionIds??[]),attempt.questionId])],latestQuestionId:attempt.questionId,prompt:attempt.snapshot.prompt,selected:[...attempt.selected],correctAnswers:[...attempt.correctAnswers],nextReviewOn:attempt.nextReviewOn,status:'awaiting-verification',attemptCount:(existing?.attemptCount??0)+1};
    return {...s,errorCards:existing?s.errorCards.map(value=>value.id===id?card:value):[...s.errorCards,card]};
  }
  if(a.type==='reading') return {...s,reading:{...s.reading,[a.id]:a.value}};
  if(a.type==='personal-card') {
    if(s.personalCards.some(c=>c.id===a.card.id)) return s;
    return {...s,personalCards:[...s.personalCards,a.card]};
  }
  if(a.type==='section-note') return {...s,sectionNotes:{...s.sectionNotes,[a.id]:a.text}};
  if(a.type==='highlight') {
    const highlights=s.highlights??[];
    return {...s,highlights:a.enabled
      ? highlights.some(value=>value.id===a.value.id)?highlights:[...highlights,a.value]
      : highlights.filter(value=>value.id!==a.value.id)};
  }
  if(a.type==='practice-session') return {...s,practiceSession:a.value};
  const key=a.type==='favorite'?'favorites':'difficultTerms';
  return {...s,[key]:s[key].includes(a.id)?s[key].filter(x=>x!==a.id):[...s[key],a.id]};
}
export class LearningRepository {
  private current:LearningState|null=null;
  private queue:Promise<unknown>=Promise.resolve();
  constructor(private storage:KeyValueStorage){}
  async load(){
    const raw=await this.storage.getItem(LEARNING_KEY);
    const loaded=raw===null?emptyLearning():decodeLearning(raw);
    const rebuilt=migrateRebuiltCourseData(loaded);
    const migrated=importedKumarEnabled?migrateKumarMarkdown(rebuilt,importedKumarLessons):rebuilt;
    if(migrated!==loaded){
      if(raw!==null){
        // Backup is written AND read back before touching the active record. No destructive fallback.
        const suffix=importedKumarEnabled?importedKumarLessons.map(l=>l.version).join('-'):'rebuilt-v2';
        const backupKey=`${LEARNING_KEY}.before-${suffix}`;
        const existing=await this.storage.getItem(backupKey);
        if(existing===null){
          await this.storage.setItem(backupKey,raw);
          if(await this.storage.getItem(backupKey)!==raw)throw new Error('Sauvegarde de migration non confirmée. Données actives conservées.');
        }
      }
      decodeLearning(JSON.stringify(migrated));
      await this.storage.setItem(LEARNING_KEY,JSON.stringify(migrated));
    }
    this.current=migrated;return this.current;
  }
  commit(action:LearningAction):Promise<LearningState>{
    const task=this.queue.then(async()=>{
      if(!this.current)throw new Error('Stockage pédagogique non chargé.');
      const next=reduceLearning(this.current,action);
      if(next===this.current)return next;
      decodeLearning(JSON.stringify(next));
      await this.storage.setItem(LEARNING_KEY,JSON.stringify(next));this.current=next;return next;
    });this.queue=task.catch(()=>undefined);return task;
  }
  reattachAnnotation(annotationId:string,sectionId:string):Promise<LearningState>{
    const task=this.queue.then(async()=>{
      if(!this.current)throw new Error('Stockage pédagogique non chargé.');
      const annotation=this.current.orphanedAnnotations?.find(item=>item.id===annotationId);
      if(!annotation)throw new Error('Annotation introuvable.');
      if(!romanianLessons.some(lesson=>lesson.sections.some(section=>section.id===sectionId))||!sectionId.startsWith(`${annotation.chapterId}-`))throw new Error('La partie choisie ne correspond pas au chapitre.');
      const next={...this.current,orphanedAnnotations:this.current.orphanedAnnotations!.filter(item=>item.id!==annotationId)};
      if(annotation.kind==='note'){
        const key=`${annotation.chapterId}:${sectionId}`;
        const existing=next.sectionNotes?.[key];
        next.sectionNotes={...next.sectionNotes,[key]:existing?`${existing}\n\n[Annotation réassociée]\n${annotation.text}`:annotation.text};
      }
      else next.highlights=[...(next.highlights??[]),{id:annotation.id,chapterId:annotation.chapterId,sectionId,language:annotation.language,text:annotation.text,color:annotation.color}];
      decodeLearning(JSON.stringify(next));
      await this.storage.setItem(LEARNING_KEY,JSON.stringify(next));this.current=next;return next;
    });this.queue=task.catch(()=>undefined);return task;
  }
}
export function latestAttempts(state:LearningState) {
  const latest = new Map<string,LearningState['attempts'][number]>();
  for(const a of state.attempts) latest.set(a.questionId,a);
  return [...latest.values()];
}
