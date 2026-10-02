import { Arrow, Boundary, Computer, Drawing, KeyGlyph, Lamp, Value, idsFor } from "../kit";
import type { DerivedMusig2SessionFixture } from "../types";
import { short } from "./scene";

/**
 * musig2-chain-view.v1 — static. The signers on one side of a boundary,
 * hatched: the chain never sees them. On the other side, what a key path
 * spend shows: one x-only key, one 64-byte signature, and a BIP 340
 * verifier that accepts it. From a published sig_agg vector.
 */
export function ChainView({ fixture }: { fixture: DerivedMusig2SessionFixture }) {
  const d = fixture.derived;
  if (!d.signatureVerifies) throw new Error(`${fixture.id}: the signature must verify`);
  const n = d.signers.length;
  const sig = d.signature;
  if (sig.length !== 128) throw new Error(`${fixture.id}: not a 64-byte signature`);
  const ids = idsFor("a14-chain");
  const desc =
    `Left of the boundary, ${n} signers; the chain does not see them. Right of it, what a key path spend would show: ` +
    `one 32-byte key, ${d.finalXonly}, and one 64-byte signature, ${sig}. BIP 340 verification accepts the signature for that key and the message, exactly as it would a single signer's. The message is the vector's 32-byte test message, standing in for a transaction digest; in a real Taproot output the key would usually be tweaked first.`;
  return (
    <>
      <Drawing id="a14-chain" width={344} height={226} title="Many signers, one key, one signature" desc={desc}>
        <rect x="10" y="22" width="118" height="190" style={`fill:${ids.hatch}`} class="k-outline" />
        <Value at={[14, 14]} text={`${n} SIGNERS · OFF CHAIN`} size={8.5} cls="k-value--label" />
        {d.signers.map((_, i) => (
          <g>
            <Computer at={[18 + (i % 2) * 58, 36 + Math.floor(i / 2) * 64]} label={`signer ${i + 1}`} />
          </g>
        ))}
        <Arrow d={`M128 ${110} H156`} ids={ids} />
        <Boundary x={140} y1={22} y2={212} label="" />
        <Value at={[166, 14]} text="WHAT A KEY PATH SPEND SHOWS" size={8.5} cls="k-value--label" />
        <KeyGlyph at={[166, 34]} role="public" />
        <Value at={[204, 42]} text="ONE KEY · 32 B" size={8.5} cls="k-value--label" />
        <Value at={[204, 54]} text={short(d.finalXonly)} size={9.5} />
        <rect class="k-outline k-fill--sig" x="166" y="76" width="80" height="22" />
        <rect class="k-outline k-fill--sig" x="246" y="76" width="80" height="22" />
        <Value at={[171, 91]} text={`r ${short(sig.slice(0, 64))}`} size={8.5} />
        <Value at={[251, 91]} text={`s ${short(sig.slice(64))}`} size={8.5} />
        <Value at={[166, 112]} text="ONE SIGNATURE · 64 B" size={8.5} cls="k-value--label" />
        <Arrow d="M246 120 V146" ids={ids} />
        <Lamp at={[246, 162]} state="on" label="BIP 340 VERIFY" />
        <Value at={[166, 206]} text="MESSAGE: THE VECTOR'S TEST MESSAGE" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Key (x-only)</dt><dd><code class="atlas-break">{d.finalXonly}</code></dd>
          <dt>Signature</dt><dd><code class="atlas-break">{sig}</code></dd>
          <dt>Message</dt><dd><code class="atlas-break">{d.msg}</code></dd>
        </dl>
      </details>
    </>
  );
}
