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
  Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
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
    chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
    pages: [
      { printedPage: 160, pdfPage: 183, width: 100, height: 100, pdf: 'JVBERi0=', image: 'data:image/png;base64,synthetic',
        sourceLineIds: ['part-1-l', 'part-2-l', 'part-3-l'],
        parts: [part('part-1', 'Alpha one'), part('part-2', 'Beta two'), part('part-3', 'Gamma three')] },
      { printedPage: 161, pdfPage: 184, width: 100, height: 100, pdf: 'JVBERi0=', image: 'data:image/png;base64,synthetic',
        sourceLineIds: ['part-1-l'], parts: [part('part-1', 'Delta four')] },
    ],
  };
}
const selectable = () => renderer.root.findAll(n => n.type === 'Text' && n.props.selectable).map(n => n.props.children);
const button = title => renderer.root.findAll(n => n.type === 'Button' && n.props.title === title)[0];
const chip = label => renderer.root.findAll(n => n.type === 'Chip' && n.props.label === label)[0];
const settle = async () => { for (let i = 0; i < 30; i++) await act(async () => { await new Promise(r => setImmediate(r)); }); };
async function click(title) {
  const b = button(title);
  assert.ok(b, `Missing ${title}`);
  assert.ok(!b.props.disabled, `Disabled ${title}`);
  await act(async () => { await b.props.onPress(); });
  await settle();
}
async function clickChip(label) {
  const x = chip(label); assert.ok(x, `Missing chip ${label}`);
  await act(async () => { await x.props.onPress(); }); await settle();
}
async function typeInto(label, value) {
  const input = renderer.root.findAll(n => n.type === 'TextInput' && n.props.accessibilityLabel === label)[0];
  assert.ok(input, `Missing input ${label}`);
  await act(async () => input.props.onChangeText(value)); await settle();
}
const input = label => renderer.root.findAll(n => n.type === 'TextInput' && n.props.accessibilityLabel === label)[0];
async function mountManual() {
  await act(async () => { renderer = create(React.createElement(SourceCourseVerification, { packet: source, onClose() {} })); });
  await settle();
}
async function mountReader() {
  await act(async () => { renderer = create(React.createElement(PrivateSourceCourse, {})); });
  await settle();
}
async function unmount() { await act(async () => renderer.unmount()); }
async function fresh() {
  global.indexedDB = new IDBFactory(); records.clear(); source = fixture();
  await review.saveValidation(review.reconcileReviewValidation(null, source));
}
const stored = () => review.loadValidation('kum-08');

test('associate a selected occurrence with a figure, persist and open it from the reader', async () => {
  await fresh();
  source.pages[0].parts[0] = part('part-1', 'Figura 8.1 puis Figura 8.1');
  source.pages[0].parts[1].role = 'figure';
  await mountManual();
  await click('Associer un élément');
  const sourceInput = input('Sélectionner le passage source');
  assert.equal(sourceInput.props.readOnly, true);
  await act(async () => sourceInput.props.onSelectionChange({ nativeEvent: { selection: { start: 16, end: 26 } } }));
  assert.equal(input('Texte exact de l’ancre').props.value, 'Figura 8.1');
  assert.equal(input('Occurrence de l’ancre').props.value, '1');
  await typeInto('Rechercher une destination logique', 'Beta two');
  const target = renderer.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityState?.selected === false)[0];
  assert.ok(target);
  await act(async () => target.props.onPress());
  assert.ok(renderer.root.findAll(n => n.type === 'Image' && n.props.accessibilityLabel === 'Aperçu de l’élément associé').length);
  await click('Enregistrer l’association');
  const validation = await stored();
  assert.equal(validation.associations[0].anchor.start, 16);
  assert.equal(validation.associations[0].destinationType, 'figure');
  assert.equal(validation.pages[0].blocks[0].status, 'pending');
  await unmount();
  await mountManual();
  await click('Modifier');
  assert.equal(input('Occurrence de l’ancre').props.value, '1');
  await unmount();
  await mountReader();
  const link = renderer.root.findAll(n => n.type === 'Text' && n.props.accessibilityRole === 'link' && n.props.children === 'Figura 8.1')[0];
  assert.ok(link, 'Inline association is available in the course');
  await act(async () => link.props.onPress());
  assert.equal(renderer.root.findByType('Modal').props.visible, true, 'The reference must open above the reader, not below it');
  assert.ok(button('Fermer l’inspecteur'));
  await click('Fermer l’inspecteur');
  assert.ok(!button('Fermer l’inspecteur'));
  await unmount();
});

