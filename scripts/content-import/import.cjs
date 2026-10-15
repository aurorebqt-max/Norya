'use strict';
// Deliberately independent of src/data: no legacy enrichment or implicit verification.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const digest = text => createHash('sha256').update(text, 'utf8').digest('hex');
const scopes = { 'kum-08': [[151,168]], 'kum-09': [[172,190],[195,202]] };
const pending = /PARȚIAL|DE REDACTAT|De integrat separat|De realizat|trebuie realizată|verificare documentară și medicală necesară|în curs de redactare/iu;
function inspect(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'contenus-norya/import-manifest.json'), 'utf8'));
  const errors = [], blockers = [], chapters = [];
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.chapters)) throw new Error('Manifest invalide');
  if (JSON.stringify(manifest.chapters.map(c => c.chapterId).sort()) !== JSON.stringify(Object.keys(scopes).sort())) errors.push('Les deux chapitres, sans doublons, sont requis');
  for (const config of manifest.chapters) {
    const id = config.chapterId;
    if (!scopes[id]) { errors.push(`Chapitre interdit: ${id}`); continue; }
    const file = `contenus-norya/kumar-${id.slice(-2)}.md`;
    if (config.file !== file || config.language !== 'ro' || JSON.stringify(config.pages) !== JSON.stringify(scopes[id])) {
      errors.push(`${id}: fichier, langue ou périmètre invalide`); continue;
    }
    let raw;
    try { raw = fs.readFileSync(path.join(root, file), 'utf8'); }
    catch { errors.push(`${id}: fichier absent`); continue; }
    if (!raw.trim()) errors.push(`${id}: fichier vide`);
    const sha256 = digest(raw);
    if (config.sha256 !== sha256) errors.push(`${id}: empreinte modifiée, index et vérification à renouveler`);
    if (!['partial','complete'].includes(config.status)) errors.push(`${id}: statut invalide`);
    if (config.status !== 'complete') blockers.push(`${id}: contenu partiel`);
    const review = config.verification;
    if (!review || !['needs-review','beta','verified'].includes(review.status)) errors.push(`${id}: statut de vérification absent/invalide`);
    if (review?.status === 'verified' && (review.sha256 !== sha256 || !review.reviewer?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(review.date || ''))) blockers.push(`${id}: vérification humaine datée liée au SHA-256 requise`);
    if (pending.test(raw)) blockers.push(`${id}: marqueurs de travail incomplet présents`);
    const lines = raw.split('\n');
    const sections = [];
    const ids = new Set();
    let previous = 0;
    if (!Array.isArray(config.sections) || !config.sections.length) { errors.push(`${id}: sections absentes`); continue; }
    for (const section of config.sections) {
      const { startLine, endLine } = section;
      if (!section.id || ids.has(section.id) || !Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine !== previous + 1 || endLine < startLine || endLine > lines.length) {
        errors.push(`${id}: index de sections invalide (${section.id})`); continue;
      }
      ids.add(section.id); previous = endLine;
      if (!['course','sheet','flashcards','metadata','editorial'].includes(section.kind) || !['draft','planned','beta','verified','editorial'].includes(section.status)) errors.push(`${id}/${section.id}: type ou statut invalide`);
      const markdown = lines.slice(startLine - 1, endLine).join('\n');
      if (!section.title || !markdown.split('\n').includes(section.title)) errors.push(`${id}/${section.id}: titre absent`);
      const pages = section.pages;
      if (!Array.isArray(pages) || pages.some(p => !Number.isInteger(p) || !scopes[id].some(([a,b]) => p >= a && p <= b))) errors.push(`${id}/${section.id}: pages hors Tematica`);
      if (['course','sheet','flashcards'].includes(section.kind)) {
        if (!['beta','verified'].includes(section.status)) blockers.push(`${id}/${section.id}: ${section.status}`);
        if (!pages?.length) blockers.push(`${id}/${section.id}: références de pages à renseigner`);
        const body = markdown.split('\n').filter(line => line.trim() && line !== section.title && !/^\s*(#|Sursă:|Kumar, p\.|\*\*Sursă:|[-⸻]+\s*$)/u.test(line));
        if (!body.length) blockers.push(`${id}/${section.id}: titre/référence sans contenu`);
      }
      sections.push({ ...section, markdown, available: ['beta','verified'].includes(section.status) && ['course','sheet','flashcards'].includes(section.kind) });
    }
    if (previous !== lines.length) errors.push(`${id}: index incomplet`);
    const covered = new Set(sections.filter(s => s.kind === 'course' && ['beta','verified'].includes(s.status)).flatMap(s => s.pages || []));
    const missingPages = scopes[id].flatMap(([a,b]) => Array.from({length:b-a+1}, (_,i) => a+i)).filter(p => !covered.has(p));
    if (missingPages.length) blockers.push(`${id}: pages non attestées: ${missingPages.join(', ')}`);
    chapters.push({ chapterId:id, language:'ro', source:{file,sha256}, pages:scopes[id], rawMarkdown:raw, sections,
      publication:review?.status === 'beta' ? 'beta' : 'staging-only', fiches:[], flashcards:[], translation:null });
  }
  return {schemaVersion:1, ready:errors.length === 0 && blockers.length === 0, errors, blockers, chapters};
}
module.exports = { inspect, digest };
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--stage','--require-ready'].includes(arg))) throw new Error('Options: --stage, --require-ready');
    const root = path.resolve(__dirname, '../..');
    const result = inspect(root);
    console.log(JSON.stringify({ready:result.ready, errors:result.errors, blockers:result.blockers}, null, 2));
    if (args.includes('--stage') && !result.errors.length) {
      const out = path.join(root, 'build-validation/content-import');
      fs.mkdirSync(out, {recursive:true});
      fs.writeFileSync(path.join(out, 'kumar-staging.json'), JSON.stringify(result, null, 2) + '\n');
    }
    if (result.errors.length || (args.includes('--require-ready') && !result.ready)) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
