"use strict";
/**
 * Types et fonctions pour la gestion des anomalies de vérification.
 * Ce module permet de documenter, sauvegarder et exporter les anomalies
 * détectées lors de la vérification manuelle des cours source.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnomalyId = generateAnomalyId;
exports.createAnomalyReport = createAnomalyReport;
exports.loadChapterAnomalies = loadChapterAnomalies;
exports.saveAnomaly = saveAnomaly;
exports.deleteAnomaly = deleteAnomaly;
exports.exportAnomaliesToJSON = exportAnomaliesToJSON;
exports.exportAnomaliesToMarkdown = exportAnomaliesToMarkdown;
exports.generateFullAnomalyReport = generateFullAnomalyReport;
// Détection de la plateforme - fonctionne dans React Native et Node.js
let Platform;
try {
    const RN = require('react-native');
    Platform = RN.Platform;
}
catch {
    // Dans Node.js ou environnement non-RN, on détecte via user agent
    Platform = { OS: 'web' };
}
// AsyncStorage - stub pour Node.js
let AsyncStorage;
try {
    const storage = require('@react-native-async-storage/async-storage');
    AsyncStorage = storage.default ?? storage;
}
catch {
    // Dans Node.js, AsyncStorage n'est pas disponible
    AsyncStorage = {
        getItem: async () => null,
        setItem: async () => { },
    };
}
/**
 * Génère un identifiant unique pour une anomalie.
 * Utilise un timestamp + blockId pour garantir l'unicité.
 */
function generateAnomalyId(blockId) {
    return `anomaly-${Date.now()}-${Math.random().toString(36).slice(2)}-${blockId}`;
}
/**
 * Crée un nouveau rapport d'anomalie.
 */
function createAnomalyReport(chapterId, manual, printedPage, pdfPage, blockId, blockRole, blockText, description) {
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
function getAnomalyStorageKey(chapterId) {
    return `norya-anomalies-${chapterId}`;
}
/**
 * Charge les anomalies pour un chapitre.
 */
async function loadChapterAnomalies(chapterId) {
    const { loadValidation } = await Promise.resolve().then(() => __importStar(require('./verification')));
    const validation = await loadValidation(chapterId);
    if (validation?.anomalies)
        return validation.anomalies;
    if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('norya-anomalies', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('anomalies');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction('anomalies', 'readonly');
                const store = transaction.objectStore('anomalies');
                const key = getAnomalyStorageKey(chapterId);
                const getRequest = store.get(key);
                getRequest.onerror = () => { db.close(); reject(getRequest.error); };
                getRequest.onsuccess = () => {
                    const anomalies = getRequest.result || [];
                    db.close();
                    resolve(anomalies);
                };
            };
        });
    }
    else {
        try {
            const stored = await AsyncStorage.getItem(getAnomalyStorageKey(chapterId));
            return stored ? JSON.parse(stored) : [];
        }
        catch (error) {
            throw error;
        }
    }
}
/**
 * Sauvegarde une anomalie pour un chapitre.
 */
async function saveAnomaly(anomaly) {
    const chapterId = anomaly.chapterId;
    const { loadValidation, saveValidation } = await Promise.resolve().then(() => __importStar(require('./verification')));
    const validation = await loadValidation(chapterId);
    if (validation?.anomalies) {
        const anomalies = [...validation.anomalies];
        const index = anomalies.findIndex(a => a.id === anomaly.id);
        if (index < 0)
            anomalies.push(anomaly);
        else
            anomalies[index] = anomaly;
        await saveValidation({ ...validation, anomalies });
        return;
    }
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
                    const anomalies = getRequest.result || [];
                    // Trouver l'index de l'anomalie existante
                    const existingIndex = anomalies.findIndex(a => a.id === anomaly.id);
                    if (existingIndex !== -1) {
                        // Mettre à jour l'anomalie existante
                        anomalies[existingIndex] = anomaly;
                    }
                    else {
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
    }
    else {
        try {
            const key = getAnomalyStorageKey(chapterId);
            const stored = await AsyncStorage.getItem(key);
            const anomalies = stored ? JSON.parse(stored) : [];
            const existingIndex = anomalies.findIndex(a => a.id === anomaly.id);
            if (existingIndex !== -1) {
                anomalies[existingIndex] = anomaly;
            }
            else {
                anomalies.push(anomaly);
            }
            await AsyncStorage.setItem(key, JSON.stringify(anomalies));
        }
        catch (error) {
            console.error('Erreur de sauvegarde de l\'anomalie :', error);
            throw error;
        }
    }
}
/**
 * Supprime une anomalie.
 */
async function deleteAnomaly(chapterId, anomalyId) {
    const { loadValidation, saveValidation } = await Promise.resolve().then(() => __importStar(require('./verification')));
    const validation = await loadValidation(chapterId);
    if (validation?.anomalies) {
        await saveValidation({ ...validation, anomalies: validation.anomalies.filter(a => a.id !== anomalyId) });
        return;
    }
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
                    const anomalies = getRequest.result || [];
                    const filtered = anomalies.filter(a => a.id !== anomalyId);
                    const putRequest = store.put(filtered, key);
                    transaction.oncomplete = () => { db.close(); resolve(); };
                    transaction.onerror = () => { db.close(); reject(transaction.error); };
                };
                getRequest.onerror = () => { db.close(); reject(getRequest.error); };
            };
        });
    }
    else {
        try {
            const key = getAnomalyStorageKey(chapterId);
            const stored = await AsyncStorage.getItem(key);
            const anomalies = stored ? JSON.parse(stored) : [];
            const filtered = anomalies.filter(a => a.id !== anomalyId);
            await AsyncStorage.setItem(key, JSON.stringify(filtered));
        }
        catch (error) {
            console.error('Erreur de suppression de l\'anomalie :', error);
            throw error;
        }
    }
}
/**
 * Exporte toutes les anomalies d'un chapitre vers un rapport JSON structuré.
 * Ce rapport peut être utilisé par une IA pour corriger les erreurs.
 */
function exportAnomaliesToJSON(anomalies) {
    const report = {
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
            descriptionHistory: a.descriptionHistory,
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
function exportAnomaliesToMarkdown(anomalies) {
    const lines = [
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
    const anomaliesByPage = {};
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
            for (const previous of anomaly.descriptionHistory ?? []) {
                lines.push(`- **Commentaire précédent (${previous.updatedAt})** : ${previous.description}`);
            }
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
function generateFullAnomalyReport(anomalies) {
    return {
        json: exportAnomaliesToJSON(anomalies),
        markdown: exportAnomaliesToMarkdown(anomalies),
        chapterId: anomalies[0]?.chapterId || 'unknown',
        manual: anomalies[0]?.manual || 'unknown',
    };
}
