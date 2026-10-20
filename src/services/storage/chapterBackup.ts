import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeLearning, emptyLearning, LEARNING_KEY } from '../../domain/learning/store';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { parseChapterBackup, type ChapterBackup } from '../../domain/sourceCourse/chapterBackup';
import { loadPrivateCourse } from './privateCourse';
import { browserPdf } from './privatePdfs';
import { loadValidation, saveValidation, deleteValidation } from '../../domain/sourceCourse/verification';
import { loadChapterAnomalies } from '../../domain/sourceCourse/anomalies';
import { loadFinalCourse, restoreFinalArchive } from '../../domain/sourceCourse/finalizedStorage';
import { loadReadingData, updateReadingData } from '../../domain/sourceCourse/readingStorage';

export function downloadPrivateJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function pickPrivateJson(): Promise<string | null> {
  if (Platform.OS !== 'web') throw new Error('Cette restauration est disponible dans le navigateur.');
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return (asset.file ?? await (await fetch(asset.uri)).blob()).text();
}
export async function exportChapterBackup(chapterId: string): Promise<ChapterBackup> {
  const [packet, validation, archive, reading, anomalies] = await Promise.all([
    loadPrivateCourse(chapterId), loadValidation(chapterId), loadFinalCourse(chapterId), loadReadingData(chapterId), loadChapterAnomalies(chapterId),
  ]);
  const source = packet ?? archive?.versions.find(v => v.version === archive.activeVersion)?.packet;
  if (!source) throw new Error('Aucun cours privé à exporter.');
  const learningRaw = await AsyncStorage.getItem(LEARNING_KEY);
  const learning = learningRaw ? decodeLearning(learningRaw) : emptyLearning();
  const backup: ChapterBackup = { format: 'norya-chapter-backup', version: 1, chapterId, exportedAt: new Date().toISOString(),
    packet: source, validation: validation && !validation.anomalies && anomalies.length ? { ...validation, anomalies } : validation, archive, reading, learningReading: learning.reading[chapterId] ?? null };
  return parseChapterBackup(JSON.stringify(backup), chapterId);
}
/** Check image payloads without decoding hundreds of full-page PNGs in Safari.
 * Safari can reject Image() decoding under memory pressure even for valid data URIs.
 * Actual image rendering remains the responsibility of the course reader.
 */
