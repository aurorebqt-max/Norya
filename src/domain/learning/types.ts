import type { Flashcard } from '../medical/types';
export type Language = 'RO' | 'FR' | 'Bilingue';
export type Attempt = {
  id: string; questionId: string; chapterId: string; on: string; selected: number[];
  correctAnswers: number[]; correct: boolean; score: number; maxScore: number;
  scoring: 'exact' | 'romanian-draft'; elapsedSeconds: number; nextReviewOn: string;
  snapshot: { prompt: string; choices: string[]; explanation: string; pages: string; version: string; notion?: string; sectionId?: string; sectionIndex?: number };
};
export type Reading = { sectionIds?: string[]; courseCompletedPass?: number; sourceSections?: string[]; sourceSection?: string; courseCompleted?: boolean; section: number; readSections: number[]; completedByPass?: Record<number, number[]>; language: Language; mode: 'Complet' | 'Express'; updatedOn: string };
export type ErrorCard = {
  id: string;
  chapterId: string;
  notion: string;
  questionIds: string[];
  latestQuestionId: string;
  prompt: string;
  selected: number[];
  correctAnswers: number[];
  nextReviewOn: string;
  status: 'awaiting-verification' | 'fragile' | 'corrected';
  attemptCount: number;
};
export type PersonalHighlight = {
  id: string;
  chapterId: string;
  sectionId: string;
  language: 'RO' | 'FR';
  text: string;
  blockId?: string;
  start?: number;
  end?: number;
  color?: 'yellow' | 'green' | 'pink' | 'blue';
};
export type OrphanedAnnotation =
  | { id: string; chapterId: string; kind: "note"; previousSectionId: string; text: string }
  | { id: string; chapterId: string; kind: "highlight"; previousSectionId: string; text: string; language: "RO" | "FR"; color?: PersonalHighlight["color"] };
export type PracticeSession = {
  questionIds: string[];
  index: number;
  selected: number[];
  attemptId?: string;
  attemptIds?: string[];
};
export type LearningState = {
  schemaVersion: 1;
  attempts: Attempt[];
  favorites: string[];
  difficultTerms: string[];
  reading: Record<string, Reading>;
  personalCards: Flashcard[];
  errorCards: ErrorCard[];
  sectionNotes?: Record<string, string>;
  highlights?: PersonalHighlight[];
  orphanedAnnotations?: OrphanedAnnotation[];
  archivedReadings?: Record<string, Reading>;
  archivedReadingHistory?: Record<string, Reading[]>;
  courseContentVersion?: number;
  markdownCourseVersions?: Record<string, string>;
  practiceSession?: PracticeSession;
};
export type LearningAction =
 | {type:'attempt'; attempt:Attempt}
 | {type:'favorite'; id:string}
 | {type:'term'; id:string}
 | {type:'reading'; id:string; value:Reading}
 | {type:'personal-card'; card:Flashcard}
 | {type:'error-card'; attempt:Attempt}
 | {type:'section-note'; id:string; text:string}
 | {type:'highlight'; value:PersonalHighlight; enabled:boolean}
 | {type:'practice-session'; value?:PracticeSession};
