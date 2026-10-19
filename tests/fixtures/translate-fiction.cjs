// Entirely fictional. Never loads references-privees or browser storage.
exports.fixture = () => {
  const part = (id, text, role = 'paragraph') => ({ id, kind: 'text', role, bbox: [0, 0, 100, 40],
    status: 'unverified', sourceLineIds: [id], text, lines: [[{ text, bold: false, italic: false }]], reasons: [], image: 'fiction-image' });
  const packet = { schemaVersion: 2, chapterId: 'fiction-only', sourceSha256: 'a'.repeat(64), mode: 'structured-source-draft', complete: false,
    pages: [1, 2].map(p => ({ printedPage: p, pdfPage: p + 10, width: 600, height: 800, image: 'fiction-page', pdf: 'fiction-pdf',
      control: { status: 'human-review-pending', counts: {} }, parts: [part('same', 'Pacient fictiv fără date reale.'),
        ...(p === 1 ? [part('heading', 'Exemplu fictiv', 'heading'), part('table', 'Simptom fictiv', 'table'), part('figure', '', 'figure')] : [])] })) };
  packet.pages[0].parts[1].lines[0][0].bold = true;
  const validation = { chapterId: packet.chapterId, complete: false, pages: packet.pages.map(p => ({ printedPage: p.printedPage,
    blocks: p.parts.map(b => ({ id: b.id, status: 'verified', ...(b.id === 'table' ? { kind: 'table', table: {
      validated: true, title: 'Tabel fictiv', notes: 'Nu este o recomandare.', rowRoles: ['header', 'normal'],
      rows: [[{ text: 'Semn', colSpan: 2, header: true }, { text: '', covered: true }], [{ text: 'Exemplu' }, { text: 'Descriere' }]],
    } } : b.id === 'heading' ? { kind: 'h2' } : {}) })) })) };
  return { packet, validation };
};
