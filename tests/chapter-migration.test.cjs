const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),Module=require('module'),ts=require('typescript');
const {IDBFactory}=require('fake-indexeddb'),{PNG}=require('pngjs');
const original=Module._load;
Module._load=function(n,...args){
 if(n==='react-native')return {Platform:{OS:'web'}};
 if(n==='@react-native-async-storage/async-storage')return {getItem:async()=>null,setItem:async()=>{}};
 if(n==='expo-file-system')return {};
 if(n==='expo-document-picker')return {};
 if(n==='expo-sharing')return {};
 return original.call(this,n,...args);
};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);
const {parseChapterBackup,packageLegacyExport}=require('../src/domain/sourceCourse/chapterBackup.ts');
const {buildStructureExport}=require('../src/domain/sourceCourse/structureExport.ts');
const {reconcileReviewValidation}=require('../src/domain/sourceCourse/verification.ts');
const {manualTranslationTemplate,parseManualTranslation,appendManualTranslation}=require('../src/domain/sourceCourse/manualTranslation.ts');
const {emptyReadingData}=require('../src/domain/sourceCourse/readingData.ts');
const {restoreChapterBackup,exportChapterBackup}=require('../src/services/storage/chapterBackup.ts');
const {loadReadingData,updateReadingData}=require('../src/domain/sourceCourse/readingStorage.ts');
const {composePdfPage}=require('../src/domain/sourceCourse/pdfExtraction.ts');
const image='data:image/png;base64,'+PNG.sync.write(new PNG({width:2,height:2})).toString('base64');
global.Image=class {set src(value){try{PNG.sync.read(Buffer.from(value.split(',')[1],'base64'));this.naturalWidth=2;queueMicrotask(()=>this.onload());}catch{queueMicrotask(()=>this.onerror());}}};
function fixture(){const part={id:'b',kind:'text',role:'paragraph',status:'unverified',sourceLineIds:['l'],text:'Salut.',lines:[[{text:'Salut.',bold:false,italic:false}]],reasons:[],bbox:[0,0,10,10],image};const packet={schemaVersion:2,chapterId:'test-chapter',sourceSha256:'a'.repeat(64),mode:'structured-source-draft',complete:false,pages:[{printedPage:1,pdfPage:1,width:20,height:20,pdf:'JVBERi0xLjQK',image,sourceLineIds:['l'],parts:[part],control:{status:'human-review-pending'}}]};const validation=reconcileReviewValidation(null,packet);const final={version:1,finalizedAt:'2026-10-20T00:00:00.000Z',packet,validation,anomalies:[],humanConfirmation:{visualsAndMergesChecked:true},presentations:{'[1,"b"]':{text:'Salut.',imageOnly:false,hide:false}}};return {packet,validation,final};}
test('portable restore, reload, export and reimport; refuses existing data',async()=>{
 global.indexedDB=new IDBFactory();const {packet,validation,final}=fixture();const backup={format:'norya-chapter-backup',version:1,chapterId:packet.chapterId,exportedAt:new Date().toISOString(),packet,validation,archive:{schemaVersion:1,chapterId:packet.chapterId,revision:1,status:'finalized',activeVersion:1,versions:[final]},reading:emptyReadingData(packet.chapterId)};
 await restoreChapterBackup(backup);const exported=await exportChapterBackup(packet.chapterId);
 assert.deepEqual(exported.packet,packet);assert.deepEqual(exported.archive,backup.archive);assert.deepEqual(exported.validation,validation);
 await assert.rejects(restoreChapterBackup(backup),/déjà/);
 global.indexedDB=new IDBFactory();await restoreChapterBackup(parseChapterBackup(JSON.stringify(exported),packet.chapterId));assert.deepEqual((await exportChapterBackup(packet.chapterId)).archive,backup.archive);
});
test('legacy migration preserves corrections and never manufactures finalization',()=>{const {packet,validation}=fixture();validation.pages[0].blocks[0].correction='Salut corrigé.';const legacy=buildStructureExport(packet,validation);const b=packageLegacyExport(packet,legacy);assert.equal(b.validation.pages[0].blocks[0].correction,'Salut corrigé.');assert.equal(b.archive,null);assert.equal(b.reading,null);legacy.blocks[0].rawText='wrong';assert.throws(()=>packageLegacyExport(packet,legacy),/bruts/);});
test('manual FR on one block persists, rejects wrong version and keeps RO',async()=>{global.indexedDB=new IDBFactory();const {final}=fixture();const source=JSON.stringify(final);const template=await manualTranslationTemplate(final);template.blocks[0].french='Bonjour.';const imported=await parseManualTranslation(JSON.stringify(template),final);await updateReadingData(final.packet.chapterId,d=>appendManualTranslation(d,imported.translations));assert.equal((await loadReadingData(final.packet.chapterId)).translations[0].french,'Bonjour.');assert.equal(JSON.stringify(final),source);template.version='2';await assert.rejects(parseManualTranslation(JSON.stringify(template),final),/incompatible/);});
test('PDF composition initializes independent chapter blocks for manual review',()=>{const spans=[{id:'l',text:'Fiction.',bold:false,italic:false,bbox:[1,1,10,10]}];const parts=composePdfPage(spans,20,20,{columns:1,regions:[]},()=>image);assert.equal(parts[0].text,'Fiction.');assert.equal(parts[0].status,'unverified');});
