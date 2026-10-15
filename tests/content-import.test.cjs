const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {inspect,digest}=require('../scripts/content-import/import.cjs');
const {compile}=require('../scripts/content-import/compile.cjs');
const root=path.resolve(__dirname,'..');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'norya-import-'));
 fs.cpSync(path.join(root,'contenus-norya'),path.join(dir,'contenus-norya'),{recursive:true});
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return dir;
}
function edit(dir,fn){const file=path.join(dir,'contenus-norya/import-manifest.json'); const m=JSON.parse(fs.readFileSync(file));fn(m);fs.writeFileSync(file,JSON.stringify(m));}
test('sources bêta: sections fidèles et disponibles sans validation humaine',()=>{
 const r=inspect(root); assert.deepEqual(r.errors,[]); assert.equal(r.ready,true);
 for(const c of r.chapters){
  const raw=fs.readFileSync(path.join(root,c.source.file),'utf8');
  assert.equal(c.rawMarkdown,raw); assert.equal(c.sections.map(s=>s.markdown).join('\n'),raw);
  assert.equal(c.source.sha256,digest(raw));assert.equal(c.publication,'beta');
  assert.deepEqual(c.fiches,[]);assert.deepEqual(c.flashcards,[]);assert.equal(c.translation,null);
  assert.ok(c.sections.filter(s=>s.kind==='course').every(s=>s.available&&s.status==='beta'));
  const revision=JSON.parse(fs.readFileSync(path.join(root,`contenus-norya/kumar-${c.chapterId.slice(-2)}.revision.json`),'utf8'));
  assert.equal(revision.status,'beta');
  assert.equal(revision.humanMedicalValidation,false);
  assert.ok(revision.sheets.every(item=>item.status==='beta'));
  assert.ok(revision.flashcards.every(item=>item.status==='beta'));
  assert.equal(revision.sheets.length,c.sections.filter(s=>s.kind==='course').length);
  assert.equal(revision.flashcards.length,c.sections.filter(s=>s.kind==='course').length);
 }
 const output=compile(root,true);
 assert.match(output,/importedKumarEnabled: boolean = true/);
 assert.match(output,/"verification": "beta"/);
 assert.match(output,/Versiune beta/);
 assert.doesNotMatch(output,/"verification": "verified"/);
 assert.match(output,/"questions": \[\]/);
});
test('fichier absent, sections manquantes et source modifiée bloquent',t=>{
 const dir=fixture(t);
 fs.appendFileSync(path.join(dir,'contenus-norya/kumar-08.md'),'\nchangement');
 fs.unlinkSync(path.join(dir,'contenus-norya/kumar-09.md'));
 const r=inspect(dir);assert.equal(r.ready,false);
 assert.ok(r.errors.some(e=>e.includes('empreinte')));assert.ok(r.errors.some(e=>e.includes('absent')));
});
test('pages exclues, statut invalide, chevauchement et doublon refusés',t=>{
 const dir=fixture(t);edit(dir,m=>{
 const c=m.chapters[1];c.sections[2].pages=[191,194];c.sections[2].status='complete';
 c.sections[3].startLine=1;c.sections[3].id=c.sections[2].id;
 });
 const r=inspect(dir);assert.ok(r.errors.some(e=>e.includes('hors Tematica')));
 assert.ok(r.errors.some(e=>e.includes('statut invalide')));assert.ok(r.errors.some(e=>e.includes('index')));
});
test('le mode bêta ne transforme pas une déclaration vérifiée',t=>{
 const dir=fixture(t);edit(dir,m=>m.chapters.forEach(c=>{c.status='complete';c.verification={status:'verified',reviewer:'Relecteur',date:'2026-10-12',sha256:c.sha256};c.sections.forEach(s=>{if(s.kind==='course')s.status='verified';});}));
 const r=inspect(dir);assert.equal(r.ready,true);
 assert.throws(()=>compile(dir,true),/activation bêta bloquée/);
});
test('parcours positif synthétique: contenu exact, périmètre attesté et revue liée au hash',t=>{
 const dir=fixture(t);edit(dir,m=>m.chapters.forEach(c=>{
 const raw='# Test technique\n\n| A | B |\n|---|---|\n| Na+ | 142 |\n\nFormule: x² ≥ 2 → y.\n';
 fs.writeFileSync(path.join(dir,c.file),raw);c.sha256=digest(raw);c.status='complete';
 c.verification={status:'verified',reviewer:'Test technique',date:'2026-10-12',sha256:c.sha256};
 c.sections=[{id:'test',title:'# Test technique',startLine:1,endLine:raw.split('\n').length,kind:'course',status:'verified',pages:c.pages.flatMap(([a,b])=>Array.from({length:b-a+1},(_,i)=>a+i))}];
 }));
 const r=inspect(dir);assert.deepEqual(r.errors,[]);assert.deepEqual(r.blockers,[]);assert.equal(r.ready,true);
 assert.ok(r.chapters.every(c=>c.publication==='staging-only'));
 edit(dir,m=>{m.chapters[0].verification.sha256='obsolete';});assert.equal(inspect(dir).ready,false);
});
