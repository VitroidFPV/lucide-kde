import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const projectDir = resolve(import.meta.dir, "..");
export const mappingPath = join(projectDir, "mappings.json");
export const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const validLucideName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export type Mappings = Record<string, string>;

export function validateMappings(value: unknown): Mappings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("mappings.json must contain an object of KDE names to Lucide names");
  }
  const mappings: Mappings = {};
  for (const [kdeName, lucideName] of Object.entries(value)) {
    if (!validKdeName.test(kdeName) || typeof lucideName !== "string" || !validLucideName.test(lucideName)) {
      throw new Error(`Invalid mapping: ${JSON.stringify(kdeName)} → ${JSON.stringify(lucideName)}`);
    }
    mappings[kdeName] = lucideName;
  }
  return mappings;
}

export async function readMappings(): Promise<Mappings> {
  return validateMappings(JSON.parse(await readFile(mappingPath, "utf8")));
}

export async function saveMappings(value: Mappings): Promise<void> {
  const mappings = validateMappings(value);
  const sorted = Object.fromEntries(Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b)));
  const temp = join(dirname(mappingPath), `.mappings-${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(sorted, null, 2) + "\n");
    await rename(temp, mappingPath);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}
