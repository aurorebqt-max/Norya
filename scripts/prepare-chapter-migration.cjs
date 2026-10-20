#!/usr/bin/env node
// Offline, read-only preview by default. Writes only a NEW private file with --output.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react-native') return { Platform: { OS: 'web' } };
  if (name === '@react-native-async-storage/async-storage') return {};
  return original.call(this, name, ...args);
};
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, f);
const { packageLegacyExport, parseChapterBackup } = require('../src/domain/sourceCourse/chapterBackup.ts');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--structure') || !args.includes('--packet')) {
  console.error('Usage: node scripts/prepare-chapter-migration.cjs --structure export.json --packet source.json [--output references-privees/exports/NOUVEAU.json]');
  process.exit(1);
}
const backup = packageLegacyExport(JSON.parse(fs.readFileSync(option('--packet'), 'utf8')), JSON.parse(fs.readFileSync(option('--structure'), 'utf8')));
parseChapterBackup(JSON.stringify(backup), backup.chapterId);
console.log(JSON.stringify({ chapter: backup.chapterId, pages: backup.packet.pages.length,
  blocks: backup.packet.pages.reduce((n,p) => n + p.parts.length, 0), merges: backup.validation.merges.length,
  associations: backup.validation.associations.length, anomalies: backup.validation.anomalies.length,
  missing: ['finalized archive', 'reading annotations and translations', 'learning progress'], mode: args.includes('--output') ? 'new private file' : 'preview only' }, null, 2));
if (args.includes('--output')) {
  const destination = path.resolve(option('--output'));
  const root = path.resolve(__dirname, '../references-privees') + path.sep;
  if (!destination.startsWith(root)) throw new Error('La sortie doit rester sous references-privees/.');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(backup), { flag: 'wx', mode: 0o600 });
  console.log('Created:', path.relative(process.cwd(), destination));
}
