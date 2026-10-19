import type { AssessmentConfig, EngineSection, SectionChoices } from "@/lib/diagnostic/engine";
import type { ItemContent, Level } from "@/lib/items/schemas";

export type PublicItem = { id: string; level: Level; content: ItemContent };

export type AssessmentSection = {
  id: string;
  code: string;
  title: string;
  part: number;
  optionalQuestion: string | null;
  items: PublicItem[];
};

export type AssessmentView = {
  id: string;
  title: string;
  description: string;
  config: AssessmentConfig;
  sections: AssessmentSection[];
};

export type AttemptState = {
  id: string;
  status: "in_progress" | "completed";
  currentPart: number;
  choices: SectionChoices;
  scores: Record<string, number>;
  completedAt: string | null;
};

export function toEngineSections(view: AssessmentView): EngineSection[] {
  return view.sections.map((section) => ({
    id: section.id,
    code: section.code,
    part: section.part,
    optional: section.optionalQuestion !== null,
    items: section.items.map((item) => ({ id: item.id, level: item.level })),
  }));
}
