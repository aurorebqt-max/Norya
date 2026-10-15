import type { PlannedTask, WorkEvent } from "./types";

export function groupDailyTasks(tasks: PlannedTask[]): PlannedTask[] {
  const grouped = new Map<string, PlannedTask>();
  for (const task of tasks) {
    const key = `${task.objectiveId}:${task.kind}:${task.pass ?? 0}:${task.phase}`;
    const current = grouped.get(key);
    if (current) {
      current.minutes += task.minutes;
      current.finishesObjective ||= task.finishesObjective;
    } else {
      grouped.set(key, { ...task });
    }
  }
  return [...grouped.values()];
}

export function groupDailyEvents(events: WorkEvent[]): {
  event: WorkEvent;
  count: number;
}[] {
  const grouped = new Map<string, { event: WorkEvent; count: number }>();
  for (const event of events) {
    const key = `${event.objectiveId}:${event.kind}:${event.pass ?? 0}`;
    const current = grouped.get(key);
    if (current) {
      current.count++;
      current.event.completed ||= event.completed;
    } else {
      grouped.set(key, { event: { ...event }, count: 1 });
    }
  }
  return [...grouped.values()];
}
