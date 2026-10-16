#!/usr/bin/env node
// Range un export Norya (téléchargé depuis le navigateur) sous references-privees/exports/.
// N'écrase jamais un fichier existant, ne touche pas à Git et confirme seulement après relecture du fichier.
const fs = require('node:fs');
const path = require('node:path');
const source = process.argv[2];
if (!source) { console.error('Usage : node scripts/save-private-export.cjs <norya-structure-….json>'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(source, 'utf8'));
if (data.format !== 'norya-source-structure') { console.error('Ce fichier n’est pas un export de structure Norya.'); process.exit(1); }
const dir = path.join(__dirname, '..', 'references-privees', 'exports', data.chapterId);
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, path.basename(source));
if (fs.existsSync(target)) { console.error(`Déjà présent, non écrasé : ${target}`); process.exit(1); }
fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
const check = JSON.parse(fs.readFileSync(target, 'utf8'));
if (check.exportedAt !== data.exportedAt) { console.error('Vérification échouée.'); process.exit(1); }
console.log(`Enregistré dans Codespaces : ${target}\nFichier privé : ne pas publier sur GitHub.`);
