"use client";

import { createContext, use, type ReactNode } from "react";
import type { CoachFlags } from "@/lib/insights/tips";

const CoachContext = createContext<CoachFlags>({ skips: false, hesitation: false });

export function CoachProvider({ flags, children }: { flags: CoachFlags; children: ReactNode }) {
  return <CoachContext value={flags}>{children}</CoachContext>;
}

export function useCoach(): CoachFlags {
  return use(CoachContext);
}
