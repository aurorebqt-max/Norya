import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Txt } from './ui';
import { CourseTable } from './CourseBlocks';
import { colors as c } from '../design/theme';
import type { CourseStructure, CourseItem } from '../domain/sourceCourse/courseStructure';
import type { CardSection } from '../domain/sourceCourse/revisionCards';
import type { FinalCourseArchive } from '../domain/sourceCourse/finalization';
import { activeAssociations } from '../domain/sourceCourse/associations';
import { openOriginalPage } from '../services/storage/privateCourse';

/** All figures, tables and references are read from the original finalized course.
 * Never copy an image or rewrite a medical table into a revision JSON. */
export function RevisionSourceAssets({ section, structure, archive }: {
  section: CardSection; structure: CourseStructure; archive: FinalCourseArchive;
}) {
  const [error, setError] = useState('');
  const source = useMemo(() => {
    const all = [...structure.intro, ...structure.sections.flatMap(s => s.items)];
    const headingAt = all.findIndex(item => `sec-${item.key}` === section.id);
    if (headingAt < 0) return { media: [] as CourseItem[], refs: [] as { text: string; item: CourseItem }[] };
    let end = headingAt + 1;
    while (end < all.length && !['h2', 'h3', 'h4'].includes(all[end].kind ?? '')) end++;
    const content = all.slice(headingAt + 1, end);
    const media = content.filter(item => item.presentation.imageOnly || item.part.role === 'figure' || item.part.role === 'table' || item.kind === 'table' || (item.part.role === 'box' && item.part.kind === 'visual'));
    const version = archive.versions.find(v => v.version === archive.activeVersion);
    const associations = activeAssociations(version?.validation).filter(ref => ref.state === 'active');
    const refs = associations.filter(ref => [all[headingAt], ...content].some(item => item.printedPage === ref.source.printedPage && item.blockId === ref.source.blockId))
      .map(ref => ({ text: ref.anchor.text, item: all.find(item => item.printedPage === ref.target.printedPage && item.blockId === ref.target.blockId) }))
      .filter((ref): ref is { text: string; item: CourseItem } => !!ref.item);
    return { media, refs };
  }, [section.id, structure, archive]);
  const version = archive.versions.find(v => v.version === archive.activeVersion);
  const open = async (printedPage: number) => {
    const page = version?.packet.pages.find(p => p.printedPage === printedPage);
    if (!page) { setError('Page source introuvable.'); return; }
    try { setError(''); await openOriginalPage(page); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  if (!source.media.length && !source.refs.length) return null;
  return <View style={{ gap: 14, paddingVertical: 14 }}>
    {source.media.map(item => {
      const digital = item.kind === 'table' && item.table?.validated && !item.table.keepOriginal ? item.table : null;
      const image = item.part.image;
      const width = Math.max(1, item.part.bbox[2] - item.part.bbox[0]);
      const height = Math.max(1, item.part.bbox[3] - item.part.bbox[1]);
      const ratio = Math.min(5, Math.max(0.2, height / width));
      return <View key={item.key} style={{ gap: 8, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
        <Txt bold size={13}>{item.part.role === 'figure' ? 'Schéma original' : item.part.role === 'table' || item.kind === 'table' ? 'Tableau original' : 'Encadré original'} · p. {item.printedPage}</Txt>
        {digital ? <CourseTable table={digital} /> : image ? <ScrollView horizontal><Image source={{ uri: image }} resizeMode="contain" accessibilityLabel={`Visuel original page ${item.printedPage}`} style={{ width: 700, height: Math.max(120, Math.min(1600, 700 * ratio)) }} /></ScrollView> : <Txt size={12}>Image indisponible dans le cours enregistré.</Txt>}
        <Pressable accessibilityRole="button" onPress={() => void open(item.printedPage)}><Txt color={c.primary} size={13}>Voir dans le PDF ↗</Txt></Pressable>
      </View>;
    })}
    {source.refs.length > 0 && <View style={{ gap: 8 }}><Txt bold size={13}>Références du cours</Txt>
      {source.refs.map((ref, index) => <Pressable key={`${ref.item.key}-${index}`} accessibilityRole="button" onPress={() => void open(ref.item.printedPage)}>
        <Txt color={c.primary} size={13}>{ref.text} → p. {ref.item.printedPage} ↗</Txt>
      </Pressable>)}
    </View>}
    {!!error && <Txt>{error}</Txt>}
  </View>;
}
