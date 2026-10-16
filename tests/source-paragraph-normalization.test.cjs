const { test } = require('node:test');
const assert = require('node:assert/strict');

const normalization = require('../.test-build/domain/sourceCourse/paragraphNormalization');

test('joins wrapped Romanian prose and a certain hyphenation without changing characters', () => {
  const result = normalization.normalizeParagraphLines(
    'Tratamentul trebuie\ninițiat cât mai rapid\npentru a preveni\ncomplicațiile.\ncarba-\npeneme', 'paragraph',
  );
  assert.equal(result.text, 'Tratamentul trebuie inițiat cât mai rapid pentru a preveni complicațiile.\ncarbapeneme');
  assert.equal(result.hyphenation[0].after, 'carbapeneme');
});

test('keeps true compounds, paragraph boundaries, headings, tables, and separate bullets', () => {
  const compound = normalization.normalizeParagraphLines('anti-\ninflamator', 'paragraph');
  assert.equal(compound.text, 'anti-\ninflamator');
  assert.equal(compound.hyphenation[0].status, 'ambiguous');
  const paragraphs = normalization.normalizeParagraphLines('Prima propoziție.\nAl doilea paragraf începe aici.', 'paragraph');
  assert.equal(paragraphs.text, 'Prima propoziție.\nAl doilea paragraf începe aici.');
  assert.equal(paragraphs.decisions[0].status, 'ambiguous');
  assert.equal(normalization.normalizeParagraphLines('Titlu\nsecundar', 'heading').text, 'Titlu\nsecundar');
  assert.equal(normalization.normalizeParagraphLines('A\tB\nC\tD', 'table').text, 'A\tB\nC\tD');
  assert.equal(normalization.normalizeParagraphLines('• Primul element\n• Al doilea element', 'paragraph').text, '• Primul element\n• Al doilea element');
});

test('keeps a bullet intact while joining its wrapped continuation and detects cross-block proposals', () => {
  assert.equal(normalization.normalizeParagraphLines('• Tratamentul trebuie\ninițiat rapid.', 'paragraph').text,
    '• Tratamentul trebuie inițiat rapid.');
  assert.equal(normalization.boundaryParagraphNormalization('Tratamentul trebuie', 'continuat rapid.', 'paragraph', 'paragraph')?.status, 'repaired');
  assert.equal(normalization.boundaryParagraphNormalization('Prima propoziție.', 'Al doilea paragraf.', 'paragraph', 'paragraph')?.status, 'ambiguous');
  assert.equal(normalization.boundaryParagraphNormalization('Titlu', 'Text', 'heading', 'paragraph'), null);
});
