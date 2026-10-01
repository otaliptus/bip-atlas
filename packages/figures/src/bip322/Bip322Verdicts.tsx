import type { DerivedBip322VerdictsFixture } from "../types";

/** bip322-verdicts.v1 — static. The three verification outcomes, one published vector each. */
export function Bip322Verdicts({ fixture }: { fixture: DerivedBip322VerdictsFixture }) {
  return (
    <div class="atlas-b322-verdicts">
      {fixture.derived.rows.map((r) => (
        <section class="atlas-b322-verdict" data-state={r.state} aria-label={`${r.state}: ${r.label}`}>
          <p class="atlas-b322-verdicts__state">{r.state}</p>
          <p><strong>{r.label}</strong>: message <q>{r.message}</q></p>
          <p class="atlas-b322-verdicts__detail">{r.detail}</p>
        </section>
      ))}
      <p class="atlas-lab__source">Vectors from BIP 322’s test files, checked by the tested model. “Inconclusive” here means this model does not decode proof-of-funds PSBTs, so it cannot check the scripts they satisfy.</p>
    </div>
  );
}
