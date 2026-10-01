import type { DerivedBip32Fixture } from "../types";

const groups = (hex: string) => hex.match(/.{1,8}/g)!.join(" ");

/** master-key-split.v1 — static. Seed → HMAC-SHA512("Bitcoin seed") → I_L | I_R. */
export function MasterKeySplit({ fixture }: { fixture: DerivedBip32Fixture }) {
  const { masterIHex, nodes } = fixture.derived;
  const master = nodes.find((n) => n.path === "m")!;
  return (
    <div class="atlas-split">
      <div class="atlas-split__box">
        <span class="atlas-split__role">Seed · {fixture.seedHex.length / 2} bytes</span>
        <code>{groups(fixture.seedHex)}</code>
      </div>
      <div class="atlas-split__arrow" aria-hidden="true">↓</div>
      <div class="atlas-split__box atlas-split__fn">
        <span class="atlas-split__role">HMAC-SHA512</span>
        <span>key = the text <code>"Bitcoin seed"</code>, data = the seed</span>
      </div>
      <div class="atlas-split__arrow" aria-hidden="true">↓ 64 bytes, cut in half</div>
      <div class="atlas-split__halves">
        <div class="atlas-split__box atlas-split__half" data-half="left">
          <span class="atlas-split__role">I<sub>L</sub> · first 32 bytes</span>
          <code>{groups(masterIHex.slice(0, 64))}</code>
          <span class="atlas-split__out">→ master private key</span>
        </div>
        <div class="atlas-split__box atlas-split__half" data-half="right">
          <span class="atlas-split__role">I<sub>R</sub> · last 32 bytes</span>
          <code>{groups(masterIHex.slice(64))}</code>
          <span class="atlas-split__out">→ master chain code</span>
        </div>
      </div>
      <p class="atlas-split__foot">
        Together they are the master extended key <code class="atlas-break">{master.xprv}</code>, exactly as listed in
        BIP 32’s test vector 1 (lines {master.vectorLine}–{master.vectorLine! + 2}).
      </p>
    </div>
  );
}
