import { readFileSync } from "node:fs";
import {
  validateAtlasExperience,
  type AtlasData,
  type CapabilityData,
} from "@bip-atlas/publication";
import { listChapterIds, loadChapter } from "./content";
import { ROOT } from "./root";

const readJson = <T>(path: string): T => JSON.parse(readFileSync(ROOT + path, "utf8")) as T;

let cached: { atlas: AtlasData; capabilities: CapabilityData } | undefined;

export function loadAtlasExperience() {
  if (cached) return cached;
  const atlas = readJson<AtlasData>("content/atlas.json");
  const capabilities = readJson<CapabilityData>("content/capabilities.json");
  const chapters = new Map(
    listChapterIds().map((id) => [id, new Set(loadChapter(id).publication.sections.map((section) => section.id))]),
  );
  const problems = validateAtlasExperience(atlas, capabilities, chapters);
  if (problems.length) throw new Error(`Atlas navigation failed validation:\n- ${problems.join("\n- ")}`);
  cached = { atlas, capabilities };
  return cached;
}
