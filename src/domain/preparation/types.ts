/** Dates are calendar days in the preparation timezone, never UTC instants. */
export type Day = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Exam = "EDN & ECOS" | "EDN" | "ECOS" | "Résidanat roumain";
export type KnowledgeStatus =
  "not-studied" | "covered" | "consolidating" | "mastered" | "fragile";
export type WorkKind = "initial" | "review" | "second";
export type Performance = "again" | "hard" | "good";
export type PreparationProfile = {
  id: string;
  name: string;
  exam: Exam;
  year: string;
  examDate: { provisional: Day; official?: { date: Day; source: string } };
  specialties: string[];
  weeklyMinutes: [number, number, number, number, number, number, number];
  restDays: Weekday[];
  startsOn: Day;
  firstPassTarget: Day;
  timeZone: string;
  goal: string;
  constraints: { unavailableDates: Day[]; maxSessionMinutes: number };
};
export type Objective = {
  id: string;
  subject: string;
  title: string;
  initialMinutes: number;
  reviewMinutes: number;
  secondMinutes: number;
  order: number;
  rank: "A" | "B";
};
export type ObjectiveProgress = {
  initialMinutes: number;
  initialCompletedOn?: Day;
  status: KnowledgeStatus;
  reviewCycle: number;
  reviewMinutes: number;
  nextReviewOn?: Day;
  secondMinutes: number;
  secondCompletedOn?: Day;
  /** Only assessed QCM successes on distinct days can eventually establish mastery. */
  assessedDays: Day[];
};
export type WorkEvent = {
  id: string;
  objectiveId: string;
  on: Day;
  kind: WorkKind;
  minutes: number;
  completed: boolean;
  performance?: Performance;
  source: "self" | "qcm";
};
export type LocalState = {
  schemaVersion: 2;
  revision: number;
  profile: PreparationProfile;
  onboarded: boolean;
  progress: Record<string, ObjectiveProgress>;
  events: WorkEvent[];
  notes: Record<string, string>;
  notifications: boolean;
  updatedAt: string;
};
export type PlannedTask = {
  id: string;
  objectiveId: string;
  on: Day;
  kind: WorkKind;
  minutes: number;
  finishesObjective: boolean;
  dueOn?: Day;
  phase: "first-pass" | "second-pass" | "final";
};
export type Plan = {
  today: Day;
  examOn: Day;
  deadline: Day;
  tasks: PlannedTask[];
  firstPassForecast: Day | null;
  feasible: boolean;
  remainingInitialMinutes: number;
  availableBeforeTarget: number;
  deficitMinutes: number;
  availableDays: number;
  requiredMinutesPerAvailableDay: number | null;
  overdueReviews: number;
  horizonEnd: Day;
};
export type WorkInput = Omit<WorkEvent, "on">;
