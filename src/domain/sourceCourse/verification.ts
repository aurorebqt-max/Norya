/**
 * Types et fonctions pour la validation humaine des cours source.
 * Ce module permet de marquer, persister et consulter le statut de vérification
 * de chaque bloc, page et chapitre, sans modifier les données source.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Statuts possibles pour un bloc de texte */
export type BlockValidationStatus = 
  | 'pending'      // Non encore vérifié
  | 'in-review'    // En cours de vérification
  | 'verified'     // Vérifié et fidèle
  | 'issue-found'  // Anomalie détectée
  | 'corrected'    // Corrigé et revérifié
  ;

/** Statuts possibles pour une page */
export type PageValidationStatus = 
  | 'not-started'  // Aucune vérification commencée
  | 'in-progress'  // Certains blocs vérifiés
  | 'verified'     // Tous les blocs vérifiés
  ;

/** Données de validation pour un bloc */
export interface BlockValidation {
  id: string;                  // ID du bloc (ex: "block-1")
  page: number;                // Page imprimée
  status: BlockValidationStatus;
  notes?: string;              // Notes de vérification
  verifiedAt?: string;          // Date ISO de vérification
  verifiedBy?: string;          // Identifiant du vérificateur
  issueDescription?: string;   // Description de l'anomalie
  correction?: string;          // Correction apportée (si applicable)
}

/** Données de validation pour une page */
export interface PageValidation {
  printedPage: number;
  pdfPage: number;
  status: PageValidationStatus;
  blocks: BlockValidation[];
  verifiedAt?: string;
}

/** Données de validation pour un chapitre */
export interface ChapterValidation {
  chapterId: string;
  pages: PageValidation[];
  startedAt?: string;
  lastUpdatedAt?: string;
  complete: boolean;
  verifiedPages: number;
  totalPages: number;
  highPriorityBlocks: number;
  mediumPriorityBlocks: number;
  verifiedBlocks: number;
  totalBlocks: number;
}

/** Clé de stockage pour les validations */
const STORAGE_KEY_PREFIX = 'norya-validation-';

/**
 * Calcule le statut d'une page à partir de ses blocs.
 * Une page est 'verified' si TOUS ses blocs sont 'verified' ou 'corrected'.
 * Une page est 'in-progress' si au moins un bloc n'est pas 'pending'.
 * Une page est 'not-started' si tous les blocs sont 'pending'.
 */
function calculatePageStatus(blocks: BlockValidation[]): PageValidationStatus {
  const allPending = blocks.every(b => b.status === 'pending');
  const allVerified = blocks.every(b => b.status === 'verified' || b.status === 'corrected');
  
  if (allVerified) return 'verified';
  if (allPending) return 'not-started';
  return 'in-progress';
}

/**
 * Calcule les statistiques globales pour un chapitre.
 */
function calculateChapterStats(pages: PageValidation[]): Omit<ChapterValidation, 'chapterId' | 'pages' | 'startedAt' | 'lastUpdatedAt'> {
  const allBlocks = pages.flatMap(p => p.blocks);
  const verifiedBlocks = allBlocks.filter(b => b.status === 'verified' || b.status === 'corrected').length;
  const verifiedPages = pages.filter(p => p.status === 'verified').length;
  const highPriorityBlocks = allBlocks.filter(b => b.issueDescription?.includes('high') || 
    (b.notes && b.notes.includes('high'))).length;
  const mediumPriorityBlocks = allBlocks.filter(b => b.issueDescription?.includes('medium') || 
    (b.notes && b.notes.includes('medium'))).length;
  
  return {
    complete: verifiedPages === pages.length,
    verifiedPages,
    totalPages: pages.length,
    highPriorityBlocks,
    mediumPriorityBlocks,
    verifiedBlocks,
    totalBlocks: allBlocks.length,
  };
}

/**
 * Initialise les données de validation pour un chapitre à partir des données de contrôle.
 * Crée une structure vide avec tous les blocs marqués comme 'pending'.
 */
