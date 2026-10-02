import { Computer, Lamp, Value, type DrawingIds } from "../kit";
import type { Role } from "../kit";
import type { Musig2SessionDerived } from "../types";

/** First 8 hex digits and an ellipsis; figures using it also list the exact value. */
export const short = (hex: string) => `${hex.slice(0, 8)}…`;
export const ONE = "1".padStart(64, "0");

export type StageId = "keys" | "tweaks" | "round1" | "session" | "round2" | "aggregate";
export const STAGES: ReadonlyArray<{ id: StageId; title: string; note: string }> = [
  { id: "keys", title: "Key aggregation", note: "Each signer's public key, weighted by its coefficient, goes into one aggregate key Q. No interaction: anyone with the key list can do it." },
  { id: "tweaks", title: "Tweaks", note: "The aggregate key is tweaked, plain (as in BIP 32 derivation) or x-only (as in a Taproot commitment)." },
  { id: "round1", title: "Round 1: nonces", note: "Each signer sends a public nonce of two points. They are summed point by point into one aggregate nonce." },
  { id: "session", title: "Session values", note: "From the aggregate nonce, the key and the message, everyone computes the same b, R = R₁ + b·R₂ and the BIP 340 challenge e." },
  { id: "round2", title: "Round 2: partial signatures", note: "Each signer sends one 32-byte number. Each is checked against that signer's key and nonce." },
  { id: "aggregate", title: "Aggregate signature", note: "Add the partial signatures and the tweak adjustment. Pair the result with R’s x coordinate to form the 64-byte signature." },
];
/** The stages a session goes through: the tweak stage only when it has tweaks. */
export const stagesFor = (d: Musig2SessionDerived) => STAGES.filter((s) => s.id !== "tweaks" || d.tweaks.length > 0);

