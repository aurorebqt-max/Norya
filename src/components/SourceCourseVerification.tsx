/**
 * Composant de vérification de fidélité pour les cours source.
 * Permet de vérifier côte à côte le texte extrait et le visuel PDF,
 * de marquer les blocs comme vérifiés, et de naviguer entre les anomalies.
 */

import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, Txt } from './ui';
import { colors as c } from '../design/theme';
import type { SourcePacket, SourcePart } from '../domain/sourceCourse/packet';
import { openOriginalPage } from '../services/storage/privateCourse';
import { sourcePresentation } from '../domain/sourceCourse/displayCorrections';
import {
  ChapterValidation,
  BlockValidationStatus,
  PageValidation,
  PageValidationStatus,
  loadChapterValidation,
  saveChapterValidation,
  updateBlockStatus,
  getPagesWithAnomalies,
  getValidationStats,
  AnomalyReport,
  AnomalyStatus,
  createAnomalyReport,
  loadChapterAnomalies,
  saveAnomaly,
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
  corrected: 'Corrigé ✓',
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'text' | 'visual'>('split');
  const [filter, setFilter] = useState<'all' | 'anomalies' | 'pending' | 'user-anomalies'>('all');
  const [showUserAnomalies, setShowUserAnomalies] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [currentAnomaly, setCurrentAnomaly] = useState<AnomalyReport | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
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
  
  // Charger les validations et anomalies au démarrage
  useEffect(() => {
    if (packet) {
      loadChapterValidation(controlReport).then(v => {
        if (v) setValidation(v);
      });
      
      // Charger les anomalies pour ce chapitre
      loadChapterAnomalies(packet.chapterId).then(setAnomalies);
    }
  }, [packet, controlReport]);
  
  // Les identifiants de blocs peuvent se répéter d'une page à l'autre.
  const anomalyForBlock = (pageIndex: number, blockId: string) => {
    const page = packet.pages[pageIndex];
    return anomalies.find(a => a.chapterId === packet.chapterId &&
      a.printedPage === page?.printedPage && a.blockId === blockId);
  };

  // Ne jamais remplacer un brouillon par une réponse de stockage asynchrone.
  // Le formulaire est lié à la page ET au bloc, et se ferme lors de la navigation.
  useEffect(() => {
    const page = packet.pages[currentPageIndex];
    const blocks = (page?.parts || []).filter(part => part.role !== 'page-header');
    const block = blocks[currentBlockIndex];
    const existing = block ? anomalyForBlock(currentPageIndex, block.id) : undefined;
    setCurrentAnomaly(existing || null);
    setCommentInput(existing?.description || '');
    setEditingBlockKey(null);
    setShowCommentInput(false);
    setSaveError(null);
    setSaveSuccess(null);
  }, [currentPageIndex, currentBlockIndex, packet]);

  // Si pas de validation, en créer une nouvelle à partir du paquet
  useEffect(() => {
    if (packet && !validation) {
      // Créer une validation avec tous les blocs du paquet (sauf page-header)
      const pages: PageValidation[] = packet.pages.map((page) => ({
        printedPage: page.printedPage,
        pdfPage: page.pdfPage,
        blocks: (page.parts || []).filter(p => p.role !== 'page-header').map(part => ({
          id: part.id,
          page: page.printedPage,
          status: 'pending' as BlockValidationStatus,
          notes: '',
        })),
        status: 'not-started' as PageValidationStatus,
        verifiedAt: undefined,
      }));
      
      const totalBlocks = pages.reduce((sum, p) => sum + p.blocks.length, 0);
      
      setValidation({
        chapterId: 'kum-08',
        pages,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        complete: false,
        verifiedPages: 0,
        totalPages: packet.pages.length,
        highPriorityBlocks: 0,
        mediumPriorityBlocks: 0,
        verifiedBlocks: 0,
        totalBlocks,
      });
    }
  }, [packet, validation]);
  
  // Navigation entre les blocs
  function nextBlock() {
    const page = packet.pages[currentPageIndex];
    if (currentBlockIndex >= (page.parts || []).filter(part => part.role !== 'page-header').length - 1) {
      // Passer à la page suivante
      if (currentPageIndex < packet.pages.length - 1) {
        setCurrentPageIndex(currentPageIndex + 1);
        setCurrentBlockIndex(0);
      }
    } else {
      setCurrentBlockIndex(currentBlockIndex + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }
  
  function prevBlock() {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (currentPageIndex > 0) {
      const prevPage = packet.pages[currentPageIndex - 1];
      setCurrentPageIndex(currentPageIndex - 1);
      setCurrentBlockIndex(Math.max(0, (prevPage.parts || []).filter(part => part.role !== 'page-header').length - 1));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }
  
  // Met à jour le statut d'un bloc
  async function handleBlockStatusChange(
    pageIndex: number,
    blockId: string,
    newStatus: BlockValidationStatus
  ) {
    if (!validation) return;
    
    const updated = await updateBlockStatus(
      validation,
      pageIndex,
      blockId,
      newStatus
    );
    setValidation(updated);
  }
  
  // Navigue vers une page spécifique
  function goToPage(pageIndex: number) {
    setCurrentPageIndex(pageIndex);
    setCurrentBlockIndex(0);
    setShowPageSelector(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  
  // Navigue vers un bloc spécifique
  function goToBlock(pageIndex: number, blockIndex: number) {
    setCurrentPageIndex(pageIndex);
    setCurrentBlockIndex(blockIndex);
    setShowPageSelector(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  
  // Ouvre le formulaire de commentaire pour une anomalie
  function openAnomalyForm(blockId: string) {
    const existingAnomaly = anomalyForBlock(currentPageIndex, blockId);
    if (existingAnomaly) {
      setCurrentAnomaly(existingAnomaly);
      setCommentInput(existingAnomaly.description);
    } else {
      setCurrentAnomaly(null);
      setCommentInput('');
    }
    setEditingBlockKey(`${packet.pages[currentPageIndex]?.printedPage}:${blockId}`);
    setShowCommentInput(true);
  }

  // Ferme le formulaire de commentaire
  function closeAnomalyForm() {
    setShowCommentInput(false);
    setEditingBlockKey(null);
    setCommentInput('');
    setCurrentAnomaly(null);
  }

  // Gère le changement de statut avec gestion des anomalies
  async function handleStatusChangeWithComment(
    pageIndex: number,
    blockId: string,
    newStatus: BlockValidationStatus,
    comment?: string
  ) {
    // Enregistrer le commentaire avant de changer le statut : un échec ne doit pas
    // laisser croire que l’anomalie a été sauvegardée.
    if (newStatus !== 'issue-found') {
      await handleBlockStatusChange(pageIndex, blockId, newStatus);
    }

    const block = packet.pages[pageIndex].parts?.find(p => p.id === blockId);
    if (!block) return;
    
    // Si c'est une anomalie (issue-found ou corrected), gérer le commentaire
    if (newStatus === 'issue-found' && comment && comment.trim()) {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      
      try {
        // Créer ou mettre à jour l'anomalie
        const existingAnomaly = anomalyForBlock(pageIndex, blockId);
        const anomalyData = existingAnomaly ? {
          ...existingAnomaly,
          description: comment,
          status: 'open' as AnomalyStatus,
          updatedAt: new Date().toISOString(),
        } : createAnomalyReport(
          packet.chapterId,
          'Kumar', // Manuel - à rendre générique
          packet.pages[pageIndex].printedPage,
          packet.pages[pageIndex].pdfPage,
          blockId,
          block.role,
          block.text,
          comment
        );
        
        await saveAnomaly(anomalyData);
        await handleBlockStatusChange(pageIndex, blockId, newStatus);
        
        // Recharger les anomalies
        const updatedAnomalies = await loadChapterAnomalies(packet.chapterId);
        setAnomalies(updatedAnomalies);
        setCurrentAnomaly(updatedAnomalies.find(a => a.chapterId === packet.chapterId && a.printedPage === packet.pages[pageIndex].printedPage && a.blockId === blockId) || null);
        
        setSaveSuccess('Anomalie enregistrée avec succès !');
        setTimeout(() => setSaveSuccess(null), 3000);
      } catch (error) {
        setSaveError('Erreur lors de l\'enregistrement. Veuillez réessayer.');
        setTimeout(() => setSaveError(null), 5000);
      } finally {
        setSaving(false);
      }
    }
    
    // Si le statut n'est plus issue-found, supprimer le commentaire
    if (newStatus !== 'issue-found' && newStatus !== 'corrected') {
      setCommentInput('');
      setShowCommentInput(false);
    }
  }
  
  // Gère le clic sur "Anomalie"
  function handleAnomalieClick(block: SourcePart, pageIndex: number) {
    const existingAnomaly = anomalyForBlock(pageIndex, block.id);
    
    // Ouvrir le formulaire pour ce bloc
    // Ne PAS changer le statut ici - l'utilisateur le fera via le formulaire
    // Cela évite les conflits si l'utilisateur change de bloc avant d'enregistrer
    
    if (existingAnomaly) {
      // Une anomalie existe déjà : afficher son commentaire
      setCurrentAnomaly(existingAnomaly);
      setCommentInput(existingAnomaly.description);
    } else {
      // Nouvelle anomalie : préparer un champ vide
      setCurrentAnomaly(null);
      setCommentInput('');
    }
    
    // Ouvrir le formulaire
    setEditingBlockKey(`${packet.pages[pageIndex]?.printedPage}:${block.id}`);
    setShowCommentInput(true);
    
    // Ne PAS appeler handleBlockStatusChange ici
    // Le statut sera mis à jour quand l'utilisateur enregistrera le commentaire
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
    return (packet.pages[currentPageIndex].parts || []).filter(part => part.role !== 'page-header');
  }
  
  // Obtenir le statut d'un bloc
  function getCurrentBlockStatus(blockId: string): BlockValidationStatus {
    if (!validation) return 'pending';
    const page = validation.pages.find(p => p.printedPage === packet.pages[currentPageIndex]?.printedPage);
    if (!page) return 'pending';
    const block = page.blocks.find(b => b.id === blockId);
    return block?.status || 'pending';
  }
  
  // Statistiques de validation
  function getStats() {
    if (!validation) return null;
    return getValidationStats(validation);
  }
  
  // Rendu du contenu en fonction du mode d'affichage
  function renderContent() {
    const page = packet.pages[currentPageIndex];
    const blocks = getCurrentBlocks();
    const currentBlock = blocks[currentBlockIndex];
    
    if (!page || !currentBlock) {
      return (
        <View style={{ padding: 20 }}>
          <Txt size={16} color={c.muted}>Aucun bloc sélectionné</Txt>
        </View>
      );
    }
    
    const blockStatus = getCurrentBlockStatus(currentBlock.id);
    const presentation = sourcePresentation(page.printedPage, currentBlock);
    const isIllustration = isTrueIllustration(currentBlock) || presentation.imageOnly;
    const showAsText = !isIllustration; // Même règle d'affichage que le cours reconstitué, source brute inchangée
    
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
                  <Text selectable testID="verification-presented-text" style={{fontSize:16,lineHeight:26,color:c.ink}}>
                    {presentation.hide ? 'Ce numéro de pagination isolé est masqué dans le cours reconstitué. Vérifiez son emplacement dans le PDF.' : presentation.text}
                  </Text>
                  {presentation.text !== currentBlock.text && <Txt size={11} color={c.muted}>Présentation ajustée : le texte extrait original reste conservé et disponible ci-dessous.</Txt>}
                  {presentation.text !== currentBlock.text && <Text selectable style={{fontSize:12,color:c.muted,marginTop:6}}>{currentBlock.text}</Text>}
                </ScrollView>
                
                {/* Champ de commentaire (si anomalie) */}
                {showCommentInput && editingBlockKey === `${page.printedPage}:${currentBlock.id}` && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Txt size={13} bold>Décrivez l'anomalie :</Txt>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      placeholder="Ex: Virgule supplémentaire, mot incorrect, valeur médicale erronée, unité incorrecte..."
                      value={commentInput}
                      onChangeText={setCommentInput}
                      style={{
                        borderWidth: 1,
                        borderColor: c.line,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 15,
                        color: c.ink,
                        backgroundColor: c.paper,
                        minHeight: 100,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        title={currentAnomaly ? 'Mettre à jour' : 'Enregistrer'}
                        secondary
                        disabled={saving || !commentInput.trim()}
                        onPress={() => handleStatusChangeWithComment(
                          currentPageIndex,
                          currentBlock.id,
                          'issue-found',
                          commentInput
                        )}
                      />
                      <Button
                        title="Annuler"
                        secondary
                        onPress={closeAnomalyForm}
                      />
                    </View>
                    {saveError && <Txt size={12} color='#dc3545'>{saveError}</Txt>}
                    {saveSuccess && <Txt size={12} color={c.primary}>{saveSuccess}</Txt>}
                  </View>
                )}
                
                {/* Boutons de statut */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: showCommentInput ? 0 : 12 }}>
                  {(['pending', 'in-review', 'verified', 'issue-found', 'corrected'] as BlockValidationStatus[]).map(status => {
                    const isAnomalie = status === 'issue-found';
                    return (
                      <Button
                        key={status}
                        title={statusLabels[status]}
                        secondary={blockStatus !== status}
                        onPress={() => {
                          if (isAnomalie) {
                            // Pour "Anomalie", toujours ouvrir le formulaire
                            openAnomalyForm(currentBlock.id);
                          } else {
                            // Pour les autres statuts, juste changer le statut
                            // et fermer le formulaire si ouvert
                            handleBlockStatusChange(currentPageIndex, currentBlock.id, status);
                            closeAnomalyForm();
                          }
                        }}
                      />
                    );
                  })}
                </View>
              </>
            ) : (
              // Affiche l'illustration
              <View style={{ alignItems: 'center', gap: 8 }}>
                <OriginalVisual image={currentBlock.image} ratio={(currentBlock.bbox[3]-currentBlock.bbox[1])/(currentBlock.bbox[2]-currentBlock.bbox[0])}
                  wide={false} label={`${roles[currentBlock.role] || 'Illustration'} original`} />
                <Txt size={12} color={c.muted}>Illustration médicale - à vérifier visuellement</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: showCommentInput ? 0 : 12, justifyContent: 'center' }}>
                  {(['pending', 'in-review', 'verified', 'issue-found', 'corrected'] as BlockValidationStatus[]).map(status => {
                    const isAnomalie = status === 'issue-found';
                    return (
                      <Button
                        key={status}
                        title={statusLabels[status]}
                        secondary={blockStatus !== status}
                        onPress={() => {
                          if (isAnomalie) {
                            openAnomalyForm(currentBlock.id);
                          } else {
                            handleBlockStatusChange(currentPageIndex, currentBlock.id, status);
                            closeAnomalyForm();
                          }
                        }}
                      />
                    );
                  })}
                </View>
                
                {/* Champ de commentaire pour illustration */}
                {showCommentInput && editingBlockKey === `${page.printedPage}:${currentBlock.id}` && (
                  <View style={{ marginTop: 12, gap: 8, width: '100%' }}>
                    <Txt size={13} bold>Décrivez l'anomalie :</Txt>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      placeholder="Ex: Schéma incomplet, légende manquante..."
                      value={commentInput}
                      onChangeText={setCommentInput}
                      style={{
                        borderWidth: 1,
                        borderColor: c.line,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 15,
                        color: c.ink,
                        backgroundColor: c.paper,
                        minHeight: 100,
                        width: '100%',
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                      <Button
                        title={currentAnomaly ? 'Mettre à jour' : 'Enregistrer'}
                        secondary
                        disabled={saving || !commentInput.trim()}
                        onPress={() => handleStatusChangeWithComment(
                          currentPageIndex,
                          currentBlock.id,
                          'issue-found',
                          commentInput
                        )}
                      />
                      <Button
                        title="Annuler"
                        secondary
                        onPress={closeAnomalyForm}
                      />
                    </View>
                    {saveError && <Txt size={12} color='#dc3545' style={{ textAlign: 'center' }}>{saveError}</Txt>}
                    {saveSuccess && <Txt size={12} color={c.primary} style={{ textAlign: 'center' }}>{saveSuccess}</Txt>}
                  </View>
                )}
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
                <Text selectable testID="verification-presented-text" style={{fontSize:18,lineHeight:28,color:c.ink}}>
                  {presentation.hide ? 'Numéro de pagination isolé : masqué dans le cours reconstitué.' : presentation.text}
                </Text>
                {presentation.text !== currentBlock.text && <View style={{marginTop:12,gap:5}}>
                  <Txt size={12} color={c.muted}>Texte brut extrait (conservé pour vérification) :</Txt>
                  <Text selectable style={{fontSize:13,color:c.muted}}>{currentBlock.text}</Text>
                </View>}
              </ScrollView>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(['pending', 'in-review', 'verified', 'issue-found', 'corrected'] as BlockValidationStatus[]).map(status => (
                  <Button
                    key={status}
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
              <Txt size={12} color={c.muted}>{presentation.imageOnly ? "Visuel original retenu pour ce passage — contenu textuel toujours à vérifier" : "Illustration médicale"}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(['pending', 'in-review', 'verified', 'issue-found', 'corrected'] as BlockValidationStatus[]).map(status => (
                  <Button
                    key={status}
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
            disabled={currentPageIndex === 0}
            onPress={() => {
              setCurrentPageIndex(currentPageIndex - 1);
              setCurrentBlockIndex(0);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
          />
          <Button
            title="Bloc précédent"
            secondary
            disabled={currentPageIndex === 0 && currentBlockIndex === 0}
            onPress={prevBlock}
          />
          <Button
            title={`Page ${page?.printedPage || '?'} · Bloc ${currentBlockIndex + 1}/${blocks.length || 0}`}
            secondary
            onPress={() => setShowPageSelector(!showPageSelector)}
          />
          <Button
            title="Bloc suivant"
            secondary
            disabled={currentPageIndex === packet.pages.length - 1 && 
                     currentBlockIndex >= blocks.length - 1}
            onPress={nextBlock}
          />
          <Button
            title="Page suivante"
            secondary
            disabled={currentPageIndex === packet.pages.length - 1}
            onPress={() => {
              setCurrentPageIndex(currentPageIndex + 1);
              setCurrentBlockIndex(0);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
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
          <Chip
            label="Tous"
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
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
          <Chip
            label="À vérifier"
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
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
                const pageValidation = validation?.pages.find(vp => vp.printedPage === p.printedPage);
                const pageStatus = pageValidation?.status || 'not-started';
                const bgColor = pageStatus === 'verified' ? c.primary : 
                               pageStatus === 'in-progress' ? c.peach : c.muted;
                return (
                  <Pressable
                    key={i}
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
    const pageIndex = packet.pages.findIndex(p => p.printedPage === anomaly.printedPage);
    if (pageIndex !== -1) {
      const blockIndex = packet.pages[pageIndex].parts?.findIndex(p => p.id === anomaly.blockId) || 0;
      setCurrentPageIndex(pageIndex);
      setCurrentBlockIndex(blockIndex);
      setShowPageSelector(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
    for (const anomaly of anomalies) {
      if (!anomaliesByPage[anomaly.printedPage]) {
        anomaliesByPage[anomaly.printedPage] = [];
      }
      anomaliesByPage[anomaly.printedPage].push(anomaly);
    }
    
    // Trier les pages par numéro
    const sortedPages = Object.keys(anomaliesByPage).map(Number).sort((a, b) => a - b);
    
    return (
      <Card>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
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
        
        {/* Statistiques globales */}
        <View style={{ backgroundColor: '#FFF4DD', padding: 14, borderRadius: 12, gap: 8 }}>
          <Txt bold size={14}>📊 Progression</Txt>
          {getStats() ? (
            <Txt size={13}>
              {getStats()!.verifiedPages}/{getStats()!.totalPages} pages vérifiées · 
              {getStats()!.verifiedBlocks}/{getStats()!.totalBlocks} blocs vérifiés · 
              {getStats()!.progress}% complet
            </Txt>
          ) : (
            <Txt size={13}>Chargement des statistiques...</Txt>
          )}
          <Txt size={12} color={c.muted}>
            {validation?.complete ? '✅ Chapitre entièrement vérifié' : '⏳ Vérification en cours'}
          </Txt>
        </View>
        
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
            <Txt bold>Priorités : </Txt>
            Pages 162, 152-157, 163-164 à vérifier en premier.
          </Txt>
        </View>
      </View>
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
