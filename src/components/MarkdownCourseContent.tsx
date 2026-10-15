import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Txt } from './ui';
import { colors as c } from '../design/theme';

type Block =
  | { kind: 'heading'; level: number; text: string; key: number }
  | { kind: 'paragraph' | 'list'; text: string; key: number }
  | { kind: 'table'; rows: string[][]; key: number };

function cleanInline(text: string) {
  return text.replace(/\*\*|__|`/g, '').replace(/^\s*[-*+]\s+/, '');
}

function parse(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line || /^Sursă:/u.test(line) || /^[-⸻]{3,}$/u.test(line)) { i++; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/u);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: cleanInline(heading[2]), key: i });
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(cell => cleanInline(cell.trim()));
        if (!row.every(cell => /^:?-{3,}:?$/u.test(cell))) rows.push(row);
        i++;
      }
      if (rows.length) blocks.push({ kind: 'table', rows, key: i });
      continue;
    }
    const list = /^[-*+]\s+/u.test(line);
    blocks.push({ kind: list ? 'list' : 'paragraph', text: cleanInline(line), key: i });
    i++;
  }
  return blocks;
}

export function MarkdownCourseContent({
  markdown,
  title,
  renderParagraph,
}: {
  markdown: string;
  title: string;
  renderParagraph: (text: string, key: number) => ReactNode;
}) {
  const blocks = parse(markdown).filter(block => !(block.kind === 'heading' && block.text === title));
  return <View style={{ gap: 12 }}>
    {blocks.map(block => {
      if (block.kind === 'heading') return <Txt key={block.key} bold size={block.level <= 3 ? 18 : 16}>{block.text}</Txt>;
      if (block.kind === 'table') {
        const columns = Math.max(...block.rows.map(row => row.length));
        return <ScrollView key={block.key} horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, overflow: 'hidden' }}>
            {block.rows.map((row, rowIndex) => <View key={rowIndex} style={{
              flexDirection: 'row',
              backgroundColor: rowIndex === 0 ? '#EAF2E9' : rowIndex % 2 ? '#FFFFFF' : '#F8F9F6',
              borderBottomWidth: rowIndex === block.rows.length - 1 ? 0 : 1,
              borderColor: c.line,
            }}>
              {Array.from({ length: columns }, (_, columnIndex) => <View key={columnIndex} style={{
                width: 170, padding: 10, borderRightWidth: columnIndex === columns - 1 ? 0 : 1, borderColor: c.line,
              }}>
                <Txt size={13} bold={rowIndex === 0 || columnIndex === 0}>{row[columnIndex] ?? ''}</Txt>
              </View>)}
            </View>)}
          </View>
        </ScrollView>;
      }
      return <View key={block.key} nativeID={`norya-course-block-${block.key}`} style={{ flexDirection: 'row', gap: 7 }}>
        {block.kind === 'list' && <Txt color={c.primary}>•</Txt>}
        <View style={{ flex: 1 }}>{renderParagraph(block.text, block.key)}</View>
      </View>;
    })}
  </View>;
}
