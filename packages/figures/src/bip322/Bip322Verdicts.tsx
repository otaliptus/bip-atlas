import { Drawing, Value } from "../kit";
import type { DerivedBip322VerdictsFixture } from "../types";
import { wrap } from "./Bip322Formats";

/**
 * bip322-verdicts.v1 — static. The verifier's three stamps, one published
 * vector each, as the tested model judges them. Valid is a solid stamp,
 * invalid crossed, inconclusive dashed: the shape is the cue, not colour.
 */
export function Bip322Verdicts({ fixture }: { fixture: DerivedBip322VerdictsFixture }) {
  const rows = fixture.derived.rows;
  const h = 70;
  return (
    <Drawing
      id="a18-verdicts"
      width={344}
      height={rows.length * h + 8}
      title="Three verdicts"
      desc={rows.map((r) => `${r.state}: ${r.label}, message “${r.message}”: ${r.detail}.`).join(" ")}
    >
      {rows.map((r, i) => {
        const y = 8 + i * h;
        return (
          <g data-state={r.state}>
            <g class="k-b3-stamp" data-state={r.state}>
              <rect x="12" y={y} width="118" height="34" rx="4" />
              <text x="71" y={y + 21} text-anchor="middle">{r.state.toUpperCase()}</text>
            </g>
            {r.state === "invalid" ? <path class="k-leader" d={`M16 ${y + 30} L126 ${y + 4}`} /> : null}
            {wrap(r.label.toUpperCase(), 32).map((l, k) => <text class="k-b3-h" x="142" y={y + 10 + k * 11}>{l}</text>)}
            {wrap(r.detail, 34).map((l, k) => <text class="k-b3-v" x="142" y={y + 10 + (wrap(r.label, 32).length + k) * 11}>{l}</text>)}
          </g>
        );
      })}
      <Value at={[12, rows.length * h + 2]} text="INCONCLUSIVE: THIS MODEL DOES NOT DECODE PROOF-OF-FUNDS PSBTS" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
