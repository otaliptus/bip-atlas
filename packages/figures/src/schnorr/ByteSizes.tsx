import { Drawing, Packet, Value } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { short } from "./stages";

/** BIP 340's rationale: DER signatures are "up to 72 bytes" (bip-0340.mediawiki, line 43). */
export const DER_MAX_BYTES = 72;

/**
 * schnorr-byte-sizes.v1 — static. The sizes BIP 340 fixes, on one byte ruler:
 * a DER-encoded ECDSA signature (variable, drawn as a dashed outline only),
 * the 64-byte r ‖ s, and a key as a 33-byte compressed point and as the
 * 32-byte x coordinate alone. The key bytes are one published vector's.
 */
export function ByteSizes({ fixture }: { fixture: DerivedSchnorrFixture }) {
  const pk = fixture.publicKeyHex;
  const sigBytes = fixture.signatureHex.length / 2;
  const pkBytes = pk.length / 2;
  if (sigBytes !== 64 || pkBytes !== 32) throw new Error(`${fixture.id}: not a 64-byte signature and 32-byte key`);
  const unit = 4, x0 = 22, rowGap = 50;
  const y = (i: number) => 42 + i * rowGap;
  const desc =
    `On one byte ruler from 0 to ${DER_MAX_BYTES}: an ECDSA signature in DER encoding has no fixed size and can reach ${DER_MAX_BYTES} bytes. ` +
    `A BIP 340 signature is always ${sigBytes} bytes: r (32) then s (32). A compressed public key is ${pkBytes + 1} bytes, the prefix 02 or 03 and the x coordinate; ` +
    `a BIP 340 key keeps only the ${pkBytes}-byte x coordinate, here ${pk} from vector ${fixture.vectorIndex}, which stands for the compressed key 02 followed by the same bytes.`;
  return (
    <>
      <Drawing id="a06-sizes" width={344} height={250} title="Fixed sizes, smaller keys" desc={desc}>
        <Packet x={x0} y={y(0)} perRow={DER_MAX_BYTES} unit={unit} ruler fields={[]} />
        <Value at={[x0, y(0) - 22]} text="BYTES" size={8} cls="k-value--muted" />
        <Value at={[x0, y(0) + 8]} text="ECDSA SIGNATURE · DER · VARIABLE, UP TO 72 B" size={8.5} cls="k-value--label" />
        <rect class="k-outline k-fill--plain k-dashed" x={x0} y={y(0) + 14} width={DER_MAX_BYTES * unit} height={20} />
        <Value at={[x0 + 6, y(0) + 28]} text="length depends on the values" size={8.5} cls="k-value--muted" />

        <Value at={[x0, y(1) + 8]} text={`BIP 340 SIGNATURE · ${sigBytes} B, ALWAYS`} size={8.5} cls="k-value--label" />
        <Packet x={x0} y={y(1) + 14} perRow={DER_MAX_BYTES} unit={unit} rowH={20} fields={[{ id: "r", label: "r", bytes: 32, role: "sig" }, { id: "s", label: "s", bytes: 32, role: "sig" }]} />

        <Value at={[x0, y(2) + 8]} text={`COMPRESSED KEY · ${pkBytes + 1} B`} size={8.5} cls="k-value--label" />
        <Packet x={x0} y={y(2) + 14} perRow={DER_MAX_BYTES} unit={unit} rowH={20} fields={[{ id: "prefix", label: "02", bytes: 1, role: "plain" }, { id: "x", label: `x = ${short(pk)}`, bytes: 32, role: "public" }]} />
        <Value at={[x0 - 4, y(2) + 28]} text="02" size={9} anchor="end" />

        <Value at={[x0, y(3) + 8]} text={`BIP 340 KEY · ${pkBytes} B · x ONLY, y TAKEN EVEN`} size={8.5} cls="k-value--label" />
        <Packet x={x0 + unit} y={y(3) + 14} perRow={DER_MAX_BYTES} unit={unit} rowH={20} fields={[{ id: "pk", label: `x = ${short(pk)}`, bytes: 32, role: "public" }]} />
        <Value at={[x0 + 33 * unit + 10, y(3) + 28]} text="SAME x AS ABOVE" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Vector {fixture.vectorIndex}: x-only key pk</dt><dd><code class="atlas-break">{pk}</code></dd>
          <dt>The same key, compressed</dt><dd><code class="atlas-break">02{pk}</code></dd>
        </dl>
      </details>
    </>
  );
}
