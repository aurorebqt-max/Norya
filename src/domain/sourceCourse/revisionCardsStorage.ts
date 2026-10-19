import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RevisionCardSet } from './revisionCards';

const INDEX = 'norya-revision-cards-index-v1';
const keyFor = (id: string) => `norya-revision-cards-v1:${id}`;
let queue: Promise<unknown> = Promise.resolve();

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('norya-revision-cards', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('cards'); r.result.createObjectStore('catalogue'); };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
  });
}

function check(set: RevisionCardSet | null): RevisionCardSet | null {
  if (!set) return null;
  if (set.schemaVersion !== 1 || !set.chapterId || !Array.isArray(set.sections) ||
      set.sections.some(s => !s || typeof s.id !== 'string' || !['h1', 'h2', 'h3', 'h4'].includes(s.level) || typeof s.title !== 'string' || !Array.isArray(s.items) || s.items.some(t => typeof t !== 'string')) ||
      typeof set.sourceVersion !== 'string' || typeof set.createdAt !== 'string' || typeof set.updatedAt !== 'string' || new Set(set.sections.map(s => s.id)).size !== set.sections.length) {
    throw new Error('Fiche invalide.');
  }
  return set;
}

export type CardSummary = { chapterId: string; version: number; sourceVersion: string; sections: number; updatedAt: string };

async function nativeIndex(): Promise<Record<string, CardSummary>> {
  return JSON.parse(await AsyncStorage.getItem(INDEX) ?? '{}');
}

export async function loadRevisionCards(chapterId: string): Promise<RevisionCardSet | null> {
  if (Platform.OS !== 'web') {
    const raw = await AsyncStorage.getItem(keyFor(chapterId));
    return raw ? check(JSON.parse(raw)) : null;
  }
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cards', 'readonly');
    const r = tx.objectStore('cards').get(chapterId);
    tx.oncomplete = () => { db.close(); try { resolve(check(r.result ?? null)); } catch (e) { reject(e); } };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Lecture des fiches interrompue.')); };
  });
}

export async function listRevisionCards(): Promise<CardSummary[]> {
  if (Platform.OS !== 'web') {
    const index = await nativeIndex();
    return Object.values(index);
  }
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('catalogue', 'readonly');
    const r = tx.objectStore('catalogue').getAll();
    tx.oncomplete = () => { db.close(); resolve(r.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Lecture des fiches interrompue.')); };
  });
}

export async function saveRevisionCards(set: RevisionCardSet): Promise<RevisionCardSet> {
  check(set);
  const action = async () => {
    const backupKey = `history:${set.chapterId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const summary: CardSummary = {
      chapterId: set.chapterId,
      version: set.version,
      sourceVersion: set.sourceVersion,
      sections: set.sections.length,
      updatedAt: set.updatedAt,
    };
    if (Platform.OS !== 'web') {
      const index = await nativeIndex();
      const previous = await AsyncStorage.getItem(keyFor(set.chapterId));
      if (previous) await AsyncStorage.setItem(keyFor(backupKey), previous);
      await AsyncStorage.setItem(keyFor(set.chapterId), JSON.stringify(set));
      await AsyncStorage.setItem(INDEX, JSON.stringify({ ...index, [set.chapterId]: summary }));
      return set;
    }
    const db = await database();
    return new Promise<RevisionCardSet>((resolve, reject) => {
      const tx = db.transaction(['cards', 'catalogue'], 'readwrite');
      const store = tx.objectStore('cards');
      const read = store.get(set.chapterId);
      read.onsuccess = () => { if (read.result) store.put(read.result, backupKey); store.put(set, set.chapterId); };
      tx.objectStore('catalogue').put(summary, set.chapterId);
      tx.oncomplete = () => { db.close(); resolve(set); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Enregistrement de la fiche interrompu.')); };
    });
  };
  const result = queue.then(action, action);
  queue = result.catch(() => {});
  return result;
}

export async function exportRevisionCards(chapterId: string): Promise<string> {
  const set = await loadRevisionCards(chapterId);
  if (!set) throw new Error('Aucune fiche enregistrée pour ce chapitre.');
  return JSON.stringify(set, null, 2);
}

export async function importRevisionCards(raw: string, expectedChapterId?: string): Promise<RevisionCardSet> {
  const parsed = JSON.parse(raw) as RevisionCardSet;
  if (parsed.schemaVersion !== 1 || !parsed.chapterId) {
    throw new Error('Fichier de fiche invalide.');
  }
  check(parsed);
  if (expectedChapterId && parsed.chapterId !== expectedChapterId) throw new Error('Cette fiche appartient à un autre chapitre.');
  parsed.updatedAt = new Date().toISOString();
  return saveRevisionCards(parsed);
}
