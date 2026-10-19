import type { BlockId } from "./types";

export const SESSION_BLOCKS: ReadonlyArray<{
  id: BlockId;
  title: string;
  minutes: number;
  pauseMinutes: number;
  description: string;
}> = [
  { id: "warmup", title: "Riscaldamento", minutes: 15, pauseMinutes: 5, description: "Ripasso e calcolo veloce" },
  { id: "new", title: "Argomento nuovo", minutes: 25, pauseMinutes: 5, description: "Lezione e primi esercizi" },
  { id: "practice", title: "Pratica", minutes: 25, pauseMinutes: 5, description: "Esercizi per salire di gradino" },
  { id: "problems", title: "Problemi", minutes: 25, pauseMinutes: 5, description: "Problemi con il metodo dei 6 passi" },
  { id: "check", title: "Verifica del giorno", minutes: 10, pauseMinutes: 0, description: "Esercizi misti su quello che hai fatto oggi" },
];

export const CHECK_SIZE = 6;

export const LEVEL_LABELS = {
  base: "Gradino 1 · base",
  medium: "Gradino 2 · medio",
  advanced: "Gradino 3 · avanzato",
} as const;
