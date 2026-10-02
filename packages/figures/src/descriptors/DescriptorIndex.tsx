import { Drawing, Value } from "../kit";
import type { DerivedDescriptorIndexFixture } from "../types";

const CTX = [
  { id: "top", label: "TOP" },
  { id: "sh", label: "IN sh()" },
  { id: "wsh", label: "IN wsh()" },
  { id: "tr", label: "IN tr()" },
] as const;

/**
 * descriptor-expressions.v1 — static. BIP 380's index of script
 * expressions as a map of where each may appear: one row per expression, one
 * column per context, a filled mark where the tested model allows it.
 * Expressions outside this chapter's sources are drawn hatched.
 */
export function DescriptorIndex({ fixture }: { fixture: DerivedDescriptorIndexFixture }) {
  const rows = fixture.derived.rows;
  const RH = 19, X0 = 120, CW = 50, Y0 = 34;
  const desc =
    `BIP 380's index of script expressions (lines ${fixture.tableFrom}–${fixture.tableTo}): ` +
    rows.map((r) => `${r.expression}, BIP ${r.bip}: ${r.contexts ? `allowed ${r.contexts.map((c) => (c === "top" ? "at the top level" : `inside ${c}()`)).join(", ")}` : "outside this chapter's sources"}`).join("; ") + ".";
  return (
    <>
      <Drawing id="a13-index" width={344} height={Y0 + rows.length * RH + 40} title="Where each expression may go" desc={desc}>
        {CTX.map((c, j) => <Value at={[X0 + j * CW + CW / 2, Y0 - 10]} text={c.label} anchor="middle" size={9} cls="k-value--label" />)}
        {rows.map((r, i) => {
          const y = Y0 + i * RH;
          return (
            <g>
              <Value at={[8, y + 13]} text={r.expression.length > 15 ? `${r.expression.slice(0, 14)}…` : r.expression} size={9.5} />
              <Value at={[X0 - 6, y + 13]} text={String(r.bip)} anchor="end" size={9} cls="k-value--muted" />
              {CTX.map((c, j) => {
                const ok = r.contexts?.includes(c.id) ?? false;
                return (
                  <g>
                    <rect class="k-cell k-fill--plain" x={X0 + j * CW} y={y} width={CW} height={RH} style={r.contexts ? undefined : "fill:url(#a13-index-hatch)"} />
                    {ok ? <circle class="k-mark--plain" cx={X0 + j * CW + CW / 2} cy={y + RH / 2} r="4.5" /> : null}
                  </g>
                );
              })}
            </g>
          );
        })}
        <circle class="k-mark--plain" cx="12" cy={Y0 + rows.length * RH + 20} r="4.5" />
        <Value at={[22, Y0 + rows.length * RH + 23]} text="ALLOWED · HATCHED: NOT COVERED HERE" size={9} cls="k-value--label" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>What each expression produces</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {rows.map((r) => <><dt>{r.expression} · BIP {r.bip}</dt><dd>{r.template ?? "outside this chapter’s sources"}</dd></>)}
        </dl>
      </details>
    </>
  );
}
