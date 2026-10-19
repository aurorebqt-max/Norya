"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateChapterStats = calculateChapterStats;
exports.initializeValidationFromControlReport = initializeValidationFromControlReport;
exports.updateBlockValidation = updateBlockValidation;
exports.loadValidation = loadValidation;
exports.saveValidation = saveValidation;
exports.deleteValidation = deleteValidation;
exports.exportValidation = exportValidation;
exports.importValidation = importValidation;
exports.generateProgressReport = generateProgressReport;
exports.filterBlocksByPriority = filterBlocksByPriority;
exports.getAnomalyCount = getAnomalyCount;
exports.reviewBlock = reviewBlock;
exports.saveBlockReview = saveBlockReview;
exports.reconcileReviewValidation = reconcileReviewValidation;
const reviewNavigation_1 = require("./reviewNavigation");
const react_native_1 = require("react-native");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
/** Clé de stockage pour les validations */
const STORAGE_KEY_PREFIX = 'norya-validation-';
/**
 * Calcule le statut d'une page à partir de ses blocs.
 * Une page est 'verified' si TOUS ses blocs sont 'verified' ou 'corrected'.
 * Une page est 'in-progress' si au moins un bloc n'est pas 'pending'.
 * Une page est 'not-started' si tous les blocs sont 'pending'.
 */
function calculatePageStatus(blocks) {
    if (blocks.length === 0)
        return 'not-started';
    const allPending = blocks.every(b => b.status === 'pending');
    const allVerified = blocks.every(b => b.status === 'verified' || b.status === 'corrected');
    if (allVerified)
        return 'verified';
    if (allPending)
        return 'not-started';
    return 'in-progress';
}
/**
 * Calcule les statistiques globales pour un chapitre.
 */
function calculateChapterStats(pages) {
    const allBlocks = pages.flatMap(p => p.blocks);
    const verifiedBlocks = allBlocks.filter(b => b.status === 'verified' || b.status === 'corrected').length;
    const activePages = pages.filter(p => p.blocks.length > 0);
    const verifiedPages = activePages.filter(p => p.status === 'verified').length;
    const highPriorityBlocks = allBlocks.filter(b => b.issueDescription?.includes('high') ||
        (b.notes && b.notes.includes('high'))).length;
    const mediumPriorityBlocks = allBlocks.filter(b => b.issueDescription?.includes('medium') ||
        (b.notes && b.notes.includes('medium'))).length;
    return {
        complete: activePages.length > 0 && verifiedPages === activePages.length,
        verifiedPages,
        totalPages: activePages.length,
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
function initializeValidationFromControlReport(chapterId, controlReport) {
    const pages = [];
    for (const page of controlReport.pages || []) {
        const blockValidations = [];
        for (const block of page.blocks || []) {
            blockValidations.push({
                id: block.id,
                page: page.printedPage,
                status: 'pending',
                notes: '',
                ...(['h1', 'h2', 'h3', 'h4', 'authors', 'toc', 'bibliography', 'table'].includes(block.suggestedKind) ? { kind: block.suggestedKind } : {}),
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
function updateBlockValidation(validation, pageIndex, blockId, updates) {
    const page = validation.pages[pageIndex];
    if (!page)
        return validation;
    const blockIndex = page.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1)
        return validation;
    // Mettre à jour le bloc
    const updatedBlock = {
        ...page.blocks[blockIndex],
        ...updates,
        verifiedAt: updates.status === 'verified' || updates.status === 'corrected'
            ? new Date().toISOString()
            : undefined,
    };
    const updatedBlocks = [...page.blocks];
    updatedBlocks[blockIndex] = updatedBlock;
    const newStatus = calculatePageStatus(updatedBlocks);
    const updatedPage = {
        ...page,
        blocks: updatedBlocks,
        status: newStatus,
        verifiedAt: newStatus === 'verified'
            ? new Date().toISOString()
            : undefined,
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
function getStorageKey(chapterId) {
    return `${STORAGE_KEY_PREFIX}${chapterId}`;
}
/**
 * Charge les données de validation pour un chapitre.
 * Si aucune donnée n'existe, initialise à partir des données de contrôle.
 */
async function loadValidation(chapterId, controlReport) {
    if (react_native_1.Platform.OS === 'web') {
        // Version web : utiliser IndexedDB
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('norya-validations', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('validations');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction('validations', 'readonly');
                const store = transaction.objectStore('validations');
                const getRequest = store.get(chapterId);
                getRequest.onerror = () => { db.close(); reject(getRequest.error); };
                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        resolve(getRequest.result);
                    }
                    else if (controlReport) {
                        const initialized = initializeValidationFromControlReport(chapterId, controlReport);
                        // Sauvegarder pour les prochaines fois
                        const saveTransaction = db.transaction('validations', 'readwrite');
                        const saveStore = saveTransaction.objectStore('validations');
                        saveStore.put(initialized, chapterId);
                        saveTransaction.oncomplete = () => resolve(initialized);
                        saveTransaction.onerror = () => resolve(initialized);
                    }
                    else {
                        resolve(null);
                    }
                    db.close();
                };
            };
        });
    }
    else {
        // Version mobile : utiliser AsyncStorage
        try {
            const stored = await async_storage_1.default.getItem(getStorageKey(chapterId));
            if (stored) {
                return JSON.parse(stored);
            }
            else if (controlReport) {
                const initialized = initializeValidationFromControlReport(chapterId, controlReport);
                await saveValidation(initialized);
                return initialized;
            }
            return null;
        }
        catch (error) {
            throw error;
        }
    }
}
/**
 * Sauvegarde les données de validation pour un chapitre.
 */
async function saveValidation(validation) {
    if (react_native_1.Platform.OS === 'web') {
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
                transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Transaction annulée')); };
            };
        });
    }
    else {
        try {
            await async_storage_1.default.setItem(getStorageKey(validation.chapterId), JSON.stringify(validation));
        }
        catch (error) {
            console.error('Erreur de sauvegarde de la validation :', error);
            throw error;
        }
    }
}
/**
 * Supprime les données de validation pour un chapitre.
 */
async function deleteValidation(chapterId) {
    if (react_native_1.Platform.OS === 'web') {
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
                transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Transaction annulée')); };
            };
        });
    }
    else {
        try {
            await async_storage_1.default.removeItem(getStorageKey(chapterId));
        }
        catch (error) {
            console.error('Erreur de suppression de la validation :', error);
        }
    }
}
/**
 * Exporte les données de validation pour sauvegarde.
 */
