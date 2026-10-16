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
const native = { Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width, height: 900 }),
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

const { SourceCourseVerification } = require('../src/components/SourceCourseVerification.tsx');
const { PrivateSourceCourse } = require('../src/components/PrivateSourceCourse.tsx');
const { sourcePresentation } = require('../src/domain/sourceCourse/displayCorrections.ts');
let source;
const block = (id, role, text) => ({ id, role, text, kind: 'visual', lines: [[{text: 'Stale PDF lines', bold: false, italic: false}]],
  bbox: [10, 10, 200, 200], reasons: [], image: 'original-block-image', sourceLineIds: [] });
async function render(Component, props) {
  let r;
  await act(async () => { r = create(React.createElement(Component, props)); });
  return r;
}
const texts = r => r.root.findAll(n => n.type === 'Text' && n.props.selectable).map(n => n.props.children);
test('reader and manual review restore the same selectable contents without writing stored reviews', async () => {
  const parts = [block('part-2', 'contents', 'Original contents')];
  source = { chapterId: 'kum-08', schemaVersion: 2, pages: [{ printedPage: 151, pdfPage: 174, parts }] };
  const validation = review.reconcileReviewValidation(null, source);
  validation.pages[0].blocks[0].status = 'verified';
  validation.anomalies = [{ id: 'preserved', chapterId: 'kum-08', printedPage: 151, blockId: 'part-2', status: 'resolved', description: 'Keep comment', descriptionHistory: [{description: 'Earlier comment'}] }];
  await review.saveValidation(validation);
  const before = [...records];
  const reader = await render(PrivateSourceCourse);
  const readerText = texts(reader);
  assert.ok(readerText.includes('Abilităţi clinice în infecţii şi sepsis'));
  assert.equal(reader.root.findAllByType('Image').length, 0);
  await act(async () => reader.unmount());
  for (let reload = 0; reload < 2; reload++) {
    const manual = await render(SourceCourseVerification, { packet: source, onClose() {} });
    assert.ok(!manual.root.findAll(n => n.type === 'Chip' && ['Texte', 'Visuel', 'Split'].includes(n.props.label)).length);
    assert.deepEqual(texts(manual), readerText);
    // Split permanent : le PDF original est toujours à droite, jamais à la place du texte.
    assert.equal(manual.root.findAllByType('Image').length, 1);
    await act(async () => manual.unmount());
    assert.deepEqual([...records], before);
  }
});
test('stale image overlays cannot hide prose; figures with long labels retain their original image', async () => {
  const prose = block('part-99', 'paragraph', 'Selectable original prose');
  prose.noryaPresentation = { text: 'Reviewed prose', imageOnly: true, hide: false };
  assert.equal(sourcePresentation(160, prose).imageOnly, false);
  assert.equal(sourcePresentation(160, prose).text, 'Reviewed prose');
  const figure = block('part-98', 'figure', 'Long diagram labels '.repeat(40));
  assert.equal(sourcePresentation(160, figure).imageOnly, true);
  source = { chapterId: 'kum-08', schemaVersion: 2, pages: [{ printedPage: 160, pdfPage: 183, parts: [prose, figure] }] };
  const before = JSON.stringify(source);
  const reader = await render(PrivateSourceCourse);
  assert.ok(texts(reader).includes('Reviewed prose'));
  const images = reader.root.findAllByType('Image');
  assert.equal(images.length, 1);
  assert.equal(images[0].props.source.uri, figure.image);
  assert.equal(images[0].props.resizeMode, 'contain');
  assert.ok(reader.root.findAll(n => n.type === 'Pressable' && n.findAll(x => x.type === 'Txt' && String(x.props.children).includes('Agrandir')).length).length);
  assert.equal(JSON.stringify(source), before);
  await act(async () => reader.unmount());
});
