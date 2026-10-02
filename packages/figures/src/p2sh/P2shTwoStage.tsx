import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Drawing, IsoBox, Machine, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedP2shFixture } from "../types";
import { Padlock, StackPlates, stackHeight } from "./stack";

interface Props {
  fixtures: DerivedP2shFixture[];
  figureId: string;
  /** Starting state; the no-JS render uses its own (revealed, last stage). */
  initial?: { id: string; revealed: boolean; stage: number };
}

const KIND: Record<string, string> = { legacy: "legacy P2SH", "p2sh-p2wpkh": "P2SH-wrapped P2WPKH", "p2sh-p2wsh": "P2SH-wrapped P2WSH" };
const CHIP: Record<string, string> = { "push-only": "push-only", "hash-match": "hash check", redeem: "script runs", witness: "witness checked" };
const short = (hex: string, n = 8) => `${hex.slice(0, n)}…`;

/**
 * p2sh-two-stage.v1 — the P2SH chapter's hero (drawing-first).
 *
 * The output drawn as a locked box whose lock is only a 20-byte hash, the
 * redeem script beside it (hatched until a spend reveals it), and BIP 16's
 * stages for a published spend: the scriptSig's pushes become the stack, the
 * top item is hashed and compared with the lock, then the script runs on
 * what is left (or, for wrapped SegWit, the witness is checked). Everything
 * is recorded at build time by the tested model; nothing here signs.
 */
