export type SourceRun = { text: string; bold: boolean; italic: boolean };
export type SourcePart = {
  id: string; kind: 'text' | 'visual'; role: string; bbox: number[];
  suggestedKind?: 'h1' | 'h2' | 'h3' | 'h4' | 'authors' | 'toc' | 'bibliography' | 'table';
  status: 'unverified'; sourceLineIds: string[]; text: string;
  lines: SourceRun[][]; reasons: string[]; image: string;
};
export type SourcePage = {
  printedPage: number; pdfPage: number; width: number; height: number;
  image: string; pdf: string;
  control: { status: 'human-review-pending'; counts: Record<string, number> };
  parts?: SourcePart[]; sourceLineIds?: string[];
};
export type SourcePacket = {
  schemaVersion: 1 | 2; chapterId: string;
  chapter?: { title: string; bookId: string; thematicPages: string; scope: string[] };
  mode: 'original-facsimile-preview' | 'structured-source-draft';
  sourceSha256: string; complete: false; pages: SourcePage[];
};
const png = (value: unknown): value is string => typeof value === 'string' && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
const roles = new Set(['heading','list','paragraph','uncertain-text','page-header','chapter-title','contents','box','section-title','figure','table']);
function validateParts(page: SourcePage) {
  const ids = new Set<string>();
  const assigned: string[] = [];
  if (!Array.isArray(page.parts) || !page.parts.length || !strings(page.sourceLineIds)
    || !page.sourceLineIds.length || new Set(page.sourceLineIds).size !== page.sourceLineIds.length) throw new Error('Couverture source absente.');
  for (const part of page.parts) {
    if (!part || typeof part.id !== 'string' || ids.has(part.id)
      || !['text','visual'].includes(part.kind) || !roles.has(part.role)
      || (part.suggestedKind !== undefined && !['h1', 'h2', 'h3', 'h4', 'authors', 'toc', 'bibliography', 'table'].includes(part.suggestedKind))
      || part.status !== 'unverified' || !strings(part.sourceLineIds) || !strings(part.reasons)
      || !png(part.image) || typeof part.text !== 'string' || !Array.isArray(part.lines)
      || !part.lines.every(line => Array.isArray(line) && line.every(run => run && typeof run.text === 'string'
        && typeof run.bold === 'boolean' && typeof run.italic === 'boolean'))
      // A reconstructed display line may represent several original PDF source-line IDs.
      // Keep full source coverage checks below instead of imposing a 1:1 count.
      || part.sourceLineIds.length === 0
      || part.lines.length === 0
      || part.lines.map(line => line.map(run => run.text).join('')).join('\n') !== part.text
      || !Array.isArray(part.bbox) || part.bbox.length !== 4 || !part.bbox.every(Number.isFinite)
      || part.bbox[0] < 0 || part.bbox[1] < 0 || part.bbox[2] > page.width || part.bbox[3] > page.height
      || part.bbox[2] <= part.bbox[0] || part.bbox[3] <= part.bbox[1]) throw new Error('Partie du cours privée invalide.');
    if (part.kind === 'text' && !['heading','paragraph','list'].includes(part.role)) throw new Error('Structure de texte invalide.');
    ids.add(part.id); assigned.push(...part.sourceLineIds);
  }
  const expected = new Set(page.sourceLineIds);
  if (assigned.length !== expected.size || new Set(assigned).size !== expected.size
    || assigned.some(id => !expected.has(id))) throw new Error('Lignes source manquantes ou répétées.');
}

/** Format validation only: importing never attests visual fidelity or medical accuracy. */
export function parseSourcePacket(raw: string): SourcePacket {
  if (typeof raw !== 'string' || raw.length < 100) {
    throw new Error('Paquet vide ou invalide : le fichier semble corrompu ou incomplet. Taille minimale attendue : 100 octets.');
  }
  const trimmed = raw.trim();
  if (trimmed.charAt(0) !== '{' || trimmed.charAt(trimmed.length - 1) !== '}') {
    const start = trimmed.substring(0, 50).toLowerCase();
    if (start.includes('<') || start.includes('not') || start.includes('error') || start.includes('html')) {
      throw new Error('Paquet invalide : le fichier semble être une page HTML ou une erreur de téléchargement (ex: "Not Found"), pas un JSON. Cela arrive souvent quand on télécharge depuis une URL web au lieu du fichier local. Solution : utilisez le serveur de développement local (python3 scripts/dev-server.py) ou téléchargez depuis le système de fichiers de Codespaces.');
    }
    throw new Error('Paquet invalide : le fichier ne commence pas par un objet JSON valide.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const snippet = raw.substring(0, 100).toLowerCase().replace(/\n/g, ' ');
    if (snippet.includes('<') || snippet.includes('not') || snippet.includes('error') || snippet.includes('html') || snippet.includes('doctype')) {
      throw new Error('Paquet invalide : le fichier semble être une page HTML ou une erreur de téléchargement (ex: "Not Found"), pas un JSON. Cela arrive quand on télécharge depuis une URL web au lieu du fichier local. Solution : utilisez le serveur local (python3 scripts/dev-server.py) ou téléchargez directement le fichier JSON depuis Codespaces.');
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Paquet invalide : ${errorMessage}`);
  }
  const value = parsed as SourcePacket;
  if (!value || ![1,2].includes(value.schemaVersion) || typeof value.chapterId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value.chapterId)
    || value.mode !== (value.schemaVersion === 1 ? 'original-facsimile-preview' : 'structured-source-draft') || value.complete !== false
    || !/^[a-f0-9]{64}$/.test(value.sourceSha256) || !Array.isArray(value.pages) || !value.pages.length || (value.chapterId === 'kum-08' && value.pages.length !== 18)) {
    throw new Error('Paquet privé invalide. Réexportez-le depuis la chaîne de contrôle.');
  }
  for (const [i, page] of value.pages.entries()) {
    if (!page || !Number.isInteger(page.printedPage) || !Number.isInteger(page.pdfPage) || page.printedPage < 1 || page.pdfPage < 1 || (i > 0 && (page.printedPage <= value.pages[i-1].printedPage || page.pdfPage <= value.pages[i-1].pdfPage)) || (value.chapterId === 'kum-08' && (page.printedPage !== 151 + i || page.pdfPage !== 174 + i))
      || !Number.isFinite(page.width) || !Number.isFinite(page.height)
      || page.width < 1 || page.height < 1 || page.width > 3000 || page.height > 3000
      || !png(page.image) || typeof page.pdf !== 'string' || !/^JVBERi0[A-Za-z0-9+/=]+$/.test(page.pdf)
      || page.control?.status !== 'human-review-pending') {
      throw new Error(`Page privée ${page?.printedPage ?? i + 1} invalide ou absente.`);
    }
    if (value.schemaVersion === 2) validateParts(page);
    else if (page.parts !== undefined) throw new Error('Version de cours incompatible.');
  }
  return value;
}
