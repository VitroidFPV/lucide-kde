import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { validKdeName } from "../src/mappings";

type Section = Record<string, string>;
type Ini = Record<string, Section>;
export type Asset = { path: string; type: "svg" | "svgz" | "png"; size: number; scale: number; source: string; category: string };
export type IconEntry = { name: string; source: string; categories: string[]; assets: Asset[] };
type ThemeLocation = { root: string; sections: Ini; directories: string[] };
export type Theme = { id: string; label: string; inherits: string[]; locations: ThemeLocation[] };

function parseIni(source: string): Ini {
  const result: Ini = {};
  let current: Section | undefined;
  for (const line of source.split(/\r?\n/)) {
    const section = line.match(/^\[([^\]]+)\]\s*$/);
    if (section) { current = result[section[1]] = {}; continue; }
    const pair = line.match(/^([^=]+)=(.*)$/);
    if (current && pair) current[pair[1].trim()] = pair[2].trim();
  }
  return result;
}

function themeRoots(): string[] {
  const home = homedir();
  const dataHome = process.env.XDG_DATA_HOME || join(home, ".local", "share");
  const dataDirs = (process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":").filter(Boolean);
  return [join(dataHome, "icons"), join(home, ".icons"), ...dataDirs.map((dir) => join(dir, "icons"))];
}

export async function discoverThemes(): Promise<Map<string, Theme>> {
  const themes = new Map<string, Theme>();
  for (const base of themeRoots()) {
    let entries;
    try { entries = await readdir(base, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const id = entry.name;
      const root = join(base, id);
      let sections: Ini;
      try { sections = parseIni(await readFile(join(root, "index.theme"), "utf8")); } catch { continue; }
      const head = sections["Icon Theme"];
      if (!head) continue;
      const directories = (head.Directories || "").split(",").map((dir) => dir.trim()).filter((dir) => sections[dir]);
      const inherited = (head.Inherits || "").split(",").map((name) => name.trim()).filter(Boolean);
      const theme = themes.get(id);
      if (theme) {
        theme.locations.push({ root, sections, directories });
        for (const parent of inherited) if (!theme.inherits.includes(parent)) theme.inherits.push(parent);
      } else {
        themes.set(id, { id, label: head.Name || id, inherits: inherited, locations: [{ root, sections, directories }] });
      }
    }
  }
  return themes;
}

async function localIcons(theme: Theme): Promise<Map<string, Asset[]>> {
  const icons = new Map<string, Asset[]>();
  for (const location of theme.locations) {
    const local = new Map<string, Asset[]>();
    const root = await realpath(location.root);
    for (const dir of location.directories) {
      const section = location.sections[dir];
      const category = (dir.split("/").find((part) => /^(actions|animations|apps|applets|categories|devices|emblems|emotes|mimetypes|places|preferences|status)$/i.test(part)) || section.Context || "other").toLowerCase();
      const size = Number(section.Size) || Number(dir.match(/\d+/)?.[0]) || 22;
      const scale = Number(section.Scale) || Number(dir.match(/@([23])x?\//)?.[1]) || 1;
      let files;
      try { files = await readdir(join(location.root, dir)); } catch { continue; }
      for (const filename of files) {
        const match = filename.match(/^(.+)\.(svg|svgz|png)$/i);
        if (!match || !validKdeName.test(match[1])) continue;
        const path = join(location.root, dir, filename);
        let actual: string;
        try { actual = await realpath(path); if (!(await stat(actual)).isFile()) continue; } catch { continue; }
        if (!actual.startsWith(root + sep)) continue;
        const name = match[1];
        const assets = local.get(name) || [];
        assets.push({ path: actual, type: match[2].toLowerCase() as Asset["type"], size, scale, source: theme.id, category });
        local.set(name, assets);
      }
    }
    for (const [name, assets] of local) if (!icons.has(name)) icons.set(name, assets);
  }
  return icons;
}

export async function effectiveIcons(id: string, themes: Map<string, Theme>): Promise<Map<string, IconEntry>> {
  if (!themes.has(id)) throw new Error("Unknown icon theme");
  const result = new Map<string, IconEntry>();
  const visited = new Set<string>();
  async function visit(name: string): Promise<void> {
    if (visited.has(name)) return;
    visited.add(name);
    const theme = themes.get(name);
    if (!theme) return;
    for (const [iconName, assets] of await localIcons(theme)) {
      if (!result.has(iconName)) result.set(iconName, { name: iconName, source: name, categories: [...new Set(assets.map((asset) => asset.category))], assets });
    }
    for (const parent of theme.inherits) await visit(parent);
  }
  await visit(id);
  await visit("hicolor");
  return result;
}

export function bestAsset(entry: IconEntry, size: number): Asset {
  return [...entry.assets].sort((a, b) => {
    const distance = (asset: Asset) => Math.abs(asset.size * asset.scale - size);
    return distance(a) - distance(b) || (a.type === "svg" ? -1 : b.type === "svg" ? 1 : 0);
  })[0];
}

export function sortedEntries(icons: Map<string, IconEntry>): Array<{ name: string; source: string; categories: string[] }> {
  const base = (name: string) => name.replace(/-(symbolic|rtl)$/, "");
  return [...icons.values()].sort((a, b) => base(a.name).localeCompare(base(b.name)) || a.name.localeCompare(b.name))
    .map(({ name, source, categories }) => ({ name, source, categories }));
}
