import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { V1_HEADER, V2_OVERHEAD } from "@bip-atlas/models/v2constants";
import { Boundary, Computer, Drawing, Responsive, Value, idsFor } from "../kit";
import type { DerivedV2Fixture } from "../types";

interface Props {
  fixtures: DerivedV2Fixture[];
  figureId: string;
}

const s8 = (hex: string) => `${hex.slice(0, 8)}…`;
const STAGES = ["Keys out", "Shared secret", "Keys and session ID", "Terminator", "Packet"];
const NOTES = [
  "Each side sends a fresh public key as 64 ElligatorSwift bytes, which look random, and may add garbage.",
  "Each side computes the same shared secret. It never crosses the wire.",
  "HKDF turns the secret into four cipher keys, two garbage terminators and a session ID.",
  "Each side sends its garbage terminator, then encrypted packets: optional decoys, then a version packet. The first one authenticates its garbage.",
  "Every later byte belongs to an encrypted packet.",
];

/**
 * v2-handshake.v1 — the v2 transport chapter's hero (drawing-first).
 *
 * The two ends of a published BIP 324 vector across an open network, with
 * a listener on the wire. A stepper walks the handshake; the listener's
 * panel shows only what crosses the wire, and secrets stay on the two
 * sides. Every value was recomputed at build time by the tested model and
 * equals the vector's; the ElligatorSwift decodings are the vector's own.
 */
