import { PDFDocument } from './pdf-lib.esm.min.js';
import * as pdfjs from './pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.mjs', import.meta.url).href;
window.noryaPdfJs = pdfjs;

window.noryaPdfDocument = PDFDocument;
