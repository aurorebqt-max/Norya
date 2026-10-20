import { useState } from 'react';
import { View } from 'react-native';
import { Button, Txt } from './ui';
import { useCourseReading } from './CourseReadingTools';
import type { FinalCourseVersion } from '../domain/sourceCourse/finalization';
import { manualTranslationTemplate, parseManualTranslation, appendManualTranslation } from '../domain/sourceCourse/manualTranslation';
import { downloadPrivateJson, pickPrivateJson } from '../services/storage/chapterBackup';
export function ManualTranslationActions({ final }: { final: FinalCourseVersion }) {
  const reading = useCourseReading(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function run(work: () => Promise<void>) { if (busy) return; setBusy(true); setMessage('');
    try { await work(); } catch (e) { setMessage(String(e)); } finally { setBusy(false); } }
  return <View style={{ gap: 4 }}>
    <Button title="Exporter traduction FR (JSON)" secondary disabled={busy} onPress={() => void run(async () => {
      downloadPrivateJson(`norya-manual-fr-${final.packet.chapterId}.json`, await manualTranslationTemplate(final));
    })} />
    <Button title="Importer traduction FR (JSON)" secondary disabled={busy || !reading} onPress={() => void run(async () => {
      const raw = await pickPrivateJson(); if (!raw) return;
      const result = await parseManualTranslation(raw, final);
      if (await reading!.save(data => appendManualTranslation(data, result.translations))) {
        setMessage(`${result.translations.length} bloc(s) importé(s) · ${result.missing} bloc(s) manquant(s) dans ce fichier. Texte roumain conservé.`);
        // The existing RO/FR selector reads the newly persisted translation after rendering.
      } else setMessage('Enregistrement refusé. La traduction n’a pas été importée.');
    })} />
    {!!message && <Txt>{message}</Txt>}
  </View>;
}
