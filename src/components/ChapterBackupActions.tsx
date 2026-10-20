import { useState } from 'react';
import { View } from 'react-native';
import { Button, Txt } from './ui';
import { parseChapterBackup, type ChapterBackup } from '../domain/sourceCourse/chapterBackup';
import { downloadPrivateJson, exportChapterBackup, pickPrivateJson, restoreChapterBackup } from '../services/storage/chapterBackup';

export function ChapterBackupActions({ chapterId, onRestored }: { chapterId: string; onRestored: () => void }) {
  const [preview, setPreview] = useState<ChapterBackup | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function run(fn: () => Promise<void>) {
    if (busy) return; setBusy(true); setMessage('');
    try { await fn(); } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }
  return <View style={{ gap: 8 }}>
    <Button title="Exporter cours, ressources et annotations (JSON)" secondary disabled={busy} onPress={() => void run(async () => {
      downloadPrivateJson(`norya-chapter-backup-${chapterId}-${Date.now()}.json`, await exportChapterBackup(chapterId));
      setMessage('Fichier téléchargé. Conservez une copie indépendante. La progression du planning et des QCM n’est pas incluse.');
    })} />
    <Button title="Restaurer une sauvegarde de chapitre (JSON)" secondary disabled={busy} onPress={() => void run(async () => {
      setPreview(null); const raw = await pickPrivateJson(); if (raw) setPreview(parseChapterBackup(raw, chapterId));
    })} />
    {preview && <>
      <Txt>{preview.packet.pages.length} pages · {preview.packet.pages.reduce((n, p) => n + (p.parts?.length ?? 0), 0)} blocs sources · {preview.validation?.merges?.length ?? 0} fusions · {preview.validation?.associations?.length ?? 0} associations.</Txt>
      <Txt>{preview.archive ? `${preview.archive.versions.length} version(s) conservée(s).` : 'Aucune archive finalisée dans ce fichier : restauration en préparation, sans finalisation automatique.'}</Txt>
      <Txt>{preview.reading ? 'Annotations et traductions incluses.' : 'Annotations, traductions et préférences de lecture absentes du fichier.'} L’import est réservé à un chapitre sans données dans ce navigateur.</Txt>
      <Button title="Confirmer la restauration ponctuelle" disabled={busy} onPress={() => void run(async () => {
        await restoreChapterBackup(preview); setPreview(null); onRestored();
        setMessage('Données enregistrées et relues. Actualisez puis contrôlez le lecteur et les illustrations.');
      })} />
      <Button title="Annuler" secondary disabled={busy} onPress={() => setPreview(null)} />
    </>}
    {!!message && <Txt>{message}</Txt>}
  </View>;
}
