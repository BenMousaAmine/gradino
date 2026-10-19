import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { mergePacks, packSchema, validatePack, type Pack } from "./pack";

export type LoadedPacks = { pack: Pack; errors: string[]; files: string[] };

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(fullPath);
      return entry.name.endsWith(".json") ? [fullPath] : [];
    }),
  );
  return nested.flat().sort();
}

export async function loadPacks(directory: string): Promise<LoadedPacks> {
  const files = await listJsonFiles(directory);
  const errors: string[] = [];
  const packs: Pack[] = [];

  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(file, "utf8"));
    const parsed = packSchema.safeParse(raw);
    if (parsed.success) {
      packs.push(parsed.data);
    } else {
      for (const issue of parsed.error.issues) {
        errors.push(`${path.relative(directory, file)} ${issue.path.join(".")}: ${issue.message}`);
      }
    }
  }

  const pack = mergePacks(packs);
  if (errors.length === 0) errors.push(...validatePack(pack));
  return { pack, errors, files };
}
