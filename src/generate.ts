import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lucideDir, readLucide, themedSvg } from "./lucide";
import { mappingIcon, mappingMirrored, mappingScale, projectDir, readMappings } from "./mappings";

const themeDir = join(projectDir, "theme", "Lucide-KDE");
const iconDir = join(themeDir, "scalable", "status");
const mappings = Object.entries(await readMappings()).sort(([a], [b]) => a.localeCompare(b));

// Validate and render everything before replacing the generated theme.
const icons = await Promise.all(
  mappings.map(async ([kdeName, mapping]) => [kdeName, themedSvg(await readLucide(mappingIcon(mapping)), mappingMirrored(mapping), mappingScale(mapping))] as const),
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
for (const [kdeName, svg] of icons) await writeFile(join(iconDir, `${kdeName}.svg`), svg);

console.log(`Generated ${icons.length} icon(s) in ${themeDir}`);
