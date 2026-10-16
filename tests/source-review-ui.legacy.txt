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
  if (name.endsWith('/storage/privateCourse')) return { openOriginalPage: async () => {} };
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
const packet = { chapterId: 'kum-08', pages: [153, 154, 155, 156].map(printedPage => ({
  printedPage, pdfPage: printedPage + 23, parts: [
    { id: 'part-1', role: 'page-header' },
    ...['part-2', 'part-3', 'part-4'].map(id => ({ id, role: printedPage === 153 && id === 'part-4' ? 'figure' : 'paragraph',
      kind: 'text', text: 'Synthetic source text for review. '.repeat(10), bbox: [0, 0, 100, 100], image: '', reasons: [] })),
  ],
})) };
let renderer;
async function mount(source = packet) {
  await act(async () => { renderer = create(React.createElement(SourceCourseVerification, { packet: source, onClose() {} })); });
  for (let i = 0; i < 30 && textIncludes('Chargement des statistiques'); i++) {
    await act(async () => { await new Promise(resolve => setImmediate(resolve)); });
  }
  assert.ok(!textIncludes('Chargement des statistiques'), 'Validation loaded');
}
function findButton(label) { return renderer.root.findAll(n => n.type === 'Button' && n.props.title === label)[0] ?? renderer.root.findAll(n => n.type === 'Chip' && n.props.label === label)[0]; }
async function click(label) { const button = findButton(label); assert.ok(button, `Missing button ${label}`); assert.ok(!button.props.disabled, `${label} disabled`); await act(async () => { await button.props.onPress(); }); }
async function type(text) { const input = renderer.root.findByType('TextInput'); await act(async () => input.props.onChangeText(text)); }
async function unmount() { await act(async () => renderer.unmount()); }

test('page 153 block 3/3: anomaly form is usable in text mode', async () => {
  records.clear(); await mount(); await click('Tous');
  await click('Bloc suivant'); await click('Bloc suivant');
  assert.ok(findButton('Page 153 · Bloc 3/3'));
  await click('Texte'); await click('Anomalie !');
  assert.equal(renderer.root.findAllByType('TextInput').length, 1);
  await type('Page 153 figure'); await click('Enregistrer');
  const stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].blockId, 'part-4');
  assert.equal(stored[0].printedPage, 153);
  await unmount();
});

test('Aller uses the filtered block list, including the final block of page 153', async () => {
  records.clear(); await mount(); await click('Tous');
  await click('Bloc suivant'); // part-3 = block 2/3, not block 3/3
  await click('Anomalie !'); await type('Paragraph on 153'); await click('Enregistrer');
  await click('Page suivante');
  await click('Mes anomalies (1)');
  const link = renderer.root.findAll(n => n.type === 'Pressable' &&
    n.findAll(x => x.type === 'Txt' && x.props.children === 'Aller →').length)[0];
  await act(async () => link.props.onPress());
  assert.ok(findButton('Page 153 · Bloc 2/3'));
  await click('Bloc suivant à vérifier');
  assert.ok(findButton('Page 153 · Bloc 3/3'));
  await unmount();
});

