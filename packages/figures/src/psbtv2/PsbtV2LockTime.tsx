import { checkSpec, type HeroSpec } from "../heroStates";
import { Arrow, Drawing, Lamp, Responsive, Value, idsFor, wrapLines } from "../kit";
import type { DerivedPsbtV2Fixture } from "../types";
import { inputReading, lockSteps, lockText } from "./parts";

export interface PsbtV2HeroState { id: string }

interface Props {
  fixtures: DerivedPsbtV2Fixture[];
  figureId: string;
  /** The vector to draw; line 479's by default (also the no-JS state). */
  initial?: PsbtV2HeroState;
}

const DEFAULT_LINE = 479;

export function psbtV2HeroSpec(fixtures: DerivedPsbtV2Fixture[]): HeroSpec<PsbtV2HeroState> {
  if (fixtures.some((f) => f.group !== "locktime")) throw new Error("psbt-v2-locktime: lock-time vectors only");
  const start = fixtures.findIndex((f) => f.hexLine === DEFAULT_LINE);
  if (start < 0) throw new Error(`psbt-v2-locktime: needs the vector on line ${DEFAULT_LINE}`);
  return checkSpec<PsbtV2HeroState>({
    controls: [{ kind: "strip", name: "vector", label: "Published lock-time vector", options: fixtures.map((f, i) => ({ value: `v${i}`, text: f.shortLabel ?? f.label })) }],
    states: fixtures.map((f, i) => ({ id: `v${i}`, keys: [`v${i}`], state: { id: f.id } })),
    initialKey: `v${start}`,
    noJsId: `v${start}`,
    staticNote: `Static view: one of BIP 370's ${fixtures.length} lock-time vectors. With JavaScript you can choose the others.`,
  });
}

/**
 * psbt-v2-locktime.v1 — the PSBT version 2 chapter's hero (drawing-first).
 *
 * One of BIP 370's lock-time vectors: the global fallback, each input's
 * required height or time, BIP 370's three steps (who requires a lock time,
 * the type all of them accept, the maximum), and the result beside the one
 * BIP 370 publishes. Every reading comes from the tested model at build time.
 */
