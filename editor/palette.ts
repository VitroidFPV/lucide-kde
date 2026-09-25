import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type Colors = { window: string; windowText: string; view: string; viewText: string; button: string; buttonText: string; selection: string; selectionText: string; tooltip: string; tooltipText: string };
export const samples: Record<string, Colors> = {
  light: { window: "#eff0f1", windowText: "#232629", view: "#fcfcfc", viewText: "#232629", button: "#eff0f1", buttonText: "#232629", selection: "#3daee9", selectionText: "#ffffff", tooltip: "#fcfcfc", tooltipText: "#232629" },
  dark: { window: "#31363b", windowText: "#eff0f1", view: "#232629", viewText: "#eff0f1", button: "#31363b", buttonText: "#eff0f1", selection: "#3daee9", selectionText: "#eff0f1", tooltip: "#31363b", tooltipText: "#eff0f1" },
};

export async function activePalette(): Promise<Colors> {
  const path = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "kdeglobals");
  let content = "";
  try { content = await readFile(path, "utf8"); } catch { /* use sample */ }
  const entries = new Map<string, string>();
  let section = "";
  for (const line of content.split(/\r?\n/)) {
    const header = line.match(/^\[([^\]]+)\]/);
    if (header) { section = header[1]; continue; }
    const pair = line.match(/^([^=]+)=(.*)$/);
    if (pair) entries.set(`${section}/${pair[1]}`, pair[2]);
  }
  const get = (group: string, key: string, fallback: string) => {
    const value = entries.get(`Colors:${group}/${key}`) || "";
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(value)) {
      const values = value.split(",").map(Number);
      if (values.every((v) => v <= 255)) return `#${values.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    }
    return fallback;
  };
  const fallback = samples.light;
  return {
    window: get("Window", "BackgroundNormal", fallback.window), windowText: get("Window", "ForegroundNormal", fallback.windowText),
    view: get("View", "BackgroundNormal", fallback.view), viewText: get("View", "ForegroundNormal", fallback.viewText),
    button: get("Button", "BackgroundNormal", fallback.button), buttonText: get("Button", "ForegroundNormal", fallback.buttonText),
    selection: get("Selection", "BackgroundNormal", fallback.selection), selectionText: get("Selection", "ForegroundNormal", fallback.selectionText),
    tooltip: get("Tooltip", "BackgroundNormal", fallback.tooltip), tooltipText: get("Tooltip", "ForegroundNormal", fallback.tooltipText),
  };
}
