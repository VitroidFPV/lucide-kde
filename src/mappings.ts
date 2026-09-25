import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const projectDir = resolve(import.meta.dir, "..");
export const mappingPath = join(projectDir, "mappings.json");
export const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const validLucideName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export type Mapping = string | { icon: string; mirror?: true; scale?: number };
export type Mappings = Record<string, Mapping>;

export function mappingIcon(mapping: Mapping): string {
  return typeof mapping === "string" ? mapping : mapping.icon;
}

export function mappingMirrored(mapping: Mapping): boolean {
  return typeof mapping !== "string" && mapping.mirror === true;
}

export function mappingScale(mapping: Mapping): number {
  return typeof mapping === "string" ? 1 : mapping.scale ?? 1;
}

function validMapping(value: unknown): value is Mapping {
  if (typeof value === "string") return validLucideName.test(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = Object.keys(value);
  return fields.every((field) => ["icon", "mirror", "scale"].includes(field))
    && "icon" in value && typeof value.icon === "string" && validLucideName.test(value.icon)
    && (!("mirror" in value) || value.mirror === true)
    && (!("scale" in value) || (typeof value.scale === "number" && Number.isFinite(value.scale) && value.scale > 0 && value.scale <= 1));
}

export function validateMappings(value: unknown): Mappings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("mappings.json must contain an object of KDE names to Lucide names");
  }
  const mappings: Mappings = {};
  for (const [kdeName, mapping] of Object.entries(value)) {
    if (!validKdeName.test(kdeName) || !validMapping(mapping)) {
      throw new Error(`Invalid mapping: ${JSON.stringify(kdeName)} → ${JSON.stringify(mapping)}`);
    }
    mappings[kdeName] = mapping;
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
