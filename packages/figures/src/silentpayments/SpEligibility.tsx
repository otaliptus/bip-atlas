import type { DerivedSpEligibilityFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;
const KIND: Record<string, string> = { p2pkh: "P2PKH", "p2sh-p2wpkh": "P2SH-P2WPKH", p2wpkh: "P2WPKH", p2tr: "P2TR", other: "other" };
const kindOf = (i: { kind: string; skipped: string | null }) => (i.kind === "other" && i.skipped?.startsWith("P2SH") ? "P2SH" : KIND[i.kind]);

/** sp-input-eligibility.v1 — static. Which inputs of published vectors contribute a key, and why others do not. */
export function SpEligibility({ fixture }: { fixture: DerivedSpEligibilityFixture }) {
  return (
    <div class="atlas-sp-elig">
      {fixture.derived.rows.map((r) => (
        <section aria-label={r.comment}>
          <p class="atlas-sp-elig__head">{r.comment}</p>
          <ul class="atlas-sp-list">
            {r.inputs.map((i) => (
              <li data-counts={i.pubkey ? "true" : "false"}>
                <span class="atlas-sp-list__kind">{kindOf(i)}</span>
                <span>{i.pubkey ? <>counts: key <code>{short(i.pubkey)}</code></> : <em>skipped: {i.skipped}</em>}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p class="atlas-lab__source">Inputs from BIP 352’s test vectors, read by the tested model’s transcription of the reference get_pubkey_from_input.</p>
    </div>
  );
}
