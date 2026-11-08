import { Drawing, Value } from "../kit";
import type { DerivedPsbtV2Fixture, PsbtV2Violation } from "../types";
import { bare } from "./parts";

/** The rule a violation breaks, in a few capitals. */
export function ruleText(v: PsbtV2Violation): string {
  switch (v.rule) {
    case "v0-excludes": return "NOT ALLOWED IN V0";
    case "v2-excludes": return "NOT ALLOWED IN V2";
    case "v2-requires": return "MISSING IN V2";
    case "time-range": return `${v.value} < 500000000`;
    case "height-range": return v.value === 0 ? "0 IS NOT > 0" : `${v.value} ≥ 500000000`;
    default: return v.message.toUpperCase();
  }
}

/**
 * psbt-v2-invalid.v1 — static. BIP 370's invalid vectors as a table, one
 * row per vector: the line, the map and field its case names, and the rule
 * the model finds broken. Version 0 PSBTs carrying a version 2 field first;
 * then the PSBTs read as version 2 (including the version 0 PSBT relabelled
 * as version 2) carrying UNSIGNED_TX, missing a required field, or with an
 * out-of-range lock time.
 */
export function PsbtV2Invalid({ fixtures }: { fixtures: DerivedPsbtV2Fixture[] }) {
  for (const f of fixtures) if (f.derived.valid || !f.derived.violation) throw new Error(`psbt-v2-invalid: ${f.id} is not an invalid vector`);
  // Grouped by how the model reads them: line 307 is a version 0 PSBT relabelled as version 2.
  const v0 = fixtures.filter((f) => f.derived.version === 0);
  const v2 = fixtures.filter((f) => f.derived.version === 2);
  const x0 = 14, W = 344, rowH = 15;
  const col = { line: x0 + 4, scope: x0 + 34, field: x0 + 72, rule: x0 + 196 };
  const top0 = 50;
  const top2 = top0 + v0.length * rowH + 24;
  const H = top2 + v2.length * rowH + 10;
  const named = (f: DerivedPsbtV2Fixture) => {
    const m = f.label.match(/PSBT_[A-Z_]+/)![0];
    return m === "PSBT_GLOBAL_VERSION" ? "VERSION SET TO 2" : bare(m);
  };
  const row = (f: DerivedPsbtV2Fixture, i: number, top: number) => {
    const y = top + i * rowH;
    const v = f.derived.violation!;
    const scope = v.scope === "input" ? "INPUT" : v.scope === "output" ? "OUTPUT" : "GLOBAL";
    return (
      <g data-vector={f.id} data-rule={v.rule}>
        <rect class="k-cell k-fill--plain" x={x0} y={y} width={W - 2 * x0} height={rowH - 2} />
        <Value at={[col.line, y + 10]} text={`L${f.hexLine}`} size={7.5} cls="k-value--muted" />
        <Value at={[col.scope, y + 10]} text={scope} size={7} cls="k-value--muted" />
        <Value at={[col.field, y + 10]} text={named(f)} size={7.5} />
        <Value at={[col.rule, y + 10]} text={`✕ ${v.rule === "v2-excludes" && named(f) === "VERSION SET TO 2" ? "STILL HAS UNSIGNED_TX" : ruleText(v)}`} size={7.5} cls="k-value--fail" />
      </g>
    );
  };
  const desc =
    `BIP 370's ${fixtures.length} invalid vectors and the rule the model finds broken in each. ` +
    fixtures.map((f) => `Line ${f.hexLine}, “${f.label}”: ${f.derived.violation!.message}`).join(" ");
  return (
    <Drawing id="a22-invalid" width={W} height={H} title="Every invalid vector and the rule it breaks" desc={desc}>
      <Value at={[x0, 14]} text={`BIP 370'S ${fixtures.length} INVALID PSBTs · EACH REJECTED BY THE MODEL`} size={8.5} cls="k-value--label" />
      <Value at={[col.line, 30]} text="LINE" size={7} cls="k-value--muted" />
      <Value at={[col.scope, 30]} text="MAP" size={7} cls="k-value--muted" />
      <Value at={[col.field, 30]} text="FIELD THE CASE NAMES" size={7} cls="k-value--muted" />
      <Value at={[col.rule, 30]} text="RULE BROKEN" size={7} cls="k-value--muted" />
      <Value at={[x0, top0 - 6]} text={`READ AS VERSION 0: CARRIES A FIELD VERSION 2 ADDS · ${v0.length}`} size={8} cls="k-value--label" />
      {v0.map((f, i) => row(f, i, top0))}
      <Value at={[x0, top2 - 6]} text={`READ AS VERSION 2 · ${v2.length}`} size={8} cls="k-value--label" />
      {v2.map((f, i) => row(f, i, top2))}
    </Drawing>
  );
}
