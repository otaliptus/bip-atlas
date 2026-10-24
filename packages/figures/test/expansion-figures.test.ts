import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveExpansionFixture } from "../../../apps/site/src/lib/expansion";
import { expansionHeroSpec } from "../src/expansion/ExpansionHeroSpec";
import type { BaseFixture } from "../src/types";

const chapters = [
  ["payment-instructions", 2],
  ["compact-blocks", 4],
  ["rbf", 6],
  ["addrv2", 2],
  ["psbt-extensions", 3],
] as const;

describe("expansion figure derivations", () => {
  for (const [chapter, stages] of chapters) {
    it(`${chapter} has complete views and a full pre-rendered lab`, () => {
      const raw = JSON.parse(readFileSync(new URL(`../../../fixtures/${chapter}.json`, import.meta.url), "utf8")).fixtures as BaseFixture[];
      const fixtures = raw.map(deriveExpansionFixture);
      const spec = expansionHeroSpec(fixtures);
      expect(spec.states).toHaveLength(fixtures.length * stages);
      expect(spec.states.some((state) => state.id === spec.noJsId)).toBe(true);
      expect(spec.controls[0].options).toHaveLength(fixtures.length);
      expect(spec.controls[0].kind).toBe(fixtures.length > 4 ? "select" : "strip");
      for (const option of spec.controls[0].options) expect(option.text).not.toMatch(/<tt>/);
      for (const fixture of fixtures) {
        expect(fixture.derived.views.overview.motif).toBeTruthy();
        if ("stage" in fixture && fixture.stage === "all partial signatures") {
          expect(fixture.derived.views.musig2.panels.filter((panel) => panel.title === "PSBT_IN_MUSIG2_PARTIAL_SIG")).toHaveLength(3);
        }
        for (const view of Object.values(fixture.derived.views)) {
          expect(view.summary.length).toBeGreaterThan(0);
          expect(view.source).toContain("BIP");
          for (const panel of view.panels) {
            for (const field of panel.fields) {
              expect(field.value).not.toMatch(/undefined|NaN|Infinity/);
            }
          }
          for (const stage of view.stages) expect(stage.title.length).toBeGreaterThan(0);
        }
      }
      for (const state of spec.states) {
        const fixture = fixtures.find((item) => item.id === state.state.split("/")[0])!;
        expect(fixture.derived.views[state.state], state.state).toBeDefined();
      }
    });
  }

  it("rejects a missing lab view instead of rendering an empty state", () => {
    const raw = JSON.parse(readFileSync(new URL("../../../fixtures/payment-instructions.json", import.meta.url), "utf8")).fixtures as BaseFixture[];
    const fixture = deriveExpansionFixture(raw[0]);
    delete fixture.derived.views[`${fixture.id}/callback`];
    expect(() => expansionHeroSpec([fixture])).toThrow("missing expansion view");
  });
});
