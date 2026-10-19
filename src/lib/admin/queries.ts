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

const statsSchema = z.object({
  firstInputMs: z.number().nullable(),
  inputs: z.number(),
  corrections: z.number(),
  unitChanges: z.number(),
  idleCount: z.number().default(0),
  idleMs: z.number().default(0),
  awayCount: z.number().default(0),
  awayMs: z.number().default(0),
});

const diagnosisSchema = z.object({ tag: z.string(), message: z.string().nullable() }).nullable().optional();

const detailsSchema = z
  .object({
    diagnosis: diagnosisSchema,
    stats: statsSchema.nullable().optional(),
    retry: z
      .object({
        response: z.unknown(),
        score: z.number(),
        diagnosis: diagnosisSchema,
        timeMs: z.number(),
        stats: statsSchema.nullable().optional(),
        hintMs: z.number(),
      })
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
  attempts: number;
  final_score: number | null;
  note_ms: number | null;
  note_source: string | null;
};

function toAnswer(row: AnswerDbRow): AnswerRow {
  const details = detailsSchema.safeParse(row.details);
  const retry = details.success ? details.data.retry : undefined;
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
    attempts: row.attempts,
    finalScore: row.final_score ?? row.score,
    retryMs: retry ? Math.max(0, retry.timeMs - (retry.stats?.awayMs ?? 0)) + retry.hintMs : 0,
    noteMs: row.note_ms,
    noteSource: row.note_source,
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

const ANSWER_COLUMNS =
  "id, skill_id, level, purpose, score, error_tag, details, time_ms, created_at, session_id, attempts, final_score, note_ms, note_source";

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
  isSelf: boolean;
};

export async function listStudents(admin: Admin, selfId: string): Promise<StudentSummary[]> {
  const today = dayInRome();
  const since = startOfDayInRome(addDays(today, -6));
  const [profiles, mail] = await Promise.all([
    admin.from("profiles").select("id, display_name, role").order("display_name"),
    emails(admin),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  const students = profiles.data
    .filter((profile) => profile.role !== "admin" || profile.id === selfId)
    .sort((a, b) => Number(b.id === selfId) - Number(a.id === selfId));
  const ids = students.map((student) => student.id);
  if (ids.length === 0) return [];

  const [answers, events, sessions, attempts, latest] = await Promise.all([
    admin.from("practice_answers").select(`user_id, ${ANSWER_COLUMNS}`).in("user_id", ids).gte("created_at", since),
    admin.from("activity_events").select("user_id, type, skill_id, session_id, payload, created_at").in("user_id", ids).gte("created_at", since).in("type", ["feedback_closed", "lesson_step"]),
    admin.from("study_sessions").select("user_id, status, day").in("user_id", ids).gte("day", addDays(today, -6)),
    admin.from("attempts").select("user_id, status, completed_at").in("user_id", ids),
    Promise.all(
      ids.map(async (id) => {
        const [practice, test] = await Promise.all([
          admin.from("practice_answers").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          admin.from("responses").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        const values = [practice.data?.created_at, test.data?.created_at].filter((value): value is string => Boolean(value)).sort();
        return [id, values.at(-1) ?? null] as const;
      }),
    ),
  ]);
  for (const result of [answers, events, sessions, attempts]) if (result.error) throw new Error(result.error.message);
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
      isSelf: student.id === selfId,
    };
  });
}

async function studentProfile(admin: Admin, studentId: string) {
  const [{ data, error }, mail] = await Promise.all([
    admin.from("profiles").select("id, display_name, role").eq("id", studentId).maybeSingle(),
    emails(admin),
  ]);
  if (error) throw new Error(error.message);
  if (!data) notFound();
  return { id: data.id, name: data.display_name, email: mail.get(data.id) ?? "" };
}

export type ProgressRow = { skillId: string; title: string; area: string; status: SkillStatus | "not_started"; level: Level; steps: number; nextReviewOn: string | null };

export type NoteRow = {
  id: string;
  at: string;
  day: string;
  skill: string;
  level: Level;
  purpose: string;
  prompt: string;
  note: string;
  source: string | null;
  seconds: number | null;
  outcome: "first" | "second" | "unsolved";
};

export type SessionRow = { id: string; day: string; status: string; block: number; blockTitle: string; answers: number; correct: number };

export async function studentOverview(admin: Admin, studentId: string) {
  const today = dayInRome();
  const days = lastDays(today, 30);
  const since = startOfDayInRome(days[0]);

  const [profile, view, attempt, answersResult, eventsResult, sessionsResult, progressResult, templatesResult, notesResult, titles] = await Promise.all([
    studentProfile(admin, studentId),
    loadAssessment(admin, DIAGNOSTIC_ID),
    loadLatestAttempt(admin, studentId, DIAGNOSTIC_ID, "completed"),
    admin.from("practice_answers").select(ANSWER_COLUMNS).eq("user_id", studentId).gte("created_at", since).order("created_at", { ascending: true }).limit(5000),
    admin.from("activity_events").select("type, skill_id, session_id, payload, created_at").eq("user_id", studentId).gte("created_at", since).limit(10000),
    admin.from("study_sessions").select("id, day, status, block").eq("user_id", studentId).gte("day", days[0]).order("day", { ascending: false }),
    admin.from("skill_progress").select("skill_id, status, level, next_review_on").eq("user_id", studentId),
    admin.from("item_templates").select("skill_id").eq("status", "published"),
    admin
      .from("practice_answers")
      .select("id, skill_id, level, purpose, score, final_score, attempts, note, note_source, note_ms, content, created_at")
      .eq("user_id", studentId)
      .not("note", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
    skillTitles(admin),
  ]);
  for (const result of [answersResult, eventsResult, sessionsResult, progressResult, templatesResult, notesResult]) if (result.error) throw new Error(result.error.message);

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

  const notes: NoteRow[] = (notesResult.data ?? []).flatMap((row) => {
    const content = itemContentSchema.safeParse(row.content);
    if (!content.success || !row.note) return [];
    const finalScore = row.final_score ?? row.score;
    return [
      {
        id: row.id,
        at: row.created_at,
        day: dayInRome(new Date(row.created_at)),
        skill: titleOf(row.skill_id),
        level: levelSchema.parse(row.level),
        purpose: PURPOSE_LABELS[row.purpose] ?? row.purpose,
        prompt: content.data.prompt,
        note: row.note,
        source: row.note_source,
        seconds: row.note_ms === null ? null : Math.round(row.note_ms / 1000),
        outcome: row.score === 1 ? "first" : finalScore === 1 && row.attempts === 2 ? "second" : "unsolved",
      },
    ];
  });

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
    notes,
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
      finalScore: number;
      message: string | null;
      seconds: number;
      firstInputSeconds: number | null;
      corrections: number;
      idleSeconds: number;
      awaySeconds: number;
      feedbackSeconds: number | null;
      solutionOpen: boolean | null;
      retry: AttemptView | null;
      note: { text: string; source: string | null; seconds: number | null } | null;
    }
  | { kind: "event"; at: string; label: string };

export type AttemptView = {
  given: string[];
  score: number;
  message: string | null;
  seconds: number;
  hintSeconds: number;
  firstInputSeconds: number | null;
  corrections: number;
  idleSeconds: number;
  awaySeconds: number;
};

const toSeconds = (ms: number) => Math.round(ms / 1000);

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
  const from = startOfDayInRome(day);
  const to = startOfDayInRome(addDays(day, 1));
  const [profile, practice, diagnostic, events, templates, titles] = await Promise.all([
    studentProfile(admin, studentId),
    admin.from("practice_answers").select(`${ANSWER_COLUMNS}, source, source_id, seed, content, answer, note`).eq("user_id", studentId).gte("created_at", from).lt("created_at", to).order("created_at"),
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
    const details = detailsSchema.safeParse(row.details);
    const retry = details.success ? details.data.retry : undefined;
    const retryResponse = retry ? itemResponseSchema.safeParse(retry.response) : null;
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
      finalScore: answer.finalScore,
      message: answer.message,
      seconds: Math.round(row.time_ms / 1000),
      firstInputSeconds: answer.stats?.firstInputMs != null ? Math.round(answer.stats.firstInputMs / 1000) : null,
      corrections: answer.stats?.corrections ?? 0,
      idleSeconds: toSeconds(answer.stats?.idleMs ?? 0),
      awaySeconds: toSeconds(answer.stats?.awayMs ?? 0),
      feedbackSeconds: feedback && typeof feedback.ms === "number" ? Math.round(feedback.ms / 1000) : null,
      solutionOpen: feedback ? feedback.solutionOpen === true : null,
      retry:
        retry && retryResponse?.success
          ? {
              given: describeResponse(content.data, retryResponse.data),
              score: retry.score,
              message: retry.diagnosis?.message ?? null,
              seconds: toSeconds(retry.timeMs),
              hintSeconds: toSeconds(retry.hintMs),
              firstInputSeconds: retry.stats?.firstInputMs != null ? toSeconds(retry.stats.firstInputMs) : null,
              corrections: retry.stats?.corrections ?? 0,
              idleSeconds: toSeconds(retry.stats?.idleMs ?? 0),
              awaySeconds: toSeconds(retry.stats?.awayMs ?? 0),
            }
          : null,
      note: row.note ? { text: row.note, source: row.note_source, seconds: row.note_ms === null ? null : toSeconds(row.note_ms) } : null,
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
      finalScore: row.score,
      message: details.success ? (details.data.diagnosis?.message ?? null) : null,
      seconds: Math.round(row.time_ms / 1000),
      firstInputSeconds: stats?.firstInputMs != null ? Math.round(stats.firstInputMs / 1000) : null,
      corrections: stats?.corrections ?? 0,
      idleSeconds: toSeconds(stats?.idleMs ?? 0),
      awaySeconds: toSeconds(stats?.awayMs ?? 0),
      feedbackSeconds: null,
      solutionOpen: null,
      retry: null,
      note: null,
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
      recovered: answers.filter((entry) => entry.kind === "answer" && entry.score < 1 && entry.retry?.score === 1).length,
      minutes,
    },
  };
}
