import {romanianLessons} from '../../data/romanianLessons';
import {examChapters} from '../../data/rezidentiat2026';
import {addDays} from '../preparation/dates';
import type {Attempt,LearningState} from './types';
import {scoreRomanianQuestion} from './examScoring';
export const questionBank=romanianLessons.flatMap(l=>l.questions.map(q=>({...q,chapterId:l.chapterId,version:l.version??'1.0.0',bookId:examChapters.find(c=>c.id===l.chapterId)!.bookId})));
export type Question=typeof questionBank[number];
export function scoreQuestion(q:Question,selected:number[],mode:Attempt['scoring']) {
 const answers=q.answers??[q.answer];
 if(new Set(selected).size!==selected.length || selected.some(n=>!Number.isInteger(n)||n<0||n>=q.choices.length))throw new Error('Sélection invalide.');
 const correct=answers.length===selected.length&&answers.every(n=>selected.includes(n));
 if(mode==='romanian-draft'&&q.choices.length===5){
  const official=scoreRomanianQuestion(answers.length===1?'single':'multiple',answers,selected,q.choices.length);
  return {correct:official.correct,score:official.score,maxScore:official.maxScore};
 }
 return {correct,score:correct?1:0,maxScore:1};
}
export function makeAttempt(q:Question,selected:number[],scoring:Attempt['scoring'],on:string,id:string,elapsedSeconds:number):Attempt {
 const result=scoreQuestion(q,selected,scoring);
 return {id,questionId:q.id,chapterId:q.chapterId,on,selected:[...selected],correctAnswers:q.answers??[q.answer],...result,scoring,elapsedSeconds:Math.max(0,Math.floor(elapsedSeconds)),nextReviewOn:addDays(on,result.correct?7:1),snapshot:{prompt:`${q.prompt.ro}\n${q.prompt.fr}`,choices:q.choices.map(c=>`${c.ro} / ${c.fr}`),explanation:q.choiceReasons?.map((r,i)=>`${String.fromCharCode(65+i)} · ${r.ro} / ${r.fr}`).join('\n')??`${q.explanation.ro}\n${q.explanation.fr}`,pages:q.pages,version:q.version,notion:q.notion,sectionId:q.sectionId,sectionIndex:q.sectionIndex}};
}
export function filterQuestions(state:LearningState,chapter:string,book:string,filter:string) {
 return questionBank.filter(q=>(chapter==='Tous'||q.chapterId===chapter)&&(book==='Tous'||q.bookId===book)&&(filter!=='Jamais faites'||!state.attempts.some(a=>a.questionId===q.id))&&(filter!=='Déjà ratées'||state.attempts.some(a=>a.questionId===q.id&&!a.correct)));
}
export function shuffle<T>(values:T[],random= Math.random):T[]{const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
