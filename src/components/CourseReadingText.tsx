import { useState } from 'react';
import { Modal, Platform, Text, TextInput, View } from 'react-native';
import { colors as c } from '../design/theme';
import type { CoursePresentation } from '../domain/sourceCourse/displayCorrections';
import type { ManualAssociation } from '../domain/sourceCourse/associations';
import { anchorMatches, highlightColors, readingAnchor } from '../domain/sourceCourse/readingData';
import { useCourseReading, ReadingAction } from './CourseReadingTools';

/** Only text spans change. Original characters, line breaks and link anchors stay intact. */
export function CourseReadingText({ presentation, printedPage, blockId, heading = false, level, associations = [], onAssociation }: {
  presentation: CoursePresentation; printedPage: number; blockId: string; heading?: boolean;
  level?: 'h2' | 'h3' | 'h4'; associations?: ManualAssociation[]; onAssociation?: (link: ManualAssociation) => void;
}) {
  const context = useCourseReading();
  const [nativeSelect, setNativeSelect] = useState(false);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const text = presentation.text;
  const ref = context?.refFor(printedPage, blockId);
  const marks = ref && context ? context.data.annotations.filter(a => !a.deletedAt && anchorMatches(a, ref, text)) : [];
  const links = associations.filter(a => a.state === 'active' && text.slice(a.anchor.start, a.anchor.end) === a.anchor.text);
  const boundaries = [...new Set([0, text.length, ...marks.flatMap(a => [a.start, a.end]), ...links.flatMap(a => [a.anchor.start, a.anchor.end]),
    ...(presentation.heading ? [presentation.heading.length] : [])])].sort((a, b) => a - b);
  const pieces = boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1]; const content = text.slice(start, end);
    const mark = marks.filter(a => a.start <= start && a.end >= end).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const link = links.find(a => a.anchor.start <= start && a.anchor.end >= end);
    const inlineHeading = !!presentation.heading && end <= presentation.heading.length;
    if (!mark && !link && !inlineHeading) return content;
    return <Text key={`${start}-${end}`} accessibilityRole={link ? 'link' : undefined}
      onPress={mark || link ? () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.getSelection()?.toString()) return;
        if (mark && context) context.select({ anchor: mark, annotationId: mark.id });
        else if (link) onAssociation?.(link);
      } : undefined}
      style={{ backgroundColor: mark?.color ? highlightColors[mark.color] : undefined,
        color: link ? c.primary : c.ink, textDecorationLine: link ? 'underline' : undefined,
        fontWeight: inlineHeading ? '600' : undefined, fontSize: inlineHeading ? 22 : undefined }}>{content}</Text>;
  });
  const size = level === 'h2' ? 26 : level === 'h3' ? 20 : level === 'h4' ? 17 : heading ? 23 : 17;
  return <>
    <Text selectable accessibilityRole={heading || level ? 'header' : undefined} testID={level ? `course-${level}` : 'source-original-text'}
      dataSet={context?.enabled ? { readingKey: JSON.stringify([printedPage, blockId]), readingChapter: ref!.chapterId } : undefined}
      onLongPress={Platform.OS !== 'web' && context?.enabled ? () => setNativeSelect(true) : undefined}
      style={{ color: c.ink, fontSize: size, lineHeight: size + 12, fontWeight: heading || level ? '600' : '400',
        marginTop: level ? 12 : 0, marginBottom: level ? 6 : 0 }}>
      {pieces.length === 1 ? pieces[0] : pieces}
    </Text>
    {nativeSelect && context && ref && <Modal transparent visible onRequestClose={() => setNativeSelect(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,.2)' }}>
        <View style={{ padding: 12, backgroundColor: c.paper, borderRadius: 12 }}>
          <TextInput multiline readOnly value={text} accessibilityLabel="Sélectionner précisément le passage roumain"
            onSelectionChange={e => setRange(e.nativeEvent.selection)} style={{ height: 220, fontSize: 17, color: c.ink }} />
          <ReadingAction label="Utiliser cette sélection" disabled={range.end <= range.start} onPress={() => {
            context.select({ anchor: readingAnchor(ref, context.version, text, range.start, range.end) }); setNativeSelect(false);
          }} />
          <ReadingAction label="Fermer" onPress={() => setNativeSelect(false)} />
        </View>
      </View>
    </Modal>}
  </>;
}
