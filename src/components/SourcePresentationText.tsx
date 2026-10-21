import { Text, View } from 'react-native';
import type { CoursePresentation } from '../domain/sourceCourse/displayCorrections';
import { colors as c } from '../design/theme';

/** Selectable text shared by the reader and the manual review. */
export function SourcePresentationText({ presentation, size = 17, heading = false }: {
  presentation: CoursePresentation; size?: number; heading?: boolean;
}) {
  if (presentation.hide) return <Text style={{ color: c.muted }}>Numéro de page masqué dans le cours.</Text>;
  if (presentation.contents) return <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
    {presentation.contents.map((column, ci) => <View key={ci} style={{ flex: 1, minWidth: 245, gap: 5 }}>
      {column.map((entry, ri) => <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text selectable style={{ color: c.ink, fontSize: size, flex: 1 }}>{entry.label}</Text>
        <Text selectable style={{ color: c.ink, fontSize: size, minWidth: 28, textAlign: 'right' }}>{entry.page}</Text>
      </View>)}
    </View>)}
  </View>;
  const body = presentation.heading
    ? presentation.text.slice(presentation.heading.length).trimStart() : presentation.text;
  return <View style={{ gap: 12 }}>
    {presentation.heading && <Text selectable accessibilityRole="header"
      style={{ fontSize: size + 5, lineHeight: size + 13, color: c.ink, fontWeight: '600', textTransform: 'uppercase' }}>
      {presentation.heading}
    </Text>}
    {body.split(/\n{2,}/u).filter(Boolean).map((paragraph, index) => <Text key={index} selectable accessibilityRole={heading ? 'header' : undefined}
      testID="source-original-text" style={{ fontSize: heading ? size + 6 : size, lineHeight: size + 12, color: c.ink, fontWeight: heading ? '600' : '400', textTransform: heading ? 'uppercase' : 'none' }}>
      {paragraph}
    </Text>)}
  </View>;
}