export function V2Handshake({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [at, setAt] = useState(0);
  const [v1, setV1] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived, p = d.packet;
  const k = hydrated ? at : STAGES.length - 1;
  const me = d.initiating ? "initiator" : "responder", them = d.initiating ? "responder" : "initiator";
  const showV1 = k === 4 && v1;
  const eve = [
    "KEYS + GARBAGE: RANDOM",
    ...(k >= 3 ? ["TERMINATORS: RANDOM"] : []),
    ...(k === 4 ? [showV1 ? "V1: READS EVERY HEADER" : `${p.totalLen} B PACKET: SIZE, TIMING`] : []),
  ];
  const status = `Step ${k + 1} of ${STAGES.length}, ${STAGES[k].toLowerCase()}: ${NOTES[k]}${k === 4 ? ` Packet ${p.index} from the ${me}: ${p.totalLen} bytes for ${p.contentsLen} byte${p.contentsLen === 1 ? "" : "s"} of contents${p.ignore ? ", a decoy" : ""}.` : ""}`;
  const desc = `BIP 324 vector ${f.label}, seen from the ${me}. ${status} On each side${k >= 1 ? `: shared secret ${d.sharedSecret}` : ": nothing derived yet"}${k >= 2 ? `, session ID ${d.sessionId}` : ""}. The listener on the wire sees: ${eve.join("; ").toLowerCase()}; never the secret or the keys.${showV1 ? ` In general, not for this vector: v1 frames every message with a ${V1_HEADER}-byte header in the clear; v2 adds ${V2_OVERHEAD + 1} bytes for a message with a short type ID, none in the clear.` : ""}`;

  const draw = (W: number) => {
    const ids = idsFor(`${figureId}-${W}`);
    const L = 12, R = W - 12, mid = W / 2, b1 = W * 0.33, b2 = W * 0.67, nw = W < 400;
    const side = (x: number, label: string, role: string, anchor: "start" | "end") => (
      <g>
        <Computer at={[x, 26]} />
        <Value at={[anchor === "start" ? L : W - L, 78]} text={label} size={8.5} anchor={anchor} cls="k-value--label" />
        <Value at={[anchor === "start" ? L : W - L, 90]} text={role.toUpperCase()} size={8.5} anchor={anchor} cls="k-value--muted" />
        {k >= 1 ? <Value at={[anchor === "start" ? L : W - L, 106]} text={`${nw ? "" : "SECRET "}${s8(d.sharedSecret)}`} size={8.5} anchor={anchor} cls="k-v2-sec" /> : null}
        {k >= 2 ? <Value at={[anchor === "start" ? L : W - L, 119]} text={nw ? "4 KEYS" : "4 CIPHER KEYS"} size={8.5} anchor={anchor} cls="k-v2-sec" /> : null}
        {k >= 2 ? <Value at={[anchor === "start" ? L : W - L, 132]} text={`${nw ? "ID " : "SESSION "}${s8(d.sessionId)}`} size={8.5} anchor={anchor} cls="k-value--hash" /> : null}
      </g>
    );
    const wire = (y: number, text: string, right: boolean, both = false) => (
      <g>
        <path class="k-line" d={right ? `M${L + 30} ${y} H${R - 30}` : `M${R - 30} ${y} H${L + 30}`} marker-end={ids.arrow} marker-start={both ? ids.arrow : undefined} />
        <rect class="k-cell k-fill--net" x={mid - 46} y={y - 7} width="92" height="14" />
        <text class="k-v2-b" x={mid} y={y + 3} text-anchor="middle">{text}</text>
      </g>
    );
    const segs: Array<[string, number, string]> = showV1 ? [["V1 HEADER, CLEAR", V1_HEADER, "plain"], ["PAYLOAD", 16, "plain"]] : [["LEN", 3, "net"], ["HDR+C", p.contentsLen + 1, "net"], ["TAG", 16, "net"]];
    const total = segs.reduce((n, s) => n + s[1], 0);
    let sx = b1 + 4;
    return (
      <Drawing id={`${figureId}-${W}`} width={W} height={230} title="From two public keys to an encrypted packet" desc={desc}>
        {side(L, "THIS SIDE", me, "start")}
        {side(W - L - 26, "PEER", them, "end")}
        <Boundary x={b1} y1={8} y2={140} label="open network" />
        <Boundary x={b2} y1={8} y2={140} label="" />
        {wire(30, "64 B KEY", d.initiating)}
        {wire(46, "64 B KEY", !d.initiating)}
        {k >= 3 ? wire(62, "TERMINATORS", true, true) : null}
        {k === 4 && segs.length
          ? segs.map(([t, n, r]) => {
              const w = Math.max(10, (n / total) * (b2 - b1 - 8));
              const x = sx;
              sx += w;
              return (
                <g>
                  <rect class={`k-cell k-fill--${r}`} x={x} y={100} width={w} height={16} />
                  {w > t.length * 5.4 + 4 ? <text class="k-v2-b" x={x + 3} y={111}>{t}</text> : null}
                </g>
              );
            })
          : null}
        {k === 4 && segs.length ? <path class="k-line" d={`M${b1 + 4} 121 H${b2 - 4}`} marker-end={ids.arrow} /> : null}
        {k === 4 ? <Value at={[b1 + 4, 94]} text={showV1 ? `V1 · ${V1_HEADER} B IN CLEAR` : `PACKET ${p.index} · ${p.totalLen} B`} size={8.5} cls="k-value--label" /> : null}
        <line class="k-leader k-dashed" x1={mid} y1={140} x2={mid} y2={158} />
        <Computer at={[mid - 13, 158]} />
        <Value at={[mid + 20, 166]} text="LISTENER SEES" size={8.5} cls="k-value--label" />
        {eve.map((t, i) => <Value at={[mid + 20, 179 + i * 12]} text={t} size={8.5} cls="k-value--muted" />)}
        <rect class="k-cell" x={L} y={170} width={W * 0.3} height={26} style={`fill:${ids.hatch}`} />
        <Value at={[L + 4, 212]} text="SECRET, KEYS: NOT ON THE WIRE" size={8} cls="k-value--muted" />
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Published packet vector">
            {fixtures.map((x) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-vec`} checked={x.id === id} onChange={() => setId(x.id)} aria-label={`${x.label}, ${x.shortLabel}`} />
                <span>{x.derived.packet.index}</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip" role="radiogroup" aria-label="Compare v1 and v2 framing">
            {["v2", "v1"].map((v) => (
              <label class="atlas-strip__opt" data-disabled={k === 4 ? undefined : "true"}>
                <input type="radio" name={`${figureId}-frame`} disabled={k !== 4} checked={(v === "v1") === v1} onChange={() => setV1(v === "v1")} />
                <span>{v === "v1" ? "v1 framing" : "v2 packet"}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the first vector at the last step. With JavaScript you can step through the handshake, choose among {fixtures.length} published vectors and compare v1 framing.</p>
      )}
      <Responsive wide={draw(640)} narrow={draw(330)} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step through the handshake">
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(at - 1)} disabled={at === 0} aria-label="Previous step">←</button>
          <input type="range" min={0} max={STAGES.length - 1} value={at} aria-label="Handshake step" aria-valuetext={`${at + 1}: ${STAGES[at]}`} onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))} />
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(at + 1)} disabled={at === STAGES.length - 1} aria-label="Next step">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this vector</summary>
        <dl class="atlas-hexlist">
          <dt>Shared secret</dt><dd><code class="atlas-break">{d.sharedSecret}</code></dd>
          <dt>Session ID</dt><dd><code class="atlas-break">{d.sessionId}</code></dd>
          <dt>Packet {p.index}: length, tag</dt><dd><code class="atlas-break">{p.lengthEnc}</code> <code class="atlas-break">{p.tag}</code></dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 324 packet_encoding_test_vectors.csv, line {f.source.line}. Recomputed by the tested model and equal to the vector{p.checkedBytes === p.totalLen ? "" : ` (the packet's last ${p.checkedBytes} bytes, all it publishes)`}; ElligatorSwift decodings are the vector's own, not computed here.</p>
    </div>
  );
}
