import type { DerivedDescriptorIndexFixture } from "../types";

const CTX: Record<string, string> = { top: "top level", sh: "in sh()", wsh: "in wsh()", tr: "in a tr() tree" };

/** descriptor-expressions.v1 — static. BIP 380's index of script expressions, with where each may appear. */
export function DescriptorIndex({ fixture }: { fixture: DerivedDescriptorIndexFixture }) {
  return (
    <div class="atlas-ds-index">
      <div class="atlas-table-wrap" tabindex={0} role="region" aria-label="Script expressions">
        <table class="manual-table atlas-ds-index__table">
          <caption class="manual-sr-only">Script expressions, the BIP that defines each, where it may appear and what it produces</caption>
          <thead>
            <tr><th scope="col">Expression</th><th scope="col">BIP</th><th scope="col">May appear</th><th scope="col">Produces</th></tr>
          </thead>
          <tbody>
            {fixture.derived.rows.map((r) => (
              <tr data-scope={r.contexts ? "in" : "out"}>
                <th scope="row"><code>{r.expression}</code></th>
                <td>{r.bip}</td>
                <td>{r.contexts ? r.contexts.map((c) => CTX[c]).join(", ") : "not covered here"}</td>
                <td>{r.template ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="atlas-lab__source">Rows from BIP 380’s Appendix B (lines {fixture.tableFrom}–{fixture.tableTo}); placement rules from BIPs 381–386 as the tested model enforces them. BIPs 390 and 392 are outside this chapter’s pinned sources.</p>
    </div>
  );
}
