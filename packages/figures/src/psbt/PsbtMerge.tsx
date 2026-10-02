import { Arrow, Drawing, KeyGlyph, Machine, Value, idsFor } from "../kit";
import type { DerivedPsbtCombineFixture, DerivedPsbtTraceFixture, PsbtRecordView } from "../types";
import { MapCard, cardHeight, hex2, mapTitle, shortRole, type CardRow } from "./cards";

const sig = (r: PsbtRecordView) => `${r.scope}/${r.index}/${r.keyType}/${r.keyDataHex}/${r.valueHex}`;

/**
 * psbt-combine.v1 — static. The Combiner's merge for one input: each
 * signer's copy holds one partial signature the other lacks; the result
 * holds both. The tests merge the two published PSBTs in both orders and
 * get the published result.
 */
export function PsbtCombine({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const states = fixture.derived.states;
  const combined = states.find((s) => s.basedOn.length > 1);
  if (!combined) throw new Error("psbt-combine: no combiner state");
  const parts = combined.basedOn.map((id) => states.find((s) => s.id === id)!);
  const signatures = (s: (typeof states)[number]) => s.maps.find((m) => m.scope === "input" && m.index === 0)!.records.filter((r) => r.keyType === 2);
  const ids = idsFor("a05-handoff");
  const document = (x: number, y: number, title: string, from: number[]) => (
    <g transform={`translate(${x} ${y})`}>
      <path class="k-outline k-fill--plain" d="M0 0 H100 L118 18 V126 H0 Z" />
      <path class="k-line" d="M100 0 V18 H118" />
      <Value at={[10, 31]} text={title} size={10} />
      <Value at={[10, 48]} text="SAME PAYMENT" size={9} cls="k-value--muted" />
      <path class="k-leader" d="M10 57 H104 M10 63 H80" />
      {parts.map((s, k) => (
        <g data-contribution={s.id} data-present={from.includes(k) ? "true" : "false"}>
          <rect x="10" y={76 + k * 21} width="98" height="17" rx="3" class={`k-outline ${from.includes(k) ? "k-fill--sig" : "k-fill--plain k-dashed"}`} />
          <Value at={[17, 88 + k * 21]} text={from.includes(k) ? `${signatures(s).length} SIG · ${shortRole(s.id, s.role).toUpperCase().replace("SIGNER ", "")}` : "AWAITING COPY"} size={9.5} />
        </g>
      ))}
    </g>
  );
  return (
    <>
      <Drawing id="a05-handoff" width={344} height={370} title="Separate signatures, one transaction" desc={`Both signers receive the same updated PSBT. For input 0, ${parts.map((s) => `${shortRole(s.id, s.role)} adds ${signatures(s).length} partial signature`).join("; ")}. Their private keys stay with the signers. The Combiner merges their documents; input 0 then has ${signatures(combined).length} partial signatures. These are contributions to a PSBT, not a finalized network transaction.`}>
        <Value at={[172, 15]} text="INPUT 0 · TWO INDEPENDENT COPIES" size={9} anchor="middle" cls="k-value--label" />
        {parts.map((s, k) => (
          <g>
            {document(22 + k * 182, 46, shortRole(s.id, s.role).toUpperCase(), [k])}
            <KeyGlyph at={[27 + k * 182, 28]} role="secret" scale={0.7} />
            <Value at={[55 + k * 182, 35]} text="PRIVATE KEY" size={9.5} />
            <Arrow d={`M${81 + k * 182} 180 V197 H172 V207`} ids={ids} />
          </g>
        ))}
        <Value at={[172, 223]} text="BRING THE COPIES TOGETHER" size={9} anchor="middle" />
        {document(113, 230, "COMBINED", parts.map((_, k) => k))}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Inspect the records kept in the merge</summary>
        <CombineRecords fixture={fixture} />
      </details>
    </>
  );
}

/** Detailed record view, available after the document handoff is understood. */
function CombineRecords({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const states = fixture.derived.states;
  const comb = states.find((s) => s.basedOn.length > 1);
  if (!comb) throw new Error("psbt-combine: no combiner state");
  const parts = comb.basedOn.map((id) => states.find((s) => s.id === id)!);
  const inputIndex = 0;
  const mapOf = (s: (typeof states)[number]) => s.maps.find((m) => m.scope === "input" && m.index === inputIndex)!;
  const keysOf = (s: (typeof states)[number]) => new Set(mapOf(s).records.map(sig));
  const sets = parts.map(keysOf);
  const only = (r: PsbtRecordView, k: number) => sets[k].has(sig(r)) && sets.every((o, j) => j === k || !o.has(sig(r)));
  const ids = idsFor("a05-combine");
  const partRows = parts.map((p, k): CardRow[] => mapOf(p).records.map((r) => ({ r, mark: only(r, k) ? "unique" : undefined, tag: only(r, k) ? "only here" : undefined })));
  const outRows: CardRow[] = mapOf(comb).records.map((r) => {
    const k = parts.findIndex((_, j) => only(r, j));
    return { r, mark: k >= 0 ? "unique" : undefined, tag: k >= 0 ? `from ${shortRole(parts[k].id, parts[k].role)}` : undefined };
  });
  const top = 30;
  const hTop = Math.max(...partRows.map((rows) => cardHeight(rows.length)));
  const my = top + hTop + 64;
  const outY = my + 64;
  const H = outY + cardHeight(outRows.length) + 32;
  return (
    <Drawing
      id="a05-combine"
      width={344}
      height={H}
      title="Two copies, one merge"
      desc={`Input ${inputIndex}'s map in the two signers' PSBTs and after the Combiner. ${parts.map((p, k) => `${p.role}'s copy: ${partRows[k].length} records, ${partRows[k].filter((x) => x.mark).length} found only there`).join("; ")}. The combined map holds all ${outRows.length} records. Merging in either order gives the same bytes, the PSBT BIP 174 publishes at line ${comb.line}.`}
    >
      <Value at={[14, 14]} text={`INPUT ${inputIndex} MAP · ${parts.length} COPIES`} size={9} cls="k-value--label" />
      {parts.map((p, k) => (
        <>
          <Value at={[14 + k * 166, top - 4]} text={`${shortRole(p.id, p.role).toUpperCase()}'S COPY`} size={9} cls="k-value--muted" />
          <MapCard x={14 + k * 166} y={top} w={150} title={mapTitle("input", inputIndex)} rows={partRows[k]} hatch={ids.hatch} />
          <Arrow d={`M${89 + k * 166} ${top + hTop + 4} L${k ? 196 : 148} ${my - 30}`} ids={ids} />
        </>
      ))}
      <Machine at={[160, my + 8]} w={60} d={30} h={24} label="combine" role="plain" />
      <Value at={[232, my - 6]} text="A + B = B + A" size={9} cls="k-value--label" />
      <Arrow d={`M172 ${my + 54} V${outY - 4}`} ids={ids} />
      <MapCard x={72} y={outY} w={200} title={`${mapTitle("input", inputIndex)} · combined`} rows={outRows} hatch={ids.hatch} />
      <Value at={[72, H - 12]} text={`= BIP 174 LINE ${comb.line}, BYTE FOR BYTE`} size={9} cls="k-value--muted" />
    </Drawing>
  );
}

/**
 * psbt-finalize.v1 — static. What the Input Finalizer leaves in each input
 * map: the spent output kept, the final scriptSig and witness added, every
 * other record cleared (hatched).
 */
export function PsbtFinalize({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const fin = fixture.derived.states.find((s) => s.role === "Input Finalizer");
  if (!fin) throw new Error("psbt-finalize: no finalizer state");
  const ids = idsFor("a05-final");
  const inputs = fin.maps.filter((m) => m.scope === "input");
  const rowsOf = (m: (typeof inputs)[number]): CardRow[] => [
    ...m.records.map((r) => ({ r, mark: r.status === "added" ? ("new" as const) : undefined, tag: r.status === "added" ? `${r.valueHex.length / 2} B` : "kept" })),
    ...m.removed.map((r) => ({ r, mark: "removed" as const })),
  ];
  const H = 34 + Math.max(...inputs.map((m) => cardHeight(rowsOf(m).length))) + 40;
  return (
    <Drawing
      id="a05-final"
      width={344}
      height={H}
      title="What the finalizer leaves"
      desc={`The Input Finalizer's PSBT, BIP 174 line ${fin.line}. ${inputs.map((m) => `Input ${m.index}: kept ${m.records.filter((r) => r.status === "kept").map((r) => r.name).join(", ")}; added ${m.records.filter((r) => r.status === "added").map((r) => `${r.name} (${r.valueHex.length / 2} bytes)`).join(", ")}; cleared ${m.removed.map((r) => r.name).join(", ")}.`).join(" ")}`}
    >
      <Value at={[14, 14]} text={`AFTER THE INPUT FINALIZER · ${fin.bytes} BYTES`} size={9} cls="k-value--label" />
      {inputs.map((m, k) => <MapCard x={14 + k * 162} y={30} w={154} title={mapTitle(m.scope, m.index)} rows={rowsOf(m)} hatch={ids.hatch} />)}
      <rect class="k-cell k-mark--plain" x="14" y={H - 27} width="10" height="10" />
      <Value at={[30, H - 18]} text="NEW" size={9} cls="k-value--label" />
      <line class="k-strike" x1="70" y1={H - 22} x2="84" y2={H - 22} />
      <Value at={[86, H - 18]} text="CLEARED" size={9} cls="k-value--label" />
    </Drawing>
  );
}

/**
 * unknown-fields.v1 — static. BIP 174's two PSBTs whose records this
 * decoder cannot read (type 0xf0, dashed) and their combination, which keeps
 * all of them; the result matches the published one.
 */
export function UnknownFields({ fixture }: { fixture: DerivedPsbtCombineFixture }) {
  const { parts, combined } = fixture.derived;
  const ids = idsFor("a05-unknown");
  const where = (r: PsbtRecordView) => (r.scope === "global" ? "G" : `${r.scope === "input" ? "IN" : "OUT"}${r.index}`);
  const row = (r: PsbtRecordView): CardRow => ({ r, tag: r.constant ? where(r) : `${where(r)} · …${r.keyDataHex.slice(-4)}` });
  const top = 30;
  const hTop = Math.max(...parts.map((p) => cardHeight(p.records.length)));
  const my = top + hTop + 64;
  const outY = my + 64;
  const H = outY + cardHeight(combined.records.length) + 32;
  const unknown = (rs: PsbtRecordView[]) => rs.filter((r) => !r.constant).length;
  return (
    <>
      <Drawing
        id="a05-unknown"
        width={344}
        height={H}
        title="Unknown fields survive combining"
        desc={`${parts.map((p, k) => `PSBT ${k + 1} (BIP 174 line ${p.line}): ${p.records.length} records, ${unknown(p.records)} of an unknown type`).join("; ")}. Combined (line ${combined.line}): ${combined.records.length} records, all ${unknown(combined.records)} unknown ones kept, because their keys differ in the key data.`}
      >
        <Value at={[14, 14]} text={`TYPE ${[...new Set(combined.records.filter((r) => !r.constant).map((r) => hex2(r.keyType).toUpperCase().replace("0X", "0x")))].join(", ")}: NOT IN THE PSBT TYPE REGISTRY`} size={9} cls="k-value--label" />
        {parts.map((p, k) => (
          <>
            <Value at={[14 + k * 166, top - 4]} text={`PSBT ${k + 1} · LINE ${p.line}`} size={9} cls="k-value--muted" />
            <MapCard x={14 + k * 166} y={top} w={150} title="all maps" rows={p.records.map(row)} hatch={ids.hatch} />
            <Arrow d={`M${89 + k * 166} ${top + hTop + 4} L${k ? 196 : 148} ${my - 30}`} ids={ids} />
          </>
        ))}
        <Machine at={[160, my + 8]} w={60} d={30} h={24} label="combine" role="plain" />
        <Arrow d={`M172 ${my + 54} V${outY - 4}`} ids={ids} />
        <MapCard x={72} y={outY} w={200} title="combined · all maps" rows={combined.records.map(row)} hatch={ids.hatch} />
        <Value at={[72, H - 12]} text={`= BIP 174 LINE ${combined.line}, BYTE FOR BYTE`} size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact unknown records</summary>
        <dl class="atlas-hexlist">
          {combined.records.filter((r) => !r.constant).map((r) => (
            <>
              <dt>{where(r)} · type 0x{r.keyType.toString(16)}</dt>
              <dd>key data <code class="atlas-break">{r.keyDataHex}</code><br />value <code class="atlas-break">{r.valueHex}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
