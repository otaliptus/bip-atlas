import { Drawing, Lamp, Value } from "../kit";
import type { DerivedSpFixture } from "../types";
import { short } from "./common";

const sub = (k: number) => String(k).split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"[Number(c)]).join("");

/**
 * sp-scan-loop.v1 — static. The receiver's scan as a counter: compute P_k
 * for k = 0, 1, 2, …, look for it among the transaction's taproot outputs,
 * and stop at the first one missing. Below, schematic: if the sender had
 * left out P₁, the scan would stop there and never look for P₂.
 */
export function ScanLoop({ fixture }: { fixture: DerivedSpFixture }) {
  const d = fixture.derived;
  const found = d.steps.filter((s) => s.matched);
  const stop = d.steps[d.steps.length - 1];
  if (found.length < 2 || stop.matched || d.steps.some((s, i) => s.k !== i)) throw new Error(`${fixture.id}: needs a scan that finds at least two outputs, then stops`);
  const outs = d.txOutputs;
  const rowY = (i: number) => 40 + i * 30;
  const hypoY = rowY(d.steps.length) + 30;
  const desc =
    `The transaction has ${outs.length} taproot outputs: ${outs.map((o) => o.key).join(", ")}. ` +
    d.steps.map((s) => `k = ${s.k}: P_${s.k} = ${s.Pk}, ${s.matched ? "found" : "not found, so the scan stops"}.`).join(" ") +
    ` Schematic: had the sender left out P_1, the scan would stop at k = 1 and never look for P_2.`;
  return (
    <>
      <Drawing id="a15-scan" width={344} height={hypoY + 92} title="Scanning until the first miss" desc={desc}>
        <Value at={[14, 16]} text={`VECTOR “${d.comment.split(":")[0]}” · ${outs.length} TAPROOT OUTPUTS`} size={8.5} cls="k-value--label" />
        {d.steps.map((s, i) => (
          <g data-k={s.k} data-found={s.matched ? "true" : "false"}>
            <circle class="k-outline k-fill--plain k-cell--em" cx="30" cy={rowY(i)} r="12" />
            <text class="k-value" x="30" y={rowY(i) + 3.5} text-anchor="middle" style="font-size:9px">{`k=${s.k}`}</text>
            <Value at={[52, rowY(i) - 2]} text={`P${sub(s.k)} = B_spend + t${sub(s.k)}·G`} size={8.5} cls="k-value--muted" />
            <Value at={[52, rowY(i) + 10]} text={short(s.Pk)} size={9} />
            <Value at={[180, rowY(i) + 4]} text={s.matched ? "IN THE OUTPUTS" : "MISSING: STOP"} size={8.5} cls="k-value--label" />
            <Lamp at={[320, rowY(i)]} state={s.matched ? "on" : "off"} r={6} />
          </g>
        ))}
        <line class="k-sep k-leader" x1="14" y1={hypoY - 14} x2="330" y2={hypoY - 14} />
        <Value at={[14, hypoY]} text="SCHEMATIC: IF THE SENDER HAD LEFT OUT P₁" size={8.5} cls="k-value--label" />
        {["P₀ found", "P₁ missing: stop", "P₂ not looked for"].map((t, i) => (
          <g>
            <rect class={`k-outline k-fill--${i === 2 ? "plain" : "public"}${i > 0 ? " k-dashed" : ""}`} x={14 + i * 108} y={hypoY + 12} width="100" height="20" />
            <Value at={[20 + i * 108, hypoY + 26]} text={t} size={8.5} />
          </g>
        ))}
        <Value at={[14, hypoY + 52]} text="SO EVERY GENERATED OUTPUT MUST BE IN THE TRANSACTION" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {d.steps.map((s) => (<><dt>P{sub(s.k)} ({s.matched ? "found" : "not found"})</dt><dd><code class="atlas-break">{s.Pk}</code></dd></>))}
          {outs.map((o, i) => (<><dt>Output {i + 1}</dt><dd><code class="atlas-break">{o.key}</code></dd></>))}
        </dl>
      </details>
    </>
  );
}
