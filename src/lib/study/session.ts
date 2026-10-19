import "server-only";
import { randomInt } from "node:crypto";
import { lessonSchema } from "@/lib/lessons/schema";
import type { Level } from "@/lib/items/schemas";
import { logEvent } from "@/lib/tracking/server";
import { itemExercise, templateExercise, type Admin } from "./exercises";
import { isReviewDue, LEVELS, REVIEW_LEVELS, REVIEW_SIZE } from "./mastery";
import { CHECK_SIZE, SESSION_BLOCKS } from "./plan";
import type { StudyContext } from "./progress";
import type { BlockState, PublicExercise, SessionSummary, SessionView, StudyStep } from "./types";

export type SessionRow = {
  id: string;
  block: number;
  block_started_at: string;
  status: string;
  created_at: string;
};

type TodayAnswer = {
  skill_id: string;
  purpose: string;
  score: number;
  session_id: string | null;
  source: string;
  source_id: string;
};

const SESSION_COLUMNS = "id, block, block_started_at, status, created_at";
const TIMES_TABLES = "math.calc.times-tables";

export async function findSession(admin: Admin, userId: string, day: string): Promise<SessionRow | null> {
  const { data, error } = await admin.from("study_sessions").select(SESSION_COLUMNS).eq("user_id", userId).eq("day", day).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getOrCreateSession(
  admin: Admin,
  userId: string,
  day: string,
  found?: SessionRow | null,
): Promise<SessionRow> {
  const existing = found === undefined ? await findSession(admin, userId, day) : found;
  if (existing) return existing;
  const created = await admin
    .from("study_sessions")
    .upsert({ user_id: userId, day }, { onConflict: "user_id,day", ignoreDuplicates: true })
    .select(SESSION_COLUMNS);
  if (created.error) throw new Error(created.error.message);
  if (created.data[0]) {
    await logEvent(admin, userId, "session_started", { sessionId: created.data[0].id, payload: { block: 0 } });
    return created.data[0];
  }
  const again = await admin.from("study_sessions").select(SESSION_COLUMNS).eq("user_id", userId).eq("day", day).single();
  if (again.error) throw new Error(again.error.message);
  return again.data;
}

export function blockState(session: SessionRow): BlockState {
  const index = Math.min(session.block, SESSION_BLOCKS.length - 1);
  const definition = SESSION_BLOCKS[index];
  return {
    index,
    id: definition.id,
    title: definition.title,
    minutes: definition.minutes,
    pauseMinutes: definition.pauseMinutes,
    startedAt: session.block_started_at,
  };
}

export async function todayAnswers(admin: Admin, userId: string, startIso: string): Promise<TodayAnswer[]> {
  const { data, error } = await admin
    .from("practice_answers")
    .select("skill_id, purpose, score, session_id, source, source_id")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);
  return data;
}

function skillOf(context: StudyContext, skillId: string) {
  const skill = context.skills.get(skillId);
  return { id: skillId, title: skill?.title ?? skillId };
}

function practiceLevel(context: StudyContext, skillId: string): Level {
  const progress = context.progress.get(skillId);
  return progress && progress.status === "learning" ? progress.level : "advanced";
}

async function reviewExercise(admin: Admin, context: StudyContext, answers: TodayAnswer[]): Promise<PublicExercise | null> {
  for (const skillId of context.path) {
    const progress = context.progress.get(skillId);
    if (!progress || !isReviewDue(progress, context.today)) continue;
    const done = answers.filter((answer) => answer.skill_id === skillId && answer.purpose === "review").length;
    if (done >= REVIEW_SIZE) continue;
    return templateExercise(admin, skillOf(context, skillId), REVIEW_LEVELS[done], "review");
  }
  return null;
}

