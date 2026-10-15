const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSourcePacket } = require('../.test-build/domain/sourceCourse/packet');
const {
  createAnomalyReport,
  generateAnomalyId,
  exportAnomaliesToJSON,
  exportAnomaliesToMarkdown,
  generateFullAnomalyReport
} = require('../.test-build/domain/sourceCourse/anomalies');
function packet() {
  return { schemaVersion: 1, chapterId: 'kum-08', mode: 'original-facsimile-preview', complete: false,
    sourceSha256: 'a'.repeat(64), pages: Array.from({length:18},(_,i)=>({
      printedPage:151+i,pdfPage:174+i,width:600,height:800,
      image:'data:image/png;base64,iVBORw0KGgoAAA=',pdf:'JVBERi0xLjQ=',
      control:{status:'human-review-pending',counts:{}} })) };
}
test('private packet only opens as an unverified original preview', () => {
  assert.equal(parseSourcePacket(JSON.stringify(packet())).complete, false);
  const value=packet(); value.complete=true;
  assert.throws(()=>parseSourcePacket(JSON.stringify(value)));
});
test('missing pages, another chapter and remote assets are rejected', () => {
  for(const change of [v=>v.pages.pop(),v=>v.chapterId='kum-09',v=>v.pages[0].image='https://example.com/page.png',v=>v.pages[0].pdfPage=1]) {
    const value=packet(); change(value);
    assert.throws(()=>parseSourcePacket(JSON.stringify(value)));
  }
});
function structured(){
  const value=packet();value.schemaVersion=2;value.mode='structured-source-draft';
  for(const page of value.pages){
    page.sourceLineIds=['block-1:line-0'];
    page.parts=[{id:'part-1',kind:'text',role:'paragraph',bbox:[10,10,100,30],status:'unverified',
      sourceLineIds:['block-1:line-0'],text:'Exact synthetic 1.5 mg',
      lines:[[{text:'Exact synthetic 1.5 mg',bold:false,italic:false}]],reasons:[],image:page.image}];
  }
  return value;
}
test('structured private draft preserves exact text and supports v1',()=>{
  assert.equal(parseSourcePacket(JSON.stringify(structured())).pages[0].parts[0].text,'Exact synthetic 1.5 mg');
  assert.equal(parseSourcePacket(JSON.stringify(packet())).schemaVersion,1);
});
test('structured import rejects missing/duplicate lines, changed runs and verification claims',()=>{
  for(const change of [
    v=>v.pages[0].parts[0].sourceLineIds=[],
    v=>v.pages[0].parts.push({...v.pages[0].parts[0],id:'part-2'}),
    v=>v.pages[0].parts[0].text='Altered 15 mg',
    v=>v.pages[0].parts[0].status='verified',
    v=>v.pages[0].parts[0].image='https://example.com/scan.png',
    v=>v.pages[0].parts[0].bbox=[-1,0,100,30],
  ]){const value=structured();change(value);assert.throws(()=>parseSourcePacket(JSON.stringify(value)));}
});

test('anomaly report creation and export', () => {
  const anomaly = createAnomalyReport(
    'kum-08',
    'Kumar',
    152,
    175,
    'part-1',
    'table',
    'Dose de 1.5 mg/jour',
    'Valeur médicale erronée : 1.5 au lieu de 1.25'
  );
  
  assert.equal(anomaly.chapterId, 'kum-08');
  assert.equal(anomaly.manual, 'Kumar');
  assert.equal(anomaly.printedPage, 152);
  assert.equal(anomaly.pdfPage, 175);
  assert.equal(anomaly.blockId, 'part-1');
  assert.equal(anomaly.blockRole, 'table');
  assert.equal(anomaly.description, 'Valeur médicale erronée : 1.5 au lieu de 1.25');
  assert.equal(anomaly.status, 'open');
  assert.ok(anomaly.id.startsWith('anomaly-'));
  assert.ok(anomaly.createdAt);
  assert.ok(anomaly.updatedAt);
  
  const anomalies = [anomaly];
  const jsonExport = exportAnomaliesToJSON(anomalies);
  const parsed = JSON.parse(jsonExport);
  
  assert.equal(parsed.chapterId, 'kum-08');
  assert.equal(parsed.manual, 'Kumar');
  assert.equal(parsed.anomalies.length, 1);
  assert.equal(parsed.anomalies[0].description, 'Valeur médicale erronée : 1.5 au lieu de 1.25');
  assert.equal(parsed.total, 1);
  assert.equal(parsed.open, 1);
  
  const markdownExport = exportAnomaliesToMarkdown(anomalies);
  assert.ok(markdownExport.includes('# Rapport d\'anomalies'));
  assert.ok(markdownExport.includes('Kumar'));
  assert.ok(markdownExport.includes('Valeur médicale erronée'));
  assert.ok(markdownExport.includes('🔴'));
  
  const fullReport = generateFullAnomalyReport(anomalies);
  assert.ok(fullReport.json);
  assert.ok(fullReport.markdown);
  assert.equal(fullReport.chapterId, 'kum-08');
  assert.equal(fullReport.manual, 'Kumar');
});

