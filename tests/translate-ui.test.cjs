const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' }, Image: 'Image', Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' };
  if (name === '@react-native-async-storage/async-storage') return {};
  if (name === './ui') return { Button: 'Button', Txt: 'Txt' };
  return original.call(this, name, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { TranslateAdminPanel } = require('../src/components/TranslateAdminPanel.tsx');
const { translationSnapshot } = require('../src/domain/sourceCourse/translateBridge.ts');
const { fixture } = require('./fixtures/translate-fiction.cjs');
const tick = () => new Promise(resolve => setTimeout(resolve, 25));
test('FR panel: confirmation required, queue, validated display with cells/styles/images, original untouched', async () => {
  const { packet, validation } = fixture(); const snap = translationSnapshot(packet, validation); const before = JSON.stringify(snap);
  let sent, published = false, calls = []; const previous = global.fetch;
  global.fetch = async (url, options) => {
    const action = new URL(url, 'https://fiction.test').searchParams.get('action'); calls.push(action);
    if (action === 'session') return new Response('{"administrator":true}');
    if (action === 'lookup') return published ? new Response(JSON.stringify({ chapter_id: sent.chapterId, source_revision: sent.sourceRevision,
      translations: sent.blocks.map(b => ({ id: b.id, text: 'FR ' + b.text, validated: true })) })) : new Response('{}', { status: 404 });
    if (action === 'enqueue') { sent = JSON.parse(options.body); return new Response('{"id":"fiction-job","status":"pending"}', { status: 201 }); }
    throw new Error('Unexpected ' + action);
  };
  let tree;
  const click = async title => act(async () => { const b = tree.root.findAllByType('Button').find(b => b.props.title === title);
    assert.ok(b, `${title}: ${JSON.stringify(tree.toJSON())}`); b.props.onPress(); await tick(); });
  try {
    await act(async () => { tree = create(React.createElement(TranslateAdminPanel, { snapshot: snap, eligible: true })); });
    for (let n = 0; n < 4; n++) await act(tick);
    assert.equal(calls.includes('enqueue'), false);
    await click('Envoyer à Translate'); assert.equal(calls.includes('enqueue'), false);
    await click('Confirmer l’envoi'); assert.ok(sent);
    assert.ok(JSON.stringify(tree.toJSON()).includes('En attente de traduction'));
    published = true; await click('Vérifier la traduction');
    const rendered = JSON.stringify(tree.toJSON());
    assert.ok(rendered.includes('FR Pacient fictiv'));
    assert.ok(rendered.includes('FR Tabel fictiv'));
    assert.equal(tree.root.findAllByType('th')[0].props.colSpan, 2);
    assert.ok(tree.root.findAllByType('Text').some(t => t.props.style?.fontWeight === 'bold' && t.props.children === 'FR Exemplu fictiv'));
    assert.ok(tree.root.findAllByType('Image').some(i => i.props.source.uri === 'fiction-image'));
    assert.equal(JSON.stringify(snap), before);
    // Changing the source immediately removes the old translated modal.
    const next = JSON.parse(before); next.nodes[0].text += ' changed'; published = false;
    await act(async () => { tree.update(React.createElement(TranslateAdminPanel, { snapshot: next, eligible: true })); });
    assert.equal(tree.root.findAllByType('Modal').length, 0);
  } finally { if (tree) await act(async () => tree.unmount()); global.fetch = previous; }
});
test('unfinalized course cannot be sent; existing reading storage is not accessed', async () => {
  const { packet, validation } = fixture(); let tree; const previous = global.fetch; const calls = [];
  global.fetch = async url => { calls.push(url); return new Response('{}', { status: 401 }); };
  try {
    await act(async () => { tree = create(React.createElement(TranslateAdminPanel, { snapshot: translationSnapshot(packet, validation), eligible: false })); await tick(); });
    assert.equal(tree.root.findAllByType('Button').length, 0);
    assert.ok(calls.every(u => u.includes('action=session')));
  } finally { await act(async () => tree.unmount()); global.fetch = previous; }
});