async function retryExercise(admin: Admin, context: StudyContext): Promise<PublicExercise | null> {
  const since = new Date(Date.parse(context.startIso) - 14 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("practice_answers")
    .select("skill_id, level, source, source_id, score, created_at")
    .eq("user_id", context.userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);

  const latest = new Map<string, (typeof data)[number]>();
  for (const answer of data) latest.set(`${answer.source}:${answer.source_id}`, answer);
  const candidate = [...latest.values()].find(
    (answer) => answer.score < 1 && answer.created_at < context.startIso && context.skills.has(answer.skill_id),
  );
  if (!candidate) return null;

  const skill = skillOf(context, candidate.skill_id);
  if (candidate.source === "item") return itemExercise(admin, candidate.source_id, skill.title, "retry");
  return templateExercise(admin, skill, candidate.level as Level, "retry", candidate.source_id);
}

async function mixedExercise(admin: Admin, context: StudyContext, purpose: "warmup" | "problem" | "check") {
  const known = context.path.filter((id) => context.progress.get(id)?.status !== "learning");
  const pool = context.skills.has(TIMES_TABLES) ? [TIMES_TABLES, ...known] : known;
  const skillId = pool.length > 0 ? pool[randomInt(0, pool.length)] : (context.current ?? context.path[0]);
  return templateExercise(admin, skillOf(context, skillId), practiceLevel(context, skillId), purpose);
}

async function lessonOrPractice(admin: Admin, context: StudyContext): Promise<StudyStep | null> {
  if (!context.current) return null;
  const progress = context.progress.get(context.current);
  const skill = skillOf(context, context.current);
  if (progress && !progress.lessonDoneAt) {
    const lesson = await admin.from("lessons").select("content").eq("skill_id", context.current).maybeSingle();
    if (lesson.error) throw new Error(lesson.error.message);
    if (lesson.data) {
      return { kind: "lesson", skillId: skill.id, skillTitle: skill.title, lesson: lessonSchema.parse(lesson.data.content) };
    }
  }
  const exercise = await templateExercise(admin, skill, practiceLevel(context, skill.id), "practice");
  return exercise ? { kind: "exercise", exercise } : null;
}

async function problemExercise(admin: Admin, context: StudyContext, answers: TodayAnswer[]) {
  const currentIndex = context.current ? context.path.indexOf(context.current) : context.path.length - 1;
  const allowed = context.path.slice(0, currentIndex + 1);
  const [problems, solved] = await Promise.all([
    admin.from("items").select("id, skill_id, level").eq("kind", "problem").eq("status", "published").in("skill_id", allowed),
    admin.from("practice_answers").select("source_id").eq("user_id", context.userId).eq("source", "item").eq("score", 1),
  ]);
  if (problems.error) throw new Error(problems.error.message);
  if (solved.error) throw new Error(solved.error.message);

  const done = new Set([
    ...solved.data.map((row) => row.source_id),
    ...answers.filter((answer) => answer.source === "item").map((answer) => answer.source_id),
  ]);
  const candidates = problems.data
    .filter((problem) => {
      if (done.has(problem.id)) return false;
      if (problem.skill_id !== context.current) return true;
      return LEVELS.indexOf(problem.level as Level) <= LEVELS.indexOf(practiceLevel(context, problem.skill_id));
    })
    .sort(
      (a, b) =>
        context.path.indexOf(a.skill_id) - context.path.indexOf(b.skill_id) ||
        LEVELS.indexOf(a.level as Level) - LEVELS.indexOf(b.level as Level),
    );
  if (candidates[0]) return itemExercise(admin, candidates[0].id, skillOf(context, candidates[0].skill_id).title, "problem");
  if (context.current) {
    return templateExercise(admin, skillOf(context, context.current), practiceLevel(context, context.current), "problem");
  }
  return mixedExercise(admin, context, "problem");
}

async function checkExercise(admin: Admin, context: StudyContext, answers: TodayAnswer[], done: number) {
  const practiced = context.path.filter((id) =>
    answers.some((answer) => answer.skill_id === id && answer.purpose !== "check"),
  );
  const pool = practiced.length > 0 ? practiced : [context.current ?? context.path[0]];
  const skillId = pool[done % pool.length];
  const level = context.progress.get(skillId)?.status === "learning" ? practiceLevel(context, skillId) : "medium";
  return templateExercise(admin, skillOf(context, skillId), level, "check");
}

async function completeSession(admin: Admin, userId: string, sessionId: string) {
  const [{ error }] = await Promise.all([
    admin.from("study_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId),
    logEvent(admin, userId, "session_completed", { sessionId }),
  ]);
  if (error) throw new Error(error.message);
}

function summarize(context: StudyContext, session: SessionRow, answers: TodayAnswer[]): SessionSummary {
  const mine = answers.filter((answer) => answer.session_id === session.id);
  const skills = [...new Set(mine.map((answer) => answer.skill_id))].map((id) => skillOf(context, id).title);
  return {
    answers: mine.length,
    correct: mine.filter((answer) => answer.score === 1).length,
    minutes: Math.max(1, Math.round((Date.now() - Date.parse(session.created_at)) / 60_000)),
    skills,
  };
}

export async function sessionView(
  admin: Admin,
  context: StudyContext,
  session: SessionRow,
  preloaded?: TodayAnswer[],
): Promise<SessionView> {
  const block = blockState(session);
  const answers = preloaded ?? (await todayAnswers(admin, context.userId, context.startIso));
  const view = (step: StudyStep): SessionView => ({ sessionId: session.id, block, step, serverTime: Date.now() });
  const exerciseStep = (exercise: PublicExercise | null): StudyStep | null =>
    exercise ? { kind: "exercise", exercise } : null;

  if (session.status === "completed") return view({ kind: "done", summary: summarize(context, session, answers) });

  let step: StudyStep | null = null;
  if (block.id === "warmup") {
    const [review, retry] = await Promise.all([reviewExercise(admin, context, answers), retryExercise(admin, context)]);
    step = exerciseStep(review) ?? exerciseStep(retry) ?? exerciseStep(await mixedExercise(admin, context, "warmup"));
  } else if (block.id === "new" || block.id === "practice") {
    step = (await lessonOrPractice(admin, context)) ?? exerciseStep(await mixedExercise(admin, context, "warmup"));
  } else if (block.id === "problems") {
    step = exerciseStep(await problemExercise(admin, context, answers));
  } else {
    const done = answers.filter((answer) => answer.purpose === "check" && answer.session_id === session.id).length;
    if (done >= CHECK_SIZE) {
      await completeSession(admin, context.userId, session.id);
      return view({ kind: "done", summary: summarize(context, session, answers) });
    }
    step = exerciseStep(await checkExercise(admin, context, answers, done));
  }

  if (!step) throw new Error("No exercise available");
  return view(step);
}

export async function advanceBlock(admin: Admin, userId: string, session: SessionRow): Promise<SessionRow> {
  if (session.status === "completed") return session;
  if (session.block >= SESSION_BLOCKS.length - 1) {
    await completeSession(admin, userId, session.id);
    return { ...session, status: "completed" };
  }
  const next = { block: session.block + 1, block_started_at: new Date().toISOString() };
  const [{ error }] = await Promise.all([
    admin.from("study_sessions").update(next).eq("id", session.id),
    logEvent(admin, userId, "block_started", { sessionId: session.id, payload: { block: next.block } }),
  ]);
  if (error) throw new Error(error.message);
  return { ...session, ...next };
}
