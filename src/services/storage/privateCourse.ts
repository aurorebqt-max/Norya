import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { browserPdf } from './privatePdfs';
import { parseSourcePacket, type SourcePacket, type SourcePage } from '../../domain/sourceCourse/packet';

const keyFor = (id: string) => id === 'kum-08' ? 'norya-private-source-course-kum08-v1' : `norya-private-source-course-${encodeURIComponent(id)}-v1`;
function storedFile(id: string) { return new File(Paths.document, 'norya-private-source-courses', id === 'kum-08' ? 'kum08.json' : `${encodeURIComponent(id)}.json`); }

export async function loadPrivateCourse(chapterId = 'kum-08'): Promise<SourcePacket | null> {
  if (Platform.OS === 'web') {
    const blob = await browserPdf(keyFor(chapterId));
    return blob ? parseSourcePacket(await blob.text()) : null;
  }
  const file = storedFile(chapterId);
  return file.exists ? parseSourcePacket(await file.text()) : null;
}

export async function importPrivateCourse(chapterId = 'kum-08'): Promise<SourcePacket | null> {
  const result = await DocumentPicker.getDocumentAsync({ 
    type: 'application/json', 
    copyToCacheDirectory: true 
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !asset.uri) {
    throw new Error('Aucun fichier sélectionné. Veuillez choisir le fichier norya-private-course-v2.json.');
  }
  if (asset.size && asset.size > 120 * 1024 * 1024) {
    throw new Error('Paquet trop volumineux (>120 Mo). Vérifiez que vous importes bien le fichier JSON et non un dossier.');
  }
  if (asset.size && asset.size < 100) {
    throw new Error('Fichier trop petit. Le paquet JSON doit faire au moins 100 octets. Le fichier semble incomplet ou corrompu.');
  }
  let raw: string;
  try {
    raw = Platform.OS === 'web'
      ? await (asset.file ?? await (await fetch(asset.uri)).blob()).text()
      : await new File(asset.uri).text();
  } catch (readError) {
    throw new Error(`Impossible de lire le fichier : ${readError instanceof Error ? readError.message : String(readError)}`);
  }
  if (!raw || raw.length < 100) {
    throw new Error('Fichier vide ou illisible. Vérifiez que le téléchargement s\'est bien effectué.');
  }
  let packet: SourcePacket;
  try {
    packet = parseSourcePacket(raw);
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Erreur d'import : ${errorMessage}`);
  }
  if (packet.chapterId !== chapterId) throw new Error('Ce paquet appartient à un autre chapitre.');
  if (Platform.OS === 'web') {
    const previous = await browserPdf(keyFor(chapterId));
    if (previous) await browserPdf(`${keyFor(chapterId)}-backup-${Date.now()}`, previous);
    await browserPdf(keyFor(chapterId), new Blob([raw], { type: 'application/json' }));
  } else {
    new Directory(Paths.document, 'norya-private-source-courses').create({ intermediates: true, idempotent: true });
    const file = storedFile(chapterId);
    if (file.exists) {
      const backupName = `${encodeURIComponent(chapterId)}-${Date.now()}.json`;
      file.copy(new File(Paths.document, 'norya-private-source-courses', backupName));
    }
    file.write(raw);
  }
  return packet;
}

export async function openOriginalPage(page: SourcePage): Promise<void> {
  const bytes = Uint8Array.from(atob(page.pdf), character => character.charCodeAt(0));
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const tab = window.open(url, '_blank');
    if (!tab) { URL.revokeObjectURL(url); throw new Error('Autorisez l’ouverture du PDF dans un onglet.'); }
    setTimeout(() => URL.revokeObjectURL(url), 300000);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Aucun lecteur PDF disponible.');
  const file = new File(Paths.cache, `norya-private-page-${page.printedPage}.pdf`);
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

/** First import only: a new PDF never overwrites an existing course/review. */
export async function saveImportedPdfCourse(packet: SourcePacket, original: Blob): Promise<void> {
  if (Platform.OS !== 'web') throw new Error('Import PDF local disponible sur le web.');
  parseSourcePacket(JSON.stringify(packet));
  const { loadValidation } = await import('../../domain/sourceCourse/verification');
  const { loadFinalCourse } = await import('../../domain/sourceCourse/finalizedStorage');
  if (await loadPrivateCourse(packet.chapterId) || await loadValidation(packet.chapterId) || await loadFinalCourse(packet.chapterId))
    throw new Error('Ce chapitre possède déjà un cours ou une vérification. Import PDF refusé pour préserver ses données.');
  // Archive the immutable original before making the extracted draft visible.
  await browserPdf(`source-pdf:${packet.chapterId}:${packet.sourceSha256}`, original);
  // The write is conditional in a single transaction, including competing tabs.
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('norya-private-pdfs', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('pdfs', 'readwrite'); const store = tx.objectStore('pdfs');
      const read = store.get(keyFor(packet.chapterId)); let conflict = false;
      read.onsuccess = () => {
        if (read.result) { conflict = true; tx.abort(); return; }
        store.put(new Blob([JSON.stringify(packet)], { type: 'application/json' }), keyFor(packet.chapterId));
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => { db.close(); reject(new Error(conflict ? 'Un cours a été importé entre-temps. Données conservées.' : 'Enregistrement du cours interrompu.')); };
    };
  });
}
