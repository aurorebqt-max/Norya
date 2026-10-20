import { composePdfPage, type PdfLayout, type PdfSpan } from '../domain/sourceCourse/pdfExtraction';
import { parseSourcePacket, type SourcePacket } from '../domain/sourceCourse/packet';
import type { PdfImportSession, PdfPreview } from './pdfImport';
let engine: Promise<any> | undefined;
function pdfEngine(): Promise<any> {
  if (!engine) engine = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.type = 'module'; script.src = '/vendor/pdfjs/loader.mjs';
    script.onload = () => { const lib = (window as any).noryaPdfJs; lib ? resolve(lib) : reject(new Error('Moteur PDF indisponible.')); };
    script.onerror = () => { engine = undefined; reject(new Error('Impossible de charger le moteur PDF local.')); };
    document.head.appendChild(script);
  });
  return engine;
}
export async function openPdfImport(file: Blob): Promise<PdfImportSession> {
  if (file.size > 120 * 1024 * 1024) throw new Error('PDF supérieur à 120 Mo : sélectionnez un PDF de chapitre.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lib = await pdfEngine();
  const PDFDocument: typeof import('pdf-lib').PDFDocument = (window as any).noryaPdfDocument;
  const doc = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false, cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/' }).promise;
  async function render(number: number) {
    const page = await doc.getPage(number); const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas'); const scale = Math.min(1.5, 1600 / viewport.width);
    const rendered = page.getViewport({ scale }); canvas.width = Math.ceil(rendered.width); canvas.height = Math.ceil(rendered.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: rendered }).promise;
    const content = await page.getTextContent();
    const spans: PdfSpan[] = [];
    content.items.forEach((item: any, i: number) => {
      if (typeof item.str !== 'string' || !item.str.length || !item.width) return;
      const transform = lib.Util.transform(viewport.transform, item.transform);
      const h = Math.max(1, Math.hypot(transform[2], transform[3]));
      const style = content.styles[item.fontName]; const y = transform[5] - h * (style?.ascent ?? .8);
      const x = transform[4];
      spans.push({ id: `p${number}-span${i}`, text: item.str, bold: /bold|black/i.test(style?.fontFamily ?? item.fontName), italic: /italic|oblique/i.test(style?.fontFamily ?? item.fontName),
        bbox: [Math.max(0, x), Math.max(0, y), Math.min(viewport.width, x + Math.max(1, item.width)), Math.min(viewport.height, y + h)] });
    });
    const crop = (b: number[]) => {
      const image = document.createElement('canvas'); image.width = Math.max(1, Math.ceil((b[2] - b[0]) * scale)); image.height = Math.max(1, Math.ceil((b[3] - b[1]) * scale));
      image.getContext('2d')!.drawImage(canvas, b[0] * scale, b[1] * scale, (b[2] - b[0]) * scale, (b[3] - b[1]) * scale, 0, 0, image.width, image.height);
      const result = image.toDataURL('image/png'); image.width = image.height = 0; return result;
    };
    return { canvas, page, width: viewport.width, height: viewport.height, spans, crop };
  }
  return { pages: doc.numPages,
    async preview(number): Promise<PdfPreview> {
      const r = await render(number);
      const result = { image: r.canvas.toDataURL('image/png'), width: r.width, height: r.height, spans: r.spans };
      r.canvas.width = r.canvas.height = 0; r.page.cleanup(); return result;
    },
    async extract(chapterId, first, last, folio, layouts, progress) {
      if (!/^[a-zA-Z0-9_-]+$/.test(chapterId) || ![first, last, folio].every(Number.isInteger) || first < 1 || last > doc.numPages || last < first || folio < 1 || last - first >= 40) throw new Error('Choisissez de 1 à 40 pages et le premier folio imprimé.');
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const packet: SourcePacket = { schemaVersion: 2, mode: 'structured-source-draft', chapterId, sourceSha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''), complete: false, pages: [] };
      const original = await PDFDocument.load(bytes);
      for (let number = first; number <= last; number++) {
        progress(number); const r = await render(number);
        try {
          const inferred = inferPdfColumns(r.spans, r.width);
          const pageLayout: PdfLayout = layouts[number] ?? { columns: inferred, regions: [] };
          const parts = composePdfPage(r.spans, r.width, r.height, pageLayout, r.crop);
          const single = await PDFDocument.create(); const [copied] = await single.copyPages(original, [number - 1]); single.addPage(copied);
          packet.pages.push({ printedPage: folio + number - first, pdfPage: number, width: r.width, height: r.height,
            image: r.canvas.toDataURL('image/png'), pdf: await single.saveAsBase64(), parts, sourceLineIds: r.spans.map(s => s.id),
            control: { status: 'human-review-pending', counts: { blocks: parts.length } } });
        } finally { r.canvas.width = r.canvas.height = 0; r.page.cleanup(); }
      }
      return parseSourcePacket(JSON.stringify(packet));
    },
    async close() { await doc.destroy(); },
  };
}

/** Conservative geometric suggestion only; all blocks remain unverified. */
function inferPdfColumns(spans: PdfSpan[], width: number): 1 | 2 {
  const left = spans.filter(span => span.bbox[2] < width * .51 && span.bbox[0] > width * .03);
  const right = spans.filter(span => span.bbox[0] > width * .49 && span.bbox[2] < width * .97);
  if (left.length < 12 || right.length < 12) return 1;
  const leftY = left.map(span => span.bbox[1]);
  const rightY = right.map(span => span.bbox[1]);
  const overlap = Math.min(Math.max(...leftY), Math.max(...rightY)) - Math.max(Math.min(...leftY), Math.min(...rightY));
  return overlap > 100 ? 2 : 1;
}