export function PsbtV2LockTime({ fixtures, figureId, initial }: Props) {
  const f = fixtures.find((x) => x.id === (initial?.id ?? fixtures.find((y) => y.hexLine === DEFAULT_LINE)?.id));
  if (!f) throw new Error(`psbt-v2-locktime: no fixture ${initial?.id}`);
  const d = f.derived;
  const lt = d.lockTime!;
  const steps = lockSteps(f);
  const result = lt.value === null ? "no lock time can be chosen" : lt.kind === "fallback" ? `nLockTime ${lt.value}` : `nLockTime ${lt.value}, a ${lockText(lt.kind!, lt.value)}`;
  const published = f.expectedLockTime === null ? "cannot be computed" : `${f.expectedLockTime}`;
  const status = `Line ${f.hexLine}: ${d.inputs.map((inp, k) => {
    const r = inputReading(inp);
    return `input ${k + 1} ${r.none ? "has no lock-time field" : `requires ${r.reqs.join(" and ")}`}`;
  }).join("; ")}. ${steps.join(" ")} BIP 370 gives ${published}.`;
  const desc = `A version 2 PSBT with ${d.inputs.length} input${d.inputs.length > 1 ? "s" : ""}. The global map ${d.fallbackLocktime === null ? "has no fallback lock time" : `sets the fallback lock time to ${d.fallbackLocktime}`}. ${status} Result: ${result}.`;

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${wide ? "w" : "n"}`;
    const ids = idsFor(fid);
    const x0 = wide ? 20 : 14;
    const top = 30;
    // Maps: global, then each input; side by side when wide, stacked when narrow.
    const n = d.inputs.length;
    const gw = wide ? 150 : W - 2 * x0;
    const iw = wide ? (W - 2 * x0 - gw - 20 - (n - 1) * 14) / n : W - 2 * x0;
    const boxH = wide ? 82 : 52;
    const gH = wide ? boxH : 40;
    const box = (k: number) => (wide ? { x: x0 + gw + 20 + k * (iw + 14), y: top } : { x: x0, y: top + gH + 10 + k * (boxH + 8) });
    const mapsEnd = wide ? top + boxH : top + gH + 10 + n * (boxH + 8) - 8;
    const sy = mapsEnd + 30;
    const stepW = W - 2 * x0 - 30;
    const stepLines = steps.map((s) => wrapLines(s, Math.floor(stepW / 5.2)));
    const stepY: number[] = [];
    let y = sy;
    for (const l of stepLines) {
      stepY.push(y);
      y += 10 + l.length * 13;
    }
    const ry = y + 12;
    const dateLine = lt.date ? `${lt.date.replace("T", " ").replace("Z", " UTC")}` : null;
    const rh = !wide && dateLine ? 48 : 36;
    const H = ry + rh + 20;
    const chip = (x: number, yy: number, w: number, text: string, role: "time" | "plain", dashed = false) => (
      <g>
        <rect class={`k-outline k-fill--${role}${dashed ? " k-dashed" : ""}`} x={x} y={yy} width={w} height={20} />
        <Value at={[x + 6, yy + 14]} text={text} size={8.5} />
      </g>
    );
    return (
      <Drawing id={fid} width={W} height={H} title="Choosing the lock time from the inputs' requirements" desc={desc}>
        <Value at={[x0, 14]} text={`BIP 370 LOCK-TIME VECTOR · LINE ${f.hexLine}${f.label.startsWith("Unlabelled") ? " · NO CASE LINE" : ""}`} size={8.5} cls="k-value--label" />
        {/* The global map's fallback. */}
        <g data-map="global">
          <rect class="k-outline k-fill--plain" x={x0} y={top} width={gw} height={gH} />
          <Value at={[x0 + 8, top + 14]} text="GLOBAL MAP" size={8} cls="k-value--label" />
          {chip(x0 + 8, top + (wide ? 28 : 18) - (wide ? 0 : 0), gw - 16 > 200 ? 200 : gw - 16, d.fallbackLocktime === null ? "NO FALLBACK FIELD" : `FALLBACK LOCK TIME ${d.fallbackLocktime}`, d.fallbackLocktime === null ? "plain" : "time", d.fallbackLocktime === null)}
          {wide ? <Value at={[x0 + 8, top + 66]} text="USED ONLY IF NO INPUT" size={7.5} cls="k-value--muted" /> : null}
          {wide ? <Value at={[x0 + 8, top + 76]} text="REQUIRES A LOCK TIME" size={7.5} cls="k-value--muted" /> : null}
        </g>
        {d.inputs.map((inp, k) => {
          const b = box(k);
          const r = inputReading(inp);
          const chips = r.none ? [{ text: "NO LOCK-TIME FIELD", role: "plain" as const, dashed: true }] : [
            ...(inp.requiredHeight !== null ? [{ text: `REQUIRED HEIGHT ${inp.requiredHeight}`, role: "time" as const, dashed: false }] : []),
            ...(inp.requiredTime !== null ? [{ text: `REQUIRED TIME ${inp.requiredTime}`, role: "time" as const, dashed: false }] : []),
          ];
          const requiring = lt.requiring.includes(k);
          return (
            <g data-input={k + 1}>
              <rect class={`k-outline k-fill--plain${requiring ? " k-cell--em" : ""}`} x={b.x} y={b.y} width={iw} height={boxH} />
              <Value at={[b.x + 8, b.y + 14]} text={`INPUT ${k + 1}`} size={8} cls="k-value--label" />
              <Value at={[b.x + iw - 8, b.y + 14]} text={`TAKES ${r.takes.toUpperCase()}`} size={7.5} anchor="end" cls="k-value--muted" />
              {chips.map((c, j) => (wide ? chip(b.x + 8, b.y + 24 + j * 26, iw - 16, c.text, c.role, c.dashed) : chip(b.x + 8 + j * ((iw - 22) / 2 + 6), b.y + 24, chips.length > 1 ? (iw - 22) / 2 : iw - 16, c.text, c.role, c.dashed)))}
            </g>
          );
        })}
        <Arrow d={`M${x0 + 9} ${mapsEnd + 4} V${sy - 14}`} ids={ids} />
        {stepLines.map((lines, i) => (
          <g data-step={i + 1}>
            <circle class="k-outline k-fill--plain" cx={x0 + 9} cy={stepY[i] - 4} r={8} />
            <Value at={[x0 + 9, stepY[i] - 0.5]} text={String(i + 1)} size={9} anchor="middle" />
            {lines.map((l, j) => <Value at={[x0 + 26, stepY[i] + j * 13]} text={l} size={9} />)}
          </g>
        ))}
        <rect class={`k-outline ${lt.value === null ? "k-fill--plain k-cell--em" : "k-fill--time"}`} x={x0} y={ry} width={W - 2 * x0} height={rh} />
        <Lamp at={[x0 + 18, ry + rh / 2]} state={lt.value === null ? "off" : "on"} r={7} />
        <Value at={[x0 + 34, ry + 15]} text={lt.value === null ? "NO LOCK TIME CAN BE CHOSEN" : `nLockTime ${lt.value}${lt.kind === "fallback" ? "" : ` · ${lt.kind === "height" ? "A BLOCK HEIGHT" : "A UNIX TIME"}`}`} size={9.5} cls="k-value--label" />
        <Value at={[x0 + 34, ry + 29]} text={`BIP 370: ${f.expectedLockTime === null ? "CANNOT BE COMPUTED" : `COMPUTED TO BE ${f.expectedLockTime}`}${wide && dateLine ? ` · ${dateLine}` : ""}`} size={8} cls="k-value--muted" />
        {!wide && dateLine ? <Value at={[x0 + 34, ry + 41]} text={dateLine} size={8} cls="k-value--muted" /> : null}
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <p class="atlas-hero__source">BIP 370 line {f.hexLine}{f.label.startsWith("Unlabelled") ? " (printed without a case line; the requirements shown are read from its bytes)" : `: “${f.label}”`}. The heading on line {f.expectedLine} gives the expected result; the tested model computes it from the PSBT's fields.</p>
    </>
  );
}
