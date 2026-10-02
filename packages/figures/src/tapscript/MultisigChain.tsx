import { Drawing, IsoBox, Value, wrapLines } from "../kit";
import type { DerivedTapscriptFixture } from "../types";

/**
 * tapscript-multisig.v1 — static. Above, the old counting machine:
 * OP_CHECKMULTISIG, which a recorded Core witness shows failing the moment
 * it runs. Below, the rewrite BIP 342's footnote suggests, drawn
 * symbolically: a chain of CHECKSIG and CHECKSIGADD, one witness slot per
 * key holding a signature or nothing, and a total compared with k.
 */
export function MultisigChain({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const v = fixture.derived.failure;
  const last = v.steps[v.steps.length - 1];
  if (!last || !last.failed || last.name !== "OP_CHECKMULTISIG") throw new Error(`${fixture.id}: the failure witness must stop at OP_CHECKMULTISIG`);
  const before = v.steps.slice(0, -1).filter((s) => s.executed).length;
  const script = wrapLines(v.ops.map((o) => o.name).join(" "), 36);
  const chain = [
    { t: "key 1", role: "public" }, { t: "CHECKSIG", role: "plain" },
    { t: "key 2", role: "public" }, { t: "CHECKSIGADD", role: "plain" },
    { t: "…", role: "plain" },
    { t: "key n", role: "public" }, { t: "CHECKSIGADD", role: "plain" },
    { t: "k", role: "plain" }, { t: "NUMEQUAL", role: "plain" },
  ];
  const widths = chain.map((c) => Math.max(18, c.t.length * 5.4 + 8));
  const scale = 316 / widths.reduce((a, b) => a + b, 0);
  const desc =
    `Above: OP_CHECKMULTISIG is disabled in tapscript. In Bitcoin Core test case ${fixture.caseIndex}, the failure witness runs ${v.ops.map((o) => o.name).join(" ")}; ` +
    `${before} opcodes run, then OP_CHECKMULTISIG fails at once (${v.reason}). ` +
    `Below, symbolically: the rewrite in BIP 342's footnote, key 1 CHECKSIG, key 2 CHECKSIGADD, and so on to key n CHECKSIGADD, then k NUMEQUAL. ` +
    `The witness holds one slot per key, a signature or an empty vector; each signature adds one to the running total, each empty slot adds nothing, and the total must equal k.`;
  let cx = 14;
  return (
    <Drawing id="a08-multisig" width={344} height={300} title="Counting signatures, old and new" desc={desc}>
      <Value at={[14, 16]} text="OLD · OP_CHECKMULTISIG" size={9} cls="k-value--label" />
      <IsoBox at={[44, 50]} w={70} d={30} h={26} role="plain" />
      <path class="k-ring" d="M24 34 L104 104 M104 34 L24 104" />
      <Value at={[150, 40]} text="DISABLED IN TAPSCRIPT:" size={8.5} cls="k-value--label" />
      <Value at={[150, 52]} text="FAILS AS SOON AS IT RUNS" size={8.5} cls="k-value--label" />
      <Value at={[150, 72]} text={`CORE CASE ${fixture.caseIndex}, FAILURE WITNESS:`} size={8} cls="k-value--muted" />
      {script.map((l, i) => <Value at={[150, 84 + i * 11]} text={l} size={8} />)}
      <Value at={[150, 84 + script.length * 11 + 4]} text={`✕ AFTER ${before} OPCODES`} size={8} cls="k-value--label" />
      <line class="k-sep k-leader" x1="14" y1="136" x2="330" y2="136" />

      <Value at={[14, 156]} text="NEW · A CHAIN OF OP_CHECKSIGADD (SYMBOLIC)" size={9} cls="k-value--label" />
      {chain.map((c, i) => {
        const w = widths[i] * scale;
        const x = cx;
        cx += w;
        return (
          <g>
            <rect class={`k-cell k-fill--${c.role}`} x={x} y={168} width={w} height="22" />
            <text class="k-value" x={x + w / 2} y={182.5} text-anchor="middle" style="font-size:8px">{c.t}</text>
          </g>
        );
      })}
      {[0, 2, 5].map((i, n) => {
        const x = 14 + widths.slice(0, i).reduce((a, b) => a + b, 0) * scale + (widths[i] * scale) / 2;
        return (
          <g>
            <line class="k-leader k-dashed" x1={x} y1={194} x2={x} y2={212} />
            <rect class={`k-cell ${n === 1 ? "k-fill--plain k-dashed" : "k-fill--sig"}`} x={x - 20} y={212} width="40" height="18" />
            <text class="k-value" x={x} y={224.5} text-anchor="middle" style="font-size:8px">{n === 1 ? "empty" : "sig"}</text>
          </g>
        );
      })}
      <Value at={[14, 248]} text="WITNESS: ONE SLOT PER KEY, A SIGNATURE OR EMPTY" size={8} cls="k-value--muted" />
      <Value at={[14, 266]} text="TOTAL: +1 PER VALID SIGNATURE, +0 PER EMPTY;" size={8.5} cls="k-value--label" />
      <Value at={[14, 278]} text="AN INVALID ONE FAILS THE SCRIPT; NUMEQUAL ≟ k" size={8.5} cls="k-value--label" />
    </Drawing>
  );
}
