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
const storage = { getItem: async k => records.get(k) ?? null, setItem: async (k, v) => { records.set(k, v); } };
const original = Module._load;
const native = {
  Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 1000, height: 900 }),
  Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
};
let source;
Module._load = function(name, ...args) {
  if (name === 'react-native') return native;
  if (name === 'expo-file-system') return { File: class {}, Directory: class {}, Paths: {} };
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === './ui') return { Button: 'Button', Card: 'Card', Chip: 'Chip', Txt: 'Txt' };
  if (name.endsWith('/storage/privateCourse')) return { openOriginalPage: async () => {}, loadPrivateCourse: async () => source };
  if (name.endsWith('/sourceCourse/verification')) return review;
  return original.call(this, name, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const review = require('../.test-build/domain/sourceCourse/verification.js');
const cls = require('../.test-build/domain/sourceCourse/classification.js');
const detector = require('../.test-build/domain/sourceCourse/tableDetection.js');
const exporter = require('../.test-build/domain/sourceCourse/structureExport.js');
const finalization = require('../.test-build/domain/sourceCourse/finalization.js');
const { PrivateSourceCourse } = require('../src/components/PrivateSourceCourse.tsx');

const part = (id, text) => ({
  id, role: 'paragraph', kind: 'text', text, lines: [[{ text, bold: false, italic: false }]],
  bbox: [0, 0, 100, 100], reasons: [], image: 'data:image/png;base64,synthetic', sourceLineIds: [`${id}-l`],
});
const page = (printedPage, parts) => ({
  printedPage, pdfPage: printedPage + 23, width: 100, height: 100, pdf: 'JVBERi0=', image: 'data:image/png;base64,synthetic',
  sourceLineIds: parts.map(p => `${p.id}-l`), parts,
});
const fixture = () => ({
  chapterId: 'kum-08', schemaVersion: 2, mode: 'structured-source-draft', complete: false, sourceSha256: 'a'.repeat(64),
  pages: [
    page(160, [part('part-1', 'Chapter title'), part('part-2', 'Author One, Author Two'), part('part-3', 'Printed contents 154'),
      part('part-4', 'Intro before sections'), part('part-5', 'Section A'), part('part-6', 'Sub A1'), part('part-7', 'Body of A')]),
    page(161, [part('part-1', 'Section B'), part('part-2', 'Sub B1'), part('part-3', 'Body of B'), part('part-4', 'Dose  5 mg  daily')]),
  ],
});
const ref = (printedPage, blockId) => ({ printedPage, blockId });
const classify = (validation, entries) => entries.reduce((v, [p, id, kind]) => cls.setBlockKind(v, ref(p, id), kind), validation);
const CLASSES = [[160, 'part-1', 'h1'], [160, 'part-2', 'authors'], [160, 'part-3', 'toc'], [160, 'part-5', 'h2'],
  [160, 'part-6', 'h3'], [161, 'part-1', 'h2'], [161, 'part-2', 'h4']];
const settle = async () => { for (let i = 0; i < 30; i++) await act(async () => { await new Promise(r => setImmediate(r)); }); };
async function fresh() {
  global.indexedDB = new IDBFactory(); records.clear(); source = fixture();
  await review.saveValidation(review.reconcileReviewValidation(null, source));
}
async function mount() {
  let r; await act(async () => { r = create(React.createElement(PrivateSourceCourse, {})); }); await settle(); return r;
}
const texts = r => r.root.findAll(n => n.type === 'Text' && n.props.selectable).map(n => n.props.children);
const press = async (r, type, match) => {
  const node = r.root.findAll(n => n.type === type && (n.props.title === match || n.props.label === match))[0];
  assert.ok(node, `Missing ${match}`);
  await act(async () => { await node.props.onPress(); }); await settle();
};

test('1. H1/H2/H3/H4/authors/toc: header data, section navigation with sub-titles, text untouched', async () => {
  await fresh();
  const saved = classify(await review.loadValidation('kum-08'), CLASSES);
  await review.saveValidation(saved);
  const structure = require('../.test-build/domain/sourceCourse/courseStructure.js').buildCourseStructure(source, saved);
  assert.equal(structure.title, 'Chapter title');
  assert.deepEqual(structure.authors, ['Author One, Author Two']);
  assert.deepEqual(structure.sections.map(s => s.title), ['Section A', 'Section B']);
  assert.deepEqual(structure.intro.map(i => i.presentation.text), ['Intro before sections']);
  assert.equal(JSON.stringify(source), JSON.stringify(fixture()), 'source packet is never modified');
  const reader = await mount();
  let shown = texts(reader).join('|');
  assert.match(shown, /Intro before sections/); assert.match(shown, /Section A/); assert.match(shown, /Body of A/);
  assert.doesNotMatch(shown, /Section B|Printed contents|Author One|Chapter title/);
  assert.equal(reader.root.findAll(n => n.props.testID === 'course-h3').length, 1);
  assert.ok(!reader.root.findAll(n => n.props.accessibilityLabel === 'Page 160').length, 'no page navigation in the course');
  await press(reader, 'Chip', 'Section B');
  shown = texts(reader).join('|');
  assert.match(shown, /Body of B/); assert.equal(reader.root.findAll(n => n.props.testID === 'course-h4').length, 1);
  assert.doesNotMatch(shown, /Body of A|Intro before/);
  await press(reader, 'Button', 'Section précédente');
  assert.match(texts(reader).join('|'), /Body of A/);
  await act(async () => reader.unmount());
});

test('2. digital table: edit cells and spans, draft keeps the image, validation shows a selectable table', async () => {
  await fresh();
  const at = ref(161, 'part-4');
  let v = classify(await review.loadValidation('kum-08'), [[161, 'part-4', 'table']]);
  let table = cls.tableFromText(source.pages[1].parts[3].text);
  assert.deepEqual(table.rows[0].map(c => c.text), ['Dose', '5 mg', 'daily']);
  table = cls.setCellText(table, 0, 1, '5 mg/kg');
  table = cls.addRow(table, 1); table = cls.setCellText(table, 1, 0, 'Note ®');
  table = cls.setCellSpan(table, 1, 0, 1, 3);
  assert.equal(table.rows[1][1].covered, true);
  assert.doesNotThrow(() => cls.removeRow(table, 0), 'a fusion on another row must not block deletion');
  v = cls.saveBlockTable(v, at, table);
  await review.saveValidation(v);
  let reader = await mount();
  assert.equal(reader.root.findAll(n => n.type === 'table').length, 0, 'draft table is not published');
  assert.equal(reader.root.findAllByType('Image').length, 1, 'original image kept until validation');
  await act(async () => reader.unmount());
  v = cls.decideBlockTable(v, at, 'validate');
  await review.saveValidation(v);
  reader = await mount();
  assert.equal(reader.root.findAll(n => n.type === 'table').length, 1);
  const cells = reader.root.findAll(n => n.type === 'td' || n.type === 'th');
  assert.deepEqual(cells.map(c => c.props.children), ['Dose', '5 mg/kg', 'daily', 'Note ®']);
  assert.equal(cells[3].props.colSpan, 3);
  await act(async () => reader.unmount());
  assert.equal(cls.setCellText(v.pages[1].blocks[3].table, 0, 0, 'Dose').validated, false, 'editing withdraws validation');
});

test('2b. table row roles and cell headers are optional, editable and retained around row insertion', () => {
  let table = cls.tableFromText('A  B\nC  D');
  assert.equal(cls.rowRole(table, 0), 'header', 'existing tables retain their first-row header behavior');
  table = cls.setRowRole(table, 1, 'category');
  table = cls.setCellHeader(table, 1, 1, true);
  table = cls.addRow(table, 1);
  assert.deepEqual(table.rowRoles, ['header', 'normal', 'category']);
  assert.equal(cls.rowRole(table, 2), 'category');
  assert.equal(table.rows[2][1].header, true);
  table = cls.removeRow(table, 1);
  assert.deepEqual(table.rowRoles, ['header', 'category']);
  assert.equal(table.rows[1][1].header, true);
});

test('2c. removing another row preserves a vertical merge and shortens it when crossing it', () => {
  let table = cls.tableFromText('A  B\nC  D\nE  F');
  table = cls.setCellSpan(table, 0, 0, 2, 1);
  assert.doesNotThrow(() => cls.removeRow(table, 2), 'unrelated row may be removed');
  table = cls.setCellSpan(cls.tableFromText('A  B\nC  D\nE  F'), 0, 0, 2, 1);
  table = cls.removeRow(table, 1);
  assert.equal(table.rows[0][0].rowSpan, undefined, 'a crossed vertical merge is reduced safely');
});

test('2d. table detection uses repeated separators, preserves cells, and declines ambiguous one-column text', () => {
  const tablePart = part('table-1', 'Médicament  Dose  Voie\nAmoxicilină  500 mg  oral\nCeftriaxonă  1 g  IV');
  tablePart.lines = tablePart.text.split('\n').map(text => [{ text, bold: false, italic: false }]);
  const proposal = detector.detectTableFromPart(tablePart, '2026-10-16T00:00:00Z');
  assert.equal(proposal.table.rows.length, 3);
  assert.deepEqual(proposal.table.rows[1].map(cell => cell.text), ['Amoxicilină', '500 mg', 'oral']);
  assert.equal(proposal.table.detection.method, 'repeated-delimiters-v1');
  const uncertain = detector.detectTableFromPart(part('table-2', 'Ligne sans séparation\nToujours ambiguë'), '2026-10-16T00:00:00Z');
  assert.equal(uncertain.table, null);
  assert.match(uncertain.detection.warnings.join(' '), /coordonnées des fragments/);
});

test('3. persistence: classifications and tables survive reload, export and re-import without duplicates', async () => {
  await fresh();
  let v = classify(await review.loadValidation('kum-08'), [...CLASSES, [161, 'part-4', 'table']]);
  v = cls.decideBlockTable(cls.saveBlockTable(v, ref(161, 'part-4'), cls.tableFromText('A  B')), ref(161, 'part-4'), 'validate');
  await review.saveValidation(v);
  const reloaded = await review.loadValidation('kum-08');
  assert.equal(reloaded.pages[0].blocks[4].kind, 'h2');
  assert.equal(reloaded.pages[1].blocks[3].table.validated, true);
  const data = JSON.parse(JSON.stringify(exporter.buildStructureExport(source, reloaded)));
  assert.equal(data.blocks.find(b => b.printedPage === 160 && b.id === 'part-5').kind, 'h2');
  assert.equal(data.references.tables[0].digital, 'validated');
  assert.deepEqual(data.references.sections.map(s => s.title), ['Section A', 'Section B']);
  await fresh();
  const imported = exporter.importStructureExport(JSON.stringify(data), source, await review.loadValidation('kum-08'));
  assert.deepEqual(imported.pages.flatMap(p => p.blocks.map(b => b.kind ?? null)), reloaded.pages.flatMap(p => p.blocks.map(b => b.kind ?? null)));
  assert.equal(JSON.stringify(imported.pages[1].blocks[3].table), JSON.stringify(reloaded.pages[1].blocks[3].table));
  assert.equal(imported.pages.reduce((n, p) => n + p.blocks.length, 0), 11, 'no duplicated block');
  const again = exporter.importStructureExport(data, source, imported);
  assert.equal(JSON.stringify(again.pages), JSON.stringify(imported.pages));
});

test('4. finalization: draft table blocks, headings/toc/authors excluded from reading time, merges and corrections kept', async () => {
  await fresh();
  const verified = v => ({ ...v, pages: v.pages.map(p => ({ ...p, blocks: p.blocks.map(b => ({ ...b, status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' })) })) });
  let v = classify(await review.loadValidation('kum-08'), [...CLASSES, [161, 'part-4', 'table']]);
  v = cls.saveBlockTable(v, ref(161, 'part-4'), cls.tableFromText('Dose  5 mg'));
  v = verified(v);
  const evidence = () => ({ packet: source, validation: v, anomalies: [] });
  assert.ok(finalization.finalizationBlockages(evidence()).some(b => /Tableau numérique non validé/.test(b.message)));
  v = cls.decideBlockTable(v, ref(161, 'part-4'), 'validate');
  assert.deepEqual(finalization.finalizationBlockages(evidence()), []);
  const archive = finalization.archiveFinalCourse(null, evidence(), true);
  const version = archive.versions[0];
  const frozen = version.presentations;
  assert.equal(frozen[finalization.presentationKey(160, 'part-3')].hide, true);
  assert.equal(frozen[finalization.presentationKey(160, 'part-3')].text, 'Printed contents 154', 'hidden toc keeps its text');
  // words counted once: 3 (intro) + 2 + 2 + 2 + 2 + 3 + 2 body/headings/table words; toc, authors, title excluded.
  assert.equal(version.reading.words, 'Intro before sections Section A Sub A1 Body of A Section B Sub B1 Body of B Dose 5 mg'.split(' ').length);
  const frozenStructure = require('../.test-build/domain/sourceCourse/courseStructure.js').buildCourseStructure(version.packet, version.validation, frozen);
  assert.equal(frozenStructure.title, 'Chapter title');
  assert.deepEqual(frozenStructure.sections.map(s => s.title), ['Section A', 'Section B']);
});

test('5. bibliography remains private/exported while excluded from reconstructed and finalized courses', async () => {
  await fresh();
  let validation = await review.loadValidation('kum-08');
  validation = cls.setBlocksKind(validation, [ref(160, 'part-3'), ref(160, 'part-4')], 'bibliography');
  assert.equal(validation.pages[0].blocks[2].kind, 'bibliography');
  assert.equal(validation.pages[0].blocks[3].kind, 'bibliography');
  await review.saveValidation(validation);
  const structure = require('../.test-build/domain/sourceCourse/courseStructure.js').buildCourseStructure(source, validation);
  assert.ok(!structure.intro.some(item => item.printedPage === 160 && (item.blockId === 'part-3' || item.blockId === 'part-4')));
  const exported = exporter.buildStructureExport(source, validation);
  const bibliography = exported.blocks.filter(block => block.kind === 'bibliography');
  assert.equal(bibliography.length, 2);
  assert.deepEqual(bibliography.map(block => block.rawText), ['Printed contents 154', 'Intro before sections']);
  validation = {
    ...validation,
    pages: validation.pages.map(page => ({ ...page, blocks: page.blocks.map(block => ({ ...block, status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' })) })),
  };
  const archive = finalization.archiveFinalCourse(null, { packet: source, validation, anomalies: [] }, true);
  assert.equal(archive.versions[0].presentations[finalization.presentationKey(160, 'part-3')].hide, true);
  assert.equal(archive.versions[0].presentations[finalization.presentationKey(160, 'part-4')].hide, true);
});

test('6. navigation outline contains only verified H2/H3/H4 titles in document order', async () => {
  await fresh();
  let validation = classify(await review.loadValidation('kum-08'), CLASSES);
  validation = {
    ...validation,
    pages: validation.pages.map(page => ({
      ...page,
      blocks: page.blocks.map(block => ['part-5', 'part-6'].includes(block.id) || (page.printedPage === 161 && ['part-1', 'part-2'].includes(block.id))
        ? { ...block, status: 'verified', verifiedAt: '2026-01-01T00:00:00Z' } : block),
    })),
  };
  const structure = require('../.test-build/domain/sourceCourse/courseStructure.js').buildCourseStructure(source, validation);
  assert.deepEqual(structure.outline.map(item => [item.level, item.title]), [
    ['h2', 'Section A'], ['h3', 'Sub A1'], ['h2', 'Section B'], ['h4', 'Sub B1'],
  ]);
  assert.ok(!structure.outline.some(item => /Chapter title|Author One|Printed contents/.test(item.title)));
});
