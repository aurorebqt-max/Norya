import type { SourcePart } from './packet';

/** Presentation-only adjustments requested in the 2026-10-15 human anomaly report.
 * Raw imported text and original PDF are never modified; reports remain open for review.
 */
export function sourcePresentation(printedPage: number, part: SourcePart) {
  const id = part.id;
  const imageOnly = (printedPage === 151 && (id === 'part-1' || id === 'part-2')) ||
    (printedPage === 155 && id === 'part-2') ||
    (printedPage === 156 && id === 'part-2') ||
    (printedPage === 162 && id === 'part-1');
  const hide = printedPage === 151 && id === 'part-9' && /^\s*151\s*$/.test(part.text);
  let text = part.text;
  if (printedPage === 151 && id === 'part-4') {
    text = text.replace(/(?:\s*\.\s*)+$/u, '').trimEnd();
  }
  // Reflow OCR's hard line wraps for the *specific* passages the user reported.
  // Preserve source data unchanged so the original can still be compared.
  const needsReflow = (printedPage === 151 && id === 'part-3') ||
    ([163, 164, 167].includes(printedPage) && id === 'part-2') ||
    (printedPage === 168 && (id === 'part-3' || id === 'part-8'));
  if (needsReflow) {
    text = text.replace(/([\p{L}])[-‐‑\u00ad]\s*\n\s*([\p{L}])/gu, '$1$2')
      .replace(/([^\n])\n(?!\n)/g, '$1 ')
      .replace(/[ \t]{2,}/g, ' ');
  }
  return { imageOnly, hide, text };
}
