import { execFileSync } from "node:child_process";
import { copyFile, cp, mkdir, readdir, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { lucideDir, readLucide, themedSvg } from "../src/lucide";
import {
  type IconCategory,
  iconCategories,
  mappingCategories,
  mappingPath,
  mappingScale,
  projectDir,
  readMappings,
  saveMappings,
  validKdeName,
  validLucideName,
} from "../src/mappings";
import { bestAsset, discoverThemes, effectiveIcons, type IconEntry, sortedEntries } from "./catalog";
import { activePalette, samples } from "./palette";

const editorBuildDir = join(import.meta.dir, "..", "dist", "editor");
const archivePath = join(projectDir, "dist", "Lucide-KDE.tar.gz");
const installedDir = join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "icons", "Lucide-KDE");
let themes = await discoverThemes();
const iconCache = new Map<string, Map<string, IconEntry>>();
const tags = JSON.parse(await readFile(join(lucideDir, "tags.json"), "utf8")) as Record<string, string[]>;
const lucideIcons = (await readdir(join(lucideDir, "icons")))
  .filter((file) => file.endsWith(".svg"))
  .map((file) => {
    const name = file.slice(0, -4);
    return { name, tags: tags[name] || [] };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
let busy = false;
const port = Number(process.env.PORT) || 3000;

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}
function errorResponse(error: unknown, status = 400): Response {
  return json({ error: error instanceof Error ? error.message : String(error) }, status);
}
function safeName(value: string | null, kind: "kde" | "lucide"): string {
  if (!value || !(kind === "kde" ? validKdeName : validLucideName).test(value)) throw new Error("Invalid icon name");
  return value;
}
function paletteColor(name: string, active: Awaited<ReturnType<typeof activePalette>>): string {
  return (name === "light" ? samples.light : name === "dark" ? samples.dark : active).viewText;
}
function recolorSvg(svg: string, color: string): string {
  const style = `<style id="current-color-scheme" type="text/css">.ColorScheme-Text { color: ${color}; } .ColorScheme-NegativeText { color: ${color}; } .ColorScheme-NeutralText { color: ${color}; } .ColorScheme-PositiveText { color: ${color}; }</style>`;
  if (/<style\b[^>]*id="current-color-scheme"[^>]*>[\s\S]*?<\/style>/i.test(svg)) {
    return svg.replace(/<style\b[^>]*id="current-color-scheme"[^>]*>[\s\S]*?<\/style>/i, style);
  }
  return svg.replace(/<svg\b[^>]*>/i, (opening) => opening.replace(/>$/, ` style="color:${color}">${style}`));
}
async function catalog(theme: string): Promise<Map<string, IconEntry>> {
  if (!themes.has(theme)) throw new Error("Unknown icon theme");
  let icons = iconCache.get(theme);
  if (!icons) {
    icons = await effectiveIcons(theme, themes);
    iconCache.set(theme, icons);
  }
  return icons;
}
async function buildStatus(): Promise<boolean> {
  try {
    const [mapping, archive] = await Promise.all([stat(mappingPath), stat(archivePath)]);
    return mapping.mtimeMs > archive.mtimeMs;
  } catch {
    return true;
  }
}
function run(command: string): void {
  execFileSync("bun", ["run", command], { cwd: projectDir, stdio: "pipe" });
}
async function applyTheme(): Promise<void> {
  run("build");
  const generatedDir = join(projectDir, "theme", "Lucide-KDE");
  const parent = join(installedDir, "..");
  await mkdir(parent, { recursive: true });
  let exists = false;
  try {
    const target = await stat(installedDir);
    if (!target.isDirectory()) throw new Error("Installed theme path is not a directory");
    const index = await readFile(join(installedDir, "index.theme"), "utf8");
    if (!index.includes("Name=Lucide KDE") || !index.includes("Directories=scalable/")) {
      throw new Error("Installed Lucide-KDE directory does not match this project");
    }
    if ((await realpath(installedDir)) !== resolve(installedDir)) throw new Error("Installed theme is a symlink");
    exists = true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      /* new install */
    } else throw error;
  }
  const stage = join(parent, `.Lucide-KDE-stage-${process.pid}`);
  const backup = join(parent, `.Lucide-KDE-backup-${Date.now()}`);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  for (const file of ["index.theme", "LICENSE-LUCIDE", "LICENSE-GPL-3.0"])
    await copyFile(join(generatedDir, file), join(stage, file));
  await cp(join(generatedDir, "scalable"), join(stage, "scalable"), { recursive: true });
  if (exists) await rename(installedDir, backup);
  try {
    await rename(stage, installedDir);
  } catch (error) {
    if (exists) await rename(backup, installedDir);
    throw error;
  }
  // Keep one recoverable copy of the previously installed theme under the user's icon directory.
  if (exists) {
    const previous = join(parent, ".Lucide-KDE-previous");
    await rm(previous, { recursive: true, force: true });
    await rename(backup, previous);
  }
  themes = await discoverThemes();
  iconCache.clear();
  try {
    execFileSync(
      "gdbus",
      ["emit", "--session", "--object-path", "/KIconLoader", "--signal", "org.kde.KIconLoader.iconChanged", "4"],
      { stdio: "pipe" },
    );
  } catch {
    /* Plasma may refresh on its own or after the icon is requested again. */
  }
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const host = request.headers.get("host") || "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return new Response("Forbidden", { status: 403 });
    const origin = request.headers.get("origin");
    const allowedOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
    if (port === 3001) allowedOrigins.push("http://127.0.0.1:3000", "http://localhost:3000");
    if (origin && !allowedOrigins.includes(origin)) return new Response("Forbidden", { status: 403 });
    try {
      if (
        request.method === "GET" &&
        (url.pathname === "/" ||
          url.pathname === "/favicon.svg" ||
          /^\/assets\/[\w.-]+\.(js|css|svg)$/.test(url.pathname))
      ) {
        const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
        const file = Bun.file(join(editorBuildDir, path));
        if (!(await file.exists()))
          return new Response("Editor assets are missing; run bun run editor:build", { status: 404 });
        const type = path.endsWith(".css")
          ? "text/css"
          : path.endsWith(".js")
            ? "text/javascript"
            : path.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html";
        return new Response(file, {
          headers: {
            "Content-Type": `${type}; charset=utf-8`,
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'",
            "Cache-Control": "no-store",
          },
        });
      }
      if (request.method === "GET" && url.pathname === "/api/state") {
        const choices = [...themes.values()]
          .filter((theme) => theme.locations.some((location) => location.directories.length))
          .map(({ id, label }) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        return json({
          themes: choices,
          defaultTheme: themes.has("breeze") ? "breeze" : choices[0]?.id,
          mappings: await readMappings(),
          palette: await activePalette(),
          needsBuild: await buildStatus(),
          archivePath,
        });
      }
      if (request.method === "GET" && url.pathname === "/api/lucide") return json(lucideIcons);
      if (request.method === "GET" && url.pathname === "/api/icons")
        return json(sortedEntries(await catalog(url.searchParams.get("theme") || "")));
      if (request.method === "GET" && url.pathname === "/api/source") {
        const theme = url.searchParams.get("theme") || "";
        const name = safeName(url.searchParams.get("name"), "kde");
        const size = Number(url.searchParams.get("size")) || 22;
        const entry = (await catalog(theme)).get(name);
        if (!entry) return new Response("Not found", { status: 404 });
        const asset = bestAsset(entry, [16, 22, 24].includes(size) ? size : 22);
        const bytes = await readFile(asset.path);
        if (asset.type === "png")
          return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
        const source = asset.type === "svgz" ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
        const color = paletteColor(url.searchParams.get("palette") || "current", await activePalette());
        return new Response(recolorSvg(source, color), {
          headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "GET" && url.pathname === "/api/candidate") {
        const name = safeName(url.searchParams.get("name"), "lucide");
        const color = paletteColor(url.searchParams.get("palette") || "current", await activePalette());
        const mirror = url.searchParams.get("mirror") === "1";
        const scale = Number(url.searchParams.get("scale") || 1);
        const rotate = Number(url.searchParams.get("rotate") || 0);
        return new Response(recolorSvg(themedSvg(await readLucide(name), mirror, scale, rotate), color), {
          headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "GET" && url.pathname === "/download") {
        if (await buildStatus()) return errorResponse(new Error("Build the archive first"), 409);
        return new Response(Bun.file(archivePath), {
          headers: {
            "Content-Type": "application/gzip",
            "Content-Disposition": "attachment; filename=Lucide-KDE.tar.gz",
          },
        });
      }
      if (request.method === "POST" && url.pathname === "/api/mapping") {
        if (busy) return errorResponse(new Error("Another operation is running"), 409);
        const body: unknown = await request.json();
        if (!body || typeof body !== "object") throw new Error("Invalid mapping request");
        const { kdeName, lucideName, mirror, rotate, categories } = body as Record<string, unknown>;
        if (typeof kdeName !== "string" || !validKdeName.test(kdeName)) throw new Error("Invalid KDE icon name");
        if (lucideName !== null && (typeof lucideName !== "string" || !validLucideName.test(lucideName)))
          throw new Error("Invalid Lucide icon name");
        if (mirror !== undefined && typeof mirror !== "boolean") throw new Error("Invalid mirror option");
        if (
          rotate !== undefined &&
          (typeof rotate !== "number" || !Number.isInteger(rotate / 22.5) || rotate < 0 || rotate >= 360)
        )
          throw new Error("Invalid rotation option");
        if (
          categories !== undefined &&
          (!Array.isArray(categories) ||
            !categories.length ||
            new Set(categories).size !== categories.length ||
            !categories.every((category) => iconCategories.includes(category)))
        )
          throw new Error("Invalid icon categories");
        if (lucideName !== null) await readLucide(lucideName as string);
        busy = true;
        try {
          const mappings = await readMappings();
          if (lucideName === null) delete mappings[kdeName];
          else {
            const scale = mappings[kdeName] ? mappingScale(mappings[kdeName]) : 1;
            const assignedCategories =
              (categories as IconCategory[] | undefined) ??
              (mappings[kdeName] ? mappingCategories(mappings[kdeName]) : ["status"]);
            mappings[kdeName] =
              mirror || scale !== 1 || rotate || assignedCategories.length !== 1 || assignedCategories[0] !== "status"
                ? {
                    icon: lucideName as string,
                    ...(mirror ? { mirror: true as const } : {}),
                    ...(scale !== 1 ? { scale } : {}),
                    ...(rotate ? { rotate: rotate as number } : {}),
                    ...(assignedCategories.length !== 1 || assignedCategories[0] !== "status"
                      ? { categories: assignedCategories }
                      : {}),
                  }
                : (lucideName as string);
          }
          await saveMappings(mappings);
          return json({ mappings, needsBuild: true });
        } finally {
          busy = false;
        }
      }
      if (request.method === "POST" && ["/api/build", "/api/apply"].includes(url.pathname)) {
        if (busy) return errorResponse(new Error("Another operation is running"), 409);
        busy = true;
        try {
          if (url.pathname === "/api/build") run("pack");
          else await applyTheme();
          return json({
            archivePath,
            installedDir,
            needsBuild: url.pathname === "/api/apply" ? await buildStatus() : false,
            applied: url.pathname === "/api/apply",
          });
        } finally {
          busy = false;
        }
      }
      return new Response("Not found", { status: 404 });
    } catch (error) {
      return errorResponse(error);
    }
  },
});
console.log(`Lucide KDE editor: http://127.0.0.1:${server.port}`);
