import type { SourcePart } from './packet';

/** User-requested reading corrections for Kumar 8, 2026-10-15.
 * Never modifies source spans, original PDFs or stored anomaly states.
 * When a rendered correction is reviewed, it can be applied to the source
 * through the chapter's controlled extraction workflow.
 */
export type ContentsEntry = { label: string; page: string };
export type CoursePresentation = {
  imageOnly: boolean;
  hide: boolean;
  text: string;
  heading?: string;
  contents?: [ContentsEntry[], ContentsEntry[]];
};

const leftContents: ContentsEntry[] = [
  { label: 'Abilităţi clinice în infecţii şi sepsis', page: '151' },
  { label: 'Introducere', page: '154' },
  { label: 'Fiziopatologie', page: '154' },
  { label: 'Disfuncţia de organ', page: '154' },
  { label: 'Definiţie (consensul Sepsis-3)', page: '154' },
  { label: 'Şocul septic', page: '154' },
  { label: 'Recunoaşterea sepsisului', page: '154' },
  { label: 'Grupele aflate la risc', page: '154' },
  { label: 'Supravegherea intraspitalicească', page: '155' },
  { label: 'Originea sepsis-ului', page: '155' },
  { label: 'Tablou clinic', page: '156' },
  { label: 'Sepsisul în situaţii speciale', page: '156' },
];
const rightContents: ContentsEntry[] = [
  { label: 'Tratamentul sepsisului', page: '157' },
  { label: "Ghidurile campaniei „Surviving Sepsis”", page: '157' },
  { label: 'Administrarea tratamentul antimicrobian', page: '159' },
  { label: 'Obiective specifice în Marea Britanie', page: '159' },
  { label: 'Aspecte de avut în vedere înaintea începerii antibioterapiei empirice', page: '159' },
  { label: 'Antibioterapia după 72 de ore', page: '159' },
  { label: 'Antibioterapia parenterală în ambulatoriu', page: '159' },
  { label: 'Evaluarea riscului alergic', page: '160' },
  { label: 'Chemoprofilaxia antibiotică', page: '161' },
  { label: 'Terapiile antibiotice', page: '161' },
  { label: 'Antibiotice utilizate frecvent în tratamentul sepsisului', page: '161' },
  { label: 'Tratamentul infecţiilor cauzate de organisme multirezistente', page: '167' },
];

