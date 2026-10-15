/**
 * Types et fonctions pour la gestion des anomalies de vérification.
 * Ce module permet de documenter, sauvegarder et exporter les anomalies
 * détectées lors de la vérification manuelle des cours source.
 */

// Détection de la plateforme - fonctionne dans React Native et Node.js
let Platform: { OS: string };
try {
  const RN = require('react-native');
  Platform = RN.Platform;
} catch {
  // Dans Node.js ou environnement non-RN, on détecte via user agent
  Platform = { OS: 'web' };
}

// AsyncStorage - stub pour Node.js
let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
try {
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch {
  // Dans Node.js, AsyncStorage n'est pas disponible
  AsyncStorage = {
    getItem: async () => null,
    setItem: async () => {},
  };
}

/** Statuts possibles pour une anomalie */
export type AnomalyStatus = 
  | 'open'                    // Anomalie signalée, non corrigée
  | 'corrected-pending-review' // Correction apportée, en attente de revérification
  | 'resolved'                 // Anomalie corrigée et revérifiée
  ;

/** Rapport d'anomalie pour un bloc spécifique */
export interface AnomalyReport {
  id: string;                      // Identifiant unique (UUID ou timestamp+blockId)
  chapterId: string;               // Ex: "kum-08"
  manual: string;                  // Ex: "Kumar"
  printedPage: number;             // Page imprimée du manuel
  pdfPage: number;                 // Page du PDF
  blockId: string;                 // Identifiant du bloc (ex: "part-1")
  blockRole: string;               // Rôle du bloc (ex: "table", "paragraph")
  blockTextPreview: string;        // Extrait du texte concerné (pour identification)
  description: string;             // Description détaillée de l'anomalie
  status: AnomalyStatus;           // Statut de l'anomalie
  createdAt: string;               // Date ISO de création
  updatedAt: string;               // Date ISO de dernière modification
}

/** Données d'anomalie pour persistance */
export interface StoredAnomaly extends AnomalyReport {
  // Peut inclure des champs supplémentaires pour la persistance
}

/** Rapport complet des anomalies pour un chapitre */
export interface ChapterAnomalyReport {
  chapterId: string;
  manual: string;
  anomalies: AnomalyReport[];
  total: number;
  open: number;
  correctedPendingReview: number;
  resolved: number;
  generatedAt: string;
}

/**
 * Génère un identifiant unique pour une anomalie.
 * Utilise un timestamp + blockId pour garantir l'unicité.
 */
export function generateAnomalyId(blockId: string): string {
  return `anomaly-${Date.now()}-${blockId}`;
}

/**
 * Crée un nouveau rapport d'anomalie.
 */
export function createAnomalyReport(
  chapterId: string,
  manual: string,
  printedPage: number,
  pdfPage: number,
  blockId: string,
  blockRole: string,
  blockText: string,
  description: string
): AnomalyReport {
  return {
    id: generateAnomalyId(blockId),
    chapterId,
    manual,
    printedPage,
    pdfPage,
    blockId,
    blockRole,
    blockTextPreview: blockText.substring(0, 200) + (blockText.length > 200 ? '...' : ''),
    description,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clé de stockage pour les anomalies d'un chapitre.
 */
function getAnomalyStorageKey(chapterId: string): string {
  return `norya-anomalies-${chapterId}`;
}

/**
 * Charge les anomalies pour un chapitre.
 */
export async function loadChapterAnomalies(chapterId: string): Promise<AnomalyReport[]> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const request = indexedDB.open('norya-anomalies', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('anomalies');
      request.onerror = () => resolve([]);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('anomalies', 'readonly');
        const store = transaction.objectStore('anomalies');
        const key = getAnomalyStorageKey(chapterId);
        const getRequest = store.get(key);
        
        getRequest.onerror = () => resolve([]);
        getRequest.onsuccess = () => {
          const anomalies = (getRequest.result as AnomalyReport[]) || [];
          db.close();
          resolve(anomalies);
        };
      };
    });
  } else {
    try {
      const stored = await AsyncStorage.getItem(getAnomalyStorageKey(chapterId));
      return stored ? JSON.parse(stored) as AnomalyReport[] : [];
    } catch {
      return [];
    }
  }
}

