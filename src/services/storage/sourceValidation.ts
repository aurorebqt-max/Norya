/**
 * Service de persistence pour les validations humaines des cours source.
 * Ce service permet de charger, sauvegarder et gérer les statuts de validation
 * des chapitres Kumar extraits depuis les PDF.
 */

import { Platform } from 'react-native';
import { Directory, File, Paths, makeDirectoryAsync } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import {
  ChapterValidation,
  BlockValidationStatus,
  PageValidationStatus,
  BlockValidation,
  PageValidation,
  loadValidation,
  saveValidation,
  deleteValidation,
  exportValidation,
  importValidation,
  updateBlockValidation,
  initializeValidationFromControlReport,
  generateProgressReport,
  filterBlocksByPriority,
} from '../../domain/sourceCourse/verification';

// Importer les fonctions de gestion des anomalies
export {
  AnomalyReport,
  AnomalyStatus,
  ChapterAnomalyReport,
  createAnomalyReport,
  generateAnomalyId,
  loadChapterAnomalies,
  saveAnomaly,
  deleteAnomaly,
  exportAnomaliesToJSON,
  exportAnomaliesToMarkdown,
  generateFullAnomalyReport,
} from '../../domain/sourceCourse/anomalies';

// Ré-exporter les types pour utilisation par les composants
export type { ChapterValidation, BlockValidationStatus, BlockValidation, PageValidation, PageValidationStatus };

/**
 * Clé de stockage locale pour les validations.
 * Sur mobile : fichier dans le répertoire privé de l'application.
 * Sur web : IndexedDB via le module verification.ts.
 */
const LOCAL_STORAGE_KEY = 'norya-kumar-08-validation';

/**
 * Fichier de sauvegarde des validations.
 */
function validationFile(): File {
  return new File(Paths.document, 'norya-validations', 'kum-08-validation.json');
}

/**
 * Charge les validations pour le chapitre 8 depuis le stockage local.
 * Si aucune validation n'existe, initialise à partir des données de contrôle.
 */
export async function loadChapterValidation(controlReport?: any): Promise<ChapterValidation | null> {
  try {
    // Essayer de charger depuis le stockage
    const saved = await loadValidation('kum-08', controlReport);
    if (saved) {
      return saved;
    }
    
    // Si aucune validation n'existe et qu'on a un rapport de contrôle, initialiser
    if (controlReport) {
      const initialized = initializeValidationFromControlReport('kum-08', controlReport);
      await saveValidation(initialized);
      return initialized;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur de chargement de la validation :', error);
    return null;
  }
}

/**
 * Sauvegarde les validations pour le chapitre 8.
 */
export async function saveChapterValidation(validation: ChapterValidation): Promise<void> {
  try {
    await saveValidation(validation);
  } catch (error) {
    console.error('Erreur de sauvegarde de la validation :', error);
    throw error;
  }
}

/**
 * Met à jour le statut d'un bloc spécifique.
 */
export async function updateBlockStatus(
  currentValidation: ChapterValidation,
  pageIndex: number,
  blockId: string,
  status: BlockValidationStatus,
  notes?: string,
  issueDescription?: string
): Promise<ChapterValidation> {
  const updated = updateBlockValidation(currentValidation, pageIndex, blockId, {
    status,
    notes: notes || undefined,
    issueDescription: issueDescription || undefined,
  });
  
  await saveChapterValidation(updated);
  return updated;
}

/**
 * Exporte les validations vers un fichier.
 */
export async function exportValidationToFile(): Promise<string | null> {
  try {
    const validation = await loadChapterValidation();
    if (!validation) {
      return null;
    }
    
    if (Platform.OS === 'web') {
      const data = JSON.stringify(validation, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `norya-kumar-08-validation-${validation.lastUpdatedAt || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return url;
    } else {
      const file = validationFile();
      // Crée le répertoire parent
      await makeDirectoryAsync(file.parentDirectory.uri, { intermediates: true });
      await file.write(JSON.stringify(validation, null, 2));
      return file.uri;
    }
  } catch (error) {
    console.error('Erreur d\'export de la validation :', error);
    return null;
  }
}

/**
 * Importe des validations depuis un fichier.
 */
export async function importValidationFromFile(): Promise<ChapterValidation | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled) {
      return null;
    }
    
    const asset = result.assets[0];
    const content = Platform.OS === 'web'
      ? await asset.file!.text()
      : await new File(asset.uri).text();
    
    return await importValidation(content);
  } catch (error) {
    console.error('Erreur d\'import de la validation :', error);
    return null;
  }
}

/**
 * Génère un rapport de progression.
 */
export function getProgressReport(validation: ChapterValidation): string {
  return generateProgressReport(validation);
}

/**
 * Filtrage des blocs par priorité.
 */
export function getFilteredBlocks(
  validation: ChapterValidation,
  priority: 'high' | 'medium' | 'all'
): { pageIndex: number; block: any }[] {
  return filterBlocksByPriority(validation, priority);
}

/**
 * Obtient les statistiques de validation.
 */
export function getValidationStats(validation: ChapterValidation) {
  const verifiedPages = validation.pages.filter(p => p.status === 'verified').length;
  const totalPages = validation.pages.length;
  const verifiedBlocks = validation.pages.flatMap(p => p.blocks).filter(
    b => b.status === 'verified' || b.status === 'corrected'
  ).length;
  const totalBlocks = validation.pages.flatMap(p => p.blocks).length;
  
  return {
    verifiedPages,
    totalPages,
    verifiedBlocks,
    totalBlocks,
    progress: totalBlocks > 0 ? Math.round((verifiedBlocks / totalBlocks) * 100) : 0,
    complete: verifiedPages === totalPages,
  };
}

/**
 * Obtient la liste des pages avec des anomalies (blocs priorité haute ou moyenne).
 */
export function getPagesWithAnomalies(
  validation: ChapterValidation,
  controlReport: any
): { page: number; blocks: any[] }[] {
  const pagesWithAnomalies: { page: number; blocks: any[] }[] = [];
  
  // Créer une map des priorités par bloc depuis control-report
  const blockPriorities = new Map<string, string>();
  for (const page of controlReport?.pages || []) {
    for (const block of page.blocks || []) {
      blockPriorities.set(block.id, block.priority);
    }
  }
  
  for (const page of validation.pages) {
    const anomalyBlocks = page.blocks.filter(block => {
      const priority = blockPriorities.get(block.id);
      return priority === 'high' || priority === 'medium';
    });
    
    if (anomalyBlocks.length > 0) {
      pagesWithAnomalies.push({
        page: page.printedPage,
        blocks: anomalyBlocks.map(b => ({
          ...b,
          priority: blockPriorities.get(b.id),
        })),
      });
    }
  }
  
  return pagesWithAnomalies;
}

/**
 * Obtient les blocs d'une page spécifique.
 */
export function getPageBlocks(
  validation: ChapterValidation,
  printedPage: number
): any[] {
  const page = validation.pages.find(p => p.printedPage === printedPage);
  return page ? page.blocks : [];
}

/**
 * Obtient le statut de validation d'un bloc spécifique.
 */
export function getBlockStatus(
  validation: ChapterValidation,
  printedPage: number,
  blockId: string
): BlockValidationStatus {
  const page = validation.pages.find(p => p.printedPage === printedPage);
  if (!page) return 'pending';
  
  const block = page.blocks.find(b => b.id === blockId);
  return block ? block.status : 'pending';
}
