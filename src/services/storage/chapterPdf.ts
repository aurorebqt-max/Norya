import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { browserPdf } from './privatePdfs';

// Same index and private directory as References: imports are visible there too.
const INDEX = 'norya.private-reference-pdfs.v1';
type ReferencePdf = { uri: string; name: string; addedAt: string };
async function references(): Promise<Record<string, ReferencePdf>> {
  const raw = await AsyncStorage.getItem(INDEX);
  const value = raw === null ? {} : JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(entry => {
    const pdf = entry as ReferencePdf | null;
    return !pdf || typeof pdf.uri !== 'string' || typeof pdf.name !== 'string' || typeof pdf.addedAt !== 'string';
  })) throw new Error('Index des PDF privés illisible. Données conservées.');
  return value;
}
export async function loadChapterPdf(chapterId: string): Promise<ReferencePdf | null> {
  return (await references())[chapterId] ?? null;
}
export async function importChapterPdf(chapterId: string): Promise<ReferencePdf | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !(asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf')))
    throw new Error('Sélectionnez un fichier PDF.');
  // Read before copying so an unreadable index can never be replaced with an empty one.
  await references();
  const key = `${encodeURIComponent(chapterId)}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let uri: string;
  if (Platform.OS === 'web') {
    const blob = asset.file ?? await (await fetch(asset.uri)).blob();
    if (!(await blob.slice(0, 1024).text()).includes('%PDF-')) throw new Error('Le fichier sélectionné ne contient pas un PDF valide.');
    await browserPdf(key, blob);
    uri = `indexeddb:${key}`;
  } else {
    const directory = new Directory(Paths.document, 'norya-private-references');
    directory.create({ intermediates: true, idempotent: true });
    const file = new File(directory, `${key}.pdf`);
    new File(asset.uri).copy(file);
    uri = file.uri;
  }
  const all = await references();
  if (all[chapterId]) all[`${chapterId}:previous:${key}`] = all[chapterId];
  const pdf = { uri, name: asset.name, addedAt: new Date().toISOString() };
  await AsyncStorage.setItem(INDEX, JSON.stringify({ ...all, [chapterId]: pdf }));
  return pdf;
}
export async function openChapterPdf(pdf: ReferencePdf) {
  if (Platform.OS === 'web') {
    // Open synchronously from the click to retain Safari's user activation.
    const tab = window.open('about:blank', '_blank');
    if (!tab) throw new Error('Autorisez l’ouverture du PDF dans un nouvel onglet.');
    try {
      const blob = pdf.uri.startsWith('indexeddb:') ? await browserPdf(pdf.uri.slice(10)) : undefined;
      if (!blob) throw new Error('Copie PDF indisponible dans ce navigateur. Réimportez le PDF.');
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) { tab.close(); throw e; }
  } else {
    const file = new File(pdf.uri);
    if (!file.exists) throw new Error('Copie PDF introuvable sur cet appareil.');
    if (!await Sharing.isAvailableAsync()) throw new Error('Aucune application de lecture PDF disponible.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: pdf.name });
  }
}
