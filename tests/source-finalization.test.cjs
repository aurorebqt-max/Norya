const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { IDBFactory } = require('fake-indexeddb');
const memory = new Map(), files = new Map();
let failWrite = false;
const native = { Platform: { OS: 'web' } };
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async k => memory.get(k) ?? null,
    setItem: async (k,v) => { if(failWrite) throw Error('Storage full'); memory.set(k,v); }
  };
  if (name === 'expo-file-system') return {
    Paths: { document: 'private' }, Directory: class { create() {} },
    File: class { constructor(...p) { this.path=p.join('/'); } write(s) { files.set(this.path,s); } async text() { return files.get(this.path); } }
  };
  return original.call(this,name,...args);
};
const domain = require('../.test-build/domain/sourceCourse/finalization');
let storage = require('../.test-build/domain/sourceCourse/finalizedStorage');
function fixture(chapterId='kum-08') {
  const part={id:'part-1',kind:'text',role:'paragraph',text:'Exact synthetic source',lines:[],sourceLineIds:['line-1'],bbox:[0,0,10,10],image:'data:image/png;base64,synthetic',reasons:[],status:'unverified'};
  return {packet:{chapterId,schemaVersion:2,mode:'structured-source-draft',complete:false,sourceSha256:'a'.repeat(64),pages:[{printedPage:160,pdfPage:183,width:100,height:100,pdf:'JVBERi0=',image:part.image,sourceLineIds:['line-1'],parts:[part]}]},
    validation:{chapterId,pages:[{printedPage:160,pdfPage:183,status:'verified',blocks:[{id:'part-1',status:'verified',verifiedAt:'2026-01-01T00:00:00Z'}]}]},anomalies:[]};
}
test('gates inspect blocks, open/recheck anomalies, coverage, figures and unresolved fusion notes',()=>{
  assert.deepEqual(domain.finalizationBlockages(fixture()),[]);
  for (const mutate of [
    e=>e.validation.pages[0].blocks[0].status='pending',
    e=>e.anomalies.push({id:'a',chapterId:'kum-08',printedPage:160,blockId:'part-1',status:'open',description:'Keep'}),
    e=>e.validation.anomalies=[{id:'b',chapterId:'kum-08',status:'corrected-pending-review'}],
    e=>e.packet.pages[0].sourceLineIds.push('missing'),
    e=>{e.packet.pages[0].parts[0].role='figure';e.packet.pages[0].parts[0].image='';},
    e=>e.validation.pages[0].blocks[0].notes='MERGED_INTO:part-2',
    e=>e.validation.pages[0].blocks.push({id:'missing',notes:'FUSION DES BLOCS legacy'}),
  ]) {const e=fixture();mutate(e);const before=JSON.stringify(e);assert.ok(domain.finalizationBlockages(e).length);assert.throws(()=>domain.archiveFinalCourse(null,e,true));assert.equal(JSON.stringify(e),before);}
  assert.throws(()=>domain.archiveFinalCourse(null,fixture(),false));
});
test('snapshot freezes corrections, PDF references, order and review history; changed blocks require re-review',()=>{
  const e=fixture(); e.validation.pages[0].blocks[0].correction='Reviewed exact text';
  e.anomalies=[{id:'a',chapterId:'kum-08',status:'resolved',description:'Preserve comment',descriptionHistory:[{description:'Earlier'}]}];
  const before=JSON.stringify(e);const a=domain.archiveFinalCourse(null,e,true,'2026-02-01T00:00:00Z');
  assert.equal(a.versions[0].presentations['[160,"part-1"]'].text,'Reviewed exact text');
  assert.equal(JSON.stringify(e),before);assert.deepEqual(a.versions[0].anomalies,e.anomalies);
  e.packet.pages[0].parts[0].text='New source';
  assert.equal(a.versions[0].packet.pages[0].parts[0].text,'Exact synthetic source');
  assert.throws(()=>domain.archiveFinalCourse(domain.reopenFinalCourse(a),e,true));
  e.validation.pages[0].blocks[0].verifiedAt='2026-03-01T00:00:00Z';
  assert.equal(domain.archiveFinalCourse(domain.reopenFinalCourse(a),e,true).versions.length,2);
});
for (const os of ['web','ios']) test(`${os}: finalize, reload, reopen, republish, rollback, chapter isolation and stale writes`,async()=>{
  native.Platform.OS=os;global.indexedDB=new IDBFactory();memory.clear();files.clear();failWrite=false;
  const e=fixture(),other=fixture('other-02');
  let a=await storage.finalizeCourse(e,0,true);
  await storage.finalizeCourse(other,0,true);
  assert.equal((await storage.listFinalCourses()).length,2);
  delete require.cache[require.resolve('../.test-build/domain/sourceCourse/finalizedStorage')];
  storage=require('../.test-build/domain/sourceCourse/finalizedStorage');
  assert.deepEqual(await storage.loadFinalCourse('kum-08'),a);
  await assert.rejects(storage.finalizeCourse(e,0,true));
  const frozen=JSON.stringify(a.versions[0]);
  a=await storage.reopenCourse('kum-08',a.revision);assert.equal(a.status,'editing');
  assert.equal(JSON.stringify(a.versions[0]),frozen);
  a=await storage.finalizeCourse(e,a.revision,true);assert.equal(a.activeVersion,2);
  a=await storage.selectFinalVersion('kum-08',a.revision,1);assert.equal(a.activeVersion,1);assert.equal(a.versions.length,2);
  assert.equal(JSON.stringify(a.versions[0]),frozen);
  assert.equal((await storage.loadFinalCourse('other-02')).revision,1);
  assert.equal((await storage.listFinalCourses()).length,2);
  if(os==='ios') {failWrite=true;await assert.rejects(storage.reopenCourse('kum-08',a.revision));failWrite=false;assert.deepEqual(await storage.loadFinalCourse('kum-08'),a);}
});
test('final archive of a 3-block merge counts each paragraph once and records reading time; reopening keeps the last version',()=>{
  const merges = require('../.test-build/domain/sourceCourse/merges');
  const e = fixture();
  const page = e.packet.pages[0];
  const mk = (id, text) => ({ ...page.parts[0], id, text, sourceLineIds: [`${id}-l`] });
  page.parts = [mk('part-1', 'one two'), mk('part-2', 'three four'), mk('part-3', 'five six seven')];
  page.sourceLineIds = ['part-1-l', 'part-2-l', 'part-3-l'];
  e.validation.pages[0].blocks = page.parts.map(p => ({ id: p.id, status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' }));
  let v = e.validation;
  v = merges.recordMerge(v, merges.buildMergePreview('kum-08', { printedPage: 160, blockId: 'part-1', text: 'one two' }, { printedPage: 160, blockId: 'part-2', text: 'three four' }), 'm1');
  const first = merges.mergeAtAnchor(v.merges, 160, 'part-1');
  v = merges.recordMerge(v, merges.buildMergeDraft('kum-08', [
    { sources: first.sources, sourceTexts: first.sourceTexts, text: first.joinedText, mergeId: 'm1' },
    { sources: [{ printedPage: 160, blockId: 'part-3' }], sourceTexts: ['five six seven'], text: 'five six seven' }]), 'm2');
  e.validation = v;
  assert.deepEqual(domain.finalizationBlockages(e), []);
  const a = domain.archiveFinalCourse(null, e, true, '2026-02-01T00:00:00Z');
  const ver = a.versions[0];
  assert.equal(ver.presentations['[160,"part-1"]'].text, 'one two three four five six seven');
  assert.equal(ver.presentations['[160,"part-2"]'].hide, true);
  assert.equal(ver.presentations['[160,"part-3"]'].hide, true);
  assert.equal(ver.reading.words, 7);
  assert.equal(ver.reading.minutes, 1);
  assert.equal(domain.readingTime({ x: { text: 'w '.repeat(1000), imageOnly: false, hide: false }, y: { text: 'ignored', imageOnly: true, hide: false } }).minutes, 5);
  const reopened = domain.reopenFinalCourse(a);
  assert.equal(reopened.status, 'editing');
  assert.equal(reopened.versions.length, 1);
});
