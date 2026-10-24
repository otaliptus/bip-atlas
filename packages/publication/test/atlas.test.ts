import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  validateAtlasExperience,
  type AtlasData,
  type CapabilityData,
} from "../src/atlas";
import type { Publication } from "../src";

const root = new URL("../../../", import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, root), "utf8")) as T;
const atlas = read<AtlasData>("content/atlas.json");
const capabilities = read<CapabilityData>("content/capabilities.json");
const chapterIds = readdirSync(new URL("content/chapters/", root)).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5));
const chapters = new Map<string, Set<string>>(chapterIds.map((id) => {
  const chapter = read<Publication>(`content/chapters/${id}.json`);
  return [id, new Set(chapter.sections.map((section) => section.id))];
}));

describe("atlas experience contracts", () => {
  it("covers every chapter and every capability source section", () => {
    expect(validateAtlasExperience(atlas, capabilities, chapters)).toEqual([]);
    expect(atlas.trails.flatMap((trail) => trail.chapters).sort()).toEqual(chapterIds.sort());
    expect(capabilities.artifacts.length).toBeGreaterThanOrEqual(9);
  });

  it("rejects a chapter missing from the trails", () => {
    const broken = structuredClone(atlas);
    broken.trails[0].chapters.shift();
    expect(validateAtlasExperience(broken, capabilities, chapters).join("\n")).toContain("has no trail");
  });

  it("rejects dangling relationships and out-of-bounds nodes", () => {
    const broken = structuredClone(atlas);
    broken.nodes[0].x = broken.map.width;
    broken.relationships[0].to = "not-a-chapter";
    const problems = validateAtlasExperience(broken, capabilities, chapters).join("\n");
    expect(problems).toContain("outside the map");
    expect(problems).toContain("unknown endpoint");
  });

  it("rejects a capability link to a missing chapter section", () => {
    const broken = structuredClone(capabilities);
    broken.artifacts[0].sources[0].section = "not-a-section";
    expect(validateAtlasExperience(atlas, broken, chapters).join("\n")).toContain("unknown section");
  });

  it("rejects duplicate artifacts", () => {
    const broken = structuredClone(capabilities);
    broken.artifacts.push(broken.artifacts[0]);
    expect(validateAtlasExperience(atlas, broken, chapters).join("\n")).toContain("duplicate capability artifact");
  });
});
