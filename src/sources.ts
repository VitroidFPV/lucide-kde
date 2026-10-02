import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readLucide } from "./lucide";
import { projectDir, validLocalName, validSourceName } from "./mappings";
import { themedSvg, validateSvg } from "./svg";

export const localDir = join(projectDir, "icons", "local");

export async function readSource(name: string): Promise<string> {
  if (!validSourceName.test(name)) throw new Error("Invalid icon source name");
  if (!name.startsWith("local:")) return readLucide(name);
  const path = join(localDir, `${name.slice(6)}.svg`);
  try {
    if (!(await lstat(path)).isFile()) throw new Error("Not a regular file");
    const source = await readFile(path, "utf8");
    validateSvg(source);
    return source;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw new Error(`Local icon does not exist: ${name}`);
    throw error;
  }
}

export async function renderSource(name: string, mirror = false, scale = 1, rotate = 0): Promise<string> {
  return themedSvg(await readSource(name), mirror, scale, rotate, !name.startsWith("local:"));
}

export async function listLocalSources(): Promise<string[]> {
  try {
    const files = (await readdir(localDir)).filter(
      (file) => file.endsWith(".svg") && validLocalName.test(file.slice(0, -4)),
    );
    const regular = await Promise.all(
      files.map(async (file) => ((await lstat(join(localDir, file))).isFile() ? file : "")),
    );
    return regular
      .filter(Boolean)
      .map((file) => `local:${file.slice(0, -4)}`)
      .sort();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
