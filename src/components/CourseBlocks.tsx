import { createElement } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { colors as c } from '../design/theme';
import { columnCount, rowRole, type BlockTable } from '../domain/sourceCourse/classification';

const HEADING = {
  h2: { size: 26, top: 18, weight: '700' as const, color: c.ink },
  h3: { size: 20, top: 12, weight: '600' as const, color: c.ink },
  h4: { size: 17, top: 8, weight: '600' as const, color: c.muted },
  h5: { size: 15, top: 6, weight: '600' as const, color: c.muted },
};

/** Titres de section : H2 espacé, H3 intermédiaire, H4 plus discret ; texte exact et sélectionnable. */
export function CourseHeading({ level, text }: { level: 'h2' | 'h3' | 'h4' | 'h5'; text: string }) {
  const style = HEADING[level];
  return <Text selectable accessibilityRole="header" testID={`course-${level}`}
    style={{ fontSize: style.size, lineHeight: style.size + 10, fontWeight: style.weight, color: style.color, marginTop: style.top, marginBottom: 6 }}>
    {text.toLocaleUpperCase('ro-RO')}
  </Text>;
}

const MIN_COLUMN = 120;
const border = `1px solid ${c.line}`;

/** Tableau numérique sélectionnable ; défilement horizontal si l'écran est étroit. */
export function CourseTable({ table, header = true }: { table: BlockTable; header?: boolean }) {
  const columns = columnCount(table);
  const width = Math.max(columns * MIN_COLUMN, 280);
  const grid = Platform.OS === 'web'
    ? createElement('table', { 'data-testid': 'course-table', style: { borderCollapse: 'collapse', width: '100%', minWidth: width, tableLayout: 'auto' } },
      createElement('tbody', null, table.rows.map((row, r) => createElement('tr', { key: r },
        row.map((cell, col) => {
          const prominent = header && (rowRole(table, r) === 'header' || cell.header);
          const category = rowRole(table, r) === 'category';
          return cell.covered ? null : createElement(prominent ? 'th' : 'td', {
          key: col, colSpan: cell.colSpan, rowSpan: cell.rowSpan,
          style: { border, padding: '8px 10px', textAlign: 'left', verticalAlign: 'top', fontSize: 15, lineHeight: '22px', color: c.ink,
            fontWeight: prominent || category ? 700 : 400, backgroundColor: category ? c.peach : prominent ? c.mint : undefined, userSelect: 'text' },
        }, cell.text);
        })))
    ))
    : <View style={{ minWidth: width, borderWidth: 1, borderColor: c.line }}>
      {table.rows.map((row, r) => <View key={r} style={{ flexDirection: 'row' }}>
        {row.map((cell, col) => {
          const prominent = header && (rowRole(table, r) === 'header' || cell.header);
          const category = rowRole(table, r) === 'category';
          return cell.covered ? null : <View key={col} style={{ flex: cell.colSpan ?? 1, borderWidth: 0.5, borderColor: c.line, padding: 8,
          backgroundColor: category ? c.peach : prominent ? c.mint : undefined }}>
          <Text selectable style={{ fontSize: 15, lineHeight: 22, color: c.ink, fontWeight: prominent || category ? '700' : '400' }}>{cell.text}</Text>
        </View>;
        })}
      </View>)}
    </View>;
  return <View style={{ gap: 6 }} testID="course-table-block">
    {!!table.title?.trim() && <Text selectable style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{table.title}</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator>{grid}</ScrollView>
    {!!table.notes?.trim() && <Text selectable style={{ fontSize: 13, lineHeight: 20, color: c.muted }}>{table.notes}</Text>}
  </View>;
}
