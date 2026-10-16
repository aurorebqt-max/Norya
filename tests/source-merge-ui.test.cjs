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
const storage = {
  getItem: async key => records.get(key) ?? null,
  setItem: async (key, value) => { records.set(key, value); },
};
const original = Module._load;
const native = {
  Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 1000, height: 900 }),
  Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
};
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === 'expo-file-system') return { File: class {}, Directory: class {}, Paths: {} };
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === './ui') return { Button: 'Button', Card: 'Card', Chip: 'Chip', Txt: 'Txt', Icon: 'Icon' };
  if (name.endsWith('/storage/privateCourse')) return { openOriginalPage: async () => {}, loadPrivateCourse: async () => source };
  if (name.endsWith('/storage/sourceValidation')) return {
    ...review, ...anomalies,
    loadChapterValidation: () => review.loadValidation('kum-08'),
    getValidationStats: v => ({ ...v, progress: Math.round(100 * (v.verifiedBlocks / Math.max(1, v.totalBlocks))) }),
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
const { SourceCourseVerification } = require('../src/components/SourceCourseVerification.tsx');
const { PrivateSourceCourse } = require('../src/components/PrivateSourceCourse.tsx');

let source, renderer;
const part = (id, text) => ({
  id, role: 'paragraph', kind: 'text', text, lines: [[{ text, bold: false, italic: false }]],
  bbox: [0, 0, 100, 100], reasons: [], image: 'data:image/png;base64,synthetic', sourceLineIds: [`${id}-l`],
});
function fixture() {
  return {
    chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false,
    sourceSha256: 'a'.repeat(64),
    pages: [{
      printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'JVBERi0=',
      image: 'data:image/png;base64,synthetic',
      sourceLineIds: ['part-1-l', 'part-2-l', 'part-3-l'],
      parts: [
        part('part-1', 'Synthetic first fragment'),
        part('part-2', 'Synthetic second fragment'),
        part('part-3', 'Synthetic distant fragment'),
      ],
    }],
  };
}
const selectable = () => renderer.root.findAll(n => n.type === 'Text' && n.props.selectable).map(n => n.props.children);
const button = title => renderer.root.findAll(n => n.type === 'Button' && n.props.title === title)[0];
async function click(title) {
  const b = button(title);
  assert.ok(b, `Missing ${title}`);
  assert.ok(!b.props.disabled, `Disabled ${title}`);
  await act(async () => { await b.props.onPress(); });
  for (let i = 0; i < 30; i++) await act(async () => { await new Promise(r => setImmediate(r)); });
}
async function mountManual() {
  await act(async () => { renderer = create(React.createElement(SourceCourseVerification, { packet: source, onClose() {} })); });
  for (let i = 0; i < 50 && !button('Fusionner avec un autre bloc'); i++) {
    await act(async () => { await new Promise(r => setImmediate(r)); });
  }
  // Le bouton existe avant la fin du chargement asynchrone des validations.
  for (let i = 0; i < 30; i++) await act(async () => { await new Promise(r => setImmediate(r)); });
}
async function mountReader() {
  await act(async () => { renderer = create(React.createElement(PrivateSourceCourse, {})); });
  for (let i = 0; i < 50; i++) await act(async () => { await new Promise(r => setImmediate(r)); });
}
async function unmount() { await act(async () => renderer.unmount()); }

test('merge adjacent and non-adjacent, display once, remount, undo keeps comments', async () => {
  global.indexedDB = new IDBFactory();
  records.clear();
  source = fixture();
  const validation = review.reconcileReviewValidation(null, source);
  validation.anomalies = [{
    id: 'history', chapterId: 'kum-08', printedPage: 160, blockId: 'part-2', status: 'resolved',
    description: 'Keep original comment', descriptionHistory: [{ description: 'Earlier comment' }],
  }];
  await review.saveValidation(validation);
  const beforeAnomalies = JSON.stringify((await review.loadValidation('kum-08')).anomalies);

  await mountManual();
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant');
  await click('Bloc suivant'); // part-3 non adjacent
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  assert.ok(button('Confirmer la fusion'));
  await click('Annuler');
  assert.ok(!button('Confirmer la fusion'));
  await click('Prévisualiser la fusion');
  const input = renderer.root.findAll(n => n.type === 'TextInput' && typeof n.props.value === 'string' && n.props.value.includes('Synthetic'))[0];
  assert.ok(input);
  await act(async () => input.props.onChangeText('Synthetic joined correction'));
  await click('Confirmer la fusion');
  assert.ok(selectable().includes('Synthetic joined correction'));
  assert.ok(!selectable().includes('Synthetic distant fragment'));
  assert.ok(button('Annuler la fusion'));
  await unmount();

  await mountReader();
  const readerText = selectable();
  assert.ok(readerText.includes('Synthetic joined correction'));
  assert.ok(readerText.includes('Synthetic second fragment'));
  assert.ok(!readerText.includes('Synthetic distant fragment'));
  assert.ok(!readerText.includes('Synthetic first fragment') || readerText.includes('Synthetic joined correction'));
  await unmount();

  await mountManual();
  assert.ok(selectable().includes('Synthetic joined correction'));
  await click('Annuler la fusion');
  assert.ok(selectable().includes('Synthetic first fragment'));
  await click('Bloc suivant');
  await click('Bloc suivant');
  assert.ok(selectable().includes('Synthetic distant fragment'));
  const after = await review.loadValidation('kum-08');
  assert.equal((after.merges ?? []).length, 0);
  assert.equal(JSON.stringify(after.anomalies), beforeAnomalies);
  await unmount();
});

test('closing preview does not persist; second merge with space then undo', async () => {
  global.indexedDB = new IDBFactory();
  records.clear();
  source = fixture();
  await review.saveValidation(review.reconcileReviewValidation(null, source));
  await mountManual();
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant');
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  await click('Annuler');
  assert.equal(await review.loadValidation('kum-08').then(v => (v.merges ?? []).length), 0);
  await click('Prévisualiser la fusion');
  await click('Confirmer la fusion');
  assert.equal((await review.loadValidation('kum-08')).merges.length, 1);
  assert.ok(selectable().includes('Synthetic first fragment Synthetic second fragment'));
  await click('Annuler la fusion');
  assert.ok(selectable().includes('Synthetic first fragment'));
  await unmount();
});