test('consecutive pages, independent creation/editing, preserved comments and remount', async () => {
  records.clear(); await mount(); await click('Tous'); await click('Texte');
  await click('Bloc suivant'); await click('Bloc suivant');
  for (const comment of ['153 last block', '154 first block', '154 second block']) {
    await click('Anomalie !'); await type(comment); await click('Enregistrer');
    await click('Bloc suivant');
  }
  await click('Page suivante'); // 155, same part-2 id as page 154
  await click('Anomalie !'); await type('155 first block'); await click('Enregistrer');
  await click('Anomalie !');
  assert.equal(renderer.root.findByType('TextInput').props.value, '');
  await click('Modifier l’anomalie 1');
  assert.equal(renderer.root.findByType('TextInput').props.value, '155 first block');
  const oldId = (await anomalies.loadChapterAnomalies('kum-08'))[3].id;
  await type('155 revised comment'); await click('Mettre à jour');
  let stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.equal(stored.length, 4);
  assert.equal(stored[3].id, oldId);
  assert.equal(stored[3].descriptionHistory[0].description, '155 first block');
  await click('Anomalie !'); await type('155 second anomaly'); await click('Enregistrer');
  stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.deepEqual(stored.map(a => [a.printedPage, a.blockId, a.description]), [
    [153, 'part-4', '153 last block'], [154, 'part-2', '154 first block'],
    [154, 'part-3', '154 second block'], [155, 'part-2', '155 revised comment'], [155, 'part-2', '155 second anomaly'],
  ]);
  assert.ok(stored.every(a => a.status === 'open'));
  await unmount(); await mount(); await click('Tous');
  await click('Page suivante'); await click('Page suivante'); await click('Anomalie !');
  await click('Modifier l’anomalie 1');
  assert.equal(renderer.root.findByType('TextInput').props.value, '155 revised comment');
  await click('Modifier l’anomalie 2');
  assert.equal(renderer.root.findByType('TextInput').props.value, '155 second anomaly');
  assert.equal(JSON.parse(anomalies.exportAnomaliesToJSON(stored)).anomalies[3].descriptionHistory[0].description, '155 first block');
  await unmount();
});

test('navigation during a save and repeated clicks do not lose or misattribute a comment', async () => {
  records.clear(); await mount(); await click('Tous');
  await click('Anomalie !'); await type('Persist on page 153');
  let release;
  holdSave = new Promise(resolve => { release = resolve; });
  const save = findButton('Enregistrer');
  let pending;
  await act(async () => {
    pending = save.props.onPress();
    await save.props.onPress(); // duplicate event before React renders disabled=true
  });
  await click('Page suivante');
  await act(async () => { release(); await pending; });
  holdSave = undefined;
  assert.ok(findButton('Page 154 · Bloc 1/3'));
  assert.equal(renderer.root.findAllByType('TextInput').length, 0);
  await click('Anomalie !');
  assert.equal(renderer.root.findByType('TextInput').props.value, '');
  await type('Persist on page 154'); await click('Enregistrer');
  const stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.deepEqual(stored.map(a => [a.printedPage, a.description]), [[153, 'Persist on page 153'], [154, 'Persist on page 154']]);
  await unmount();
});

test('repeated Anomalie clicks and view changes preserve the active draft; validation still resolves only its block', async () => {
  records.clear(); await mount(); await click('Tous');
  await click('Anomalie !'); await type('Keep draft'); await click('Anomalie !');
  await click('Texte'); assert.equal(renderer.root.findByType('TextInput').props.value, 'Keep draft');
  await click('Visuel'); assert.equal(renderer.root.findByType('TextInput').props.value, 'Keep draft');
  await click('Split'); await click('Enregistrer');
  await click('En cours'); assert.equal(findButton('En cours').props.secondary, false);
  await click('À vérifier'); assert.equal(findButton('À vérifier').props.secondary, false);
  assert.equal((await anomalies.loadChapterAnomalies('kum-08'))[0].status, 'open');
  await click('Page suivante'); await click('Anomalie !'); await type('Other page'); await click('Enregistrer');
  await click('Page précédente'); await click('Vérifié ✓');
  let stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.deepEqual(stored.map(a => a.status), ['resolved', 'open']);
  await click('Anomalie !');
  assert.equal(renderer.root.findByType('TextInput').props.value, '');
  await type('New after verification'); await click('Enregistrer');
  stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.deepEqual(stored.map(a => a.status), ['resolved', 'open', 'open']);
  const v = await review.loadValidation('kum-08');
  assert.equal(v.pages[0].blocks[0].status, 'issue-found');
  await unmount();
});


