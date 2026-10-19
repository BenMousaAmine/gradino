import type { AnswerRow } from "@/lib/admin/metrics";
import { GENERIC_TAGS } from "@/lib/items/grade";
import { dayInRome } from "@/lib/study/dates";

export type Tally = { correct: number; total: number };

export type Signals = {
  answers: number;
  skipRate: number | null;
  thinkSeconds: number | null;
  fatigue: { before: number; after: number } | null;
  awayPerHour: number | null;
  problems: Tally | null;
  advanced: Tally | null;
  errors: { tag: string; count: number }[];
  strengths: (Tally & { skillId: string })[];
};

const GENERIC = new Set<string>([GENERIC_TAGS.wrong, GENERIC_TAGS.empty, GENERIC_TAGS.invalid, GENERIC_TAGS.skipped]);
const MIN_SEGMENT = 8;

const isSkip = (answer: AnswerRow) => answer.errorTag === GENERIC_TAGS.skipped || answer.errorTag === GENERIC_TAGS.empty;
const percent = (part: number, total: number) => Math.round((part / total) * 100);

export function accuracy({ correct, total }: Tally): number {
  return percent(correct, total);
}

function tally(answers: readonly AnswerRow[]): Tally {
  return { correct: answers.filter((answer) => answer.score === 1).length, total: answers.length };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function fatigue(answers: readonly AnswerRow[]): Signals["fatigue"] {
  const byDay = new Map<string, AnswerRow[]>();
  for (const answer of answers) {
    const day = dayInRome(new Date(answer.createdAt));
    byDay.set(day, [...(byDay.get(day) ?? []), answer]);
  }
  const latest = [...byDay.entries()]
    .filter(([, rows]) => rows.length >= MIN_SEGMENT * 2)
    .sort(([a], [b]) => b.localeCompare(a))[0]?.[1];
  if (!latest) return null;
  const ordered = [...latest].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const half = Math.floor(ordered.length / 2);
  return { before: accuracy(tally(ordered.slice(0, half))), after: accuracy(tally(ordered.slice(half))) };
}

export function computeSignals(answers: readonly AnswerRow[]): Signals {
  const thinking = answers.flatMap((answer) =>
    !isSkip(answer) && answer.stats?.firstInputMs != null ? [answer.stats.firstInputMs] : [],
  );
  const hours = answers.reduce((sum, answer) => sum + answer.timeMs, 0) / 3_600_000;
  const away = answers.reduce((sum, answer) => sum + (answer.stats?.awayCount ?? 0), 0);
  const problems = tally(answers.filter((answer) => answer.purpose === "problem" || answer.skillId.startsWith("math.ps.")));
  const advanced = tally(answers.filter((answer) => answer.level === "advanced"));

  const errorCounts = new Map<string, number>();
  for (const answer of answers) {
    if (answer.errorTag && !GENERIC.has(answer.errorTag)) errorCounts.set(answer.errorTag, (errorCounts.get(answer.errorTag) ?? 0) + 1);
  }

  const bySkill = new Map<string, AnswerRow[]>();
  for (const answer of answers) bySkill.set(answer.skillId, [...(bySkill.get(answer.skillId) ?? []), answer]);
  const strengths = [...bySkill.entries()]
    .map(([skillId, rows]) => ({ skillId, ...tally(rows) }))
    .filter((row) => row.total >= 2 && row.correct === row.total)
    .sort((a, b) => b.total - a.total);

  return {
    answers: answers.length,
    skipRate: answers.length >= 10 ? percent(answers.filter(isSkip).length, answers.length) : null,
    thinkSeconds: thinking.length >= 8 ? Math.round(median(thinking) / 1000) : null,
    fatigue: fatigue(answers),
    awayPerHour: hours >= 0.25 ? Math.round((away / hours) * 10) / 10 : null,
    problems: problems.total >= 3 ? problems : null,
    advanced: advanced.total >= 4 ? advanced : null,
    errors: [...errorCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
    strengths,
  };
}

export type DaySignals = { day: string; skipRate: number | null; thinkSeconds: number | null };

export function dailySignals(days: readonly string[], answers: readonly AnswerRow[]): DaySignals[] {
  return days.map((day) => {
    const ofDay = answers.filter((answer) => dayInRome(new Date(answer.createdAt)) === day);
    const thinking = ofDay.flatMap((answer) =>
      !isSkip(answer) && answer.stats?.firstInputMs != null ? [answer.stats.firstInputMs] : [],
    );
    return {
      day,
      skipRate: ofDay.length >= 3 ? percent(ofDay.filter(isSkip).length, ofDay.length) : null,
      thinkSeconds: thinking.length >= 3 ? Math.round(median(thinking) / 1000) : null,
    };
  });
}

export type Chunk = { label: string; accuracy: number; seconds: number };

export function chunks(answers: readonly AnswerRow[], size = 5): Chunk[] {
  const ordered = [...answers].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const result: Chunk[] = [];
  for (let start = 0; start < ordered.length; start += size) {
    const part = ordered.slice(start, start + size);
    result.push({
      label: `${start + 1}–${start + part.length}`,
      accuracy: accuracy(tally(part)),
      seconds: Math.round(median(part.map((answer) => answer.timeMs)) / 1000),
    });
  }
  return result;
}
