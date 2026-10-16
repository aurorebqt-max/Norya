const { test } = require('node:test');
const assert = require('node:assert/strict');

const hyphenation = require('../.test-build/domain/sourceCourse/hyphenation');
const { sourcePresentation } = require('../.test-build/domain/sourceCourse/displayCorrections');

const part = text => ({
  id: 'part-1', role: 'paragraph', kind: 'text', text,
  lines: text.split('\n').map(line => [{ text: line, bold: false, italic: false }]),
  bbox: [0, 0, 100, 100], reasons: [], image: 'data:image/png;base64,synthetic', sourceLineIds: ['line-1'],
});

test('repairs explicit PDF hyphenation while preserving Romanian diacritics', () => {
  const result = hyphenation.repairPdfHyphenation('carba-\npeneme şi infecţie-\ncontrolată');
  assert.equal(result.text, 'carbapeneme şi infecţiecontrolată');
  assert.deepEqual(result.decisions.map(decision => decision.status), ['repaired', 'repaired']);
  assert.equal(sourcePresentation(160, part('carba-\npeneme')).text, 'carbapeneme');
});

test('preserves compound words, lists, and distinct paragraphs for manual review', () => {
  const compound = hyphenation.repairPdfHyphenation('anti-\ninflamator');
  assert.equal(compound.text, 'anti-\ninflamator');
  assert.equal(compound.decisions[0].status, 'ambiguous');
  assert.equal(hyphenation.repairPdfHyphenation('• carba-\npeneme').text, '• carba-\npeneme');
  assert.equal(hyphenation.repairPdfHyphenation('carba-\n\npeneme').text, 'carba-\n\npeneme');
});

test('offers, but does not automatically apply, an eligible cross-block hyphenation merge', () => {
  const candidate = hyphenation.boundaryHyphenation('carba-', 'peneme cu spectru larg');
  assert.equal(candidate?.status, 'repaired');
  assert.equal(candidate?.after, 'carbapeneme');
  assert.equal(hyphenation.boundaryHyphenation('anti-', 'inflamator')?.status, 'ambiguous');
});
