import "server-only";
import { levelSchema, type Level } from "@/lib/items/schemas";
import { SUBJECTS, type SubjectId } from "@/lib/subjects";
import { dayInRome, startOfDayInRome } from "./dates";
import type { Admin } from "./exercises";
import {
  afterPractice,
  afterReview,
  isReviewDue,
  REVIEW_SIZE,
  stepsClimbed,
  type Progress,
  type ProgressEvent,
  type SkillStatus,
} from "./mastery";
import { currentSkill, initialProgress, needsWork, orderPath, type DiagnosticItem } from "./path";
import type { ExercisePurpose, PathEntry } from "./types";

export type SkillInfo = { id: string; title: string; areaTitle: string; order: number };
export type ProgressState = Progress & { lessonDoneAt: string | null };

export type StudyContext = {
  userId: string;
  subject: SubjectId;
  today: string;
  startIso: string;
  skills: Map<string, SkillInfo>;
  path: string[];
  progress: Map<string, ProgressState>;
  current: string | null;
};

const STATUSES: readonly SkillStatus[] = ["learning", "review", "mastered"];

function toProgress(row: {
  status: string;
  level: string;
  review_step: number;
  next_review_on: string | null;
  lesson_done_at: string | null;
}): ProgressState {
  return {
    status: STATUSES.includes(row.status as SkillStatus) ? (row.status as SkillStatus) : "learning",
    level: levelSchema.parse(row.level),
    reviewStep: row.review_step,
    nextReviewOn: row.next_review_on,
    lessonDoneAt: row.lesson_done_at,
  };
}

