import { Arrow, Drawing, Value, idsFor } from "../kit";
import type { DerivedPsbtV2Fixture } from "../types";
import { bare } from "./parts";

/** Field roles: time for lock times and sequences, hash for the previous txid. */
const roleOf = (name: string) => (/LOCKTIME|SEQUENCE/.test(name) ? "time" : /TXID/.test(name) ? "hash" : "plain");

/**
 * psbt-v2-maps.v1 — static. A published version 2 PSBT's maps, record by
 * record, with BIP 370's fields set apart from BIP 174's; then the unsigned
 * transaction the model builds from those fields, part by part. Converted
 * to version 0, those bytes would become PSBT_GLOBAL_UNSIGNED_TX.
 */
export function PsbtV2Maps({ fixture: f }: { fixture: DerivedPsbtV2Fixture }) {
  const d = f.derived;
  const tx = d.unsignedTx;
  const lt = d.lockTime!;
  if (!tx) throw new Error(`psbt-v2-maps: ${f.id} has no unsigned transaction`);
  const ids = idsFor("a22-maps");
  const x0 = 14, W = 344, rowH = 15;
  // Maps stacked: each a titled box with one row per record.
  let y = 34;
  const maps = d.maps.map((m) => {
    const top = y;
    y += 20 + m.records.length * rowH + 10;
    return { m, top };
  });
  const txTop = y + 26;
  const bytes = tx.hex.length / 2;
  const partH = 15;
  const H = txTop + tx.parts.length * partH + 50;
  // Inputs and outputs are numbered from 1, as BIP 370's case lines do.
  const title = (m: (typeof d.maps)[number]) => (m.scope === "global" ? "GLOBAL MAP" : `${m.scope.toUpperCase()} ${m.index! + 1} MAP`);
  const one = (label: string) => label.replace(/(input|output) (\d+)/, (_, w, n) => `${w} ${Number(n) + 1}`);
  const desc =
    `${f.label} (BIP 370 line ${f.hexLine}). ` +
    d.maps.map((m) => `${title(m).toLowerCase()}: ${m.records.map((r) => `${r.name} (${r.bytes} bytes${r.v2 ? ", BIP 370" : ""})`).join(", ")}`).join("; ") +
    `. The unsigned transaction built from the BIP 370 fields is ${bytes} bytes: ${tx.parts.map((p) => `${one(p.label)} from ${p.field}`).join(", ")}.`;
  return (
    <>
      <Drawing id="a22-maps" width={W} height={H} title="Where a version 2 PSBT keeps the transaction" desc={desc}>
        <Value at={[x0, 14]} text={`BIP 370 LINE ${f.hexLine} · ALL VERSION 2 FIELDS`} size={8.5} cls="k-value--label" />
        <Value at={[x0, 26]} text="OUTLINED: ADDED BY BIP 370 · PLAIN: BIP 174'S OWN FIELDS" size={7.5} cls="k-value--muted" />
        {maps.map(({ m, top }) => (
          <g data-map={`${m.scope}${m.index ?? ""}`}>
            <rect class="k-outline k-fill--plain" x={x0} y={top} width={W - 2 * x0} height={14 + m.records.length * rowH + 4} />
            <Value at={[x0 + 6, top + 11]} text={title(m)} size={8} cls="k-value--label" />
            {m.records.map((r, i) => {
              const ry = top + 16 + i * rowH;
              return (
                <g>
                  <rect class={`k-cell k-fill--${r.v2 ? roleOf(r.name) : "plain"}${r.v2 ? " k-cell--em" : ""}`} x={x0 + 6} y={ry} width={W - 2 * x0 - 12} height={rowH - 2} />
                  <Value at={[x0 + 11, ry + 10]} text={bare(r.name)} size={8} cls={r.v2 ? "" : "k-value--muted"} />
                  <Value at={[W - x0 - 11, ry + 10]} text={`${r.bytes} B`} size={8} anchor="end" cls="k-value--muted" />
                </g>
              );
            })}
          </g>
        ))}
        <Arrow d={`M${W / 2} ${y - 6} V${txTop - 22}`} ids={ids} />
        <Value at={[x0, txTop - 8]} text={`THE UNSIGNED TRANSACTION THEY DESCRIBE · ${bytes} BYTES`} size={8} cls="k-value--label" />
        {tx.parts.map((p, i) => {
          const py = txTop + i * partH;
          const from = p.id === "locktime" && lt.kind === "height" && lt.accepted.time ? "both types fit, so the height is used" : p.scope === "computed" ? p.field : `← ${bare(p.field)}${p.index !== undefined ? ` (${p.scope.toUpperCase()} ${p.index + 1})` : ""}`;
          return (
            <g data-part={p.id}>
              <rect class={`k-cell k-fill--${p.id === "locktime" ? "time" : roleOf(p.field)}${p.scope === "computed" ? " k-dashed" : ""}`} x={x0} y={py} width={W - 2 * x0} height={partH - 2} />
              <Value at={[x0 + 5, py + 10]} text={p.label.replace(/^(input|output) \d · /, "")} size={8} />
              <Value at={[x0 + 116, py + 10]} text={`${p.hex.length / 2} B`} size={7.5} anchor="end" cls="k-value--muted" />
              <Value at={[x0 + 124, py + 10]} text={from} size={7.5} cls={p.scope === "computed" ? "k-value--muted" : ""} />
            </g>
          );
        })}
        <Value at={[x0, H - 22]} text="DASHED: NOT COPIED FROM A FIELD" size={7.5} cls="k-value--muted" />
        <Value at={[x0, H - 8]} text="IN VERSION 0 THESE BYTES ARE ONE FIELD: UNSIGNED_TX" size={7.5} cls="k-value--label" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>The transaction, part by part</summary>
        <dl class="atlas-hexlist">
          {tx.parts.map((p) => <><dt>{one(p.label)} ← {p.field}</dt><dd><code class="atlas-break">{p.hex}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