export function initializeValidationFromControlReport(
  chapterId: string,
  controlReport: any
): ChapterValidation {
  const pages: PageValidation[] = [];
  
  for (const page of controlReport.pages || []) {
    const blockValidations: BlockValidation[] = [];
    
    for (const block of page.blocks || []) {
      blockValidations.push({
        id: block.id,
        page: page.printedPage,
        status: 'pending',
        notes: '',
      });
    }
    
    pages.push({
      printedPage: page.printedPage,
      pdfPage: page.pdfPage,
      status: 'not-started',
      blocks: blockValidations,
    });
  }
  
  const stats = calculateChapterStats(pages);
  
  return {
    chapterId,
    pages,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    ...stats,
  };
}

/**
 * Met à jour le statut de validation d'un bloc.
 */
export function updateBlockValidation(
  validation: ChapterValidation,
  pageIndex: number,
  blockId: string,
  updates: Partial<BlockValidation> & { status: BlockValidationStatus }
): ChapterValidation {
  const page = validation.pages[pageIndex];
  if (!page) return validation;
  
  const blockIndex = page.blocks.findIndex(b => b.id === blockId);
  if (blockIndex === -1) return validation;
  
  // Mettre à jour le bloc
  const updatedBlock = {
    ...page.blocks[blockIndex],
    ...updates,
    verifiedAt: updates.status === 'verified' || updates.status === 'corrected' 
      ? new Date().toISOString() 
      : page.blocks[blockIndex].verifiedAt,
  };
  
  const updatedBlocks = [...page.blocks];
  updatedBlocks[blockIndex] = updatedBlock;
  
  const newStatus = calculatePageStatus(updatedBlocks);
  const updatedPage: PageValidation = {
    ...page,
    blocks: updatedBlocks,
    status: newStatus,
    verifiedAt: newStatus === 'verified' 
      ? new Date().toISOString() 
      : page.verifiedAt,
  };
  
  const updatedPages = [...validation.pages];
  updatedPages[pageIndex] = updatedPage;
  
  const stats = calculateChapterStats(updatedPages);
  
  return {
    ...validation,
    pages: updatedPages,
    lastUpdatedAt: new Date().toISOString(),
    ...stats,
  };
}

/**
 * Clé de stockage pour un chapitre spécifique.
 */
function getStorageKey(chapterId: string): string {
  return `${STORAGE_KEY_PREFIX}${chapterId}`;
}

/**
 * Charge les données de validation pour un chapitre.
 * Si aucune donnée n'existe, initialise à partir des données de contrôle.
 */
