import { examChapters } from '../data/rezidentiat2026';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Chip, Txt, s } from './ui';
import { openPdfImport, type PdfImportSession, type PdfPreview } from '../services/pdfImport';
import type { PdfLayout, PdfRegion } from '../domain/sourceCourse/pdfExtraction';
import { saveImportedPdfCourse } from '../services/storage/privateCourse';
import type { SourcePacket } from '../domain/sourceCourse/packet';

/** Explicit range and visual regions, entirely local; never starts on mount. */
export function PrivatePdfImport({ chapterId, onImported, onClose }: {
  chapterId: string; onImported: (packet: SourcePacket) => void; onClose: () => void;
}) {
  const session = useRef<PdfImportSession | null>(null);
  const alive = useRef(true); const lock = useRef(false); const file = useRef<Blob | null>(null);
  const [pages, setPages] = useState(0); const [first, setFirst] = useState('1'); const [last, setLast] = useState('1'); const [folio, setFolio] = useState('1');
  const [page, setPage] = useState(1); const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [layouts, setLayouts] = useState<Record<number, PdfLayout>>({}); const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [role, setRole] = useState<PdfRegion['role']>('figure'); const [corner, setCorner] = useState<number[] | null>(null);
  const [width, setWidth] = useState(600); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => () => { alive.current = false; void session.current?.close(); }, []);
  const layout = layouts[page] ?? { columns: 1 as const, regions: [] };
  const update = (next: PdfLayout) => { setLayouts(v => ({ ...v, [page]: next })); setConfirmed(v => ({ ...v, [page]: false })); };
  async function run(action: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (e) { if (alive.current) setMessage(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function show(number: number) {
    if (!session.current) return;
    setPreview(null); setCorner(null); const value = await session.current.preview(number);
    if (alive.current) { setPage(number); setPreview(value); }
  }
  async function pick() {
    if (Platform.OS !== 'web') throw new Error('Ouvrez Norya dans Safari pour extraire ce PDF localement.');
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0]; const blob = asset.file ?? await (await fetch(asset.uri)).blob();
    if (!(await blob.slice(0, 1024).text()).includes('%PDF-')) throw new Error('Sélectionnez un PDF valide.');
    await session.current?.close(); session.current = await openPdfImport(blob); file.current = blob;
    setPages(session.current.pages); setLayouts({}); setConfirmed({}); setFirst('1'); setLast('1'); await show(1);
  }
  const range = Array.from({ length: Math.max(0, Math.min(40, Number(last) - Number(first) + 1)) }, (_, i) => Number(first) + i);
  const validRange = [Number(first), Number(last), Number(folio)].every(Number.isInteger) && Number(first) >= 1 && Number(last) >= Number(first) && Number(last) <= pages && Number(last) - Number(first) < 40 && Number(folio) >= 1;
  async function extract() {
    if (!session.current || !file.current || !validRange || !range.every(p => confirmed[p])) throw new Error('Contrôlez les zones de chaque page choisie avant extraction.');
    const packet = await session.current.extract(chapterId, Number(first), Number(last), Number(folio), layouts, p => setMessage(`Extraction locale : page PDF ${p}`));
    const metadata = examChapters.find(chapter => chapter.id === chapterId);
    if (metadata) packet.chapter = { title: metadata.chapter, bookId: metadata.bookId, thematicPages: metadata.pages, scope: metadata.scope };
    await saveImportedPdfCourse(packet, file.current);
    if (alive.current) onImported(packet);
  }
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Txt bold>Importer un cours privé · {chapterId}</Txt>
      <Txt>{examChapters.find(chapter => chapter.id === chapterId)?.chapter}</Txt>
      <Txt>Pages Thematica : {examChapters.find(chapter => chapter.id === chapterId)?.pages ?? "à préciser"}. Vérifiez la correspondance avec les pages PDF.</Txt>
      <Txt>PDF traité dans ce navigateur. Choisissez les pages du chapitre, les colonnes et les zones originales. Aucun passage ne sera validé automatiquement.</Txt>
      <Button title="Choisir le PDF" disabled={busy} onPress={() => void run(pick)} />
      <Button title="Fermer l’import PDF" secondary disabled={busy} onPress={onClose} />
      {!!message && <Txt>{message}</Txt>}
      {!!pages && <>
        <Txt>{pages} pages dans le PDF. Au maximum 40 pages par import de chapitre.</Txt>
        {[['Première page PDF', first, setFirst], ['Dernière page PDF', last, setLast], ['Premier numéro de page imprimé', folio, setFolio]].map(([label, value, setter]) =>
          <View key={label as string}><Txt>{label as string}</Txt><TextInput accessibilityLabel={label as string} value={value as string} onChangeText={setter as (v: string) => void} keyboardType="number-pad" editable={!busy} style={s.input} /></View>)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {validRange && range.map(p => <Chip key={p} label={`PDF ${p}${confirmed[p] ? ' · zones prêtes' : ''}`} selected={p === page} onPress={() => { if (!busy) void run(() => show(p)); }} />)}
        </View>
        {preview && <>
          <Txt bold>Page PDF {page} · disposition</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([1, 2] as const).map(n => <Chip key={n} label={`${n} colonne(s)`} selected={layout.columns === n} onPress={() => { if (!busy) update({ ...layout, columns: n }); }} />)}
          </View>
          <Txt>Touchez deux coins opposés pour encadrer une figure ou un tableau complet, avec sa légende si elle doit rester en image. Encadrez aussi les en-têtes, folios et éléments éditoriaux à exclure de la lecture. Les paragraphes voisins restent numériques.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['figure', 'table', 'page-header'] as const).map(value => <Chip key={value} label={value === 'figure' ? 'Figure' : value === 'table' ? 'Tableau' : 'Élément éditorial'} selected={role === value} onPress={() => { setRole(value); setCorner(null); }} />)}
          </View>
          <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
            <Pressable accessibilityLabel="Délimiter une zone originale" disabled={busy} onPress={e => {
              const point = [e.nativeEvent.locationX / width * preview.width, e.nativeEvent.locationY / width * preview.width];
              if (!corner) { setCorner(point); return; }
              const bbox = [Math.max(0, Math.min(corner[0], point[0])), Math.max(0, Math.min(corner[1], point[1])), Math.min(preview.width, Math.max(corner[0], point[0])), Math.min(preview.height, Math.max(corner[1], point[1]))];
              setCorner(null); if (bbox[2] - bbox[0] < 2 || bbox[3] - bbox[1] < 2) return;
              update({ ...layout, regions: [...layout.regions, { bbox, role }] });
            }}>
              <View pointerEvents="none"><Image source={{ uri: preview.image }} style={{ width: '100%', height: width * preview.height / preview.width }} resizeMode="contain" /></View>
              {layout.regions.map((r, i) => <View key={i} pointerEvents="none" style={{ position: 'absolute', left: r.bbox[0] / preview.width * width, top: r.bbox[1] / preview.width * width,
                width: (r.bbox[2] - r.bbox[0]) / preview.width * width, height: (r.bbox[3] - r.bbox[1]) / preview.width * width, borderWidth: 2, borderColor: r.role === 'page-header' ? '#b45309' : '#2563eb' }} />)}
              {corner && <View pointerEvents="none" style={{ position: 'absolute', left: corner[0] / preview.width * width - 4, top: corner[1] / preview.width * width - 4, width: 8, height: 8, backgroundColor: '#2563eb' }} />}
            </Pressable>
          </View>
          <Button title="Retirer la dernière zone" secondary disabled={busy || !layout.regions.length} onPress={() => update({ ...layout, regions: layout.regions.slice(0, -1) })} />
          {!preview.spans.length && <Txt>Cette page ne contient aucun texte extractible. OCR non disponible : import numérique bloqué pour une page scannée.</Txt>}
          <Button title="J’ai délimité les visuels et éléments éditoriaux de cette page" disabled={busy || !preview.spans.length} onPress={() => { setLayouts(v => ({ ...v, [page]: layout })); setConfirmed(v => ({ ...v, [page]: true })); }} />
        </>}
        <Button title="Extraire ces pages et ouvrir la vérification manuelle" disabled={busy || !validRange || !range.every(p => confirmed[p])} onPress={() => void run(extract)} />
      </>}
    </ScrollView>
  </Modal>;
}
