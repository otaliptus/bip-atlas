import { Drawing, Value, idsFor } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { group, shortHex } from "./parts";

const why = (reason?: string) => (!reason ? "" : reason.startsWith("starts with OP_RETURN") ? "OP_RETURN" : reason.startsWith("duplicate") ? "REPEAT" : reason.startsWith("empty") ? "EMPTY" : reason.toUpperCase());

/**
 * bf-element-sieve.v1 — static. Every script a vector block touches, in
 * block order: output scripts, then the scripts its inputs spend. The ones
 * BIP 158 leaves out are struck through with the reason; the rest park in
 * the set, one bay per distinct script. Views come from the tested model.
 */
export function BfSieve({ fixture }: { fixture: DerivedBfBlockFixture }) {
  const d = fixture.derived;
  const ids = idsFor("a16-sieve");
  const set = d.elements.filter((e) => e.included);
  if (set.length !== d.N) throw new Error(`${fixture.id}: ${set.length} included scripts but N = ${d.N}`);
  const rowH = 12.5, x0 = 14, cw = 112;
  const outs = d.elements.filter((e) => e.from === "output"), spent = d.elements.filter((e) => e.from === "spent");
  const y1 = 30, y2 = y1 + outs.length * rowH + 22;
  const H = Math.max(y2 + spent.length * rowH + 16, 200);
  const cols = 2, bw = 66, bh = 22, lx = 194, ly = 52;
  const card = (e: (typeof d.elements)[number], y: number) => (
    <g data-included={String(e.included)}>
      <rect class={`k-outline k-fill--plain${e.included ? "" : " k-dashed"}`} x={x0} y={y} width={cw * 0.62} height={rowH - 2.5} />
      <text class="k-bf-hex" x={x0 + 4} y={y + 7.6}>{shortHex(e.script, 4)}</text>
      {e.included ? null : (
        <>
          <line class="k-leader" x1={x0 - 2} y1={y + 5} x2={x0 + cw * 0.62 + 2} y2={y + 5} />
          <text class="k-bf-why" x={x0 + cw * 0.62 + 5} y={y + 7.6}>{why(e.reason)}</text>
        </>
      )}
    </g>
  );
  const counts = (r: string) => d.elements.filter((e) => why(e.reason) === r).length;
  const reasons = ["OP_RETURN", "REPEAT", "EMPTY"].filter((r) => counts(r) > 0);
  return (
    <>
    <Drawing
      id="a16-sieve"
      width={344}
      height={H}
      title="What goes in"
      desc={`Testnet block ${d.height}, ${d.txCount} transactions: ${outs.length} output scripts and ${spent.length} spent scripts. Left out: ${reasons.map((r) => `${counts(r)} ${r === "OP_RETURN" ? "output starting with OP_RETURN" : r === "REPEAT" ? "repeats of an earlier script" : "empty scripts"}`).join(", ")}. The set keeps ${d.N} distinct scripts: ${set.map((e) => e.script).join(", ")}.`}
    >
      <Value at={[x0, 18]} text={`BLOCK ${group(d.height)} · ${d.txCount} TRANSACTIONS`} size={8.5} cls="k-value--label" />
      <Value at={[x0, y1 - 4]} text={`OUTPUT SCRIPTS · ${outs.length}`} size={8} cls="k-value--muted" />
      {outs.map((e, i) => card(e, y1 + i * rowH))}
      <Value at={[x0, y2 - 4]} text={`SPENT SCRIPTS · ${spent.length}`} size={8} cls="k-value--muted" />
      {spent.map((e, i) => card(e, y2 + i * rowH))}
      <path class="k-line" d={`M${x0 + cw + 46} ${ly + 30} H${lx - 6}`} marker-end={ids.arrow} />
      <Value at={[lx, ly - 22]} text={`THE SET · ${d.N} SCRIPTS`} size={8.5} cls="k-value--label" />
      <Value at={[lx, ly - 10]} text="EACH ONE ONCE" size={8} cls="k-value--muted" />
      {/* A parking lot: painted bay lines, one script per bay. */}
      <rect class="k-outline k-bf-lot" x={lx - 4} y={ly - 4} width={cols * bw + 8} height={Math.ceil(set.length / cols) * bh + 8} />
      {set.map((e, i) => {
        const bx = lx + (i % cols) * bw, by = ly + Math.floor(i / cols) * bh;
        return (
          <g>
            <path class="k-bf-bay" d={`M${bx} ${by} V${by + bh - 2} M${bx + bw} ${by} V${by + bh - 2}`} />
            <rect class="k-outline k-fill--plain" x={bx + 3} y={by + 6} width={bw - 6} height={12} />
            <text class="k-bf-hex" x={bx + bw / 2} y={by + 14.6} text-anchor="middle">{shortHex(e.script, 4)}</text>
          </g>
        );
      })}
    </Drawing>
    <details class="atlas-disclosure">
      <summary>Every script, in full</summary>
      <ol class="atlas-hexlist">
        {d.elements.map((e) => (
          <li><code class="atlas-break">{e.script || "(empty)"}</code> {e.from === "output" ? "output" : "spent"}{e.included ? "" : `, left out: ${e.reason}`}</li>
        ))}
      </ol>
    </details>
    </>
  );
}
