import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const projectDir = resolve(import.meta.dir, "..");
export const mappingPath = join(projectDir, "mappings.json");
export const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const validLucideName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const validLocalName = validLucideName;
export const validSourceName = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|local:[a-z0-9]+(?:-[a-z0-9]+)*)$/;
export const iconCategories = [
  "actions",
  "animations",
  "apps",
  "applets",
  "categories",
  "devices",
  "emblems",
  "emotes",
  "mimetypes",
  "places",
  "preferences",
  "status",
  "other",
] as const;
export type IconCategory = (typeof iconCategories)[number];
export type Mapping =
  | string
  | { icon: string; mirror?: true; scale?: number; rotate?: number; categories?: IconCategory[] };
export type Mappings = Record<string, Mapping>;

export function mappingIcon(mapping: Mapping): string {
  return typeof mapping === "string" ? mapping : mapping.icon;
}

export function mappingMirrored(mapping: Mapping): boolean {
  return typeof mapping !== "string" && mapping.mirror === true;
}

export function mappingScale(mapping: Mapping): number {
  return typeof mapping === "string" ? 1 : (mapping.scale ?? 1);
}

export function mappingRotation(mapping: Mapping): number {
  return typeof mapping === "string" ? 0 : (mapping.rotate ?? 0);
}

export function mappingCategories(mapping: Mapping): IconCategory[] {
  return typeof mapping === "string" ? ["status"] : (mapping.categories ?? ["status"]);
}

function validMapping(value: unknown): value is Mapping {
  if (typeof value === "string") return validSourceName.test(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = Object.keys(value);
  return (
    fields.every((field) => ["icon", "mirror", "scale", "rotate", "categories"].includes(field)) &&
    "icon" in value &&
    typeof value.icon === "string" &&
    validSourceName.test(value.icon) &&
    (!("mirror" in value) || value.mirror === true) &&
    (!("scale" in value) ||
      (typeof value.scale === "number" && Number.isFinite(value.scale) && value.scale > 0 && value.scale <= 1)) &&
    (!("rotate" in value) ||
      (typeof value.rotate === "number" &&
        Number.isInteger(value.rotate / 22.5) &&
        value.rotate >= 0 &&
        value.rotate < 360)) &&
    (!("categories" in value) ||
      (Array.isArray(value.categories) &&
        value.categories.length > 0 &&
        new Set(value.categories).size === value.categories.length &&
        value.categories.every((category) => iconCategories.includes(category))))
  );
}

export function validateMappings(value: unknown): Mappings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("mappings.json must contain an object of KDE names to source names");
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
    await writeFile(temp, `${JSON.stringify(sorted, null, 2)}\n`);
    await rename(temp, mappingPath);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}
