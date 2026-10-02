import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Cells, Drawing, Machine, Responsive, Value, idsFor } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { along, fromText, group, shortHex } from "./parts";

interface Props {
  fixtures: DerivedBfBlockFixture[];
  figureId: string;
}

const probeName = (from: string, i: number) => (from === "this block" ? `Included script ${i + 1}` : fromText(from).replace("block ", "Script from #"));

/**
 * gcs-filter.v1 — the Block filters chapter's hero (drawing-first).
 *
 * A published BIP 158 testnet block's filter drawn as its hashed values on
 * the line [0, F). A test script goes through SipHash to a target; the
 * client decodes values left to right until one equals the target (match)
 * or passes it (no match). Values it never decodes stay hatched. "Bits"
 * shows the filter's first codes. Everything was computed at build time by
 * the tested model and checked against the vector; the browser only picks.
 */
export function GcsFilter({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [pi, setPi] = useState(0);
  const [bits, setBits] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const p = d.probes[Math.min(pi, d.probes.length - 1)];
  const showBits = hydrated ? bits : true;
  const read = p.steps.length;
  const last = p.steps[read - 1];
  const past = last?.outcome === "greater";
  const miss = "No match: given the right filter, this script is absent from the included output and spent-output scripts.";
  const verdict = p.matched ? `Value ${read} equals it: a match, so the block may concern this script.` : past ? `Value ${read} passes it, so decoding stops. ${miss}` : `All ${d.N} values are below it. ${miss}`;
  const who = p.from === "this block" ? "A script from this block" : `A script from ${fromText(p.from)}`;
  const status = d.N === 0 ? `The filter is one zero byte, N = 0: nothing can match. ${who} is not even hashed.` : `${who} hashes to ${group(p.target)}. ${verdict}`;
  const desc = `Testnet block ${d.height}: ${d.N} scripts hashed onto 0 to F = ${group(d.F)}: ${d.values.map(group).join(", ") || "none"}. ${status} Decoded: ${p.steps.map((s) => group(s.value)).join(", ") || "nothing"}; values not read are drawn empty.${showBits && d.N ? ` The filter, ${d.filterBytes} bytes, starts with N = ${d.N}, then the codes ${d.codes.map((c) => `${c.unary} ${c.remainder}`).join(", ")}${d.codes.length < d.N ? ", and more" : ""}.` : ""}`;

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330, x0 = 18, x1 = W - 18;
    const ids = idsFor(`${figureId}-${wide ? "w" : "n"}`);
    const ly = wide ? 128 : 186;
    const tx = along(p.target, d.F, x0, x1);
    const codes = d.codes.slice(0, wide ? 3 : 2);
    const codeBits = 8 + codes.reduce((n, c) => n + c.unary.length + c.remainder.length, 0);
    const cs = Math.min(wide ? 7 : 6.5, (x1 - x0 - 14 - codes.length * 4) / codeBits);
    const by = ly + 88;
    return (
      <Drawing id={`${figureId}-${wide ? "w" : "n"}`} width={W} height={!d.N ? 148 : showBits ? by + 54 : ly + 70} title="A filter, built and queried" desc={desc}>
        {/* The query: script → SipHash → target (none for an empty filter) */}
        {d.N ? <g>
        <rect class="k-outline k-fill--plain" x={x0} y={18} width={112} height={24} />
        <text class="k-bf-hex" x={x0 + 6} y={33.5}>{shortHex(p.script, 7)}</text>
        <Value at={[x0, 12]} text={p.from === "this block" ? "TEST SCRIPT · FROM THIS BLOCK" : `TEST SCRIPT · FROM ${fromText(p.from).toUpperCase()}`} size={8} cls="k-value--label" />
        <path class="k-line" d={wide ? `M${x0 + 116} 30 H${x0 + 160}` : `M${x0 + 56} 46 V64`} marker-end={ids.arrow} />
        <Machine at={wide ? [x0 + 200, 44] : [x0 + 30, 96]} w={58} d={30} h={24} label="SipHash" role="hash" />
        <Value at={wide ? [x0 + 290, 34] : [x0 + 120, 92]} text={`→ ${group(p.target)}`} size={10} />
        <Value at={wide ? [x0 + 290, 46] : [x0 + 120, 104]} text="TARGET IN [0, F)" size={8.5} cls="k-value--muted" />
        <Value at={wide ? [x0 + 290, 60] : [x0 + 120, 116]} text="KEY: FIRST 16 B OF THE BLOCK HASH" size={8.5} cls="k-value--muted" />
        </g> : <Value at={[x0, 40]} text="N = 0 · THE FILTER IS ONE ZERO BYTE" size={9} cls="k-value--label" />}
        {/* An empty set has no hash range to search. */}
        {!d.N ? <g>
          <rect class="k-outline k-fill--net" x={x0} y="66" width="54" height="54" />
          <Value at={[x0 + 27, 101]} text="00" size={22} anchor="middle" />
          <Value at={[x0 + 72, 87]} text="NO ITEMS" size={11} cls="k-value--label" />
          <Value at={[x0 + 72, 107]} text="no query can match" size={10} />
        </g> : <g>
        {/* The line [0, F): decoded values solid, undecoded drawn empty. */}
        <line class="k-line" x1={x0} y1={ly} x2={x1} y2={ly} />
        <Value at={[x0, ly + 16]} text="0" size={8.5} cls="k-value--muted" />
        <Value at={[x1, ly + 16]} text={`F = N·M = ${group(d.F)}`} size={8.5} anchor="end" cls="k-value--muted" />
        {/* Values not read yet first, so decoded ones sit on top. */}
        {[...d.values.keys()].sort((a, b) => Number(a < read) - Number(b < read)).map((i) => {
          const v = d.values[i];
          const x = along(v, d.F, x0, x1), px = i === 0 ? x0 : along(d.values[i - 1], d.F, x0, x1);
          const seen = i < read;
          return (
            <g data-decoded={String(seen)}>
              {seen && x - px > 4 ? <path class="k-leader" d={`M${px} ${ly} Q${(px + x) / 2} ${ly - 30} ${x} ${ly}`} /> : null}
              <rect class={`k-cell ${seen ? "k-mark--hash" : "k-fill--plain k-dashed"}`} x={x - 3.5} y={ly - 3.5} width="7" height="7" />
            </g>
          );
        })}
        <path class="k-bf-target" d={`M${tx} ${ly + 22} V${ly + 6} M${tx - 4} ${ly + 11} L${tx} ${ly + 5} L${tx + 4} ${ly + 11}`} />
        <Value at={[Math.min(Math.max(tx, x0 + 40), x1 - 40), ly + 34]} text={d.N === 0 ? "EMPTY" : p.matched ? "MATCH · MAYBE" : "NO MATCH"} size={9} anchor="middle" cls="k-value--label" />
        {last && !p.matched ? <Value at={[along(last.value, d.F, x0, x1), ly - 34]} text={past ? "PASSED: STOP" : "END OF FILTER"} size={8.5} anchor="middle" cls="k-value--muted" /> : null}
        <Value at={[x0, ly + 54]} text="EMPTY MARK: IN THE FILTER, NOT READ" size={8.5} cls="k-value--muted" />
        </g>}
        {showBits && d.N ? (
          <g>
            <Value at={[x0, by - 8]} text={`THE FILTER'S FIRST BITS · ${d.filterBytes} BYTES IN ALL`} size={8} cls="k-value--label" />
            <Cells x={x0} y={by} values={[...d.N.toString(2).padStart(8, "0")]} size={cs} text={false} strong={(k) => d.N.toString(2).padStart(8, "0")[k] === "1"} />
            {codes.map((c, i) => {
              const start = x0 + 8 * cs + 4 + codes.slice(0, i).reduce((n, k) => n + (k.unary.length + k.remainder.length) * cs + 4, 0);
              return (
                <g>
                  <Cells x={start} y={by} values={[...c.unary]} size={cs} text={false} strong={(k) => c.unary[k] === "1"} />
                  <g class="k-bf-rem"><Cells x={start + c.unary.length * cs + 2} y={by} values={[...c.remainder]} size={cs} text={false} strong={(k) => c.remainder[k] === "1"} /></g>
                  <text class="k-bf-gap" x={start} y={by + cs + 11}>{`GAP ${group(c.delta)}`}</text>
                </g>
              );
            })}
            <text class="k-bf-gap" x={x0} y={by + cs + 11}>N</text>
            {d.N > codes.length ? <text class="k-bf-gap" x={x1} y={by + cs - 1} text-anchor="end">…</text> : null}
          </g>
        ) : null}
      </Drawing>
    );
  };

  const strip = (label: string, name: string, opts: Array<[string, string]>, cur: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {opts.map(([v, t]) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${name}`} checked={cur === v} onChange={() => set(v)} />
          <span>{t}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Published block", "block", fixtures.map((x) => [x.id, x.shortLabel ?? `Block ${group(x.derived.height)}`]), id, (v) => (setId(v), setPi(0)))}
          {d.probes.length ? strip("Test script", "probe", d.probes.map((q, i) => [String(i), probeName(q.from, i)]), String(pi), (v) => setPi(Number(v))) : null}
          {strip("Show", "bits", [["values", "Values"], ["bits", "Bits"]], bits ? "bits" : "values", (v) => setBits(v === "bits"))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the first block, its first test script and the filter's first bits. With JavaScript you can choose among {fixtures.length} published blocks and test other scripts.</p>
      )}
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <dl class="atlas-hexlist">
          <dt>Test script</dt><dd><code class="atlas-break">{p.script || "(empty)"}</code></dd>
          <dt>Filter ({d.filterBytes} bytes)</dt><dd><code class="atlas-break">{d.filterHex}</code></dd>
          <dt>Hashed values</dt><dd>{d.values.map(group).join(", ") || "none"}</dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 158 testnet-19.json, block {group(d.height)}{d.notes ? ` (“${d.notes}”)` : ""}. Filter and header rebuilt by the tested model and equal to the vector.</p>
    </div>
  );
}
