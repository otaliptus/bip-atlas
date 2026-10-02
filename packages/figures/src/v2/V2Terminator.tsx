import { MAX_GARBAGE } from "@bip-atlas/models/v2transport";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedV2Fixture } from "../types";

const n = (x: number) => x.toLocaleString("en-US");

/**
 * v2-terminator.v1 — static. Where the garbage ends: the receiver slides a
 * 16-byte window along the stream until it equals the sender's garbage
 * terminator. Drawn with a published vector whose sender sent the maximum
 * garbage; terminator and lengths come from the model.
 */
export function V2Terminator({ fixture }: { fixture: DerivedV2Fixture }) {
  const d = fixture.derived;
  const term = d.sendTerminator.match(/.{2}/g)!;
  const garbage = d.packet.aadLen;
  const cs = 14, x0 = 14, gcells = 6, y0 = 44;
  const tx = x0 + gcells * cs + 26;
  return (
    <>
      <Drawing
        id="a17-term"
        width={344}
        height={146}
        title="Finding the end of the garbage"
        desc={`In vector ${fixture.label} the sender sent ${garbage} bytes of garbage, then its 16-byte garbage terminator ${d.sendTerminator}. The receiver compares a 16-byte window with the expected terminator as bytes arrive; it reads at most ${MAX_GARBAGE} bytes of garbage plus the 16-byte terminator, ${MAX_GARBAGE + term.length} bytes, before giving up.`}
      >
        <Value at={[x0, 16]} text={`GARBAGE · ${n(garbage)} B IN THIS VECTOR`} size={8.5} cls="k-value--label" />
        <Value at={[330, 16]} text={`TERMINATOR · ${term.length} B`} size={8.5} anchor="end" cls="k-value--label" />
        <Cells x={x0} y={y0} values={Array(gcells).fill("")} size={cs} roleOf={() => "plain"} text={false} />
        <text class="k-v2-t" x={x0 + gcells * cs + 6} y={y0 + 10}>…</text>
        <Cells x={tx} y={y0} values={term.slice(0, 7)} size={cs + 14} roleOf={() => "plain"} emphasis={() => true} />
        <text class="k-v2-t" x={tx + 7 * (cs + 14) + 4} y={y0 + 10}>…</text>
        <rect class="k-v2-window" x={tx - 3} y={y0 - 6} width={7 * (cs + 14) + 18} height={40} />
        <Value at={[tx, y0 - 12]} text="16-BYTE WINDOW = EXPECTED TERMINATOR" size={8} cls="k-value--muted" />
        <Bracket x1={x0} x2={tx + 7 * (cs + 14) + 14} y={y0 + 40} text={`at most ${n(MAX_GARBAGE)} + ${term.length} = ${n(MAX_GARBAGE + term.length)} B read`} />
        <Value at={[x0, 126]} text="SCANNING FOR 16 BYTES IS CHEAP; TRYING TO" size={8} cls="k-value--muted" />
        <Value at={[x0, 137]} text="AUTHENTICATE A PACKET AT EVERY OFFSET IS NOT" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact terminator</summary>
        <code class="atlas-break">{d.sendTerminator}</code>
      </details>
    </>
  );
}
