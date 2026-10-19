import { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Txt } from './ui';
import { CourseTable } from './CourseBlocks';
import { frenchNodes, prepareTranslation, type TranslateSnapshot, type TranslateNode, type PreparedTranslation,
  type TranslateScope, type ValidatedTranslation } from '../domain/sourceCourse/translateBridge';
import { lookupFrench, translateApi } from '../domain/sourceCourse/translateClient';

/** Separate rendering surface: local translations and annotations are never rewritten. */
export function TranslateDocumentView({ nodes }: { nodes: TranslateNode[] }) {
  const [zoom, setZoom] = useState<string>();
  return <View style={{ gap: 18 }}>
    {nodes.filter(n => !n.hide).map(n => <View key={JSON.stringify([n.printedPage, n.blockId])}>
      <Txt size={11}>Page {n.printedPage}</Txt>
      {n.imageOnly ? <View>
        <Image source={{ uri: n.image }} style={{ width: '100%', height: 280 }} resizeMode="contain" />
        <Button title="Agrandir l’image originale" onPress={() => setZoom(n.image)} />
      </View> : n.table && n.kind === 'table' ? <CourseTable table={n.table} /> :
        <Text selectable accessibilityRole={n.kind?.startsWith('h') || n.role === 'heading' ? 'header' : undefined}
          style={{ fontSize: n.kind?.startsWith('h') || n.role === 'heading' ? 23 : 17, lineHeight: 28 }}>
          {n.text === n.lines.map(l => l.map(r => r.text).join('')).join('\n')
            ? n.lines.map((line, r) => <Text key={r}>{r > 0 ? '\n' : ''}{line.map((run, c) => <Text key={c}
              style={{ fontWeight: run.bold ? 'bold' : 'normal', fontStyle: run.italic ? 'italic' : 'normal' }}>{run.text}</Text>)}</Text>)
            : n.text}
        </Text>}
    </View>)}
    {zoom && <Modal visible onRequestClose={() => setZoom(undefined)}>
      <Button title="Fermer l’image" onPress={() => setZoom(undefined)} />
      <ScrollView maximumZoomScale={5} minimumZoomScale={1}><Image source={{ uri: zoom }} style={{ width: 1400, height: 1800 }} resizeMode="contain" /></ScrollView>
    </Modal>}
  </View>;
}

export function TranslateAdminPanel({ snapshot, eligible }: { snapshot: TranslateSnapshot; eligible: boolean }) {
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [scope, setScope] = useState<TranslateScope>({ kind: 'chapter' });
  const [prepared, setPrepared] = useState<PreparedTranslation>();
  const [result, setResult] = useState<ValidatedTranslation>();
  const [job, setJob] = useState<string>();
  const [status, setStatus] = useState('Connexion administratrice requise.');
  const [confirm, setConfirm] = useState(false); const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0); const lock = useRef(false);
  useEffect(() => {
    const g = ++generation.current;
    setPrepared(undefined); setResult(undefined); setJob(undefined); setConfirm(false); setPreview(false);
    if (!eligible || !admin) return;
    setStatus('Vérification de la version…');
    void prepareTranslation(snapshot, scope).then(async p => {
      if (g !== generation.current) return;
      const found = await lookupFrench(p);
      if (g !== generation.current) return;
      setPrepared(p); setResult(found ?? undefined);
      setStatus(found ? 'Traduit · tous les textes validés' : 'Non traduit');
      if (found) setPreview(true);
    }).catch(e => { if (g === generation.current) setStatus(`Erreur : ${e.message}`); });
    return () => { generation.current++; };
  }, [snapshot, scope, admin, eligible]);
  async function run(work: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await work(); } catch (e) { setStatus(`Erreur : ${e instanceof Error ? e.message : String(e)}`); }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => { let active = true; void translateApi('session').then(() => { if (active) setAdmin(true); }).catch(() => {});
    return () => { active = false; }; }, []);
  if (!eligible) return <Txt>Translate : finalisez d’abord la vérification humaine du cours. Les traductions locales restent disponibles.</Txt>;
  return <View testID="translate-admin" style={{ gap: 8 }}>
    <Txt bold>Norya Translate · accès administratrice</Txt>
    <Text accessibilityLiveRegion="polite">{status}</Text>
    {!admin ? <>
      <TextInput accessibilityLabel="E-mail administratrice" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput accessibilityLabel="Mot de passe administratrice" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Se connecter" disabled={busy || !email || !password} onPress={() => void run(async () => {
        const credentials = { email, password }; setPassword(''); await translateApi('login', {}, credentials); setAdmin(true);
      })} />
    </> : <>
      <ScrollView horizontal><Button title="Chapitre entier" disabled={busy} onPress={() => setScope({ kind: 'chapter' })} />
        {snapshot.pages.map(p => <Button key={p.printedPage} title={`Page ${p.printedPage}`} disabled={busy}
          onPress={() => setScope({ kind: 'page', printedPage: p.printedPage })} />)}</ScrollView>
      <Txt>{scope.kind === 'chapter' ? 'Chapitre entier' : `Page ${scope.printedPage}`}</Txt>
      {!result && !job && prepared && !confirm && <Button title="Envoyer à Translate" disabled={busy} onPress={() => setConfirm(true)} />}
      {confirm && <>
        <Txt>Envoyer les textes roumains et leur structure à votre instance privée Translate ? Les images restent dans Norya.</Txt>
        <Button title="Confirmer l’envoi" disabled={busy} onPress={() => void run(async () => {
          if (!prepared || prepared.snapshot !== snapshot || prepared.scope !== scope) return; const g = generation.current;
          const response = await translateApi('enqueue', {}, prepared.request);
          if (g !== generation.current) return;
          if (typeof response.id !== 'string') throw new Error('Identifiant de tâche absent.');
          setJob(response.id); setConfirm(false); setStatus('En attente de traduction');
        })} />
        <Button title="Annuler l’envoi" disabled={busy} onPress={() => setConfirm(false)} />
      </>}
      {prepared && <Button title="Vérifier la traduction" disabled={busy} onPress={() => void run(async () => {
        const g = generation.current; const found = await lookupFrench(prepared);
        const state = !found && job ? await translateApi('job', { id: job }) : null;
        if (g !== generation.current) return;
        setResult(found ?? undefined);
        setStatus(found ? 'Traduit · tous les textes validés' : state?.status === 'processing' ? 'En cours de traduction'
          : state?.status === 'failed' ? 'Erreur de traduction' : state?.status === 'complete' ? 'En attente de validation complète' : job ? 'En attente de traduction' : 'Non traduit');
        if (found) setPreview(true);
      })} />}
      {result && <Button title="Afficher le français validé" onPress={() => setPreview(true)} />}
      <Button title="Se déconnecter" disabled={busy} onPress={() => void run(async () => {
        await translateApi('logout', {}, {}); setAdmin(false); setResult(undefined); setPrepared(undefined); setPreview(false); setStatus('Déconnectée.');
      })} />
    </>}
    {preview && result && prepared?.snapshot === snapshot && prepared.scope === scope && <Modal visible onRequestClose={() => setPreview(false)}>
      <Button title="Revenir au cours" onPress={() => setPreview(false)} />
      <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
        <TranslateDocumentView nodes={frenchNodes(prepared, result)} />
      </ScrollView>
    </Modal>}
  </View>;
}
