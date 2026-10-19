import type { PdfLayout, PdfSpan } from '../domain/sourceCourse/pdfExtraction';
import type { SourcePacket } from '../domain/sourceCourse/packet';
export type PdfPreview = { image: string; width: number; height: number; spans: PdfSpan[] };
export type PdfImportSession = { pages: number; preview(page: number): Promise<PdfPreview>;
  extract(chapterId: string, first: number, last: number, folio: number, layouts: Record<number, PdfLayout>, progress: (page: number) => void): Promise<SourcePacket>; close(): Promise<void> };
export async function openPdfImport(_file: Blob): Promise<PdfImportSession> {
  throw new Error('L’extraction locale PDF est disponible dans la version web, notamment Safari sur iPad.');
}
