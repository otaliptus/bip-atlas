import { MAINNET_MAGIC, V1_PREFIX } from "@bip-atlas/models/v2constants";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedV2Fixture } from "../types";

const ascii = (h: string) => (parseInt(h, 16) >= 0x21 && parseInt(h, 16) < 0x7f ? String.fromCharCode(parseInt(h, 16)) : "");

/**
 * v2-detect.v1 — static. What a responder compares: the first 16 bytes a
 * v1 peer always sends (mainnet magic, "version", zero padding, from the
 * model's V1_PREFIX) against the first 16 bytes of a v2 initiator's key from
 * a published vector.
 */
export function V2Detect({ fixture }: { fixture: DerivedV2Fixture }) {
  const v1 = V1_PREFIX.match(/.{2}/g)!;
  const ell = fixture.derived.initiating ? fixture.derived.ellOurs : fixture.derived.ellTheirs;
  const v2 = ell.slice(0, 32).match(/.{2}/g)!;
  if (v1.length !== 16) throw new Error("V1_PREFIX is not 16 bytes");
  const magic = MAINNET_MAGIC.length / 2, word = v1.slice(magic).findIndex((b) => b === "00") + magic;
  const cs = 19, x0 = 20;
  return (
    <>
      <Drawing
        id="a17-detect"
        width={344}
        height={176}
        title="v1 or v2?"
        desc={`A responder looks at the first 16 bytes it receives. Every v1 connection starts with ${V1_PREFIX}: the network magic ${MAINNET_MAGIC}, the ASCII command "version" and zero padding; if they match, it speaks v1. A v2 initiator's first 16 bytes are the start of its 64-byte key, in vector ${fixture.label}: ${ell.slice(0, 32)}.`}
      >
        <Value at={[x0, 16]} text="A V1 PEER ALWAYS STARTS WITH" size={9} cls="k-value--label" />
        <Cells x={x0} y={26} values={v1.map((b, i) => (i >= magic && i < word ? ascii(b) : b))} size={cs} />
        <Bracket x1={x0} x2={x0 + magic * cs} y={26 + cs + 3} text="magic" />
        <Bracket x1={x0 + magic * cs} x2={x0 + word * cs} y={26 + cs + 3} text={`"version"`} />
        <Bracket x1={x0 + word * cs} x2={x0 + 16 * cs} y={26 + cs + 3} text="padding" />
        <Value at={[x0, 104]} text="A V2 INITIATOR STARTS WITH ITS KEY" size={9} cls="k-value--label" />
        <Cells x={x0} y={114} values={v2} size={cs} roleOf={() => "net"} />
        <Value at={[x0, 156]} text="MATCH: SPEAK V1 · OTHERWISE: CONTINUE AS V2" size={8.5} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact bytes</summary>
        <dl class="atlas-hexlist">
          <dt>v1 prefix</dt><dd><code class="atlas-break">{V1_PREFIX}</code></dd>
          <dt>v2 initiator's first 16 bytes ({fixture.label})</dt><dd><code class="atlas-break">{ell.slice(0, 32)}</code></dd>
        </dl>
      </details>
    </>
  );
}
