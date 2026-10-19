import path from "node:path";
import { loadPacks } from "../src/lib/content/load-packs";
import { createAdminClient } from "./supabase-admin";

type Result = { error: { message: string } | null };

function check(label: string, result: Result) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
}

async function main() {
  const directory = path.resolve(process.cwd(), "content");
  const { pack, errors, files } = await loadPacks(directory);

  if (errors.length > 0) {
    console.error(`Content is not valid (${errors.length} problems):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  check(
    "subjects",
    await supabase
      .from("subjects")
      .upsert(pack.subjects.map((subject, position) => ({ id: subject.id, title: subject.title, position }))),
  );

  check(
    "areas",
    await supabase.from("areas").upsert(
      pack.areas.map((area, position) => ({
        id: area.id,
        subject_id: area.subjectId,
        title: area.title,
        position,
      })),
    ),
  );

  check(
    "skills",
    await supabase.from("skills").upsert(
      pack.skills.map((skill, position) => ({
        id: skill.id,
        area_id: skill.areaId,
        title: skill.title,
        school_year: skill.schoolYear,
        position,
      })),
    ),
  );

  const skillIds = pack.skills.map((skill) => skill.id);
  if (skillIds.length > 0) {
    check("skill_prerequisites cleanup", await supabase.from("skill_prerequisites").delete().in("skill_id", skillIds));
    const prerequisites = pack.skills.flatMap((skill) =>
      skill.prerequisites.map((prerequisite) => ({ skill_id: skill.id, prerequisite_id: prerequisite })),
    );
    if (prerequisites.length > 0) {
      check("skill_prerequisites", await supabase.from("skill_prerequisites").insert(prerequisites));
    }
  }

  check(
    "items",
    await supabase.from("items").upsert(
      pack.items.map((item) => ({
        id: item.id,
        skill_id: item.skillId,
        type: item.content.type,
        level: item.level,
        content: item.content,
        status: item.status,
        updated_at: now,
      })),
    ),
  );

  check("item_keys", await supabase.from("item_keys").upsert(pack.items.map((item) => ({ item_id: item.id, key: item.key }))));

  for (const assessment of pack.assessments) {
    check(
      `assessment ${assessment.id}`,
      await supabase.from("assessments").upsert({
        id: assessment.id,
        subject_id: assessment.subjectId,
        kind: assessment.kind,
        title: assessment.title,
        description: assessment.description,
        config: assessment.config,
      }),
    );

    check(
      `sections of ${assessment.id}`,
      await supabase.from("assessment_sections").upsert(
        assessment.sections.map((section, position) => ({
          id: section.id,
          assessment_id: assessment.id,
          area_id: section.areaId,
          code: section.code,
          title: section.title,
          part: section.part,
          position,
          optional_question: section.optionalQuestion,
        })),
      ),
    );

    const sectionIds = assessment.sections.map((section) => section.id);
    check(
      `items cleanup of ${assessment.id}`,
      await supabase.from("assessment_items").delete().in("section_id", sectionIds),
    );
    check(
      `items of ${assessment.id}`,
      await supabase.from("assessment_items").insert(
        assessment.sections.flatMap((section) =>
          section.itemIds.map((itemId, position) => ({ section_id: section.id, item_id: itemId, position })),
        ),
      ),
    );
  }

  console.log(
    `Imported ${files.length} files: ${pack.subjects.length} subjects, ${pack.areas.length} areas, ` +
      `${pack.skills.length} skills, ${pack.items.length} items, ${pack.assessments.length} assessments.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
