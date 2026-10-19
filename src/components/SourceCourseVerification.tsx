/**
 * Vérification manuelle d'un cours source : texte reconstitué à gauche, PDF original à droite
 * (affichage Split permanent). Les décisions (statuts, corrections, fusions) viennent des modules
 * de domaine, partagés avec « Cours reconstitué » et la finalisation.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button, Card, Chip, Txt } from './ui';
import { SourcePresentationText } from './SourcePresentationText';
import { CourseTable } from './CourseBlocks';
import { TableEditor } from './TableEditor';
import { colors as c } from '../design/theme';
import type { SourcePacket, SourcePart } from '../domain/sourceCourse/packet';
import { openOriginalPage } from '../services/storage/privateCourse';
import { sourcePresentation } from '../domain/sourceCourse/displayCorrections';
import {
  loadValidation, reconcileReviewValidation, reviewBlock, saveValidation,
  type BlockValidationStatus, type ChapterValidation,
} from '../domain/sourceCourse/verification';
import {
  createAnomalyReport, loadChapterAnomalies, type AnomalyReport,
} from '../domain/sourceCourse/anomalies';
import {
  buildMergeDraft, isMergeableRole, mergeAtAnchor, mergeWarnings, recordMerge, undoMerge, withEditedText,
  recordSplit, splitAtAnchor, splitPreview, suggestedSplitPosition, undoSplit, withJunction, withMovedItem,
  type MergeDraft, type MergeItem, type MergeJunction,
} from '../domain/sourceCourse/merges';
import {
  hasActiveCorrection, hasCorrectionRecord, logicalSources, reviewLogicalBlock, saveDisplayedCorrection, undoDisplayedCorrection,
  savedBlock, workingPresentation,
} from '../domain/sourceCourse/blockEdits';
import {
  BLOCK_KINDS, decideBlockTable, kindLabel, saveBlockTable, setBlocksKind, type BlockKind, type BlockTable,
} from '../domain/sourceCourse/classification';
import { boundaryHyphenation } from '../domain/sourceCourse/hyphenation';
import { boundaryParagraphNormalization, normalizeParagraphLines } from '../domain/sourceCourse/paragraphNormalization';
import { applyParagraphNormalization, planParagraphNormalization, type NormalizationPlan } from '../domain/sourceCourse/normalizationBatch';
import { applyBraceNormalization, planBraceNormalization, type BracePlan } from '../domain/sourceCourse/braceNormalization';
import {
  REVIEW_FILTERS, countReviewTargets, filterReviewTargets, isVerified, reviewKey, reviewTargets, selectReviewTarget,
  type ReviewFilter,
} from '../domain/sourceCourse/reviewNavigation';
import { buildStructureExport, importStructureExport } from '../domain/sourceCourse/structureExport';
import { createManualBlock, logicalBlocks, undoManualBlockCreation } from '../domain/sourceCourse/manualBlocks';
import { activeAssociations, associationsForDeletedBlocks, repairDeletedBlockAssociations, createAssociation, deleteAssociation, updateAssociation, validateAssociations,
  type ManualAssociation } from '../domain/sourceCourse/associations';

const roles: Record<string, string> = {
  heading: 'Titre', paragraph: 'Paragraphe', list: 'Liste', table: 'Tableau', figure: 'Illustration',
  box: 'Encadré', contents: 'Sommaire original', 'chapter-title': 'Titre du chapitre',
  'section-title': 'Titre de section', 'page-header': 'En-tête original', 'uncertain-text': 'Passage incertain',
};
const statusLabels: Record<BlockValidationStatus, string> = {
  pending: 'À vérifier', 'in-review': 'En cours', verified: 'Vérifié ✓', 'issue-found': 'Anomalie !', corrected: 'Vérifié ✓',
};
const junctions: { id: MergeJunction; label: string }[] = [
  { id: 'space', label: 'Espace' }, { id: 'linebreak', label: 'Saut de ligne' },
  { id: 'none', label: 'Aucune séparation' }, { id: 'hyphen', label: 'Retirer le tiret' },
];
const DEFAULT_ISSUE = 'Anomalie signalée sans commentaire.';

function OriginalVisual({ image, ratio, label }: { image: string; ratio: number; label: string }) {
  const [container, setContainer] = useState(280);
  const [zoom, setZoom] = useState(false);
  const size = zoom ? Math.max(container * 1.8, 1000) : container;
  return (
    <View style={{ gap: 6, maxWidth: '100%' }} onLayout={e => setContainer(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator testID="source-visual-scroll">
        <Image source={{ uri: image }} accessibilityLabel={label} resizeMode="contain"
          style={{ width: size, height: size * (Number.isFinite(ratio) && ratio > 0 ? ratio : 0.5) }} />
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => setZoom(!zoom)} style={{ paddingVertical: 6 }}>
        <Txt size={12} color={c.primary}>{zoom ? 'Réduire le PDF' : 'Zoom sur le PDF'}</Txt>
      </Pressable>
    </View>
  );
}

function downloadFile(name: string, content: string, type: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

interface SourceCourseVerificationProps {
  packet: SourcePacket;
  controlReport?: any;
  initialTarget?: { printedPage?: number; blockId?: string; nonce: number };
  onClose: () => void;
}

export function SourceCourseVerification({ packet, onClose, initialTarget }: SourceCourseVerificationProps) {
  const [loaded, setLoaded] = useState(false);
  const [validation, setValidation] = useState<ChapterValidation | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [jumpPage, setJumpPage] = useState<number | null>(null);
  const [panel, setPanel] = useState<'none' | 'correct' | 'normalize' | 'split' | 'comment' | 'table' | 'add-manual' | 'associate'>('none');
  const [editText, setEditText] = useState('');
  const [splitPosition, setSplitPosition] = useState('');
  const [comment, setComment] = useState('');
  const [editingAnomaly, setEditingAnomaly] = useState<string | null>(null);
  const [selection, setSelection] = useState<MergeItem[]>([]);
  const [draft, setDraft] = useState<MergeDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [batchPlan, setBatchPlan] = useState<NormalizationPlan | null>(null);
  const [bracePlan, setBracePlan] = useState<BracePlan | null>(null);
  const [manualText, setManualText] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [anchorOccurrence, setAnchorOccurrence] = useState('0');
  const [associationTarget, setAssociationTarget] = useState<string | null>(null);
  const [associationSearch, setAssociationSearch] = useState('');
  const [editingAssociation, setEditingAssociation] = useState<ManualAssociation | null>(null);
  const latest = useRef<ChapterValidation | null>(null);
  const locked = useRef(false);
  const { width } = useWindowDimensions();
  const wide = width >= 768;

  useEffect(() => {
    let active = true;
    setLoaded(false);
    Promise.all([loadValidation(packet.chapterId), loadChapterAnomalies(packet.chapterId)]).then(([saved, reports]) => {
      if (!active) return;
      const next = reconcileReviewValidation(saved, packet);
      if (!next.anomalies) next.anomalies = saved?.anomalies ?? reports;
      latest.current = next;
      setValidation(next);
      setLoaded(true);
    }).catch(() => { if (active) setError('Impossible de charger les validations. Aucune modification enregistrée.'); });
    return () => { active = false; };
  }, [packet]);

  useEffect(() => {
    if (!initialTarget?.printedPage || !initialTarget.blockId) return;
    setFilter('all');
    setSelectedKey(reviewKey(packet.chapterId, initialTarget.printedPage, initialTarget.blockId));
  }, [packet, initialTarget]);

  const anomalies = validation?.anomalies ?? [];
  const targets = useMemo(() => reviewTargets(packet, validation, anomalies), [packet, validation]);
  const counts = useMemo(() => countReviewTargets(targets), [targets]);
  const visible = filterReviewTargets(targets, filter);
  const current = selectReviewTarget(targets, visible, selectedKey);
  const position = current ? visible.findIndex(t => t.key === current.key) : -1;
  const selectedPage = jumpPage ?? current?.printedPage ?? visible[0]?.printedPage;
  const visiblePages = packet.pages.map(page => page.printedPage);
  const pageBlocks = visible.filter(target => target.printedPage === selectedPage);
  const page = current ? packet.pages[current.pageIndex] : undefined;
  const logical = useMemo(() => logicalBlocks(packet, validation), [packet, validation]);
  const currentLogical = current ? logical.find(block => block.printedPage === current.printedPage && block.blockId === current.blockId) : undefined;
  const part: SourcePart | undefined = currentLogical?.part;
  const ref = current ? { printedPage: current.printedPage, blockId: current.blockId } : null;
  const merge = ref ? mergeAtAnchor(validation?.merges, ref.printedPage, ref.blockId) : undefined;
  const split = ref ? splitAtAnchor(validation?.splits, ref.printedPage, ref.blockId, merge?.id) : undefined;
  const sources = ref ? logicalSources(validation, ref) : [];
  const presentation = page && part ? workingPresentation(page.printedPage, part, validation) : null;
  const kind: BlockKind | undefined = page && part ? savedBlock(validation, page.printedPage, part.id)?.kind : undefined;
  const table: BlockTable | undefined = page && part ? savedBlock(validation, page.printedPage, part.id)?.table : undefined;
  const imageOnly = !!part && (!!presentation?.imageOnly || kind === 'table');
  const mergeable = !!part && !currentLogical?.manual && !imageOnly && isMergeableRole(part.role);
  const shownText = presentation?.text ?? '';
  const associations = activeAssociations(validation);
  const deletedBlockLinks = associationsForDeletedBlocks(validation);
  const normalization = part ? normalizeParagraphLines(shownText, part.role) : null;
  const canNormalize = !!normalization && normalization.text !== shownText && !hasCorrectionRecord(validation, sources);

  // L'édition en cours est liée au bloc : elle se ferme quand l'utilisateur change de bloc.
  useEffect(() => { setPanel('none'); setEditingAnomaly(null); setError(null); setNotice(null); }, [current?.key]);

  async function commit(next: ChapterValidation, message?: string) {
    if (locked.current) return false;
    locked.current = true; setBusy(true); setError(null);
    try {
      const checked = validateAssociations(next, logicalBlocks(packet, next), candidate => {
        const block = logicalBlocks(packet, next).find(item => item.printedPage === candidate.printedPage && item.blockId === candidate.blockId);
        return block ? workingPresentation(block.printedPage, block.part, next)?.text ?? '' : '';
      });
      await saveValidation(checked);
      latest.current = checked; setValidation(checked);
      if (message) setNotice(message);
      return true;
    } catch (reason) {
      setError(`Enregistrement local impossible : ${String(reason)}`);
      return false;
    } finally { locked.current = false; setBusy(false); }
  }
  const base = () => latest.current ?? validation!;

  function navigateTo(target: typeof current) {
    if (!target) return;
    if (panel !== 'none') {
      setError('Terminez, enregistrez ou annulez l’édition en cours avant de changer de bloc : aucune saisie n’est abandonnée silencieusement.');
      return;
    }
    setJumpPage(null);
    setSelectedKey(target.key);
  }
  function go(delta: number) {
    const target = visible[position + delta];
    navigateTo(target);
  }
  function pickFilter(next: ReviewFilter) { setFilter(next); }

  async function setStatus(status: BlockValidationStatus) {
    if (!ref || locked.current) return;
    setSelectedKey(current!.key);
    try {
      const next = reviewLogicalBlock(base(), base().anomalies ?? [], sources, status);
      await commit(next, status === 'verified' ? 'Bloc vérifié. Anomalies actives résolues.' : undefined);
    } catch (reason) { setError(String(reason)); }
  }

  async function changeKind(next: BlockKind | null) {
    if (!ref || locked.current) return;
    const value = kind === next ? null : next;
    try {
      const saved = await commit(setBlocksKind(base(), sources, value), value
        ? `Type « ${kindLabel(value)} » enregistré${sources.length > 1 ? ` pour les ${sources.length} blocs de la fusion` : ''}. Le texte et le statut ne sont pas modifiés.`
        : 'Type retiré : le bloc redevient un texte normal.');
      if (saved && value === 'table') setPanel('table');
    } catch (reason) { setError(String(reason)); }
  }
  async function saveTable(next: BlockTable) {
    if (!ref) return;
    try {
      if (await commit(saveBlockTable(base(), ref, next), 'Tableau enregistré localement en brouillon. L’image originale reste affichée dans le cours tant qu’il n’est pas validé.')) setPanel('none');
    } catch (reason) { setError(String(reason)); }
  }
  async function decideTable(decision: 'validate' | 'keep-original' | 'draft') {
    if (!ref) return;
    try {
      const message = decision === 'validate' ? 'Tableau validé : il remplace l’image dans le cours.'
        : decision === 'keep-original' ? 'Image originale conservée dans le cours.' : 'Tableau remis en brouillon.';
      await commit(decideBlockTable(base(), ref, decision), message);
    } catch (reason) { setError(String(reason)); }
  }

  function openCorrection() {
    if (!ref || !part) return;
    if (imageOnly) { openComment(); return; }
    setEditText(shownText); setPanel('correct'); setNotice(null); setError(null);
  }
  function proposeNormalization() {
    if (!canNormalize || !normalization) return;
    setEditText(normalization.text);
    setPanel('normalize');
    setNotice(null);
    setError(null);
  }
  async function saveCorrection() {
    if (!ref) return;
    try {
      const next = saveDisplayedCorrection(base(), ref, shownText, editText);
      if (next === base()) { setPanel('none'); setNotice('Aucun changement à enregistrer.'); return; }
      if (await commit(next, 'Correction enregistrée localement (Safari/appareil). Le bloc n’est pas vérifié.')) setPanel('none');
    } catch (reason) { setError(String(reason)); }
  }
  async function cancelCorrection() {
    if (!ref) return;
    try {
      await commit(undoDisplayedCorrection(base(), ref), 'Correction annulée : le texte précédent est rétabli. L’historique est conservé.');
      setPanel('none');
    } catch (reason) { setError(String(reason)); }
  }
  function openBatchNormalization() {
    if (!validation) return;
    setBatchPlan(planParagraphNormalization(packet, validation));
    setError(null);
    setNotice(null);
  }
  async function acceptBatchNormalization() {
    if (!batchPlan?.proposals.length) return;
    try {
      const next = applyParagraphNormalization(base(), batchPlan.proposals);
      const recheck = batchPlan.proposals.filter(proposal => proposal.wasVerified).length;
      if (await commit(next, `${batchPlan.proposals.length} normalisation(s) enregistrée(s)${recheck ? ` ; ${recheck} bloc(s) déjà vérifié(s) sont maintenant à revoir.` : ''}`)) {
        setBatchPlan(null);
      }
    } catch (reason) { setError(String(reason)); }
  }
  function openBraceNormalization() {
    if (!validation) return;
    setBracePlan(planBraceNormalization(packet, validation));
    setError(null);
    setNotice(null);
  }
  async function acceptBraceNormalization() {
    if (!bracePlan?.proposals.length) return;
    try {
      const next = applyBraceNormalization(base(), bracePlan.proposals);
      const recheck = bracePlan.proposals.filter(proposal => proposal.wasVerified).length;
      if (await commit(next, `${bracePlan.proposals.length} correction(s) de parenthèses enregistrée(s)${recheck ? ` ; ${recheck} bloc(s) déjà vérifié(s) sont maintenant à revoir.` : ''}`)) setBracePlan(null);
    } catch (reason) { setError(String(reason)); }
  }

  const blockAnomalies = (): AnomalyReport[] => anomalies.filter(a => sources.some(s => s.printedPage === a.printedPage && s.blockId === a.blockId));
  function openComment(existing?: AnomalyReport) {
    setComment(existing?.description ?? ''); setEditingAnomaly(existing?.id ?? null); setPanel('comment');
  }
  async function saveComment() {
    if (!ref || !part || !page) return;
    const text = comment.trim() || (imageOnly ? DEFAULT_ISSUE : '');
    if (!text) { setError('Écrivez un commentaire ou utilisez « Anomalie ! » pour corriger directement le texte.'); return; }
    try {
      const existing = editingAnomaly ? anomalies.find(a => a.id === editingAnomaly) : undefined;
      const report = existing ? { ...existing, description: text, status: 'open' as const }
        : createAnomalyReport(packet.chapterId, 'Kumar', page.printedPage, page.pdfPage, part.id, part.role, shownText, text);
      const next = reviewBlock(base(), base().anomalies ?? [], ref.printedPage, ref.blockId, 'issue-found', report, existing ? 'edit' : 'create');
      if (await commit(next, 'Commentaire enregistré localement.')) setPanel('none');
    } catch (reason) { setError(String(reason)); }
  }

  function currentItem(): MergeItem | null {
    if (!ref || !part || !page || !presentation) return null;
    const index = (page.parts ?? []).filter(p => p.role !== 'page-header').findIndex(p => p.id === part.id);
    return {
      sources: merge ? merge.sources : [ref], sourceTexts: merge ? merge.sourceTexts : [shownText], text: shownText,
      role: part.role, mergeId: merge?.id, position: current!.pageIndex * 10000 + index,
    };
  }
  function startOrAddMerge() {
    const item = currentItem();
    if (!item || !ref) return;
    if (!mergeable) { setError('Seuls les blocs de texte (paragraphe, liste, titre, encadré) peuvent être fusionnés ; une figure, un tableau ou un sommaire ne le peut pas.'); return; }
    setError(null);
    if (selection.some(s => s.sources[0].printedPage === ref.printedPage && s.sources[0].blockId === ref.blockId)) return;
    setSelection([...selection, item]);
    setNotice(selection.length ? 'Bloc ajouté à la fusion.' : 'Premier bloc choisi. Naviguez vers un autre bloc (filtre « Tous » pour les voir tous) puis « Ajouter à la fusion ».');
  }
  function removeFromSelection() {
    if (!ref) return;
    setSelection(selection.filter(s => !(s.sources[0].printedPage === ref.printedPage && s.sources[0].blockId === ref.blockId)));
  }
  function previewMerge() {
    try { setDraft(buildMergeDraft(packet.chapterId, selection)); setError(null); } catch (reason) { setError(String(reason)); }
  }
  async function confirmMerge() {
    if (!draft) return;
    try {
      const next = recordMerge(base(), draft);
      const anchor = draft.sources[0];
      if (await commit(next, 'Fusion enregistrée localement. Les textes originaux sont conservés ; aucun bloc n’a été vérifié.')) {
        setSelection([]); setDraft(null); setFilter('all');
        setSelectedKey(reviewKey(packet.chapterId, anchor.printedPage, anchor.blockId));
      }
    } catch (reason) { setError(String(reason)); }
  }
  async function cancelMerge() {
    if (!merge || !current) return;
    setSelectedKey(current.key);
    try { await commit(undoMerge(base(), merge.id), 'Fusion annulée : les blocs précédents sont rétablis avec leurs corrections et anomalies.'); }
    catch (reason) { setError(String(reason)); }
  }
  function openSplit() {
    if (!mergeable || !shownText) return;
    setSplitPosition(String(suggestedSplitPosition(shownText)));
    setPanel('split');
    setError(null);
    setNotice(null);
  }
  async function confirmSplit() {
    if (!ref) return;
    try {
      const next = recordSplit(base(), ref, shownText, Number(splitPosition));
      if (await commit(next, 'Séparation enregistrée localement. Les sources, corrections, classifications, anomalies et validations sont conservées.')) {
        setPanel('none');
      }
    } catch (reason) { setError(String(reason)); }
  }
  async function cancelSplit() {
    if (!split) return;
    try { await commit(undoSplit(base(), split.id), 'Séparation annulée : le bloc logique précédent est rétabli.'); }
    catch (reason) { setError(String(reason)); }
  }

  function openManualBlock() {
    if (!ref || !part) return;
    setManualText('');
    setPanel('add-manual');
    setError(null);
    setNotice(null);
  }
  function openAssociation(existing?: ManualAssociation) {
    if (!ref) return;
    setEditingAssociation(existing ?? null);
    setAnchorText(existing?.anchor.text ?? '');
    setAnchorOccurrence(String(existing?.anchor.occurrence ?? 0));
    setAssociationTarget(existing ? JSON.stringify([existing.target.printedPage, existing.target.blockId]) : null);
    setAssociationSearch('');
    setPanel('associate');
    setError(null); setNotice(null);
  }
  async function saveAssociation(addAnother = false) {
    if (!ref || !associationTarget) { setError('Choisissez une destination logique.'); return; }
    try {
      const [printedPage, blockId] = JSON.parse(associationTarget) as [number, string];
      const target = { printedPage, blockId };
      const next = editingAssociation
        ? updateAssociation(base(), editingAssociation.id, ref, shownText, anchorText, Number(anchorOccurrence), target, logical)
        : createAssociation(base(), ref, shownText, anchorText, Number(anchorOccurrence), target, logical);
      if (await commit(next, 'Association enregistrée. Elle reste une décision manuelle et ne valide aucun contenu médical.')) {
        if (addAnother) openAssociation();
        else setPanel('none');
      }
    } catch (reason) { setError(String(reason)); }
  }
  async function removeAssociation(id: string) {
    try { await commit(deleteAssociation(base(), id), 'Association supprimée ; son historique est conservé.'); }
    catch (reason) { setError(String(reason)); }
  }
  async function confirmManualBlock() {
    if (!ref) return;
    try {
      const next = createManualBlock(base(), packet, ref, manualText);
      if (await commit(next, 'Bloc manuel ajouté après le bloc sélectionné. Il reste à vérifier et le paquet source est inchangé.')) {
        const added = next.manualBlocks?.[next.manualBlocks.length - 1];
        setPanel('none');
        // A new block is pending: Verified / My anomalies would hide it immediately.
        setFilter('all');
        setJumpPage(null);
        if (added) setSelectedKey(reviewKey(packet.chapterId, added.sourceRef.printedPage, added.id));
      }
    } catch (reason) { setError(String(reason)); }
  }
  async function undoManualBlock() {
    if (!currentLogical?.manual) return;
    try {
      const after = currentLogical.manual.after;
      if (await commit(undoManualBlockCreation(base(), currentLogical.manual.id),
        'Création du bloc manuel annulée. Son historique reste dans l’export.')) {
        setSelectedKey(reviewKey(packet.chapterId, after.printedPage, after.blockId));
      }
    } catch (reason) { setError(String(reason)); }
  }

  const inSelection = !!ref && selection.some(s => s.sources[0].printedPage === ref.printedPage && s.sources[0].blockId === ref.blockId);

  function proposeBoundaryHyphenation() {
    if (!ref || !part || !currentItem()) return;
    const nextTarget = targets[targets.findIndex(target => target.key === current.key) + 1];
    const nextPage = nextTarget && packet.pages[nextTarget.pageIndex];
    const nextPart = nextPage?.parts?.find(candidate => candidate.id === nextTarget.blockId);
    if (!nextTarget || !nextPage || !nextPart) return;
    const nextPresentation = workingPresentation(nextPage.printedPage, nextPart, validation);
    const candidate = boundaryHyphenation(shownText, nextPresentation?.text ?? '');
    if (!candidate || candidate.status !== 'repaired') return;
    const nextRef = { printedPage: nextPage.printedPage, blockId: nextPart.id };
    const nextMerge = mergeAtAnchor(validation?.merges, nextRef.printedPage, nextRef.blockId);
    const nextItem: MergeItem = {
      sources: nextMerge ? nextMerge.sources : [nextRef],
      sourceTexts: nextMerge ? nextMerge.sourceTexts : [nextPresentation?.text ?? ''],
      text: nextPresentation?.text ?? '', role: nextPart.role, mergeId: nextMerge?.id,
      position: nextTarget.pageIndex * 10000 + nextTarget.blockIndex,
    };
    try {
      const draft = buildMergeDraft(packet.chapterId, [currentItem()!, nextItem], 'hyphen');
      setSelection([currentItem()!, nextItem]);
      setDraft(draft);
      setNotice('Jonction par césure proposée : vérifiez l’aperçu et confirmez la fusion pour l’enregistrer.');
    } catch (reason) { setError(String(reason)); }
  }

  function proposeBoundaryParagraph() {
    if (!ref || !part || !currentItem()) return;
    const nextTarget = targets[targets.findIndex(target => target.key === current.key) + 1];
    const nextPage = nextTarget && packet.pages[nextTarget.pageIndex];
    const nextPart = nextPage?.parts?.find(candidate => candidate.id === nextTarget.blockId);
    if (!nextTarget || !nextPage || !nextPart) return;
    const nextPresentation = workingPresentation(nextPage.printedPage, nextPart, validation);
    const candidate = boundaryParagraphNormalization(shownText, nextPresentation?.text ?? '', part.role, nextPart.role);
    if (candidate?.status !== 'repaired') return;
    const nextRef = { printedPage: nextPage.printedPage, blockId: nextPart.id };
    const nextMerge = mergeAtAnchor(validation?.merges, nextRef.printedPage, nextRef.blockId);
    const nextItem: MergeItem = {
      sources: nextMerge ? nextMerge.sources : [nextRef],
      sourceTexts: nextMerge ? nextMerge.sourceTexts : [nextPresentation?.text ?? ''],
      text: nextPresentation?.text ?? '', role: nextPart.role, mergeId: nextMerge?.id,
      position: nextTarget.pageIndex * 10000 + nextTarget.blockIndex,
    };
    try {
      const draft = buildMergeDraft(packet.chapterId, [currentItem()!, nextItem], 'space');
      setSelection([currentItem()!, nextItem]);
      setDraft(draft);
      setNotice('Jonction de paragraphe proposée : contrôlez l’aperçu et confirmez la fusion pour l’enregistrer.');
    } catch (reason) { setError(String(reason)); }
  }

  function renderMergeDraft() {
    if (!draft) return null;
    const warnings = mergeWarnings(draft);
    return (
      <Card>
        <Txt bold>Aperçu de la fusion ({draft.items.length} blocs)</Txt>
        {draft.items.map((item, i) => (
          <View key={item.sources.map(s => `${s.printedPage}:${s.blockId}`).join('+')} style={{ gap: 4, paddingVertical: 4 }}>
            <Txt size={12} color={c.muted}>
              {i + 1}. p. {item.sources[0].printedPage} · {item.sources.map(s => s.blockId).join(' + ')}{item.mergeId ? ' (déjà fusionné)' : ''}
            </Txt>
            <Text selectable style={{ color: c.ink }}>{item.text}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Monter" secondary disabled={i === 0} onPress={() => setDraft(withMovedItem(draft, i, -1))} />
              <Button title="Descendre" secondary disabled={i === draft.items.length - 1} onPress={() => setDraft(withMovedItem(draft, i, 1))} />
            </View>
          </View>
        ))}
        <Txt size={13} bold>Jonction</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {junctions.map(j => <Chip key={j.id} label={j.label} selected={draft.junction === j.id} onPress={() => setDraft(withJunction(draft, j.id))} />)}
        </View>
        <Txt size={12} color={c.muted}>Changer l’ordre ou la jonction régénère le texte ; aucun terme médical n’est modifié sans votre action.</Txt>
        <Txt size={13} bold>Texte fusionné (modifiable)</Txt>
        <TextInput multiline value={draft.joinedText} onChangeText={t => setDraft(withEditedText(draft, t))}
          accessibilityLabel="Aperçu modifiable de la fusion"
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, minHeight: 120, color: c.ink, backgroundColor: c.paper }} />
        {warnings.map(w => <Txt key={w} size={12} color="#b45309">⚠ {w}</Txt>)}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Confirmer la fusion" disabled={busy || !draft.joinedText.trim()} onPress={confirmMerge} />
          <Button title="Annuler" secondary onPress={() => setDraft(null)} />
        </View>
      </Card>
    );
  }

  function renderMergeControls() {
    if (!ref || !mergeable) return null;
    return (
      <View style={{ gap: 8, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {!inSelection && <Button title={selection.length ? 'Ajouter à la fusion' : 'Fusionner avec un autre bloc'} secondary onPress={startOrAddMerge} />}
          {!split && <Button title="Séparer le bloc" secondary onPress={openSplit} />}
          {split && <Button title="Annuler la séparation" secondary disabled={busy} onPress={cancelSplit} />}
          {inSelection && <Button title="Retirer de la sélection" secondary onPress={removeFromSelection} />}
          {selection.length >= 2 && <Button title="Prévisualiser la fusion" onPress={previewMerge} />}
          {selection.length > 0 && <Button title="Vider la sélection de fusion" secondary onPress={() => { setSelection([]); setDraft(null); }} />}
          {merge && <Button title="Annuler la fusion" secondary disabled={busy} onPress={cancelMerge} />}
        </View>
        {selection.length > 0 && <Txt size={12} color={c.muted}>Sélection : {selection.length} bloc(s) — {selection.map(s => `p. ${s.sources[0].printedPage} ${s.sources[0].blockId}`).join(' · ')}</Txt>}
        {merge && <Txt size={12} color={c.muted}>Bloc fusionné ({merge.sources.length} blocs d’origine : {merge.sources.map(s => `p. ${s.printedPage} ${s.blockId}`).join(', ')}). Il peut encore être fusionné avec un autre bloc.</Txt>}
      </View>
    );
  }

  function renderPanel() {
    if (panel === 'correct' || panel === 'normalize') {
      return (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Txt size={13} bold>{panel === 'normalize' ? 'Proposition de normalisation des paragraphes' : 'Correction du texte affiché'}</Txt>
          <TextInput multiline value={editText} onChangeText={setEditText} accessibilityLabel="Éditeur de correction"
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, minHeight: 140, fontSize: 15, color: c.ink, backgroundColor: c.paper }} />
          {panel === 'normalize' && <Txt size={12} color={c.muted}>
            Vérifiez cette proposition avant de l’enregistrer. Elle devient une correction locale avec historique et peut être annulée.
          </Txt>}
          <Txt size={12} color={c.muted}>Texte original de la source (inchangé) :</Txt>
          {sources.map(s => {
            const raw = packet.pages.find(p => p.printedPage === s.printedPage)?.parts?.find(p => p.id === s.blockId)?.text ?? '';
            return <Text key={`${s.printedPage}:${s.blockId}`} selectable style={{ color: c.muted, fontSize: 13 }}>{raw}</Text>;
          })}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title={panel === 'normalize' ? 'Accepter la normalisation' : 'Enregistrer la correction'} disabled={busy || !editText.trim()} onPress={saveCorrection} />
            <Button title="Annuler" secondary onPress={() => setPanel('none')} />
          </View>
        </View>
      );
    }
    if (panel === 'split') {
      let preview: { firstText: string; secondText: string } | null = null;
      let previewError = '';
      try { preview = splitPreview(shownText, Number(splitPosition)); } catch (reason) { previewError = String(reason); }
      return (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Txt size={13} bold>Séparer le bloc</Txt>
          <Txt size={12} color={c.muted}>Indiquez la position de coupure dans le texte affiché. Les deux nouveaux passages restent rattachés aux mêmes sources et historiques.</Txt>
          <TextInput value={splitPosition} onChangeText={setSplitPosition} keyboardType="numeric" accessibilityLabel="Position de séparation"
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, color: c.ink, backgroundColor: c.paper }} />
          {preview ? <View style={{ gap: 6 }}>
            <Txt size={12} color={c.muted}>Aperçu des nouveaux blocs</Txt>
            <Text selectable style={{ color: c.ink, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 8 }}>{preview.firstText}</Text>
            <Text selectable style={{ color: c.ink, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 8 }}>{preview.secondText}</Text>
          </View> : <Txt size={12} color="#dc3545">{previewError}</Txt>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title="Enregistrer la séparation" disabled={busy || !preview} onPress={confirmSplit} />
            <Button title="Annuler" secondary onPress={() => setPanel('none')} />
          </View>
        </View>
      );
    }
    if (panel === 'add-manual') {
      return (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Txt size={13} bold>Ajouter un bloc après</Txt>
          <Txt size={12} color={c.muted}>Aperçu avant enregistrement : ce texte sera un nouveau bloc indépendant, ancré après « {part?.id} » et rattaché à sa page PDF. Le paquet source reste inchangé.</Txt>
          <TextInput multiline value={manualText} onChangeText={setManualText} accessibilityLabel="Texte du nouveau bloc manuel"
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, minHeight: 120, color: c.ink, backgroundColor: c.paper }} />
          {!!manualText.trim() && <View style={{ gap: 4 }}>
            <Txt size={12} color={c.primary}>Aperçu du nouveau bloc</Txt>
            <Text selectable style={{ color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10 }}>{manualText}</Text>
          </View>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title="Confirmer l’ajout du bloc" disabled={busy || !manualText.trim()} onPress={confirmManualBlock} />
            <Button title="Annuler" secondary onPress={() => setPanel('none')} />
          </View>
        </View>
      );
    }
    if (panel === 'associate' && ref) {
      const choices = logical.filter(item => !(item.printedPage === ref.printedPage && item.blockId === ref.blockId))
        .filter(item => `${item.printedPage} ${item.blockId} ${item.part.text}`.toLocaleLowerCase().includes(associationSearch.toLocaleLowerCase()));
      const selected = associationTarget ? logical.find(item => JSON.stringify([item.printedPage, item.blockId]) === associationTarget) : undefined;
      return <View style={{ gap: 8, marginTop: 12 }}>
        <Txt size={13} bold>{editingAssociation ? 'Modifier l’association' : 'Associer un élément'}</Txt>
        <Txt size={12} bold>Source · p. {ref.printedPage} · {ref.blockId}</Txt>
        <Txt size={12} color={c.muted}>Vous pouvez associer plusieurs passages de ce texte. Références enregistrées : {associations.filter(value => value.source.printedPage === ref.printedPage && value.source.blockId === ref.blockId).length}.</Txt>
        <Txt size={12} color={c.muted}>Sélectionnez le passage à associer ci-dessous, ou saisissez son texte exact. L’occurrence est comptée à partir de 0.</Txt>
        <TextInput multiline readOnly value={shownText} accessibilityLabel="Sélectionner le passage source"
          onSelectionChange={({ nativeEvent: { selection: range } }) => {
            if (range.end <= range.start) return;
            const text = shownText.slice(range.start, range.end);
            let occurrence = 0;
            let at = shownText.indexOf(text);
            while (at >= 0 && at < range.start) { occurrence += 1; at = shownText.indexOf(text, at + text.length); }
            if (at !== range.start) return;
            setAnchorText(text);
            setAnchorOccurrence(String(occurrence));
          }}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, height: 160, fontSize: 16, color: c.ink, backgroundColor: c.paper }} />
        <TextInput value={anchorText} onChangeText={setAnchorText} accessibilityLabel="Texte exact de l’ancre" placeholder="Texte exact de l’ancre"
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, color: c.ink, backgroundColor: c.paper }} />
        <TextInput value={anchorOccurrence} onChangeText={setAnchorOccurrence} keyboardType="numeric" accessibilityLabel="Occurrence de l’ancre"
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, color: c.ink, backgroundColor: c.paper }} />
        <TextInput value={associationSearch} onChangeText={setAssociationSearch} accessibilityLabel="Rechercher une destination logique" placeholder="Rechercher bloc, texte ou page"
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, color: c.ink, backgroundColor: c.paper }} />
        <ScrollView nestedScrollEnabled style={{ maxHeight: 180, borderWidth: 1, borderColor: c.line, borderRadius: 8 }}>
          {choices.map(item => {
            const key = JSON.stringify([item.printedPage, item.blockId]);
            return <Pressable key={key} accessibilityRole="button" onPress={() => setAssociationTarget(key)}
              accessibilityState={{ selected: associationTarget === key }}
              style={{ minHeight: 48, padding: 9, backgroundColor: associationTarget === key ? c.mint : undefined }}>
              <Txt size={12} bold>p. {item.printedPage} · {item.blockId}{item.manual ? ' · bloc manuel' : ''}</Txt>
              <Txt size={12} numberOfLines={2}>{item.part.text}</Txt>
            </Pressable>;
          })}
        </ScrollView>
        {selected && <View style={{ padding: 10, borderRadius: 8, backgroundColor: c.mint }}>
          <Txt size={12} bold>Aperçu destination · p. {selected.printedPage} · {selected.blockId}</Txt><Txt size={12}>{selected.part.text}</Txt>
          {(selected.part.role === 'figure' || selected.part.role === 'table' || selected.part.kind === 'visual') && <Image
            source={{ uri: selected.part.image }} accessibilityLabel="Aperçu de l’élément associé"
            resizeMode="contain" style={{ width: '100%', height: 200 }} />}
        </View>}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Enregistrer l’association" disabled={busy || !anchorText.trim() || !associationTarget} onPress={() => saveAssociation()} />
          <Button title="Enregistrer et ajouter une référence" secondary disabled={busy || !anchorText.trim() || !associationTarget} onPress={() => saveAssociation(true)} />
          <Button title="Annuler" secondary onPress={() => setPanel('none')} />
        </View>
      </View>;
    }
    if (panel === 'table' && ref) {
      return <TableEditor key={current?.key} initial={table} sourcePart={part!} busy={busy} onSave={saveTable} onCancel={() => setPanel('none')} />;
    }
    if (panel === 'comment') {
      return (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Txt size={13} bold>{imageOnly ? 'Commentaire facultatif (figure ou tableau)' : 'Commentaire sur le passage'}</Txt>
          <TextInput multiline value={comment} onChangeText={setComment} accessibilityLabel="Commentaire d’anomalie"
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, minHeight: 90, color: c.ink, backgroundColor: c.paper }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={editingAnomaly ? 'Mettre à jour le commentaire' : 'Enregistrer le commentaire'} disabled={busy} onPress={saveComment} />
            <Button title="Annuler" secondary onPress={() => setPanel('none')} />
          </View>
        </View>
      );
    }
    return null;
  }

  function renderBlock() {
    if (!loaded) return <Txt color={c.muted}>Chargement des validations…</Txt>;
    if (!current || !page || !part || !presentation) {
      return <Txt color={c.muted}>{filter === 'pending' ? 'Aucun bloc à vérifier.' : 'Aucun bloc ne correspond à ce filtre.'}</Txt>;
    }
    const status = current.status;
    const mineAnomalies = blockAnomalies();
    return (
      <View style={{ flex: 1, minWidth: wide ? 300 : '100%', gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt size={12} color={c.muted}>Statut : {statusLabels[status]}</Txt>
          <Txt size={12} color={c.muted}>Bloc {part.id} · {roles[part.role] ?? part.role} · p. {page.printedPage}</Txt>
        </View>
        {kind === 'table' && table && !table.keepOriginal && <CourseTable table={table} />}
        {kind === 'table' && <Txt size={12} color={c.muted}>
          {!table ? 'Tableau : image originale conservée (à droite). Aucune reconstruction numérique.'
            : table.validated ? 'Tableau numérique validé : il remplace l’image dans le cours.'
              : table.keepOriginal ? 'Reconstruction non utilisée : l’image originale est conservée dans le cours.'
                : 'Brouillon de tableau : non validé, l’image originale reste affichée dans le cours.'}
        </Txt>}
        {kind && kind !== 'table' && <Txt size={12} color={c.primary}>Type : {kindLabel(kind)}{kind === 'toc' ? ' · masqué dans le cours, conservé dans les pages originales' : kind === 'bibliography' ? ' · conservé dans les données privées et l’export, masqué dans le cours de révision' : kind === 'h1' || kind === 'authors' ? ' · affiché dans l’en-tête' : ''}</Txt>}
        {presentation.hyphenation?.some(change => change.status === 'repaired') && <Txt size={12} color={c.primary}>
          Césure PDF reconstituée dans la présentation ; le texte brut et le PDF restent inchangés.
        </Txt>}
        {presentation.hyphenation?.some(change => change.status === 'ambiguous') && <Txt size={12} color="#b45309">
          Césure ambiguë conservée : vérifiez-la avec le PDF avant de corriger.
        </Txt>}
        {normalization?.decisions.some(change => change.status === 'ambiguous') && <Txt size={12} color="#b45309">
          Retour de ligne ambigu conservé : vérifiez la séparation de paragraphe avec le PDF.
        </Txt>}
        {kind === 'table' ? null : imageOnly
          ? <Txt size={12} color={c.muted}>Figure ou tableau complexe : conservé en image originale (à droite). Jamais remplacé par du texte.</Txt>
          : <ScrollView nestedScrollEnabled style={{ maxHeight: wide ? 460 : 300 }}>
              <SourcePresentationText presentation={presentation} size={16} heading={part.role === 'heading'} />
            </ScrollView>}
        {panel === 'none' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <Button title="À vérifier" secondary={status !== 'pending'} disabled={busy} onPress={() => setStatus('pending')} />
          <Button title="En cours" secondary={status !== 'in-review'} disabled={busy} onPress={() => setStatus('in-review')} />
          <Button title="Vérifié ✓" secondary={!isVerified(status)} disabled={busy} onPress={() => setStatus('verified')} />
          <Button title="Anomalie !" secondary={status !== 'issue-found'} disabled={busy} onPress={openCorrection} />
        </View>}
        {panel === 'none' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title="Ajouter un bloc après" secondary disabled={busy} onPress={openManualBlock} />
          <Button title="Associer un élément" secondary disabled={busy || imageOnly} onPress={() => openAssociation()} />
          {currentLogical?.manual && <Button title="Annuler la création du bloc" secondary disabled={busy} onPress={undoManualBlock} />}
          {canNormalize && <Button title="Proposer la normalisation des paragraphes" secondary onPress={proposeNormalization} />}
          {hasActiveCorrection(validation, ref!) && <Button title="Annuler la correction" secondary disabled={busy} onPress={cancelCorrection} />}
        </View>}
        {panel === 'none' && <View style={{ gap: 6 }}>
          <Txt size={11} color={c.muted}>Classification du bloc</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label="Texte normal" selected={!kind} onPress={() => changeKind(null)} />
            {BLOCK_KINDS.map(k => <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => changeKind(k.id)} />)}
          </View>
          {kind === 'table' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button title={table ? 'Modifier le tableau numérique' : 'Reconstruire le tableau'} secondary onPress={() => setPanel('table')} />
            {table && !table.validated && <Button title="Valider le tableau" disabled={busy} onPress={() => decideTable('validate')} />}
            {table && !table.keepOriginal && <Button title="Conserver l’image originale" secondary disabled={busy} onPress={() => decideTable('keep-original')} />}
            {table && (table.validated || table.keepOriginal) && <Button title="Remettre en brouillon" secondary disabled={busy} onPress={() => decideTable('draft')} />}
          </View>}
        </View>}
        {renderPanel()}
        {panel === 'none' && renderMergeControls()}
        {panel === 'none' && (() => {
          const nextTarget = targets[targets.findIndex(target => target.key === current.key) + 1];
          const nextPart = nextTarget && packet.pages[nextTarget.pageIndex]?.parts?.find(candidate => candidate.id === nextTarget.blockId);
          const nextPresentation = nextTarget && nextPart ? workingPresentation(packet.pages[nextTarget.pageIndex].printedPage, nextPart, validation) : null;
          const candidate = nextPresentation ? boundaryHyphenation(shownText, nextPresentation.text) : null;
          return candidate?.status === 'repaired' && mergeable
            ? <Button title="Proposer la jonction par césure" secondary onPress={proposeBoundaryHyphenation} />
            : null;
        })()}
        {panel === 'none' && (() => {
          const nextTarget = targets[targets.findIndex(target => target.key === current.key) + 1];
          const nextPart = nextTarget && packet.pages[nextTarget.pageIndex]?.parts?.find(candidate => candidate.id === nextTarget.blockId);
          const nextPage = nextTarget ? packet.pages[nextTarget.pageIndex] : undefined;
          if (!nextPart || !nextPage) return null;
          const nextPresentation = workingPresentation(nextPage.printedPage, nextPart, validation);
          const candidate = nextPresentation ? boundaryParagraphNormalization(shownText, nextPresentation.text, part.role, nextPart.role) : null;
          return candidate?.status === 'repaired' && mergeable
            ? <Button title="Proposer la jonction de paragraphe" secondary onPress={proposeBoundaryParagraph} />
            : null;
        })()}
        {renderMergeDraft()}
        {panel === 'none' && associations.filter(value => value.source.printedPage === ref!.printedPage && value.source.blockId === ref!.blockId).map(value =>
          <View key={value.id} style={{ padding: 8, borderRadius: 8, backgroundColor: value.state === 'active' ? c.mint : '#FFF3CD', gap: 4 }}>
            <Txt size={12} bold>Association · « {value.anchor.text} » → p. {value.target.printedPage} · {value.target.blockId}</Txt>
            <Txt size={11} color={c.muted}>{value.state === 'active' ? 'Active' : 'À réassocier : aucune redirection automatique.'}</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Modifier" secondary onPress={() => openAssociation(value)} /><Button title="Supprimer" secondary onPress={() => void removeAssociation(value.id)} /></View>
          </View>)}
        {mineAnomalies.map((a, i) => (
          <View key={a.id} style={{ padding: 10, borderRadius: 8, backgroundColor: c.mint, gap: 4 }}>
            <Txt size={12} bold>Anomalie {i + 1} · {a.status === 'resolved' ? 'résolue' : a.status === 'open' ? 'ouverte' : 'à revérifier'} · {a.blockId}</Txt>
            <Txt size={13}>{a.description}</Txt>
            {a.status !== 'resolved' && <Button title={`Modifier l’anomalie ${i + 1}`} secondary onPress={() => openComment(a)} />}
          </View>
        ))}
      </View>
    );
  }

  function renderPdf() {
    if (!current || !page || !part) return null;
    const refs = currentLogical?.manual ? [{ printedPage: currentLogical.manual.sourceRef.printedPage, blockId: currentLogical.manual.sourceRef.blockId }] : sources;
    const originals = refs.map(s => {
      const p = packet.pages.find(x => x.printedPage === s.printedPage);
      return { s, page: p, part: p?.parts?.find(x => x.id === s.blockId) };
    }).filter(o => o.page && o.part);
    return (
      <View style={{ flex: 1, minWidth: wide ? 300 : '100%', gap: 8 }}>
        <Txt size={13} bold>PDF original</Txt>
        {originals.map(o => (
          <View key={`${o.s.printedPage}:${o.s.blockId}`} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 6, gap: 4 }}>
            <OriginalVisual image={o.part!.image}
              ratio={(o.part!.bbox[3] - o.part!.bbox[1]) / Math.max(1, o.part!.bbox[2] - o.part!.bbox[0])}
              label={`Original p. ${o.s.printedPage} ${o.s.blockId}`} />
            <Button title={`Ouvrir le PDF p. ${o.s.printedPage}`} secondary onPress={() => openOriginalPage(o.page!).catch(() => {})} />
          </View>
        ))}
      </View>
    );
  }

  function download() {
    if (!validation) return;
    const day = new Date().toISOString().slice(0, 10);
    const data = buildStructureExport(packet, validation, anomalies);
    const name = `norya-chapitre-complet-${packet.chapterId}-${day}.json`;
    const ok = downloadFile(name, JSON.stringify(data, null, 2), 'application/json');
    setExportNotice(ok
      ? `${name} téléchargé par le navigateur. Il n’est PAS encore enregistré dans Codespaces : transmettez-le ou placez-le sous references-privees/exports/. Votre travail reste enregistré automatiquement dans Norya.`
      : 'Téléchargement indisponible sur cet appareil. Votre travail reste enregistré localement dans Norya ; rien n’a été écrit dans Codespaces.');
  }
  async function importExport() {
    try {
      const next = importStructureExport(importText, packet, base());
      if (await commit(next)) { setExportNotice('Export importé et enregistré localement. Fusions et corrections reconstituées sans doublon.'); setImportText(''); }
    } catch (reason) { setExportNotice(`Import refusé : ${String(reason)}`); }
  }

  function renderExport() {
    if (!showExport) return null;
    return (
      <Card>
        <Txt bold>Exporter / importer</Txt>
        <Txt size={12} color={c.muted}>« Enregistré localement » = stockage de ce navigateur (Safari). « Exporté dans Codespaces » = fichier réel sous references-privees/ ; il n’est jamais publié sur GitHub.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title="Exporter le chapitre complet" onPress={download} />
        </View>
        <TextInput multiline value={importText} onChangeText={setImportText} placeholder="Collez ici un export JSON (ancien ou nouveau) à réimporter"
          accessibilityLabel="Import d’un export"
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, minHeight: 70, color: c.ink, backgroundColor: c.paper }} />
        <Button title="Importer l’export collé" secondary disabled={!importText.trim() || busy} onPress={importExport} />
        {exportNotice && <Txt size={12} color={c.ink}>{exportNotice}</Txt>}
        <Button title="Fermer" secondary onPress={() => setShowExport(false)} />
      </Card>
    );
  }

  function renderBatchNormalization() {
    if (!batchPlan) return null;
    return (
      <Card>
        <Txt bold>Nettoyage global des retours à la ligne</Txt>
        <Txt size={12} color={c.muted}>
          Seules les propositions sûres sont listées. Les corrections manuelles et fusions modifiées sont exclues.
          Un bloc déjà vérifié conserve sa trace de validation, mais repasse en révision après modification.
        </Txt>
        {!batchPlan.proposals.length && <Txt>Aucune normalisation sûre à enregistrer.</Txt>}
        {batchPlan.proposals.map(proposal => (
          <View key={proposal.id} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Txt size={12} bold>p. {proposal.refs.map(ref => ref.printedPage).join(', ')} · {proposal.refs.map(ref => ref.blockId).join(' + ')}{proposal.wasVerified ? ' · à revoir' : ''}</Txt>
            <Txt size={12} color={c.muted}>Avant</Txt>
            <Text selectable style={{ color: c.ink, fontSize: 13 }}>{proposal.before}</Text>
            <Txt size={12} color={c.primary}>Après</Txt>
            <Text selectable style={{ color: c.ink, fontSize: 13 }}>{proposal.after}</Text>
          </View>
        ))}
        {!!batchPlan.ambiguities.length && <View style={{ gap: 4 }}>
          <Txt size={12} color="#b45309">{batchPlan.ambiguities.length} séparation(s) ambiguë(s) conservée(s) : ouvrez-les individuellement pour comparaison PDF.</Txt>
          {batchPlan.ambiguities.map((ambiguity, index) => <Button key={`${ambiguity.ref.printedPage}:${ambiguity.ref.blockId}:${index}`}
            title={`Ouvrir p. ${ambiguity.ref.printedPage} · ${ambiguity.ref.blockId}`} secondary onPress={() => {
              setFilter('all');
              setSelectedKey(reviewKey(packet.chapterId, ambiguity.ref.printedPage, ambiguity.ref.blockId));
              setBatchPlan(null);
            }} />)}
        </View>}
        <Txt size={12} color={c.muted}>{batchPlan.skipped} bloc(s) exclu(s) (visuel, tableau, correction ou fusion déjà modifiée).</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title={`Appliquer ${batchPlan.proposals.length} normalisation(s)`} disabled={busy || !batchPlan.proposals.length} onPress={acceptBatchNormalization} />
          <Button title="Fermer l’aperçu" secondary onPress={() => setBatchPlan(null)} />
        </View>
      </Card>
    );
  }

  function renderBraceNormalization() {
    if (!bracePlan) return null;
    return (
      <Card>
        <Txt bold>Correction proposée des parenthèses</Txt>
        <Txt size={12} color={c.muted}>Les accolades sont remplacées uniquement dans les passages de prose suspects. Vérifiez chaque proposition contre le PDF : les corrections manuelles sont exclues et un bloc déjà vérifié devra être confirmé à nouveau.</Txt>
        {!bracePlan.proposals.length && <Txt>Aucune accolade suspecte à proposer.</Txt>}
        {bracePlan.proposals.map(proposal => (
          <View key={proposal.id} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Txt size={12} bold>p. {proposal.refs.map(ref => ref.printedPage).join(', ')} · {proposal.refs.map(ref => ref.blockId).join(' + ')}{proposal.kind === 'table' ? ' · cellules du tableau' : ''}{proposal.wasVerified ? ' · à revoir' : ''}</Txt>
            <Txt size={12} color={c.muted}>Avant</Txt><Text selectable style={{ color: c.ink, fontSize: 13 }}>{proposal.before}</Text>
            <Txt size={12} color={c.primary}>Après</Txt><Text selectable style={{ color: c.ink, fontSize: 13 }}>{proposal.after}</Text>
          </View>
        ))}
        <Txt size={12} color={c.muted}>{bracePlan.skipped} bloc(s) exclu(s) (visuel, tableau source sans reconstruction ou correction/fusion manuelle).</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title={`Appliquer ${bracePlan.proposals.length} correction(s)`} disabled={busy || !bracePlan.proposals.length} onPress={acceptBraceNormalization} />
          <Button title="Fermer l’aperçu" secondary onPress={() => setBracePlan(null)} />
        </View>
      </Card>
    );
  }

  const targetLabel = (target: typeof current) => {
    if (!target) return '';
    const item = logical.find(block => block.printedPage === target.printedPage && block.blockId === target.blockId);
    const saved = savedBlock(validation, target.printedPage, target.blockId);
    const text = item?.part.text.replace(/\s+/gu, ' ').trim() ?? '';
    return `Bloc ${target.blockIndex + 1}${saved?.kind ? ` · ${kindLabel(saved.kind)}` : ''}${text ? ` — ${text.slice(0, 44)}${text.length > 44 ? '…' : ''}` : ''}`;
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Txt bold>Vérification manuelle</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Nettoyer les retours à la ligne" secondary disabled={!loaded || busy} onPress={openBatchNormalization} />
          <Button title="Vérifier les parenthèses" secondary disabled={!loaded || busy} onPress={openBraceNormalization} />
          <Button title="Exporter / importer" secondary onPress={() => setShowExport(!showExport)} />
          <Button title="Fermer" secondary onPress={onClose} />
        </View>
      </View>
      <View style={{ gap: 8, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper }}>
        {deletedBlockLinks.length > 0 && <View style={{ gap: 6 }}>
          <Txt size={12}>{deletedBlockLinks.length} association(s) concernent un bloc déjà supprimé. Leur retrait conserve l’historique et vos validations.</Txt>
          <Button title="Retirer les associations des blocs supprimés" disabled={busy || !loaded}
            onPress={() => void commit(repairDeletedBlockAssociations(base()), 'Associations des blocs supprimés retirées et enregistrées. Vous pouvez relancer la finalisation.')} />
        </View>}
        <Txt size={12} bold>Aller à la page</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {visiblePages.map(printedPage => <Chip key={printedPage} label={`p. ${printedPage}`} selected={selectedPage === printedPage}
              onPress={() => {
                setJumpPage(printedPage);
                const target = visible.find(candidate => candidate.printedPage === printedPage);
                if (target) navigateTo(target);
              }} />)}
          </View>
        </ScrollView>
        <Txt size={12} bold>Aller au bloc</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {pageBlocks.map(target => <Chip key={target.key} label={targetLabel(target)} selected={current?.key === target.key}
              onPress={() => navigateTo(target)} />)}
          </View>
        </ScrollView>
        {!pageBlocks.length && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Txt size={12} color={c.muted}>Aucun bloc de cette page dans le filtre actif.</Txt>
          <Button title="Passer à Tous" secondary onPress={() => { setFilter('all'); setJumpPage(null); }} />
        </View>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REVIEW_FILTERS.map(f => <Chip key={f.id} label={`${f.label} (${counts[f.id]})`} selected={filter === f.id} onPress={() => pickFilter(f.id)} />)}
      </View>
      <Txt size={12} color={c.muted}>{visible.length} bloc(s) pour ce filtre{current ? ` · bloc ${position + 1}/${visible.length}` : ''}</Txt>
      {renderExport()}
      {renderBatchNormalization()}
      {renderBraceNormalization()}
      {error && <Txt size={12} color="#dc3545">{error}</Txt>}
      {notice && <Txt size={12} color={c.primary}>{notice}</Txt>}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
        {renderBlock()}
        {renderPdf()}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Bloc précédent" secondary disabled={position <= 0} onPress={() => go(-1)} />
        <Button title="Bloc suivant" secondary disabled={position < 0 || position >= visible.length - 1} onPress={() => go(1)} />
      </View>
    </View>
  );
}

/** Hook conservé pour compatibilité avec les intégrations existantes. */
export function useVerificationMode(packet: SourcePacket | null, controlReport: any | null) {
  const [showVerification, setShowVerification] = useState(false);
  const verificationProps = packet && controlReport ? { packet, controlReport, onClose: () => setShowVerification(false) } : null;
  return { showVerification, setShowVerification, verificationProps };
}
