const test = require('node:test');
const assert = require('node:assert/strict');
const {buildPlan,dailyCapacity} = require('../.test-build/domain/preparation/planner');
const {createState,reduceState} = require('../.test-build/domain/preparation/state');
const {recordWork} = require('../.test-build/domain/preparation/progress');
const {passProgress,passMinutes} = require('../.test-build/domain/preparation/passes');
const {validateProfile} = require('../.test-build/domain/preparation/profile');
const {PreparationRepository} = require('../.test-build/services/storage/repository');
const {objectives,pageCount} = require('../.test-build/data/program');
const today='2026-01-01';
const program=objectives.slice(0,3);
function state() {const s=createState(today,'multi','Europe/Bucharest');s.profile={...s.profile,name:'Ana',year:'2026',examDate:{provisional:'2026-11-20'},firstPassTarget:'2026-10-21',targetPasses:3};s.onboarded=true;return s;}
function event(pass,id='p'+pass,completed=true,minutes=10) {return {id,objectiveId:program[0].id,on:today,kind:'pass',pass,minutes,completed,source:'self'};}
test('aucune date inventée et bornes des tours/rythme',()=>{
 const blank=createState(today,'new','Europe/Bucharest');assert.equal(blank.profile.examDate.provisional,'');assert.equal(buildPlan(program,blank,today).tasks.length,0);
 for(const targetPasses of [0,11,2.5,NaN]) assert.ok(validateProfile({...state().profile,targetPasses}).length);
 assert.equal(validateProfile(state().profile).length,0);
 assert.equal(pageCount('1–3, 3–5, 9'),6);
});
test('3 tours complets séquentiels, inégaux, à J−30, sans mutation',()=>{
 const s=state(),before=JSON.stringify(s),plan=buildPlan(program,s,today);
 assert.equal(JSON.stringify(s),before);assert.equal(plan.deadline,'2026-10-21');assert.equal(plan.feasible,true);
 for(let pass=1;pass<=3;pass++) {
  for(const o of program) {const tasks=plan.tasks.filter(t=>t.pass===pass&&t.objectiveId===o.id);assert.equal(tasks.reduce((n,t)=>n+t.minutes,0),passMinutes(o,s.profile,pass));assert.equal(tasks.filter(t=>t.finishesObjective).length,1);}
  if(pass>1) assert.ok(plan.tasks.find(t=>t.pass===pass).on>=plan.passes[pass-2].forecast);
 }
 assert.ok(plan.tasks.some(t=>t.kind==='review'));
 for(const day of new Set(plan.tasks.map(t=>t.on))) assert.ok(plan.tasks.filter(t=>t.on===day).reduce((n,t)=>n+t.minutes,0)<=dailyCapacity(s.profile,day));
});
test('validation explicite anticipée, partielle, rappels séparés et idempotence',()=>{
 let s=state();assert.throws(()=>recordWork(s,program[0],event(2)));
 s=recordWork(s,program[0],event(1,'partial',false));assert.equal(passProgress(s.progress[program[0].id],1).completedOn,undefined);
 s=recordWork(s,program[0],event(1));const before=JSON.stringify(s);assert.equal(recordWork(s,program[0],event(1)),s);
 s=recordWork(s,program[0],{...event(1,'review'),kind:'review',minutes:10,performance:'good'});
 assert.equal(passProgress(s.progress[program[0].id],2).completedOn,undefined);
 s=recordWork(s,program[0],event(2));s=recordWork(s,program[0],event(3));
 for(let n=1;n<=3;n++)assert.equal(passProgress(s.progress[program[0].id],n).completedOn,today);
 assert.ok(before.includes('partial'));assert.throws(()=>recordWork(s,program[0],event(3,'duplicate')));
});
test('diminuer/remonter les tours et changer le rythme préserve tout après redémarrage',async()=>{
 let s=state();s.notes[program[0].id]='Annotation RO–FR';
 for(let p=1;p<=3;p++)s=recordWork(s,program[0],event(p));
 const journal=JSON.stringify(s.events),progress=JSON.stringify(s.progress);
 s=reduceState(s,{type:'profile',profile:{...s.profile,targetPasses:1,minutesPerPage:3}},program);
 let raw=JSON.stringify(s);const storage={getItem:async()=>raw,setItem:async(_,v)=>{raw=v;}};
 const repo=new PreparationRepository(storage,program);await repo.load(()=>{throw Error('Ne doit pas réinitialiser');});
 await repo.commit({type:'profile',profile:{...s.profile,targetPasses:4}});
 const reopened=await new PreparationRepository(storage,program).load(()=>state());
 assert.equal(JSON.stringify(reopened.events),journal);assert.equal(JSON.stringify(reopened.progress),progress);assert.equal(reopened.notes[program[0].id],'Annotation RO–FR');
 assert.equal(buildPlan(program,reopened,today).passes[2].completed,1);
});
test('retard, absence, impossibilité et dernier mois conservent rappels et tours',()=>{
 let s=state();s=recordWork(s,program[0],event(1));s.profile.weeklyMinutes=[20,20,20,20,20,20,20];s.profile.restDays=[];
 s.profile.constraints.unavailableDates=['2026-10-22'];
 const plan=buildPlan(objectives,s,'2026-10-21');assert.equal(plan.feasible,false);assert.ok(plan.requiredMinutesPerAvailableDay>20);
 assert.ok(plan.tasks.some(t=>t.kind==='review'&&t.phase==='final'));assert.ok(plan.tasks.some(t=>t.kind==='pass'&&t.phase==='final'));
 assert.ok(!plan.tasks.some(t=>t.on==='2026-10-22'));
 const later=buildPlan(objectives,s,'2026-10-25');assert.ok(later.tasks.every(t=>t.on>='2026-10-25'));assert.equal(s.events.length,1);
});
test('contenus reliés au programme, RO–FR et cartes uniques indépendantes des tours',()=>{
 const {romanianLessons,romanianFlashcards}=require('../.test-build/data/romanianLessons');
 const {medicalFlashcards}=require('../.test-build/data/medical');
 const cards=[...medicalFlashcards,...romanianFlashcards];assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
 for(const lesson of romanianLessons){assert.ok(objectives.some(o=>o.id===lesson.chapterId));for(const section of lesson.sections){assert.ok(section.text.ro&&section.text.fr&&section.express.ro&&section.express.fr&&section.pages);}for(const q of lesson.questions){assert.ok(q.choices[q.answer]&&q.pages);}}
});
test('un nouveau tour préserve le statut fragile et les acquis évalués',()=>{
 let s=recordWork(state(),program[0],event(1));
 s=recordWork(s,program[0],{...event(1,'r'),kind:'review',minutes:10,performance:'again'});
 s=recordWork(s,program[0],event(2));assert.equal(s.progress[program[0].id].status,'fragile');
});
