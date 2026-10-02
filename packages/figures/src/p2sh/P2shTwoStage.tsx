import { checkSpec, type HeroSpec } from "../heroStates";
import { Arrow, Drawing, IsoBox, Machine, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedP2shFixture } from "../types";
import { Padlock, StackPlates, stackHeight } from "./stack";

interface Props {
  fixtures: DerivedP2shFixture[];
  figureId: string;
  /** The state to draw. Defaults to the first spend, revealed, at its last stage (also the no-JS state). */
  initial?: P2shHeroState;
}
export interface P2shHeroState { id: string; revealed: boolean; stage: number }

/**
 * The hero's controls (spend, reveal, stage stepper) and its pre-rendered
 * states. The spend strip is labelled by source only, so it names no script
 * kind before the spend; choosing "Before the spend" or another spend goes
 * back to stage 1, and moving the stepper reveals the script.
 */
export function p2shHeroSpec(fixtures: DerivedP2shFixture[]): HeroSpec<P2shHeroState> {
  const n = fixtures[0].derived.stages.length;
  if (fixtures.some((f) => f.derived.stages.length !== n)) throw new Error("p2sh-two-stage: every spend needs the same number of stages");
  const stages = Array.from({ length: n }, (_, k) => String(k));
  return checkSpec({
    controls: [
      { kind: "strip", name: "spend", label: "Pinned spend", options: fixtures.map((f, i) => ({ value: `s${i}`, text: f.shortLabel ?? `spend ${i + 1}`, resets: ["stage"] })) },
      { kind: "strip", name: "reveal", label: "Redeem script", options: [{ value: "hidden", text: "Before the spend", resets: ["stage"] }, { value: "shown", text: "Revealed by the spend" }] },
      { kind: "stepper", name: "stage", label: "Stage", options: stages.map((k) => ({ value: k, text: k })), sets: { reveal: "shown" }, prevLabel: "Previous stage", nextLabel: "Next stage" },
    ],
    states: fixtures.flatMap((f, i) => [
      { id: `s${i}-hidden`, keys: stages.map((k) => `s${i}|hidden|${k}`), state: { id: f.id, revealed: false, stage: 0 }, valueText: "not started: the redeem script is not known yet" },
      ...f.derived.stages.map((st, k) => ({ id: `s${i}-${k}`, keys: [`s${i}|shown|${k}`], state: { id: f.id, revealed: true, stage: k }, valueText: `${k + 1} of ${n}: ${st.title}` })),
    ]),
    initialKey: "s0|hidden|0",
    noJsId: `s0-${n - 1}`,
    staticNote: "Static view: the first spend at its last stage. With JavaScript you can hide the redeem script, switch spends and step through each check.",
  });
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
  const { id, revealed, stage } = initial ?? { id: fixtures[0].id, revealed: true, stage: fixtures[0].derived.stages.length - 1 };
  const f = fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`p2sh-two-stage: no fixture ${id}`);
  const d = f.derived;
  const shown = revealed;
  const at = Math.min(stage, d.stages.length - 1);
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
        <Value at={[x0, 14]} text={shown ? `${f.label.toUpperCase()} · ${(f.shortLabel ?? "").toUpperCase()}` : "THE OUTPUT ALONE"} size={9} cls="k-value--label" />
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
          <Value at={[cellsX, 74]} text="OP_HASH160 · 20-BYTE HASH · OP_EQUAL" size={9} cls="k-value--muted" />
        </g>
        {/* The redeem script: hatched until revealed. */}
        <rect class="k-outline k-fill--plain" x={card.x} y={card.y} width={card.w} height="52" style={shown ? undefined : `fill:${ids.hatch}`} />
        {shown ? (
          <>
            <Value at={[card.x + 6, card.y + 15]} text={`REDEEM SCRIPT · ${d.redeemScriptHex.length / 2} B · ${KIND[d.kind].toUpperCase()}`} size={9} cls="k-value--label" />
            <Value at={[card.x + 6, card.y + 31]} text={d.redeemAsm} size={9} />
            <Value at={[card.x + 6, card.y + 45]} text={`HASH160 = ${short(d.redeemHash160Hex)} = THE LOCK`} size={9} cls="k-value--hash" />
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
            <g class={done ? undefined : "k-faded"} data-stage={shown ? st.id : undefined}>
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
      // The machine sits right of the stack's top item; its output goes on to the comparison.
      const mx = x0 + plateW + 34;
      const tx = wide ? x0 + plateW + 130 : x0;
      const ty = wide ? y + 14 : y + Math.max(h, 96) + 12;
      return {
        h: wide ? Math.max(h, 96) + 6 : Math.max(h, 96) + 46,
        el: (
          <g>
            <Value at={[x0, y - 4]} text="A COPY OF THE STACK" size={9} cls="k-value--muted" />
            <StackPlates x={x0} y={y + 4} w={plateW} items={st} kinds={kinds} em={st.length - 1} />
            <Arrow d={`M${x0 + plateW + 4} ${y + 12} H${mx + 6} V${y + 24}`} ids={ids} />
            <Machine at={[mx, y + 56]} w={56} d={26} h={20} label="HASH160" role="hash" />
            {wide ? <Arrow d={`M${mx + 52} ${y + 46} H${tx - 6} V${ty + 2}`} ids={ids} /> : <Arrow d={`M${mx + 20} ${y + 92} V${ty - 12}`} ids={ids} />}
            <Value at={[tx, ty + 12]} text={`HASH160 OF THE TOP ITEM = ${short(d.redeemHash160Hex)}`} size={9} cls="k-value--hash" />
            <Value at={[tx, ty + 28]} text={`THE LOCK = ${short(d.committedHashHex)}`} size={9} cls="k-value--hash" />
            <Value at={[tx, ty + 44]} text={s.ok ? "✓ EQUAL" : "✗ DIFFERENT"} size={9.5} cls={s.ok ? "k-value--ok" : "k-value--fail"} />
          </g>
        ),
      };
    }
    // Stage 3: the script runs on what is left, or the witness is checked.
    const st = s.stackBefore;
    const h = stackHeight(st.length);
    const checks = s.steps.find((x) => x.checks)?.checks ?? [];
    const final = s.steps.at(-1)?.stackAfter;
    if (!final) throw new Error(`p2sh-two-stage: ${id} stage ${s.id} recorded no steps`);
    // What runs, as the model recorded it: the script's asm, or for P2WPKH the steps it ran.
    const runs = s.scriptAsm ?? s.steps.map((x) => x.name).join(" ");
    const program =
      d.kind === "p2sh-p2wpkh" ? "hash160(key) = the 20-byte program" : d.kind === "p2sh-p2wsh" ? "sha-256(witness script) = the 32-byte program" : null;
    const lines = [
      ...(program ? [`${program}${s.ok ? " ✓" : ""}`] : []),
      ...(wide ? [`runs: ${runs}`] : ["runs:", runs]),
      ...(checks.length ? [`checks: ${checks.map((c) => `sig ${c.sigIndex + 1} → ${c.keyIndex === null ? "no key left" : `key ${c.keyIndex + 1}`}`).join(", ")}`] : []),
      `left on the stack: ${final.length === 1 && final[0] === "01" ? "true" : `${final.length} items`}`,
    ];
    const tx = wide ? x0 + plateW + 20 : x0;
    const ty = wide ? y : y + h + 12;
    return {
      h: wide ? Math.max(h, lines.length * 15 + 30) : h + 12 + lines.length * 15 + 26,
      el: (
        <g>
          <Value at={[x0, y - 4]} text={d.kind === "legacy" ? "STACK LEFT AFTER THE SCRIPT IS POPPED" : d.kind === "p2sh-p2wsh" ? "WITNESS ITEMS BELOW THE SCRIPT" : "THE WITNESS ITEMS"} size={9} cls="k-value--muted" />
          <StackPlates x={x0} y={y + 4} w={plateW} items={st} kinds={kinds} />
          {lines.map((l, i) => <Value at={[tx, ty + 14 + i * 15]} text={l.toUpperCase()} size={9} cls="k-value--label" />)}
          <Value at={[tx, ty + 14 + lines.length * 15 + 4]} text={s.ok ? "✓ THE SPEND IS VALID" : "✗ THE SPEND FAILS"} size={9.5} cls={s.ok ? "k-value--ok" : "k-value--fail"} />
        </g>
      ),
    };
  }

  return (
    <>
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" data-status>{status}</p>
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
      <p class="atlas-hero__source">{shown ? `BIP ${f.source.bip} line ${f.source.line}. ` : "Published test vectors. "}Recorded at build time by the tested model; every signature verified (noble) against the digest it computed. Nothing here signs.{shown && ok && d.kind === "legacy" ? ` BIP 16 sigops for this redeem script: ${d.redeemSigops}.` : ""}</p>
    </>
  );
}