test('multiple references in one text keep independent targets after reloading', async () => {
  await fresh();
  source.pages[0].parts[0] = part('part-1', 'Figura 8.1 puis Figura 8.2');
  source.pages[0].parts[1].role = 'figure';
  source.pages[0].parts[2].role = 'figure';
  await mountManual();
  await click('Associer un élément');
  for (const [anchor, search, action] of [
    ['Figura 8.1', 'Beta two', 'Enregistrer et ajouter une référence'],
    ['Figura 8.2', 'Gamma three', 'Enregistrer l’association'],
  ]) {
    await typeInto('Texte exact de l’ancre', anchor);
    await typeInto('Rechercher une destination logique', search);
    const target = renderer.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityState?.selected === false)[0];
    await act(async () => target.props.onPress());
    await click(action);
    if (action === 'Enregistrer et ajouter une référence') {
      assert.equal(input('Texte exact de l’ancre').props.value, '');
      assert.equal(button('Enregistrer l’association').props.disabled, true);
    }
  }
  const links = (await stored()).associations;
  assert.equal(links.length, 2);
  assert.notEqual(links[0].id, links[1].id);
  assert.deepEqual(links.map(x => x.target.blockId), ['part-2', 'part-3']);
  await unmount();
  await mountReader();
  for (const anchor of ['Figura 8.1', 'Figura 8.2']) {
    const link = renderer.root.findAll(n => n.type === 'Text' && n.props.accessibilityRole === 'link' && n.props.children === anchor)[0];
    assert.ok(link);
    await act(async () => link.props.onPress());
    assert.ok(button('Fermer l’inspecteur'));
    await click('Fermer l’inspecteur');
  }
  await unmount();
});

test('association destinations include the whole chapter beyond the first 80 blocks', async () => {
  await fresh();
  source.pages[0].parts = Array.from({ length: 100 }, (_, i) => part(`block-${i}`, `Passage ${i}`));
  await review.saveValidation(review.reconcileReviewValidation(null, source));
  await mountManual();
  await click('Associer un élément');
  const destinations = () => renderer.root.findAll(n => n.type === 'Pressable' && typeof n.props.accessibilityState?.selected === 'boolean');
  assert.equal(destinations().length, 100, '99 other blocks on this page and one on the following page');
  await typeInto('Texte exact de l’ancre', 'Passage');
  // Choose the last block, on the following page, without narrowing the search.
  await act(async () => destinations().at(-1).props.onPress());
  await click('Enregistrer l’association');
  assert.deepEqual((await stored()).associations[0].target, { printedPage: 161, blockId: 'part-1' });
  await unmount();
});

test('adding from Verified reveals the saved pending block and preserves it after remount', async () => {
  await fresh(); await mountManual();
  await click('Vérifié ✓');
  await clickChip('Vérifiés (1)');
  await click('Ajouter un bloc après');
  await typeInto('Texte du nouveau bloc manuel', 'Persistent added passage');
  await click('Confirmer l’ajout du bloc');
  const added = (await stored()).manualBlocks[0];
  assert.ok(added);
  assert.ok(selectable().includes('Persistent added passage'), 'The newly saved block must be visible despite the previous filter');
  assert.ok(chip('Bloc 2 — Persistent added passage')?.props.selected, 'The block bar selects the new block');
  assert.equal((await stored()).pages[0].blocks.find(b => b.id === added.id).status, 'pending');
  await unmount(); await mountManual();
  await click('Bloc suivant');
  assert.ok(selectable().includes('Persistent added passage'));
  assert.ok(chip('Bloc 2 — Persistent added passage')?.props.selected, 'The saved block remains in the bar after remount');
  assert.equal((await stored()).manualBlocks[0].id, added.id);
  await unmount();
});

