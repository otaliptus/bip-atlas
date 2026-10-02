import { checkSpec, combos, type HeroSpec } from "../heroStates";
import { Drawing, Value, idsFor } from "../kit";
import type { DerivedTimelockCaseFixture, TimelockCheckView } from "../types";
import { LOCKTIME_THRESHOLD as THRESHOLD, SEQUENCE_LOCKTIME_DISABLE_FLAG, SEQUENCE_LOCKTIME_TYPE_FLAG } from "@bip-atlas/models/timelock";
import { BitRow } from "./bits";

export interface TimelockHeroState { caseId: string; edit: string }

const num = (n: number | bigint) => n.toLocaleString("en-US");
const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;
const utc = (iso: string) => iso.replace("T", " ").replace(".000Z", " UTC");

/**
 * The hero's controls and its pre-rendered states: one per Core case and
 * field change (each re-run through the tested model at build time). The
 * "compare units" toggle shows a layer every state draws.
 */
export function timelockHeroSpec(fixtures: DerivedTimelockCaseFixture[]): HeroSpec<TimelockHeroState> {
  const abs = fixtures.filter((f) => f.lock === "absolute"), rel = fixtures.filter((f) => f.lock === "relative");
  if (!abs.length || !rel.length) throw new Error("timelock-fields: needs absolute and relative cases");
  const editsOf = (f: DerivedTimelockCaseFixture) => ["core", ...f.derived.edits.map((e) => e.id)];
  const [ea, er] = [editsOf(abs[0]), editsOf(rel[0])];
  if (abs.some((f) => editsOf(f).join() !== ea.join()) || rel.some((f) => editsOf(f).join() !== er.join())) throw new Error("timelock-fields: every case of a kind needs the same edits");
  const caseOpts = (fs: DerivedTimelockCaseFixture[]) => fs.map((f, i) => ({ value: `c${i}`, text: f.shortLabel ?? f.label }));
  const all = combos([["absolute", "relative"], abs.map((_, i) => `c${i}`), rel.map((_, i) => `c${i}`), ea, er]).map((k) => k.join("|"));
  const states = [
    ...abs.flatMap((f, i) => ea.map((e) => ({ id: `${f.id}-${e}`, keys: all.filter((k) => { const [l, a, , x] = k.split("|"); return l === "absolute" && a === `c${i}` && x === e; }), state: { caseId: f.id, edit: e } }))),
    ...rel.flatMap((f, i) => er.map((e) => ({ id: `${f.id}-${e}`, keys: all.filter((k) => { const [l, , r, , y] = k.split("|"); return l === "relative" && r === `c${i}` && y === e; }), state: { caseId: f.id, edit: e } }))),
  ];
  const editText = (f: DerivedTimelockCaseFixture, e: string) => (e === "core" ? "As in Core" : e === "final" ? "Flip input final" : e === "bit31" ? "Flip input bit 31" : e === "version" ? "Flip the version" : f.derived.edits.find((x) => x.id === e)!.label);
  return checkSpec({
    controls: [
      { kind: "strip", name: "lock", label: "Lock", options: [{ value: "absolute", text: "Absolute · nLockTime" }, { value: "relative", text: "Relative · nSequence" }] },
      { kind: "strip", name: "caseA", label: "Bitcoin Core test case", options: caseOpts(abs), showWhen: { name: "lock", value: "absolute" } },
      { kind: "strip", name: "caseR", label: "Bitcoin Core test case", options: caseOpts(rel), showWhen: { name: "lock", value: "relative" } },
      { kind: "strip", name: "editA", label: "Change a field", options: ea.map((e) => ({ value: e, text: editText(abs[0], e) })), showWhen: { name: "lock", value: "absolute" } },
      { kind: "strip", name: "editR", label: "Change a field", options: er.map((e) => ({ value: e, text: editText(rel[0], e) })), showWhen: { name: "lock", value: "relative" } },
      { kind: "toggle", name: "compare", label: "Compare height and time units", options: [] },
    ],
    states,
    initialKey: "absolute|c0|c0|core|core",
    noJsId: `${abs[0].id}-core`,
    staticNote: `Static view: the first absolute-lock case, with the checks it passes or fails, both readings shown. With JavaScript you can switch to relative locks, pick any of the ${fixtures.length} cases and change a field.`,
    compact: true,
  });
}

/**
 * timelock-fields.v1 — the Timelocks chapter's hero (drawing-first).
 *
 * A gate: the coin's locking script on top, the spending transaction's lock
 * fields below it, and BIP 65's or BIP 112's checks as a row of lamps that
 * the spend has to pass, in order. Absolute locks draw nLockTime and the
 * argument on a ruler split at 500,000,000 (heights | times); relative locks
 * draw the argument's and the input's 32 bits with the disable and type
 * flags. Every value and verdict comes from Bitcoin Core's own test cases,
 * run through the tested model at build time, including the field changes.
 */