const { sourcePresentation } = require('../.test-build/domain/sourceCourse/displayCorrections');
test('Kumar anomaly corrections supersede stale presentation without changing source text', () => {
  const part = { id: 'part-1', text: 'Sepsisul şi tratamentul\ninfectiilor bacteriene\n,\nMark Melzer, Andrew Leitch, David Wareham',
    noryaPresentation: { imageOnly: true, hide: false, text: 'Old title' } };
  const before = structuredClone(part);
  const shown = sourcePresentation(151, part);
  assert.equal(shown.imageOnly, false);
  assert.equal(shown.heading, 'Sepsisul şi tratamentul infecţiilor bacteriene');
  assert.ok(shown.text.endsWith('Mark Melzer, Andrew Leitch, David Wareham'));
  assert.deepEqual(part, before);
  assert.equal(sourcePresentation(150, part).text, 'Old title');
});
test('Kumar layout fixes preserve bullets, paragraph boundaries and medical values', () => {
  const box = sourcePresentation(152, { id: 'part-2', text: '■Cadranul 8.1\nSimptome\n• Durata\n• indispoziţie,\nconfuzie, vărsături' });
  assert.equal(box.text, 'Cadranul 8.1\nSimptome\n• Durata\n• indispoziţie, confuzie, vărsături');
  assert.equal(sourcePresentation(153, { id: 'part-3', text: 'Această listă nu este \nexhaustivă.\n\nAlt paragraf 1,5 mg.' }).text,
    'Această listă nu este exhaustivă.\n\nAlt paragraf 1,5 mg.');
  const skills = sourcePresentation(151, { id: 'part-3', text: "APTITUDINI SI NOTIUNI DE BAZĂ\n'\n'\nText {OPAT, Outpatient Antibiotic\nTreatment).\nAbilităţile esenţiale descrise în acest capitol includ:\n•\nUnu\n•\nDoi\n•\nTrei\nMijloacele prin care studenţii învaţă." });
  assert.equal(skills.heading, 'APTITUDINI ȘI NOȚIUNI DE BAZĂ');
  assert.ok(skills.text.includes('(OPAT, Outpatient Antibiotic Treatment).'));
  assert.ok(skills.text.includes('• Unu\n• Doi\n• Trei\n\nMijloacele'));
});
test('only the requested Kumar tables and existing figure remain images; folio stays hidden', () => {
  for (const [page, id] of [[155, 'part-2'], [156, 'part-2'], [162, 'part-1'], [152, 'part-3']]) {
    assert.equal(sourcePresentation(page, { id, text: 'Original' }).imageOnly, true);
  }
  assert.equal(sourcePresentation(151, { id: 'part-9', text: '151 ' }).hide, true);
  assert.equal(sourcePresentation(153, { id: 'part-9', text: '151 ' }).hide, false);
  const contents = sourcePresentation(151, { id: 'part-2', text: '' }).contents;
  assert.deepEqual(contents.map(c => c.length), [12, 12]);
  assert.deepEqual(contents[1][2], { label: 'Administrarea tratamentul antimicrobian', page: '159' });
});

