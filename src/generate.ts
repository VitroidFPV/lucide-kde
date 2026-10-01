import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lucideDir, readLucide, themedSvg } from "./lucide";
import {
  mappingCategories,
  mappingIcon,
  mappingMirrored,
  mappingRotation,
  mappingScale,
  projectDir,
  readMappings,
} from "./mappings";

const themeDir = join(projectDir, "theme", "Lucide-KDE");
const mappings = Object.entries(await readMappings()).sort(([a], [b]) => a.localeCompare(b));
const categories = [...new Set(mappings.flatMap(([, mapping]) => mappingCategories(mapping)))].sort();
const contexts: Record<string, string> = {
  apps: "Applications",
  applets: "Applications",
  preferences: "Applications",
  mimetypes: "MimeTypes",
};

// Validate and render everything before replacing the generated theme.
const icons = await Promise.all(
  mappings.map(
    async ([kdeName, mapping]) =>
      [
        kdeName,
        mappingCategories(mapping),
        themedSvg(
          await readLucide(mappingIcon(mapping)),
          mappingMirrored(mapping),
          mappingScale(mapping),
          mappingRotation(mapping),
        ),
      ] as const,
  ),
);

const indexTheme = `[Icon Theme]
Name=Lucide KDE
Comment=Selected Lucide icons for KDE Plasma
Inherits=breeze
FollowsColorScheme=true
Directories=${categories.map((category) => `scalable/${category}`).join(",")}

${categories.map((category) => `[scalable/${category}]\nSize=22\nType=Scalable\nMinSize=16\nMaxSize=64\nContext=${contexts[category] || category[0].toUpperCase() + category.slice(1)}\n`).join("\n")}
`;

await rm(themeDir, { recursive: true, force: true });
for (const category of categories) await mkdir(join(themeDir, "scalable", category), { recursive: true });
await writeFile(join(themeDir, "index.theme"), indexTheme);
await copyFile(join(lucideDir, "LICENSE"), join(themeDir, "LICENSE-LUCIDE"));
await copyFile(join(projectDir, "LICENSE"), join(themeDir, "LICENSE-GPL-3.0"));
for (const [kdeName, iconCategories, svg] of icons) {
  for (const category of iconCategories) await writeFile(join(themeDir, "scalable", category, `${kdeName}.svg`), svg);
}

console.log(`Generated ${icons.length} icon(s) in ${themeDir}`);
