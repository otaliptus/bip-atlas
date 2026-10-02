import type { Role } from "../kit";
import type { PsbtRecordView } from "../types";

/** Short drawn name of a record, from its registry name (never a value). */
export function shortName(r: Pick<PsbtRecordView, "name" | "constant" | "keyType">): string {
  if (!r.constant) return "unknown";
  const n: Record<string, string> = {
    "Unsigned Transaction": "unsigned tx",
    "Non-Witness UTXO": "non-witness UTXO",
    "Witness UTXO": "witness UTXO",
    "Partial Signature": "partial sig",
    "Sighash Type": "sighash type",
    "Redeem Script": "redeem script",
    "Witness Script": "witness script",
    "BIP 32 Derivation Path": "BIP 32 path",
    "Finalized scriptSig": "final scriptSig",
    "Finalized scriptWitness": "final witness",
  };
  return n[r.name] ?? r.name;
}

/** Palette role: partial signatures blue, BIP 32 paths (keyed by a public key) green, everything else plain. */
export function recordRole(r: Pick<PsbtRecordView, "name">): Role {
  return r.name === "Partial Signature" ? "sig" : r.name === "BIP 32 Derivation Path" ? "public" : "plain";
}

/** Short role names for the actor labels of the trace. */
export const shortRole = (id: string, role: string) =>
  ({ creator: "creator", updater: "updater", "updater-sighash": "updater 2", "signer-a": "signer A", "signer-b": "signer B", combiner: "combiner", finalizer: "finalizer", extractor: "extractor" } as Record<string, string>)[id] ?? role;

export const mapTitle =(scope: string, index: number) => (scope === "global" ? "global" : `${scope} ${index}`);
export const hex2 = (n: number) => `0x${n.toString(16).padStart(2, "0")}`;

export interface CardRow {
  r: PsbtRecordView;
  mark?: "new" | "removed" | "unique";
  /** Short note drawn at the right end of the row (e.g. where it came from). */
  tag?: string;
}

export const ROW = 15;
export const cardHeight = (rows: number) => 16 + Math.max(rows, 1) * ROW + 4;

/**
 * One key-value map drawn as a card: a title tab, then one row per record
 * (type byte, then the record's name). New records get a heavy outline and a
 * black type chip; cleared ones are struck through and faded (their names
 * stay: they are known, just gone); records of an unknown type are dashed;
 * an empty map shows its lone 0x00 separator.
 */
export function MapCard({ x, y, w, title, rows }: { x: number; y: number; w: number; title: string; rows: CardRow[]; hatch?: string }) {
  const h = cardHeight(rows.length);
  return (
    <g class="k-mapcard" data-map={title}>
      <rect class="k-outline k-fill--plain" x={x} y={y} width={w} height={h} />
      <text class="k-card__t" x={x + 5} y={y + 11}>{title.toUpperCase()}</text>
      {rows.length === 0 ? <text class="k-card__empty" x={x + 5} y={y + 16 + 11}>EMPTY · 0x00</text> : null}
      {rows.map(({ r, mark, tag }, k) => {
        const ry = y + 16 + k * ROW;
        const removed = mark === "removed";
        const role = recordRole(r);
        const hot = mark === "new" || mark === "unique";
        return (
          <g data-record={r.name} data-mark={mark} class={removed ? "k-faded" : undefined}>
            <rect class={`k-cell ${hot ? "k-mark--plain" : "k-fill--plain"}`} x={x + 4} y={ry} width="20" height={ROW - 2} />
            <text class={`k-card__type${hot ? " k-card__type--on" : ""}`} x={x + 14} y={ry + 9.6} text-anchor="middle">{r.keyType.toString(16).padStart(2, "0")}</text>
            <rect class={`k-cell k-fill--${removed ? "plain" : role}${hot ? " k-cell--em" : ""}${!r.constant ? " k-dashed" : ""}`} x={x + 24} y={ry} width={w - 28} height={ROW - 2} />
            <text class="k-card__name" x={x + 28} y={ry + 9.6}>{shortName(r)}</text>
            {removed ? <line class="k-strike" x1={x + 6} y1={ry + 6.5} x2={x + w - 6} y2={ry + 6.5} /> : null}
            {tag ? <text class="k-card__tag" x={x + w - 7} y={ry + 9.6} text-anchor="end">{tag}</text> : null}
          </g>
        );
      })}
    </g>
  );
}
