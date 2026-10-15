import { passProgress, passRemaining } from "./passes";
import type {
  Day,
  LocalState,
  Objective,
  Plan,
  PreparationProfile,
} from "./types";
import { addDays, assertDay, daysBetween, weekday, isDay } from "./dates";
import {
  AUTOMATIC_DAILY_CAPACITY_MINUTES,
  deadline,
  examDay,
} from "./profile";
import { emptyProgress, reviewInterval } from "./progress";

export { AUTOMATIC_DAILY_CAPACITY_MINUTES } from "./profile";

export function dailyCapacity(profile: PreparationProfile, day: Day): number {
  const dow = weekday(day);
  return profile.restDays.includes(dow) ||
    profile.constraints.unavailableDates.includes(day)
    ? 0
    : profile.availabilityConfigured
      ? profile.weeklyMinutes[dow]
      : AUTOMATIC_DAILY_CAPACITY_MINUTES;
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
/** Forecasts never write completions: only explicit work events do. */
export function buildPlan(program: Objective[], state: Pick<LocalState, "profile" | "progress" | "events">, today: Day): Plan {
  validateProgram(program);
  assertDay(today);
  const profile = state.profile, exam = examDay(profile), target = deadline(profile);
  const count = profile.targetPasses ?? 2;
  const passes = Array.from({length: count}, (_, i) => {
    const dates = program.map(o => passProgress(state.progress[o.id], i + 1).completedOn);
    return {number: i + 1, completed: dates.filter(Boolean).length, total: program.length,
      forecast: dates.every(Boolean) ? dates.filter((d): d is string => !!d).sort().at(-1) ?? today : null};
  });
  const original = passes.reduce((n, p) => n + program.reduce((m, o) => m + passRemaining(o, state.progress[o.id], profile, p.number), 0), 0);
  const base: Plan = {today, examOn: exam, deadline: target, tasks: [], passes,
    remainingPassMinutes: original, firstPassForecast: passes[0]?.forecast ?? null, feasible: false,
    remainingInitialMinutes: program.reduce((n,o) => n + passRemaining(o,state.progress[o.id],profile,1),0),
    availableBeforeTarget: 0, deficitMinutes: original, availableDays: 0,
    requiredMinutesPerAvailableDay: null, overdueReviews: program.filter(o => (state.progress[o.id]?.nextReviewOn ?? today) < today).length,
    horizonEnd: today};
  if (!isDay(exam) || !isDay(target)) return base;
  const start = profile.startsOn > today ? profile.startsOn : today;
  const horizon = addDays(start > exam ? start : exam, 365);
  if (daysBetween(start, horizon) > 4030) throw new Error("Horizon de planification trop long.");
  const sorted = [...program].sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
  const queue = passes.flatMap(p => [...sorted].sort((a,b) => p.number === 1 ? a.order-b.order : Number(state.progress[b.id]?.status === 'fragile') - Number(state.progress[a.id]?.status === 'fragile') || a.order-b.order)
    .map(o => ({o, pass:p.number, remaining:passRemaining(o,state.progress[o.id],profile,p.number)})).filter(x => x.remaining > 0));
  const reviews = Object.fromEntries(sorted.map(o => [o.id, {...(state.progress[o.id] ?? emptyProgress())}]));
  const spent: Record<string, number> = {};
  for (const e of state.events) spent[e.on] = (spent[e.on] ?? 0) + e.minutes;
  let cursor = 0, reviewBeforeTarget = 0;
  for (let on = start; on <= horizon; on = addDays(on,1)) {
    let capacity = Math.max(0,dailyCapacity(profile,on) - (spent[on] ?? 0));
    if (on <= target) { base.availableBeforeTarget += capacity; if(capacity) base.availableDays++; }
    const final = on >= addDays(exam,-30);
    // Reserve a bounded share for essential recalls, including when passes are late.
    let reviewBudget = on < exam ? Math.floor(capacity * (cursor >= queue.length ? 1 : final ? .5 : .2)) : 0;
    for (const o of sorted.filter(o => reviews[o.id].nextReviewOn && reviews[o.id].nextReviewOn! <= on)
      .sort((a,b) => Number(reviews[b.id].status === 'fragile') - Number(reviews[a.id].status === 'fragile') || reviews[a.id].nextReviewOn!.localeCompare(reviews[b.id].nextReviewOn!))) {
      const p = reviews[o.id];
      const minutes = Math.min(reviewBudget, o.reviewMinutes-p.reviewMinutes, profile.constraints.maxSessionMinutes);
      if (minutes <= 0) continue;
      p.reviewMinutes += minutes; capacity -= minutes; reviewBudget -= minutes;
      if(on <= target) reviewBeforeTarget += minutes;
      const completed = p.reviewMinutes === o.reviewMinutes;
      base.tasks.push({id:`${on}:review:${o.id}`,objectiveId:o.id,on,kind:'review',minutes,finishesObjective:completed,dueOn:p.nextReviewOn,phase:final?'final':'first-pass'});
      if(completed) { p.reviewMinutes=0; p.reviewCycle++; p.nextReviewOn=addDays(on,reviewInterval(p.reviewCycle)); }
    }
    while(capacity > 0 && cursor < queue.length) {
      const item=queue[cursor];
      const minutes=Math.min(capacity,item.remaining,profile.constraints.maxSessionMinutes);
      item.remaining-=minutes; capacity-=minutes;
      base.tasks.push({id:`${on}:pass:${item.pass}:${item.o.id}:${base.tasks.length}`,objectiveId:item.o.id,on,kind:'pass',pass:item.pass,minutes,finishesObjective:item.remaining===0,phase:final?'final':item.pass===1?'first-pass':'second-pass'});
      if(item.remaining===0) {
        const p=reviews[item.o.id];
        p.nextReviewOn=addDays(on,1);
        cursor++;
        if(!queue.slice(cursor).some(x=>x.pass===item.pass)) passes[item.pass-1].forecast=on;
      }
    }
    if(on > target && on >= exam && cursor === queue.length) break;
  }
  base.horizonEnd=horizon;
  base.firstPassForecast=passes[0]?.forecast ?? null;
  base.feasible=passes.every(p=>p.forecast !== null && p.forecast <= target);
  base.deficitMinutes=Math.max(0,original+reviewBeforeTarget-base.availableBeforeTarget);
  base.requiredMinutesPerAvailableDay=base.availableDays ? Math.ceil((original+reviewBeforeTarget)/base.availableDays) : null;
  return base;
}
