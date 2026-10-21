import { GENERIC_TAGS } from "@/lib/items/grade";
import { addDays, dayInRome } from "@/lib/study/dates";

export type AnswerStatsRow = {
  firstInputMs: number | null;
  inputs: number;
  corrections: number;
  unitChanges: number;
  idleCount: number;
  idleMs: number;
  awayCount: number;
  awayMs: number;
  audioPlays?: number;
};

export type AnswerRow = {
  id: string;
  skillId: string;
  level: string;
  purpose: string;
  score: number;
  errorTag: string | null;
  message: string | null;
  timeMs: number;
  createdAt: string;
  sessionId: string | null;
  stats: AnswerStatsRow | null;
  attempts: number;
  finalScore: number;
  retryMs: number;
  noteMs: number | null;
  noteSource: string | null;
};

export type EventRow = {
  type: string;
  skillId: string | null;
  sessionId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type DayPoint = { day: string; minutes: number; answers: number; correct: number; accuracy: number | null };

const ANSWER_CAP = 5 * 60_000;
const FEEDBACK_CAP = 3 * 60_000;
const LESSON_CAP = 10 * 60_000;
const NOTE_CAP = 10 * 60_000;

const numberOf = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const dayOf = (iso: string) => dayInRome(new Date(iso));
const workMs = (answer: AnswerRow) => Math.max(0, answer.timeMs - (answer.stats?.awayMs ?? 0));

export function activeMs(answers: readonly AnswerRow[], events: readonly EventRow[]): Map<string, number> {
  const byDay = new Map<string, number>();
  const add = (day: string, ms: number) => byDay.set(day, (byDay.get(day) ?? 0) + ms);
  for (const answer of answers) {
    add(dayOf(answer.createdAt), Math.min(workMs(answer), ANSWER_CAP) + Math.min(answer.retryMs, ANSWER_CAP) + Math.min(answer.noteMs ?? 0, NOTE_CAP));
  }
  for (const event of events) {
    if (event.type === "feedback_closed") add(dayOf(event.createdAt), Math.min(numberOf(event.payload.ms), FEEDBACK_CAP));
    if (event.type === "lesson_step") add(dayOf(event.createdAt), Math.min(numberOf(event.payload.ms), LESSON_CAP));
  }
  return byDay;
}

export function lastDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}

export function dailySeries(days: readonly string[], answers: readonly AnswerRow[], events: readonly EventRow[]): DayPoint[] {
  const minutes = activeMs(answers, events);
  return days.map((day) => {
    const ofDay = answers.filter((answer) => dayOf(answer.createdAt) === day);
    const correct = ofDay.filter((answer) => answer.score === 1).length;
    return {
      day,
      minutes: Math.round((minutes.get(day) ?? 0) / 60_000),
      answers: ofDay.length,
      correct,
      accuracy: ofDay.length > 0 ? Math.round((correct / ofDay.length) * 100) : null,
    };
  });
}

export type PeriodStats = { minutes: number; answers: number; accuracy: number | null; daysActive: number; helpRate: number | null };

export function periodStats(points: readonly DayPoint[], answers: readonly AnswerRow[]): PeriodStats {
  const days = new Set(points.map((point) => point.day));
  const inPeriod = answers.filter((answer) => days.has(dayOf(answer.createdAt)));
  const correct = inPeriod.filter((answer) => answer.score === 1).length;
  const skipped = inPeriod.filter((answer) => answer.errorTag === GENERIC_TAGS.skipped).length;
  return {
    minutes: points.reduce((sum, point) => sum + point.minutes, 0),
    answers: inPeriod.length,
    accuracy: inPeriod.length > 0 ? Math.round((correct / inPeriod.length) * 100) : null,
    daysActive: points.filter((point) => point.minutes > 0 || point.answers > 0).length,
    helpRate: inPeriod.length > 0 ? Math.round((skipped / inPeriod.length) * 100) : null,
  };
}

