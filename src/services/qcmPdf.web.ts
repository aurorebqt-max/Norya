import { openPdfImport } from './pdfImport';
import { qcmExportTemplate, type NoryaQcm } from './cloud/qcmBank';

/** Extraction locale, avec suggestions NON validées. Les réponses ne sont jamais déduites. */
export async function extractQcmPdf(file: Blob, progress: (message: string) => void) {
  const session = await openPdfImport(file);
  try {
    if (session.pages > 100) throw new Error('PDF trop long (100 pages maximum par import). Divisez-le en plusieurs fichiers.');
    const rawPages: {page: number; text: string}[] = [];
    const all: NoryaQcm[] = [];
    for (let page=1;page<=session.pages;page++) {
      progress(`Lecture PDF : page ${page}/${session.pages}`);
      const preview=await session.preview(page);
      const ordered=preview.spans.filter(s=>s.text.trim()).sort((a,b)=>Math.abs(a.bbox[1]-b.bbox[1])<4?a.bbox[0]-b.bbox[0]:a.bbox[1]-b.bbox[1]);
      const lines:{y:number;text:string}[]=[];
      for(const span of ordered){const y=span.bbox[1];const last=lines[lines.length-1];if(last&&Math.abs(last.y-y)<4)last.text+=' '+span.text.trim();else lines.push({y,text:span.text.trim()});}
      const text=lines.map(line=>line.text).join('\n');
      rawPages.push({page,text});
      const chunks=text.split(/(?=^\s*(?:Q(?:CM)?\s*)?\d{1,4}\s*[.)-]\s+)/m).filter(x=>x.trim());
      for(let n=0;n<chunks.length;n++) {
        const chunk=chunks[n];
        if(!/^\s*(?:Q(?:CM)?\s*)?\d{1,4}\s*[.)-]/i.test(chunk))continue;
        const options=[...chunk.matchAll(/(?:^|\n)\s*([A-E])\s*[.)-]\s*([^\n]+)/g)];
        if(options.length<2)continue;
        const stem=chunk.slice(0,options[0].index).replace(/^\s*(?:Q(?:CM)?\s*)?\d{1,4}\s*[.)-]\s*/i,'').trim();
        if(!stem)continue;
        all.push({id:`pdf-p${page}-q${n+1}`,chapterIds:[],stem,choices:options.map(m=>({id:m[1],text:m[2].trim(),correct:false})),explanation:'À compléter après vérification manuelle. Aucune bonne réponse déduite automatiquement.',verified:false});
      }
    }
    return {...qcmExportTemplate(),source:'PDF local — brouillon non vérifié',rawPages,questions:all};
  }finally{await session.close();}
}