const unequalPacket = { ...packet, pages: packet.pages.map((page, i) => ({
  ...page, parts: page.parts.slice(0, [4, 2, 3, 1][i]),
})) };
function textIncludes(text) {
  return JSON.stringify(renderer.toJSON()).includes(text);
}
test('À traiter automatically advances across unequal pages, handles the last block, history and reopening', async () => {
  records.clear(); await mount(unequalPacket);
  assert.equal(findButton('À traiter').props.selected, true);
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  await click('Anomalie !'); await type('History survives validation'); await click('Enregistrer');
  const positions = ['Page 153 · Bloc 2/3', 'Page 153 · Bloc 3/3', 'Page 154 · Bloc 1/1',
    'Page 155 · Bloc 1/2', 'Page 155 · Bloc 2/2'];
  for (const expected of positions) {
    await click('Vérifié ✓'); assert.ok(findButton(expected), expected);
  }
  assert.ok(textIncludes('Page entièrement vérifiée'));
  await click('Vérifié ✓');
  assert.ok(textIncludes('Tous les blocs sont vérifiés.'));
  assert.equal(findButton('Vérifié ✓'), undefined);
  assert.equal(findButton('Bloc suivant à vérifier').props.disabled, true);
  assert.equal((await review.loadValidation('kum-08')).verifiedBlocks, 6);
  assert.equal((await review.loadValidation('kum-08')).complete, true);
  await click('Vérifiés');
  assert.ok(findButton('Page 155 · Bloc 2/2'));
  await click('Page précédente'); await click('Page précédente');
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  assert.ok(textIncludes('History survives validation'));
  assert.ok(textIncludes('Résolue'));
  await click('Anomalie !'); await type('New problem on verified block'); await click('Enregistrer');
  assert.equal(findButton('À traiter').props.selected, true);
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  assert.equal(findButton('Bloc suivant à vérifier').props.disabled, true);
  assert.deepEqual((await anomalies.loadChapterAnomalies('kum-08')).map(a => a.status), ['resolved', 'open']);
  await unmount(); await mount(unequalPacket);
  assert.equal(findButton('À traiter').props.selected, true);
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  await click('Vérifié ✓'); assert.ok(textIncludes('Tous les blocs sont vérifiés.'));
  await unmount(); await mount(unequalPacket);
  assert.ok(textIncludes('Tous les blocs sont vérifiés.'));
  await click('Tous'); assert.ok(findButton('Page 153 · Bloc 1/3'));
  await unmount();
});

test('filtered previous/next, filter changes and persistence select the correct stable block', async () => {
  records.clear(); await mount(unequalPacket);
  await click('Vérifié ✓'); // first removed
  await click('Bloc suivant à vérifier'); // third, skip second for now
  await click('Vérifié ✓'); // page 154
  await click('Bloc précédent à vérifier');
  assert.ok(findButton('Page 153 · Bloc 2/3'));
  await click('Vérifiés'); assert.ok(findButton('Page 153 · Bloc 3/3'));
  await click('Bloc précédent'); assert.ok(findButton('Page 153 · Bloc 1/3'));
  await click('Tous'); assert.ok(findButton('Page 153 · Bloc 1/3'));
  await click('À traiter'); assert.ok(findButton('Page 153 · Bloc 2/3'));
  await click('Vérifié ✓'); assert.ok(findButton('Page 154 · Bloc 1/1'));
  await unmount(); await mount(unequalPacket);
  assert.ok(findButton('Page 154 · Bloc 1/1'));
  await unmount();
});

test('save failure retains selection and comment; no automatic advancement or partial resolution', async () => {
  records.clear(); await mount(unequalPacket);
  await click('Anomalie !'); await type('First report'); await click('Enregistrer');
  const before = await review.loadValidation('kum-08');
  failSave = true;
  await click('Vérifié ✓');
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  assert.deepEqual(await review.loadValidation('kum-08'), before);
  await click('Anomalie !'); await type('Keep unsaved comment'); await click('Enregistrer');
  assert.equal(renderer.root.findByType('TextInput').props.value, 'Keep unsaved comment');
  failSave = false;
  await click('Enregistrer'); assert.equal((await anomalies.loadChapterAnomalies('kum-08')).length, 2);
  await click('Vérifié ✓'); assert.ok(findButton('Page 153 · Bloc 2/3'));
  await unmount();
});