export function P2shTwoStage({ fixtures, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(initial?.id ?? fixtures[0].id);
  const [revealed, setRevealed] = useState(initial?.revealed ?? false);
  const [stage, setStage] = useState(initial?.stage ?? 0);
  const f = fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`p2sh-two-stage: no fixture ${id}`);
  const d = f.derived;
  const live = hydrated || initial;
  const shown = live ? revealed : true;
  const at = live ? Math.min(stage, d.stages.length - 1) : d.stages.length - 1;
  const s = d.stages[at];
  const ok = d.stages.slice(0, at + 1).every((x) => x.ok);

  const status = !shown
    ? `Before the spend: the output holds only the 20-byte hash ${short(d.committedHashHex)}; the redeem script is not known yet.`
    : `${f.label}, stage ${at + 1} of ${d.stages.length}: ${s.title}. ${s.note.charAt(0).toUpperCase()}${s.note.slice(1)}.`;
  const describe = () =>
    `The output is ${d.scriptPubKeyHex.length / 2} bytes: OP_HASH160, the 20-byte hash ${d.committedHashHex}, OP_EQUAL. ` +
    (shown
      ? `The spend reveals the ${d.redeemScriptHex.length / 2}-byte redeem script, ${d.redeemAsm} (${KIND[d.kind]}). Stages: ${d.stages.map((x, i) => `${i + 1} ${x.title}, ${i <= at ? (x.ok ? "passes" : "fails") : "not yet shown"}`).join("; ")}. ${status}`
      : "The redeem script is not shown: nothing can be checked until a spend reveals it.");

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${w}`;
    const ids = idsFor(fid);
    const x0 = wide ? 20 : 14;
    // Output: a box with a hash lock, and its 23-byte script.
    const cellsX = wide ? 150 : 120;
    const hashW = wide ? 120 : 104;
    const card = wide ? { x: 360, y: 34, w: 270 } : { x: x0, y: 112, w: 302 };
    const chipsY = wide ? 112 : 182;
    const chipW = wide ? 196 : 98;
    const areaY = chipsY + 44;
    const area = stageArea(ids, wide, x0, areaY);
    const H = areaY + area.h + 16;
    return (
      <Drawing id={fid} width={W} height={H} title="One push, two evaluations" desc={describe()}>
        <Value at={[x0, 14]} text={`${shown ? f.label.toUpperCase() : "THE OUTPUT ALONE"} · ${(f.shortLabel ?? "").toUpperCase()}`} size={9} cls="k-value--label" />
        <IsoBox at={[x0 + 44, 50]} w={44} d={34} h={24} role="plain" />
        <Padlock at={[x0 + 40, 62]} />
        <Value at={[x0, 104]} text={`OUTPUT · ${d.scriptPubKeyHex.length / 2} B`} size={9} cls="k-value--label" />
        <g>
          <rect class="k-cell k-fill--plain" x={cellsX} y={40} width="20" height="20" />
          <text class="k-cell__t" x={cellsX + 10} y={53.4} text-anchor="middle">{d.scriptPubKeyHex.slice(0, 2)}</text>
          <rect class="k-cell k-fill--plain" x={cellsX + 20} y={40} width="20" height="20" />
          <text class="k-cell__t" x={cellsX + 30} y={53.4} text-anchor="middle">{d.scriptPubKeyHex.slice(2, 4)}</text>
          <rect class="k-cell k-fill--hash k-cell--em" x={cellsX + 40} y={40} width={hashW} height="20" />
          <text class="k-packet__t" x={cellsX + 45} y={53.4}>{short(d.committedHashHex)}</text>
          <rect class="k-cell k-fill--plain" x={cellsX + 40 + hashW} y={40} width="20" height="20" />
          <text class="k-cell__t" x={cellsX + 50 + hashW} y={53.4} text-anchor="middle">{d.scriptPubKeyHex.slice(-2)}</text>
          <Value at={[cellsX, 74]} text="OP_HASH160 · 20-BYTE HASH · OP_EQUAL" size={8.5} cls="k-value--muted" />
        </g>
        {/* The redeem script: hatched until revealed. */}
        <rect class="k-outline k-fill--plain" x={card.x} y={card.y} width={card.w} height="52" style={shown ? undefined : `fill:${ids.hatch}`} />
        {shown ? (
          <>
            <Value at={[card.x + 6, card.y + 15]} text={`REDEEM SCRIPT · ${d.redeemScriptHex.length / 2} B · ${KIND[d.kind].toUpperCase()}`} size={9} cls="k-value--label" />
            <Value at={[card.x + 6, card.y + 31]} text={d.redeemAsm} size={9} />
            <Value at={[card.x + 6, card.y + 45]} text={`HASH160 = ${short(d.redeemHash160Hex)} = THE LOCK`} size={8.5} cls="k-value--hash" />
          </>
        ) : (
          <>
            <rect class="k-cell k-fill--plain" x={card.x + 6} y={card.y + 6} width={card.w - 12} height="16" />
            <Value at={[card.x + 11, card.y + 18]} text="REDEEM SCRIPT · NOT YET SEEN" size={9} cls="k-value--label" />
          </>
        )}
        {/* Stage chips. */}
        {d.stages.map((st, i) => {
          const cx = x0 + i * (chipW + 6);
          const done = shown && i <= at;
          return (
            <g class={done ? undefined : "k-faded"} data-stage={st.id}>
              <rect class={`k-outline k-fill--plain${shown && i === at ? " k-cell--em" : ""}`} x={cx} y={chipsY} width={chipW} height="24" style={shown ? undefined : `fill:${ids.hatch}`} />
              <text class="k-card__name" x={cx + 6} y={chipsY + 15.5}>{`${i + 1} ${!shown ? "" : wide ? CHIP[st.id].toUpperCase() : CHIP[st.id].split(" ")[0].toUpperCase()}${done ? (st.ok ? " ✓" : " ✗") : ""}`}</text>
            </g>
          );
        })}
        {area.el}
      </Drawing>
    );
  };

  /** The current stage, drawn below the chips. */
  function stageArea(ids: DrawingIds, wide: boolean, x0: number, y: number): { el: preact.JSX.Element; h: number } {
    if (!shown) {
      return {
        h: 40,
        el: <Value at={[x0, y + 14]} text={wide ? "NOTHING TO CHECK UNTIL A SPEND REVEALS THE SCRIPT" : "NOTHING TO CHECK UNTIL A SPEND"} size={9} cls="k-value--muted" />,
      };
    }
    const kinds = d.itemKinds;
    const plateW = wide ? 170 : 150;
    if (s.id === "push-only") {
      const pushed = d.stages[1]?.stackBefore ?? [];
      const h = stackHeight(pushed.length);
      return {
        h: h + 30,
        el: (
          <g>
            <Value at={[x0, y + 10]} text={`SCRIPTSIG · ${s.scriptBytes} B · ${s.scriptAsm}`} size={9} cls="k-value--label" />
            <Value at={[x0, y + 26]} text={s.ok ? "ONLY PUSHES: THEY BECOME THE STACK ✓" : "A NON-PUSH OPERATION ✗"} size={9} cls={s.ok ? "k-value--ok" : "k-value--fail"} />
            <Arrow d={wide ? `M${x0 + 300} ${y + 22} H${x0 + 390}` : `M${x0 + 200} ${y + 34} V${y + 44}`} ids={ids} />
            <StackPlates x={wide ? x0 + 400 : x0 + 120} y={wide ? y : y + 50} w={plateW} items={pushed} kinds={kinds} />
          </g>
        ),
      };
    }
    if (s.id === "hash-match") {
      const st = s.stackBefore;
      const h = stackHeight(st.length);
      const mx = x0 + plateW + 44;
      const tx = wide ? x0 + plateW + 120 : x0;
      const ty = wide ? y + 14 : y + Math.max(h, 92) + 12;
      return {
        h: wide ? Math.max(h, 92) + 6 : Math.max(h, 92) + 46,
        el: (
          <g>
            <StackPlates x={x0} y={y} w={plateW} items={st} kinds={kinds} em={st.length - 1} />
            <Arrow d={`M${x0 + plateW + 4} ${y + 8} H${mx - 10}`} ids={ids} />
            <Machine at={[mx, y + 46]} w={48} d={26} h={20} label="HASH160" role="hash" />
            <Value at={[tx, ty]} text={`HASH160 OF THE TOP ITEM = ${short(d.redeemHash160Hex)}`} size={9} cls="k-value--hash" />
            <Value at={[tx, ty + 16]} text={`THE LOCK = ${short(d.committedHashHex)} ${s.ok ? "✓ EQUAL" : "✗ DIFFERENT"}`} size={9} cls={s.ok ? "k-value--ok" : "k-value--fail"} />
          </g>
        ),
      };
    }
    // Stage 3: the script runs on what is left, or the witness is checked.
    const st = s.stackBefore;
    const h = stackHeight(st.length);
    const checks = s.steps.find((x) => x.checks)?.checks ?? [];
    const final = s.steps.at(-1)?.stackAfter ?? [];
    const lines = [
      ...(wide ? [`runs: ${s.scriptAsm ?? "<key> OP_CHECKSIG"}`] : ["runs:", s.scriptAsm ?? "<key> OP_CHECKSIG"]),
      ...(checks.length ? [`checks: ${checks.map((c) => `sig ${c.sigIndex + 1} → ${c.keyIndex === null ? "no key" : `key ${c.keyIndex + 1}`}`).join(", ")}`] : []),
      `left on the stack: ${final.length === 1 && final[0] === "01" ? "true" : `${final.length} items`}`,
    ];
    const tx = wide ? x0 + plateW + 20 : x0;
    const ty = wide ? y : y + h + 12;
    return {
      h: wide ? Math.max(h, lines.length * 15 + 30) : h + 12 + lines.length * 15 + 26,
      el: (
        <g>
          <Value at={[x0, y - 4]} text={d.kind === "legacy" ? "STACK LEFT AFTER THE SCRIPT IS POPPED" : "THE WITNESS STACK"} size={8.5} cls="k-value--muted" />
          <StackPlates x={x0} y={y + 4} w={plateW} items={st} kinds={kinds} />
          {lines.map((l, i) => <Value at={[tx, ty + 14 + i * 15]} text={l.toUpperCase()} size={9} cls="k-value--label" />)}
          <Value at={[tx, ty + 14 + lines.length * 15 + 4]} text={s.ok ? "✓ THE SPEND IS VALID" : "✗ THE SPEND FAILS"} size={9.5} cls={s.ok ? "k-value--ok" : "k-value--fail"} />
        </g>
      ),
    };
  }

  const strip = (label: string, name: string, options: Array<{ value: string; text: string }>, current: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${name}`} checked={current === o.value} onChange={() => set(o.value)} />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  );
  const go = (n: number) => {
    setRevealed(true);
    setStage(Math.max(0, Math.min(d.stages.length - 1, n)));
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Pinned spend", "spend", fixtures.map((x) => ({ value: x.id, text: x.label.replace(/ 2-of-2$/, "") })), id, (v) => (setId(v), setStage(0)))}
          {strip("Redeem script", "reveal", [{ value: "hidden", text: "Before the spend" }, { value: "shown", text: "Revealed by the spend" }], shown ? "shown" : "hidden", (v) => setRevealed(v === "shown"))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the legacy 2-of-2 spend at its last stage. With JavaScript you can hide the redeem script, switch spends and step through the stages; Fig. A09.3 draws every step.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step through both evaluations">
          <button type="button" class="atlas-scrub__btn" onClick={() => go(stage - 1)} disabled={!shown || at === 0} aria-label="Previous stage">←</button>
          <input type="range" min={0} max={d.stages.length - 1} value={at} aria-label="Stage" aria-valuetext={`${at + 1} of ${d.stages.length}: ${s.title}`} onInput={(e) => go(Number((e.currentTarget as HTMLInputElement).value))} />
          <button type="button" class="atlas-scrub__btn" onClick={() => go(shown ? at + 1 : 0)} disabled={shown && at === d.stages.length - 1} aria-label="Next stage">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Output script ({d.scriptPubKeyHex.length / 2} bytes)</dt><dd><code class="atlas-break">{d.scriptPubKeyHex}</code></dd>
          {shown ? (
            <>
              <dt>Redeem script ({d.redeemScriptHex.length / 2} bytes)</dt><dd><code class="atlas-break">{d.redeemScriptHex}</code></dd>
              <dt>HASH160 of the redeem script</dt><dd><code class="atlas-break">{d.redeemHash160Hex}</code></dd>
              {d.witnessScriptHex ? <><dt>Witness script</dt><dd><code class="atlas-break">{d.witnessScriptHex}</code></dd></> : null}
            </>
          ) : null}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP {f.source.bip} line {f.source.line}. Recorded at build time by the tested model; every signature verified (noble) against the digest it computed. Nothing here signs.{shown && ok && d.kind === "legacy" ? ` BIP 16 sigops for this redeem script: ${d.redeemSigops}.` : ""}</p>
    </div>
  );
}
