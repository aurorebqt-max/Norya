import {examChapters,referenceBooks,errataByChapter,errataSource} from './rezidentiat2026';
import {referenceAudit} from './referenceAudit';
import {romanianLessons} from './romanianLessons';
export const documentaryMap=examChapters.map(c=>({...c,
 book:referenceBooks.find(b=>b.id===c.bookId)!,
 tematicaPdfPages:c.bookId==='sinopsis'?'4':c.bookId==='lawrence'?(Number(c.id.split('-')[1])<=11?'2':'3'):(Number(c.id.split('-')[1])<=30?'1–2':'2'),
 document:referenceAudit[c.id],erratum:errataByChapter[c.id]?{...errataByChapter[c.id],source:errataSource}:null,
 lesson:romanianLessons.find(l=>l.chapterId===c.id),
}));
/** Verified page locations for the supplied extracts only. Replacements may have different offsets. */
export function privatePdfPage(chapterId:string,bookPage:number):number|undefined{
 if(chapterId==='kum-08'&&bookPage>=151&&bookPage<=168)return bookPage-150;
 if(chapterId==='kum-31'&&bookPage>=1133&&bookPage<=1145)return bookPage-1132;
 if(chapterId==='kum-10'&&bookPage>=224&&bookPage<=233)return bookPage-222;
 if(chapterId==='kum-21'){
  if(bookPage>=611&&bookPage<=618)return bookPage-609;
  if(bookPage===621)return 10;if(bookPage===622)return 11;
 }
 return undefined;
}
export const documentaryNotice='39 entrées de chapitres rapprochées des 4 pages de la Tematica fournie, édition novembre 2026. Les limites de sections restent obligatoires. Présence du fichier ≠ lecture complète vérifiée. Erratum fourni nommé 23/08/2021 : applicabilité officielle 2026 à confirmer ; ses corrections repérées sont signalées.';
