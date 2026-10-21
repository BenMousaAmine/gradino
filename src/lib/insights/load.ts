import "server-only";
import type { AnswerRow, EventRow } from "@/lib/admin/metrics";
import { ANSWER_COLUMNS, byCreatedAt, RESPONSE_COLUMNS, responseToAnswer, toAnswer } from "@/lib/admin/queries";
import { addDays, dayInRome, startOfDayInRome } from "@/lib/study/dates";
import type { Admin } from "@/lib/study/exercises";
import { subjectOfSkill, type SubjectId } from "@/lib/subjects";
import { computeSignals, type Signals } from "./engine";
import { activeTricks, trickProgress, type TrickProgress } from "./tricks";

const SIGNAL_DAYS = 14;
const TRICK_DAYS = 30;

const sinceDays = (days: number) => startOfDayInRome(addDays(dayInRome(), 1 - days));

async function recentAnswers(admin: Admin, userId: string, days: number, subject?: SubjectId): Promise<AnswerRow[]> {
  const since = sinceDays(days);
  const [practice, responses] = await Promise.all([
    admin.from("practice_answers").select(ANSWER_COLUMNS).eq("user_id", userId).gte("created_at", since).limit(3000),
    admin.from("responses").select(RESPONSE_COLUMNS).eq("user_id", userId).gte("created_at", since).limit(3000),
  ]);
  if (practice.error) throw new Error(practice.error.message);
  if (responses.error) throw new Error(responses.error.message);
  return [...practice.data.map(toAnswer), ...responses.data.map(responseToAnswer)]
    .filter((answer) => !subject || subjectOfSkill(answer.skillId) === subject)
    .sort(byCreatedAt);
}

export async function loadSignals(admin: Admin, userId: string, subject?: SubjectId, days = SIGNAL_DAYS): Promise<Signals> {
  return computeSignals(await recentAnswers(admin, userId, days, subject));
}

export async function loadCoach(
  admin: Admin,
  userId: string,
  subject?: SubjectId,
): Promise<{ signals: Signals; tricks: string[] }> {
  const answers = await recentAnswers(admin, userId, TRICK_DAYS, subject);
  const since = sinceDays(SIGNAL_DAYS);
  return {
    signals: computeSignals(answers.filter((answer) => answer.createdAt >= since)),
    tricks: activeTricks(answers),
  };
}

export async function loadTrickProgress(admin: Admin, userId: string, days = 60): Promise<TrickProgress[]> {
  const [answers, events] = await Promise.all([
    recentAnswers(admin, userId, days),
    admin
      .from("activity_events")
      .select("type, skill_id, session_id, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "coach")
      .gte("created_at", sinceDays(days))
      .limit(5000),
  ]);
  if (events.error) throw new Error(events.error.message);
  const rows: EventRow[] = events.data.map((row) => ({
    type: row.type,
    skillId: row.skill_id,
    sessionId: row.session_id,
    payload: row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {},
    createdAt: row.created_at,
  }));
  return trickProgress(answers, rows);
}