function Chip({ x, y, w, role, text, dashed = false }: { x: number; y: number; w: number; role: Role; text: string; dashed?: boolean }) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}${dashed ? " k-dashed" : ""}`} x={x} y={y} width={w} height="13" />
      <text class="k-value" x={x + 4} y={y + 9.5} style="font-size:8px">{text}</text>
    </g>
  );
}

/**
 * The signing table, drawn for one stage: signers as computers above a
 * table, each with the public things it has sent so far; on the table, the
 * aggregated values reached so far, or a hatched cloth when `reveal` is off.
 * Nothing secret is drawn: the published vectors carry no secret keys or
 * secret nonces, and each signer's own secrets are drawn only as a pink card
 * with no value when `secrets` is set.
 */
export function Scene({ d, upto, reveal, ids, W, y0 = 0, secrets = false }: { d: Musig2SessionDerived; upto: number; reveal: boolean; ids: DrawingIds; W: number; y0?: number; secrets?: boolean }) {
  const stages = stagesFor(d);
  const reached = (id: StageId) => {
    const i = stages.findIndex((s) => s.id === id);
    return i >= 0 && i <= upto;
  };
  const cols = Math.min(d.signers.length, W >= 600 ? 4 : 2);
  const colW = (W - 20) / cols;
  // Room for every item a signer ever shows, so the table does not jump between stages.
  const blockH = blockHeight(secrets);
  const rows = Math.ceil(d.signers.length / cols);
  const tableY = y0 + rows * blockH + 18;
  const lines: Array<{ role: Role; text: string; ok?: boolean }> = [];
  if (reached("keys")) lines.push({ role: "public", text: `Q = ${short(d.aggXonly)} (aggregate key)` });
  if (reached("tweaks")) d.tweaks.forEach((t, i) => lines.push({ role: "public", text: `after ${t.xonly ? "x-only" : "plain"} tweak ${i + 1}: ${short(t.resultXonly)}` }));
  if (reached("round1")) lines.push({ role: "public", text: `aggregate nonce R₁ ${short(d.aggnonce[0])} R₂ ${short(d.aggnonce[1])}` });
  if (reached("session")) {
    lines.push({ role: "hash", text: `b ${short(d.b)} · e ${short(d.e)}` });
    lines.push({ role: "public", text: `R = R₁ + b·R₂: ${short(d.R)}` });
  }
  if (reached("aggregate")) lines.push({ role: "sig", text: `signature ${short(d.signature.slice(0, 64))} ${short(d.signature.slice(64))}`, ok: d.signatureVerifies });
  const tableH = Math.max(1, lines.length) * 17 + 22;
  return (
    <g class="k-scene">
      {d.signers.map((s, i) => {
        const x = 10 + (i % cols) * colW;
        const y = y0 + Math.floor(i / cols) * blockH;
        const cx = x + 50;
        const items: Array<{ role: Role; text: string; dashed?: boolean; lamp?: boolean }> = [];
        if (secrets) items.push({ role: "secret", text: reached("round2") ? "key; nonce used" : reached("round1") ? "secret key, nonce" : "secret key", dashed: true });
        if (reached("keys")) items.push({ role: "public", text: `P${i + 1} ${short(s.pubkey)}` }, { role: "hash", text: `a = ${s.coefficient === ONE ? "1 (2nd key)" : short(s.coefficient)}` });
        if (reached("round1")) items.push({ role: "public", text: `own R₁ ${short(s.pubnonce[0])}` }, { role: "public", text: `own R₂ ${short(s.pubnonce[1])}` });
        if (reached("round2")) items.push({ role: "sig", text: `s${i + 1} ${short(s.psig)}`, lamp: true });
        return (
          <g data-signer={i + 1}>
            <Computer at={[x + 12, y + 4]} />
            <Value at={[x + 25, y + 40]} text={`S${i + 1}`} size={8} anchor="middle" cls="k-value--label" />
            {items.map((it, k) => (
              <g>
                <Chip x={cx} y={y + 2 + k * 15} w={colW - 66} role={it.role} text={it.text} dashed={it.dashed} />
                {it.lamp ? <Lamp at={[cx + colW - 58, y + 8.5 + k * 15]} state={s.psigVerifies ? "on" : "off"} r={4} /> : null}
              </g>
            ))}
            <path class="k-leader k-dashed" d={`M${x + 25} ${y + 48} V${tableY - 6}`} marker-end={ids.arrow} />
          </g>
        );
      })}
      <rect class="k-outline k-fill--plain" x="10" y={tableY} width={W - 20} height={tableH} style={reveal ? undefined : `fill:${ids.hatch}`} />
      <line class="k-ring" x1="24" y1={tableY + tableH} x2="24" y2={tableY + tableH + 14} />
      <line class="k-ring" x1={W - 24} y1={tableY + tableH} x2={W - 24} y2={tableY + tableH + 14} />
      <Value at={[18, tableY + 13]} text={reveal ? "THE TABLE · AGGREGATED VALUES" : "AGGREGATED VALUES · HIDDEN IN THIS VIEW"} size={8.5} cls="k-value--label" />
      {reveal
        ? lines.map((l, k) => (
            <g>
              <Chip x={18} y={tableY + 19 + k * 17} w={Math.min(W - 60, 300)} role={l.role} text={l.text} />
              {l.ok !== undefined ? <Lamp at={[Math.min(W - 60, 300) + 32, tableY + 25.5 + k * 17]} state={l.ok ? "on" : "off"} r={4} /> : null}
            </g>
          ))
        : null}
    </g>
  );
}

/** Height of a Scene, for the enclosing Drawing. */
const blockHeight = (secrets: boolean) => (secrets ? 6 : 5) * 15 + 14;

export const sceneHeight = (d: Musig2SessionDerived, W: number, upto: number, y0 = 0, secrets = false) => {
  const cols = Math.min(d.signers.length, W >= 600 ? 4 : 2);
  const stages = stagesFor(d);
  const at = (id: StageId) => stages.findIndex((s) => s.id === id) <= upto && stages.some((s) => s.id === id);
  const lines = (at("keys") ? 1 : 0) + (at("tweaks") ? d.tweaks.length : 0) + (at("round1") ? 1 : 0) + (at("session") ? 2 : 0) + (at("aggregate") ? 1 : 0);
  return y0 + Math.ceil(d.signers.length / cols) * blockHeight(secrets) + 18 + Math.max(1, lines) * 17 + 22 + 18;
};
