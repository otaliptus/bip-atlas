import { Bracket, Drawing, Value } from "../kit";
import type { DerivedBip322Fixture } from "../types";

/**
 * bip322-witness.v1 — static. The "signature" of a published 3-of-3 P2WSH
 * vector, item by item as plates: the empty dummy item CHECKMULTISIG
 * consumes, three ECDSA signatures, and the witness script itself. The
 * model verified this spend at build time.
 */
export function Bip322Witness({ fixture }: { fixture: DerivedBip322Fixture }) {
  const d = fixture.derived, w = d.toSign.witness;
  if (d.scriptKind !== "p2wsh" || w[0] !== "" || w.length < 3 || d.verdict.state !== "valid") throw new Error(`${fixture.id}: needs a valid multisig P2WSH vector with a dummy item`);
  const sigs = w.slice(1, -1), script = w[w.length - 1];
  const plates = [
    { label: "WITNESS SCRIPT", sub: `${script.length / 2} B · THE ${sigs.length}-OF-${sigs.length} SCRIPT`, cls: "k-fill--plain", dashed: false },
    ...[...sigs].reverse().map((s, k) => ({ label: `ECDSA SIGNATURE ${sigs.length - k}`, sub: `${s.length / 2} B · ${s.slice(0, 8)}…`, cls: "k-fill--sig", dashed: false })),
    { label: "EMPTY ITEM", sub: "0 B · A DUMMY FOR CHECKMULTISIG", cls: "k-fill--plain", dashed: true },
  ];
  const ph = 26, x0 = 40, y0 = 30;
  return (
    <>
      <Drawing
        id="a18-wit"
        width={344}
        height={y0 + plates.length * (ph + 4) + 44}
        title="A signature that is a witness stack"
        desc={`The BIP 322 signature for the 3-of-3 P2WSH vector is its witness stack, ${w.length} items, top to bottom: the ${script.length / 2}-byte witness script ${script}; ${[...sigs].reverse().map((s, k) => `ECDSA signature ${sigs.length - k}, ${s}`).join("; ")}; and, at the bottom, an empty dummy item for CHECKMULTISIG. The model verified it.`}
      >
        <Value at={[12, 16]} text={`TO_SIGN'S WITNESS · ${w.length} ITEMS · TOP FIRST`} size={8.5} cls="k-value--label" />
        {plates.map((p, i) => {
          const y = y0 + i * (ph + 4);
          return (
            <g>
              <rect class={`k-cell ${p.cls}${p.dashed ? " k-dashed" : ""}`} x={x0} y={y} width={264} height={ph} />
              <text class="k-b3-h" x={x0 + 8} y={y + 11}>{p.label}</text>
              <text class="k-b3-v" x={x0 + 8} y={y + 21}>{p.sub}</text>
            </g>
          );
        })}
        <Bracket x1={x0} x2={x0 + 264} y={y0 + plates.length * (ph + 4)} text="all of it is the bip 322 signature" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact witness items</summary>
        <ol class="atlas-hexlist">{w.map((x) => <li><code class="atlas-break">{x || "(empty)"}</code></li>)}</ol>
      </details>
    </>
  );
}
