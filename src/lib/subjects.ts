import { z } from "zod";
import { DIAGNOSTIC_ID } from "@/lib/app";
import type { BlockId } from "@/lib/study/types";

export const subjectIdSchema = z.enum(["math", "english"]);
export type SubjectId = z.infer<typeof subjectIdSchema>;

export type SessionBlock = { id: BlockId; title: string; minutes: number; pauseMinutes: number; description: string };

export type Subject = {
  id: SubjectId;
  title: string;
  diagnosticId: string | null;
  blocks: readonly SessionBlock[];
  checkSize: number;
  sessionSummary: string;
};

export const SUBJECTS: Record<SubjectId, Subject> = {
  math: {
    id: "math",
    title: "Matematica",
    diagnosticId: DIAGNOSTIC_ID,
    checkSize: 6,
    sessionSummary: "Circa 2 ore in 5 blocchi, con le pause: ripasso, argomento nuovo, pratica, problemi e verifica.",
    blocks: [
      { id: "warmup", title: "Riscaldamento", minutes: 15, pauseMinutes: 5, description: "Ripasso e calcolo veloce" },
      { id: "new", title: "Argomento nuovo", minutes: 25, pauseMinutes: 5, description: "Lezione e primi esercizi" },
      { id: "practice", title: "Pratica", minutes: 25, pauseMinutes: 5, description: "Esercizi per salire di gradino" },
      { id: "problems", title: "Problemi", minutes: 25, pauseMinutes: 5, description: "Problemi con il metodo dei 6 passi" },
      { id: "check", title: "Verifica del giorno", minutes: 10, pauseMinutes: 0, description: "Esercizi misti su quello che hai fatto oggi" },
    ],
  },
  english: {
    id: "english",
    title: "Inglese",
    diagnosticId: "english.diagnostic.v1",
    checkSize: 5,
    sessionSummary: "Circa 45 minuti in 3 blocchi: ripasso, lezione con il trucco del giorno e verifica.",
    blocks: [
      { id: "warmup", title: "Ripasso", minutes: 10, pauseMinutes: 2, description: "Parole e verbi già visti" },
      { id: "new", title: "Lezione e pratica", minutes: 25, pauseMinutes: 2, description: "Il trucco del giorno e gli esercizi" },
      { id: "check", title: "Verifica del giorno", minutes: 10, pauseMinutes: 0, description: "Esercizi misti su quello che hai fatto oggi" },
    ],
  },
};

export const SUBJECT_IDS = subjectIdSchema.options;

export function parseSubject(value: unknown): SubjectId {
  const parsed = subjectIdSchema.safeParse(value);
  return parsed.success ? parsed.data : "math";
}

export function subjectOfSkill(skillId: string): SubjectId {
  return SUBJECT_IDS.find((id) => skillId.startsWith(`${id}.`)) ?? "math";
}
