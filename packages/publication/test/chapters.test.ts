/**
 * Contract tests applied to every chapter in content/chapters. Chapter-specific
 * model behaviour lives next to each model in packages/models/test.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RECIPE_MAP } from "../../figures/src/registry";
import {
  defaultPathWordCount,
  parseInline,
  validatePublication,
  walkBlocks,
  type EvidenceLedger,
  type Publication,
} from "../src";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const catalog = { chapters: ["catalog.json", "catalog-phase3.json"].flatMap((f) => read(f).chapters) };
const policy = read("content/figure-policy.json") as { hero: number; supportingMin: number; supportingMax: number };
const externalLock = read("sources/external/external.lock.json");
const chapterIds = readdirSync(new URL("content/chapters/", root)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

interface Fixture {
  id: string;
  kind: string;
  source: { bip?: number; file?: string; line?: number; quote?: string; external?: string; pointer?: string };
}

/** Resolve a pointer such as `english[3]` or `[5].seed` inside parsed JSON. */
export function resolvePointer(data: unknown, pointer: string): unknown {
  let value: any = data;
  for (const token of pointer.match(/[^.[\]]+/g) ?? []) value = value?.[/^\d+$/.test(token) ? Number(token) : token];
  return value;
}

it("finds at least one chapter", () => expect(chapterIds.length).toBeGreaterThan(0));

for (const id of chapterIds) {
  const chapter: Publication = read(`content/chapters/${id}.json`);
  const ledger: EvidenceLedger = read(`content/evidence/${id}.json`);
  const fixtures: Fixture[] = read(`fixtures/${id}.json`).fixtures;
  const brief = catalog.chapters.find((c: { id: string }) => c.id === id);
  const snapshot = new URL(`${ledger.snapshot}/`, root);
  const hasSnapshot = existsSync(new URL("sources.lock.json", snapshot));
  const sourceLines = (bip: number, file?: string): string[] =>
    readFileSync(new URL(`raw/${file ?? `bip-${String(bip).padStart(4, "0")}.mediawiki`}`, snapshot), "utf8").split("\n");
  const ctx = {
    claims: new Set(ledger.claims.map((c) => c.id)),
    fixtures: new Set(fixtures.map((f) => f.id)),
    recipes: RECIPE_MAP,
  };
  const figures = [...walkBlocks(chapter)].flatMap(({ block }) => (block.type === "figure" ? [block] : []));

  describe(`chapter ${id}`, () => {
    it("is structurally valid", () => expect(validatePublication(chapter, ctx)).toEqual([]));

    it("agrees with its catalog brief", () => {
      expect(brief, "catalog entry").toBeDefined();
      expect(chapter.title).toBe(brief.questionTitle);
      expect(chapter.primaryBips).toEqual(brief.primaryBips);
      const interactive = figures.filter((f) => RECIPE_MAP.get(f.recipe)!.interactive);
      expect(interactive.map((f) => f.recipe)).toEqual([brief.heroRecipe]);
      expect(RECIPE_MAP.get(brief.heroRecipe)!.controls).toEqual(brief.allowedControls);
      const supporting = figures.length - interactive.length;
      // The catalog (a kit original) proposes 1–2 static figures; decision D1 in review/decisions.md raises it.
      expect(interactive.length).toBe(policy.hero);
      expect(supporting).toBeGreaterThanOrEqual(policy.supportingMin);
      expect(supporting).toBeLessThanOrEqual(policy.supportingMax);
    });

    it("keeps the default reading path inside the target word range", () => {
      const words = defaultPathWordCount(chapter);
      expect(words).toBeGreaterThanOrEqual(brief.targetWords.min);
      expect(words).toBeLessThanOrEqual(brief.targetWords.max);
    });

    it("cites every ledger claim at least once", () => {
      const cited = new Set<string>();
      for (const { block } of walkBlocks(chapter)) if ("claims" in block) block.claims.forEach((c) => cited.add(c));
      expect([...ctx.claims].filter((c) => !cited.has(c))).toEqual([]);
    });

    it("passes each figure fixtures of the kind its recipe expects", () => {
      const byId = new Map(fixtures.map((f) => [f.id, f]));
      for (const f of figures) {
        const kind = RECIPE_MAP.get(f.recipe)!.fixtureKind;
        // A recipe may accept several kinds, written "a|b".
        for (const fid of f.fixtures) expect(kind.split("|"), `${f.figure} ${fid}`).toContain(byId.get(fid)!.kind);
      }
    });

    it("uses the same commit as its source snapshot", () => {
      if (hasSnapshot) expect(read(`${ledger.snapshot}/sources.lock.json`).commit).toBe(ledger.commit);
    });

    it.skipIf(!hasSnapshot)("quotes the pinned source verbatim at the cited lines", () => {
      const missing: string[] = [];
      for (const claim of ledger.claims) {
        for (const span of claim.evidence) {
          const [from, to] = span.lines;
          const text = normalize(sourceLines(span.bip, span.file).slice(from - 1, to).join(" "));
          if (!text.includes(normalize(span.quote))) missing.push(`${claim.id}: BIP${span.bip} L${from}-${to}`);
        }
      }
      expect(missing).toEqual([]);
    });

    it.skipIf(!hasSnapshot)("ties every fixture to a pinned BIP line or a pinned external file", () => {
      for (const f of fixtures) {
        if (f.source.external) {
          const entry = externalLock.files.find((e: { file: string }) => e.file === f.source.external);
          expect(entry, `${f.id} external lock entry`).toBeDefined();
          const data = JSON.parse(readFileSync(new URL(`sources/external/${f.source.external}`, root), "utf8"));
          expect(resolvePointer(data, f.source.pointer!), `${f.id} pointer`).toBeDefined();
        } else {
          expect(f.source.quote, `${f.id} quote`).toBeTruthy();
          expect(sourceLines(f.source.bip!, f.source.file)[f.source.line! - 1], f.id).toContain(f.source.quote);
        }
      }
    });
  });
}

