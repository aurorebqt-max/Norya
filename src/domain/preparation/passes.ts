import type { Objective, ObjectiveProgress, PreparationProfile } from './types';
export const PASS_WORK_MINUTES_PER_PAGE = 8;
export function passProgress(p: ObjectiveProgress | undefined, pass: number) {
  if (p?.passes?.[pass]) return p.passes[pass];
  if (pass === 1) return { minutes: p?.initialMinutes ?? 0, completedOn: p?.initialCompletedOn };
  if (pass === 2) return { minutes: p?.secondMinutes ?? 0, completedOn: p?.secondCompletedOn };
  return { minutes: 0, completedOn: undefined };
}
export function passMinutes(o: Objective, profile: PreparationProfile, pass: number) {
  const first = o.pages ? o.pages * PASS_WORK_MINUTES_PER_PAGE : o.initialMinutes;
  return Math.max(1, Math.ceil(first * (pass === 1 ? 1 : pass === 2 ? .65 : .4)));
}
export function passRemaining(o: Objective, p: ObjectiveProgress | undefined, profile: PreparationProfile, pass: number) {
  const progress = passProgress(p, pass);
  return progress.completedOn ? 0 : Math.max(1, passMinutes(o, profile, pass) - progress.minutes);
}
export function passSuggestion(pass: number) {
  return pass === 1 ? 'Fiche complète + référentiel privé' : pass === 2 ? 'Fiche complète ou express + entraînement' : 'Fiche express + QCM + carnet d’erreurs';
}
