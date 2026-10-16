import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeReadingData, emptyReadingData, type ReadingData } from './readingData';

const key = (chapter: string) => `norya-course-reading-v1:${chapter}`;
let queue: Promise<unknown> = Promise.resolve();
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('norya-course-reading', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('chapters');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export async function loadReadingData(chapter: string): Promise<ReadingData> {
  if (Platform.OS !== 'web') {
    const raw = await AsyncStorage.getItem(key(chapter));
    return raw ? decodeReadingData(raw, chapter) : emptyReadingData(chapter);
  }
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly'); const read = tx.objectStore('chapters').get(chapter);
    tx.oncomplete = () => { db.close(); try { resolve(read.result ? decodeReadingData(read.result, chapter) : emptyReadingData(chapter)); } catch (e) { reject(e); } };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Lecture des annotations interrompue.')); };
  });
}
/** Read/modify/write transaction avoids overwriting another tab's newly saved marks. */
export function updateReadingData(chapter: string, change: (data: ReadingData) => ReadingData): Promise<ReadingData> {
  const action = async () => {
    if (Platform.OS !== 'web') {
      const next = change(await loadReadingData(chapter));
      decodeReadingData(JSON.stringify(next), chapter);
      await AsyncStorage.setItem(key(chapter), JSON.stringify(next)); return next;
    }
    const db = await database();
    return new Promise<ReadingData>((resolve, reject) => {
      const tx = db.transaction('chapters', 'readwrite'); const store = tx.objectStore('chapters'); const read = store.get(chapter);
      let next: ReadingData; let failure: unknown;
      read.onsuccess = () => { try {
        next = change(read.result ? decodeReadingData(read.result, chapter) : emptyReadingData(chapter));
        const raw = JSON.stringify(next); decodeReadingData(raw, chapter); store.put(raw, chapter);
      } catch (e) { failure = e; tx.abort(); } };
      tx.oncomplete = () => { db.close(); resolve(next); };
      tx.onabort = tx.onerror = () => { db.close(); reject(failure ?? tx.error ?? new Error('Sauvegarde des annotations interrompue.')); };
    });
  };
  const result = queue.then(action, action); queue = result.catch(() => {}); return result;
}
