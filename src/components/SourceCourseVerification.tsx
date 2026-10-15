import { reviewBlocks, reviewKey, reviewTargets, filterReviewTargets, selectReviewTarget, isVerified, type ReviewFilter, type ReviewTarget } from '../domain/sourceCourse/reviewNavigation';
import { SourcePresentationText } from './SourcePresentationText';
import { reconcileReviewValidation, saveBlockReview, updateBlockValidation, saveValidation } from '../domain/sourceCourse/verification';
/**
 * Composant de vérification de fidélité pour les cours source.
 * Permet de vérifier côte à côte le texte extrait et le visuel PDF,
 * de marquer les blocs comme vérifiés, et de naviguer entre les anomalies.
 */

import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, Txt } from './ui';
import { colors as c } from '../design/theme';
import { sourcePresentation } from '../domain/sourceCourse/displayCorrections';
import type { SourcePacket, SourcePart } from '../domain/sourceCourse/packet';
import { openOriginalPage } from '../services/storage/privateCourse';
import {
  ChapterValidation,
  BlockValidationStatus,
  loadChapterValidation,
  getPagesWithAnomalies,
  AnomalyReport,
  AnomalyStatus,
  createAnomalyReport,
  loadChapterAnomalies,
  exportAnomaliesToJSON,
  exportAnomaliesToMarkdown,
  generateFullAnomalyReport,
} from '../services/storage/sourceValidation';

// Rôles des blocs - même définition que dans PrivateSourceCourse
const roles: Record<string, string> = {
  heading: 'Titre',
  paragraph: 'Paragraphe',
  list: 'Liste',
  table: 'Tableau',
  figure: 'Illustration',
  box: 'Encadré',
  contents: 'Sommaire original',
  'chapter-title': 'Titre du chapitre',
  'section-title': 'Titre de section',
  'page-header': 'En-tête original',
  'uncertain-text': 'Passage incertain'
};

