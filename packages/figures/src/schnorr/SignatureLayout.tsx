import type { DerivedSchnorrFixture } from "../types";

/**
 * schnorr-signature-layout.v1 — static. The byte shapes BIP 340 fixes: a
 * 32-byte x-only public key, a message of any length, and a 64-byte signature
 * made of r (an x coordinate) and s (a scalar). Values are one published vector.
 */
export function SignatureLayout({ fixture }: { fixture: DerivedSchnorrFixture }) {
  const r = fixture.signatureHex.slice(0, 64);
  const s = fixture.signatureHex.slice(64);
  const msgBytes = fixture.messageHex.length / 2;
  return (
    <div class="atlas-sig-layout">
      <div class="atlas-sig-layout__row">
        <p class="atlas-sig-layout__head"><span class="atlas-sig-layout__name">pk</span><span>public key · 32 bytes</span></p>
        <div class="atlas-sig-layout__cells" data-cols="1">
          <span class="atlas-sig-layout__cell" data-part="pk">
            <code class="atlas-break">{fixture.publicKeyHex}</code>
            <small>x coordinate of P; its y is taken to be the even one</small>
          </span>
        </div>
        <p class="atlas-sig-layout__aside">Same point as the 33-byte compressed key <code>02</code> ‖ pk.</p>
      </div>
      <div class="atlas-sig-layout__row">
        <p class="atlas-sig-layout__head"><span class="atlas-sig-layout__name">m</span><span>message · any length, here {msgBytes} bytes</span></p>
        <div class="atlas-sig-layout__cells" data-cols="1">
          <span class="atlas-sig-layout__cell" data-part="m"><code class="atlas-break">{fixture.messageHex}</code></span>
        </div>
      </div>
      <div class="atlas-sig-layout__row">
        <p class="atlas-sig-layout__head"><span class="atlas-sig-layout__name">sig</span><span>signature · 64 bytes</span></p>
        <div class="atlas-sig-layout__cells" data-cols="2">
          <span class="atlas-sig-layout__cell" data-part="r">
            <span class="atlas-sig-layout__tag">r · bytes 0–31</span>
            <code class="atlas-break">{r}</code>
            <small>x coordinate of a point R with even y; must be below p</small>
          </span>
          <span class="atlas-sig-layout__cell" data-part="s">
            <span class="atlas-sig-layout__tag">s · bytes 32–63</span>
            <code class="atlas-break">{s}</code>
            <small>a number; must be below n</small>
          </span>
        </div>
      </div>
      <p class="atlas-lab__source">BIP 340 test-vectors.csv line {fixture.source.line} (vector {fixture.vectorIndex}). Hex most significant byte first.</p>
    </div>
  );
}