test('block bar follows previous navigation after a page jump and includes the newly added block', async () => {
  await fresh(); await mountManual();
  await clickChip('p. 161');
  await click('Bloc précédent');
  assert.ok(chip('p. 160').props.selected);
  assert.ok(chip('Bloc 3 — Gamma three').props.selected);
  await click('Ajouter un bloc après');
  await typeInto('Texte du nouveau bloc manuel', 'Added on the current page');
  await click('Confirmer l’ajout du bloc');
  assert.ok(chip('Bloc 4 — Added on the current page').props.selected);
  await unmount();
});

test('legacy deleted-block associations can be repaired, persisted and no longer block finalization', async () => {
  await fresh();
  const manual = require('../.test-build/domain/sourceCourse/manualBlocks');
  const links = require('../.test-build/domain/sourceCourse/associations');
  const { finalizationBlockages } = require('../.test-build/domain/sourceCourse/finalization');
  let value = await stored();
  value.pages.forEach(page => page.blocks.forEach(block => { block.status = 'verified'; block.verifiedAt = '2026-10-16T10:00:00Z'; }));
  value = manual.createManualBlock(value, source, { printedPage: 160, blockId: 'part-1' }, 'Old deleted block');
  value = links.createAssociation(value, { printedPage: 160, blockId: 'part-1' }, 'Alpha one', 'Alpha', 0,
    { printedPage: 160, blockId: value.manualBlocks[0].id }, manual.logicalBlocks(source, value));
  value.manualBlocks[0].undoneAt = '2026-10-16T12:00:00Z';
  await review.saveValidation(review.reconcileReviewValidation(value, source));
  assert.ok(finalizationBlockages({ packet: source, validation: value, anomalies: [] }).some(b => /Association/.test(b.message)));
  await mountManual();
  const pagesBefore = (await stored()).pages;
  await click('Retirer les associations des blocs supprimés');
  assert.deepEqual((await stored()).pages, pagesBefore);
  assert.equal(links.activeAssociations(await stored()).length, 0);
  assert.deepEqual(finalizationBlockages({ packet: source, validation: await stored(), anomalies: [] }), []);
  await unmount(); await mountManual();
  assert.ok(!button('Retirer les associations des blocs supprimés'));
  assert.ok((await stored()).associations[0].deletedAt);
  await unmount();
});

test('text references open above both draft and finalized courses without moving the reading pane', async () => {
  await fresh();
  const links = require('../.test-build/domain/sourceCourse/associations');
  const { logicalBlocks } = require('../.test-build/domain/sourceCourse/manualBlocks');
  const { archiveFinalCourse } = require('../.test-build/domain/sourceCourse/finalization');
  let value = await stored();
  value.pages.forEach(page => page.blocks.forEach(block => { block.status = 'verified'; block.verifiedAt = '2026-10-16T10:00:00Z'; }));
  value = links.createAssociation(value, { printedPage: 160, blockId: 'part-1' }, 'Alpha one', 'Alpha', 0,
    { printedPage: 161, blockId: 'part-1' }, logicalBlocks(source, value));
  await review.saveValidation(value);
  const frozen = archiveFinalCourse(null, { packet: source, validation: value, anomalies: [] }, true).versions[0];
  for (const finalizedVersion of [undefined, frozen]) {
    await act(async () => { renderer = create(React.createElement(PrivateSourceCourse, { finalizedVersion })); });
    await settle();
    const pane = renderer.root.findByProps({ testID: 'source-reading-pane' });
    const link = renderer.root.findAll(n => n.type === 'Text' && n.props.accessibilityRole === 'link' && n.props.children === 'Alpha')[0];
    await act(async () => link.props.onPress());
    const modal = renderer.root.findByType('Modal');
    assert.ok(modal.findAll(n => n.type === 'Text' && n.props.selectable && n.props.children === 'Delta four').length);
    assert.strictEqual(renderer.root.findByProps({ testID: 'source-reading-pane' }), pane);
    await act(async () => modal.props.onRequestClose());
    assert.equal(renderer.root.findAllByType('Modal').length, 0);
    assert.strictEqual(renderer.root.findByProps({ testID: 'source-reading-pane' }), pane);
    await unmount();
  }
});

