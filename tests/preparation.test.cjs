const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const {
  buildPlan,
  dailyCapacity,
} = require("../.test-build/domain/preparation/planner");
const {
  createState,
  reduceState,
} = require("../.test-build/domain/preparation/state");
const {
  recordWork,
  summarize,
} = require("../.test-build/domain/preparation/progress");
const {
  changeExamYear,
  deadline,
  validateProfile,
} = require("../.test-build/domain/preparation/profile");
const {
  addDays,
  daysBetween,
  todayInZone,
  weekday,
} = require("../.test-build/domain/preparation/dates");
const { objectives } = require("../.test-build/data/program");
const {
  PreparationRepository,
  decodeState,
  STORAGE_KEY,
} = require("../.test-build/services/storage/repository");
const TODAY = "2026-09-24";
function state(overrides = {}) {
  const value = createState(TODAY, "test-local", "Europe/Paris");
  value.profile = { ...value.profile, name: "Aurore", ...overrides };
  value.onboarded = true;
  return value;
}
function complete(s, o, on = TODAY, id = o.id, kind = "initial", performance) {
  const p = s.progress[o.id];
  const minutes =
    kind === "initial"
      ? o.initialMinutes - (p?.initialMinutes ?? 0)
      : kind === "review"
        ? o.reviewMinutes - (p?.reviewMinutes ?? 0)
        : o.secondMinutes - (p?.secondMinutes ?? 0);
  return recordWork(s, o, {
    id,
    objectiveId: o.id,
    on,
    kind,
    minutes,
    completed: true,
    source: "self",
    performance,
  });
}
test("planning déterministe, sans mutation ; durées de chaque objectif réellement distribuées", () => {
  const s = state(),
    copy = JSON.stringify(s);
  const a = buildPlan(objectives, s, TODAY),
    b = buildPlan(objectives, s, TODAY);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(s), copy);
  assert.equal(a.feasible, true);
  assert.ok(a.firstPassForecast < a.deadline);
  for (const o of objectives) {
    assert.equal(
      a.tasks
        .filter((t) => t.objectiveId === o.id && t.kind === "initial")
        .reduce((n, t) => n + t.minutes, 0),
      o.initialMinutes,
    );
    assert.equal(
      a.tasks.filter(
        (t) =>
          t.objectiveId === o.id && t.kind === "initial" && t.finishesObjective,
      ).length,
      1,
    );
  }
});
test("année différente, date provisoire remplacée puis date officielle sourcée", () => {
  const s = state();
  s.profile = changeExamYear(s.profile, "2029");
  let p = buildPlan(objectives, s, TODAY);
  assert.equal(p.examOn, "2029-10-01");
  assert.equal(p.deadline, "2029-09-01");
  s.profile.examDate.official = {
    date: "2029-09-20",
    source: "https://example.org/publication-test",
  };
  s.profile.firstPassTarget = "2029-08-21";
  p = buildPlan(objectives, s, TODAY);
  assert.equal(daysBetween(p.deadline, p.examOn), 30);
  assert.equal(p.examOn, "2029-09-20");
  assert.equal(validateProfile(s.profile).length, 0);
  s.profile.examDate.official.source = "";
  assert.ok(validateProfile(s.profile).length);
});
test("plusieurs spécialités ou aucune ne retirent aucun objectif", () => {
  const a = state({ specialties: ["Ophtalmologie", "Dermatologie"] }),
    b = state({ specialties: [] });
  assert.deepEqual(
    buildPlan(objectives, a, TODAY).tasks,
    buildPlan(objectives, b, TODAY).tasks,
  );
  assert.equal(
    new Set(
      buildPlan(objectives, a, TODAY)
        .tasks.filter((t) => t.kind === "initial")
        .map((t) => t.objectiveId),
    ).size,
    objectives.length,
  );
});
test("modification des disponibilités ralentit la prévision, sans changer les acquis", () => {
  let s = complete(state(), objectives[0]);
  const original = JSON.stringify(s.progress);
  const fast = buildPlan(objectives, s, TODAY);
  s = reduceState(
    s,
    {
      type: "profile",
      profile: { ...s.profile, weeklyMinutes: [20, 20, 20, 20, 20, 0, 0] },
    },
    objectives,
  );
  const slow = buildPlan(objectives, s, TODAY);
  assert.ok(slow.firstPassForecast > fast.firstPassForecast);
  assert.equal(JSON.stringify(s.progress), original);
  assert.equal(s.events.length, 1);
});
test("jours de repos, exceptions et minutes déjà travaillées respectés", () => {
  const s = state({
    restDays: [3, 5, 6],
    constraints: { maxSessionMinutes: 20, unavailableDates: ["2026-09-25"] },
  });
  const p = buildPlan(objectives, s, TODAY);
  assert.ok(!p.tasks.some((t) => t.on === TODAY || t.on === "2026-09-25"));
  const totals = {};
  for (const t of p.tasks) {
    totals[t.on] = (totals[t.on] ?? 0) + t.minutes;
    assert.ok(t.minutes <= 20);
  }
  for (const [day, total] of Object.entries(totals))
    assert.ok(total <= dailyCapacity(s.profile, day));
});
test("séance partielle : conserve le reste et ne valide pas le premier passage", () => {
  let s = state();
  const o = objectives[0];
  s = recordWork(s, o, {
    id: "partial",
    objectiveId: o.id,
    on: TODAY,
    kind: "initial",
    minutes: 15,
    completed: false,
    source: "self",
  });
  assert.equal(s.progress[o.id].initialMinutes, 15);
  assert.equal(s.progress[o.id].status, "not-studied");
  assert.equal(summarize(objectives, s, TODAY).covered, 0);
  const p = buildPlan(objectives, s, TODAY);
  assert.equal(
    p.tasks
      .filter((t) => t.objectiveId === o.id && t.kind === "initial")
      .reduce((n, t) => n + t.minutes, 0),
    30,
  );
  s = complete(s, o, TODAY, "finish");
  assert.equal(summarize(objectives, s, TODAY).covered, 1);
  assert.equal(s.progress[o.id].nextReviewOn, "2026-09-25");
  assert.ok(
    !buildPlan(objectives, s, TODAY).tasks.some(
      (t) => t.kind === "initial" && t.objectiveId === o.id,
    ),
  );
});
test("validation explicite, bornes, identifiant idempotent et pas de rappel avant étude", () => {
  const s = state(),
    o = objectives[0];
  const event = {
    id: "one",
    objectiveId: o.id,
    on: TODAY,
    kind: "initial",
    minutes: o.initialMinutes,
    completed: true,
    source: "self",
  };
  const saved = recordWork(s, o, event);
  assert.equal(recordWork(saved, o, event), saved);
  assert.throws(() => recordWork(s, o, { ...event, minutes: -10 }));
  assert.throws(() => recordWork(s, o, { ...event, completed: false }));
  assert.throws(() =>
    recordWork(s, o, { ...event, kind: "review", minutes: 10 }),
  );
  assert.throws(() => complete(saved, o, TODAY, "another"));
});
test("avance de cinq objectifs : charge réduite, aucune tâche initiale inutile, rappels conservés", () => {
  const initial = state({ weeklyMinutes: [60, 60, 60, 60, 60, 0, 0] });
  const before = buildPlan(objectives, initial, TODAY);
  let s = initial;
  for (const o of objectives.slice(0, 5)) s = complete(s, o);
  const after = buildPlan(objectives, s, TODAY);
  assert.equal(summarize(objectives, s, TODAY).covered, 5);
  assert.equal(
    after.remainingInitialMinutes,
    before.remainingInitialMinutes -
      objectives.slice(0, 5).reduce((n, o) => n + o.initialMinutes, 0),
  );
  assert.ok(after.firstPassForecast < before.firstPassForecast);
  for (const o of objectives.slice(0, 5)) {
    assert.ok(
      !after.tasks.some((t) => t.kind === "initial" && t.objectiveId === o.id),
    );
    assert.ok(
      after.tasks.some((t) => t.kind === "review" && t.objectiveId === o.id),
    );
  }
  assert.ok(!after.tasks.some((t) => t.on === TODAY)); // actual overtime consumes today's budget
});
test("retard et absence de plusieurs jours : reprise bornée, aucun historique inventé", () => {
  const s = complete(
    state({ weeklyMinutes: [30, 30, 30, 30, 30, 0, 0] }),
    objectives[0],
  );
  const early = buildPlan(objectives, s, TODAY),
    resume = "2026-10-12";
  const late = buildPlan(objectives, s, resume);
  assert.ok(late.firstPassForecast > early.firstPassForecast);
  assert.ok(late.tasks.every((t) => t.on >= resume));
  assert.equal(late.overdueReviews, 1);
  assert.equal(s.events.length, 1);
  for (const day of new Set(late.tasks.map((t) => t.on)))
    assert.ok(
      late.tasks
        .filter((t) => t.on === day)
        .reduce((n, t) => n + t.minutes, 0) <= 30,
    );
});
test("impossible à J−30 : déficit et charge nécessaire réels, poursuite possible", () => {
  const s = state({
    examDate: { provisional: "2026-10-25" },
    year: "2026",
    firstPassTarget: "2026-09-25",
    weeklyMinutes: [20, 20, 20, 20, 20, 0, 0],
  });
  const p = buildPlan(objectives, s, TODAY),
    total = objectives.reduce((n, o) => n + o.initialMinutes, 0);
  assert.equal(p.feasible, false);
  assert.equal(p.availableBeforeTarget, 40);
  assert.equal(p.deficitMinutes, total - 40);
  assert.equal(p.requiredMinutesPerAvailableDay, Math.ceil(total / 2));
  assert.ok(p.firstPassForecast > p.deadline);
  assert.ok(p.tasks.length);
  const zero = buildPlan(
    objectives,
    state({ weeklyMinutes: [0, 0, 0, 0, 0, 0, 0] }),
    TODAY,
  );
  assert.equal(zero.firstPassForecast, null);
  assert.equal(zero.feasible, false);
  assert.equal(zero.requiredMinutesPerAvailableDay, null);
  assert.equal(zero.tasks.length, 0);
});
test("J−30 reste prioritaire sur les rappels et le deuxième tour", () => {
  const program = objectives.slice(0, 3);
  let s = state({
    year: "2026",
    examDate: { provisional: "2026-10-26" },
    firstPassTarget: "2026-09-26",
    restDays: [],
    weeklyMinutes: [50, 50, 50, 50, 50, 50, 50],
  });
  s = complete(s, program[0]);
  const p = buildPlan(program, s, TODAY);
  assert.equal(p.feasible, true);
  assert.ok(p.firstPassForecast <= p.deadline);
  for (const day of new Set(p.tasks.map((t) => t.on))) {
    const used = s.events
      .filter((e) => e.on === day)
      .reduce((n, e) => n + e.minutes, 0);
    assert.ok(
      p.tasks.filter((t) => t.on === day).reduce((n, t) => n + t.minutes, 0) <=
        Math.max(0, 50 - used),
    );
  }
});
test("rappels et résultats changent les dates ; autoévaluation ne confère jamais la maîtrise", () => {
  let s = complete(state(), objectives[0]);
  const o = objectives[0];
  s = complete(s, o, "2026-09-25", "r1", "review", "again");
  assert.equal(s.progress[o.id].status, "fragile");
  assert.equal(s.progress[o.id].nextReviewOn, "2026-09-26");
  s = complete(s, o, "2026-09-26", "r2", "review", "hard");
  assert.equal(s.progress[o.id].nextReviewOn, "2026-09-29");
  for (let i = 0; i < 5; i++)
    s = complete(
      s,
      o,
      addDays("2026-09-29", i * 10),
      "good" + i,
      "review",
      "good",
    );
  assert.equal(s.progress[o.id].status, "consolidating");
  assert.equal(s.progress[o.id].assessedDays.length, 0);
});
test("structure QCM : trois jours évalués distincts nécessaires, puis un échec retire la maîtrise", () => {
  let s = complete(state(), objectives[0]),
    o = objectives[0];
  for (let i = 0; i < 3; i++)
    s = recordWork(s, o, {
      id: "q" + i,
      objectiveId: o.id,
      on: addDays(TODAY, i + 1),
      kind: "review",
      minutes: o.reviewMinutes,
      completed: true,
      source: "qcm",
      performance: "good",
    });
  assert.equal(s.progress[o.id].status, "mastered");
  s = complete(s, o, "2026-10-01", "fail", "review", "again");
  assert.equal(s.progress[o.id].status, "fragile");
});
test("second tour par objectif avant la fin globale ; fragiles priorisés", () => {
  const program = [
    { ...objectives[0], initialMinutes: 10 },
    { ...objectives[1], initialMinutes: 1000 },
  ];
  let s = state({ weeklyMinutes: [20, 20, 20, 20, 20, 20, 20], restDays: [] });
  s = complete(s, program[0]);
  const p = buildPlan(program, s, TODAY);
  const second = p.tasks.find(
    (t) => t.kind === "second" && t.objectiveId === program[0].id,
  );
  assert.ok(second);
  assert.ok(second.on < p.firstPassForecast);
  assert.ok(second.on >= addDays(TODAY, 14));
  assert.equal(p.feasible, true);
});
test("derniers 30 jours : tâches finales et fragilité issues des actions", () => {
  let s = state({
    year: "2026",
    examDate: { provisional: "2026-10-20" },
    firstPassTarget: "2026-09-20",
  });
  s = complete(s, objectives[0]);
  s = complete(s, objectives[0], "2026-09-25", "again", "review", "again");
  const p = buildPlan(objectives, s, "2026-09-26");
  assert.equal(summarize(objectives, s, "2026-09-26").fragile.length, 1);
  assert.ok(
    p.tasks
      .filter((t) => t.on < "2026-10-20")
      .every((t) => t.phase === "final"),
  );
  assert.equal(p.feasible, false);
});
test("dates civiles : fuseau, heure d’été, année bissextile et changement d’année", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2);
  const instant = new Date("2026-12-31T23:30:00Z");
  assert.equal(todayInZone("Europe/Paris", instant), "2027-01-01");
  assert.equal(todayInZone("America/New_York", instant), "2026-12-31");
  assert.throws(() => addDays("2026-02-30", 1));
  const modulePath = require.resolve("../.test-build/domain/preparation/dates");
  const code =
    "const d=require(" +
    JSON.stringify(modulePath) +
    ");console.log(d.addDays('2026-12-31',1),d.weekday('2027-01-01'),d.todayInZone('Europe/Paris',new Date('2026-12-31T23:30:00Z')))";
  const outputs = ["UTC", "Pacific/Honolulu", "Asia/Tokyo"].map((TZ) =>
    execFileSync(process.execPath, ["-e", code], {
      env: { ...process.env, TZ },
    }).toString(),
  );
  assert.equal(new Set(outputs).size, 1);
  assert.equal(weekday("2027-01-01"), 4);
});
test("propriétés de capacité sur 35 disponibilités variées", () => {
  for (let n = 0; n < 35; n++) {
    const weeklyMinutes = Array.from(
      { length: 7 },
      (_, i) => (n * 13 + i * 7) % 95,
    );
    const s = state({ weeklyMinutes, restDays: [n % 7] });
    const p = buildPlan(objectives, s, TODAY);
    const totals = new Map();
    for (const t of p.tasks) {
      assert.ok(t.minutes > 0);
      totals.set(t.on, (totals.get(t.on) ?? 0) + t.minutes);
    }
    for (const [d, total] of totals)
      assert.ok(total <= dailyCapacity(s.profile, d));
    if (p.feasible) assert.ok(p.firstPassForecast <= deadline(s.profile));
  }
});
class MemoryStorage {
  value = null;
  fail = false;
  async getItem() {
    return this.value;
  }
  async setItem(key, value) {
    assert.equal(key, STORAGE_KEY);
    await new Promise((r) => setTimeout(r, 2));
    if (this.fail) throw Error("Disque indisponible");
    this.value = value;
  }
}
test("réouverture : profil, séances partielles/complètes, notes et notifications conservés", async () => {
  const storage = new MemoryStorage(),
    repo = new PreparationRepository(storage, objectives);
  await repo.load(() => state());
  await repo.commit({
    type: "work",
    today: TODAY,
    input: {
      id: "partial",
      objectiveId: objectives[0].id,
      kind: "initial",
      minutes: 15,
      completed: false,
      source: "self",
    },
  });
  await repo.commit({ type: "note", id: "cardio", text: "Ma note" });
  const saved = await repo.commit({ type: "notifications", value: false });
  const reopened = await new PreparationRepository(storage, objectives).load(
    () => {
      throw Error("Ne doit pas utiliser le défaut");
    },
  );
  assert.deepEqual(reopened, saved);
  assert.equal(reopened.progress["cardio-1"].initialMinutes, 15);
  assert.equal(reopened.notifications, false);
});
test("écritures concurrentes sérialisées et erreur disque sans perte d’état", async () => {
  const storage = new MemoryStorage(),
    repo = new PreparationRepository(storage, objectives);
  await repo.load(() => state());
  await Promise.all([
    repo.commit({ type: "note", id: "a", text: "A" }),
    repo.commit({ type: "note", id: "b", text: "B" }),
  ]);
  assert.deepEqual(decodeState(storage.value).notes, { a: "A", b: "B" });
  const old = storage.value;
  storage.fail = true;
  await assert.rejects(repo.commit({ type: "note", id: "c", text: "C" }));
  assert.equal(storage.value, old);
  storage.fail = false;
  await repo.commit({ type: "note", id: "d", text: "D" });
  assert.deepEqual(decodeState(storage.value).notes, {
    a: "A",
    b: "B",
    d: "D",
  });
});
test("migration v1 conserve acquis et notes ; corruption et schéma futur ne sont jamais écrasés", async () => {
  const saved = complete(state(), objectives[0]);
  saved.notes.cardio = "Conserver";
  const old = { ...saved, schemaVersion: 1 };
  delete old.notifications;
  const migrated = decodeState(JSON.stringify(old));
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.notifications, true);
  assert.deepEqual(migrated.progress, saved.progress);
  assert.deepEqual(migrated.notes, saved.notes);
  for (const raw of [
    "{",
    JSON.stringify({ ...saved, schemaVersion: 99 }),
    JSON.stringify({ ...saved, profile: { name: "Cassé" } }),
  ]) {
    const storage = new MemoryStorage();
    storage.value = raw;
    const repo = new PreparationRepository(storage, objectives);
    await assert.rejects(repo.load(() => state()));
    assert.equal(storage.value, raw);
    await assert.rejects(repo.commit({ type: "note", id: "x", text: "x" }));
    assert.equal(storage.value, raw);
  }
});
test("modifier date, fuseau, spécialités et année préserve toutes les actions", () => {
  let s = complete(state(), objectives[0]);
  s.notes.cardio = "Conserver";
  const changed = {
    ...changeExamYear(s.profile, "2028"),
    specialties: [],
    timeZone: "America/New_York",
  };
  const after = reduceState(
    s,
    { type: "profile", profile: changed },
    objectives,
  );
  assert.deepEqual(after.events, s.events);
  assert.deepEqual(after.progress, s.progress);
  assert.deepEqual(after.notes, s.notes);
  assert.throws(() =>
    reduceState(
      s,
      { type: "profile", profile: { ...changed, startsOn: "2026-10-01" } },
      objectives,
    ),
  );
});
