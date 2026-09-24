import type { LocalState, Objective } from "../../domain/preparation/types";
import { recordWork, emptyProgress } from "../../domain/preparation/progress";
import { isDay } from "../../domain/preparation/dates";
import { validateProfile } from "../../domain/preparation/profile";
import { Action, reduceState } from "../../domain/preparation/state";
export const STORAGE_KEY = "norya.preparation";
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function integer(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}
export function decodeState(raw: string): LocalState {
  const parsed: unknown = JSON.parse(raw);
  if (!object(parsed)) throw new Error("Stockage illisible.");
  // v1 is the first preparation snapshot schema, not the in-memory medical demo.
  if (parsed.schemaVersion === 1) {
    parsed.schemaVersion = 2;
    parsed.notifications =
      typeof parsed.notifications === "boolean" ? parsed.notifications : true;
  }
  if (parsed.schemaVersion !== 2)
    throw new Error(
      "Version locale non prise en charge. Les données sont conservées.",
    );
  const p = parsed.profile;
  if (
    !object(p) ||
    typeof p.name !== "string" ||
    typeof p.id !== "string" ||
    typeof p.exam !== "string" ||
    typeof p.year !== "string" ||
    !strings(p.specialties) ||
    !object(p.examDate) ||
    typeof p.examDate.provisional !== "string" ||
    !Array.isArray(p.weeklyMinutes) ||
    !Array.isArray(p.restDays) ||
    !isDay(p.startsOn) ||
    !isDay(p.firstPassTarget) ||
    typeof p.timeZone !== "string" ||
    typeof p.goal !== "string" ||
    !object(p.constraints) ||
    !strings(p.constraints.unavailableDates)
  )
    throw new Error("Profil local invalide.");
  if (
    p.examDate.official !== undefined &&
    (!object(p.examDate.official) ||
      typeof p.examDate.official.date !== "string" ||
      typeof p.examDate.official.source !== "string")
  )
    throw new Error("Date officielle locale invalide.");
  const candidate = parsed as unknown as LocalState;
  const validation = validateProfile({
    ...candidate.profile,
    name: candidate.onboarded
      ? candidate.profile.name
      : candidate.profile.name || "Profil non configuré",
  });
  if (validation.length) throw new Error(validation.join(" "));
  if (
    !integer(parsed.revision) ||
    typeof parsed.onboarded !== "boolean" ||
    typeof parsed.notifications !== "boolean" ||
    typeof parsed.updatedAt !== "string" ||
    !object(parsed.progress) ||
    !object(parsed.notes) ||
    !Object.values(parsed.notes).every((v) => typeof v === "string") ||
    !Array.isArray(parsed.events)
  )
    throw new Error("État local invalide.");
  for (const v of Object.values(parsed.progress)) {
    if (
      !object(v) ||
      !integer(v.initialMinutes) ||
      !integer(v.reviewCycle) ||
      !integer(v.reviewMinutes) ||
      !integer(v.secondMinutes) ||
      !strings(v.assessedDays) ||
      !v.assessedDays.every(isDay) ||
      ![
        "not-studied",
        "covered",
        "consolidating",
        "mastered",
        "fragile",
      ].includes(String(v.status))
    )
      throw new Error("Progression locale invalide.");
    for (const key of [
      "initialCompletedOn",
      "nextReviewOn",
      "secondCompletedOn",
    ])
      if (v[key] !== undefined && !isDay(v[key]))
        throw new Error("Date de progression invalide.");
  }
  const ids = new Set<string>();
  for (const e of parsed.events) {
    if (
      !object(e) ||
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      typeof e.objectiveId !== "string" ||
      !isDay(e.on) ||
      !integer(e.minutes) ||
      e.minutes === 0 ||
      typeof e.completed !== "boolean" ||
      !["initial", "review", "second"].includes(String(e.kind)) ||
      !["self", "qcm"].includes(String(e.source)) ||
      (e.performance !== undefined &&
        !["again", "hard", "good"].includes(String(e.performance)))
    )
      throw new Error("Historique local invalide.");
    ids.add(e.id);
  }
  return candidate;
}
/** Single durable snapshot, serialized writes. UI is notified only after successful storage. */
export class PreparationRepository {
  private current: LocalState | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: KeyValueStorage,
    private program: Objective[],
    private now = () => new Date().toISOString(),
  ) {}
  async load(fallback: () => LocalState): Promise<LocalState> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    const state = raw === null ? fallback() : decodeState(raw);
    for (const o of this.program) {
      const p = state.progress[o.id];
      if (
        p &&
        (p.initialMinutes > o.initialMinutes ||
          p.reviewMinutes >= o.reviewMinutes ||
          p.secondMinutes > o.secondMinutes ||
          (!!p.initialCompletedOn && p.initialMinutes !== o.initialMinutes))
      )
        throw new Error(
          "Progression incompatible avec le programme. Les données sont conservées.",
        );
    }
    // Progress is a materialized projection of the append-only work journal.
    // Verify it on load so a partial/corrupt snapshot cannot claim false completion.
    let replay: LocalState = { ...state, progress: {}, events: [] };
    for (const event of state.events) {
      const objective = this.program.find((o) => o.id === event.objectiveId);
      if (objective) replay = recordWork(replay, objective, event);
    }
    for (const objective of this.program) {
      const actual = state.progress[objective.id] ?? emptyProgress();
      const expected = replay.progress[objective.id] ?? emptyProgress();
      const normalize = (value: object) =>
        JSON.stringify(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        );
      if (normalize(actual) !== normalize(expected))
        throw new Error(
          "Historique et progression incohérents. Les données sont conservées.",
        );
    }
    this.current = state;
    return state;
  }
  commit(action: Action): Promise<LocalState> {
    const task = this.queue.then(async () => {
      if (!this.current)
        throw new Error("Le profil doit être chargé avant toute modification.");
      const next = reduceState(this.current, action, this.program);
      if (next === this.current) return next;
      const saved = {
        ...next,
        revision: this.current.revision + 1,
        updatedAt: this.now(),
      };
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
      this.current = saved;
      return saved;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}
