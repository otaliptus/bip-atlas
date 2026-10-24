import { checkSpec, type HeroSpec } from "../heroStates";
import type { DerivedExpansionFixture } from "./types";

export function expansionHeroSpec(fixtures: DerivedExpansionFixture[]): HeroSpec<string> {
  if (!fixtures.length) throw new Error("Expansion lab needs at least one fixture");
  const lab = fixtures[0].derived.lab;
  if (!lab) throw new Error(`${fixtures[0].id}: no expansion lab definition`);
  const scenarios = fixtures.map((fixture) => {
    const label = ("stage" in fixture && typeof fixture.stage === "string" ? `${fixture.label} · ${fixture.stage}` : fixture.label).replace(/<\/?tt>/g, "").replace(/\s*\(synthetic\)$/, "").replace(/:$/, "");
    return { id: fixture.id, label: label === "If the original URI is" ? `Proof callback · BIP 321 example ${Number(fixture.id.slice(4, 6))}` : label };
  });
  const states = scenarios.flatMap((scenario) => lab.stages.map((stage) => {
    const fixture = fixtures.find((item) => item.id === scenario.id)!;
    const key = `${scenario.id}|${stage.id}`;
    const view = `${scenario.id}/${stage.id}`;
    if (!fixture.derived.views[view]) throw new Error(`${fixture.id}: missing expansion view ${view}`);
    return { id: `${scenario.id}-${stage.id}`, keys: [key], state: view, valueText: `${scenario.label}: ${stage.label}` };
  }));
  return checkSpec({
    controls: [
      { kind: scenarios.length > 4 ? "select" : "strip", name: "scenario", label: "Public example", options: scenarios.map((scenario) => ({ value: scenario.id, text: scenario.label, resets: ["stage"] })) },
      { kind: "stepper", name: "stage", label: "View", options: lab.stages.map((stage) => ({ value: stage.id, text: stage.label })), prevLabel: "Previous view", nextLabel: "Next view" },
    ],
    states,
    initialKey: lab.initialKey,
    noJsId: lab.noJsId.replace("|", "-"),
    staticNote: lab.staticNote,
  });
}
