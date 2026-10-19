import { addDays } from "./dates";
import { NEW_PROGRESS, type Progress } from "./mastery";

export type PathSkill = { id: string; order: number; prerequisites: readonly string[] };

export type DiagnosticItem = { skillId: string; score: number | null };

export function needsWork(skillId: string, diagnostic: readonly DiagnosticItem[]): boolean {
  const items = diagnostic.filter((item) => item.skillId === skillId);
  if (items.length === 0) return true;
  return items.some((item) => item.score !== 1);
}

export function initialProgress(needs: boolean, today: string): Progress {
  if (needs) return NEW_PROGRESS;
  return { status: "mastered", level: "advanced", reviewStep: 2, nextReviewOn: addDays(today, 7) };
}

export function orderPath(skills: readonly PathSkill[]): string[] {
  const ids = new Set(skills.map((skill) => skill.id));
  const remaining = new Map(
    skills.map((skill) => [skill.id, new Set(skill.prerequisites.filter((id) => ids.has(id) && id !== skill.id))]),
  );
  const byOrder = [...skills].sort((a, b) => a.order - b.order);
  const ordered: string[] = [];
  while (ordered.length < skills.length) {
    const next =
      byOrder.find((skill) => !ordered.includes(skill.id) && remaining.get(skill.id)?.size === 0) ??
      byOrder.find((skill) => !ordered.includes(skill.id));
    if (!next) break;
    ordered.push(next.id);
    for (const prerequisites of remaining.values()) prerequisites.delete(next.id);
  }
  return ordered;
}

export function currentSkill(path: readonly string[], progress: ReadonlyMap<string, Progress>): string | null {
  return path.find((id) => progress.get(id)?.status === "learning") ?? null;
}
