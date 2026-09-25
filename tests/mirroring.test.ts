import { expect, test } from "bun:test";
import { readLucide, themedSvg } from "../src/lucide";
import { mappingIcon, mappingMirrored, validateMappings } from "../src/mappings";

test("mirrored mappings coexist with existing string mappings", () => {
  const mappings = validateMappings({
    "audio-volume-high": "volume-2",
    "audio-volume-high-rtl": { icon: "volume-2", mirror: true },
  });
  expect(mappingIcon(mappings["audio-volume-high"])).toBe("volume-2");
  expect(mappingMirrored(mappings["audio-volume-high"])).toBe(false);
  expect(mappingIcon(mappings["audio-volume-high-rtl"])).toBe("volume-2");
  expect(mappingMirrored(mappings["audio-volume-high-rtl"])).toBe(true);
  expect(() => validateMappings({ "audio-volume-high-rtl": { icon: "volume-2", mirror: "true" } })).toThrow();
  expect(() => validateMappings({ "audio-volume-high-rtl": { icon: "volume-2", mirror: false } })).toThrow();
});

test("mirrored SVG reflects the icon across its viewBox", async () => {
  const source = await readLucide("arrow-right");
  expect(themedSvg(source)).not.toContain('transform="translate(24 0) scale(-1 1)"');
  expect(themedSvg(source, true)).toContain('transform="translate(24 0) scale(-1 1)"');
});
