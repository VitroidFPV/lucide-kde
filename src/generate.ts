import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const projectDir = resolve(import.meta.dir, "..");
const themeDir = join(projectDir, "theme", "Lucide-KDE");
const iconDir = join(themeDir, "scalable", "status");
const require = createRequire(import.meta.url);
const lucideDir = dirname(require.resolve("lucide-static/package.json"));
const validName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function themedSvg(source: string): string {
  const openingTag = source.match(/<svg\b[^>]*>/)?.[0];
  if (!openingTag || !source.includes("</svg>")) {
    throw new Error("Lucide asset is not an SVG document");
  }

  const paintAttributes = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]
    .map((name) => {
      const attribute = openingTag.match(new RegExp(`\\s${name}="[^"]*"`))?.[0];
      if (!attribute) {
        throw new Error(`Lucide asset is missing ${name}`);
      }
      return attribute.trim();
    })
    .join(" ");
  const colorStyle = `
  <style id="current-color-scheme" type="text/css">
    .ColorScheme-Text { color: #232629; }
  </style>
  <g class="ColorScheme-Text" ${paintAttributes}>`;

  return source
    .replace(openingTag, openingTag + colorStyle)
    .replace(/<\/svg>\s*$/, "  </g>\n</svg>\n");
}

const rawMappings: unknown = JSON.parse(
  await readFile(join(projectDir, "mappings.json"), "utf8"),
);
if (
  !rawMappings ||
  typeof rawMappings !== "object" ||
  Array.isArray(rawMappings)
) {
  throw new Error("mappings.json must contain an object of KDE names to Lucide names");
}

const mappings = Object.entries(rawMappings).sort(([a], [b]) => a.localeCompare(b));
if (mappings.length === 0) {
  throw new Error("mappings.json must contain at least one icon");
}

// Validate and render everything before replacing the generated theme.
const icons = await Promise.all(
  mappings.map(async ([kdeName, lucideName]) => {
    if (!validName.test(kdeName) || typeof lucideName !== "string" || !validName.test(lucideName)) {
      throw new Error(`Invalid mapping: ${JSON.stringify(kdeName)} → ${JSON.stringify(lucideName)}`);
    }
    const asset = join(lucideDir, "icons", `${lucideName}.svg`);
    let source: string;
    try {
      source = await readFile(asset, "utf8");
    } catch {
      throw new Error(`Lucide icon does not exist: ${lucideName}`);
    }
    return [kdeName, themedSvg(source)] as const;
  }),
);

const indexTheme = `[Icon Theme]
Name=Lucide KDE
Comment=Selected Lucide icons for KDE Plasma
Inherits=breeze
FollowsColorScheme=true
Directories=scalable/status

[scalable/status]
Size=22
Type=Scalable
MinSize=16
MaxSize=64
Context=Status
`;

await rm(themeDir, { recursive: true, force: true });
await mkdir(iconDir, { recursive: true });
await writeFile(join(themeDir, "index.theme"), indexTheme);
await copyFile(join(lucideDir, "LICENSE"), join(themeDir, "LICENSE-LUCIDE"));
await copyFile(join(projectDir, "LICENSE"), join(themeDir, "LICENSE-GPL-3.0"));
for (const [kdeName, svg] of icons) {
  await writeFile(join(iconDir, `${kdeName}.svg`), svg);
}

console.log(`Generated ${icons.length} icon(s) in ${themeDir}`);
