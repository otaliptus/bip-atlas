import { useState } from "preact/hooks";
import { Drawing, Scrub, Strip, Value, idsFor } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { group } from "./parts";

export type WalletScenario = "hit" | "miss" | "false-positive";

/** Exact examples use the tested probes. The collision branch has no invented bytes. */
export function walletFilterOutcome(fixture: DerivedBfBlockFixture, scenario: WalletScenario) {
  if (scenario === "false-positive") return { matched: true, relevant: false, schematic: true, probe: null };
  const probe = fixture.derived.probes.find((p) => scenario === "hit"
    ? p.from === "this block" && p.matched
    : p.from !== "this block" && !p.matched);
  if (!probe) throw new Error(`${fixture.id}: no published ${scenario} example for the wallet flow`);
  return { matched: probe.matched, relevant: probe.from === "this block", schematic: false, probe };
}

export function BfWalletFlow({ fixture, figureId, hydrated, initialScenario = "hit" }: {
  fixture: DerivedBfBlockFixture;
  figureId: string;
  hydrated: boolean;
  initialScenario?: WalletScenario;
}) {
  const [scenario, setScenario] = useState<WalletScenario>(initialScenario);
  const [step, setStep] = useState(1);
  const shown = hydrated ? step : 4;
  const outcome = walletFilterOutcome(fixture, scenario);
  const stages = [
    { title: "GET THE FILTER", detail: "Check it against its filter header.", role: "net" },
    { title: "TEST THE WATCHED SCRIPT LOCALLY", detail: outcome.matched ? "Match: this block may be relevant." : "No match: skip this block for this script.", role: "hash" },
    { title: outcome.matched ? "REQUEST THE FULL BLOCK" : "NO BLOCK REQUEST NEEDED", detail: outcome.matched ? "The serving peer sees the block request." : "The script stays on the wallet.", role: "net" },
    { title: outcome.matched ? "CHECK OUTPUTS AND SPENDS" : "CONTINUE TO THE NEXT FILTER", detail: outcome.relevant ? "A relevant output or spend is present." : outcome.matched ? "Nothing relevant: it was a false positive." : "No matching script in the included set.", role: "public" },
  ];
  const provenance = outcome.schematic
    ? "Schematic false positive: an unrelated script maps to the same filter value. This illustrates a possible outcome, not a published test case."
    : `Testnet block ${group(fixture.derived.height)}: the tested model ${outcome.matched ? "matches an included script" : "rejects a script from another block"}. The surrounding wallet workflow is schematic.`;
  const scope = "With a correctly constructed filter, a miss rules out only the scripts it includes. The watched script stays local. The peer sees which blocks the wallet requests.";
  const ids = idsFor(`${figureId}-wallet`);
  return (
    <div class="atlas-wallet-flow" data-scenario={scenario}>
      {hydrated ? <Strip label="Wallet outcome" name={`${figureId}-outcome`} current={scenario}
        onPick={(v) => { setScenario(v as WalletScenario); setStep(1); }}
        options={[
          { value: "hit", text: "Relevant block" },
          { value: "miss", text: "No match" },
          { value: "false-positive", text: "False positive · schematic" },
        ]} /> : <p class="atlas-hero__static">Static view: the full workflow for a matching script. With JavaScript, compare a miss and a schematic false positive.</p>}
      <Drawing id={`${figureId}-wallet`} width={344} height={334} title="Which blocks should the wallet fetch?"
        desc={`${provenance} ${stages.slice(0, shown).map((s, i) => `${i + 1}. ${s.title}: ${s.detail}`).join(" ")} ${scope}`}>
        <Value at={[14, 14]} text={outcome.schematic ? "FALSE POSITIVE · SCHEMATIC" : `WATCHING A SCRIPT · BLOCK ${group(fixture.derived.height)}`} size={9} cls="k-value--label" />
        {stages.map((s, i) => {
          const y = 28 + i * 78;
          const reached = i < shown;
          return <g data-wallet-step={i + 1} data-reached={String(reached)}>
            <rect class={`k-outline ${reached ? `k-fill--${s.role}` : "k-fill--plain k-dashed"}${i + 1 === shown ? " k-cell--em" : ""}`} x={14} y={y} width={316} height={56} />
            <Value at={[24, y + 20]} text={`${i + 1} · ${s.title}`} size={9} cls="k-value--label" />
            <Value at={[24, y + 40]} text={reached ? s.detail : "Next step"} size={9} cls={reached ? "" : "k-value--muted"} />
            {i < stages.length - 1 ? <path class="k-line" d={`M172 ${y + 59} V${y + 74}`} marker-end={ids.arrow} /> : null}
          </g>;
        })}
      </Drawing>
      {hydrated ? <Scrub label="Follow the wallet" value={step} min={1} max={4} unit="wallet step"
        valueText={`${step} of 4: ${stages[step - 1].title}`} onSet={setStep} /> : null}
      <p class="atlas-hero__status" aria-live="polite">{stages[shown - 1].detail}</p>
      <p>{scope}</p>
      <p class="atlas-hero__source">{provenance}</p>
    </div>
  );
}
