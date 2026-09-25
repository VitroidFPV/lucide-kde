import { expect, test } from "bun:test";
import { searchKdeNames } from "../editor/search.js";

const entries = [
  { name: "arrow-up-symbolic", source: "breeze" },
  { name: "audio-volume-high", source: "breeze" },
  { name: "audio-volume-low", source: "breeze" },
  { name: "klipper-symbolic", source: "breeze" },
];
const mappings = { "klipper-symbolic": "clipboard-list" };
const names = (query: string) => searchKdeNames(entries, query, mappings).map(({ name }) => name);

test("KDE search matches words in either order and ignores separators", () => {
  expect(names("volume high")).toEqual(["audio-volume-high"]);
  expect(names("high volume")).toEqual(["audio-volume-high"]);
  expect(names("volumehigh")).toEqual(["audio-volume-high"]);
  expect(names("arrow up")).toEqual(["arrow-up-symbolic"]);
});

test("KDE search tolerates one typo and finds assigned Lucide names", () => {
  expect(names("volme high")).toEqual(["audio-volume-high"]);
  expect(names("kliper")).toEqual(["klipper-symbolic"]);
  expect(names("clipboard")).toEqual(["klipper-symbolic"]);
});

test("KDE search ranks exact names ahead of nearby matches", () => {
  expect(names("audio-volume-high")[0]).toBe("audio-volume-high");
  expect(names("volume")).toEqual(["audio-volume-high", "audio-volume-low"]);
});
