import { Text, View } from 'react-native';
import type { CoursePresentation } from '../domain/sourceCourse/displayCorrections';
import { colors as c } from '../design/theme';

/** Selectable text shared by the reader and the manual review. */
export function SourcePresentationText({ presentation, size = 17, heading = false }: {
  presentation: CoursePresentation; size?: number; heading?: boolean;
}) {
  if (presentation.hide) return <Text style={{ color: c.muted }}>Numéro de page masqué dans le cours.</Text>;
  const body = presentation.heading
    ? presentation.text.slice(presentation.heading.length).trimStart() : presentation.text;
  return <View style={{ gap: 12 }}>
    {presentation.heading && <Text selectable accessibilityRole="header"
      style={{ fontSize: size + 5, lineHeight: size + 13, color: c.ink, fontWeight: '600' }}>
      {presentation.heading}
    </Text>}
    {body && <Text selectable accessibilityRole={heading ? 'header' : undefined} testID="source-original-text"
      style={{ fontSize: heading ? size + 6 : size, lineHeight: size + 12, color: c.ink, fontWeight: heading ? '600' : '400' }}>
      {body}
    </Text>}
  </View>;
}
