import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { validLucideName } from "./mappings";
import { themedSvg as renderSvg } from "./svg";

export function themedSvg(source: string, mirror = false, scale = 1, rotate = 0): string {
  return renderSvg(source, mirror, scale, rotate, true);
}

const require = createRequire(import.meta.url);
export const lucideDir = dirname(require.resolve("lucide-static/package.json"));

export async function readLucide(name: string): Promise<string> {
  if (!validLucideName.test(name)) throw new Error("Invalid Lucide icon name");
  try {
    return await readFile(join(lucideDir, "icons", `${name}.svg`), "utf8");
  } catch {
    throw new Error(`Lucide icon does not exist: ${name}`);
  }
}
