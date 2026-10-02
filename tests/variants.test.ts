import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readLucide } from "../src/lucide";
import { validateMappings } from "../src/mappings";
import { localDir, readSource } from "../src/sources";
import { themedSvg, validateSvg } from "../src/svg";

describe("local SVG variants", () => {
  test("accepts reusable local mappings and rejects traversal", () => {
    expect(
      validateMappings({
        one: "volume-2",
        two: "local:volume-2-danger",
        three: { icon: "local:volume-2-danger", mirror: true, rotate: 22.5 },
      }).two,
    ).toBe("local:volume-2-danger");
    expect(() => validateMappings({ one: "local:../outside" })).toThrow();
  });

  test("resolves a local source without changing Lucide", async () => {
    const name = `test-variant-${process.pid}`;
    const path = join(localDir, `${name}.svg`);
    await mkdir(localDir, { recursive: true });
    try {
      await writeFile(
        path,
        `<svg xmlns="http://www.w3.org/2000/svg"><path class="ColorScheme-NegativeText" d="M0 0"/></svg>`,
      );
      const local = await readSource(`local:${name}`);
      const lucide = await readLucide("volume-2");
      expect(local).toContain("ColorScheme-NegativeText");
      expect(lucide).not.toContain("ColorScheme-NegativeText");
    } finally {
      await rm(path, { force: true });
    }
    await expect(readSource("local:../outside")).rejects.toThrow();
  });

  test("keeps per-shape roles and authored paint through transforms", () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" opacity=".5"><defs><linearGradient id="g"/></defs><path class="ColorScheme-NegativeText" stroke="currentColor" d="M0 0"/><circle fill="#123456" cx="8" cy="8" r="2"/></svg>`;
    const output = themedSvg(source, true, 0.75, 22.5);
    expect(output).toContain("ColorScheme-NegativeText");
    expect(output).toContain('fill="#123456"');
    expect(output).toContain('opacity=".5"');
    expect(output).toContain("<defs>");
    expect(output).toContain("rotate(22.5 12 12)");
    expect(output).toContain("scale(-1 1)");
    const copiedLucide = source.replace("<svg ", '<svg class="lucide lucide-copy" ');
    expect(themedSvg(copiedLucide)).toContain(".ColorScheme-NegativeText { color:");
    const wholeRole = source.replace("<svg ", '<svg class="ColorScheme-NegativeText" ');
    expect(themedSvg(wholeRole)).toContain('<g class="ColorScheme-NegativeText" fill="none">');
  });

  test("applies a whole-icon role to a stroke inherited from the SVG root", () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" class="ColorScheme-NeutralText" stroke="currentColor"><path d="M0 0h10"/></svg>`;
    const output = themedSvg(source);
    expect(output).toMatch(/<g class="ColorScheme-NeutralText" stroke="currentColor">/);
    expect(output).toContain(".ColorScheme-NeutralText { color: #f67400; }");
  });

  test("requires dimensions only when transforming and rejects active SVG", () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`;
    expect(themedSvg(source)).toContain("<path");
    expect(() => themedSvg(source, true)).toThrow(/viewBox/);
    expect(() => validateSvg(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`)).toThrow();
    expect(() => validateSvg(`<svg><path d="M0 0></path></svg>`)).toThrow(/Unclosed/);
    expect(() => validateSvg(`<svg><path fill="url(https://example.com/x)"/></svg>`)).toThrow();
    expect(() => validateSvg(`<svg><defs><linearGradient id="g"/></defs><path fill="url(#g)"/></svg>`)).not.toThrow();
  });
});
