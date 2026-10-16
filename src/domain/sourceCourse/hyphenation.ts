/**
 * Répare uniquement les césures PDF dont la structure est suffisamment explicite.
 * Les cas douteux restent inchangés et sont exposés à la vérification humaine.
 */
export type HyphenationDecision = {
  before: string;
  after: string;
  line: number;
  status: 'repaired' | 'ambiguous';
  reason: string;
};

export type HyphenationResult = {
  text: string;
  decisions: HyphenationDecision[];
};

const HYPHENS = '[-‐‑\u00ad]';
const compoundPrefixes = new Set([
  'anti', 'ante', 'auto', 'bi', 'co', 'contra', 'de', 'ex', 'extra', 'intra',
  'micro', 'non', 'post', 'pre', 'pro', 'pseudo', 're', 'semi', 'sub', 'super',
]);

type Split = { before: string; after: string; prefix: string; suffix: string };

function splitAtHyphenation(left: string, right: string): Split | null {
  const leftMatch = left.match(new RegExp(`^(.*?)([\\p{L}]{3,})${HYPHENS}\\s*$`, 'u'));
  const rightMatch = right.match(/^\s*([\p{Ll}][\p{L}\p{M}]*)/u);
  if (!leftMatch || !rightMatch) return null;
  if (/^\s*(?:[•▪◦*-]|\d+[.)])\s*/u.test(left) || /^\s*(?:[•▪◦*-]|\d+[.)])\s*/u.test(right)) return null;
  return {
    before: `${leftMatch[2]}-${rightMatch[1]}`,
    after: `${leftMatch[2]}${rightMatch[1]}`,
    prefix: leftMatch[2].toLocaleLowerCase(),
    suffix: rightMatch[1],
  };
}

function decision(left: string, right: string, line: number): HyphenationDecision | null {
  const split = splitAtHyphenation(left, right);
  if (!split) return null;
  if (compoundPrefixes.has(split.prefix)) {
    return {
      before: split.before, after: split.after, line, status: 'ambiguous',
      reason: 'Le premier élément peut être un préfixe d’un mot composé : la césure est conservée.',
    };
  }
  return {
    before: split.before, after: split.after, line, status: 'repaired',
    reason: 'Mot alphabétique interrompu à la fin d’une ligne PDF, repris par une minuscule sur la ligne suivante.',
  };
}

/** Reconstitue les césures sûres à l'intérieur d'un même bloc, sans supprimer de paragraphe. */
export function repairPdfHyphenation(text: string): HyphenationResult {
  const lines = text.split('\n');
  const decisions: HyphenationDecision[] = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const found = decision(lines[index], lines[index + 1], index);
    if (!found) continue;
    decisions.push(found);
    if (found.status !== 'repaired') continue;
    lines[index] = lines[index].replace(new RegExp(`([\\p{L}]{3,})${HYPHENS}\\s*$`, 'u'), '$1');
    lines[index + 1] = lines[index + 1].replace(/^\s*/u, '');
    lines[index] += lines[index + 1];
    lines.splice(index + 1, 1);
    index--;
  }
  return { text: lines.join('\n'), decisions };
}

/** Détecte une jonction sûre entre deux blocs logiques ; l'utilisateur confirme toujours la fusion. */
export function boundaryHyphenation(first: string, second: string): HyphenationDecision | null {
  const firstLines = first.split('\n');
  const secondLines = second.split('\n');
  const leftIndex = firstLines.length - 1;
  const found = decision(firstLines[leftIndex] ?? '', secondLines[0] ?? '', leftIndex);
  return found;
}
