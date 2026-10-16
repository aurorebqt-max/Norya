import type { SourcePart } from './packet';
import type { BlockTable, TableCell } from './classification';

export type TableDetection = {
  detectedAt: string;
  method: 'repeated-delimiters-v1';
  sourceBBox: number[];
  confidence: 'limited';
  warnings: string[];
  sourceText: string;
};

export type TableDetectionResult =
  | { table: BlockTable; detection: TableDetection }
  | { table: null; detection: TableDetection };

const cell = (text = ''): TableCell => ({ text });
const partsOf = (line: string) => line.split(/\t+| {2,}/).map(part => part.trim()).filter(Boolean);

/** Builds only a proposal supported by repeated column separators in the extracted source lines.
 * Source packets currently preserve a block bounding box but not coordinates for individual runs,
 * so a table without repeated separators deliberately remains for human reconstruction. */
export function detectTableFromPart(part: SourcePart, detectedAt = new Date().toISOString()): TableDetectionResult {
  const lines = part.lines.map(runs => runs.map(run => run.text).join(''));
  const split = lines.map(partsOf);
  const candidates = split.filter(parts => parts.length >= 2);
  const commonWidth = [...new Set(candidates.map(parts => parts.length))]
    .map(width => ({ width, count: candidates.filter(parts => parts.length === width).length }))
    .sort((a, b) => b.count - a.count || b.width - a.width)[0];
  const base = {
    detectedAt, method: 'repeated-delimiters-v1' as const, sourceBBox: [...part.bbox],
    confidence: 'limited' as const, sourceText: part.text,
  };
  if (!commonWidth || commonWidth.count < 2) {
    return {
      table: null,
      detection: { ...base, warnings: [
        'Aucune structure de colonnes répétée n’est présente dans les lignes extraites.',
        'Le paquet conserve la zone du bloc, mais pas les coordonnées des fragments ni les bordures du PDF ; aucune grille n’est inventée.',
      ] },
    };
  }
  const width = commonWidth.width;
  const warnings = [
    'Proposition limitée aux séparateurs répétés des lignes extraites ; vérifiez chaque cellule contre le PDF original.',
    'Les coordonnées des fragments et les bordures du PDF ne sont pas disponibles dans ce paquet ; les fusions détectées restent à confirmer humainement.',
  ];
  const rows: TableCell[][] = [];
  const rowRoles: NonNullable<BlockTable['rowRoles']> = [];
  lines.forEach((line, index) => {
    const values = split[index];
    if (!line.trim()) return;
    if (values.length === 1) {
      rows.push([cell(values[0]), ...Array.from({ length: width - 1 }, () => ({ text: '', covered: true }))]);
      rows[rows.length - 1][0].colSpan = width;
      rowRoles.push('category');
      warnings.push(`Ligne ${index + 1} sans séparateur conservée comme ligne de catégorie à vérifier.`);
      return;
    }
    if (values.length !== width) warnings.push(`Ligne ${index + 1} comporte ${values.length} segments au lieu de ${width} ; cellules manquantes laissées vides.`);
    rows.push(Array.from({ length: width }, (_, column) => cell(values[column] ?? '')));
    rowRoles.push(index === 0 && part.lines[index].every(run => run.bold) ? 'header' : 'normal');
  });
  return {
    table: { rows, rowRoles, validated: false, detection: { ...base, warnings } },
    detection: { ...base, warnings },
  };
}
