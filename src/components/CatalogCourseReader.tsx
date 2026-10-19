import { PrivatePdfImport } from './PrivatePdfImport';
import { CourseReadingProgress } from './CourseReadingProgress';
import { ChapterPdfActions } from './ChapterPdfActions';
import { CourseReaderNavigation } from './CourseReaderNavigation';
import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { RomanianLesson } from '../data/romanianLessons';
import type { CourseItem, CourseStructure } from '../domain/sourceCourse/courseStructure';
import { CourseReadingProvider, CourseReadingToolbar, ReadingAction, useCourseReading } from './CourseReadingTools';
import { CourseReadingText } from './CourseReadingText';
import { MarkdownCourseContent, parse } from './MarkdownCourseContent';
import { Card, Txt } from './ui';
import { useLearning } from '../state/LearningProvider';

/** Adapter for catalog content; never creates a private PDF packet or human validation. */
export function CatalogCourseReader({ lesson, onReview }: { lesson: RomanianLesson; onReview: () => void }) {
  const { height } = useWindowDimensions();
  const { learning } = useLearning();
  const saved = learning.reading[lesson.chapterId];
  const [pdfImport, setPdfImport] = useState(false);
  const [index, setIndex] = useState(() => Math.max(0, Math.min(lesson.sections.length - 1,
    saved?.sourceSection ? lesson.sections.findIndex((s, i) => (s.id ?? `section-${i}`) === saved.sourceSection) : saved?.section ?? 0)));
  const version = lesson.version ?? lesson.updatedOn ?? 'catalog';
  const { structure, translations } = useMemo(() => {
    const translations: Record<string, string> = {};
    const structure: CourseStructure = { title: lesson.title.ro, authors: [], intro: [], outline: [], sections: lesson.sections.map((s, i) => {
      const id = s.id ?? `section-${i}`;
      // Whole section translations are kept whole; no guessed paragraph alignment.
      const texts = [s.title.ro, normalize(s.text.ro)];
      const items: CourseItem[] = texts.map((text, j) => {
        const blockId = `${id}:${j}`; const key = JSON.stringify([i, blockId]);
        const french = j === 0 ? s.title.fr : normalize(s.text.fr);
        if (french) translations[key] = french;
        return { key, printedPage: i, pdfPage: 0, blockId, kind: j === 0 ? 'h2' : undefined,
          presentation: { text, hide: false, imageOnly: false },
          part: { id: blockId, text, role: j === 0 ? 'heading' : 'paragraph', kind: 'text', bbox: [0,0,1,1],
            status: 'unverified', sourceLineIds: [], lines: [], reasons: [j === 0 ? '' : s.text.ro, j === 0 ? '' : s.text.fr], image: '' } };
      });
      return { id, title: s.title.ro, items };
    }) };
    return { structure, translations };
  }, [lesson]);
  const section = structure.sections[index];
  return <CourseReadingProvider chapterId={lesson.chapterId} sourceSha256={`catalog:${lesson.chapterId}:${version}`}
    version={version} structure={structure} enabled sectionIndex={index} onSectionChange={setIndex} translations={translations}>
    <Card>
      <CourseReadingToolbar />
      <ReadingAction label="Importer un cours privé (PDF)" icon="document-attach-outline" onPress={() => setPdfImport(true)} />
      {pdfImport && <PrivatePdfImport chapterId={lesson.chapterId} onClose={() => setPdfImport(false)} onImported={() => { setPdfImport(false); onReview(); }} />}
      <CourseReaderNavigation structure={structure} index={index} onChange={setIndex} />
      <ReadingAction label="Vérification du cours structuré (JSON)" icon="create-outline" onPress={onReview} />
      <ScrollView key={index} nestedScrollEnabled style={{ height: Math.max(420, Math.min(height * .74, 900)), minWidth: 0 }} contentContainerStyle={{ maxWidth: 760, width: '100%', alignSelf: 'center', gap: 16 }}>
        {section?.items.map((item, i) => <CatalogItem key={item.key} item={item} heading={i === 0} />)}
        <CourseReadingProgress chapterId={lesson.chapterId} structure={structure} index={index} next={setIndex} />
      </ScrollView>
    </Card>
  </CourseReadingProvider>;
}
function CatalogItem({ item, heading }: { item: CourseItem; heading: boolean }) {
  const context = useCourseReading();
  if (heading) return <CourseReadingText presentation={item.presentation} printedPage={item.printedPage} blockId={item.blockId} level="h2" />;
  // Preserve the existing Markdown tables and heading hierarchy. Plain sections retain precise selection.
  const text = context?.language === 'fr' ? context.translated(item.printedPage, item.blockId, item.presentation.text) : item.presentation.text;
  if (!text) return <Txt>Traduction française indisponible pour cette section.</Txt>;
  const originalBlocks = parse(item.part.reasons[context?.language === 'fr' ? 1 : 0] ?? '');
  let offset = 0;
  return <View style={{ gap: 18 }}>{text.split('\n\n').map((paragraph, i) => {
    const start = offset; offset += paragraph.length + 2;
    const block = originalBlocks[i];
    if (block?.kind === 'table') return <MarkdownCourseContent key={i} markdown={block.rows.map(r => `| ${r.join(' | ')} |`).join('\n')} title="" renderParagraph={text => <Txt selectable>{text}</Txt>} />;
    const level = block?.kind === 'heading' ? (block.level <= 2 ? 'h2' : block.level === 3 ? 'h3' : 'h4') : undefined;
    return <CourseReadingText key={i} presentation={item.presentation} printedPage={item.printedPage}
      blockId={item.blockId} level={level} segment={{ start, end: start + paragraph.length }} />;
  })}</View>;
}
function normalize(text: string) {
  return parse(text).map(b => b.kind === 'table' ? b.rows.map(r => r.join(' | ')).join('\n') : b.kind === 'list' ? `• ${b.text}` : b.text).join('\n\n');
}