export type WeakSkill = {
  skillId: string;
  answers: number;
  accuracy: number;
  avgSeconds: number;
  skipRate: number;
  corrections: number;
  score: number;
  reasons: string[];
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function weakSkills(answers: readonly AnswerRow[], minAnswers = 3): WeakSkill[] {
  const bySkill = new Map<string, AnswerRow[]>();
  for (const answer of answers) bySkill.set(answer.skillId, [...(bySkill.get(answer.skillId) ?? []), answer]);

  const rows = [...bySkill.entries()]
    .filter(([, rowsOfSkill]) => rowsOfSkill.length >= minAnswers)
    .map(([skillId, rowsOfSkill]) => {
      const total = rowsOfSkill.length;
      const accuracy = rowsOfSkill.filter((row) => row.score === 1).length / total;
      const avgMs = rowsOfSkill.reduce((sum, row) => sum + Math.min(workMs(row), ANSWER_CAP), 0) / total;
      const skipRate = rowsOfSkill.filter((row) => row.errorTag === GENERIC_TAGS.skipped).length / total;
      const corrections = rowsOfSkill.reduce((sum, row) => sum + (row.stats?.corrections ?? 0), 0) / total;
      return { skillId, total, accuracy, avgMs, skipRate, corrections };
    });

  const typicalMs = median(rows.map((row) => row.avgMs));
  return rows
    .map((row) => {
      const slowness = typicalMs > 0 ? Math.min(1, Math.max(0, (row.avgMs / typicalMs - 1) / 2)) : 0;
      const score = (1 - row.accuracy) * 0.6 + row.skipRate * 0.25 + slowness * 0.15;
      const reasons = [
        ...(row.accuracy < 0.7 ? [`sbaglia il ${Math.round((1 - row.accuracy) * 100)}%`] : []),
        ...(row.skipRate >= 0.2 ? [`"Non lo so" nel ${Math.round(row.skipRate * 100)}% dei casi`] : []),
        ...(slowness > 0.25 ? [`lento: ${Math.round(row.avgMs / 1000)} s di media`] : []),
        ...(row.corrections >= 2 ? [`corregge spesso (${row.corrections.toFixed(1)} correzioni a risposta)`] : []),
      ];
      return {
        skillId: row.skillId,
        answers: row.total,
        accuracy: Math.round(row.accuracy * 100),
        avgSeconds: Math.round(row.avgMs / 1000),
        skipRate: Math.round(row.skipRate * 100),
        corrections: Math.round(row.corrections * 10) / 10,
        score: Math.round(score * 100),
        reasons,
      };
    })
    .filter((row) => row.reasons.length > 0)
    .sort((a, b) => b.score - a.score);
}

export type ErrorGroup = { tag: string; count: number; message: string | null; skillIds: string[]; lastAnswerId: string };

const IGNORED_TAGS = new Set<string>([GENERIC_TAGS.wrong, GENERIC_TAGS.empty, GENERIC_TAGS.invalid, GENERIC_TAGS.skipped]);

export function errorGroups(answers: readonly AnswerRow[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  for (const answer of [...answers].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!answer.errorTag || IGNORED_TAGS.has(answer.errorTag)) continue;
    const group = groups.get(answer.errorTag) ?? { tag: answer.errorTag, count: 0, message: null, skillIds: [], lastAnswerId: answer.id };
    group.count += 1;
    group.message = answer.message ?? group.message;
    group.lastAnswerId = answer.id;
    if (!group.skillIds.includes(answer.skillId)) group.skillIds.push(answer.skillId);
    groups.set(answer.errorTag, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export type LessonStats = { skillId: string; opened: number; completed: number; stepSeconds: number[]; tries: number; triesCorrect: number };

export function lessonStats(events: readonly EventRow[]): LessonStats[] {
  const bySkill = new Map<string, LessonStats & { stepMs: number[]; stepCounts: number[] }>();
  for (const event of events) {
    if (!event.skillId || !event.type.startsWith("lesson_")) continue;
    const entry = bySkill.get(event.skillId) ?? {
      skillId: event.skillId,
      opened: 0,
      completed: 0,
      stepSeconds: [],
      tries: 0,
      triesCorrect: 0,
      stepMs: [0, 0, 0, 0],
      stepCounts: [0, 0, 0, 0],
    };
    if (event.type === "lesson_opened") entry.opened += 1;
    if (event.type === "lesson_completed") entry.completed += 1;
    if (event.type === "lesson_step") {
      const step = numberOf(event.payload.step);
      if (step >= 0 && step < 4) {
        entry.stepMs[step] += Math.min(numberOf(event.payload.ms), LESSON_CAP);
        entry.stepCounts[step] += 1;
      }
    }
    if (event.type === "lesson_try") {
      entry.tries += 1;
      if (numberOf(event.payload.correct) === numberOf(event.payload.total)) entry.triesCorrect += 1;
    }
    bySkill.set(event.skillId, entry);
  }
  return [...bySkill.values()].map(({ stepMs, stepCounts, ...rest }) => ({
    ...rest,
    stepSeconds: stepMs.map((ms, index) => (stepCounts[index] > 0 ? Math.round(ms / stepCounts[index] / 1000) : 0)),
  }));
}

export type Habits = {
  awayCount: number;
  awayMinutes: number;
  pauses: number;
  avgPauseMinutes: number | null;
  timeUps: number;
  feedbackSeconds: number | null;
  solutionOpenedRate: number | null;
  hours: number[];
  retried: number;
  recoveredRate: number | null;
  thinkSeconds: number | null;
  idleCount: number;
  idleMinutes: number;
  notes: number;
  noteSeconds: number | null;
  voiceNoteRate: number | null;
};

export function habits(events: readonly EventRow[], answers: readonly AnswerRow[]): Habits {
  const away = events.filter((event) => event.type === "away");
  const pauses = events.filter((event) => event.type === "pause_ended");
  const feedback = events.filter((event) => event.type === "feedback_closed");
  const wrongFeedback = feedback.filter((event) => numberOf(event.payload.score) < 1);
  const hours = Array.from({ length: 24 }, () => 0);
  for (const answer of answers) {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(new Date(answer.createdAt)));
    hours[hour] += 1;
  }
  const retried = answers.filter((answer) => answer.attempts === 2);
  const firstInputs = answers.flatMap((answer) =>
    answer.errorTag !== GENERIC_TAGS.skipped && answer.stats?.firstInputMs != null ? [answer.stats.firstInputMs] : [],
  );
  const notes = answers.filter((answer) => answer.noteMs !== null);
  return {
    awayCount: away.length,
    awayMinutes: Math.round(away.reduce((sum, event) => sum + numberOf(event.payload.ms), 0) / 60_000),
    pauses: pauses.length,
    avgPauseMinutes: pauses.length > 0 ? Math.round(pauses.reduce((sum, event) => sum + numberOf(event.payload.ms), 0) / pauses.length / 60_000) : null,
    timeUps: events.filter((event) => event.type === "time_up").length,
    feedbackSeconds:
      wrongFeedback.length > 0
        ? Math.round(wrongFeedback.reduce((sum, event) => sum + Math.min(numberOf(event.payload.ms), FEEDBACK_CAP), 0) / wrongFeedback.length / 1000)
        : null,
    solutionOpenedRate:
      wrongFeedback.length > 0 ? Math.round((wrongFeedback.filter((event) => event.payload.solutionOpen === true).length / wrongFeedback.length) * 100) : null,
    hours,
    retried: retried.length,
    recoveredRate: retried.length > 0 ? Math.round((retried.filter((answer) => answer.finalScore === 1).length / retried.length) * 100) : null,
    thinkSeconds: firstInputs.length > 0 ? Math.round(median(firstInputs) / 1000) : null,
    idleCount: answers.reduce((sum, answer) => sum + (answer.stats?.idleCount ?? 0), 0),
    idleMinutes: Math.round(answers.reduce((sum, answer) => sum + (answer.stats?.idleMs ?? 0), 0) / 60_000),
    notes: notes.length,
    noteSeconds: notes.length > 0 ? Math.round(notes.reduce((sum, answer) => sum + Math.min(answer.noteMs ?? 0, NOTE_CAP), 0) / notes.length / 1000) : null,
    voiceNoteRate: notes.length > 0 ? Math.round((notes.filter((answer) => answer.noteSource !== "typed").length / notes.length) * 100) : null,
  };
}
