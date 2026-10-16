const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { IDBFactory } = require('fake-indexeddb');
global.IS_REACT_ACT_ENVIRONMENT = true;
const records = new Map();
const storage = {
  getItem: async key => records.get(key) ?? null,
  setItem: async (key, value) => { records.set(key, value); },
};
const original = Module._load;
const native = { Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 1000, height: 900 }),
  Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' };
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === './ui') return { Button: 'Button', Card: 'Card', Chip: 'Chip', Txt: 'Txt' };
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const review = require('../.test-build/domain/sourceCourse/verification.js');
const anomalies = require('../.test-build/domain/sourceCourse/anomalies.js');


// Diagnostic de l'état courant, pas une certification de la fusion.
const { SourceCourseVerification } = require('../src/components/SourceCourseVerification.tsx');
const { PrivateSourceCourse } = require('../src/components/PrivateSourceCourse.tsx');
let source;
const part = (id, text) => ({ id, role: 'paragraph', kind: 'text', text,
  lines: [[{ text, bold: false, italic: false }]], bbox: [0,0,100,100], reasons: [], image: '' });
const selectedText = r => r.root.findAll(n => n.type === 'Text' && n.props.selectable).map(n => n.props.children);
const actions = r => r.root.findAll(n => n.type === 'Button' || n.type === 'Chip').map(n => n.props.title ?? n.props.label);
async function mount(Component, props) {
  let r; await act(async () => { r = create(React.createElement(Component, props)); }); return r;
}
async function chip(r, label) {
  const n = r.root.findAll(n => n.type === 'Chip' && n.props.label === label)[0];
  assert.ok(n, label); await act(async () => n.props.onPress());
}
async function run() {
  const results = [];
  for (const platform of ['ios', 'web']) {
    native.Platform.OS = platform;
    global.indexedDB = new IDBFactory(); // Base synthétique neuve ; aucun navigateur utilisateur.
    source = { chapterId: 'kum-08', schemaVersion: 2, pages: [{ printedPage: 160, pdfPage: 183,
      parts: [part('part-1','Synthetic first fragment'), part('part-2','Synthetic second fragment'), part('part-3','Synthetic distant fragment')] }] };
    const validation = review.reconcileReviewValidation(null, source);
    validation.pages[0].blocks[0].status = 'verified';
    validation.pages[0].blocks[0].notes = 'FUSION DES BLOCS part-1 ET part-2 (ordre:1-2, jonction:space): "Synthetic joined correction"';
    validation.pages[0].blocks[1].notes = 'MERGED_INTO:part-1';
    validation.anomalies = [{ id:'synthetic-history', chapterId:'kum-08', printedPage:160,
      blockId:'part-2', status:'resolved', description:'Synthetic preserved comment',
      descriptionHistory:[{ description:'Synthetic previous comment' }] }];
    await review.saveValidation(validation);
    const before = JSON.stringify(await review.loadValidation('kum-08'));
    const passes = [];
    for (let reload = 0; reload < 2; reload++) {
      const reader = await mount(PrivateSourceCourse);
      const text = selectedText(reader);
      const originalFragmentsVisible = source.pages[0].parts.every(p => text.includes(p.text));
      const joinedCorrectionVisible = text.includes('Synthetic joined correction');
      await act(async () => reader.unmount());
      const manual = await mount(SourceCourseVerification, { packet:source, onClose(){} });
      const labels = actions(manual);
      const mergeActions = labels.filter(x => /fusion|merge|jonction|restaur/i.test(x));
      await chip(manual,'Texte');
      await chip(manual,'À vérifier');
      const verifiedStillCurrent = selectedText(manual).includes('Synthetic first fragment');
      const next = manual.root.findAll(n => n.type === 'Button' && n.props.title === 'Bloc suivant')[0];
      await act(async () => next.props.onPress());
      const absorbedBlockStillNavigable = selectedText(manual).includes('Synthetic second fragment');
      await act(async () => manual.unmount());
      assert.equal(JSON.stringify(await review.loadValidation('kum-08')), before, 'Les notes, statuts et commentaires doivent rester intacts');
      passes.push({ reload: Boolean(reload), mergeActions, verifiedFilterAvailable: labels.includes('Vérifiés'),
        originalFragmentsVisible, joinedCorrectionVisible, verifiedStillCurrent, absorbedBlockStillNavigable,
        persistedDataUnchanged: true });
    }
    results.push({ platform, passes });
  }
  console.log(JSON.stringify({ audit:'fusion du code courant', results,
    limitation:'Montage React et stockage synthétique, pas un essai Safari. Fusion/annulation impossibles sans commandes exposées ; aucune opération réelle de fusion prétendue.' }, null, 2));
}
run().catch(e => { console.error(e); process.exitCode = 1; });