export async function loadValidation(chapterId: string, controlReport?: any): Promise<ChapterValidation | null> {
  if (Platform.OS === 'web') {
    // Version web : utiliser IndexedDB
    return new Promise((resolve) => {
      const request = indexedDB.open('norya-validations', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('validations');
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('validations', 'readonly');
        const store = transaction.objectStore('validations');
        const getRequest = store.get(chapterId);
        
        getRequest.onerror = () => resolve(null);
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result as ChapterValidation);
          } else if (controlReport) {
            const initialized = initializeValidationFromControlReport(chapterId, controlReport);
            // Sauvegarder pour les prochaines fois
            const saveTransaction = db.transaction('validations', 'readwrite');
            const saveStore = saveTransaction.objectStore('validations');
            saveStore.put(initialized, chapterId);
            saveTransaction.oncomplete = () => resolve(initialized);
            saveTransaction.onerror = () => resolve(initialized);
          } else {
            resolve(null);
          }
          db.close();
        };
      };
    });
  } else {
    // Version mobile : utiliser AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(getStorageKey(chapterId));
      if (stored) {
        return JSON.parse(stored) as ChapterValidation;
      } else if (controlReport) {
        const initialized = initializeValidationFromControlReport(chapterId, controlReport);
        await saveValidation(initialized);
        return initialized;
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Sauvegarde les données de validation pour un chapitre.
 */
export async function saveValidation(validation: ChapterValidation): Promise<void> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('norya-validations', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('validations');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('validations', 'readwrite');
        const store = transaction.objectStore('validations');
        const putRequest = store.put(validation, validation.chapterId);
        
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  } else {
    try {
      await AsyncStorage.setItem(getStorageKey(validation.chapterId), JSON.stringify(validation));
    } catch (error) {
      console.error('Erreur de sauvegarde de la validation :', error);
    }
  }
}

/**
 * Supprime les données de validation pour un chapitre.
 */
export async function deleteValidation(chapterId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('norya-validations', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('validations');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('validations', 'readwrite');
        const store = transaction.objectStore('validations');
        const deleteRequest = store.delete(chapterId);
        
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  } else {
    try {
      await AsyncStorage.removeItem(getStorageKey(chapterId));
    } catch (error) {
      console.error('Erreur de suppression de la validation :', error);
    }
  }
}

/**
 * Exporte les données de validation pour sauvegarde.
 */
export async function exportValidation(chapterId: string): Promise<string | null> {
  const validation = await loadValidation(chapterId);
  return validation ? JSON.stringify(validation, null, 2) : null;
}

/**
 * Importe des données de validation précédemment exportées.
 */
export async function importValidation(data: string): Promise<ChapterValidation | null> {
  try {
    const validation = JSON.parse(data) as ChapterValidation;
    await saveValidation(validation);
    return validation;
  } catch {
    return null;
  }
}

/**
 * Génère un rapport de progression au format lisible.
 */
export function generateProgressReport(validation: ChapterValidation): string {
  const lines: string[] = [
    `Chapitre : ${validation.chapterId}`,
    `Date de début : ${validation.startedAt || 'N/A'}`,
    `Dernière mise à jour : ${validation.lastUpdatedAt || 'N/A'}`,
    ``,
    `Statut global : ${validation.complete ? '✅ COMPLET' : '⏳ EN COURS'}`,
    `Pages vérifiées : ${validation.verifiedPages}/${validation.totalPages}`,
    `Blocs vérifiés : ${validation.verifiedBlocks}/${validation.totalBlocks}`,
    ``,
    `Répartition par page :`,
  ];
  
  for (const page of validation.pages) {
    const statusIcon = page.status === 'verified' ? '✅' : 
                      page.status === 'in-progress' ? '⏳' : '❌';
    const verifiedBlocks = page.blocks.filter(b => b.status === 'verified' || b.status === 'corrected').length;
    lines.push(`  Page ${page.printedPage} : ${statusIcon} ${verifiedBlocks}/${page.blocks.length} blocs`);
  }
  
  lines.push(
    ``,
    `Priorités :`,
    `  Haute : ${validation.highPriorityBlocks} blocs à vérifier`,
    `  Moyenne : ${validation.mediumPriorityBlocks} blocs`,
  );
  
  return lines.join('\n');
}

/**
 * Filtrage des blocs par priorité ou statut.
 */
export function filterBlocksByPriority(
  validation: ChapterValidation,
  priority: 'high' | 'medium' | 'all'
): { pageIndex: number; block: BlockValidation }[] {
  const result: { pageIndex: number; block: BlockValidation }[] = [];
  
  for (const [pageIndex, page] of validation.pages.entries()) {
    for (const block of page.blocks) {
      // Vérifier si le bloc a une priorité correspondante
      // (à intégrer avec les données du control-report)
      if (priority === 'all') {
        result.push({ pageIndex, block });
      }
      // Pour l'instant, on retourne tous les blocs
      // L'intégration avec control-report se fera au niveau du composant
    }
  }
  
  return result;
}

/**
 * Obtient le nombre de blocs avec anomalies (priorité haute ou moyenne).
 */
export function getAnomalyCount(validation: ChapterValidation): { high: number; medium: number; total: number } {
  // Ce sera intégré avec les données du control-report
  // Pour l'instant, on retourne 0
  return { high: 0, medium: 0, total: 0 };
}