async function exportValidation(chapterId) {
    const validation = await loadValidation(chapterId);
    return validation ? JSON.stringify(validation, null, 2) : null;
}
/**
 * Importe des données de validation précédemment exportées.
 */
async function importValidation(data) {
    try {
        const validation = JSON.parse(data);
        await saveValidation(validation);
        return validation;
    }
    catch {
        return null;
    }
}
/**
 * Génère un rapport de progression au format lisible.
 */
function generateProgressReport(validation) {
    const lines = [
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
    lines.push(``, `Priorités :`, `  Haute : ${validation.highPriorityBlocks} blocs à vérifier`, `  Moyenne : ${validation.mediumPriorityBlocks} blocs`);
    return lines.join('\n');
}
/**
 * Filtrage des blocs par priorité ou statut.
 */
function filterBlocksByPriority(validation, priority) {
    const result = [];
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
function getAnomalyCount(validation) {
    // Ce sera intégré avec les données du control-report
    // Pour l'instant, on retourne 0
    return { high: 0, medium: 0, total: 0 };
}
/** Calcule la nouvelle validation (statut + anomalies) sans écrire. */
function reviewBlock(validation, anomalies, printedPage, blockId, status, anomaly, mode = 'create') {
    const pageIndex = validation.pages.findIndex(p => p.printedPage === printedPage);
    if (pageIndex < 0 || !validation.pages[pageIndex].blocks.some(b => b.id === blockId)) {
        throw new Error('Bloc de validation introuvable');
    }
    const matches = (a) => a.chapterId === validation.chapterId &&
        a.printedPage === printedPage && a.blockId === blockId;
    if (anomaly && (!matches(anomaly) || status !== 'issue-found' || anomaly.status !== 'open')) {
        throw new Error('Anomalie incompatible avec le bloc');
    }
    const history = validation.anomalies ?? anomalies;
    const updated = updateBlockValidation(validation, pageIndex, blockId, { status });
    updated.anomalies = history.map(a => status === 'verified' && matches(a) && a.status !== 'resolved'
        ? { ...a, status: 'resolved', updatedAt: updated.lastUpdatedAt } : a);
    if (anomaly) {
        const index = history.findIndex(a => a.id === anomaly.id && (mode === 'create' || matches(a)));
        if (mode === 'edit') {
            const previous = history[index];
            if (!previous || !matches(previous) || previous.status === 'resolved') {
                throw new Error('Anomalie active introuvable pour ce bloc');
            }
            const descriptionHistory = previous.description !== anomaly.description
                ? [...(previous.descriptionHistory ?? []), { description: previous.description, updatedAt: previous.updatedAt }]
                : previous.descriptionHistory;
            updated.anomalies[index] = { ...previous, description: anomaly.description,
                descriptionHistory, status: 'open', updatedAt: updated.lastUpdatedAt };
        }
        else {
            if (index >= 0)
                throw new Error('Identifiant déjà utilisé');
            updated.anomalies.push(anomaly);
        }
    }
    return updated;
}
/** Une seule écriture contient la validation et tout l'historique des anomalies. */
async function saveBlockReview(validation, anomalies, printedPage, blockId, status, anomaly, mode = 'create') {
    const updated = reviewBlock(validation, anomalies, printedPage, blockId, status, anomaly, mode);
    await saveValidation(updated);
    return updated;
}
/** Add newly imported blocks by stable page/id without discarding any saved record. */
function reconcileReviewValidation(validation, packet) {
    if (!validation)
        return initializeValidationFromControlReport(packet.chapterId, {
            pages: packet.pages.map(page => ({ ...page, blocks: (0, reviewNavigation_1.reviewBlocks)(page) })),
        });
    const pages = validation.pages.map(page => ({ ...page, blocks: [...page.blocks] }));
    for (const source of packet.pages) {
        let page = pages.find(p => p.printedPage === source.printedPage);
        if (!page) {
            page = { printedPage: source.printedPage, pdfPage: source.pdfPage, status: 'not-started', blocks: [] };
            pages.push(page);
        }
        for (const block of (0, reviewNavigation_1.reviewBlocks)(source)) {
            if (!page.blocks.some(b => b.id === block.id)) {
                page.blocks.push({ id: block.id, page: source.printedPage, status: 'pending', kind: block.suggestedKind });
            }
        }
        page.status = calculatePageStatus(page.blocks);
        if (page.status !== 'verified')
            page.verifiedAt = undefined;
    }
    return { ...validation, pages, merges: validation.merges, mergeLog: validation.mergeLog, ...calculateChapterStats(pages) };
}
