import type {
  Day,
  LocalState,
  Objective,
  PreparationProfile,
  WorkInput,
} from "./types";
import { createProfile, validateProfile } from "./profile";
import { recordWork } from "./progress";
export function createState(
  today: Day,
  id: string,
  timeZone: string,
): LocalState {
  return {
    schemaVersion: 2,
    revision: 0,
    profile: createProfile(today, id, timeZone),
    onboarded: false,
    progress: {},
    events: [],
    notes: {},
    notifications: true,
    updatedAt: "",
  };
}
export type Action =
  | { type: "profile"; profile: PreparationProfile }
  | { type: "work"; input: WorkInput; today: Day }
  | { type: "note"; id: string; text: string }
  | { type: "notifications"; value: boolean };
export function reduceState(
  state: LocalState,
  action: Action,
  program: Objective[],
): LocalState {
  if (action.type === "profile") {
    const problems = validateProfile(action.profile);
    if (problems.length) throw new Error(problems.join(" "));
    if (action.profile.id !== state.profile.id)
      throw new Error("L’identifiant local ne peut pas changer.");
    if (state.events.some((e) => e.on < action.profile.startsOn))
      throw new Error(
        "La date de début ne peut pas dépasser une séance déjà enregistrée.",
      );
    return { ...state, profile: action.profile, onboarded: true };
  }
  if (action.type === "note")
    return { ...state, notes: { ...state.notes, [action.id]: action.text } };
  if (action.type === "notifications")
    return { ...state, notifications: action.value };
  const objective = program.find((o) => o.id === action.input.objectiveId);
  if (!objective) throw new Error("Objectif inconnu.");
  return recordWork(state, objective, { ...action.input, on: action.today });
}