/**
 * Sauvegarde une anomalie pour un chapitre.
 */
export async function saveAnomaly(anomaly: AnomalyReport): Promise<void> {
  const chapterId = anomaly.chapterId;
  
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('norya-anomalies', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('anomalies');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('anomalies', 'readwrite');
        const store = transaction.objectStore('anomalies');
        const key = getAnomalyStorageKey(chapterId);
        
        // Charger les anomalies existantes
        const getRequest = store.get(key);
        getRequest.onsuccess = () => {
          const anomalies = (getRequest.result as AnomalyReport[]) || [];
          
          // Trouver l'index de l'anomalie existante
          const existingIndex = anomalies.findIndex(a => a.id === anomaly.id);
          
          if (existingIndex !== -1) {
            // Mettre à jour l'anomalie existante
            anomalies[existingIndex] = anomaly;
          } else {
            // Ajouter la nouvelle anomalie
            anomalies.push(anomaly);
          }
          
          // Sauvegarder
          const putRequest = store.put(anomalies, key);
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
        getRequest.onerror = () => { db.close(); reject(getRequest.error); };
      };
    });
  } else {
    try {
      const key = getAnomalyStorageKey(chapterId);
      const stored = await AsyncStorage.getItem(key);
      const anomalies: AnomalyReport[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = anomalies.findIndex(a => a.id === anomaly.id);
      if (existingIndex !== -1) {
        anomalies[existingIndex] = anomaly;
      } else {
        anomalies.push(anomaly);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(anomalies));
    } catch (error) {
      console.error('Erreur de sauvegarde de l\'anomalie :', error);
      throw error;
    }
  }
}

/**
 * Supprime une anomalie.
 */
export async function deleteAnomaly(chapterId: string, anomalyId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('norya-anomalies', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('anomalies');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('anomalies', 'readwrite');
        const store = transaction.objectStore('anomalies');
        const key = getAnomalyStorageKey(chapterId);
        
        const getRequest = store.get(key);
        getRequest.onsuccess = () => {
          const anomalies = (getRequest.result as AnomalyReport[]) || [];
          const filtered = anomalies.filter(a => a.id !== anomalyId);
          
          const putRequest = store.put(filtered, key);
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
        getRequest.onerror = () => { db.close(); reject(getRequest.error); };
      };
    });
  } else {
    try {
      const key = getAnomalyStorageKey(chapterId);
      const stored = await AsyncStorage.getItem(key);
      const anomalies: AnomalyReport[] = stored ? JSON.parse(stored) : [];
      const filtered = anomalies.filter(a => a.id !== anomalyId);
      
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Erreur de suppression de l\'anomalie :', error);
      throw error;
    }
  }
}

/**
 * Exporte toutes les anomalies d'un chapitre vers un rapport JSON structuré.
 * Ce rapport peut être utilisé par une IA pour corriger les erreurs.
 */