test('new packet version reorders pages and adds blocks without losing validations or comments', async () => {
  records.clear(); await mount(unequalPacket);
  await click('Anomalie !'); await type('Preserved history'); await click('Enregistrer'); await click('Vérifié ✓');
  const newPacket = { ...unequalPacket, pages: [...unequalPacket.pages].reverse().map(p => p.printedPage !== 153 ? p : {
    ...p, parts: [...p.parts, { ...p.parts[1], id: 'part-new' }],
  }) };
  await act(async () => renderer.update(React.createElement(SourceCourseVerification, { packet: newPacket, onClose() {} })));
  assert.ok(findButton('Page 153 · Bloc 2/4'));
  await click('Bloc suivant à vérifier'); await click('Bloc suivant à vérifier');
  assert.ok(findButton('Page 153 · Bloc 4/4'));
  await click('Anomalie !'); await type('New block report'); await click('Enregistrer');
  const stored = await review.loadValidation('kum-08');
  assert.equal(stored.pages.find(p => p.printedPage === 153).blocks.find(b => b.id === 'part-2').status, 'verified');
  assert.deepEqual(stored.anomalies.map(a => a.description), ['Preserved history', 'New block report']);
  await unmount();
});

for (const screenWidth of [390, 820, 1440]) test(`review and anomaly form render at width ${screenWidth}`, async () => {
  records.clear(); width = screenWidth; await mount(unequalPacket);
  await click('Anomalie !'); await type('Responsive editor'); await click('Texte');
  assert.equal(renderer.root.findByType('TextInput').props.value, 'Responsive editor');
  await click('Enregistrer'); await click('Vérifié ✓');
  assert.ok(findButton('Page 153 · Bloc 2/3'));
  await unmount(); width = 1000;
});


test('web IndexedDB: create, advance, reload, edit and reopen with the same persisted history', async () => {
  native.Platform.OS = 'web'; global.indexedDB = new IDBFactory();
  await mount(unequalPacket);
  await click('Anomalie !'); await type('Web persisted report'); await click('Enregistrer');
  await click('Vérifié ✓'); assert.ok(findButton('Page 153 · Bloc 2/3'));
  await unmount(); await mount(unequalPacket);
  assert.ok(findButton('Page 153 · Bloc 2/3'));
  await click('Vérifiés'); assert.ok(findButton('Page 153 · Bloc 1/3'));
  assert.ok(textIncludes('Web persisted report'));
  await click('Anomalie !'); await type('New web report'); await click('Enregistrer');
  assert.equal(findButton('À traiter').props.selected, true);
  await click('Anomalie !'); await click('Modifier l’anomalie 1');
  await type('Edited web report'); await click('Mettre à jour');
  await unmount(); await mount(unequalPacket);
  const stored = await anomalies.loadChapterAnomalies('kum-08');
  assert.deepEqual(stored.map(a => [a.status, a.description]), [['resolved', 'Web persisted report'], ['open', 'Edited web report']]);
  assert.equal(stored[1].descriptionHistory[0].description, 'New web report');
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  await unmount(); native.Platform.OS = 'ios';
});


test('legacy verified block with an open report remains in À traiter without rewriting history', async () => {
  records.clear();
  let v = review.reconcileReviewValidation(null, unequalPacket);
  v = review.updateBlockValidation(v, 0, 'part-2', { status: 'verified' });
  await review.saveValidation(v);
  await anomalies.saveAnomaly(anomalies.createAnomalyReport('kum-08', 'Kumar', 153, 176, 'part-2', 'paragraph', 'Text', 'Legacy open report'));
  await mount(unequalPacket);
  assert.ok(findButton('Page 153 · Bloc 1/3'));
  assert.equal((await anomalies.loadChapterAnomalies('kum-08'))[0].status, 'open');
  assert.equal((await review.loadValidation('kum-08')).pages[0].blocks[0].status, 'verified');
  await click('Vérifié ✓');
  assert.ok(findButton('Page 153 · Bloc 2/3'));
  assert.equal((await anomalies.loadChapterAnomalies('kum-08'))[0].description, 'Legacy open report');
  await unmount();
});
