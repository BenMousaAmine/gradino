import type { Level } from "@/lib/items/schemas";
import { addDays } from "./dates";

export type SkillStatus = "learning" | "review" | "mastered";

export type Progress = {
  status: SkillStatus;
  level: Level;
  reviewStep: number;
  nextReviewOn: string | null;
};

export type ProgressEvent =
  | { type: "level_up"; from: Level; to: Level }
  | { type: "completed"; nextReviewOn: string }
  | { type: "review_passed"; nextReviewOn: string }
  | { type: "review_failed"; level: Level };

export const LEVELS: readonly Level[] = ["base", "medium", "advanced"];
export const REVIEW_INTERVALS = [1, 3, 7, 15, 30];
export const REVIEW_LEVELS: readonly Level[] = ["medium", "advanced", "medium", "advanced", "advanced"];
export const REVIEW_SIZE = REVIEW_LEVELS.length;
export const PASS_RATIO = 0.9;
const FAST_TRACK = 5;
const WINDOW = 10;

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

export const NEW_PROGRESS: Progress = { status: "learning", level: "base", reviewStep: 0, nextReviewOn: null };

export function levelPassed(scores: readonly number[]): boolean {
  const recent = scores.slice(-FAST_TRACK);
  if (recent.length === FAST_TRACK && recent.every((score) => score === 1)) return true;
  const window = scores.slice(-WINDOW);
  return window.length === WINDOW && sum(window) >= PASS_RATIO * WINDOW;
}

export function afterPractice(
  progress: Progress,
  levelScores: readonly number[],
  today: string,
): { progress: Progress; event: ProgressEvent | null } {
  if (progress.status !== "learning" || !levelPassed(levelScores)) return { progress, event: null };
  const index = LEVELS.indexOf(progress.level);
  if (index < LEVELS.length - 1) {
    const to = LEVELS[index + 1];
    return { progress: { ...progress, level: to }, event: { type: "level_up", from: progress.level, to } };
  }
  const nextReviewOn = addDays(today, REVIEW_INTERVALS[0]);
  return {
    progress: { status: "review", level: "advanced", reviewStep: 0, nextReviewOn },
    event: { type: "completed", nextReviewOn },
  };
}

export function afterReview(
  progress: Progress,
  reviewScores: readonly number[],
  today: string,
): { progress: Progress; event: ProgressEvent } {
  const ratio = reviewScores.length === 0 ? 0 : sum(reviewScores) / reviewScores.length;
  if (ratio >= PASS_RATIO) {
    const reviewStep = progress.reviewStep + 1;
    const nextReviewOn = addDays(today, REVIEW_INTERVALS[Math.min(reviewStep, REVIEW_INTERVALS.length - 1)]);
    return {
      progress: { status: "mastered", level: "advanced", reviewStep, nextReviewOn },
      event: { type: "review_passed", nextReviewOn },
    };
  }
  const level: Level = ratio < 0.6 ? "medium" : "advanced";
  return {
    progress: { status: "learning", level, reviewStep: 0, nextReviewOn: null },
    event: { type: "review_failed", level },
  };
}

export function isReviewDue(progress: Progress, today: string): boolean {
  return progress.status !== "learning" && progress.nextReviewOn !== null && progress.nextReviewOn <= today;
}

export function stepsClimbed(progress: Progress): number {
  if (progress.status !== "learning") return LEVELS.length;
  return LEVELS.indexOf(progress.level);
}
