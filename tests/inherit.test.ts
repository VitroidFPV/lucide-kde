import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("selects an installed parent by name or menu number and preserves other metadata", () => {
  const home = mkdtempSync(join(tmpdir(), "lucide-kde-inherits-"));
  const icons = join(home, ".local", "share", "icons");
  const systemIcons = join(home, "system", "icons");
  const index = join(icons, "Lucide-KDE", "index.theme");
  const script = join(import.meta.dir, "..", "inherit.sh");
  const bin = join(home, "bin");
  const signalArgs = join(home, "gdbus-args");
  const env = {
    ...process.env, HOME: home, XDG_DATA_HOME: join(home, ".local", "share"),
    XDG_DATA_DIRS: join(home, "system"), PATH: `${bin}:${process.env.PATH}`,
    TEST_GDBUS_ARGS: signalArgs,
  };
  const run = (args: string[], input?: string) => spawnSync("sh", [script, ...args], { env, input, encoding: "utf8" });

  try {
    mkdirSync(bin);
    writeFileSync(join(bin, "gdbus"), '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_GDBUS_ARGS"\n');
    chmodSync(join(bin, "gdbus"), 0o755);
    for (const name of ["Lucide-KDE", "breeze", "Vimix-cursors", ".Lucide-KDE-previous"]) mkdirSync(join(icons, name), { recursive: true });
    mkdirSync(join(systemIcons, "Papirus-Dark"), { recursive: true });
    writeFileSync(index, "[Icon Theme]\nName=Lucide KDE\nInherits=breeze\nDirectories=scalable/actions\n\n[scalable/actions]\nSize=22\n");
    writeFileSync(join(icons, "breeze", "index.theme"), "[Icon Theme]\nName=Breeze\nDirectories=16x16/apps\n");
    writeFileSync(join(icons, "Vimix-cursors", "index.theme"), "[Icon Theme]\nName=Vimix Cursors\nInherits=default\n");
    writeFileSync(join(icons, ".Lucide-KDE-previous", "index.theme"), "[Icon Theme]\nName=Backup\n");
    writeFileSync(join(systemIcons, "Papirus-Dark", "index.theme"), "[Icon Theme]\nName=Papirus Dark\nDirectories=16x16/apps\n");

    expect(run(["Papirus-Dark"]).status).toBe(0);
    expect(readFileSync(index, "utf8")).toContain("Inherits=Papirus-Dark,breeze\nDirectories=scalable/actions");
    expect(readFileSync(signalArgs, "utf8")).toBe("emit\n--session\n--object-path\n/KIconLoader\n--signal\norg.kde.KIconLoader.iconChanged\n4\n");

    const menu = run([], "1\n");
    expect(menu.status).toBe(0);
    expect(menu.stdout).toContain("1) Papirus-Dark");
    expect(menu.stdout).not.toContain("Lucide-KDE-previous");
    expect(menu.stdout).not.toContain("Vimix-cursors");
    expect(readFileSync(index, "utf8")).toContain("Inherits=Papirus-Dark,breeze");

    expect(run(["breeze"]).status).toBe(0);
    expect(readFileSync(index, "utf8")).toContain("Inherits=breeze\nDirectories=scalable/actions");
    expect(run(["missing-theme"]).status).not.toBe(0);
    expect(run(["Vimix-cursors"]).status).not.toBe(0);
    expect(readFileSync(index, "utf8")).toContain("Inherits=breeze\nDirectories=scalable/actions");

    writeFileSync(index, "[Icon Theme]\nName=Lucide KDE\n\n[scalable/actions]\nSize=22\n");
    expect(run(["Papirus-Dark"]).status).toBe(0);
    expect(readFileSync(index, "utf8")).toContain("Inherits=Papirus-Dark,breeze\n[scalable/actions]");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