// Composant OriginalVisual - même que dans PrivateSourceCourse
function OriginalVisual({ image, ratio, wide, label }: { image: string; ratio: number; wide: boolean; label: string }) {
  const [container, setContainer] = useState(280);
  const [zoom, setZoom] = useState(false);
  const size = zoom ? Math.max(container * 1.5, 1000) : wide ? Math.max(container, 720) : container;
  return (
    <View style={{ gap: 8, maxWidth: '100%' }} onLayout={e => setContainer(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator testID="source-visual-scroll">
        <Image
          source={{ uri: image }}
          accessibilityLabel={label}
          resizeMode="contain"
          style={{ width: size, height: size * ratio }}
        />
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => setZoom(!zoom)} style={{ paddingVertical: 8 }}>
        <Txt size={12} color={c.primary}>
          {zoom ? 'Réduire le visuel' : 'Agrandir le visuel'}{wide ? ' · défilement horizontal' : ''}
        </Txt>
      </Pressable>
    </View>
  );
}

// Couleurs des statuts
const statusColors: Record<BlockValidationStatus, string> = {
  pending: c.muted,
  'in-review': c.peach, // Orange clair
  verified: c.primary, // Vert
  'issue-found': '#dc3545', // Rouge
  corrected: c.primary, // Vert
};

const statusLabels: Record<BlockValidationStatus, string> = {
  pending: 'À vérifier',
  'in-review': 'En cours',
  verified: 'Vérifié ✓',
  'issue-found': 'Anomalie !',
  corrected: 'Vérifié ✓',
};

const statusIcons: Record<BlockValidationStatus, string> = {
  pending: '○',
  'in-review': '◐',
  verified: '✓',
  'issue-found': '!',
  corrected: '✓',
};

/** Props du composant */
interface SourceCourseVerificationProps {
  packet: SourcePacket;
  controlReport?: any;
  onClose: () => void;
}

/**
 * Composant de vérification de fidélité.
 */
export function SourceCourseVerification({ packet, controlReport, onClose }: SourceCourseVerificationProps) {
  const [validation, setValidation] = useState<ChapterValidation | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('pending');
  const [pageNotice, setPageNotice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'text' | 'visual'>('split');
  const [filter, setFilter] = useState<'anomalies' | 'user-anomalies' | null>(null);
  const [showUserAnomalies, setShowUserAnomalies] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
const allTargets = reviewTargets(packet, validation, anomalies);
   
   // Filtrer les cibles pour exclure les blocs marqués comme fusionnés dans le précédent
   const filteredTargets = allTargets.filter(target => {
     const blockValidation = validation?.pages.find(p => p.printedPage === target.printedPage)
       ?.blocks.find(b => b.id === target.blockId);
     return !(blockValidation?.notes?.startsWith('MERGED_INTO_PREVIOUS:'));
   });
   
   const visibleTargets = filterReviewTargets(filteredTargets, reviewFilter);
   const target = selectReviewTarget(filteredTargets, visibleTargets, selectedKey);
   const targetRef = useRef(target);
   targetRef.current = target;
   const currentPageIndex = target?.pageIndex ?? 0;
   const currentBlockIndex = target?.blockIndex ?? -1;

   const [draft, setDraftState] = useState<{ key: string; anomalyId?: string; description: string; session: number } | null>(null);
   const draftRef = useRef<typeof draft>(null);
   const draftSession = useRef(0);
   // État pour l'aperçu de fusion
   const [mergePreview, setMergePreview] = useState<{
     currentBlock: SourcePart | null;
     nextBlock: SourcePart | null;
     previewText: string;
     manualText: string;
     useSpace: boolean;
   } | null>(null);
   const [mergeSaving, setMergeSaving] = useState(false);
   const [mergeError, setMergeError] = useState<string | null>(null);
   const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  function setDraft(value: typeof draft) {
    draftRef.current = value;
    setDraftState(value);
  }
  const showCommentInput = draft !== null;
  const editingBlockKey = draft?.key;
  const commentInput = draft?.description ?? '';
  const currentAnomaly = anomalies.find(a => a.id === draft?.anomalyId && reviewKey(a.chapterId, a.printedPage, a.blockId) === draft.key);
  const latestValidation = useRef<ChapterValidation | null>(null);
  const mutationRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyStatus>('open');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWide = screenWidth >= 768;
  
  // Identifie une VRAIE illustration médicale (schéma chimique) qui doit rester en image
  // Une illustration a role='figure' ET un texte très court (symboles chimiques)
  const isTrueIllustration = (part: any) => part.role === 'figure' && part.text && part.text.trim().length < 200;
  
  // Load once before allowing writes; never race a temporary empty validation
  // against persisted data. Cancellation prevents an old load updating a new packet.
  useEffect(() => {
    let active = true;
    setLoaded(false);
    Promise.all([loadChapterValidation(), loadChapterAnomalies(packet.chapterId)])
      .then(([saved, reports]) => {
        if (!active) return;
        const v = reconcileReviewValidation(saved, packet);
        latestValidation.current = v;
        setValidation(v);
        setAnomalies(v.anomalies ?? reports);
        setLoaded(true);
      }).catch(() => {
        if (active) setSaveError('Impossible de charger les validations et anomalies. Réessayez en rouvrant la vérification.');
      });
    return () => { active = false; };
  }, [packet]);

  // Navigation discards only the unsaved editor, never persisted reports.
  useEffect(() => {
    if (target) setSelectedKey(target.key);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setDraft(null);
    setSaveError(null);
    setSaveSuccess(null);
  }, [target?.key, packet]);

  function selectTarget(next: ReviewTarget | undefined | null) {
    if (!next) return;
    setSelectedKey(next.key);
    setPageNotice(null);
    setShowPageSelector(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  function nextBlock() { selectTarget(visibleTargets[visibleTargets.findIndex(t => t.key === target?.key) + 1]); }
  function prevBlock() { selectTarget(visibleTargets[visibleTargets.findIndex(t => t.key === target?.key) - 1]); }
  function changeReviewFilter(next: ReviewFilter) {
    setReviewFilter(next);
    setFilter(null);
    setDraft(null);
    setPageNotice(null);
  }

  // Met à jour le statut d'un bloc
  async function handleBlockStatusChange(
    pageIndex: number,
    blockId: string,
    newStatus: BlockValidationStatus
  ) {
    const session = draftRef.current?.session;
    if (await commitReview(pageIndex, blockId, newStatus)) {
      if (draftRef.current?.session === session) closeAnomalyForm();
    }
  }

  async function commitReview(pageIndex: number, blockId: string, status: BlockValidationStatus, anomaly?: AnomalyReport, mode: 'create' | 'edit' = 'create') {
    const current = latestValidation.current;
    if (!current || !loaded || mutationRef.current) return false;
    mutationRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await saveBlockReview(current, anomalies,
        packet.pages[pageIndex].printedPage, blockId, status, anomaly, mode);
      latestValidation.current = updated;
      setValidation(updated);
      setAnomalies(updated.anomalies!);
      const page = packet.pages[pageIndex].printedPage;
      const updatedTargets = reviewTargets(packet, updated);
      if (status === 'verified' && updatedTargets.filter(t => t.printedPage === page).every(t => isVerified(t.status))) {
        setPageNotice(page);
      } else if (!isVerified(status)) {
        setPageNotice(previous => previous === page ? null : previous);
      }
      const previousBlock = current.pages.find(p => p.printedPage === page)?.blocks.find(b => b.id === blockId);
      if (status === 'issue-found' && previousBlock && isVerified(previousBlock.status) &&
          targetRef.current?.key === reviewKey(packet.chapterId, page, blockId)) {
        setReviewFilter('pending');
      }
      return true;
    } catch {
      setSaveError("Erreur lors de l'enregistrement. Veuillez réessayer.");
      return false;
    } finally {
      mutationRef.current = false;
      setSaving(false);
    }
  }
  
  function goToPage(pageIndex: number) {
    selectTarget(visibleTargets.find(t => t.pageIndex === pageIndex));
  }

  function blockKey(pageIndex: number, blockId: string) {
    return reviewKey(packet.chapterId, packet.pages[pageIndex].printedPage, blockId);
  }

  // A new report starts blank. Editing an existing report is an explicit choice.
  function openAnomalyForm(blockId: string, anomaly?: AnomalyReport) {
    const key = blockKey(currentPageIndex, blockId);
    if (!anomaly && draftRef.current?.key === key) return;
    setDraft({ key, anomalyId: anomaly?.id, description: anomaly?.description ?? '', session: ++draftSession.current });
    setSaveError(null);
    setSaveSuccess(null);
  }

  function closeAnomalyForm() { setDraft(null); }

  async function saveAnomalyDraft(pageIndex: number, blockId: string) {
    const editor = draftRef.current;
    if (!editor || editor.key !== blockKey(pageIndex, blockId) || !editor.description.trim()) return;
    const page = packet.pages[pageIndex];
    const block = reviewBlocks(page).find(p => p.id === blockId);
    if (!block) return;
    const existing = anomalies.find(a => a.id === editor.anomalyId && reviewKey(a.chapterId, a.printedPage, a.blockId) === editor.key);
    if (editor.anomalyId && !existing) return;
    const anomaly = existing ? { ...existing, description: editor.description, status: 'open' as const }
      : createAnomalyReport(packet.chapterId, 'Kumar', page.printedPage, page.pdfPage,
        blockId, block.role, block.text, editor.description);
    if (await commitReview(pageIndex, blockId, 'issue-found', anomaly, existing ? 'edit' : 'create')) {
      // A completed save must not close a different block's newly opened editor.
      if (draftRef.current?.session === editor.session) {
        closeAnomalyForm();
        setSaveSuccess('Anomalie enregistrée avec succès !');
      }
    }
  }

  function renderAnomalyForm(pageIndex: number, blockId: string) {
    if (!draft || editingBlockKey !== blockKey(pageIndex, blockId)) return null;
    const existing = anomalies.filter(a => a.chapterId === packet.chapterId &&
      a.printedPage === packet.pages[pageIndex].printedPage && a.blockId === blockId && a.status !== 'resolved');
    return <View style={{ marginTop: 12, gap: 8, width: '100%' }}>
      <Txt size={13} bold>{currentAnomaly ? "Modifier l'anomalie" : 'Nouvelle anomalie'}</Txt>
      {existing.map((a, i) => <Button key={a.id} title={`Modifier l’anomalie ${i + 1}`}
        secondary disabled={saving} onPress={() => openAnomalyForm(blockId, a)} />)}
      {currentAnomaly && <Button title="Nouvelle anomalie" secondary disabled={saving}
        onPress={() => { closeAnomalyForm(); openAnomalyForm(blockId); }} />}
      <TextInput multiline numberOfLines={4} accessibilityLabel="Description de l’anomalie"
        placeholder="Décrivez l’anomalie…" value={commentInput} editable={!saving}
        onChangeText={description => {
          if (draftRef.current && !mutationRef.current) setDraft({ ...draftRef.current, description });
        }}
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12,
          fontSize: 15, color: c.ink, backgroundColor: c.paper, minHeight: 100, width: '100%' }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={currentAnomaly ? 'Mettre à jour' : 'Enregistrer'} secondary
          disabled={!loaded || saving || !commentInput.trim()} onPress={() => saveAnomalyDraft(pageIndex, blockId)} />
        <Button title="Annuler" secondary onPress={closeAnomalyForm} />
      </View>
    </View>;
  }

  // Génère un rapport complet des anomalies
  function generateAnomalyReport() {
    return generateFullAnomalyReport(anomalies);
  }
  
  // Compte les anomalies par statut
  function getAnomalyCounts() {
    return {
      total: anomalies.length,
      open: anomalies.filter(a => a.status === 'open').length,
      correctedPendingReview: anomalies.filter(a => a.status === 'corrected-pending-review').length,
      resolved: anomalies.filter(a => a.status === 'resolved').length,
    };
  }
  
  // Exporte les anomalies vers un fichier
  async function exportAnomalies() {
    const report = generateAnomalyReport();
    
    if (Platform.OS === 'web') {
      // Sur web, télécharger le fichier
      const jsonBlob = new Blob([report.json], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `norya-anomalies-${report.chapterId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);
      
      const mdBlob = new Blob([report.markdown], { type: 'text/markdown' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const mdLink = document.createElement('a');
      mdLink.href = mdUrl;
      mdLink.download = `norya-anomalies-${report.chapterId}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(mdLink);
      mdLink.click();
      document.body.removeChild(mdLink);
      URL.revokeObjectURL(mdUrl);
      
      setSaveSuccess('Export terminé ! 2 fichiers téléchargés (JSON + Markdown)');
      setTimeout(() => setSaveSuccess(null), 5000);
    } else {
      // Sur mobile, retourner le rapport pour traitement natif
      setShowExportModal(true);
    }
  }
  
  // Filtrage des pages avec anomalies
  function getAnomalyPages() {
    if (!validation || !controlReport) return [];
    return getPagesWithAnomalies(validation, controlReport);
  }
  
   // Obtenir les blocs de la page actuelle
   // On filtre les blocs décoratifs qui n'ont pas besoin de vérification textuelle
   function getCurrentBlocks() {
     if (!packet.pages[currentPageIndex]) return [];
     // Exclure les page-header qui sont des en-têtes de page sans contenu utile
     return reviewBlocks(packet.pages[currentPageIndex]);
   }
  
  // Obtenir le statut d'un bloc
  function getCurrentBlockStatus(blockId: string): BlockValidationStatus {
    return allTargets.find(t => t.pageIndex === currentPageIndex && t.blockId === blockId)?.status ?? 'pending';
  }
  
  // Récupère le texte à afficher pour un bloc (en tenant compte des fusions)
   function getBlockDisplayText(block: any): string {
     const validation = latestValidation.current;
     if (!validation) return block.text;
     
     const pageIndex = validation.pages.findIndex(p => p.printedPage === block.page || p.printedPage === packet.pages[currentPageIndex]?.printedPage);
     if (pageIndex < 0) return block.text;
     
     const blockValidation = validation.pages[pageIndex].blocks.find(b => b.id === block.id);
     if (!blockValidation) return block.text;
     
     // Vérifier si ce bloc a été fusionné (notes commencent par FUSION DES BLOCS)
     if (blockValidation.notes && blockValidation.notes.startsWith('FUSION DES BLOCS')) {
       // Extraire le texte fusionné des notes : format "FUSION DES BLOCS a ET b: "texte""
       const colonIndex = blockValidation.notes.indexOf(':');
       if (colonIndex > 0) {
         const textAfterColon = blockValidation.notes.substring(colonIndex + 1).trim();
         // Supprimer les guillemets si présents
         if (textAfterColon.startsWith('"') && textAfterColon.endsWith('"')) {
           return textAfterColon.substring(1, textAfterColon.length - 1);
         }
         return textAfterColon;
       }
     }
     
     return block.text;
   }
  function getStats() {
    if (!validation) return null;
    const verifiedBlocks = allTargets.filter(t => isVerified(t.status)).length;
    const pages = packet.pages.filter(p => allTargets.some(t => t.printedPage === p.printedPage));
    const verifiedPages = pages.filter(p => allTargets.filter(t => t.printedPage === p.printedPage).every(t => isVerified(t.status))).length;
    return { verifiedBlocks, totalBlocks: allTargets.length, verifiedPages, totalPages: pages.length,
      progress: allTargets.length ? Math.round(100 * verifiedBlocks / allTargets.length) : 0,
      complete: allTargets.length > 0 && verifiedBlocks === allTargets.length };
  }
  
   // Vérifie si le bloc actuel peut être fusionné avec le suivant
   function canMergeWithNext(): boolean {
     if (!loaded || !packet.pages[currentPageIndex]) return false;
     
     const blocks = getCurrentBlocks();
     const currentBlock = blocks[currentBlockIndex];
     
     // Vérifier qu'il y a un bloc suivant
     if (currentBlockIndex + 1 >= blocks.length) return false;
     
     const nextBlock = blocks[currentBlockIndex + 1];
     
     // Ne pas fusionner les éléments structurés
     const structuredRoles = ['heading', 'table', 'figure', 'list', 'box', 'contents', 'chapter-title', 'section-title', 'page-header'];
     if (structuredRoles.includes(currentBlock.role) || structuredRoles.includes(nextBlock.role)) {
       return false;
     }
     
     // Autoriser la fusion entre paragraphes (peut être affiné selon les besoins)
     return currentBlock.role === 'paragraph' && nextBlock.role === 'paragraph';
   }
   
   // Ouvre le aperçu de fusion
   function openMergePreview() {
     if (!loaded || !packet.pages[currentPageIndex]) return;
     
     const blocks = getCurrentBlocks();
     const currentBlock = blocks[currentBlockIndex];
     const nextBlock = blocks[currentBlockIndex + 1];
     
     if (!currentBlock || !nextBlock) return;
     
     // Texte des deux blocs
     const currentText = currentBlock.text.trim();
     const nextText = nextBlock.text.trim();
     
     // Aperçu avec espace
     const previewWithSpace = currentText + ' ' + nextText;
     // Aperçu sans espace (pour les mots coupés)
     const previewWithoutSpace = currentText + nextText;
     
     setMergePreview({
       currentBlock,
       nextBlock,
       previewText: previewWithSpace, // Valeur par défaut
       manualText: previewWithSpace,  // Commence avec l'aperçu avec espace
       useSpace: true                 // Commence avec l'option espace
     });
   }
   
   // Ferme l'aperçu de fusion
   function closeMergePreview() {
     setMergePreview(null);
     setMergeError(null);
     setMergeSuccess(null);
   }
   
   // Gère le changement d'option (espace ou pas)
   function handleMergeOptionChange(useSpace: boolean) {
     setMergePreview(prev => {
       if (!prev) return prev;
       const { currentBlock, nextBlock } = prev;
       if (!currentBlock || !nextBlock) return prev;
       const currentText = currentBlock.text.trim();
       const nextText = nextBlock.text.trim();
       
       // Texte de base selon l'option
       const baseText = useSpace ? currentText + ' ' + nextText : currentText + nextText;
       
       return {
         ...prev,
         previewText: baseText,
         manualText: baseText, // Réinitialise le texte manuel
         useSpace
       };
     });
   }
   
   // Gère le changement du texte manuel
   function handleManualTextChange(text: string) {
     setMergePreview(prev => {
       if (!prev) return prev;
       return {
         ...prev,
         manualText: text
       };
     });
   }
   
   // Confirme la fusion
   async function confirmMerge() {
     if (!mergePreview || !loaded) return;
     
     setMergeSaving(true);
     setMergeError(null);
     setMergeSuccess(null);
     
     try {
       // Récupérer les blocs actuels
       const blocks = getCurrentBlocks();
       const currentBlock = blocks[currentBlockIndex];
       const nextBlock = blocks[currentBlockIndex + 1];
       
       if (!currentBlock || !nextBlock) {
         throw new Error('Blocs introuvables');
       }
       
       // Récupérer la validation actuelle
       const validation = latestValidation.current;
       if (!validation) throw new Error('Validation non disponible');
       
       // Trouver les index des blocs dans la validation
       const pageIndex = validation.pages.findIndex(p => p.printedPage === packet.pages[currentPageIndex].printedPage);
       if (pageIndex < 0) throw new Error('Page introuvable dans la validation');
       
       const currentBlockIndexInValidation = validation.pages[pageIndex].blocks.findIndex(b => b.id === currentBlock.id);
       const nextBlockIndexInValidation = validation.pages[pageIndex].blocks.findIndex(b => b.id === nextBlock.id);
       
       if (currentBlockIndexInValidation < 0 || nextBlockIndexInValidation < 0) {
         throw new Error('Bloc introuvable dans la validation');
       }
       
       // Préparer les descriptions
       const mergeDescription = `FUSION DES BLOCS ${currentBlock.id} ET ${nextBlock.id}: "${mergePreview.manualText}"`;
       const mergedIntoPrevious = `MERGED_INTO_PREVIOUS:${currentBlock.id}`;
       
       // Mettre à jour le premier bloc avec la description de fusion
       let updatedValidation = updateBlockValidation(
         validation,
         pageIndex,
         currentBlock.id,
         {
           notes: mergeDescription,
           // Préserver le statut actuel
           status: validation.pages[pageIndex].blocks[currentBlockIndexInValidation].status
         }
       );
       
       // Mettre à jour le deuxième bloc pour le marquer comme fusionné dans le précédent
       updatedValidation = updateBlockValidation(
         updatedValidation,
         pageIndex,
         nextBlock.id,
         {
           notes: mergedIntoPrevious,
           // Préserver le statut actuel
           status: updatedValidation.pages[pageIndex].blocks[nextBlockIndexInValidation].status
         }
       );
       
       // Sauvegarder la validation
       await saveValidation(updatedValidation);
       latestValidation.current = updatedValidation;
       setValidation(updatedValidation);
       
       setMergeSuccess('Fusion enregistrée avec succès !');
       
       // Fermer l'aperçu après un court délai
       setTimeout(() => {
         closeMergePreview();
       }, 1500);
       
     } catch (error) {
       console.error('Erreur lors de la fusion:', error);
       setMergeError('Erreur lors de l\'enregistrement de la fusion. Veuillez réessayer.');
     } finally {
       setMergeSaving(false);
     }
   }
   
   // Rendu du contenu en fonction du mode d'affichage
   function renderContent() {
    const page = packet.pages[currentPageIndex];
    const blocks = getCurrentBlocks();
    const currentBlock = blocks[currentBlockIndex];
    
    if (!page || !currentBlock) {
      return (
        <View style={{ padding: 20 }}>
          <Txt size={16} color={c.muted}>{!loaded ? 'Chargement…' : reviewFilter === 'pending'
              ? 'Tous les blocs sont vérifiés. Retrouvez-les dans « Vérifiés » ou « Tous ».'
              : reviewFilter === 'verified' ? 'Aucun bloc vérifié pour le moment.' : 'Aucun bloc dans ce cours.'}</Txt>
        </View>
      );
    }
    
    const blockStatus = getCurrentBlockStatus(currentBlock.id);
    const presentation = sourcePresentation(page.printedPage, currentBlock);
    const isIllustration = isTrueIllustration(currentBlock) || presentation.imageOnly;
    const showAsText = !isIllustration; // Dans vérification, on affiche le texte sauf pour les vraies illustrations
    
    // Mode split : texte + visuel
    if (viewMode === 'split') {
      return (
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 16, flex: 1 }}>
          {/* Texte ou illustration */}
          <View style={{ flex: 1, minWidth: isWide ? 300 : '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Chip
                label={statusLabels[blockStatus]}
                selected={false}
                onPress={() => {}}
              />
              <Txt size={12} color={c.muted}>
                Bloc {currentBlock.id} · {currentBlock.role}
              </Txt>
            </View>
            
             {showAsText ? (
               // Affiche le texte pour les blocs non-illustration
               <>
                 <ScrollView nestedScrollEnabled style={{ maxHeight: isWide ? 500 : 300 }}>
                   {presentation.contents ? (
                     <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
                       {presentation.contents.map((column, ci) => (
                         <View key={ci} style={{flex:1,minWidth:240,gap:6}}>
                           {column.map((entry, i) => (
                             <View key={i} style={{flexDirection:'row',gap:8,justifyContent:'space-between'}}>
                               <Text selectable style={{fontSize:16,color:c.ink,flex:1}}>{entry.label}</Text>
                               <Text selectable style={{fontSize:16,color:c.ink,minWidth:32,textAlign:'right'}}>{entry.page}</Text>
                             </View>
                           ))}
                         </View>
                       ))}
                     </View>
                   ) : (
                     <SourcePresentationText presentation={presentation} size={16} />
                   )}
                 </ScrollView>
                 
                 {/* Boutons de statut et de fusion */}
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: showCommentInput ? 0 : 12 }}>
                   {(['pending', 'in-review', 'verified', 'issue-found'] as BlockValidationStatus[]).map(status => {
                     const isAnomalie = status === 'issue-found';
                     return (
                       <Button
                         key={status}
                         disabled={!loaded || saving}
                         title={statusLabels[status]}
                         secondary={blockStatus !== status}
                         onPress={() => {
                           if (isAnomalie) {
                             // Pour "Anomalie", toujours ouvrir le formulaire
                             openAnomalyForm(currentBlock.id);
                           } else {
                             // Pour les autres statuts, juste changer le statut
                             // et fermer le formulaire si ouvert
                             return handleBlockStatusChange(currentPageIndex, currentBlock.id, status);
                           }
                         }}
                       />
                     );
                   })}
                   {/* Bouton de fusion */}
                   <Button
                     key="merge"
                     disabled={!loaded || saving || !canMergeWithNext()}
                     title="Fusionner avec le bloc suivant"
                     secondary
                     onPress={() => openMergePreview()}
                   />
                 </View>
               </>
             ) : (
              // Affiche l'illustration
              <View style={{ alignItems: 'center', gap: 8 }}>
                <OriginalVisual image={currentBlock.image} ratio={(currentBlock.bbox[3]-currentBlock.bbox[1])/(currentBlock.bbox[2]-currentBlock.bbox[0])}
                  wide={false} label={`${roles[currentBlock.role] || 'Illustration'} original`} />
                <Txt size={12} color={c.muted}>Illustration médicale - à vérifier visuellement</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: showCommentInput ? 0 : 12, justifyContent: 'center' }}>
                  {(['pending', 'in-review', 'verified', 'issue-found'] as BlockValidationStatus[]).map(status => {
                    const isAnomalie = status === 'issue-found';
                    return (
                      <Button
                        key={status}
                        disabled={!loaded || saving}
                        title={statusLabels[status]}
                        secondary={blockStatus !== status}
                        onPress={() => {
                          if (isAnomalie) {
                            openAnomalyForm(currentBlock.id);
                          } else {
                            return handleBlockStatusChange(currentPageIndex, currentBlock.id, status);
                          }
                        }}
                      />
                    );
                  })}
                </View>
                

              </View>
            )}
          </View>
          
          {/* Visuel original du PDF */}
          <View style={{ flex: 1, minWidth: isWide ? 300 : '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Txt size={13} bold>Visuel original (PDF)</Txt>
              <Pressable onPress={() => setViewMode('visual')}>
                <Txt size={12} color={c.primary}>Plein écran</Txt>
              </Pressable>
            </View>
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, overflow: 'hidden' }}>
              <Image
                source={{ uri: currentBlock.image }}
                resizeMode="contain"
                style={{ 
                  width: '100%', 
                  height: 400,
                  backgroundColor: c.bg
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              <Button
                title="Ouvrir le PDF"
                secondary
                onPress={() => openOriginalPage(page).catch(() => {})}
              />
            </View>
          </View>
        </View>
      );
    }
    
    // Mode visual : plein écran
    if (viewMode === 'visual') {
      return (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <Button title="← Retour" secondary onPress={() => setViewMode('split')} />
            <Chip label={statusLabels[blockStatus]} selected={false} onPress={() => {}} />
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
            <Image
              source={{ uri: currentBlock.image }}
              resizeMode="contain"
              style={{ 
                width: Math.min(screenWidth - 40, 800), 
                height: undefined,
                aspectRatio: (currentBlock.bbox[2] - currentBlock.bbox[0]) / (currentBlock.bbox[3] - currentBlock.bbox[1]),
                backgroundColor: c.bg
              }}
            />
          </ScrollView>
          <Button
            title="Ouvrir le PDF original"
            secondary
            onPress={() => openOriginalPage(page).catch(() => {})}
          />
        </View>
      );
    }
    
    // Mode text : texte seul
    if (viewMode === 'text') {
      return (
        <View style={{ padding: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Button title="← Retour" secondary onPress={() => setViewMode('split')} />
            <Chip label={statusLabels[blockStatus]} selected={false} onPress={() => {}} />
          </View>
          {showAsText ? (
            <>
              <ScrollView nestedScrollEnabled>
                {presentation.contents ? (
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
                      {presentation.contents.map((column, ci) => (
                        <View key={ci} style={{flex:1,minWidth:240,gap:6}}>
                          {column.map((entry, i) => (
                            <View key={i} style={{flexDirection:'row',gap:8,justifyContent:'space-between'}}>
                              <Text selectable style={{fontSize:18,color:c.ink,flex:1}}>{entry.label}</Text>
                              <Text selectable style={{fontSize:18,color:c.ink,minWidth:32,textAlign:'right'}}>{entry.page}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <SourcePresentationText presentation={presentation} size={18} />
                  )}
              </ScrollView>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(['pending', 'in-review', 'verified', 'issue-found'] as BlockValidationStatus[]).map(status => (
                  <Button
                    key={status}
                    disabled={!loaded || saving}
                    title={statusLabels[status]}
                    secondary={blockStatus !== status}
                    onPress={() => status === 'issue-found' ? openAnomalyForm(currentBlock.id) : handleBlockStatusChange(currentPageIndex, currentBlock.id, status)}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <OriginalVisual image={currentBlock.image} ratio={(currentBlock.bbox[3]-currentBlock.bbox[1])/(currentBlock.bbox[2]-currentBlock.bbox[0])}
                wide={false} label={`${roles[currentBlock.role] || 'Illustration'} original`} />
              <Txt size={12} color={c.muted}>Illustration médicale</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(['pending', 'in-review', 'verified', 'issue-found'] as BlockValidationStatus[]).map(status => (
                  <Button
                    key={status}
                    disabled={!loaded || saving}
                    title={statusLabels[status]}
                    secondary={blockStatus !== status}
                    onPress={() => status === 'issue-found' ? openAnomalyForm(currentBlock.id) : handleBlockStatusChange(currentPageIndex, currentBlock.id, status)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  }
  
  // Rendu de la navigation
  function renderNavigation() {
    const page = packet.pages[currentPageIndex];
    const blocks = getCurrentBlocks();
    const currentBlock = blocks[currentBlockIndex];
    const stats = getStats();
    
    return (
      <View style={{ gap: 12 }}>
        {/* Barre d'outils principale */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <Button
            title="Page précédente"
            secondary
            disabled={!visibleTargets.some(t => t.pageIndex < currentPageIndex)}
            onPress={() => {
              const previous = visibleTargets.filter(t => t.pageIndex < currentPageIndex).at(-1);
              if (previous) goToPage(previous.pageIndex);
            }}
          />
          <Button
            title={reviewFilter === 'pending' ? 'Bloc précédent à vérifier' : 'Bloc précédent'}
            secondary
            disabled={!target || visibleTargets[0]?.key === target.key}
            onPress={prevBlock}
          />
          <Button
            title={target ? `Page ${page?.printedPage || '?'} · Bloc ${currentBlockIndex + 1}/${blocks.length || 0}` : 'Choisir une page'}
            secondary
            onPress={() => setShowPageSelector(!showPageSelector)}
          />
          <Button
            title={reviewFilter === 'pending' ? 'Bloc suivant à vérifier' : 'Bloc suivant'}
            secondary
            disabled={!target || visibleTargets.at(-1)?.key === target.key}
            onPress={nextBlock}
          />
          <Button
            title="Page suivante"
            secondary
            disabled={!visibleTargets.some(t => t.pageIndex > currentPageIndex)}
            onPress={() => selectTarget(visibleTargets.find(t => t.pageIndex > currentPageIndex))}
          />
        </View>
        
        {/* Mode d'affichage */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Chip
            label="Split"
            selected={viewMode === 'split'}
            onPress={() => setViewMode('split')}
          />
          <Chip
            label="Texte"
            selected={viewMode === 'text'}
            onPress={() => setViewMode('text')}
          />
          <Chip
            label="Visuel"
            selected={viewMode === 'visual'}
            onPress={() => setViewMode('visual')}
          />
        </View>
        
        {/* Filtrage */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['pending', 'verified', 'all'] as ReviewFilter[]).map(mode => (
            <Chip key={mode} label={mode === 'pending' ? 'À traiter' : mode === 'verified' ? 'Vérifiés' : 'Tous'}
              selected={reviewFilter === mode} onPress={() => changeReviewFilter(mode)} />
          ))}
          {anomalies.length > 0 && (
            <Chip
              label={`Mes anomalies (${anomalies.length})`}
              selected={filter === 'user-anomalies'}
              onPress={() => {
                setFilter('user-anomalies');
                setShowUserAnomalies(true);
              }}
            />
          )}
          <Chip
            label="Anomalies auto"
            selected={filter === 'anomalies'}
            onPress={() => setFilter('anomalies')}
          />

        </View>
        
        {/* Statistiques */}
        {stats && (
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around',
            backgroundColor: c.mint,
            padding: 12,
            borderRadius: 8
          }}>
            <View style={{ alignItems: 'center' }}>
              <Txt size={18} bold>{stats.progress}%</Txt>
              <Txt size={12}>Vérifié</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt size={18} bold>{stats.verifiedPages}/{stats.totalPages}</Txt>
              <Txt size={12}>Pages</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt size={18} bold>{stats.verifiedBlocks}/{stats.totalBlocks}</Txt>
              <Txt size={12}>Blocs</Txt>
            </View>
          </View>
        )}
        
        {/* Sélecteur de page */}
        {showPageSelector && (
          <View style={{ 
            position: 'absolute', 
            top: '50%', 
            left: 20, 
            right: 20, 
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.line,
            zIndex: 1000,
            maxHeight: 400
          }}>
            <Txt bold size={16} style={{ marginBottom: 12 }}>Aller à la page</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {packet.pages.map((p, i) => {
                const pageTargets = allTargets.filter(t => t.printedPage === p.printedPage);
                const pageStatus = pageTargets.length && pageTargets.every(t => isVerified(t.status)) ? 'verified' : 'in-progress';
                const available = visibleTargets.some(t => t.printedPage === p.printedPage);
                const bgColor = pageStatus === 'verified' ? c.primary : 
                               pageStatus === 'in-progress' ? c.peach : c.muted;
                return (
                  <Pressable
                    key={p.printedPage}
                    disabled={!available}
                    accessibilityLabel={`Page ${p.printedPage}${pageStatus === 'verified' ? ' entièrement vérifiée' : ''}`}
                    onPress={() => goToPage(i)}
                    style={{ 
                      padding: 10, 
                      backgroundColor: bgColor,
                      borderRadius: 8
                    }}
                  >
                    <Txt size={14} color={pageStatus === 'verified' ? 'white' : c.ink}>
                      {p.printedPage}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <Button title="Fermer" secondary onPress={() => setShowPageSelector(false)} />
          </View>
        )}
      </View>
    );
  }
  
  // Navigue vers une anomalie spécifique
  function goToAnomaly(anomaly: AnomalyReport) {
    const next = allTargets.find(t => t.key === reviewKey(anomaly.chapterId, anomaly.printedPage, anomaly.blockId));
    if (next) {
      setReviewFilter(isVerified(next.status) ? 'verified' : 'pending');
      selectTarget(next);
    }
  }

  // Modal d'export pour mobile
  function renderExportModal() {
    if (!showExportModal || anomalies.length === 0) return null;
    
    const report = generateAnomalyReport();
    
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}>
        <View style={{
          backgroundColor: 'white',
          padding: 24,
          borderRadius: 12,
          maxWidth: 500,
          width: '90%',
          maxHeight: '80%',
          gap: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt size={18} bold>Exporter les anomalies</Txt>
            <Pressable onPress={() => setShowExportModal(false)}>
              <Txt size={24}>×</Txt>
            </Pressable>
          </View>
          
          <View style={{ backgroundColor: '#E8F4FD', padding: 12, borderRadius: 8 }}>
            <Txt bold>Chapitre : {report.chapterId}</Txt>
            <Txt>Manuel : {report.manual}</Txt>
            <Txt>Total : {anomalies.length} anomalies</Txt>
          </View>
          
          <View style={{ gap: 8 }}>
            <Txt size={14} bold>Fichiers à exporter :</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="📄 JSON" selected={false} onPress={() => {}} />
              <Chip label="📄 Markdown" selected={false} onPress={() => {}} />
            </View>
          </View>
          
          <View style={{ gap: 8 }}>
            <Txt size={12} color={c.muted}>
              Ces fichiers contiennent toutes vos anomalies avec leurs descriptions.
              Ils peuvent être importés par une IA pour correction.
            </Txt>
            <Txt size={12} color={c.muted}>
              Aucune donnée ne sera envoyée automatiquement.
            </Txt>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              title="Annuler"
              secondary
              onPress={() => setShowExportModal(false)}
            />
            <Button
              title="Exporter"
              onPress={() => {
                // Sur mobile, on retourne le rapport au parent pour traitement
                exportAnomalies();
                setShowExportModal(false);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Rendu de la liste des anomalies utilisateur (avec commentaires)
  function renderUserAnomalyList() {
    if (anomalies.length === 0) {
      return (
        <View style={{ padding: 20 }}>
          <Txt size={14} color={c.muted}>Aucune anomalie signalée</Txt>
        </View>
      );
    }
    
    // Grouper les anomalies par page
    const anomaliesByPage: Record<number, AnomalyReport[]> = {};
    for (const anomaly of anomalies.filter(a => a.status === anomalyFilter)) {
      if (!anomaliesByPage[anomaly.printedPage]) {
        anomaliesByPage[anomaly.printedPage] = [];
      }
      anomaliesByPage[anomaly.printedPage].push(anomaly);
    }
    
    // Trier les pages par numéro
    const sortedPages = Object.keys(anomaliesByPage).map(Number).sort((a, b) => a - b);
    
    return (
      <Card>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['open', 'corrected-pending-review', 'resolved'] as AnomalyStatus[]).map(status => (
            <Chip key={status} label={`${status === 'open' ? 'Ouvertes' : status === 'resolved' ? 'Résolues' : 'À revérifier'} (${anomalies.filter(a => a.status === status).length})`}
              selected={anomalyFilter === status} onPress={() => setAnomalyFilter(status)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Txt bold size={16}>Anomalies signalées ({anomalies.length})</Txt>
          <Button
            title="Exporter"
            secondary
            onPress={() => exportAnomalies()}
          />
        </View>
        
        <View style={{ gap: 12 }}>
          {sortedPages.map(pageNum => {
            const pageAnomalies = anomaliesByPage[pageNum];
            const openCount = pageAnomalies.filter(a => a.status === 'open').length;
            const pendingCount = pageAnomalies.filter(a => a.status === 'corrected-pending-review').length;
            const resolvedCount = pageAnomalies.filter(a => a.status === 'resolved').length;
            
            return (
              <View key={pageNum} style={{ 
                backgroundColor: c.mint,
                borderRadius: 8,
                padding: 12,
                gap: 8
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt bold>Page {pageNum}</Txt>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Chip
                      label={`🔴 ${openCount}`}
                      selected={false}
                      onPress={() => {}}
                    />
                    <Chip
                      label={`🟡 ${pendingCount}`}
                      selected={false}
                      onPress={() => {}}
                    />
                    <Chip
                      label={`🟢 ${resolvedCount}`}
                      selected={false}
                      onPress={() => {}}
                    />
                  </View>
                </View>
                
                <View style={{ gap: 8 }}>
                  {pageAnomalies.map(anomaly => (
                    <View key={anomaly.id} style={{ 
                      padding: 10,
                      backgroundColor: 'white',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: c.line
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Txt size={12} bold>Bloc : {anomaly.blockId}</Txt>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Chip
                            label={anomaly.blockRole}
                            selected={false}
                            onPress={() => {}}
                          />
                          <Pressable onPress={() => goToAnomaly(anomaly)}>
                            <Txt size={12} color={c.primary}>Aller →</Txt>
                          </Pressable>
                        </View>
                      </View>
                      
                      <Txt size={11} color={c.muted} numberOfLines={1}>
                        {anomaly.blockTextPreview}
                      </Txt>
                      
                      <View style={{ 
                        marginTop: 6,
                        padding: 8,
                        backgroundColor: '#FFF4DD',
                        borderRadius: 4
                      }}>
                        <Txt size={13} bold>Description :</Txt>
                        <Txt size={12}>{anomaly.description}</Txt>
                        {(anomaly.descriptionHistory ?? []).map((previous, i) => (
                          <Txt key={i} size={11} color={c.muted}>Commentaire précédent : {previous.description}</Txt>
                        ))}
                      </View>
                      
                      <View style={{ 
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: c.line
                      }}>
                        <Txt size={10} color={c.muted}>
                          {anomaly.createdAt.split('T')[0]}
                        </Txt>
                        <Chip
                          label={anomaly.status === 'open' ? '🔴 Ouverte' :
                                anomaly.status === 'corrected-pending-review' ? '🟡 À revérifier' : '🟢 Résolue'}
                          selected={false}
                          onPress={() => {}}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    );
  }

  // Rendu de la liste des anomalies prioritaires automatiques (ancienne version)
  function renderAnomalyList() {
    if (!validation || !controlReport || filter !== 'anomalies') return null;
    
    const anomalyPages = getAnomalyPages();
    
    if (anomalyPages.length === 0) {
      return (
        <View style={{ padding: 20 }}>
          <Txt size={14} color={c.muted}>Aucune anomalie détectée</Txt>
        </View>
      );
    }
    
    return (
      <Card>
        <Txt bold size={16}>Pages avec anomalies prioritaires</Txt>
        <Txt size={13} color={c.muted} style={{ marginBottom: 12 }}>
          {anomalyPages.length} pages · Priorité : haute et moyenne
        </Txt>
        <View style={{ gap: 8 }}>
          {anomalyPages.map(({ page, blocks }) => (
            <View key={page} style={{ 
              padding: 12, 
              backgroundColor: c.mint, 
              borderRadius: 8,
              gap: 8
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt bold>Page {page}</Txt>
                <Button
                  title="Aller à cette page"
                  secondary
                  onPress={() => {
                    const pageIndex = packet.pages.findIndex(p => p.printedPage === page);
                    if (pageIndex !== -1) goToPage(pageIndex);
                  }}
                />
              </View>
              <Txt size={12}>
                {blocks.length} blocs avec anomalies :
                {blocks.filter(b => b.priority === 'high').length} haute priorité, 
                {blocks.filter(b => b.priority === 'medium').length} moyenne priorité
              </Txt>
            </View>
          ))}
        </View>
      </Card>
    );
  }
  
  if (!packet) {
    return (
      <Card>
        <Txt size={16} color={c.muted}>Chargement...</Txt>
      </Card>
    );
  }
  
  return (
    <Card>
      <View style={{ gap: 16 }}>
        {/* Modal d'export pour mobile */}
        {renderExportModal()}
        
        {/* En-tête */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Txt size={12} color={c.primary} bold>KUMAR · CHAPITRE 8</Txt>
            <Txt size={24} bold>Vérification de fidélité</Txt>
            <Txt size={13} color={c.muted}>
              Contrôle manuel du contenu médical
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {anomalies.length > 0 && (
              <Button
                title={`Exporter (${anomalies.length})`}
                secondary
                onPress={() => {
                  if (Platform.OS === 'web') {
                    exportAnomalies();
                  } else {
                    setShowExportModal(true);
                  }
                }}
              />
            )}
            <Button title="× Fermer" secondary onPress={onClose} />
          </View>
        </View>
        
        {saveError && <Txt color="#dc3545">{saveError}</Txt>}
        {/* Statistiques globales */}
        <View style={{ backgroundColor: '#FFF4DD', padding: 14, borderRadius: 12, gap: 8 }}>
          <Txt bold size={14}>📊 Progression</Txt>
          {getStats() ? (
            <Txt size={13}>
              {getStats()!.verifiedPages}/{getStats()!.totalPages} pages vérifiées · 
              {getStats()!.verifiedBlocks} blocs vérifiés / {getStats()!.totalBlocks} ·
              {getStats()!.progress}% complet
            </Txt>
          ) : (
            <Txt size={13}>Chargement des statistiques...</Txt>
          )}
          <Txt size={12} color={c.muted}>
            {getStats()?.complete ? '✅ Chapitre entièrement vérifié' : '⏳ Vérification en cours'}
          </Txt>
        </View>
        
        {loaded && <Txt bold>{allTargets.filter(t => !isVerified(t.status)).length} blocs restant à contrôler</Txt>}
        {pageNotice !== null && <Txt color={c.primary}>Page entièrement vérifiée · p. {pageNotice}</Txt>}
        {/* Statistiques des anomalies */}
        {anomalies.length > 0 && (
          <View style={{ backgroundColor: '#FFE8E8', padding: 14, borderRadius: 12, gap: 8 }}>
            <Txt bold size={14}>⚠️ Anomalies signalées ({anomalies.length})</Txt>
            <Txt size={13}>
              🔴 {getAnomalyCounts().open} ouvertes · 
              🟡 {getAnomalyCounts().correctedPendingReview} à revérifier · 
              🟢 {getAnomalyCounts().resolved} résolues
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {anomalies.length > 0 && (
                <Pressable onPress={() => {
                  setFilter('user-anomalies');
                  setShowUserAnomalies(true);
                }}>
                  <Txt size={12} color={c.primary}>Voir la liste →</Txt>
                </Pressable>
              )}
              <Pressable onPress={() => exportAnomalies()}>
                <Txt size={12} color={c.primary}>Exporter →</Txt>
              </Pressable>
            </View>
          </View>
        )}
        
        {/* Liste des anomalies utilisateur */}
        {filter === 'user-anomalies' && showUserAnomalies && renderUserAnomalyList()}
        
        {/* Liste des anomalies automatiques prioritaires */}
        {filter === 'anomalies' && renderAnomalyList()}
        
        {/* Contenu principal */}
        <ScrollView ref={scrollRef} nestedScrollEnabled style={{ maxHeight: isWide ? 700 : 500 }}>
          {renderContent()}
          {getCurrentBlocks()[currentBlockIndex] && renderAnomalyForm(currentPageIndex, getCurrentBlocks()[currentBlockIndex].id)}
          {saveSuccess && <Txt size={12} color={c.primary}>{saveSuccess}</Txt>}
          {target && anomalies.filter(a => reviewKey(a.chapterId, a.printedPage, a.blockId) === target.key).map(a => (
            <View key={a.id} style={{ padding: 12, borderTopWidth: 1, borderColor: c.line, gap: 4 }}>
              <Txt bold>Historique · {a.status === 'resolved' ? 'Résolue' : a.status === 'open' ? 'Ouverte' : 'À revérifier'}</Txt>
              <Txt size={12}>{a.createdAt} · Mise à jour : {a.updatedAt}</Txt>
              <Txt>{a.description}</Txt>
              {(a.descriptionHistory ?? []).map((previous, i) => <Txt key={i} size={12}>Commentaire précédent ({previous.updatedAt}) : {previous.description}</Txt>)}
            </View>
          ))}
         </ScrollView>
         
         {/* Navigation */}
         {renderNavigation()}
         
         {/* Instructions */}
         <View style={{ backgroundColor: '#E8F4FD', padding: 14, borderRadius: 8, gap: 8 }}>
           <Txt bold size={13}>ℹ️ Instructions</Txt>
           <Txt size={12}>
             <Txt bold>Cours reconstitué : </Txt>
             Texte extrait du PDF avec mise en forme.
           </Txt>
           <Txt size={12}>
             <Txt bold>Visuel original : </Txt>
             Image de la page PDF pour comparaison.
           </Txt>
           <Txt size={12}>
             <Txt bold>Marquage : </Txt>
             Utilisez les boutons de statut pour valider chaque bloc.
           </Txt>
           <Txt size={12}>
             <Txt bold>Fusion de blocs : </Txt>
             Utilisez le bouton "Fusionner avec le bloc suivant" pour combiner deux blocs textuels séparés incorrectement lors de l'extraction du PDF.
           </Txt>
         </View>
       </View>
       
       {/* Modal d'aperçu de fusion */}
       {mergePreview && (
         <View style={{
           position: 'absolute',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           backgroundColor: 'rgba(0,0,0,0.5)',
           justifyContent: 'center',
           alignItems: 'center',
           zIndex: 2000,
         }}>
           <View style={{
             backgroundColor: 'white',
             padding: 24,
             borderRadius: 12,
             maxWidth: 500,
             width: '90%',
             maxHeight: '80%',
             gap: 16,
           }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
               <Txt size={18} bold>Aperçu de fusion</Txt>
               <Pressable onPress={() => closeMergePreview()}>
                 <Txt size={24}>×</Txt>
               </Pressable>
             </View>
             
             {/* Texte des deux blocs */}
             <View style={{ gap: 8 }}>
               <Txt size={14} bold>Bloc actuel ({mergePreview.currentBlock?.id}):</Txt>
               <Txt size={13} color={c.ink}>{mergePreview.currentBlock?.text}</Txt>
               <Txt size={14} bold>Bloc suivant ({mergePreview.nextBlock?.id}):</Txt>
               <Txt size={13} color={c.ink}>{mergePreview.nextBlock?.text}</Txt>
             </View>
             
             {/* Aperçu du texte fusionné */}
             <View style={{ gap: 8 }}>
               <Txt size={14} bold>Aperçu du texte fusionné:</Txt>
               <View style={{ 
                 backgroundColor: '#FFF4DD', 
                 padding: 12, 
                 borderRadius: 8,
                 borderWidth: 1,
                 borderColor: c.line
               }}>
                 <Txt size={13} color={c.ink}>{mergePreview.previewText}</Txt>
               </View>
             </View>
             
             {/* Options de fusion */}
             <View style={{ gap: 8 }}>
               <Txt size={14} bold>Options de jonction:</Txt>
               <View style={{ flexDirection: 'row', gap: 16 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Pressable
                     onPress={() => handleMergeOptionChange(true)}
                     style={{ 
                       padding: 8, 
                       borderWidth: mergePreview.useSpace ? 2 : 1,
                       borderColor: mergePreview.useSpace ? c.primary : c.line,
                       borderRadius: 4
                     }}
                   >
                     <Txt size={13}>Avec espace</Txt>
                   </Pressable>
                 </View>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Pressable
                     onPress={() => handleMergeOptionChange(false)}
                     style={{ 
                       padding: 8, 
                       borderWidth: !mergePreview.useSpace ? 2 : 1,
                       borderColor: !mergePreview.useSpace ? c.primary : c.line,
                       borderRadius: 4
                     }}
                   >
                     <Txt size={13}>Sans espace</Txt>
                   </Pressable>
                 </View>
               </View>
             </View>
             
             {/* Correction manuelle */}
             <View style={{ gap: 8 }}>
               <Txt size={14} bold>Correction manuelle (si nécessaire):</Txt>
               <TextInput
                 multiline
                 numberOfLines={3}
                 accessibilityLabel="Texte fusionné corrigé"
                 placeholder="Corrigez le texte fusionné ici si nécessaire..."
                 value={mergePreview.manualText}
                 editable={!mergeSaving}
                 onChangeText={handleManualTextChange}
                 style={{ 
                   borderWidth: 1, 
                   borderColor: c.line, 
                   borderRadius: 8, 
                   padding: 12,
                   fontSize: 15, 
                   color: c.ink, 
                   backgroundColor: c.paper,
                   minHeight: 80,
                   width: '100%'
                 }}
               />
               <Txt size={12} color={c.muted}>
                 Ne supprimez jamais un véritable trait d'union d'un terme médical.
               </Txt>
             </View>
             
             {/* Boutons d'action */}
             <View style={{ gap: 8, flexDirection: 'row-reverse' }}>
               <Button
                 title="Annuler"
                 secondary
                 onPress={closeMergePreview}
               />
               <Button
                 title={mergeSaving ? 'Enregistrement...' : 'Confirmer la fusion'}
                 disabled={mergeSaving || !mergePreview.manualText.trim()}
                 onPress={confirmMerge}
               />
             </View>
             
             {mergeError && <Txt color="#dc3545">{mergeError}</Txt>}
             {mergeSuccess && <Txt size={12} color={c.primary}>{mergeSuccess}</Txt>}
           </View>
         </View>
       )}
       
       {/* Modal d'export pour mobile */}
       {renderExportModal()}
     </Card>
   );
 }

/**
 * Hook pour utiliser la vérification dans PrivateSourceCourse.
 * Ce composant peut être intégré comme un mode supplémentaire.
 */
export function useVerificationMode(
  packet: SourcePacket | null,
  controlReport: any | null
): {
  showVerification: boolean;
  setShowVerification: (show: boolean) => void;
  verificationProps: SourceCourseVerificationProps | null;
} {
  const [showVerification, setShowVerification] = useState(false);
  
  const verificationProps = packet && controlReport ? {
    packet,
    controlReport,
    onClose: () => setShowVerification(false),
  } : null;
  
  return {
    showVerification,
    setShowVerification,
    verificationProps,
  };
}