async function loadDiagnostic(admin: Admin, userId: string, diagnosticId: string): Promise<DiagnosticItem[] | null> {
  const [attempt, items] = await Promise.all([
    admin
      .from("attempts")
      .select("id, responses(item_id, score)")
      .eq("user_id", userId)
      .eq("assessment_id", diagnosticId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("assessment_items")
      .select("item_id, items(skill_id), assessment_sections!inner(assessment_id)")
      .eq("assessment_sections.assessment_id", diagnosticId),
  ]);
  if (attempt.error) throw new Error(attempt.error.message);
  if (items.error) throw new Error(items.error.message);
  if (!attempt.data) return null;

  const scores = new Map(attempt.data.responses.map((row) => [row.item_id, row.score]));
  return items.data.map((row) => ({ skillId: row.items.skill_id, score: scores.get(row.item_id) ?? null }));
}

export async function loadStudyContext(admin: Admin, userId: string, subject: SubjectId): Promise<StudyContext | null> {
  const today = dayInRome();
  const { diagnosticId } = SUBJECTS[subject];
  const [skillsResult, prerequisitesResult, progressResult] = await Promise.all([
    admin
      .from("skills")
      .select("id, title, position, areas!inner(title, position, subject_id), item_templates!inner(id)")
      .eq("areas.subject_id", subject)
      .eq("item_templates.status", "published"),
    admin.from("skill_prerequisites").select("skill_id, prerequisite_id"),
    admin
      .from("skill_progress")
      .select("skill_id, status, level, review_step, next_review_on, lesson_done_at")
      .eq("user_id", userId),
  ]);
  if (skillsResult.error) throw new Error(skillsResult.error.message);
  if (prerequisitesResult.error) throw new Error(prerequisitesResult.error.message);
  if (progressResult.error) throw new Error(progressResult.error.message);
  const skillIds = skillsResult.data.map((row) => row.id);

  const skills = new Map<string, SkillInfo>(
    skillsResult.data.map((row) => [
      row.id,
      { id: row.id, title: row.title, areaTitle: row.areas.title, order: row.areas.position * 1000 + row.position },
    ]),
  );
  const progress = new Map(progressResult.data.map((row) => [row.skill_id, toProgress(row)]));

  const missing = skillIds.filter((id) => !progress.has(id));
  if (missing.length > 0) {
    const diagnostic = diagnosticId ? await loadDiagnostic(admin, userId, diagnosticId) : [];
    if (!diagnostic) return null;
    const rows = missing.map((skillId) => {
      const initial = initialProgress(needsWork(skillId, diagnostic), today);
      progress.set(skillId, { ...initial, lessonDoneAt: null });
      return {
        user_id: userId,
        skill_id: skillId,
        status: initial.status,
        level: initial.level,
        review_step: initial.reviewStep,
        next_review_on: initial.nextReviewOn,
      };
    });
    const insert = await admin.from("skill_progress").upsert(rows, { onConflict: "user_id,skill_id", ignoreDuplicates: true });
    if (insert.error) throw new Error(insert.error.message);
  }

  const path = orderPath(
    [...skills.values()].map((skill) => ({
      id: skill.id,
      order: skill.order,
      prerequisites: prerequisitesResult.data.filter((row) => row.skill_id === skill.id).map((row) => row.prerequisite_id),
    })),
  );

  return {
    userId,
    subject,
    today,
    startIso: startOfDayInRome(today),
    skills,
    path,
    progress,
    current: currentSkill(path, progress),
  };
}

export function pathEntries(context: StudyContext): PathEntry[] {
  return context.path.flatMap((id) => {
    const skill = context.skills.get(id);
    const progress = context.progress.get(id);
    if (!skill || !progress) return [];
    return [
      {
        id,
        title: skill.title,
        areaTitle: skill.areaTitle,
        status: progress.status,
        level: progress.level,
        steps: stepsClimbed(progress),
        nextReviewOn: progress.nextReviewOn,
        current: context.current === id,
      },
    ];
  });
}

async function saveProgress(admin: Admin, userId: string, skillId: string, progress: Progress) {
  const { error } = await admin
    .from("skill_progress")
    .update({
      status: progress.status,
      level: progress.level,
      review_step: progress.reviewStep,
      next_review_on: progress.nextReviewOn,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("skill_id", skillId);
  if (error) throw new Error(error.message);
}

export type ProgressInput = { progress: ProgressState; previous: { id: string; score: number }[] };

export async function loadProgressInput(
  admin: Admin,
  userId: string,
  skillId: string,
  level: Level,
  purpose: ExercisePurpose,
): Promise<ProgressInput | null> {
  if (purpose !== "practice" && purpose !== "review") return null;
  const answers = admin
    .from("practice_answers")
    .select("id, score")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .eq("purpose", purpose);
  const [row, previous] = await Promise.all([
    admin
      .from("skill_progress")
      .select("status, level, review_step, next_review_on, lesson_done_at")
      .eq("user_id", userId)
      .eq("skill_id", skillId)
      .maybeSingle(),
    purpose === "practice"
      ? answers.eq("level", level).order("created_at", { ascending: false }).limit(10)
      : answers.gte("created_at", startOfDayInRome(dayInRome())).order("created_at", { ascending: true }),
  ]);
  if (row.error) throw new Error(row.error.message);
  if (previous.error) throw new Error(previous.error.message);
  if (!row.data) return null;
  return { progress: toProgress(row.data), previous: purpose === "practice" ? previous.data.reverse() : previous.data };
}

export async function applyAnswer(
  admin: Admin,
  userId: string,
  skillId: string,
  level: Level,
  purpose: ExercisePurpose,
  input: ProgressInput | null,
  answer: { id: string; score: number },
): Promise<ProgressEvent | null> {
  if (!input) return null;
  const today = dayInRome();
  const { progress } = input;
  const previous = input.previous.filter((row) => row.id !== answer.id).map((row) => row.score);

  if (purpose === "practice") {
    if (progress.status !== "learning" || progress.level !== level) return null;
    const result = afterPractice(progress, [...previous.slice(-9), answer.score], today);
    if (!result.event) return null;
    await saveProgress(admin, userId, skillId, result.progress);
    return result.event;
  }

  if (!isReviewDue(progress, today)) return null;
  const scores = [...previous, answer.score];
  if (scores.length < REVIEW_SIZE) return null;
  const result = afterReview(progress, scores.slice(-REVIEW_SIZE), today);
  await saveProgress(admin, userId, skillId, result.progress);
  return result.event;
}

export async function markLessonDone(admin: Admin, userId: string, skillId: string) {
  const { error } = await admin
    .from("skill_progress")
    .update({ lesson_done_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .is("lesson_done_at", null);
  if (error) throw new Error(error.message);
}
