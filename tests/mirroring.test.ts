import { expect, test } from "bun:test";
import { readLucide, themedSvg } from "../src/lucide";
import {
  mappingCategories,
  mappingIcon,
  mappingMirrored,
  mappingRotation,
  mappingScale,
  validateMappings,
} from "../src/mappings";

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

test("mappings keep every source category", () => {
  const mapping = validateMappings({ "mail-unread": { icon: "mail", categories: ["actions", "status"] } })[
    "mail-unread"
  ];
  expect(mappingCategories(mapping)).toEqual(["actions", "status"]);
  expect(mappingCategories("mail")).toEqual(["status"]);
  expect(() => validateMappings({ "mail-unread": { icon: "mail", categories: ["actions", "actions"] } })).toThrow();
  expect(() => validateMappings({ "mail-unread": { icon: "mail", categories: ["unknown"] } })).toThrow();
});

test("mirrored SVG reflects the icon across its viewBox", async () => {
  const source = await readLucide("arrow-right");
  expect(themedSvg(source)).not.toContain('transform="translate(24 0) scale(-1 1)"');
  expect(themedSvg(source, true)).toContain('transform="translate(24 0) scale(-1 1)"');
});

test("scaled mapping keeps artwork centered in the original viewBox", async () => {
  const mapping = validateMappings({ "user-desktop-symbolic": { icon: "panel-bottom", scale: 0.75 } })[
    "user-desktop-symbolic"
  ];
  expect(mappingScale(mapping)).toBe(0.75);
  expect(themedSvg(await readLucide(mappingIcon(mapping)), false, mappingScale(mapping))).toContain(
    'transform="translate(3 3) scale(0.75)"',
  );
  expect(() => validateMappings({ "user-desktop-symbolic": { icon: "panel-bottom", scale: 0 } })).toThrow();
});

test("rotation uses 22.5 degree steps around the viewBox center", async () => {
  const mapping = validateMappings({ arrow: { icon: "arrow-right", rotate: 22.5 } }).arrow;
  expect(mappingRotation(mapping)).toBe(22.5);
  expect(mappingRotation("arrow-right")).toBe(0);
  const source = await readLucide("arrow-right");
  expect(themedSvg(source, false, 1, mappingRotation(mapping))).toContain('transform="rotate(22.5 12 12)"');
  expect(themedSvg(source, true, 1, 22.5)).toContain('transform="rotate(22.5 12 12) translate(24 0) scale(-1 1)"');
  for (const rotate of [-22.5, 23, 360, Infinity]) {
    expect(() => validateMappings({ arrow: { icon: "arrow-right", rotate } })).toThrow();
    expect(() => themedSvg(source, false, 1, rotate)).toThrow();
  }
});
