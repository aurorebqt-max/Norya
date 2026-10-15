import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { browserPdf } from './privatePdfs';
import { parseSourcePacket, type SourcePacket, type SourcePage } from '../../domain/sourceCourse/packet';

const KEY = 'norya-private-source-course-kum08-v1';
function storedFile() { return new File(Paths.document, 'norya-private-source-courses', 'kum08.json'); }

export async function loadPrivateCourse(): Promise<SourcePacket | null> {
  if (Platform.OS === 'web') {
    const blob = await browserPdf(KEY);
    return blob ? parseSourcePacket(await blob.text()) : null;
  }
  const file = storedFile();
  return file.exists ? parseSourcePacket(await file.text()) : null;
}

export async function importPrivateCourse(): Promise<SourcePacket | null> {
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
      ? await asset.file!.text()
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
  if (Platform.OS === 'web') {
    await browserPdf(KEY, new Blob([raw], { type: 'application/json' }));
  } else {
    new Directory(Paths.document, 'norya-private-source-courses').create({ intermediates: true, idempotent: true });
    const file = storedFile();
    if (file.exists) {
      const backupName = `kum08-${Date.now()}.json`;
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
  const file = new File(Paths.cache, `norya-private-kumar-${page.printedPage}.pdf`);
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
