import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { validLucideName } from "./mappings";

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

export function themedSvg(source: string, mirror = false): string {
  const openingTag = source.match(/<svg\b[^>]*>/)?.[0];
  if (!openingTag || !source.includes("</svg>")) throw new Error("Lucide asset is not an SVG document");
  const viewBox = openingTag.match(/\sviewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number);
  let transform = "";
  if (mirror) {
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0) {
      throw new Error("Lucide asset needs a valid viewBox to mirror");
    }
    transform = ` transform="translate(${2 * viewBox[0] + viewBox[2]} 0) scale(-1 1)"`;
  }
  const paintAttributes = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]
    .map((name) => {
      const attribute = openingTag.match(new RegExp(`\\s${name}="[^"]*"`))?.[0];
      if (!attribute) throw new Error(`Lucide asset is missing ${name}`);
      return attribute.trim();
    })
    .join(" ");
  return source
    .replace(openingTag, openingTag + `\n  <style id="current-color-scheme" type="text/css">\n    .ColorScheme-Text { color: #232629; }\n  </style>\n  <g class="ColorScheme-Text" ${paintAttributes}${transform}>`)
    .replace(/<\/svg>\s*$/, "  </g>\n</svg>\n");
}
