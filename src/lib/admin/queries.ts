import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DIAGNOSTIC_ID } from "@/lib/app";
import { loadAssessment, loadLatestAttempt } from "@/lib/assessments/queries";
import { toEngineSections } from "@/lib/assessments/view";
import { getCurrentUser } from "@/lib/auth/session";
import { sectionResults, type AreaColor } from "@/lib/diagnostic/engine";
import { generateItem } from "@/lib/generators/registry";
import { describeAnswer, describeResponse } from "@/lib/items/describe";
import { itemContentSchema, itemKeySchema, itemResponseSchema, levelSchema, type Level } from "@/lib/items/schemas";
import { addDays, dayInRome, startOfDayInRome } from "@/lib/study/dates";
import type { Admin } from "@/lib/study/exercises";
import { stepsClimbed, type SkillStatus } from "@/lib/study/mastery";
import { SESSION_BLOCKS } from "@/lib/study/plan";
import {
  dailySeries,
  errorGroups,
  habits,
  lastDays,
  lessonStats,
  periodStats,
  weakSkills,
  type AnswerRow,
  type EventRow,
} from "./metrics";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") notFound();
  return user;
}

const detailsSchema = z
  .object({
    diagnosis: z.object({ tag: z.string(), message: z.string().nullable() }).nullable().optional(),
    stats: z
      .object({
        firstInputMs: z.number().nullable(),
        inputs: z.number(),
        corrections: z.number(),
        unitChanges: z.number(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

const payloadSchema = z.record(z.string(), z.unknown());

type AnswerDbRow = {
  id: string;
  skill_id: string;
  level: string;
  purpose: string;
  score: number;
  error_tag: string | null;
  details: unknown;
  time_ms: number;
  created_at: string;
  session_id: string | null;
};

function toAnswer(row: AnswerDbRow): AnswerRow {
  const details = detailsSchema.safeParse(row.details);
  return {
    id: row.id,
    skillId: row.skill_id,
    level: row.level,
    purpose: row.purpose,
    score: row.score,
    errorTag: row.error_tag,
    message: details.success ? (details.data.diagnosis?.message ?? null) : null,
    timeMs: row.time_ms,
    createdAt: row.created_at,
    sessionId: row.session_id,
    stats: details.success ? (details.data.stats ?? null) : null,
  };
}

function toEvent(row: { type: string; skill_id: string | null; session_id: string | null; payload: unknown; created_at: string }): EventRow {
  const payload = payloadSchema.safeParse(row.payload);
  return {
    type: row.type,
    skillId: row.skill_id,
    sessionId: row.session_id,
    payload: payload.success ? payload.data : {},
    createdAt: row.created_at,
  };
}

const ANSWER_COLUMNS = "id, skill_id, level, purpose, score, error_tag, details, time_ms, created_at, session_id";

async function emails(admin: Admin): Promise<Map<string, string>> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) throw new Error(error.message);
  return new Map(data.users.map((user) => [user.id, user.email ?? ""]));
}

async function skillTitles(admin: Admin): Promise<Map<string, { title: string; area: string; order: number }>> {
  const { data, error } = await admin.from("skills").select("id, title, position, areas(title, position)");
  if (error) throw new Error(error.message);
  return new Map(
    data.map((row) => [row.id, { title: row.title, area: row.areas.title, order: row.areas.position * 1000 + row.position }]),
  );
}

export type StudentSummary = {
  id: string;
  name: string;
  email: string;
  lastActivity: string | null;
  minutesToday: number;
  minutesWeek: number;
  answersWeek: number;
  accuracyWeek: number | null;
  sessionsWeek: number;
  diagnosticDone: boolean;
};

export async function listStudents(admin: Admin): Promise<StudentSummary[]> {
  const today = dayInRome();
  const since = startOfDayInRome(addDays(today, -6));
  const [profiles, mail] = await Promise.all([
    admin.from("profiles").select("id, display_name, role").order("display_name"),
    emails(admin),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  const students = profiles.data.filter((profile) => profile.role !== "admin");
  const ids = students.map((student) => student.id);
  if (ids.length === 0) return [];

  const [answers, events, sessions, attempts] = await Promise.all([
    admin.from("practice_answers").select(`user_id, ${ANSWER_COLUMNS}`).in("user_id", ids).gte("created_at", since),
    admin.from("activity_events").select("user_id, type, skill_id, session_id, payload, created_at").in("user_id", ids).gte("created_at", since).in("type", ["feedback_closed", "lesson_step"]),
    admin.from("study_sessions").select("user_id, status, day").in("user_id", ids).gte("day", addDays(today, -6)),
    admin.from("attempts").select("user_id, status, completed_at").in("user_id", ids),
  ]);
  for (const result of [answers, events, sessions, attempts]) if (result.error) throw new Error(result.error.message);

  const latest = await Promise.all(
    ids.map(async (id) => {
      const [practice, test] = await Promise.all([
        admin.from("practice_answers").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("responses").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const values = [practice.data?.created_at, test.data?.created_at].filter((value): value is string => Boolean(value)).sort();
      return [id, values.at(-1) ?? null] as const;
    }),
  );
  const latestById = new Map(latest);
  const days = lastDays(today, 7);

  return students.map((student) => {
    const mine = (answers.data ?? []).filter((row) => row.user_id === student.id).map(toAnswer);
    const myEvents = (events.data ?? []).filter((row) => row.user_id === student.id).map(toEvent);
    const series = dailySeries(days, mine, myEvents);
    const week = periodStats(series, mine);
    return {
      id: student.id,
      name: student.display_name,
      email: mail.get(student.id) ?? "",
      lastActivity: latestById.get(student.id) ?? null,
      minutesToday: series.at(-1)?.minutes ?? 0,
      minutesWeek: week.minutes,
      answersWeek: week.answers,
      accuracyWeek: week.accuracy,
      sessionsWeek: (sessions.data ?? []).filter((row) => row.user_id === student.id && row.status === "completed").length,
      diagnosticDone: (attempts.data ?? []).some((row) => row.user_id === student.id && row.status === "completed"),
    };
  });
}

async function studentProfile(admin: Admin, studentId: string) {
  const { data, error } = await admin.from("profiles").select("id, display_name, role").eq("id", studentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const mail = await emails(admin);
  return { id: data.id, name: data.display_name, email: mail.get(data.id) ?? "" };
}

export type ProgressRow = { skillId: string; title: string; area: string; status: SkillStatus | "not_started"; level: Level; steps: number; nextReviewOn: string | null };

export type SessionRow = { id: string; day: string; status: string; block: number; blockTitle: string; answers: number; correct: number };

export async function studentOverview(admin: Admin, studentId: string) {
  const profile = await studentProfile(admin, studentId);
  const today = dayInRome();
  const days = lastDays(today, 30);
  const since = startOfDayInRome(days[0]);

  const [answersResult, eventsResult, sessionsResult, progressResult, templatesResult, titles] = await Promise.all([
    admin.from("practice_answers").select(ANSWER_COLUMNS).eq("user_id", studentId).gte("created_at", since).order("created_at", { ascending: true }).limit(5000),
    admin.from("activity_events").select("type, skill_id, session_id, payload, created_at").eq("user_id", studentId).gte("created_at", since).limit(10000),
    admin.from("study_sessions").select("id, day, status, block").eq("user_id", studentId).gte("day", days[0]).order("day", { ascending: false }),
    admin.from("skill_progress").select("skill_id, status, level, next_review_on").eq("user_id", studentId),
    admin.from("item_templates").select("skill_id").eq("status", "published"),
    skillTitles(admin),
  ]);
  for (const result of [answersResult, eventsResult, sessionsResult, progressResult, templatesResult]) if (result.error) throw new Error(result.error.message);

  const answers = (answersResult.data ?? []).map(toAnswer);
  const events = (eventsResult.data ?? []).map(toEvent);
  const series = dailySeries(days, answers, events);
  const week = periodStats(series.slice(-7), answers);
  const previousWeek = periodStats(series.slice(-14, -7), answers);
  const titleOf = (skillId: string) => titles.get(skillId)?.title ?? skillId;

  const contentSkills = [...new Set((templatesResult.data ?? []).map((row) => row.skill_id))].sort(
    (a, b) => (titles.get(a)?.order ?? 0) - (titles.get(b)?.order ?? 0),
  );
  const progressBySkill = new Map((progressResult.data ?? []).map((row) => [row.skill_id, row]));
  const progress: ProgressRow[] = contentSkills.map((skillId) => {
    const row = progressBySkill.get(skillId);
    const level = row ? levelSchema.parse(row.level) : "base";
    const status = (row?.status as SkillStatus | undefined) ?? "not_started";
    return {
      skillId,
      title: titleOf(skillId),
      area: titles.get(skillId)?.area ?? "",
      status,
      level,
      steps: status === "not_started" ? 0 : stepsClimbed({ status: status as SkillStatus, level, reviewStep: 0, nextReviewOn: null }),
      nextReviewOn: row?.next_review_on ?? null,
    };
  });

  const sessions: SessionRow[] = (sessionsResult.data ?? []).map((session) => {
    const mine = answers.filter((answer) => answer.sessionId === session.id);
    return {
      id: session.id,
      day: session.day,
      status: session.status === "completed" ? "completed" : session.day < today ? "abandoned" : "active",
      block: session.block,
      blockTitle: SESSION_BLOCKS[session.block]?.title ?? "",
      answers: mine.length,
      correct: mine.filter((answer) => answer.score === 1).length,
    };
  });

  const view = await loadAssessment(admin, DIAGNOSTIC_ID);
  const attempt = await loadLatestAttempt(admin, studentId, DIAGNOSTIC_ID, "completed");
  const diagnostic =
    view && attempt
      ? {
          completedAt: attempt.completedAt,
          sections: sectionResults(
            toEngineSections(view),
            { scores: new Map(Object.entries(attempt.scores)), choices: attempt.choices, currentPart: Infinity },
            view.config,
          ).map((result) => ({
            code: result.code,
            title: view.sections.find((section) => section.id === result.sectionId)?.title ?? result.code,
            color: result.color as AreaColor | null,
            ratio: Math.round(result.ratio * 100),
            closedEarly: result.closedEarly,
          })),
        }
      : null;

  return {
    profile,
    today,
    series,
    week,
    previousWeek,
    weak: weakSkills(answers).slice(0, 8).map((row) => ({ ...row, title: titleOf(row.skillId) })),
    errors: errorGroups(answers).slice(0, 10).map((group) => ({ ...group, skills: group.skillIds.map(titleOf) })),
    lessons: lessonStats(events).map((row) => ({ ...row, title: titleOf(row.skillId) })),
    habits: habits(events, answers),
    progress,
    sessions,
    diagnostic,
  };
}

export type TimelineEntry =
  | {
      kind: "answer";
      at: string;
      source: "practice" | "diagnostic";
      skill: string;
      level: Level;
      purpose: string;
      prompt: string;
      given: string[];
      correct: string[];
      score: number;
      message: string | null;
      seconds: number;
      firstInputSeconds: number | null;
      corrections: number;
      feedbackSeconds: number | null;
      solutionOpen: boolean | null;
    }
  | { kind: "event"; at: string; label: string };

const PURPOSE_LABELS: Record<string, string> = {
  practice: "Pratica",
  review: "Ripasso",
  retry: "Errore da rivedere",
  warmup: "Riscaldamento",
  problem: "Problema",
  check: "Verifica",
  diagnostic: "Test iniziale",
};

const LESSON_STEPS = ["Capire", "Ricetta", "Esempio", "Prova tu"];

function eventLabel(event: EventRow, titleOf: (id: string) => string): string | null {
  const minutes = (value: unknown) => Math.round((typeof value === "number" ? value : 0) / 60_000);
  const seconds = (value: unknown) => Math.round((typeof value === "number" ? value : 0) / 1000);
  switch (event.type) {
    case "session_started":
      return "Inizia la sessione di studio";
    case "block_started":
      return `Inizia il blocco: ${SESSION_BLOCKS[Number(event.payload.block)]?.title ?? ""}`;
    case "session_completed":
      return "Sessione completata";
    case "time_up":
      return "Tempo del blocco scaduto";
    case "pause_started":
      return "Inizia la pausa";
    case "pause_ended":
      return `Fine pausa (${minutes(event.payload.ms)} min)`;
    case "away":
      return `Esce dall'app per ${seconds(event.payload.ms) >= 120 ? `${minutes(event.payload.ms)} min` : `${seconds(event.payload.ms)} s`}`;
    case "lesson_opened":
      return `Apre la lezione: ${event.skillId ? titleOf(event.skillId) : ""}`;
    case "lesson_step":
      return `Lezione, passo "${LESSON_STEPS[Number(event.payload.step)] ?? ""}": ${seconds(event.payload.ms)} s`;
    case "lesson_try":
      return `Prova tu: ${event.payload.correct}/${event.payload.total} giuste`;
    case "lesson_completed":
      return `Lezione completata (${minutes(event.payload.ms)} min)`;
    default:
      return null;
  }
}

export async function studentDay(admin: Admin, studentId: string, day: string) {
  const profile = await studentProfile(admin, studentId);
  const from = startOfDayInRome(day);
  const to = startOfDayInRome(addDays(day, 1));
  const [practice, diagnostic, events, templates, titles] = await Promise.all([
    admin.from("practice_answers").select(`${ANSWER_COLUMNS}, source, source_id, seed, content, answer`).eq("user_id", studentId).gte("created_at", from).lt("created_at", to).order("created_at"),
    admin.from("responses").select("item_id, score, error_tag, details, time_ms, created_at, answer, items(skill_id, level, content, item_keys(key))").eq("user_id", studentId).gte("created_at", from).lt("created_at", to).order("created_at"),
    admin.from("activity_events").select("type, skill_id, session_id, payload, created_at").eq("user_id", studentId).gte("created_at", from).lt("created_at", to).order("created_at"),
    admin.from("item_templates").select("id, generator, params"),
    skillTitles(admin),
  ]);
  for (const result of [practice, diagnostic, events, templates]) if (result.error) throw new Error(result.error.message);

  const titleOf = (id: string) => titles.get(id)?.title ?? id;
  const templateById = new Map((templates.data ?? []).map((row) => [row.id, row]));
  const eventRows = (events.data ?? []).map(toEvent);
  const feedbackByAnswer = new Map(
    eventRows.filter((event) => event.type === "feedback_closed").map((event) => [String(event.payload.answerId), event.payload]),
  );

  const itemIds = (practice.data ?? []).filter((row) => row.source === "item").map((row) => row.source_id);
  const itemKeys = itemIds.length > 0 ? await admin.from("item_keys").select("item_id, key").in("item_id", itemIds) : { data: [], error: null };
  if (itemKeys.error) throw new Error(itemKeys.error.message);
  const keyByItem = new Map((itemKeys.data ?? []).map((row) => [row.item_id, row.key]));

  const timeline: TimelineEntry[] = [];
  for (const row of practice.data ?? []) {
    const answer = toAnswer(row);
    const content = itemContentSchema.safeParse(row.content);
    const response = itemResponseSchema.safeParse(row.answer);
    if (!content.success || !response.success) continue;
    let correct: string[] = [];
    if (row.source === "template" && row.seed !== null) {
      const template = templateById.get(row.source_id);
      if (template) correct = describeAnswer(content.data, generateItem(template.generator, template.params, row.seed).key);
    } else {
      const key = itemKeySchema.safeParse(keyByItem.get(row.source_id));
      if (key.success) correct = describeAnswer(content.data, key.data);
    }
    const feedback = feedbackByAnswer.get(row.id);
    timeline.push({
      kind: "answer",
      at: row.created_at,
      source: "practice",
      skill: titleOf(row.skill_id),
      level: levelSchema.parse(row.level),
      purpose: PURPOSE_LABELS[row.purpose] ?? row.purpose,
      prompt: content.data.prompt,
      given: describeResponse(content.data, response.data),
      correct,
      score: row.score,
      message: answer.message,
      seconds: Math.round(row.time_ms / 1000),
      firstInputSeconds: answer.stats?.firstInputMs != null ? Math.round(answer.stats.firstInputMs / 1000) : null,
      corrections: answer.stats?.corrections ?? 0,
      feedbackSeconds: feedback && typeof feedback.ms === "number" ? Math.round(feedback.ms / 1000) : null,
      solutionOpen: feedback ? feedback.solutionOpen === true : null,
    });
  }

  for (const row of diagnostic.data ?? []) {
    const content = itemContentSchema.safeParse(row.items.content);
    const response = itemResponseSchema.safeParse(row.answer);
    const key = itemKeySchema.safeParse(row.items.item_keys?.key);
    if (!content.success || !response.success) continue;
    const details = detailsSchema.safeParse(row.details);
    const stats = details.success ? details.data.stats : null;
    timeline.push({
      kind: "answer",
      at: row.created_at,
      source: "diagnostic",
      skill: titleOf(row.items.skill_id),
      level: levelSchema.parse(row.items.level),
      purpose: PURPOSE_LABELS.diagnostic,
      prompt: content.data.prompt,
      given: describeResponse(content.data, response.data),
      correct: key.success ? describeAnswer(content.data, key.data) : [],
      score: row.score,
      message: details.success ? (details.data.diagnosis?.message ?? null) : null,
      seconds: Math.round(row.time_ms / 1000),
      firstInputSeconds: stats?.firstInputMs != null ? Math.round(stats.firstInputMs / 1000) : null,
      corrections: stats?.corrections ?? 0,
      feedbackSeconds: null,
      solutionOpen: null,
    });
  }

  for (const event of eventRows) {
    if (event.type === "feedback_closed") continue;
    const label = eventLabel(event, titleOf);
    if (label) timeline.push({ kind: "event", at: event.createdAt, label });
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));
  const answers = timeline.filter((entry) => entry.kind === "answer");
  const minutes = dailySeries([day], (practice.data ?? []).map(toAnswer), eventRows)[0]?.minutes ?? 0;
  return {
    profile,
    day,
    timeline,
    summary: {
      answers: answers.length,
      correct: answers.filter((entry) => entry.kind === "answer" && entry.score === 1).length,
      minutes,
    },
  };
}
