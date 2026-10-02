import { Drawing, Responsive, Value, idsFor } from "../kit";
import type { DerivedMusig2SessionFixture } from "../types";
import { short } from "./scene";

/** The private collaboration and its public footprint, with no individual key values. */
export function ChainView({ fixture }: { fixture: DerivedMusig2SessionFixture }) {
  const d = fixture.derived;
  if (!d.signatureVerifies || d.signature.length !== 128) throw new Error(`${fixture.id}: expected a valid 64-byte signature`);
  const n = d.signers.length;
  const draw = (wide: boolean) => {
    const W = wide ? 640 : 344, split = wide ? 330 : 0;
    const yPublic = wide ? 35 : 263, xPublic = wide ? split + 24 : 14;
    const publicW = wide ? W - xPublic - 14 : 316;
    const id = `a14-chain-${wide ? "w" : "n"}`, ids = idsFor(id);
    return <Drawing id={id} width={W} height={wide ? 265 : 472} title="Many participants. One signature."
      desc={`${n} signers exchange public nonces and partial signatures off chain. Each signer keeps its secret key and secret nonces private. The group creates one 64-byte BIP 340 signature. On chain, the output key is already public and the key-path witness reveals the signature, not the participants or their individual contributions. Public test key ${d.finalXonly}, signature ${d.signature}. This vector signs a test message; a real Taproot transaction uses its transaction digest and typically tweaks the key first.`}>
      <Value at={[14, 16]} text="INSIDE THE GROUP" size={10} cls="k-value--label" />
      {d.signers.map((_, i) => {
        const x = 14 + i * (298 / n), w = 282 / n;
        return <g data-participant={i + 1}>
          <path class="k-outline k-fill--plain" d={`M${x} 35 h${w - 10} l10 10 v81 h-${w} Z`} />
          <Value at={[x + 9, 55]} text={`SIGNER ${i + 1}`} size={9} cls="k-value--label" />
          <rect class="k-cell k-fill--secret k-dashed" x={x + 9} y="68" width={w - 18} height="18" />
          <Value at={[x + w / 2, 80]} text="secrets stay here" size={8} anchor="middle" />
          <rect class="k-cell k-fill--sig" x={x + 9} y="96" width={w - 18} height="18" />
          <Value at={[x + w / 2, 108]} text="partial signature" size={8} anchor="middle" />
          <path class="k-line" d={`M${x + w / 2} 131 V151 H163 V165`} marker-end={ids.arrow} />
        </g>;
      })}
      <rect class="k-outline k-fill--sig" x="76" y="172" width="174" height="27" />
      <Value at={[163, 190]} text="COMBINE CONTRIBUTIONS" size={9} anchor="middle" />
      <Value at={[14, 220]} text="PUBLIC NONCES + SIGNATURE SHARES STAY OFF CHAIN" size={8} cls="k-value--muted" />
      {wide && <line class="k-leader k-dashed" x1={split} y1="9" x2={split} y2="246" />}
      <Value at={[xPublic, yPublic - 19]} text="WHAT THE BLOCKCHAIN GETS" size={10} cls="k-value--label" />
      <rect class="k-outline k-fill--public" x={xPublic} y={yPublic} width={publicW} height="45" />
      <Value at={[xPublic + 12, yPublic + 17]} text="OUTPUT · ONE KEY · 32 B" size={9} cls="k-value--label" />
      <Value at={[xPublic + 12, yPublic + 33]} text={short(d.finalXonly)} size={10} />
      <Value at={[xPublic, yPublic + 64]} text="ALREADY PUBLIC BEFORE THE SPEND" size={8} cls="k-value--muted" />
      <path class="k-line" d={wide ? `M256 185 H340 V${yPublic + 107} H${xPublic - 5}` : `M71 185 H7 V${yPublic + 107} H${xPublic - 5}`} marker-end={ids.arrow} />
      <rect class="k-outline k-fill--sig" x={xPublic} y={yPublic + 83} width={publicW} height="53" />
      <Value at={[xPublic + 12, yPublic + 101]} text="WITNESS · ONE SIGNATURE · 64 B" size={9} cls="k-value--label" />
      {Array.from({ length: 64 }, (_, i) => <rect class="k-cell k-fill--sig" x={xPublic + 12 + i * ((publicW - 24) / 64)} y={yPublic + 115} width={(publicW - 24) / 64} height="11" />)}
      <Value at={[xPublic, yPublic + 158]} text="NO PARTICIPANT LIST. NO INDIVIDUAL SHARES." size={8} cls="k-value--muted" />
      <Value at={[xPublic, yPublic + 180]} text="✓ CHECKED LIKE ANY BIP 340 SIGNATURE" size={8.5} cls="k-value--label" />
    </Drawing>;
  };
  return <>
    <div class="k-local-composition"><Responsive wide={draw(true)} narrow={draw(false)} /></div>
    <details class="atlas-disclosure"><summary>Published key, signature and test message</summary>
      <dl class="atlas-hexlist"><dt>Key (x-only)</dt><dd><code class="atlas-break">{d.finalXonly}</code></dd>
      <dt>Signature</dt><dd><code class="atlas-break">{d.signature}</code></dd>
      <dt>Test message</dt><dd><code class="atlas-break">{d.msg}</code></dd></dl>
    </details>
  </>;
}