export async function inspectBackupImages(data: ChapterBackup): Promise<void> {
  const packets = [data.packet, ...(data.archive?.versions.map(v => v.packet) ?? [])];
  const images = new Set(packets.flatMap(p => p.pages.flatMap(page => [page.image, ...(page.parts ?? []).map(b => b.image)])));
  for (const src of images) {
    if (typeof src !== 'string' || !src) throw new Error('Illustration manquante : import refusé.');
    if (src.startsWith('data:image/png;base64,')) {
      const payload = src.slice('data:image/png;base64,'.length);
      if (!payload.startsWith('iVBORw0KGgo') || payload.length < 100 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 !== 0)
        throw new Error('Illustration PNG mal encodée : import refusé.');
    } else if (src.startsWith('data:image/jpeg;base64,')) {
      const payload = src.slice('data:image/jpeg;base64,'.length);
      if (!payload.startsWith('/9j/') || payload.length < 100 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 !== 0)
        throw new Error('Illustration JPEG mal encodée : import refusé.');
    } else if (!src.startsWith('blob:') && !src.startsWith('https://')) {
      throw new Error('Format d’illustration non reconnu : import refusé.');
    }
  }
}
/** Fresh destination only: no existing review/annotations/version is ever replaced. */
export async function restoreChapterBackup(data: ChapterBackup): Promise<void> {
  parseChapterBackup(JSON.stringify(data), data.chapterId);
  const id = data.chapterId;
  const [packet, validation, archive, reading, anomalies] = await Promise.all([loadPrivateCourse(id), loadValidation(id), loadFinalCourse(id), loadReadingData(id), loadChapterAnomalies(id)]);
  if (packet || validation || archive || anomalies.length || reading.annotations.length || reading.translations.length)
    throw new Error('Ce navigateur contient déjà des données pour ce chapitre. Restauration refusée pour les préserver.');
  const learningRaw = await AsyncStorage.getItem(LEARNING_KEY);
  const learning = learningRaw ? decodeLearning(learningRaw) : emptyLearning();
  if (learning.reading[id]) throw new Error('Une progression de lecture existe déjà pour ce chapitre. Données conservées.');
  if (data.learningReading) decodeLearning(JSON.stringify({ ...learning, reading: { ...learning.reading, [id]: data.learningReading } }));
  await inspectBackupImages(data);
  // Keep the entire input before any write to separate legacy databases. Never delete on failure.
  await browserPdf(`restoration-input:${id}:${Date.now()}`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (data.validation) await addOnly('norya-validations', 'validations', id, data.validation);
  if (data.reading) await updateReadingData(id, current => {
    if (current.annotations.length || current.translations.length) throw new Error('Annotations modifiées entre-temps.');
    return data.reading!;
  });
  const key = id === 'kum-08' ? 'norya-private-source-course-kum08-v1' : `norya-private-source-course-${encodeURIComponent(id)}-v1`;
  await addOnly('norya-private-pdfs', 'pdfs', key, new Blob([JSON.stringify(data.packet)], { type: 'application/json' }));
  if (data.archive) await restoreFinalArchive(data.archive);
  if (data.learningReading) {
    const freshRaw = await AsyncStorage.getItem(LEARNING_KEY);
    const fresh = freshRaw ? decodeLearning(freshRaw) : emptyLearning();
    if (fresh.reading[id]) throw new Error('Progression modifiée entre-temps. Cours restauré, progression non remplacée.');
    await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify({ ...fresh, reading: { ...fresh.reading, [id]: data.learningReading } }));
  }
  const restored = await exportChapterBackup(id);
  for (const field of ['packet', 'validation', 'archive', 'reading', 'learningReading'] as const) {
    if (data[field] && JSON.stringify(restored[field]) !== JSON.stringify(data[field])) throw new Error(`Relecture différente : ${field}. Conservez le fichier de sauvegarde.`);
  }
}

/** Replace only an unfinished local draft, preserving an independent backup. */
export async function replaceDraftChapterBackup(data: ChapterBackup): Promise<void> {
  if (Platform.OS !== 'web') throw new Error('Disponible uniquement dans le navigateur.');
  parseChapterBackup(JSON.stringify(data), data.chapterId);
  const id = data.chapterId;
  const [archive, reading, current] = await Promise.all([loadFinalCourse(id), loadReadingData(id), loadPrivateCourse(id)]);
  if (archive || data.archive) throw new Error('Archive finalisée présente : remplacement refusé.');
  if (reading.annotations.length || reading.translations.length) throw new Error('Annotations ou traductions existantes : remplacement refusé pour éviter de les perdre.');
  if (!current) throw new Error('Aucun brouillon existant : utilisez la restauration normale.');
  const before = await exportChapterBackup(id);
  downloadPrivateJson(`norya-AVANT-remplacement-${id}-${Date.now()}.json`, before);
  await inspectBackupImages(data);
  await browserPdf(`pre-replacement:${id}:${Date.now()}`, new Blob([JSON.stringify(before)], { type: 'application/json' }));
  const key = id === 'kum-08' ? 'norya-private-source-course-kum08-v1' : `norya-private-source-course-${encodeURIComponent(id)}-v1`;
  await browserPdf(key, new Blob([JSON.stringify(data.packet)], { type: 'application/json' }));
  if (data.validation) await saveValidation(data.validation); else await deleteValidation(id);
  const check = await loadPrivateCourse(id);
  if (JSON.stringify(check) !== JSON.stringify(data.packet)) throw new Error('Relecture différente : conservez le fichier de sauvegarde téléchargé.');
}
function addOnly(database: string, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).add(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Écriture interrompue ou données concurrentes. Ne supprimez rien ; conservez la sauvegarde pour reprendre la restauration.')); };
    };
  });
}
