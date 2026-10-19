import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, View } from 'react-native';
import { importChapterPdf, loadChapterPdf, openChapterPdf } from '../services/storage/chapterPdf';
import { Icon, Txt } from './ui';
import { colors as c } from '../design/theme';

export function ChapterPdfActions({ chapterId }: { chapterId: string }) {
  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof loadChapterPdf>>>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setPdf(null); setMessage('');
    loadChapterPdf(chapterId).then(value => { if (active) setPdf(value); }).catch(e => { if (active) setMessage(String(e)); });
    return () => { active = false; };
  }, [chapterId]));
  async function pick() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const imported = await importChapterPdf(chapterId);
      if (imported) { setPdf(imported); setMessage('PDF enregistré comme référence privée. La conversion en cours structuré n’est pas automatique.'); }
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 4 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void pick()}
        style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 }}>
        <Icon name="document-attach-outline" size={18} color={c.primary} />
        <Txt size={13} color={c.primary}>{busy ? 'Import…' : pdf ? 'Importer un autre PDF' : 'Importer le PDF'}</Txt>
      </Pressable>
      {pdf && <Pressable accessibilityRole="button" onPress={() => void openChapterPdf(pdf).catch(e => setMessage(String(e)))}
        style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 }}>
        <Icon name="open-outline" size={18} color={c.primary} /><Txt size={13} color={c.primary}>Ouvrir le PDF</Txt>
      </Pressable>}
    </View>
    {pdf && <Txt size={12} color={c.muted}>{pdf.name}</Txt>}
    {!!message && <Txt size={12}>{message}</Txt>}
  </View>;
}
