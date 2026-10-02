import { Bracket, Drawing, Value } from "../kit";
import { PartsRow, placeParts } from "../tx/PartsRow";
import type { DerivedPsbtTraceFixture, PsbtRecordView } from "../types";

const sig = (r: PsbtRecordView) => `${r.scope}/${r.index}/${r.keyType}/${r.keyDataHex}/${r.valueHex}`;
const len = (hex: string) => (hex.length / 2).toString(16).padStart(2, "0");

/**
 * psbt-records.v1 — static. Two records of the same type in one map: the
 * Combiner's input 0 holds both signers' partial signatures. Each key is the
 * type byte followed by the signer's public key, so the full keys differ and
 * both records are allowed.
 */
export function PsbtRecords({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const states = fixture.derived.states;
  const combiner = states.find((s) => s.basedOn.length > 1);
  if (!combiner) throw new Error("psbt-records: no combiner state");
  const input = combiner.maps.find((m) => m.scope === "input" && m.records.filter((r) => r.name === "Partial Signature").length >= 2);
  if (!input) throw new Error("psbt-records: no input with two partial signatures");
  const sigs = input.records.filter((r) => r.name === "Partial Signature");
  const fromRole = (r: PsbtRecordView) => {
    const s = combiner.basedOn.map((id) => states.find((x) => x.id === id)!).find((x) => x.maps.flatMap((m) => m.records).some((q) => sig(q) === sig(r)));
    if (!s) throw new Error("psbt-records: a partial signature comes from no signer");
    return s.role;
  };
  const rows = sigs.map((r, k) => {
    const y = 50 + k * 92;
    const placed = placeParts(
      [
        { kind: "byte", hex: (1 + r.keyDataHex.length / 2).toString(16).padStart(2, "0") },
        { kind: "byte", hex: r.keyType.toString(16).padStart(2, "0") },
        { kind: "block", bytes: r.keyDataHex.length / 2, role: "public", text: `key ${r.keyDataHex.length / 2} B` },
        { kind: "byte", hex: len(r.valueHex) },
        { kind: "block", bytes: r.valueHex.length / 2, role: "sig", text: `signature · ${r.valueHex.length / 2} B` },
      ],
      14, 18, 1.75,
    );
    return { r, k, y, placed, role: fromRole(r) };
  });
  return (
    <>
      <Drawing
        id="a05-records"
        width={344}
        height={50 + rows.length * 92}
        title="Two keys of one type"
        desc={`Input ${input.index} of the Combiner's PSBT holds ${sigs.length} partial signature records. ${rows.map((x) => `From ${x.role}: key = type 0x02 followed by the ${x.r.keyDataHex.length / 2}-byte public key ${x.r.keyDataHex}; value = a ${x.r.valueHex.length / 2}-byte signature.`).join(" ")} The type is the same, the key data differs, so the full keys are different and both records may sit in one map.`}
      >
        <Value at={[14, 14]} text={`INPUT ${input.index} MAP · ${sigs.length} PARTIAL SIGNATURES`} size={9} cls="k-value--label" />
        {rows.map((x) => (
          <g>
            <Value at={[14, x.y - 18]} text={`FROM ${x.role.toUpperCase()}`} size={8.5} cls="k-value--muted" />
            <PartsRow placed={x.placed} y={x.y} />
            <Bracket x1={x.placed[1].x} x2={x.placed[2].x + x.placed[2].w} y={x.y + 24} text={`key · ${1 + x.r.keyDataHex.length / 2} B`} align="start" />
            <Bracket x1={x.placed[4].x} x2={x.placed[4].x + x.placed[4].w} y={x.y + 24} text={`value · ${x.r.valueHex.length / 2} B`} align="start" />
            <Value at={[x.placed[1].x, x.y + 58]} text={`02 + ${x.r.keyDataHex.slice(0, 10)}…`} size={9} cls="k-value--muted" />
          </g>
        ))}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact keys and values</summary>
        <dl class="atlas-hexlist">
          {rows.map((x) => (
            <>
              <dt>From {x.role}: key data (public key)</dt><dd><code class="atlas-break">{x.r.keyDataHex}</code></dd>
              <dt>From {x.role}: value (signature)</dt><dd><code class="atlas-break">{x.r.valueHex}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
