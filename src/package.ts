import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectDir = resolve(import.meta.dir, "..");
const archiveDir = join(projectDir, "dist");
const archivePath = join(archiveDir, "Lucide-KDE.tar.gz");

execFileSync("bun", ["run", "build"], { cwd: projectDir, stdio: "inherit" });
await mkdir(archiveDir, { recursive: true });
execFileSync(
  "tar",
  [
    "--sort=name",
    "--mtime=@0",
    "--owner=0",
    "--group=0",
    "--numeric-owner",
    "--format=ustar",
    "--use-compress-program=gzip -n",
    "-cf",
    archivePath,
    "-C",
    join(projectDir, "theme"),
    "Lucide-KDE",
  ],
  { cwd: projectDir, stdio: "inherit" },
);

console.log(`Created ${archivePath}`);
