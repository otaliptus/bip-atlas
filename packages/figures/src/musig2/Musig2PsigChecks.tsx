import type { DerivedMusig2PsigChecksFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;
const MARK = { valid: "✓ accepted", invalid: "✕ rejected", error: "✕ blamed" } as const;

/** musig2-psig-checks.v1 — static. BIP 327's partial-signature verification cases and what each does. */
export function Musig2PsigChecks({ fixture }: { fixture: DerivedMusig2PsigChecksFixture }) {
  return (
    <div class="atlas-mu-checks">
      <ul class="atlas-mu-checks__list">
        {fixture.derived.rows.map((r) => (
          <li data-verdict={r.verdict}>
            <span class="atlas-mu-checks__mark">{MARK[r.verdict]}</span>
            <span class="atlas-mu-checks__label">{r.label}</span>
            <span class="atlas-mu-checks__detail">signer {r.signer + 1} · <code>{short(r.psig)}</code> · {r.detail}</span>
          </li>
        ))}
      </ul>
      <p class="atlas-lab__source">Cases from BIP 327 sign_verify_vectors.json; each verdict recomputed by the tested PartialSigVerify, and the build fails unless it matches the vector.</p>
    </div>
  );
}
