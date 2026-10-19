import type { SourcePart } from './packet';
export type PdfSpan = { id: string; text: string; bbox: number[]; bold: boolean; italic: boolean };
export type PdfRegion = { bbox: number[]; role: 'figure' | 'table' | 'page-header' };
export type PdfLayout = { columns: 1 | 2; regions: PdfRegion[] };
const overlaps = (a: number[], b: number[]) => Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
const bounds = (spans: PdfSpan[]) => [Math.min(...spans.map(s => s.bbox[0])), Math.min(...spans.map(s => s.bbox[1])), Math.max(...spans.map(s => s.bbox[2])), Math.max(...spans.map(s => s.bbox[3]))];

/** Geometric draft only. Every exact source span belongs to one block; no rewriting. */
export function composePdfPage(spans: PdfSpan[], width: number, height: number, layout: PdfLayout,
  crop: (box: number[]) => string): SourcePart[] {
  for (const [i, region] of layout.regions.entries()) {
    const b = region.bbox;
    if (b.length !== 4 || !b.every(Number.isFinite) || b[0] < 0 || b[1] < 0 || b[2] > width || b[3] > height || b[2] <= b[0] || b[3] <= b[1]) throw new Error('Zone PDF invalide.');
    if (layout.regions.slice(0, i).some(other => overlaps(b, other.bbox))) throw new Error('Deux zones se chevauchent. Rectifiez leurs limites.');
  }
  const assigned = new Set<string>();
  const groups: Array<{ spans: PdfSpan[]; bbox: number[]; role: SourcePart['role'] }> = layout.regions.map(region => {
    const inside = spans.filter(s => overlaps(s.bbox, region.bbox));
    for (const s of inside) {
      if (assigned.has(s.id)) throw new Error('Un fragment traverse deux zones. Ajustez les limites.');
      assigned.add(s.id);
    }
    return { spans: inside, ...region };
  });
  const remaining = spans.filter(s => !assigned.has(s.id));
  if (!remaining.length && !layout.regions.length) throw new Error('Page sans texte extractible : OCR non disponible. Délimitez les véritables figures ; une page scannée ne peut pas remplacer le cours numérique.');
  const lane = (box: number[]) => layout.columns === 1 ? 0 : box[0] >= width / 2 ? 1 : 0;
  const sorted = remaining.slice().sort((a, b) => lane(a.bbox) - lane(b.bbox) || a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  let current: typeof groups[number] | undefined;
  for (const span of sorted) {
    const h = span.bbox[3] - span.bbox[1];
    const previous = current?.spans[current.spans.length - 1];
    const join = current && previous && lane(current.bbox) === lane(span.bbox) &&
      span.bbox[1] - current.bbox[3] <= Math.max(4, h * .7) &&
      Math.abs(h - (previous.bbox[3] - previous.bbox[1])) < h * .25 && span.bold === previous.bold &&
      !layout.regions.some(r => r.bbox[1] >= current!.bbox[3] && r.bbox[3] <= span.bbox[1] && lane(r.bbox) === lane(span.bbox));
    if (join) { current!.spans.push(span); current!.bbox = bounds(current!.spans); }
    else { current = { spans: [span], bbox: [...span.bbox], role: span.bold ? 'heading' : 'paragraph' }; groups.push(current); }
  }
  groups.sort((a, b) => lane(a.bbox) - lane(b.bbox) || a.bbox[1] - b.bbox[1]);
  return groups.map((group, i) => {
    const lines = group.spans.map(s => [{ text: s.text, bold: s.bold, italic: s.italic }]);
    const visual = ['figure', 'table', 'page-header'].includes(group.role);
    return { id: `pdf-block-${i + 1}`, kind: visual ? 'visual' : 'text', role: group.role,
      status: 'unverified', bbox: group.bbox, lines, text: lines.map(l => l.map(r => r.text).join('')).join('\n'),
      sourceLineIds: group.spans.map(s => s.id), reasons: ['Extraction géométrique : ordre, paragraphes et zones à vérifier humainement.'], image: crop(group.bbox),
      ...(group.role === 'table' ? { suggestedKind: 'table' as const } : {}) };
  });
}
