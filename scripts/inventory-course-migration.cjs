#!/usr/bin/env node
// Read-only inventory. No deletion or automatic migration of browser storage.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
function files(dir) { return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []) : []; }
const code = [...files(path.join(root, 'src')), ...files(path.join(root, 'scripts')), ...files(path.join(root, 'tests'))].filter(f => /\.(tsx?|cjs|py)$/.test(f));
const codeText = new Map(code.map(file => [file, fs.readFileSync(file, 'utf8')]));
const candidates = [...files(path.join(root, 'src/data')), ...files(path.join(root, 'contenus-norya')), ...files(path.join(root, 'references-privees'))];
const rows = candidates.map(file => {
 const relative = path.relative(root, file); const basename = path.basename(file, path.extname(file));
 const privateFile = relative.startsWith('references-privees/');
 const protectedFile = /erata|errata|rezidentiat|thematica|tematica|program|examRules|documentation/i.test(relative);
 const imports = code.filter(f => f !== file && codeText.get(f).includes(basename)).map(f => path.relative(root, f));
 return { file: relative, bytes: fs.statSync(file).size, kind: protectedFile ? 'KEEP reference' : privateFile ? 'PRIVATE: independent backup and explicit approval required' : 'REVIEW legacy candidate; dependencies must be removed first', dependencies: imports };
});
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), mode: 'read-only', deletionsAuthorized: false, files: rows }, null, 2));