test('report 5 retains the complete page 153 diagram and repairs only requested page/block text', () => {
  assert.equal(sourcePresentation(153, { id: 'part-4', text: 'Diagram labels' }).imageOnly, true);
  const sofa = sourcePresentation(154, { id: 'part-15', text: 'Criterii:\n•\nGlasgow <15\n•\nfrecvenţa respiratorie 2:22 respiraţii/minut\n•\npresiune arterială sistolică :5100 mmHg.\nîn Marea Britanie, NEWS 2.' });
  assert.equal((sofa.text.match(/^• /gm) ?? []).length, 3);
  assert.ok(sofa.text.includes('≥22 respiraţii/minut'));
  assert.ok(sofa.text.includes('≤100 mmHg.\n\nîn Marea Britanie'));
  assert.equal(sourcePresentation(154, { id: 'part-8', text: 'prin° imunotromboză\ndifuză' }).text, 'prin imunotromboză difuză');
  assert.equal(sourcePresentation(154, { id: 'part-14', text: 'infecţie\': ,,SIRS"' }).text, 'infecţie". „SIRS"');
  assert.equal(sourcePresentation(154, { id: 'part-20', text: 'IAMA 2016; 315:801-\n810.' }).text, 'IAMA 2016; 315:801-810.');
  assert.equal(sourcePresentation(154, { id: 'part-21', text: 'RECUNOASTEREA SEP SISULUI ' }).heading, 'RECUNOAŞTEREA SEPSISULUI');
  assert.equal(sourcePresentation(154, { id: 'part-22', text: 'I \nGrupele aflate la risc ' }).text, 'Grupele aflate la risc');
  assert.equal(sourcePresentation(155, { id: 'part-6', text: 'Su[>ravegherea intraspitalicească' }).text, 'Supravegherea intraspitalicească');
  assert.equal(sourcePresentation(155, { id: 'part-7', text: 'N EWS în Bri\u00ad\ntanie, pre\u00ad\ncoce.' }).text, 'NEWS în Britanie, precoce.');
  assert.equal(sourcePresentation(155, { id: 'part-8', text: 'Sit\u00ad\nuation' }).text, 'Situation');
  assert.equal(sourcePresentation(155, { id: 'part-9', text: 'evalua\u00ad\nrea proba\u00ad\nbilitate suspi\u00ad\nciuni' }).text, 'evaluarea probabilitate suspiciuni');
  assert.equal(sourcePresentation(155, { id: 'part-11', text: 'natu\u00ad\nral' }).text, 'natural');
  const bullets = sourcePresentation(155, { id: 'part-5', text: '•\nvârstnicii (>65 de ani)\n•\npacienţii cu afecţiuni\nmedicale' });
  assert.equal(bullets.text, '• vârstnicii (>65 de ani)\n\n• pacienţii cu afecţiuni medicale');
  assert.equal(sourcePresentation(157, { id: 'part-7', text: 'N EWS\nOriginal' }).text, 'N EWS\nOriginal');
});


test('report 6 reflows only the requested blocks and preserves paragraph/list boundaries', () => {
  const cases = [
    [154, 'part-21', 'RECUNOASTEREA SEP SISULUI ', 'RECUNOAŞTEREA SEPSISULUI'],
    [155, 'part-13', 'comu\u00ad\nnitar 48 de ore inter\u00ad\nnarea', 'comunitar 48 de ore internarea'],
    [155, 'part-14', '•\npacienţi externaţi în ultimele 30 de zile\n•\npacienţi în\ncomunităţi închise', '• pacienţi externaţi în ultimele 30 de zile\n\n• pacienţi în comunităţi închise'],
    [155, 'part-15', 'ţii care necesită hemodializă).\nInfecţiile dobândite comunitar sunt sensi\u00ad\nbile. Streptococ\u00ad\ncus pneumoniae.', 'ţii care necesită hemodializă).\n\nInfecţiile dobândite comunitar sunt sensibile. Streptococcus pneumoniae.'],
    [155, 'part-16', 'noso\u00ad\ncomiale sep\u00ad\nsisul (.,controlul sursei").', 'nosocomiale sepsisul („controlul sursei").'],
    [156, 'part-4', 'dis\u00ad\nfuncţiei dete\u00ad\nriorare', 'disfuncţiei deteriorare'],
    [156, 'part-5', 'hipoten\u00ad\nsiune som\u00ad\nnolenţă.', 'hipotensiune somnolenţă.'],
    [156, 'part-6', 'disfunc\u00ad\nţiei creş\u00ad\nterea electrocar\u00ad\ndiogramă (ECG).', 'disfuncţiei creşterea electrocardiogramă (ECG).'],
    [156, 'part-9', 'zonele vizi\u00ad\ntate şi\nmomentul', 'zonele vizitate şi momentul'],
  ];
  for (const [page, id, text, expected] of cases) {
    const part = { id, text, noryaPresentation: { text: 'Stale display', imageOnly: false, hide: false } };
    const before = structuredClone(part);
    assert.equal(sourcePresentation(page, part).text, expected, `${page}/${id}`);
    assert.deepEqual(part, before);
    assert.equal(sourcePresentation(160, part).text, 'Stale display');
  }
});