test('reading toolbar creates an exact native selection highlight, reloads, edits its note and deletes it', async () => {
  native.Platform.OS = 'ios';
  try {
    await fresh(); await mountReader();
    const press = async label => {
      const action = renderer.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityLabel === label)[0];
      assert.ok(action, label); await act(async () => action.props.onPress()); await settle();
    };
    assert.ok(renderer.root.findAll(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Surligner et annoter').length);
    const paragraph = renderer.root.findAll(n => n.type === 'Text' && n.props.children === 'Alpha one')[0];
    await act(async () => paragraph.props.onLongPress());
    const selection = input('Sélectionner précisément le passage roumain');
    await act(async () => selection.props.onSelectionChange({ nativeEvent: { selection: { start: 6, end: 9 } } }));
    await press('Utiliser cette sélection'); await press('Surligner yellow');
    await unmount(); await mountReader();
    const marked = renderer.root.findAll(n => n.type === 'Text' && n.props.children === 'one' && n.props.style?.backgroundColor === '#FFF0A8')[0];
    assert.ok(marked, 'Only the chosen word is highlighted after remount');
    await act(async () => marked.props.onPress());
    await press('Ajouter une note'); await typeInto('Note du passage', 'Note personnelle'); await press('Enregistrer la note');
    await press('Surligner et annoter'); await press('Supprimer');
    await press('Fermer les outils de lecture');
    assert.ok(selectable().includes('Alpha one'));
    await unmount();
  } finally { native.Platform.OS = 'web'; }
});

test('split permanent, four filters in order, no view buttons, counters', async () => {
  await fresh(); await mountManual();
  for (const gone of ['Split', 'Texte', 'Visuel', 'Anomalies auto', 'Ajouter un commentaire']) {
    assert.ok(!button(gone) && !chip(gone), `${gone} must be absent`);
  }
  const labels = renderer.root.findAll(n => n.type === 'Chip' && /\(\d+\)$/.test(n.props.label)).map(n => n.props.label);
  assert.deepEqual(labels, ['Tous (4)', 'Mes anomalies (0)', 'Vérifiés (0)', 'À vérifier (4)']);
  assert.ok(selectable().includes('Alpha one'));
  assert.equal(renderer.root.findAllByType('Image').length, 1);
  assert.ok(button('Ouvrir le PDF p. 160'));
  await unmount();
});

test('verifying removes the block from À vérifier and shows the next; navigation crosses pages', async () => {
  await fresh(); await mountManual();
  await clickChip('À vérifier (4)');
  await click('Vérifié ✓');
  assert.ok(selectable().includes('Beta two'));
  assert.ok(chip('À vérifier (3)') && chip('Vérifiés (1)'));
  await click('Bloc suivant'); await click('Bloc suivant');
  assert.ok(selectable().includes('Delta four'));
  assert.ok(button('Bloc suivant').props.disabled);
  await click('Bloc précédent');
  assert.ok(selectable().includes('Gamma three'));
  await clickChip('Vérifiés (1)');
  assert.ok(selectable().includes('Alpha one'));
  assert.equal((await stored()).pages[0].blocks[0].status, 'verified');
  await unmount();
});

test('top page and block navigation select filtered targets without losing an active editor', async () => {
  await fresh(); await mountManual();
  const page = chip('p. 161');
  assert.ok(page, 'page selector is visible at the top');
  await act(async () => page.props.onPress()); await settle();
  assert.ok(selectable().includes('Delta four'));
  const firstPage = chip('p. 160');
  await act(async () => firstPage.props.onPress()); await settle();
  const gamma = renderer.root.findAll(n => n.type === 'Chip' && /^Bloc \d+.*Gamma three/.test(n.props.label))[0];
  assert.ok(gamma, 'block selector provides a text preview');
  await act(async () => gamma.props.onPress()); await settle();
  assert.ok(selectable().includes('Gamma three'));
  await click('Anomalie !');
  const target = chip('p. 161');
  await act(async () => target.props.onPress()); await settle();
  assert.ok(input('Éditeur de correction'), 'navigation does not discard an unsaved edit');
  await click('Annuler');
  await unmount();
});

test('Anomalie ! opens a prefilled editor; saving corrects without verifying; reader is synchronized; undo restores', async () => {
  await fresh(); await mountManual();
  await click('Anomalie !');
  assert.equal(input('Éditeur de correction').props.value, 'Alpha one');
  await click('Annuler');
  assert.ok(!input('Éditeur de correction'));
  await click('Anomalie !');
  await typeInto('Éditeur de correction', 'Alpha one, corrected');
  await click('Enregistrer la correction');
  assert.ok(selectable().includes('Alpha one, corrected'));
  let v = await stored();
  assert.equal(v.pages[0].blocks[0].correction, 'Alpha one, corrected');
  assert.equal(v.pages[0].blocks[0].status, 'pending');
  assert.equal(v.pages[0].blocks[0].correctionHistory[0].before, 'Alpha one');
  assert.equal(v.anomalies?.length ?? 0, 0);
  assert.ok(chip('Mes anomalies (1)'));
  await unmount();
  await mountReader();
  assert.ok(selectable().includes('Alpha one, corrected'));
  await unmount();
  await mountManual();
  await click('Anomalie !');
  assert.equal(input('Éditeur de correction').props.value, 'Alpha one, corrected');
  await click('Annuler');
  await click('Annuler la correction');
  assert.ok(selectable().includes('Alpha one'));
  v = await stored();
  assert.equal(v.pages[0].blocks[0].correction, undefined);
  assert.equal(v.pages[0].blocks[0].correctionHistory.length, 2);
  await unmount();
});

test('repeated merges 2→3→4 keep the button, non adjacent order, correction of merged block, chained undo', async () => {
  await fresh();
  const seeded = await stored();
  seeded.anomalies = [{ id: 'history', chapterId: 'kum-08', printedPage: 160, blockId: 'part-2', status: 'resolved',
    description: 'Keep original comment', descriptionHistory: [{ description: 'Earlier comment' }] }];
  await review.saveValidation(seeded);
  await mountManual();
  assert.ok(button('Fusionner avec un autre bloc'));
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant'); await click('Bloc suivant');
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  assert.ok(button('Confirmer la fusion') && button('Annuler'));
  await click('Annuler');
  await click('Prévisualiser la fusion');
  await click('Descendre');
  await clickChip('Saut de ligne');
  assert.equal(input('Aperçu modifiable de la fusion').props.value, 'Gamma three\nAlpha one');
  await clickChip('Espace');
  await click('Confirmer la fusion');
  assert.equal((await stored()).merges.length, 1);
  assert.ok(selectable().includes('Gamma three Alpha one'));
  assert.ok(button('Fusionner avec un autre bloc') && button('Annuler la fusion'));
  assert.ok(chip('Tous (3)'));
  await click('Fusionner avec un autre bloc');
  await click('Bloc précédent');
  assert.ok(selectable().includes('Beta two'));
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  await click('Confirmer la fusion');
  assert.ok(selectable().includes('Gamma three Alpha one Beta two'));
  assert.ok(button('Fusionner avec un autre bloc'));
  assert.ok(chip('Tous (2)'));
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant');
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  assert.ok(renderer.root.findAll(n => n.type === 'Txt' && String(n.props.children).includes('pages différentes')).length);
  await click('Confirmer la fusion');
  assert.ok(selectable().includes('Gamma three Alpha one Beta two Delta four'));
  assert.ok(chip('Tous (1)'));
  assert.ok(button('Fusionner avec un autre bloc'));
  let v = await stored();
  assert.equal(v.merges.filter(m => !m.supersededBy).length, 1);
  assert.equal(v.merges.find(m => !m.supersededBy).sources.length, 4);
  assert.ok(v.pages.every(p => p.blocks.every(b => b.status === 'pending')));
  await click('Anomalie !');
  assert.equal(input('Éditeur de correction').props.value, 'Gamma three Alpha one Beta two Delta four');
  await typeInto('Éditeur de correction', 'Merged and corrected');
  await click('Enregistrer la correction');
  assert.ok(selectable().includes('Merged and corrected'));
  await unmount(); await mountManual();
  assert.ok(selectable().includes('Merged and corrected'));
  await click('Annuler la correction');
  assert.ok(selectable().includes('Gamma three Alpha one Beta two Delta four'));
  await click('Annuler la fusion');
  assert.ok(selectable().includes('Gamma three Alpha one Beta two'));
  await click('Annuler la fusion');
  assert.ok(selectable().includes('Gamma three Alpha one'));
  await click('Annuler la fusion');
  assert.ok(chip('Tous (4)'));
  v = await stored();
  assert.equal(v.merges.length, 0);
  assert.equal(v.mergeLog.length, 6);
  assert.equal(v.anomalies[0].description, 'Keep original comment');
  assert.equal(v.anomalies[0].descriptionHistory[0].description, 'Earlier comment');
  await unmount();
});

test('merge refuses figures, verifying a merged block verifies every source, export then import restores it', async () => {
  await fresh();
  source.pages[0].parts[1] = { ...part('part-2', 'Figure label'), role: 'figure', kind: 'visual' };
  await review.saveValidation(review.reconcileReviewValidation(null, source));
  await mountManual();
  await click('Bloc suivant');
  assert.ok(!button('Fusionner avec un autre bloc'));
  await click('Bloc précédent');
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant'); await click('Bloc suivant');
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  await click('Confirmer la fusion');
  await click('Vérifié ✓');
  let v = await stored();
  assert.equal(v.pages[0].blocks[0].status, 'verified');
  assert.equal(v.pages[0].blocks[2].status, 'verified');
  assert.equal(v.pages[0].blocks[1].status, 'pending');
  const xp = require('../.test-build/domain/sourceCourse/structureExport');
  const data = JSON.stringify(xp.buildStructureExport(source, v));
  await unmount();
  global.indexedDB = new IDBFactory(); records.clear();
  await review.saveValidation(review.reconcileReviewValidation(null, source));
  await mountManual();
  await click('Exporter / importer');
  await typeInto('Import d’un export', data);
  await click('Importer l’export collé');
  v = await stored();
  assert.equal(v.merges.length, 1);
  assert.equal(v.pages[0].blocks[0].status, 'verified');
  await click('Importer l’export collé').catch(() => {});
  assert.equal((await stored()).merges.length, 1);
  await unmount();
});

test('classification controls are available in manual verification and persist for normal, tables, bibliography, and merged blocks', async () => {
  await fresh(); await mountManual();
  assert.ok(chip('Texte normal'));
  assert.ok(chip('Titre 2 (H2)'));
  assert.ok(chip('Bibliographie / Références'));
  await clickChip('Tableau');
  assert.equal((await stored()).pages[0].blocks[0].kind, 'table');
  assert.ok(button('Enregistrer le tableau'), 'l’éditeur de tableau s’ouvre immédiatement après le classement');
  await click('Annuler');
  await clickChip('Texte normal');
  assert.equal((await stored()).pages[0].blocks[0].kind, undefined);
  await clickChip('Bibliographie / Références');
  assert.equal((await stored()).pages[0].blocks[0].kind, 'bibliography');
  await unmount(); await mountManual();
  assert.ok(chip('Bibliographie / Références').props.selected);
  await clickChip('Texte normal');
  await click('Fusionner avec un autre bloc');
  await click('Bloc suivant');
  await click('Ajouter à la fusion');
  await click('Prévisualiser la fusion');
  await click('Confirmer la fusion');
  await clickChip('Titre 3 (H3)');
  const validation = await stored();
  assert.equal(validation.pages[0].blocks[0].kind, 'h3');
  assert.equal(validation.pages[0].blocks[1].kind, 'h3');
  await unmount();
});

test('paragraph normalization is previewed, persisted as a reversible correction, and never overwrites an existing correction', async () => {
  await fresh();
  source.pages[0].parts[0] = part('part-1', 'Tratamentul trebuie\ninițiat rapid\npentru a preveni complicațiile.');
  await review.saveValidation(review.reconcileReviewValidation(await stored(), source));
  await mountManual();
  assert.ok(button('Proposer la normalisation des paragraphes'));
  await click('Proposer la normalisation des paragraphes');
  assert.equal(input('Éditeur de correction').props.value, 'Tratamentul trebuie inițiat rapid pentru a preveni complicațiile.');
  await click('Accepter la normalisation');
  let validation = await stored();
  assert.equal(validation.pages[0].blocks[0].correction, 'Tratamentul trebuie inițiat rapid pentru a preveni complicațiile.');
  await unmount(); await mountManual();
  assert.ok(!button('Proposer la normalisation des paragraphes'));
  await click('Annuler la correction');
  validation = await stored();
  assert.equal(validation.pages[0].blocks[0].correction, undefined);
  await unmount();
});

test('global normalization previews verified blocks and marks accepted changes for renewed review', async () => {
  await fresh();
  source.pages[0].parts[0] = part('part-1', 'Tratamentul trebuie\ninițiat rapid.');
  let validation = review.reconcileReviewValidation(await stored(), source);
  validation.pages[0].blocks[0] = { ...validation.pages[0].blocks[0], status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' };
  await review.saveValidation(validation);
  await mountManual();
  await click('Nettoyer les retours à la ligne');
  assert.ok(selectable().includes('Tratamentul trebuie\ninițiat rapid.'));
  assert.ok(selectable().includes('Tratamentul trebuie inițiat rapid.'));
  await click('Appliquer 1 normalisation(s)');
  validation = await stored();
  assert.equal(validation.pages[0].blocks[0].correction, 'Tratamentul trebuie inițiat rapid.');
  assert.equal(validation.pages[0].blocks[0].status, 'in-review');
  assert.equal(validation.pages[0].blocks[0].statusHistory[0].before, 'verified');
  await unmount(); await mountManual();
  assert.ok(!button('Nettoyer les retours à la ligne').props.disabled);
  await unmount();
});

test('split control previews, persists, reloads, and can be undone without replacing the block', async () => {
  await fresh(); await mountManual();
  assert.ok(button('Séparer le bloc'));
  await click('Séparer le bloc');
  assert.ok(input('Position de séparation'));
  await typeInto('Position de séparation', '5');
  assert.ok(selectable().includes('Alpha'));
  assert.ok(selectable().includes('one'));
  await click('Enregistrer la séparation');
  let validation = await stored();
  assert.equal(validation.splits.length, 1);
  await unmount(); await mountManual();
  assert.ok(button('Annuler la séparation'));
  assert.ok(selectable().includes('Alpha'));
  assert.ok(selectable().includes('one'));
  await click('Annuler la séparation');
  validation = await stored();
  assert.equal(validation.splits.length, 0);
  await unmount();
});

test('manual block addition previews, persists, filters and can be creation-undone', async () => {
  await fresh(); await mountManual();
  await click('Ajouter un bloc après');
  assert.ok(input('Texte du nouveau bloc manuel'));
  await typeInto('Texte du nouveau bloc manuel', 'Manual independent text');
  assert.ok(selectable().includes('Manual independent text'));
  await click('Confirmer l’ajout du bloc');
  let validation = await stored();
  assert.equal(validation.manualBlocks.length, 1);
  const manual = validation.manualBlocks[0];
  assert.equal(manual.sourceRef.printedPage, 160);
  assert.equal(manual.sourceRef.pdfPage, 183);
  assert.equal(manual.after.blockId, 'part-1');
  assert.ok(selectable().includes('Manual independent text'));
  await click('Vérifié ✓');
  await clickChip('Vérifiés (1)');
  assert.ok(selectable().includes('Manual independent text'));
  await click('Annuler la création du bloc');
  validation = await stored();
  assert.ok(validation.manualBlocks[0].undoneAt);
  assert.ok(!selectable().includes('Manual independent text'));
  await unmount();
});
