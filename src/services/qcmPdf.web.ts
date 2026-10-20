import { openPdfImport } from './pdfImport';
import { qcmExportTemplate, type NoryaQcm } from './cloud/qcmBank';

/** Brouillon uniquement : aucune réponse manuscrite n'est interprétée. */
export async function extractQcmPdf(file: Blob, progress: (message: string) => void) {
  const session = await openPdfImport(file);
  try {
    if (session.pages > 100) throw new Error('PDF trop long (100 pages maximum).');
    const rawPages: {page:number;text:string}[] = [];
    const all: NoryaQcm[] = [];
    // Une question peut continuer dans la colonne suivante ou sur la page suivante.
    const sections: {number:number;page:number;body:string}[] = [];
    let current: {number:number;page:number;body:string}|null = null;
    const flush = () => { if (current) sections.push(current); current = null; };
    for (let page = 1; page <= session.pages; page++) {
      progress(`Lecture PDF : page ${page}/${session.pages}`);
      const preview = await session.preview(page);
      const spans = preview.spans.filter(s => s.text.trim() && s.bbox.length >= 4);
      // Les annales sont à deux colonnes : gauche EN ENTIER, puis droite EN ENTIER.
      // Le centre de la page sert de frontière, et non la position des fragments dans le flux PDF.
      const mid = preview.width / 2;
      const columns = [spans.filter(s => (s.bbox[0] + s.bbox[2])/2 < mid), spans.filter(s => (s.bbox[0] + s.bbox[2])/2 >= mid)];
      const pageParts: string[] = [];
      for (let col = 0; col < 2; col++) {
        const ordered = [...columns[col]].sort((a,b) => Math.abs(a.bbox[1]-b.bbox[1]) < 3 ? a.bbox[0]-b.bbox[0] : a.bbox[1]-b.bbox[1]);
        const lines: {y:number;text:string}[] = [];
        for (const span of ordered) {
          const y = span.bbox[1], last = lines[lines.length-1];
          if (last && Math.abs(last.y-y)<3) last.text += ' ' + span.text.trim();
          else lines.push({y,text:span.text.trim()});
        }
        const text = lines.map(l=>l.text).join('\n');
        pageParts.push(text);
        for (const line of lines) {
          // Ne commencer une question que sur une numérotation plausible en début de ligne.
          const match = line.text.match(/^\s*(?:Q(?:CM)?\s*)?(\d{1,3})\s*[.)-]\s+(.+)$/i);
          const number = match ? Number(match[1]) : 0;
          if (match && number>=1 && number<=200) {
            flush(); current = {number,page,body:match[2]};
          } else if (current) current.body += '\n' + line.text;
        }
      }
      rawPages.push({page,text:pageParts.map((t,i)=>`--- COLONNE ${i===0?'GAUCHE':'DROITE'} ---\n${t}`).join('\n')});
    }
    flush();
    const seen = new Set<number>();
    for (const section of sections) {
      if (seen.has(section.number)) continue;
      const body = section.body;
      const matches = [...body.matchAll(/(?:^|\n)\s*([A-E])\s*[.)-]\s*(.*)/g)];
      if (matches.length < 2) continue;
      const stem = body.slice(0,matches[0].index).trim();
      if (!stem) continue;
      const choices = matches.map((m,i)=>({id:m[1],text:body.slice((m.index||0)+m[0].length-(m[2]||'').length,i+1<matches.length?matches[i+1].index:undefined).trim(),correct:false}));
      if (choices.some(c=>!c.text) || new Set(choices.map(c=>c.id)).size!==choices.length) continue;
      seen.add(section.number);
      all.push({id:`rez-2023-q${section.number}`,chapterIds:[],stem,choices,explanation:`Transcription automatique à vérifier (page PDF ${section.page}). Aucune correction officielle fournie.`,verified:false});
    }
    all.sort((a,b)=>Number(a.id.split('q').pop())-Number(b.id.split('q').pop()));
    progress(`${all.length} questions candidates extraites. Les questions manquantes et les propositions doivent être vérifiées sur le PDF original.`);
    return {...qcmExportTemplate(),source:'PDF local — deux colonnes gauche puis droite — brouillon NON vérifié',rawPages,questions:all};
  } finally { await session.close(); }
}
