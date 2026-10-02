import { MAX_GARBAGE } from "@bip-atlas/models/v2transport";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedV2Fixture } from "../types";

/**
 * v2-ellswift.v1 — static. One side's opening bytes from a published vector:
 * a 64-byte ElligatorSwift public key (two 32-byte halves, u and t) and the
 * optional garbage after it. This site does not decode ElligatorSwift: the
 * x coordinate is computed from the vector's private key, and that these
 * bytes decode to it is the vector's claim.
 */
export function V2Ellswift({ fixture }: { fixture: DerivedV2Fixture }) {
  const d = fixture.derived;
  const bytes = d.ellOurs.match(/.{2}/g)!;
  if (bytes.length !== 64) throw new Error(`${fixture.id}: an ElligatorSwift encoding is 64 bytes`);
  const cs = 19, x0 = 20, y0 = 30;
  const side = d.initiating ? "initiator" : "responder";
  return (
    <>
      <Drawing
        id="a17-ell"
        width={344}
        height={276}
        title="64 bytes that look random"
        desc={`The ${side}'s first message in BIP 324 vector ${fixture.label}: a 64-byte ElligatorSwift encoding of its ephemeral public key, ${d.ellOurs}, in two 32-byte halves u and t, optionally followed by up to ${MAX_GARBAGE} bytes of garbage. Every 64-byte string encodes some point, so a uniformly chosen encoding looks like random bytes. The key's x coordinate is ${d.xOurs}, computed from the vector's private key; this site does not implement ElligatorSwift decoding, so that the 64 bytes decode to it is the vector's claim.`}
      >
        <Value at={[x0, 16]} text={`THE ${side.toUpperCase()}'S FIRST BYTES ON THE WIRE`} size={9} cls="k-value--label" />
        <Cells x={x0} y={y0} values={bytes.slice(0, 32)} size={cs} perRow={16} rowGap={2} roleOf={() => "net"} />
        <Cells x={x0} y={y0 + 2 * (cs + 2) + 6} values={bytes.slice(32)} size={cs} perRow={16} rowGap={2} roleOf={() => "net"} />
        <path class="k-leader" d={`M${x0 + 16 * cs + 4} ${y0} h5 V${y0 + 2 * cs + 2} h-5`} />
        <text class="k-v2-t" x={x0 + 16 * cs + 12} y={y0 + cs + 4}>u</text>
        <path class="k-leader" d={`M${x0 + 16 * cs + 4} ${y0 + 2 * cs + 8} h5 V${y0 + 4 * cs + 10} h-5`} />
        <text class="k-v2-t" x={x0 + 16 * cs + 12} y={y0 + 3 * cs + 12}>t</text>
        <Bracket x1={x0} x2={x0 + 16 * cs} y={y0 + 4 * cs + 14} text="64 B · ElligatorSwift · any 64 bytes are valid" />
        <rect class="k-cell k-fill--plain k-dashed" x={x0} y={y0 + 4 * cs + 52} width={16 * cs} height={22} />
        <Value at={[x0 + 6, y0 + 4 * cs + 67]} text={`GARBAGE · 0 TO ${MAX_GARBAGE.toLocaleString("en-US")} B · OPTIONAL`} size={8.5} cls="k-value--label" />
        <Value at={[x0, y0 + 4 * cs + 98]} text={`x = ${d.xOurs.slice(0, 16)}…`} size={9.5} />
        <Value at={[x0, y0 + 4 * cs + 112]} text="COMPUTED FROM THE PRIVATE KEY. THAT THE 64 BYTES" size={8} cls="k-value--muted" />
        <Value at={[x0, y0 + 4 * cs + 123]} text="DECODE TO IT IS THE VECTOR'S CLAIM: NOT DECODED HERE" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>ElligatorSwift encoding (64 bytes)</dt><dd><code class="atlas-break">{d.ellOurs}</code></dd>
          <dt>x coordinate of the public key</dt><dd><code class="atlas-break">{d.xOurs}</code></dd>
        </dl>
      </details>
    </>
  );
}