describe("shared contracts", () => {
  it("pins external vector files by hash", () => {
    for (const entry of externalLock.files) {
      const bytes = readFileSync(new URL(`sources/external/${entry.file}`, root));
      expect(createHash("sha256").update(bytes).digest("hex"), entry.file).toBe(entry.sha256);
      expect(entry.commit).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("rejects markup and unknown references", () => {
    const chapter: Publication = read(`content/chapters/${chapterIds[0]}.json`);
    const ledger: EvidenceLedger = read(`content/evidence/${chapterIds[0]}.json`);
    const broken: Publication = structuredClone(chapter);
    broken.sections[0].blocks.push(
      { type: "paragraph", text: "<script>alert(1)</script>", claims: ["no-such-claim"] },
      { type: "figure", figure: "Z.9", recipe: "freeform-svg", title: "x", fixtures: ["nope"], caption: "x", claims: [], layout: "prose" },
    );
    const problems = validatePublication(broken, {
      claims: new Set(ledger.claims.map((c) => c.id)),
      fixtures: new Set<string>(),
      recipes: RECIPE_MAP,
    }).join("\n");
    expect(problems).toMatch(/markup is not allowed/);
    expect(problems).toMatch(/unknown claim no-such-claim/);
    expect(problems).toMatch(/unregistered recipe freeform-svg/);
    expect(problems).toMatch(/unknown fixture nope/);
  });

  it("draws every interactive recipe in the illustration kit, with no worked-example tab", () => {
    // Decision D3: heroes carry their worked example as static storyboard figures; the tab code is gone.
    for (const r of RECIPE_MAP.values()) if (r.interactive) expect(r.drawing, r.id).toBe(true);
    const dispatcher = readFileSync(new URL("apps/site/src/components/Figure.astro", root), "utf8");
    const plate = readFileSync(new URL("apps/site/src/components/Plate.astro", root), "utf8");
    expect(dispatcher).not.toContain('slot="worked"');
    expect(plate).not.toContain('name="worked"');
  });

  it("parses only code and emphasis marks", () => {
    expect(parseInline("a `b` *c* <d>")).toEqual([
      { kind: "text", value: "a " }, { kind: "code", value: "b" }, { kind: "text", value: " " },
      { kind: "em", value: "c" }, { kind: "text", value: " <d>" },
    ]);
  });
});
