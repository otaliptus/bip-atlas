import type { DerivedBip322FormatsFixture } from "../types";

/** bip322-formats.v1 — static. BIP 322's signature formats, read from the BIP's table. */
export function Bip322Formats({ fixture }: { fixture: DerivedBip322FormatsFixture }) {
  return (
    <div class="atlas-b322-formats">
      <div class="atlas-table-wrap" tabIndex={0} role="region" aria-label="BIP 322 signature formats">
      <table class="atlas-bf-gr__table">
        <thead><tr><th scope="col">format</th><th scope="col">script types</th><th scope="col">prefix</th><th scope="col">what the signature is</th></tr></thead>
        <tbody>
          {fixture.derived.rows.map((r) => (
            <tr data-legacy={r.name === "Legacy" ? "true" : "false"}><th scope="row">{r.name}</th><td>{r.scripts}</td><td><code>{r.prefix}</code></td><td>{r.format}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
      <p class="atlas-lab__source">Read from BIP 322’s “Types of Signatures” table (from line {fixture.source.line}). ¹ Technically possible but SHOULD NOT be used; the legacy format MAY be used but MUST be restricted to P2PKH. ² Excluding time-lock scripts.</p>
    </div>
  );
}
