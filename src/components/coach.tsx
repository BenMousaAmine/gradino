"use client";

import { createContext, use, type ReactNode } from "react";
import type { CoachFlags } from "@/lib/insights/tips";

const CoachContext = createContext<CoachFlags>({ skips: false, hesitation: false });
const TricksContext = createContext<readonly string[]>([]);

export function CoachProvider({
  flags,
  tricks = [],
  children,
}: {
  flags: CoachFlags;
  tricks?: readonly string[];
  children: ReactNode;
}) {
  return (
    <CoachContext value={flags}>
      <TricksContext value={tricks}>{children}</TricksContext>
    </CoachContext>
  );
}

export function useCoach(): CoachFlags {
  return use(CoachContext);
}

export function useTricks(): readonly string[] {
  return use(TricksContext);
}
