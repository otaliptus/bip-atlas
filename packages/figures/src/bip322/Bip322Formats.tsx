import type { DerivedBip322FormatsFixture } from "../types";

/** bip322-formats.v1 — static. BIP 322's signature formats, read from the BIP's table. */
export function Bip322Formats({ fixture }: { fixture: DerivedBip322FormatsFixture }) {
  return (
    <div class="atlas-b322-formats">
      <table class="atlas-bf-gr__table">
        <thead><tr><th scope="col">format</th><th scope="col">script types</th><th scope="col">prefix</th><th scope="col">what the signature is</th></tr></thead>
        <tbody>
          {fixture.derived.rows.map((r) => (
            <tr data-legacy={r.name === "Legacy" ? "true" : "false"}><th scope="row">{r.name}</th><td>{r.scripts}</td><td><code>{r.prefix}</code></td><td>{r.format}</td></tr>
          ))}
        </tbody>
      </table>
      <p class="atlas-lab__source">Read from BIP 322’s “Types of Signatures” table (from line {fixture.source.line}). Legacy is the old signmessage format, allowed only for P2PKH; P2WSH and P2TR in the simple format exclude time-lock scripts.</p>
    </div>
  );
}
