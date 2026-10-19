import { colors as c } from '../design/theme';
import { forwardRef, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

/** One reading surface for courses and revision sheets, including on tablets. */
export const CourseReaderPane = forwardRef<ScrollView, { children: ReactNode; contentKey?: string; testID?: string }>(
  function CourseReaderPane({ children, contentKey, testID = 'source-reading-pane' }, ref) {
    const { height } = useWindowDimensions();
    return <ScrollView ref={ref} testID={testID} nestedScrollEnabled
      style={{ flex: 1, height: Math.max(420, Math.min(height * .74, 900)), minWidth: 0 }}
      contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}>
      <View key={contentKey} style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>{children}</View>
    </ScrollView>;
  });

export const courseParagraphStyle = { gap: 10, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.line } as const;
