import type { DerivedP2shFixture } from "../types";

/** p2sh-commitment.v1 — static. What the output holds versus what the spend reveals. */
export function P2shCommitment({ fixture: f }: { fixture: DerivedP2shFixture }) {
  const d = f.derived;
  return (
    <div class="atlas-p2sh-commit">
      <div class="atlas-p2sh-commit__col" data-part="output">
        <p class="atlas-p2sh-commit__head">On chain when the coin is created</p>
        <code class="atlas-break">a9 14 {d.committedHashHex} 87</code>
        <p class="atlas-p2sh-commit__note">OP_HASH160, a 20-byte push, OP_EQUAL: {d.scriptPubKeyHex.length / 2} bytes, whatever the conditions are.</p>
      </div>
      <p class="atlas-p2sh-commit__arrow" aria-hidden="true">↑ equals HASH160 of ↓</p>
      <div class="atlas-p2sh-commit__col" data-part="redeem">
        <p class="atlas-p2sh-commit__head">Revealed in the spending scriptSig</p>
        <code class="atlas-break">{d.redeemAsm}</code>
        <code class="atlas-break atlas-p2sh-commit__hex">{d.redeemScriptHex}</code>
        <p class="atlas-p2sh-commit__note">{d.redeemScriptHex.length / 2} bytes; RIPEMD-160(SHA-256(script)) = <code>{d.redeemHash160Hex}</code></p>
      </div>
      <p class="atlas-lab__source">BIP {f.source.bip} line {f.source.line} ({f.shortLabel}). Hash computed at build time and matched against the output.</p>
    </div>
  );
}
