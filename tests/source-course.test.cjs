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
