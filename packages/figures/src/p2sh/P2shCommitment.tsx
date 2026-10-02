import { Arrow, Drawing, IsoBox, Machine, Value, idsFor } from "../kit";
import type { DerivedP2shFixture } from "../types";
import { Padlock } from "./stack";

const short = (hex: string) => `${hex.slice(0, 8)}…`;

/**
 * p2sh-commitment.v1 — static. The output as a locked box whose lock is
 * only a 20-byte hash; the real conditions, the redeem script, are kept by
 * the receiver and shown in the spend, where HASH160 of them must give the
 * lock back.
 */
export function P2shCommitment({ fixture: f }: { fixture: DerivedP2shFixture }) {
  const d = f.derived;
  const ids = idsFor("a09-commit");
  const match = d.redeemHash160Hex === d.committedHashHex;
  return (
    <>
      <Drawing
        id="a09-commit"
        width={344}
        height={276}
        title="Twenty bytes now, the script later"
        desc={`${f.label} (${f.shortLabel}). The output is ${d.scriptPubKeyHex.length / 2} bytes and holds only the 20-byte hash ${d.committedHashHex}. The spend reveals the ${d.redeemScriptHex.length / 2}-byte redeem script ${d.redeemAsm}; its HASH160, ${d.redeemHash160Hex}, ${match ? "equals" : "differs from"} the hash in the output.`}
      >
        <IsoBox at={[64, 30]} w={50} d={38} h={28} role="plain" />
        <Padlock at={[58, 44]} />
        <Value at={[14, 92]} text={`OUTPUT · ${d.scriptPubKeyHex.length / 2} B`} size={9} cls="k-value--label" />
        <Value at={[140, 30]} text="THE LOCK IS ONLY A HASH" size={9} cls="k-value--label" />
        <rect class="k-cell k-fill--hash k-cell--em" x="140" y="38" width="120" height="20" />
        <Value at={[146, 51.5]} text={short(d.committedHashHex)} size={9.5} />
        <Value at={[140, 74]} text="20 B, WHATEVER THE CONDITIONS" size={9} cls="k-value--muted" />
        <rect class="k-outline k-fill--plain" x="14" y="112" width="316" height="44" />
        <Value at={[20, 127]} text={`REDEEM SCRIPT · ${d.redeemScriptHex.length / 2} B · KEPT BY THE RECEIVER`} size={9} cls="k-value--label" />
        <Value at={[20, 145]} text={d.redeemAsm} size={9.5} />
        <Arrow d="M172 158 V172" ids={ids} />
        <Machine at={[160, 210]} w={52} d={28} h={22} label="HASH160" role="hash" />
        <Arrow d="M220 196 H252" ids={ids} />
        <rect class="k-cell k-fill--hash" x="256" y="186" width="74" height="20" />
        <Value at={[261, 199.5]} text={short(d.redeemHash160Hex)} size={9.5} />
        <path class="k-leader k-dashed" d="M330 196 H338 V48 H262" />
        <Value at={[324, 98]} text={match ? "=" : "≠"} size={14} anchor="end" />
        <Value at={[14, 266]} text={match ? "✓ THE SPEND'S SCRIPT HASHES TO THE LOCK" : "✗ THE SCRIPT DOES NOT FIT THE LOCK"} size={9} cls={match ? "k-value--ok" : "k-value--fail"} />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Output script</dt><dd><code class="atlas-break">{d.scriptPubKeyHex}</code></dd>
          <dt>Redeem script</dt><dd><code class="atlas-break">{d.redeemScriptHex}</code></dd>
          <dt>HASH160 of the redeem script (RIPEMD-160 of SHA-256)</dt><dd><code class="atlas-break">{d.redeemHash160Hex}</code></dd>
        </dl>
      </details>
    </>
  );
}
