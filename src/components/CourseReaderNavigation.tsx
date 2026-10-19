import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Chip, Txt } from './ui';
import { ReadingAction, useCourseReading } from './CourseReadingTools';
import type { CourseStructure } from '../domain/sourceCourse/courseStructure';
import { colors as c } from '../design/theme';

/** Navigation H2 shared by the source and catalog adapters. */
export function CourseReaderNavigation({ structure, index, onChange }: {
  structure: CourseStructure; index: number; onChange: (index: number) => void;
}) {
  const [width, setWidth] = useState(900);
  const [open, setOpen] = useState(false);
  const reading = useCourseReading();
  const title = (i: number) => {
    const section = structure.sections[i];
    if (reading?.language !== 'fr') return section.title;
    const heading = section.items.find(item => item.kind === 'h2');
    return heading && reading.translated(heading.printedPage, heading.blockId, heading.presentation.text) || `Section ${i + 1} · traduction indisponible`;
  };
  const change = (i: number) => { setOpen(false); onChange(i); };
  if (!structure.sections.length) return null;
  return <View testID="section-nav" style={{ gap: 8 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width < 640 ? <>
      <Pressable accessibilityRole="button" accessibilityLabel="Choisir une section" onPress={() => setOpen(!open)}
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Txt bold size={14} style={{ flex: 1 }}>{title(index)}</Txt><Txt>{open ? '▴' : '▾'}</Txt>
      </Pressable>
      {open && <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
        {structure.sections.map((section, i) => <Pressable key={section.id} accessibilityRole="button" onPress={() => change(i)}
          style={{ padding: 12, backgroundColor: i === index ? c.mint : undefined }}><Txt size={14} bold={i === index}>{title(i)}</Txt></Pressable>)}
      </View>}
    </> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {structure.sections.map((section, i) => <Chip key={section.id} label={title(i)} selected={i === index} onPress={() => change(i)} />)}
    </View>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <ReadingAction label="Section précédente" icon="chevron-back" disabled={index === 0} onPress={() => change(index - 1)} />
      <Txt size={12} color={c.muted}>{index + 1} / {structure.sections.length}</Txt>
      <ReadingAction label="Section suivante" icon="chevron-forward" disabled={index >= structure.sections.length - 1} onPress={() => change(index + 1)} />
    </View>
  </View>;
}