// Keep paragraph breaks while joining only PDF line wraps. Do not modernize
// the language or replace uncertain glyphs with guessed medical terminology.
function paragraphFlow(text: string): string {
  return text.replace(/([\p{L}])[-‐‑\u00ad]\s*\n\s*([\p{L}])/gu, '$1$2')
    .replace(/([^\n])\n(?!\n)/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Keep each bullet and the following prose separate while removing PDF wraps. */
function listFlow(text: string): string {
  return paragraphFlow(text.replace(/•\s*\n\s*/g, '• ')
    .replace(/\n(?=•|în Marea Britanie)/g, '\n\n'));
}

function formatBasicSkills(text: string): string {
  const lines = text.split('\n').map(x => x.trim());
  const title = 'APTITUDINI ȘI NOȚIUNI DE BAZĂ';
  const cleaned: string[] = [];
  let current = '';
  let inList = false;
  for (const line of lines.slice(1)) {
    if (!line || line === "'") continue;
    if (line === '•') {
      if (current.trim()) cleaned.push(current.trim());
      current = '• ';
      inList = true;
      continue;
    }
    // The paragraph beginning with "Mijloacele" follows the last bullet.
    if (inList && line.startsWith('Mijloacele prin care')) {
      if (current.trim()) cleaned.push(current.trim());
      current = '';
      inList = false;
      cleaned.push('');
    }
    // Keep semantic paragraphs from the extracted source.
    if (!inList && (line.startsWith('Sepsisul reprezintă o urgenţă') ||
        line.startsWith('Întreg personalul medical') ||
        line.startsWith('Pacienţii care prezintă complicaţii') ||
        line.startsWith('Abilităţile esenţiale descrise'))) {
      if (current.trim()) cleaned.push(current.trim());
      current = '';
      cleaned.push('');
    }
    if (current.endsWith('­') || current.endsWith('-')) {
      current = current.slice(0, -1) + line;
    } else {
      current += (current && !current.endsWith(' ') ? ' ' : '') + line;
    }
  }
  if (current.trim()) cleaned.push(current.trim());
  return [title, '', ...cleaned].join('\n').replace(/\n{3,}/g, '\n\n');
}

export function sourcePresentation(printedPage: number, part: SourcePart): CoursePresentation {
  const id = part.id;
  // Only content explicitly requested as a retained image is image-only.
  // Tables are complex PDFs;
  // figure 8.1 is a diagram whose internal text is positional information.
  const imageOnly = (printedPage === 152 && id === 'part-3') ||
    (printedPage === 153 && id === 'part-4') ||
    (printedPage === 155 && id === 'part-2') ||
    (printedPage === 156 && id === 'part-2') ||
    (printedPage === 162 && id === 'part-1');
  const hide = printedPage === 151 && id === 'part-9' && /^\s*151\s*$/.test(part.text);
  let text = part.text;
  let contents: CoursePresentation['contents'];
  let heading: string | undefined;
  if (printedPage === 151 && id === 'part-1') {
    heading = 'Sepsisul şi tratamentul infecţiilor bacteriene';
    text = `${heading}\n\nMark Melzer, Andrew Leitch, David Wareham`;
  }
  if (printedPage === 151 && id === 'part-2') {
    contents = [leftContents, rightContents];
    text = contents.flat().map(({ label, page }) => `${label} — ${page}`).join('\n');
  }
  if (printedPage === 151 && id === 'part-3') {
    text = formatBasicSkills(text).replace('{OPAT,', '(OPAT,');
    heading = text.split('\n')[0];
  }
  if (printedPage === 151 && id === 'part-4') text = text.replace(/(?:\s*\.\s*)+$/u, '').trimEnd();
  if (printedPage === 152 && id === 'part-2') text = text.replace(/^\s*■\s*(?=Cadranul)/u, '').replace(/indispoziţie,\s*\n\s*confuzie/u, 'indispoziţie, confuzie');
  // Report 5: corrections checked against PDF pages 177–178. These exact
  // page/block rules change presentation only; source text and spans stay intact.
  const page154Flow = printedPage === 154 && ['part-6', 'part-8', 'part-10', 'part-13', 'part-14', 'part-18', 'part-20'].includes(id);
  const page155Flow = printedPage === 155 && ['part-7', 'part-8', 'part-9', 'part-11', 'part-13', 'part-15', 'part-16'].includes(id);
  if (printedPage === 154) {
    if (id === 'part-8') text = text.replace('prin°', 'prin');
    if (id === 'part-14') text = text.replace(/infecţie['‘’]:/u, 'infecţie".').replace(',,SIRS', '„SIRS');
    if (id === 'part-15') text = listFlow(text.replace('2:22', '≥22').replace(':5100', '≤100'));
    if (id === 'part-20') text = text.replace(/315:801-\s*\n\s*810/u, '315:801-810');
    if (id === 'part-21') { text = text.replace('RECUNOASTEREA', 'RECUNOAŞTEREA').replace('SEP SISULUI', 'SEPSISULUI').trim(); heading = text; }
    if (id === 'part-22') { text = text.replace(/^\s*I\s*\n\s*/u, '').trim(); heading = text; }
  }
  if (printedPage === 155) {
    if (id === 'part-5' || id === 'part-14') text = listFlow(text);
    if (id === 'part-6') text = text.replace('Su[>ravegherea', 'Supravegherea');
    if (id === 'part-7') text = text.replace('N EWS', 'NEWS');
    // The leading line of part-15 ends the previous list; retain the paragraph
    // boundary before the community-acquired infections paragraph (PDF p. 178).
    if (id === 'part-15') text = text.replace(/\n(?=Infecţiile dobândite comunitar)/u, '\n\n');
    if (id === 'part-16') text = text.replace('(.,controlul sursei', '(„controlul sursei');
  }
  const page156Flow = printedPage === 156 && ['part-4', 'part-5', 'part-6', 'part-9'].includes(id);
  const needsReflow = page154Flow || page155Flow || page156Flow || (printedPage === 153 && id === 'part-3') || ([163, 164, 167].includes(printedPage) && id === 'part-2') ||
    (printedPage === 168 && (id === 'part-3' || id === 'part-8'));
  if (needsReflow) text = paragraphFlow(text);
  // The private packet may carry an explicitly reviewed presentation overlay.
  // Raw source lines remain untouched for page-by-page audit. Older packets use
  // the same rules above, so reinstalling the packet is not mandatory.
  const saved = (part as SourcePart & { noryaPresentation?: CoursePresentation }).noryaPresentation;
  const correctedHere = (printedPage === 151 && ['part-1', 'part-2', 'part-3', 'part-9'].includes(id)) ||
    (printedPage === 152 && id === 'part-2') || imageOnly || needsReflow ||
    (printedPage === 154 && ['part-15', 'part-21', 'part-22'].includes(id)) ||
    (printedPage === 155 && ['part-5', 'part-6', 'part-14'].includes(id));
  if (!correctedHere && saved && typeof saved.text === 'string' && typeof saved.imageOnly === 'boolean' &&
      typeof saved.hide === 'boolean') {
    return { ...saved, contents: Array.isArray(saved.contents) ? saved.contents : undefined };
  }
  return { imageOnly, hide, text, contents, heading };
}