export function exportAnomaliesToJSON(anomalies: AnomalyReport[]): string {
  const report: ChapterAnomalyReport = {
    chapterId: anomalies[0]?.chapterId || 'unknown',
    manual: anomalies[0]?.manual || 'unknown',
    anomalies: anomalies.map(a => ({
      id: a.id,
      chapterId: a.chapterId,
      manual: a.manual,
      printedPage: a.printedPage,
      pdfPage: a.pdfPage,
      blockId: a.blockId,
      blockRole: a.blockRole,
      blockTextPreview: a.blockTextPreview,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    total: anomalies.length,
    open: anomalies.filter(a => a.status === 'open').length,
    correctedPendingReview: anomalies.filter(a => a.status === 'corrected-pending-review').length,
    resolved: anomalies.filter(a => a.status === 'resolved').length,
    generatedAt: new Date().toISOString(),
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Exporte toutes les anomalies d'un chapitre vers un rapport Markdown lisible.
 * Ce rapport peut être copié-collé pour une IA.
 */
export function exportAnomaliesToMarkdown(anomalies: AnomalyReport[]): string {
  const lines: string[] = [
    `# Rapport d'anomalies - Chapitre ${anomalies[0]?.chapterId || 'unknown'}`,
    `**Manuel** : ${anomalies[0]?.manual || 'unknown'}`,
    `**Date** : ${new Date().toISOString()}`,
    `**Total** : ${anomalies.length} anomalies`,
    `**Ouvertes** : ${anomalies.filter(a => a.status === 'open').length}`,
    `**À revérifier** : ${anomalies.filter(a => a.status === 'corrected-pending-review').length}`,
    `**Résolues** : ${anomalies.filter(a => a.status === 'resolved').length}`,
    ``,
    `---`,
    ``,
    `## 📋 Liste des anomalies`,
    ``,
  ];
  
  // Grouper par page
  const anomaliesByPage: Record<number, AnomalyReport[]> = {};
  for (const anomaly of anomalies) {
    if (!anomaliesByPage[anomaly.printedPage]) {
      anomaliesByPage[anomaly.printedPage] = [];
    }
    anomaliesByPage[anomaly.printedPage].push(anomaly);
  }
  
  for (const [page, pageAnomalies] of Object.entries(anomaliesByPage)) {
    lines.push(`### Page ${page}`);
    lines.push(``);
    
    for (const anomaly of pageAnomalies) {
      const statusIcon = anomaly.status === 'open' ? '🔴' :
                         anomaly.status === 'corrected-pending-review' ? '🟡' : '🟢';
      lines.push(`#### ${statusIcon} Bloc : ${anomaly.blockId} (${anomaly.blockRole})`);
      lines.push(`- **PDF Page** : ${anomaly.pdfPage}`);
      lines.push(`- **Statut** : ${anomaly.status}`);
      lines.push(`- **Date** : ${anomaly.createdAt}`);
      lines.push(`- **Aperçu** : ${anomaly.blockTextPreview}`);
      lines.push(`- **Description** : ${anomaly.description}`);
      lines.push(``);
    }
  }
  
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 📌 Instructions pour l'IA`);
  lines.push(``);
  lines.push(`Pour chaque anomalie :`);
  lines.push(`1. Retrouvez le passage dans le PDF original (page imprimée: ${anomalies[0]?.printedPage}, PDF: ${anomalies[0]?.pdfPage})`);
  lines.push(`2. Comparez avec le texte actuel du cours Norya`);
  lines.push(`3. Appliquez la correction **exactement** comme décrit`);
  lines.push(`4. **Ne reformulez jamais** le contenu médical`);
  lines.push(`5. **Ne modifiez pas** les passages déjà marqués comme "verified"`);
  lines.push(`6. Après correction, passez le statut à "corrected-pending-review"`);
  lines.push(`7. **Ne supprimez jamais** les commentaires ou validations existantes`);
  lines.push(``);
  lines.push(`⚠️ **RÈGLE ABSOLUE** : Utilisez UNIQUEMENT le texte du PDF original comme source de vérité.`);
  
  return lines.join('\n');
}

/**
 * Génère un rapport combiné (JSON + Markdown) dans un seul objet.
 */
export function generateFullAnomalyReport(anomalies: AnomalyReport[]): {
  json: string;
  markdown: string;
  chapterId: string;
  manual: string;
} {
  return {
    json: exportAnomaliesToJSON(anomalies),
    markdown: exportAnomaliesToMarkdown(anomalies),
    chapterId: anomalies[0]?.chapterId || 'unknown',
    manual: anomalies[0]?.manual || 'unknown',
  };
}
