import type { DerivedPsbtCombineFixture, PsbtRecordView } from "../types";

const row = (r: PsbtRecordView) => (
  <li class="atlas-env__record" data-known={r.constant ? "true" : "false"}>
    <span class="atlas-env__type">{r.scope === "global" ? "G" : r.scope === "input" ? `I${r.index}` : `O${r.index}`} · 0x{r.keyType.toString(16).padStart(2, "0")}</span>
    <span class="atlas-env__name">{r.constant ? r.name : "Unknown type"}</span>
    <code class="atlas-env__kv">{r.keyDataHex || "—"} → {r.valueHex}</code>
  </li>
);

/** unknown-fields.v1 — static. Combining two PSBTs keeps key-value pairs the reader does not understand. */
export function UnknownFields({ fixture }: { fixture: DerivedPsbtCombineFixture }) {
  const { parts, combined } = fixture.derived;
  const unknown = (rs: PsbtRecordView[]) => rs.filter((r) => !r.constant);
  return (
    <div class="atlas-unknown">
      <div class="atlas-unknown__inputs">
        {parts.map((p, i) => (
          <section class="atlas-env__map" aria-label={`PSBT ${i + 1}`}>
            <h3 class="atlas-env__title">PSBT {i + 1} · BIP 174 line {p.line}</h3>
            <ul class="atlas-env__records">{unknown(p.records).map(row)}</ul>
          </section>
        ))}
      </div>
      <div class="atlas-split__arrow" aria-hidden="true">↓ Combiner</div>
      <section class="atlas-env__map atlas-unknown__out" aria-label="Combined PSBT">
        <h3 class="atlas-env__title">Combined · matches BIP 174 line {combined.line}</h3>
        <ul class="atlas-env__records">{unknown(combined.records).map(row)}</ul>
      </section>
    </div>
  );
}
