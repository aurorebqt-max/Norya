import type { Objective } from "../domain/preparation/types";
import { examChapters } from "./rezidentiat2026";

export const PROGRAM_ID = "rezidentiat-medicina-2026";
export const PROGRAM_LABEL = "Rezidențiat Medicină · sesiunea noiembrie 2026";

export function pageCount(ranges: string): number {
  const pages = new Set<number>();
  for (const match of ranges.matchAll(/(\d+)(?:[–-](\d+))?/g)) {
    for (let p = Number(match[1]); p <= Number(match[2] ?? match[1]); p++) pages.add(p);
  }
  return pages.size;
}
export const objectives: Objective[] = examChapters.map((chapter, index) => ({
  id: chapter.id,
  subject:
    chapter.bookId === "kumar"
      ? "Kumar și Clark"
      : chapter.bookId === "lawrence"
        ? "Lawrence · Chirurgie"
        : "Sinopsis de medicină",
  title: chapter.chapter,
  pages: pageCount(chapter.pages),
  initialMinutes: 25,
  reviewMinutes: 10,
  secondMinutes: 20,
  order: index + 1,
}));
