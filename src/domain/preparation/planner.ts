import type {
  Day,
  LocalState,
  Objective,
  ObjectiveProgress,
  Plan,
  PlannedTask,
  PreparationProfile,
  WorkKind,
} from "./types";
import { addDays, assertDay, daysBetween, weekday } from "./dates";
import { deadline, examDay } from "./profile";
import { emptyProgress, reviewInterval } from "./progress";

export function dailyCapacity(profile: PreparationProfile, day: Day): number {
  const dow = weekday(day);
  return profile.restDays.includes(dow) ||
    profile.constraints.unavailableDates.includes(day)
    ? 0
    : profile.weeklyMinutes[dow];
}
export function validateProgram(program: Objective[]) {
  if (new Set(program.map((o) => o.id)).size !== program.length)
    throw new Error("Identifiants d’objectifs dupliqués.");
  for (const o of program)
    if (
      !o.id ||
      [o.initialMinutes, o.reviewMinutes, o.secondMinutes].some(
        (v) => !Number.isInteger(v) || v <= 0,
      )
    )
      throw new Error(
        "Les objectifs doivent avoir des durées positives en minutes.",
      );
}
/**
 * Pure, deterministic, minute-capacity scheduler. Initial learning can be split.
 * Reviews and second pass use only slack that cannot endanger the initial deadline.
 * Forecast reviews assume successful future recalls; real events replace forecasts.
 */
export function buildPlan(
  program: Objective[],
  state: Pick<LocalState, "profile" | "progress" | "events">,
  today: Day,
): Plan {
  validateProgram(program);
  assertDay(today);
  const profile = state.profile;
  const target = deadline(profile),
    exam = examDay(profile);
  const start = profile.startsOn > today ? profile.startsOn : today;
  const horizonCandidate = addDays(exam, 365);
  const horizon =
    horizonCandidate > addDays(start, 365)
      ? horizonCandidate
      : addDays(start, 365);
  if (daysBetween(start, horizon) > 4030)
    throw new Error("Horizon de planification trop long.");
  const sorted = [...program].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
  const virtual: Record<string, ObjectiveProgress> = {};
  for (const o of sorted)
    virtual[o.id] = {
      ...(state.progress[o.id] ?? emptyProgress()),
      assessedDays: [],
    };
  let remaining = sorted.reduce(
    (n, o) =>
      n +
      (virtual[o.id].initialCompletedOn
        ? 0
        : o.initialMinutes - virtual[o.id].initialMinutes),
    0,
  );
  const originalRemaining = remaining;
  const spent: Record<string, number> = {};
  for (const e of state.events) spent[e.on] = (spent[e.on] ?? 0) + e.minutes;
  const days: Day[] = [];
  for (let d = start; d <= horizon; d = addDays(d, 1)) days.push(d);
  const capacities = days.map((d) =>
    Math.max(0, dailyCapacity(profile, d) - (spent[d] ?? 0)),
  );
  const suffix: number[] = Array(days.length + 1).fill(0);
  let availableDays = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    suffix[i] = suffix[i + 1] + (days[i] <= target ? capacities[i] : 0);
    if (days[i] <= target && capacities[i] > 0) availableDays++;
  }
  const tasks: PlannedTask[] = [];
  let forecast: Day | null =
    remaining === 0
      ? (sorted
          .map((o) => virtual[o.id].initialCompletedOn)
          .filter((d): d is string => !!d)
          .sort()
          .at(-1) ?? today)
      : null;
  for (let i = 0; i < days.length; i++) {
    const on = days[i];
    let capacity = capacities[i];
    // After the exam only a possible late first-pass forecast is computed.
    if (on >= exam && remaining === 0) break;
    const allocate = (o: Objective, kind: WorkKind, limit: number) => {
      const p = virtual[o.id];
      let need =
        kind === "initial"
          ? o.initialMinutes - p.initialMinutes
          : kind === "review"
            ? o.reviewMinutes - p.reviewMinutes
            : o.secondMinutes - p.secondMinutes;
      let budget = Math.min(capacity, limit, need);
      const due = kind === "review" ? p.nextReviewOn : undefined;
      while (budget > 0) {
        const minutes = Math.min(budget, profile.constraints.maxSessionMinutes);
        need -= minutes;
        budget -= minutes;
        capacity -= minutes;
        tasks.push({
          id: on + ":" + kind + ":" + o.id + ":" + tasks.length,
          objectiveId: o.id,
          on,
          kind,
          minutes,
          finishesObjective: need === 0,
          dueOn: due,
          phase:
            on >= addDays(exam, -30)
              ? "final"
              : kind === "second"
                ? "second-pass"
                : "first-pass",
        });
        if (kind === "initial") {
          p.initialMinutes += minutes;
          remaining -= minutes;
        } else if (kind === "review") p.reviewMinutes += minutes;
        else p.secondMinutes += minutes;
      }
      if (need === 0) {
        if (kind === "initial") {
          p.initialCompletedOn = on;
          p.status = "covered";
          p.nextReviewOn = addDays(on, 1);
          if (remaining === 0) forecast = on;
        } else if (kind === "review") {
          p.reviewMinutes = 0;
          p.reviewCycle++;
          p.nextReviewOn = addDays(on, reviewInterval(p.reviewCycle));
        } else p.secondCompletedOn = on;
      }
    };
    // Reserve all remaining initial minutes across remaining capacity through J−30.
    const slack = () =>
      on <= target
        ? Math.max(0, capacity + suffix[i + 1] - remaining)
        : remaining > 0
          ? 0
          : capacity;
    if (on < exam) {
      const due = sorted.filter(
        (o) => virtual[o.id].nextReviewOn && virtual[o.id].nextReviewOn! <= on,
      );
      due.sort(
        (a, b) =>
          (virtual[a.id].status === "fragile" ? 0 : 1) -
            (virtual[b.id].status === "fragile" ? 0 : 1) ||
          (virtual[a.id].nextReviewOn ?? "").localeCompare(
            virtual[b.id].nextReviewOn ?? "",
          ) ||
          a.order - b.order,
      );
      for (const o of due) allocate(o, "review", slack());
      const second = sorted.filter((o) => {
        const p = virtual[o.id];
        return (
          p.initialCompletedOn &&
          !p.secondCompletedOn &&
          addDays(p.initialCompletedOn, p.status === "fragile" ? 7 : 14) <= on
        );
      });
      second.sort(
        (a, b) =>
          (virtual[a.id].status === "fragile" ? 0 : 1) -
            (virtual[b.id].status === "fragile" ? 0 : 1) || a.order - b.order,
      );
      for (const o of second) allocate(o, "second", slack());
    }
    for (const o of sorted) {
      if (capacity <= 0) break;
      if (!virtual[o.id].initialCompletedOn) allocate(o, "initial", capacity);
    }
  }
  return {
    today,
    examOn: exam,
    deadline: target,
    tasks,
    firstPassForecast: forecast,
    feasible: forecast !== null && forecast <= target,
    remainingInitialMinutes: originalRemaining,
    availableBeforeTarget: suffix[0],
    deficitMinutes: Math.max(0, originalRemaining - suffix[0]),
    availableDays,
    requiredMinutesPerAvailableDay: availableDays
      ? Math.ceil(originalRemaining / availableDays)
      : null,
    overdueReviews: program.filter(
      (o) =>
        state.progress[o.id]?.nextReviewOn &&
        state.progress[o.id].nextReviewOn! < today,
    ).length,
    horizonEnd: horizon,
  };
}
