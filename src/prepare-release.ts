import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectDir } from "./mappings";

const version = process.argv[2];
if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error("Usage: bun run release:prepare <major.minor.patch>");
}

const packagePath = join(projectDir, "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = version;
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Prepared v${version}; run bun install --lockfile-only next.`);
