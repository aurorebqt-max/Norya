import type { PreparationProfile, Day } from "./types";
import { addDays, daysBetween, isDay } from "./dates";
export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export function examDay(profile: PreparationProfile): Day {
  return profile.examDate.official?.date ?? profile.examDate.provisional;
}
export function deadline(profile: PreparationProfile): Day {
  if (!isDay(examDay(profile))) return "";
  const limit = addDays(examDay(profile), -30);
  return profile.firstPassTarget < limit ? profile.firstPassTarget : limit;
}
export function weeklyCapacity(profile: PreparationProfile): number {
  return profile.weeklyMinutes.reduce(
    (total, minutes, day) =>
      total + (profile.restDays.includes(day as 0) ? 0 : minutes),
    0,
  );
}
export function createProfile(
  today: Day,
  id: string,
  timeZone = "Europe/Paris",
): PreparationProfile {
  const currentYear = Number(today.slice(0, 4));
  const year = String(
    today.slice(5) < "11-01" ? currentYear : currentYear + 1,
  );
  const provisional = "";
  return {
    id,
    name: "",
    exam: "Rezidențiat roumain",
    year,
    examDate: { provisional },
    specialties: [],
    weeklyMinutes: [120, 120, 120, 120, 120, 0, 0],
    restDays: [5, 6],
    startsOn: today,
    firstPassTarget: "",
    timeZone,
    targetPasses: 2,
    minutesPerPage: 8,
    goal: "Avancer avec régularité",
    constraints: { unavailableDates: [], maxSessionMinutes: 30 },
  };
}
export function changeExamYear(
  profile: PreparationProfile,
  year: string,
): PreparationProfile {
  const provisional = "";
  return {
    ...profile,
    year,
    examDate: { provisional },
    firstPassTarget: "",
  };
}
export function validateProfile(p: PreparationProfile): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(p.targetPasses ?? 2) || (p.targetPasses ?? 2) < 1 || (p.targetPasses ?? 2) > 10) problems.push("Choisissez de 1 à 10 tours.");
  if (!Number.isFinite(p.minutesPerPage ?? 8) || (p.minutesPerPage ?? 8) < 1 || (p.minutesPerPage ?? 8) > 60) problems.push("Le rythme doit être compris entre 1 et 60 minutes par page.");
  if (isDay(p.startsOn) && isDay(examDay(p)) && p.startsOn >= examDay(p)) problems.push("Le début doit précéder le concours.");
  if (!p.id || !p.name.trim() || p.name.length > 60)
    problems.push("Indiquez un prénom (60 caractères maximum).");
  if (p.exam !== "Rezidențiat roumain")
  problems.push("Le parcours Norya est dédié au rezidențiat roumain.");
  if (!/^20\d{2}$/.test(p.year)) problems.push("Année de concours invalide.");
  if (
    !isDay(p.examDate.provisional) ||
    p.examDate.provisional.slice(0, 4) !== p.year
  )
    problems.push("La date provisoire doit appartenir à l’année choisie.");
  if (
    p.examDate.official &&
    (!isDay(p.examDate.official.date) ||
      p.examDate.official.date.slice(0, 4) !== p.year ||
      !/^https:\/\/\S+$/.test(p.examDate.official.source))
  )
    problems.push(
      "Indiquez une date officielle de l’année choisie et le lien HTTPS de sa publication.",
    );
  if (!isDay(p.startsOn) || !isDay(p.firstPassTarget))
    problems.push("Vérifiez les dates de début et de fin des tours.");
  if (
    isDay(examDay(p)) &&
    isDay(p.startsOn) &&
    daysBetween(p.startsOn, examDay(p)) > 3660
  )
    problems.push("L’horizon de préparation est limité à dix ans.");
  if (
    isDay(examDay(p)) &&
    isDay(p.firstPassTarget) &&
    p.firstPassTarget > addDays(examDay(p), -30)
  )
    problems.push("L’objectif des tours doit être au plus tard à J−30.");
  if (
    p.weeklyMinutes.length !== 7 ||
    p.weeklyMinutes.some((v) => !Number.isInteger(v) || v < 0 || v > 720)
  )
    problems.push(
      "Les disponibilités doivent être comprises entre 0 et 720 minutes par jour.",
    );
  if (p.restDays.some((v) => !Number.isInteger(v) || v < 0 || v > 6))
    problems.push("Jour de repos invalide.");
  if (
    !Number.isInteger(p.constraints.maxSessionMinutes) ||
    p.constraints.maxSessionMinutes < 5 ||
    p.constraints.maxSessionMinutes > 180
  )
    problems.push("Durée de séance invalide (5 à 180 minutes).");
  if (p.constraints.unavailableDates.some((d) => !isDay(d)))
    problems.push("Une date d’absence est invalide.");
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: p.timeZone }).format();
  } catch {
    problems.push("Fuseau de préparation invalide.");
  }
  return problems;
}
