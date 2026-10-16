const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { IDBFactory } = require('fake-indexeddb');
global.IS_REACT_ACT_ENVIRONMENT = true;
const records = new Map();
let holdSave;
let failSave = false;
let width = 1000;
const storage = {
  getItem: async key => records.get(key) ?? null,
  setItem: async (key, value) => { if (failSave) throw new Error('Storage full'); if (holdSave) await holdSave; records.set(key, value); },
};
const original = Module._load;
const native = { Platform: { OS: 'web' }, useWindowDimensions: () => ({ width, height: 900 }),
  Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' };
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === 'expo-file-system') return { File: class {}, Directory: class {}, Paths: {} };
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === './ui') return { Button: 'Button', Card: 'Card', Chip: 'Chip', Txt: 'Txt', Icon: 'Icon' };
  if (name.endsWith('/storage/privateCourse')) return { openOriginalPage: async () => {}, loadPrivateCourse: async () => source };
  if (name.endsWith('/storage/sourceValidation')) return {
    ...review, ...anomalies,
    loadChapterValidation: () => review.loadValidation('kum-08'),
    getValidationStats: v => ({ ...v, progress: Math.round(100 * v.verifiedBlocks / v.totalBlocks) }),
    getPagesWithAnomalies: () => [],
  };
  if (name.endsWith('/sourceCourse/verification')) return review;
  return original.call(this, name, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const review = require('../.test-build/domain/sourceCourse/verification.js');
const anomalies = require('../.test-build/domain/sourceCourse/anomalies.js');


const { CourseWorkspace } = require('../src/components/CourseWorkspace.tsx');
const archives = require('../src/domain/sourceCourse/finalizedStorage.ts');
let source, renderer;
function fixture() {
  const part={ id:'part-1',role:'paragraph',kind:'text',text:'Original synthetic course',lines:[],sourceLineIds:['line-1'],image:'data:image/png;base64,synthetic',bbox:[0,0,100,100],reasons:[] };
  return { chapterId:'kum-08',schemaVersion:2,mode:'structured-source-draft',complete:false,sourceSha256:'a'.repeat(64),pages:[{
    printedPage:160,pdfPage:183,parts:[part],sourceLineIds:['line-1'],pdf:'JVBERi0=',image:part.image,width:100,height:100 }] };
}
async function mount() {
  await act(async () => { renderer=create(React.createElement(CourseWorkspace,{chapterId:'kum-08'})); });
  for(let i=0;i<100 && !button('Finaliser et enregistrer le cours') && !button('Rouvrir pour correction');i++)
    await act(async()=>{await new Promise(r=>setImmediate(r));});
}
function button(label) {return renderer.root.findAll(n=>n.type==='Button'&&n.props.title===label)[0];}
async function click(label) {const b=button(label);assert.ok(b,`Missing ${label}`);assert.ok(!b.props.disabled);await act(async()=>{await b.props.onPress();});
  for(let i=0;i<20;i++) await act(async()=>{await new Promise(r=>setImmediate(r));});}
const text = () => renderer.root.findAll(n=>n.type==='Text'&&n.props.selectable).map(n=>n.props.children);
const labels = () => renderer.root.findAll(n=>n.type==='Button'||n.type==='Chip').map(n=>n.props.title??n.props.label);
async function unmount(){await act(async()=>renderer.unmount());}
async function verified(newReview = false) {const v=review.reconcileReviewValidation(null,source);for(const p of v.pages) for(const b of p.blocks){b.status='verified';b.verifiedAt=new Date(Date.now()+(newReview ? 1000 : -1000)).toISOString();}v.anomalies=[{id:'history',chapterId:'kum-08',printedPage:160,blockId:'part-1',status:'resolved',description:'Keep original comment'}];await review.saveValidation(v);return v;}
test('full UI lifecycle: finalize, read without import, remount, reopen, republish and return to v1',async()=>{
  global.indexedDB=new IDBFactory();source=fixture();await verified();await mount();
  await click('Finaliser et enregistrer le cours');await click('Je confirme et finalise le cours');
  assert.ok(button('Rouvrir pour correction'));assert.ok(text().includes('Original synthetic course'));
  assert.ok(!labels().some(x=>/Importer|Vérification manuelle|Finaliser et enregistrer/.test(x)));
  const frozen=JSON.stringify((await archives.loadFinalCourse('kum-08')).versions[0]);
  await unmount(); source.pages[0].parts[0].text='Corrected synthetic course'; await mount();
  assert.ok(text().includes('Original synthetic course'));assert.ok(!text().includes('Corrected synthetic course'));
  await click('Rouvrir pour correction');assert.ok(button('Importer une nouvelle version privée'));
  await click('Finaliser et enregistrer le cours');assert.ok(!button('Je confirme et finalise le cours'));
  await verified(true);await click('Finaliser et enregistrer le cours');await click('Je confirme et finalise le cours');
  assert.ok(text().includes('Corrected synthetic course'));
  assert.equal(JSON.stringify((await archives.loadFinalCourse('kum-08')).versions[0]),frozen);
  await click('Revenir à la version 1');await click('Confirmer le retour à cette version');
  assert.ok(text().includes('Original synthetic course'));await unmount();await mount();
  assert.ok(text().includes('Original synthetic course'));assert.equal((await archives.listFinalCourses()).length,1);
  assert.equal((await anomalies.loadChapterAnomalies('kum-08'))[0].description,'Keep original comment');
  await unmount();
});
test('active anomaly blocks finalization and opens its passage; stale confirmation is refused',async()=>{
  global.indexedDB=new IDBFactory();source=fixture();const v=await verified();v.anomalies[0].status='open';await review.saveValidation(v);await mount();
  await click('Finaliser et enregistrer le cours');assert.ok(!button('Je confirme et finalise le cours'));assert.equal(await archives.loadFinalCourse('kum-08'),null);
  await click('Accéder au passage');assert.ok(button('Anomalie !'));
  await verified();await click('Finaliser et enregistrer le cours');assert.ok(button('Je confirme et finalise le cours'));
  const changed=await review.loadValidation('kum-08');changed.anomalies[0].status='corrected-pending-review';await review.saveValidation(changed);
  await click('Je confirme et finalise le cours');assert.equal(await archives.loadFinalCourse('kum-08'),null);
  await unmount();
});
