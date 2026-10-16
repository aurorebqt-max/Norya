import { repairPdfHyphenation, type HyphenationDecision } from './hyphenation';

export type ParagraphDecision = {
  line: number;
  status: 'repaired' | 'ambiguous';
  reason: string;
};

export type ParagraphNormalization = {
  text: string;
  decisions: ParagraphDecision[];
  hyphenation: HyphenationDecision[];
};

const TEXT_ROLES = new Set(['paragraph', 'box', 'uncertain-text']);
const bullet = /^\s*(?:[•▪◦]|[-*]|\d+[.)])\s+/u;
const terminal = /[.!?…:;]\s*$/u;
const endsHyphen = /[-‐‑\u00ad]\s*$/u;

const isBullet = (line: string) => bullet.test(line);

/**
 * Conserve les limites sémantiques : un saut est joint seulement lorsque la phrase
 * continue manifestement. Les lignes qui pourraient aussi séparer deux paragraphes
 * restent intactes et sont signalées à la revue humaine.
 */
export function normalizeParagraphLines(text: string, role: string): ParagraphNormalization {
  const hyphenated = repairPdfHyphenation(text);
  if (!TEXT_ROLES.has(role)) return { text: hyphenated.text, decisions: [], hyphenation: hyphenated.decisions };
  const lines = hyphenated.text.split('\n');
  const decisions: ParagraphDecision[] = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const left = lines[index];
    const right = lines[index + 1];
    if (!left.trim() || !right.trim()) continue;
    // Une césure ambiguë a été conservée par repairPdfHyphenation : ne la remplacez pas par un espace.
    if (endsHyphen.test(left)) continue;
    if (isBullet(left) || isBullet(right)) {
      if (isBullet(left) && !isBullet(right) && !terminal.test(left)) {
        lines[index] = `${left.trimEnd()} ${right.trimStart()}`;
        lines.splice(index + 1, 1);
        decisions.push({ line: index, status: 'repaired', reason: 'Continuation d’un même élément de liste.' });
        index--;
      }
      continue;
    }
    if (!terminal.test(left)) {
      lines[index] = `${left.trimEnd()} ${right.trimStart()}`;
      lines.splice(index + 1, 1);
      decisions.push({ line: index, status: 'repaired', reason: 'Continuation grammaticale d’un même paragraphe.' });
      index--;
      continue;
    }
    decisions.push({
      line: index, status: 'ambiguous',
      reason: 'La fin de ligne peut être une nouvelle phrase ou un nouveau paragraphe : séparation conservée.',
    });
  }
  return { text: lines.join('\n'), decisions, hyphenation: hyphenated.decisions };
}

/** Jonction candidate entre deux blocs dans l’ordre du PDF ; elle ne crée jamais une fusion seule. */
export function boundaryParagraphNormalization(first: string, second: string, firstRole: string, secondRole: string): ParagraphDecision | null {
  if (!TEXT_ROLES.has(firstRole) || !TEXT_ROLES.has(secondRole)) return null;
  const left = first.split('\n').at(-1) ?? '';
  const right = second.split('\n')[0] ?? '';
  if (!left.trim() || !right.trim() || isBullet(left) || isBullet(right)) return null;
  if (!terminal.test(left)) {
    return { line: first.split('\n').length - 1, status: 'repaired', reason: 'Deux blocs consécutifs semblent continuer le même paragraphe.' };
  }
  return {
    line: first.split('\n').length - 1, status: 'ambiguous',
    reason: 'Les blocs peuvent appartenir à des paragraphes distincts : jonction conservée à confirmer manuellement.',
  };
}
