import type {
  LocalState,
  Objective,
  ObjectiveProgress,
  WorkEvent,
  Day,
} from "./types";
import { addDays, assertDay } from "./dates";
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;
export function emptyProgress(): ObjectiveProgress {
  return {
    initialMinutes: 0,
    status: "not-studied",
    reviewCycle: 0,
    reviewMinutes: 0,
    secondMinutes: 0,
    assessedDays: [],
  };
}
export function reviewInterval(cycle: number) {
  return REVIEW_INTERVALS[Math.min(cycle, REVIEW_INTERVALS.length - 1)];
}
export function recordWork(
  state: LocalState,
  objective: Objective,
  event: WorkEvent,
): LocalState {
  if (state.events.some((e) => e.id === event.id)) return state; // idempotent retry
  assertDay(event.on);
  if (event.on < state.profile.startsOn)
    throw new Error("La séance précède le début de votre préparation.");
  if (
    !event.id ||
    event.objectiveId !== objective.id ||
    !Number.isInteger(event.minutes) ||
    event.minutes <= 0
  )
    throw new Error("Séance invalide.");
  if (
    !["initial", "review", "second"].includes(event.kind) ||
    !["self", "qcm"].includes(event.source)
  )
    throw new Error("Type de séance invalide.");
  const previous = state.progress[objective.id] ?? emptyProgress();
  const p: ObjectiveProgress = {
    ...previous,
    assessedDays: [...previous.assessedDays],
  };
  const latest = state.events
    .filter((e) => e.objectiveId === objective.id)
    .at(-1);
  if (latest && event.on < latest.on)
    throw new Error(
      "Une séance ne peut pas précéder l’historique de cet objectif.",
    );
  if (event.kind === "initial") {
    if (p.initialCompletedOn)
      throw new Error("Le passage initial de cet objectif est déjà validé.");
    const remaining = objective.initialMinutes - p.initialMinutes;
    if (
      event.minutes > remaining ||
      (event.completed && event.minutes !== remaining) ||
      (!event.completed && event.minutes === remaining)
    )
      throw new Error(
        "Validez le passage initial seulement lorsque sa durée restante est terminée.",
      );
    p.initialMinutes += event.minutes;
    if (event.completed) {
      p.initialCompletedOn = event.on;
      p.status = "covered";
      p.nextReviewOn = addDays(event.on, reviewInterval(0));
    }
  } else {
    if (!p.initialCompletedOn) throw new Error("Parcourez d’abord l’objectif.");
    if (event.kind === "second" && p.secondCompletedOn)
      throw new Error("Le deuxième tour est déjà validé.");
    const remaining =
      event.kind === "review"
        ? objective.reviewMinutes - p.reviewMinutes
        : objective.secondMinutes - p.secondMinutes;
    if (
      event.minutes > remaining ||
      (event.completed && event.minutes !== remaining) ||
      (!event.completed && event.minutes === remaining)
    )
      throw new Error("Vérifiez la durée restante de cette révision.");
    if (event.kind === "review") p.reviewMinutes += event.minutes;
    else p.secondMinutes += event.minutes;
    if (event.completed) {
      if (
        !event.performance ||
        !["again", "hard", "good"].includes(event.performance)
      )
        throw new Error("Indiquez comment s’est passé le rappel actif.");
      if (event.kind === "review") {
        p.reviewMinutes = 0;
        p.reviewCycle++;
      } else p.secondCompletedOn = event.on;
      if (event.performance === "again") {
        p.status = "fragile";
        p.assessedDays = [];
      } else {
        if (event.performance === "hard") p.assessedDays = [];
        if (
          event.source === "qcm" &&
          event.performance === "good" &&
          !p.assessedDays.includes(event.on)
        )
          p.assessedDays.push(event.on);
        p.status = p.assessedDays.length >= 3 ? "mastered" : "consolidating";
      }
      const interval =
        event.performance === "again"
          ? 1
          : event.performance === "hard"
            ? 3
            : reviewInterval(p.reviewCycle);
      p.nextReviewOn = addDays(event.on, interval);
    }
  }
  return {
    ...state,
    progress: { ...state.progress, [objective.id]: p },
    events: [...state.events, event],
  };
}
export function summarize(
  program: Objective[],
  state: Pick<LocalState, "progress" | "events">,
  today: Day,
) {
  const covered = program.filter(
    (o) => state.progress[o.id]?.initialCompletedOn,
  );
  const fragile = program.filter(
    (o) => state.progress[o.id]?.status === "fragile",
  );
  const mastered = program.filter(
    (o) => state.progress[o.id]?.status === "mastered",
  );
  const reviewed = program.filter(
    (o) => (state.progress[o.id]?.reviewCycle ?? 0) > 0,
  );
  const second = program.filter((o) => state.progress[o.id]?.secondCompletedOn);
  const todaysEvents = state.events.filter((e) => e.on === today);
  return {
    total: program.length,
    covered: covered.length,
    percent: program.length
      ? Math.round((covered.length / program.length) * 100)
      : 0,
    fragile,
    mastered: mastered.length,
    reviewed: reviewed.length,
    second: second.length,
    todaysEvents,
    todayMinutes: todaysEvents.reduce((n, e) => n + e.minutes, 0),
  };
}
