import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { archiveFinalCourse, reopenFinalCourse, activateFinalVersion,
  type FinalCourseArchive, type FinalizationEvidence } from './finalization';

type Summary = { chapterId: string; status: 'finalized' | 'editing'; activeVersion: number; revision: number };
const INDEX = 'norya-finalized-courses-index-v1';
const summary = (a: FinalCourseArchive): Summary => ({ chapterId: a.chapterId, status: a.status, activeVersion: a.activeVersion, revision: a.revision });
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action); queue = next.catch(() => {}); return next;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('norya-finalized-courses', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('chapters'); r.result.createObjectStore('catalogue'); };
    r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result);
  });
}
function check(value: FinalCourseArchive | null): FinalCourseArchive | null {
  if (value && (value.schemaVersion !== 1 || !Array.isArray(value.versions) ||
      !value.versions.some(v => v.version === value.activeVersion))) throw new Error('Archive illisible ; données conservées.');
  return value;
}
async function nativeIndex(): Promise<Record<string, Summary & { file: string }>> {
  return JSON.parse(await AsyncStorage.getItem(INDEX) ?? '{}');
}
function nativeFile(name: string) { return new File(Paths.document, 'norya-finalized-courses', name); }
export async function loadFinalCourse(chapterId: string): Promise<FinalCourseArchive | null> {
  if (Platform.OS !== 'web') {
    const entry = (await nativeIndex())[chapterId];
    return entry ? check(JSON.parse(await nativeFile(entry.file).text())) : null;
  }
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly'); const r = tx.objectStore('chapters').get(chapterId);
    tx.oncomplete = () => { db.close(); try { resolve(check(r.result ?? null)); } catch (e) { reject(e); } };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Lecture interrompue.')); };
  });
}
export async function listFinalCourses(): Promise<Summary[]> {
  if (Platform.OS !== 'web') return Object.values(await nativeIndex()).map(({ file, ...entry }) => entry);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogue', 'readonly'); const r = tx.objectStore('catalogue').getAll();
    tx.oncomplete = () => { db.close(); resolve(r.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Lecture interrompue.')); };
  });
}
async function update(chapterId: string, expectedRevision: number, change: (a: FinalCourseArchive | null) => FinalCourseArchive) {
  return serial(async () => {
    if (Platform.OS !== 'web') {
      const index = await nativeIndex();
      const old = await loadFinalCourse(chapterId);
      if ((old?.revision ?? 0) !== expectedRevision) throw new Error('Le cours a changé. Rechargez avant de continuer.');
      const next = change(old);
      new Directory(Paths.document, 'norya-finalized-courses').create({ intermediates: true, idempotent: true });
      const name = `archive-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
      const file = nativeFile(name);
      file.write(JSON.stringify(next));
      // Commit only after a complete, readable immutable file exists. Old files stay intact.
      check(JSON.parse(await file.text()));
      await AsyncStorage.setItem(INDEX, JSON.stringify({ ...index, [chapterId]: { ...summary(next), file: name } }));
      return next;
    }
    const db = await database();
    return new Promise<FinalCourseArchive>((resolve, reject) => {
      const tx = db.transaction(['chapters', 'catalogue'], 'readwrite');
      const store = tx.objectStore('chapters'); const r = store.get(chapterId);
      let next: FinalCourseArchive; let failure: unknown;
      r.onsuccess = () => {
        try {
          const old = check(r.result ?? null);
          if ((old?.revision ?? 0) !== expectedRevision) throw new Error('Le cours a changé. Rechargez avant de continuer.');
          next = change(old); store.put(next, chapterId); tx.objectStore('catalogue').put(summary(next), chapterId);
        } catch (e) { failure = e; tx.abort(); }
      };
      tx.oncomplete = () => { db.close(); resolve(next); };
      tx.onerror = tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('Enregistrement interrompu.')); };
    });
  });
}
export const finalizeCourse = (evidence: FinalizationEvidence, revision: number, confirmed: boolean) =>
  update(evidence.packet.chapterId, revision, old => archiveFinalCourse(old, evidence, confirmed));
export const reopenCourse = (id: string, revision: number) => update(id, revision, old => {
  if (!old) throw new Error('Cours finalisé introuvable.'); return reopenFinalCourse(old);
});
export const selectFinalVersion = (id: string, revision: number, version: number) => update(id, revision, old => {
  if (!old) throw new Error('Cours finalisé introuvable.'); return activateFinalVersion(old, version);
});
