import { RevisionCardJsonActions } from './RevisionCardJsonActions';
import { ManualTranslationActions } from './ManualTranslationActions';
import { ChapterBackupActions } from './ChapterBackupActions';
import { ChapterPdfActions } from './ChapterPdfActions';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Txt } from './ui';
import { ReadingAction } from './CourseReadingTools';
import { PrivateSourceCourse } from './PrivateSourceCourse';
import { finalizationBlockages, summarizeFinalizationBlockages, type FinalCourseArchive, type FinalizationEvidence, type Blockage } from '../domain/sourceCourse/finalization';
import { finalizeCourse, loadFinalCourse, reopenCourse, selectFinalVersion } from '../domain/sourceCourse/finalizedStorage';
import { loadValidation } from '../domain/sourceCourse/verification';
import { loadChapterAnomalies } from '../domain/sourceCourse/anomalies';
import { loadPrivateCourse } from '../services/storage/privateCourse';
import type { SourcePacket } from '../domain/sourceCourse/packet';
import type { CourseStructure } from '../domain/sourceCourse/courseStructure';

export function CourseWorkspace({ chapterId, initialReview = false, onArchiveChange, onStructure }: {
  chapterId: string; initialReview?: boolean; onArchiveChange?: (archive: FinalCourseArchive) => void;
  onStructure?: (structure: CourseStructure) => void;
}) {
  const [restorationNotice, setRestorationNotice] = useState('');
  function restored() { setRestorationNotice('Données enregistrées et relues. Actualisez puis contrôlez le lecteur et les illustrations.'); setRestoration(n => n + 1); }
  const [restoration, setRestoration] = useState(0);
  const [archive, setArchive] = useState<FinalCourseArchive | null>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [packet, setPacket] = useState<SourcePacket | null>(null);
  const [blockages, setBlockages] = useState<Blockage[]>([]);
  const [showBlockageDetails, setShowBlockageDetails] = useState(false);
  const [confirmation, setConfirmation] = useState<FinalizationEvidence | null>(null);
  const [target, setTarget] = useState<{ printedPage?: number; blockId?: string; nonce: number }>();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    let active = true;
    setArchive(undefined); setPacket(null); setConfirmation(null); setBlockages([]);
    loadFinalCourse(chapterId).then(a => { if (active) setArchive(a); }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [chapterId, restoration]);
  function changed(a: FinalCourseArchive) { setArchive(a); setConfirmation(null); setMenuOpen(false); onArchiveChange?.(a); }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function evidence(): Promise<FinalizationEvidence> {
    // Read persisted reviews, never the verification component's provisional state.
    const freshPacket = await loadPrivateCourse(chapterId) ?? packet;
    if (!freshPacket || freshPacket.chapterId !== chapterId) throw new Error('Cours privé indisponible pour ce chapitre.');
    const [validation, anomalies] = await Promise.all([loadValidation(chapterId), loadChapterAnomalies(chapterId)]);
    return { packet: freshPacket, validation, anomalies };
  }
  async function prepare() {
    setConfirmation(null);
    const e = await evidence(); const blocks = finalizationBlockages(e, archive);
    setBlockages(blocks);
    setShowBlockageDetails(blocks.length > 0);
    if (!blocks.length) setConfirmation(e);
  }
  async function confirm() {
    if (!confirmation) return;
    const fresh = await evidence();
    if (JSON.stringify(fresh) !== JSON.stringify(confirmation)) {
      setConfirmation(null); setBlockages(finalizationBlockages(fresh, archive));
      throw new Error('Le cours ou ses validations ont changé. Relancez le contrôle avant de confirmer.');
    }
    changed(await finalizeCourse(fresh, archive?.revision ?? 0, true));
  }
  const current = archive?.versions.find(v => v.version === archive.activeVersion);
  const blockageSummary = summarizeFinalizationBlockages(blockages);
  return <View style={{ gap: 16 }}>
    {!!restorationNotice && <Card><Txt>{restorationNotice}</Txt></Card>}
    {!!error && <Card><Txt>{error}</Txt></Card>}
    {archive === undefined ? <Card><Txt>Chargement du cours…</Txt></Card> : archive?.status === 'finalized' && current ? <>
      <PrivateSourceCourse chapterId={chapterId} key={`final-${current.version}`} finalizedVersion={current} onStructure={onStructure}
        managementAction={<ReadingAction label="Gérer le chapitre" icon="create-outline" onPress={() => { setMenuOpen(!menuOpen); }} />}
        managementMenu={menuOpen ? (
      <View style={{ gap: 6, padding: 10 }}>
        <ManualTranslationActions final={current} />
      <ChapterBackupActions chapterId={chapterId} onRestored={restored} />
      <RevisionCardJsonActions chapterId={chapterId} archive={archive} />
      <Button title="Modifier le cours" secondary disabled={busy}
        onPress={() => void run(async () => { changed(await reopenCourse(chapterId, archive.revision)); setTarget({ nonce: Date.now() }); })} />
      </View>
        ) : null} />
    </> : <>
      <Card>
        <Txt bold>{archive ? 'En correction' : 'En préparation'}</Txt>
        <ChapterBackupActions chapterId={chapterId} onRestored={restored} />
        {current && <>
          <Txt>La version {current.version} reste conservée. La prochaine finalisation créera une nouvelle version.</Txt>
          <Button title={`Revenir au cours finalisé · version ${current.version}`} secondary disabled={busy}
            onPress={() => void run(async () => changed(await selectFinalVersion(chapterId, archive!.revision, current.version)))} />
        </>}
        <Button title="Finaliser et enregistrer le cours" disabled={busy || !packet}
          onPress={() => void run(prepare)} />
        {blockages.length > 0 && <View style={{ gap: 4 }}>
          <Txt bold>Finalisation bloquée : {blockages.length} point(s) à contrôler</Txt>
          {!!blockageSummary.activeBlocks && <Txt>Blocs actifs non vérifiés : {blockageSummary.activeBlocks}</Txt>}
          {!!blockageSummary.manualBlocks && <Txt>Blocs manuels non vérifiés ou sans provenance : {blockageSummary.manualBlocks}</Txt>}
          {!!blockageSummary.anomalies && <Txt>Anomalies ouvertes ou à revérifier : {blockageSummary.anomalies}</Txt>}
          {!!blockageSummary.tables && <Txt>Tableaux à contrôler : {blockageSummary.tables}</Txt>}
          {!!blockageSummary.structure && <Txt>Problèmes de structure ou de sauvegarde : {blockageSummary.structure}</Txt>}
          <Button title={showBlockageDetails ? 'Masquer les éléments bloquants' : 'Consulter les éléments bloquants'} secondary
            onPress={() => setShowBlockageDetails(!showBlockageDetails)} />
        </View>}
        {showBlockageDetails && blockages.map((b, i) => <View key={i} style={{ gap: 4 }}>
          <Txt>{b.printedPage ? `Page ${b.printedPage}${b.blockId ? ` · ${b.blockId}` : ''} : ` : ''}{b.message}</Txt>
          <Button title={b.printedPage ? 'Accéder au passage' : 'Ouvrir la vérification'} secondary
            onPress={() => { setConfirmation(null); setTarget({ ...b, nonce: Date.now() }); }} />
        </View>)}
        {confirmation && <>
          <Txt>Tous les blocs sont vérifiés et aucune anomalie active ne subsiste. Confirmez avoir contrôlé l’association et la présence de toutes les figures et tableaux attendus, ainsi que l’enregistrement de toute fusion. Une version stable privée sera conservée.</Txt>
          <Button title="Je confirme et finalise le cours" disabled={busy} onPress={() => void run(confirm)} />
          <Button title="Continuer la vérification" secondary disabled={busy} onPress={() => setConfirmation(null)} />
        </>}
      </Card>
      <PrivateSourceCourse chapterId={chapterId} key={`draft-${chapterId}-${restoration}`} initialReview={initialReview} initialPacket={current?.packet as SourcePacket | undefined}
        onPacketLoaded={setPacket} onStructure={onStructure} reviewTarget={target} />
    </>}
  </View>;
}
