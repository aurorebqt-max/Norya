import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Card, Txt } from './ui';
import { BilingualText } from './BilingualText';
import type { RevisionTable as RevisionTableData } from '../data/revisionTables';
import type { Language } from '../domain/learning/types';

export function RevisionTable({ table, language }: { table: RevisionTableData; language: Language }) {
  const wide = useWindowDimensions().width >= 720;
  const cellWidth = wide ? 190 : 155;
  return <Card style={{ padding: 16, gap: 10 }}>
    <BilingualText text={table.title} language={language} bold />
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: '#EAF2E9' }}>
          {table.columns.map((column, i) => <View key={i} style={{ width: cellWidth, padding: 10 }}>
            <BilingualText text={column} language={language} bold />
          </View>)}
        </View>
        {table.rows.map((row, rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E4E7DF' }}>
          {row.map((cell, columnIndex) => <View key={columnIndex} style={{ width: cellWidth, padding: 10 }}>
            <BilingualText text={cell} language={language} bold={columnIndex === 0} />
          </View>)}
        </View>)}
      </View>
    </ScrollView>
    <Txt size={11}>Réf. {table.sourcePages} · tableau original Norya · relecture médicale à effectuer.</Txt>
  </Card>;
}
