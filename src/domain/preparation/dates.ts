import type { Day, Weekday } from "./types";
const DAY_MS = 86_400_000;
export function isDay(value: unknown): value is Day {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function assertDay(value: string): Day {
  if (!isDay(value)) throw new Error("Date invalide : utilisez AAAA-MM-JJ.");
  return value;
}
export function addDays(day: Day, days: number): Day {
  assertDay(day);
  return new Date(Date.parse(day + "T00:00:00Z") + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
export function daysBetween(from: Day, to: Day): number {
  return Math.round(
    (Date.parse(assertDay(to) + "T00:00:00Z") -
      Date.parse(assertDay(from) + "T00:00:00Z")) /
      DAY_MS,
  );
}
export function weekday(day: Day): Weekday {
  return ((new Date(assertDay(day) + "T00:00:00Z").getUTCDay() + 6) %
    7) as Weekday;
}
export function todayInZone(timeZone: string, instant = new Date()): Day {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
export function formatDay(
  day?: Day | null,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!day) return "À déterminer";
  return new Date(assertDay(day) + "T12:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
    timeZone: "UTC",
  });
}
export function monthStart(day: Day) {
  return day.slice(0, 8) + "01";
}
export function moveMonth(day: Day, delta: number): Day {
  const d = new Date(assertDay(day) + "T12:00:00Z");
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10);
}