export function TimelockFields({ fixtures, figureId, initial }: { fixtures: DerivedTimelockCaseFixture[]; figureId: string; initial?: TimelockHeroState }) {
  const { caseId, edit } = initial ?? { caseId: fixtures[0].id, edit: "core" };
  const f = fixtures.find((x) => x.id === caseId);
  if (!f) throw new Error(`timelock-fields: no case ${caseId}`);
  const d = f.derived;
  const e = edit === "core" ? null : d.edits.find((x) => x.id === edit);
  if (edit !== "core" && !e) throw new Error(`timelock-fields: no edit ${edit} for ${caseId}`);
  const v = e ?? { version: d.version, nLockTime: d.nLockTime, nSequence: d.nSequence, nLockTimeIso: d.nLockTimeIso, value16: d.value16, value16Seconds: d.value16Seconds, checks: d.checks, valid: d.valid, field: null as null | string, label: "" };
  const cltv = d.opcode === "CHECKLOCKTIMEVERIFY";
  const arg = BigInt(d.argument);
  const id = `${figureId}-d`;
  const ids = idsFor(id);
  const x0 = 14;
  const vizH = cltv ? 104 : 136;
  const checksY = 158 + vizH;
  const H = checksY + v.checks.length * 26 + 46;
  const asm = d.asm.replace(/(CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY)/, "OP_$1");
  const status =
    `${f.label}${e ? `, with ${e.label}` : ""}: ` +
    (v.valid && v.checks.some((c) => c.stopsHere) ? "the argument's disable flag is set, so the opcode does nothing and the script continues" : v.valid ? "every check passes and the script continues" : `fails at “${v.checks.find((c) => !c.ok)?.label ?? "the final stack"}”`) +
    (e ? ". Not a Core test case: the tested model's verdict." : `. Bitcoin Core labels it ${f.expected}; the model agrees.`);
  const field = (x: number, w: number, name: string, text: string, role: string, changed: boolean) => (
    <g data-field={name}>
      <rect class={`k-cell k-fill--${role}${changed ? " k-cell--em" : ""}`} x={x} y={112} width={w} height="26" />
      <text class="k-card__name" x={x + 5} y={123}>{name.toUpperCase()}</text>
      <text class="k-value" x={x + 5} y={134.5} style="font-size:9.5px">{text}</text>
      {changed ? <text class="k-card__tag" x={x + w - 4} y={134.5} text-anchor="end">CHANGED</text> : null}
    </g>
  );
  // The unit comparison layer (toggle) in words, so the description carries it in every state.
  // BIP 68 gives nSequence a meaning only from version 2 on and with bit 31 clear.
  const noMeaning = v.version < 2 ? `VERSION ${v.version}` : v.nSequence & SEQUENCE_LOCKTIME_DISABLE_FLAG ? "BIT 31 SET" : null;
  const units = cltv
    ? `nLockTime ${num(v.nLockTime)} read as a height is block ${num(v.nLockTime)}, read as a time ${utc(v.nLockTimeIso)}; it is read as a ${v.nLockTime < THRESHOLD ? "height" : "time"}.`
    : noMeaning
      ? `With ${noMeaning === "BIT 31 SET" ? "bit 31 set" : `version ${v.version}`}, BIP 68 gives input 0's nSequence no meaning as a relative lock.`
      : `nSequence's low 16 bits, ${num(v.value16)}, would be ${num(v.value16)} blocks or ${num(v.value16Seconds)} seconds; bit 22 is ${v.nSequence & SEQUENCE_LOCKTIME_TYPE_FLAG ? "set (512-second units)" : "clear (blocks)"}.`;
  // Ruler labels flip to the right of their marker near the left edge.
  const tag = (px: number) => (px - x0 < 50 ? { x: px + 6, anchor: "start" } : { x: px - 6, anchor: "end" });
  // CLTV ruler: heights on the left half, times on the right half, each scaled within its half.
  const pos = (n: number) => (n < THRESHOLD ? x0 + (n / THRESHOLD) * 150 : x0 + 166 + ((n - THRESHOLD) / (2 ** 32 - THRESHOLD)) * 150);
  return (
    <>
      <Drawing
        id={id}
        width={344}
        height={H}
        title="The gate a spend has to pass"
        desc={`${status} The locking script is ${asm}. The spending transaction has version ${v.version}, input 0 nSequence ${hex32(v.nSequence)} and nLockTime ${num(v.nLockTime)}. Checks in order: ${v.checks.map((c) => `${c.label}: ${c.ok ? "yes" : "no"} (${c.detail})`).join("; ")}. ${units}`}
      >
        <Value at={[x0, 14]} text={`${f.label.toUpperCase()}`} size={9} cls="k-value--label" />
        <Value at={[x0, 27]} text={e ? `CHANGED: ${e.label.toUpperCase()} · NOT A CORE CASE` : `BITCOIN CORE ${f.coreFile} #${f.coreIndex} · ${f.expected.toUpperCase()}`} size={8.5} cls="k-value--muted" />
        <Value at={[x0, 46]} text="THE COIN'S LOCK (SPENT OUTPUT SCRIPT)" size={9} cls="k-value--muted" />
        <rect class="k-outline k-fill--time" x={x0} y={52} width="316" height="24" />
        <text class="k-value" x={x0 + 6} y={68} style="font-size:9.5px">{asm}</text>
        <Value at={[x0, 92]} text={cltv ? `ARGUMENT ${num(arg)} · ${arg < 0n ? "NEGATIVE" : arg < BigInt(THRESHOLD) ? "A HEIGHT" : "A TIME"}` : `ARGUMENT ${arg < 0n ? num(arg) : hex32(Number(arg & 0xffffffffn))}`} size={9} cls="k-value--label" />
        <Value at={[x0, 106]} text="THE SPENDING TRANSACTION" size={9} cls="k-value--muted" />
        {field(x0, 70, "nVersion", String(v.version), "plain", v.field === "version")}
        {field(x0 + 76, 120, "input 0 nSequence", hex32(v.nSequence), "time", v.field === "nSequence")}
        {field(x0 + 202, 114, "nLockTime", num(v.nLockTime), "time", v.field === "nLockTime")}
        {cltv ? (
          <g class="k-ruler">
            <rect class="k-cell k-fill--plain" x={x0} y={168} width="150" height="12" />
            <rect class="k-cell k-fill--plain" x={x0 + 166} y={168} width="150" height="12" />
            <text class="k-card__type" x={x0} y={199}>HEIGHTS · 0</text>
            <text class="k-card__type" x={x0 + 316} y={199} text-anchor="end">TIMES · 2³² − 1</text>
            <line class="k-cut" x1={x0 + 158} y1={160} x2={x0 + 158} y2={186} />
            <text class="k-card__type" x={x0 + 162} y={156}>{num(THRESHOLD)}</text>
            {arg >= 0n ? (
              <g>
                <path class="k-outline k-mark--plain" d={`M${pos(Number(arg))} 166 l-4 -6 h8 z`} />
                <text class="k-card__name" x={tag(pos(Number(arg))).x} y={160} text-anchor={tag(pos(Number(arg))).anchor}>ARG</text>
              </g>
            ) : null}
            <path class="k-outline k-mark--time" d={`M${pos(v.nLockTime)} 182 l-4 6 h8 z`} />
            <text class="k-card__name" x={tag(pos(v.nLockTime)).x} y={212} text-anchor={tag(pos(v.nLockTime)).anchor}>nLockTime</text>
            <text class="k-card__type" x={x0 + 158} y={199} text-anchor="middle">HALVES NOT TO ONE SCALE</text>
            <g class="k-compare">
              <text class="k-card__name" x={x0} y={226}>{`AS A HEIGHT: BLOCK ${num(v.nLockTime)}${v.nLockTime < THRESHOLD ? " ← READ THIS WAY" : ""}`}</text>
              <text class="k-card__name" x={x0} y={240}>{`AS A TIME: ${utc(v.nLockTimeIso)}${v.nLockTime >= THRESHOLD ? " ← READ THIS WAY" : ""}`}</text>
            </g>
          </g>
        ) : (
          <g>
            <BitRow x={x0} y={166} n={Number(arg & 0xffffffffn) >>> 0} label="ARGUMENT" ids={ids} ruler />
            <BitRow x={x0} y={200} n={v.nSequence} label="INPUT 0 nSEQUENCE" ids={ids} />
            {noMeaning ? (
              <g class="k-compare">
                <text class="k-card__name" x={x0} y={240}>{`${noMeaning}: BIP 68 GIVES THIS nSEQUENCE`}</text>
                <text class="k-card__name" x={x0} y={254}>NO MEANING AS A RELATIVE LOCK</text>
              </g>
            ) : (
              <g class="k-compare">
                <text class="k-card__name" x={x0} y={240}>{`LOW 16 BITS AS BLOCKS: ${num(v.value16)} BLOCKS`}</text>
                <text class="k-card__name" x={x0} y={254}>{`AS 512-SECOND UNITS: ${num(v.value16)} × 512 = ${num(v.value16Seconds)} S`}</text>
                <text class="k-card__name" x={x0} y={268}>{`BIT 22 IS ${v.nSequence & SEQUENCE_LOCKTIME_TYPE_FLAG ? "SET: 512-SECOND UNITS" : "CLEAR: BLOCKS"}`}</text>
              </g>
            )}
          </g>
        )}
        <Value at={[x0, checksY - 6]} text={cltv ? "BIP 65'S CHECKS, IN ORDER" : "BIP 112'S CHECKS, IN ORDER"} size={9} cls="k-value--muted" />
        {v.checks.map((c: TimelockCheckView, i: number) => {
          const y = checksY + i * 26;
          return (
            <g data-check={c.id} data-ok={c.ok ? "true" : "false"}>
              <rect class={`k-cell ${c.ok ? "k-fill--plain" : "k-mark--plain"}`} x={x0} y={y} width="20" height="20" />
              <text class={`k-cell__t${c.ok ? "" : " k-cell__t--on"}`} x={x0 + 10} y={y + 13.5} text-anchor="middle">{c.stopsHere ? "—" : c.ok ? "✓" : "✗"}</text>
              <text class="k-card__name" x={x0 + 28} y={y + 9}>{`${i + 1} ${c.label}`}</text>
              <text class="k-card__type" x={x0 + 28} y={y + 19.5}>{c.detail.length > 52 ? `${c.detail.slice(0, 51)}…` : c.detail}</text>
            </g>
          );
        })}
        <Value at={[x0, H - 22]} text={v.valid ? "✓ THIS SCRIPT CHECK PASSES" : "✗ THIS SCRIPT CHECK FAILS"} size={9.5} cls={v.valid ? "k-value--ok" : "k-value--fail"} />
        <Value at={[x0, H - 7]} text="BLOCK ELIGIBILITY IS NOT CHECKED HERE" size={8.5} cls="k-value--muted" />
      </Drawing>
      <p class="atlas-hero__status" data-status>{status}</p>
      <Drawing id={`${id}-chain`} width={344} height={152} title="The separate chain check" desc={cltv
        ? "Schematic for an active absolute lock L. The script checks the transaction fields first. Block inclusion also requires candidate height greater than L, or for a time lock, the previous block's median time past greater than L. All other transaction rules still apply. This is not live chain data."
        : "Schematic for an active relative lock. The age starts at coin confirmation for block locks, or the median time past before confirmation for time locks. The candidate height, or candidate parent's median time past, must reach the starting value plus the required delay. All other transaction rules still apply. This is not live chain data."}>
        <Value at={[14, 16]} text="CHAIN CHECK · SCHEMATIC, NOT CHAIN DATA" size={8.5} cls="k-value--label" />
        <Value at={[14, 37]} text={cltv ? "ACTIVE ABSOLUTE LOCK: nLockTime = L" : "ACTIVE RELATIVE LOCK: WAIT FROM CONFIRMATION"} size={8.5} />
        <path class="k-line" d="M24 65 H320" marker-end={idsFor(`${id}-chain`).arrow} />
        <path class="k-cut" d="M186 55 V75" />
        <Value at={[24, 88]} text="TOO EARLY" size={8.5} cls="k-value--muted" />
        <Value at={[186, 50]} text={cltv ? "L" : "START + DELAY"} size={8.5} anchor="middle" />
        <Value at={[320, 88]} text={cltv ? "AFTER L" : "AT OR AFTER"} size={8.5} anchor="end" />
        <Value at={[14, 113]} text={cltv ? "HEIGHT > L · OR PARENT MTP > L" : "HEIGHT OR PARENT MTP ≥ START + DELAY"} size={9} />
        <Value at={[14, 137]} text="PASSING THIS RULE DOES NOT CHECK THE REST OF A SPEND" size={8} cls="k-value--muted" />
      </Drawing>
      <p>{cltv
        ? "For an active absolute lock, the candidate block’s height must exceed nLockTime. A time-based lock instead uses the previous block’s median time past (MTP). If every input is final, nLockTime is not enforced."
        : "For a block-based relative lock, start at the coin’s confirmation height. For a time-based lock, start at the MTP before confirmation and compare it with the candidate block’s parent MTP. BIP 68 applies only with transaction version 2 or higher and the input’s disable flag clear."}</p>
      <details class="atlas-disclosure">
        <summary>Exact checks and fields</summary>
        <dl class="atlas-hexlist">
          <dt>Locking script</dt><dd><code class="atlas-break">{asm}</code></dd>
          <dt>nVersion · input 0 nSequence · nLockTime</dt><dd>{v.version} · <code>{hex32(v.nSequence)}</code> · {num(v.nLockTime)}</dd>
          {v.checks.map((c: TimelockCheckView) => (
            <>
              <dt>{c.label}: {c.ok ? "yes" : "no"}</dt>
              <dd>{c.detail}</dd>
            </>
          ))}
        </dl>
      </details>
      <p class="atlas-hero__source">Bitcoin Core v29.0 {f.coreFile}, entry {f.coreIndex} (Core’s comment for its group: “{f.comment}”), pinned by commit and hash; one-input transactions with no signatures. Every check run by the tested model at build time.</p>
    </>
  );
}
