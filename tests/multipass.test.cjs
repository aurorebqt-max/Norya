const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildPlan,dailyCapacity} = require('../.test-build/domain/preparation/planner');
const {createState,reduceState} = require('../.test-build/domain/preparation/state');
const {recordWork,completionPercent} = require('../.test-build/domain/preparation/progress');
const {passProgress,passMinutes} = require('../.test-build/domain/preparation/passes');
const {groupDailyTasks,groupDailyEvents} = require('../.test-build/domain/preparation/dailyTasks');
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
test('pourcentage de progression borné et exact aux extrêmes',()=>{
 assert.equal(completionPercent(0,10),0);assert.equal(completionPercent(1,100),1);
 assert.equal(completionPercent(1,2),50);assert.equal(completionPercent(10,10),100);
 assert.equal(completionPercent(12,10),100);assert.equal(completionPercent(1,0),0);
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
test('charge automatique facultative, tâches regroupées et travail libre recalculé',()=>{
 const s=state(),objective=program[0];
 assert.equal(dailyCapacity(s.profile,today),240);
 assert.equal(dailyCapacity({...s.profile,availabilityConfigured:true,weeklyMinutes:[20,20,20,20,20,20,20],restDays:[]},today),20);
 const base={objectiveId:objective.id,on:today,kind:'pass',pass:1,minutes:10,finishesObjective:false,phase:'first-pass'};
 const grouped=groupDailyTasks([{...base,id:'a'},{...base,id:'b',minutes:15,finishesObjective:true},{...base,id:'c',pass:2,phase:'second-pass'},{...base,id:'d',kind:'review',pass:undefined}]);
 assert.equal(grouped.length,3);
 assert.equal(grouped.find(task=>task.pass===1).minutes,25);
 assert.equal(grouped.find(task=>task.pass===1).finishesObjective,true);
 const events=groupDailyEvents([
  {...event(1,'section-a',false),objectiveId:objective.id},
  {...event(1,'section-b',true),objectiveId:objective.id},
 ]);
 assert.equal(events.length,1);
 assert.equal(events[0].count,2);
 assert.equal(events[0].event.completed,true);
 const free={id:'free-library-session',objectiveId:objective.id,on:today,kind:'pass',pass:1,minutes:passMinutes(objective,s.profile,1),completed:true,source:'self'};
 let updated=recordWork(s,objective,free);
 assert.equal(updated.progress[objective.id].passes[1].completedOn,today);
 assert.equal(buildPlan(program,updated,today).tasks.some(task=>task.objectiveId===objective.id&&task.pass===1),false);
 assert.equal(recordWork(updated,objective,free),updated);
 assert.equal(updated.events.length,1);
});
test('navigation et lecteur exposent un seul profil et des contrôles de lecture simplifiés',()=>{
 const sidebar=fs.readFileSync(path.join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8');
 const chapter=fs.readFileSync(path.join(__dirname,'../src/screens/Chapter.tsx'),'utf8');
 const coverage=fs.readFileSync(path.join(__dirname,'../src/data/courseCoverage.ts'),'utf8');
 assert.equal((sidebar.match(/title: "Progression"/g)||[]).length,1);
 assert.doesNotMatch(sidebar,/Ma progression/);
 assert.ok(sidebar.includes('links.filter((l) => l.name !== "coach")'));
 assert.equal((sidebar.match(/router\.push\("\/profile"\)/g)||[]).length,1);
 for(const label of ['Traduire en français','Retour au roumain','Surligner la sélection','Mes notes','Faire les QCM'])assert.ok(chapter.includes(label));
 for(const removed of ['Outils de lecture','Mon vocabulaire médical','Ajouter les cartes au deck','Entraînement libre du chapitre','Copier un extrait exact','Périmètre officiel','Source complète'])assert.ok(!chapter.includes(removed));
 assert.ok(chapter.includes('nativeID={`norya-course-${section.id}-p${paragraphIndex}`}'));
 assert.ok(chapter.includes('window.getSelection()'));
 assert.ok(coverage.includes('remainingTopics'));
});
test('contenus reliés au programme, RO–FR et cartes uniques indépendantes des tours',()=>{
 const {romanianLessons,romanianFlashcards}=require('../.test-build/data/romanianLessons');
 const {medicalFlashcards}=require('../.test-build/data/medical');
 const cards=[...medicalFlashcards,...romanianFlashcards];assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
 for(const lesson of romanianLessons){assert.ok(objectives.some(o=>o.id===lesson.chapterId));for(const section of lesson.sections){assert.ok(section.text.ro&&section.text.fr&&section.express.ro&&section.express.fr&&section.pages);}for(const q of lesson.questions){assert.ok(q.choices[q.answer]&&q.pages);}}
});
test('les trois cours reconstruits remplacent les anciennes leçons et restent explicitement partiels',()=>{
 const {romanianLessons}=require('../.test-build/data/romanianLessons');
 const {reconstructedLessons}=require('../.test-build/data/reconstructedLessons');
 const {courseCoverage}=require('../.test-build/data/courseCoverage');
 assert.deepEqual(reconstructedLessons.map(value=>value.chapterId),['kum-08','kum-09','kum-10']);
 for(const lesson of reconstructedLessons){
  assert.equal(lesson.coverage,'partial');
  assert.equal(lesson.verification,'needs-review');
  assert.ok(lesson.sections.length>0);
  assert.ok(lesson.sections.every(section=>section.id&&section.text.ro&&section.text.fr&&section.sourcePdfPages));
  assert.ok(lesson.questions.every(question=>question.sectionId===lesson.sections[question.sectionIndex]?.id));
  assert.equal(courseCoverage[lesson.chapterId].humanMedicalReview,'not-performed');
  assert.ok(courseCoverage[lesson.chapterId].notionCoverage.every(item=>item.sourcePrintedPages&&item.sourcePdfPages));
  assert.ok(courseCoverage[lesson.chapterId].notionCoverage.every(item=>!item.sectionId||lesson.sections.some(section=>section.id===item.sectionId)));
  assert.equal(romanianLessons.filter(value=>value.chapterId===lesson.chapterId).length,1);
 }
 assert.equal(reconstructedLessons[0].sections.length,60);
 assert.deepEqual(reconstructedLessons.slice(1).map(value=>value.sections.length),[7,6]);
 assert.ok(reconstructedLessons[0].sections.every(section=>section.id.startsWith('kum-08-v2-')));
 assert.ok(reconstructedLessons[0].sections.every(section=>!section.id.includes('kum-08-rebuild-')));
 const activeSepsis=romanianLessons.find(value=>value.chapterId==='kum-08');
 assert.equal(activeSepsis.questions.length,6);
 assert.ok(activeSepsis.questions.every(question=>activeSepsis.sections.some(section=>section.id===question.sectionId)));
 const {revisionTables}=require('../.test-build/data/revisionTables');
 assert.ok(revisionTables['kum-08-v2-sofa'].some(table=>table.sourcePages==='155'));
 assert.equal(courseCoverage['kum-08'].pageMatrix.length,18);
 assert.deepEqual(courseCoverage['kum-08'].pageMatrix.map(page=>page.printedPage),Array.from({length:18},(_,i)=>i+151));
 assert.ok(courseCoverage['kum-08'].pageMatrix.every(page=>page.read&&page.pdfPage===page.printedPage+23&&page.sectionIds.every(id=>reconstructedLessons[0].sections.some(section=>section.id===id))));
 assert.equal(courseCoverage['kum-08'].completeBookPdfPages,'174–191');
 assert.equal(courseCoverage['kum-09'].completeBookPdfPages,'195–213; 218–225');
 assert.equal(courseCoverage['kum-10'].completeBookPdfPages,'247–256');
 assert.equal(courseCoverage['kum-09'].printedBookPages,'172–190; 195–202');
 assert.ok(reconstructedLessons[0].sections.some(section=>section.text.ro.includes('SOFA')));
 assert.ok(reconstructedLessons[1].sections.some(section=>section.text.ro.includes('8 mmol/L în 24 h')));
 assert.ok(reconstructedLessons[2].sections.some(section=>section.text.ro.includes('PEEP ≥5 cmH₂O')));
 assert.ok(courseCoverage['kum-08'].remainingTopics.some(topic=>topic.includes('dose table')));
});
test('seuils SDRA et profils thyroïdiens restent liés aux folios du manuel',()=>{
 const {romanianLessons}=require('../.test-build/data/romanianLessons');
 const {revisionTables}=require('../.test-build/data/revisionTables');
 const respiratory=romanianLessons.find(value=>value.chapterId==='kum-10');
 const thyroid=romanianLessons.find(value=>value.chapterId==='kum-21');
 const berlin=respiratory.sections.find(section=>section.id==='kum-10-rebuild-ards');
 assert.equal(respiratory.version,'1.0.0');
 assert.match(berlin.text.ro,/300, 200 și 100 mmHg/);
 assert.match(berlin.text.ro,/necesită revizuire vizuală/);
 assert.match(revisionTables['kum-10-rebuild-ards'][0].rows[2][1].ro,/<100/);
 assert.equal(thyroid.version,'1.0.1');
 assert.match(thyroid.sections[0].text.ro,/TSH 0,3–3,5 mU\/L, fT4 10–25 pmol\/L și fT3 3,5–7,5 pmol\/L/);
 assert.equal(revisionTables['kum-21-interpreteaza-tsh-impreuna-cu-hormonii'][0].sourcePages,'611');
 assert.ok(revisionTables['kum-21-interpreteaza-tsh-impreuna-cu-hormonii'][0].rows.some(row=>row[0].ro==='Toxicoză T3'));
});
test('barème roumain : points simples, multiples partiels et réponses hors limites',()=>{
 const {scoreRomanianQuestion}=require('../.test-build/domain/learning/examScoring');
 assert.deepEqual(scoreRomanianQuestion('single',[0],[0]),{score:4,maxScore:4,correct:true,valid:true});
 assert.equal(scoreRomanianQuestion('single',[0],[1]).score,0);
 assert.equal(scoreRomanianQuestion('single',[0],[]).valid,false);
 assert.equal(scoreRomanianQuestion('single',[0],[0,1]).score,0);
 assert.equal(scoreRomanianQuestion('multiple',[0,2],[0,2]).score,5);
 assert.equal(scoreRomanianQuestion('multiple',[0,2],[0,1]).score,3);
 assert.equal(scoreRomanianQuestion('multiple',[0,2],[0,1,2]).score,4);
 assert.equal(scoreRomanianQuestion('multiple',[0,2],[0]).valid,false);
 assert.equal(scoreRomanianQuestion('multiple',[0,2],[0,1,2,3,4]).score,0);
 assert.throws(()=>scoreRomanianQuestion('multiple',[0,0],[0,1]));
 const {romanianExamBlueprint}=require('../.test-build/domain/learning/examScoring');
 assert.equal(romanianExamBlueprint.simpleQuestions*4+romanianExamBlueprint.multipleQuestions*5,950);
 for(let mask=0;mask<32;mask++){
  const selected=Array.from({length:5},(_,i)=>i).filter(i=>mask&(1<<i));
  const simple=scoreRomanianQuestion('single',[0],selected);
  assert.equal(simple.score,selected.length===1&&selected[0]===0?4:0);
  const multiple=scoreRomanianQuestion('multiple',[0,2],selected);
  const expected=selected.length<2||selected.length>4?0:Array.from({length:5},(_,i)=>Number([0,2].includes(i)===selected.includes(i))).reduce((sum,n)=>sum+n,0);
  assert.equal(multiple.score,expected);
 }
});
test('comparaison historique ne prédit pas de rang et ignore les données non vérifiées',()=>{
 const {historicallyReachedCutoffs}=require('../.test-build/domain/learning/historical');
 const records=[
  {year:2024,domain:'medicine',specialty:'A',universityCenter:'B',lastScore:700,lastRank:500,sourceUrl:'https://example.org',collectedOn:today,verification:'verified'},
  {year:2025,domain:'medicine',specialty:'C',universityCenter:'D',lastScore:680,sourceUrl:'https://example.org',collectedOn:today,verification:'needs-review'},
 ];
 assert.deepEqual(historicallyReachedCutoffs(720,records).map(record=>record.specialty),['A']);
 assert.deepEqual(historicallyReachedCutoffs(650,records),[]);
 assert.throws(()=>historicallyReachedCutoffs(-1,records));
});
test('durées estimées depuis le contenu et QCM reliés à leur partie',()=>{
 const {romanianLessons}=require('../.test-build/data/romanianLessons');
 const {estimateLesson}=require('../.test-build/domain/learning/estimate');
 const {questionBank,makeAttempt}=require('../.test-build/domain/learning/quiz');
 for(const lesson of romanianLessons){
  const duration=estimateLesson(lesson);
  assert.ok(duration.readingMinutes>0);
  assert.ok(duration.attentiveMinutes>=duration.readingMinutes);
  for(const question of lesson.questions)assert.ok(Number.isInteger(question.sectionIndex)&&question.sectionIndex>=0&&question.sectionIndex<lesson.sections.length,`${question.id} doit être reliée à une partie`);
 }
 const question=questionBank.find(q=>q.chapterId==='kum-08');
 const attempt=makeAttempt(question,[(question.answers??[question.answer])[0]],'exact',today,'test-attempt',5);
 assert.equal(attempt.snapshot.notion,question.notion);
 assert.equal(attempt.snapshot.sectionIndex,question.sectionIndex);
 const illustrated={...romanianLessons[0],sections:romanianLessons[0].sections.map((section,index)=>index===0?{...section,illustrations:2}:section)};
 assert.ok(estimateLesson(illustrated).sectionReadingMinutes[0]>=estimateLesson(romanianLessons[0]).sectionReadingMinutes[0]+3);
});
test('tentatives et reprise de lecture survivent au rechargement sans doublon',async()=>{
 const {LearningRepository}=require('../.test-build/domain/learning/store');
 const {questionBank,makeAttempt}=require('../.test-build/domain/learning/quiz');
 let raw=null;
 const storage={getItem:async()=>raw,setItem:async(_,value)=>{raw=value;}};
 const question=questionBank.find(q=>q.chapterId==='kum-08');
 const attempt=makeAttempt(question,[(question.answers??[question.answer])[0]===0?1:0],'exact',today,'persistent-attempt',12);
 const repository=new LearningRepository(storage);
 await repository.load();
 await repository.commit({type:'attempt',attempt});
 await repository.commit({type:'reading',id:question.chapterId,value:{section:2,readSections:[0,1],language:'RO',mode:'Complet',updatedOn:today}});
 await repository.commit({type:'attempt',attempt});
 const restored=await new LearningRepository(storage).load();
 assert.equal(restored.attempts.length,1);
 assert.equal(restored.attempts[0].snapshot.notion,question.notion);
 assert.deepEqual(restored.reading[question.chapterId].readSections,[0,1]);
});
test('les erreurs créent une mini-fiche dédupliquée et persistante, sans inventer un statut vérifié',async()=>{
 const {LearningRepository}=require('../.test-build/domain/learning/store');
 const {questionBank,makeAttempt}=require('../.test-build/domain/learning/quiz');
 let raw=null;const storage={getItem:async()=>raw,setItem:async(_,value)=>{raw=value;}};
 const question=questionBank.find(q=>q.chapterId==='kum-08');
 const answers=question.answers??[question.answer],wrong=question.choices.findIndex((_,i)=>!answers.includes(i));
 const repository=new LearningRepository(storage);await repository.load();
 const failed=makeAttempt(question,[wrong],'exact',today,'error-one',8);
 await repository.commit({type:'attempt',attempt:failed});
 let restored=await new LearningRepository(storage).load();
 assert.equal(restored.attempts.length,1);assert.equal(restored.errorCards.length,1);
 assert.equal(restored.errorCards[0].status,'awaiting-verification');assert.equal(restored.errorCards[0].attemptCount,1);
 const recovered=makeAttempt(question,answers,'exact',today,'error-two',7);
 await repository.commit({type:'attempt',attempt:recovered});
 restored=await new LearningRepository(storage).load();
 assert.equal(restored.errorCards.length,1);assert.equal(restored.errorCards[0].attemptCount,2);
 assert.equal(restored.errorCards[0].status,'awaiting-verification');assert.deepEqual(restored.errorCards[0].questionIds,[question.id]);
});
test('notes de partie, surlignages ancrés et séance QCM sont persistants et dédupliqués',async()=>{
 const {LearningRepository,decodeLearning}=require('../.test-build/domain/learning/store');
 const {questionBank}=require('../.test-build/domain/learning/quiz');
 let raw=null;const storage={getItem:async()=>raw,setItem:async(_,value)=>{raw=value;}};
 const question=questionBank[0],sectionId=question.sectionId;
 assert.ok(sectionId);
 const repository=new LearningRepository(storage);await repository.load();
 const highlight={id:`${question.chapterId}:${sectionId}:RO:repère`,chapterId:question.chapterId,sectionId,language:'RO',text:'repère',blockId:`${sectionId}:p1`,start:4,end:10,color:'blue'};
 const session={questionIds:[question.id],index:0,selected:[0],attemptIds:[]};
 await repository.commit({type:'section-note',id:`${question.chapterId}:${sectionId}`,text:'À revoir demain'});
 await repository.commit({type:'highlight',value:highlight,enabled:true});
 await repository.commit({type:'highlight',value:highlight,enabled:true});
 await repository.commit({type:'practice-session',value:session});
 const restored=await new LearningRepository(storage).load();
 assert.equal(restored.sectionNotes[`${question.chapterId}:${sectionId}`],'À revoir demain');
 assert.equal(restored.highlights.length,1);assert.equal(restored.highlights[0].text,'repère');
 assert.equal(restored.highlights[0].blockId,`${sectionId}:p1`);assert.equal(restored.highlights[0].color,'blue');
 assert.deepEqual(restored.practiceSession,session);
 const legacy=decodeLearning(JSON.stringify({...restored,sectionNotes:undefined,highlights:undefined,practiceSession:undefined}));
 assert.deepEqual(legacy.highlights,[]);assert.deepEqual(legacy.sectionNotes,{});
 const textOnly=decodeLearning(JSON.stringify({...restored,highlights:[{id:'legacy',chapterId:question.chapterId,sectionId,language:'RO',text:'ancien passage'}]}));
 assert.equal(textOnly.highlights[0].text,'ancien passage');
 assert.equal(textOnly.highlights[0].blockId,undefined);
});
test('reconstruction archive la reprise, préserve les acquis et met en attente les annotations anciennes',async()=>{
 const {LearningRepository,emptyLearning}=require('../.test-build/domain/learning/store');
 const {questionBank,makeAttempt}=require('../.test-build/domain/learning/quiz');
 let raw=null;const storage={getItem:async()=>raw,setItem:async(_,value)=>{raw=value;}};
 const question=questionBank.find(value=>value.chapterId==='kum-08');
 const attempt=makeAttempt(question,[question.answer],'exact',today,'migration-attempt',9);
 const oldReading={section:4,readSections:[0,1,2,3],language:'RO',mode:'Complet',updatedOn:today};
 const unrelatedReading={...oldReading,section:1,readSections:[0]};
 const state=emptyLearning();
 state.attempts=[attempt];
 state.reading={'kum-08':oldReading,'kum-31':unrelatedReading};
 state.sectionNotes={'kum-08:ancienne-partie':'note à revoir','kum-31:section':'note conservée'};
 state.highlights=[{id:'old-mark',chapterId:'kum-08',sectionId:'ancienne-partie',language:'RO',text:'passage ancien',color:'blue'}];
 state.errorCards=[{id:'kum-08:ancienne-question',chapterId:'kum-08',notion:'ancienne question',questionIds:['legacy-q'],latestQuestionId:'legacy-q',prompt:'question',selected:[0],correctAnswers:[1],nextReviewOn:today,status:'corrected',attemptCount:2}];
 state.personalCards=[{id:'personal-card',objectiveId:'kum-08',itemNumber:0,subject:'personal',recto:'front',verso:'back',sourceVersionId:'personal'}];
 raw=JSON.stringify(state);
 const repository=new LearningRepository(storage);
 let migrated=await repository.load();
 assert.deepEqual(migrated.archivedReadings['kum-08'],oldReading);
 assert.equal(migrated.reading['kum-08'],undefined);
 assert.deepEqual(migrated.reading['kum-31'],unrelatedReading);
 assert.equal(migrated.sectionNotes['kum-31:section'],'note conservée');
 assert.equal(migrated.sectionNotes['kum-08:ancienne-partie'],undefined);
 assert.equal(migrated.orphanedAnnotations.length,2);
 assert.equal(migrated.attempts[0].id,'migration-attempt');
 assert.equal(migrated.errorCards[0].status,'awaiting-verification');
 assert.equal(migrated.personalCards[0].id,'personal-card');
 migrated=await new LearningRepository(storage).load();
 assert.equal(migrated.orphanedAnnotations.length,2);
 await repository.reattachAnnotation('note:kum-08:ancienne-partie','kum-08-v2-clinical-skills');
 migrated=await new LearningRepository(storage).load();
 assert.equal(migrated.sectionNotes['kum-08:kum-08-v2-clinical-skills'],'note à revoir');
 assert.ok(migrated.orphanedAnnotations.some(item=>item.id==='highlight:old-mark'));
});
test('migration de contenu v1 à v2 conserve les anciennes archives et réassocie les données vers le nouveau cours',async()=>{
 const {LearningRepository,emptyLearning}=require('../.test-build/domain/learning/store');
 let raw=null;const storage={getItem:async()=>raw,setItem:async(_,value)=>{raw=value;}};
 const previousArchive={section:2,readSections:[0,1],language:'RO',mode:'Complet',updatedOn:today};
 const currentReading={section:1,readSections:[0],language:'FR',mode:'Express',updatedOn:today};
 const state=emptyLearning();
 state.courseContentVersion=1;
 state.archivedReadings={'kum-08':previousArchive};
 state.reading={'kum-08':currentReading};
 state.sectionNotes={'kum-08:kum-08-rebuild-sepsis-definition':'ancienne note'};
 raw=JSON.stringify(state);
 const migrated=await new LearningRepository(storage).load();
 assert.equal(migrated.courseContentVersion,2);
 assert.deepEqual(migrated.archivedReadings['kum-08'],currentReading);
 assert.deepEqual(migrated.archivedReadingHistory['kum-08'],[previousArchive]);
 assert.equal(migrated.reading['kum-08'],undefined);
 assert.equal(migrated.sectionNotes['kum-08:kum-08-rebuild-sepsis-definition'],undefined);
 assert.equal(migrated.orphanedAnnotations[0].text,'ancienne note');
 const reopened=await new LearningRepository(storage).load();
 assert.deepEqual(reopened.archivedReadingHistory['kum-08'],[previousArchive]);
});
test('un nouveau tour préserve le statut fragile et les acquis évalués',()=>{
 let s=recordWork(state(),program[0],event(1));
 s=recordWork(s,program[0],{...event(1,'r'),kind:'review',minutes:10,performance:'again'});
 s=recordWork(s,program[0],event(2));assert.equal(s.progress[program[0].id].status,'fragile');
});
