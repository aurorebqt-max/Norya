import type { Day } from "../preparation/types";

export type KnowledgeRank = "A" | "B";

export type MedicalSourceVersion = {
  id: string;
  source:
    | "LiSA/UNESS"
    | "Collège CUEN"
    | "HAS"
    | "ANSM"
    | "Programme National EDN"
    | "KDIGO";
  version: string;
  verifiedAt: Day; // e.g. "2026-06-01"
  targetExamSession: string; // e.g. "EDN 2026 / 2027"
  url?: string;
  status: "verified" | "needs_review" | "deprecated";
  notes?: string;
};

export type KnowledgeObjective = {
  id: string;
  itemNumber: number; // e.g. 261, 264, 267
  subject: string; // e.g. "Néphrologie"
  title: string;
  rank: KnowledgeRank;
  code: string; // e.g. "NÉPHRO-261-01"
  description: string;
  sourceVersionId: string;
};

export type Definition = {
  id: string;
  term: string;
  short: string;
  details?: string;
  source: string;
};

export type Flashcard = {
  id: string;
  objectiveId: string;
  itemNumber: number;
  subject: string;
  rank: KnowledgeRank;
  recto: string;
  verso: string;
  clue?: string;
  explanation?: string;
  sourceVersionId: string;
};

export type FlashcardReviewRating = "again" | "hard" | "good" | "easy";

export type CardProgress = {
  cardId: string;
  addedOn: Day;
  nextReviewOn: Day;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lastRating?: FlashcardReviewRating;
  historyCount: number;
};

export type MedicalSheetSection = {
  id: string;
  title:
    | "Définition"
    | "Épidémiologie"
    | "Étiologies"
    | "Physiopathologie"
    | "Diagnostic"
    | "Examens complémentaires"
    | "Diagnostics différentiels"
    | "Gravité et complications"
    | "Traitement"
    | "Suivi"
    | "Synthèse";
  content: string; // text with keywords
  rank?: KnowledgeRank;
  keyPoints?: string[];
};

export type MedicalSheet = {
  id: string;
  itemNumber: number;
  title: string;
  subject: string;
  specialty: string;
  primaryObjectiveId: string;
  linkedObjectiveIds: string[];
  sourceVersionId: string;
  essentialPoints: string[];
  deepDive: {
    title: string;
    content: string;
    recommandations: string[];
  };
  pitfallsSheet: {
    title: string;
    traps: string[];
  };
  sections: MedicalSheetSection[];
  flashcardIds: string[];
  definitions: Definition[];
  podcast?: {
    title: string;
    durationMinutes: number;
    description: string;
    audioFile?: string; // local or synthetic fallback
  };
};

export type QuestionChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
};

export type PracticeQuestion = {
  id: string;
  type: "isolated" | "dossier_step" | "lca" | "exam_white";
  itemNumber: number;
  subject: string;
  specialty: string;
  objectiveId: string;
  rank: KnowledgeRank;
  text: string;
  choices: QuestionChoice[];
  generalExplanation: string;
  sourceVersionId: string;
  dossierContext?: string;
  stepNumber?: number;
};

export type EcosSituation = {
  id: string;
  itemNumber: number;
  subject: string;
  title: string;
  startingSituation: string;
  candidateInstructions: string[];
  durationMinutes: number;
  progressiveAnswers: {
    stage: string;
    dialogueOrObservation: string;
    expectedAction: string;
  }[];
  scoringGrid: {
    criterion: string;
    points: number;
    rank: KnowledgeRank;
    explanation: string;
  }[];
  sourceVersionId: string;
};
