import { useEffect, useState } from "preact/hooks";
import type { DerivedBfBlockFixture } from "../types";

interface Props {
  fixtures: DerivedBfBlockFixture[];
  figureId: string;
}

const short = (hex: string) => (hex.length > 24 ? `${hex.slice(0, 12)}…${hex.slice(-8)}` : hex === "" ? "(empty)" : hex);
const pct = (v: string, F: string) => (F === "0" ? 0 : Number((BigInt(v) * 10000n) / BigInt(F)) / 100);
const group = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * gcs-filter.v1 — the Block filters chapter's hero figure.
 *
 * Published BIP 158 testnet blocks. At build time the tested model rebuilds
 * each basic filter from the block and its spent scripts and the build fails
 * unless the filter bytes and filter header equal the vector's. Queries are
 * precomputed too: the browser only chooses what to show.
 */
export function GcsFilter({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [probeAt, setProbeAt] = useState(0);
  const [coding, setCoding] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const probe = d.probes[Math.min(probeAt, d.probes.length - 1)];
  const showCoding = hydrated ? coding : true;

  return (
    <div class="atlas-lab atlas-bf-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published block</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-block`} checked={x.id === id} onChange={() => (setId(x.id), setProbeAt(0))} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-bf-coding">
            <input type="checkbox" checked={coding} onChange={(e) => setCoding((e.target as HTMLInputElement).checked)} />
            Reveal Golomb-Rice coding
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first block, its first query and its coding. With JavaScript you can choose among {fixtures.length} published blocks and test other scripts.</p>
      )}

      <section class="atlas-panel" aria-label="Filter elements">
        <h3 class="atlas-panel__title">Block {group(String(d.height))}: {d.txCount} transaction{d.txCount === 1 ? "" : "s"}, {d.N} element{d.N === 1 ? "" : "s"} in the filter</h3>
        <ul class="atlas-bf-elems">
          {d.elements.map((e) => (
            <li data-included={e.included ? "true" : "false"}>
              <span class="atlas-bf-elems__from">{e.from === "output" ? "output script" : "spent script"}</span>
              <code>{short(e.script)}</code>
              {e.included ? null : <em>left out: {e.reason}</em>}
            </li>
          ))}
        </ul>
      </section>

      <section class="atlas-panel atlas-bf-query" aria-label="Test a script against the filter">
        <h3 class="atlas-panel__title">Test a script against the filter</h3>
        {d.probes.length === 0 || d.N === 0 ? null : hydrated ? (
          <fieldset class="atlas-bf-probes">
            <legend>Fixture script</legend>
            {d.probes.map((p, i) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-probe`} checked={i === probeAt} onChange={() => setProbeAt(i)} />
                <span><code>{short(p.script)}</code><small>from {p.from}</small></span>
              </label>
            ))}
          </fieldset>
        ) : <p>Script <code>{short(probe.script)}</code>, from {probe.from}.</p>}
        {d.N === 0 ? (
          <p class="atlas-bf-verdict" data-matched="false">N = 0: the filter is empty, so no script can match and there is nothing to hash or decode.</p>
        ) : probe ? (
          <>
            <svg class="atlas-bf-line" viewBox="0 0 1000 60" role="img" aria-label={`The ${d.N} hashed values on the range 0 to F, with the queried script's value marked.`}>
              <line x1="10" y1="30" x2="990" y2="30" class="atlas-bf-line__axis" />
              {d.values.map((v) => <circle cx={10 + pct(v, d.F) * 9.8} cy="30" r="6" class="atlas-bf-line__dot" />)}
              <line x1={10 + pct(probe.target, d.F) * 9.8} x2={10 + pct(probe.target, d.F) * 9.8} y1="8" y2="52" class="atlas-bf-line__target" />
              <text x="10" y="58" class="atlas-bf-line__label">0</text>
              <text x="990" y="58" text-anchor="end" class="atlas-bf-line__label">F = N·M</text>
            </svg>
            <p class="atlas-bf-target">Hashed into [0, F): <code>{group(probe.target)}</code> of F = <code>{group(d.F)}</code></p>
            <ol class="atlas-bf-steps" aria-live="polite">
              {probe.steps.map((s, i) => (
                <li data-outcome={s.outcome}>
                  value {i + 1}: <code>{group(s.value)}</code> {s.outcome === "equal" ? "equals the target" : s.outcome === "greater" ? "is past the target: stop" : "is below the target: keep decoding"}
                </li>
              ))}
            </ol>
            <p class="atlas-bf-verdict" data-matched={probe.matched ? "true" : "false"}>
              {probe.matched
                ? "Match: the block may concern this script. A match can be a false positive, so the client downloads the block to find out."
                : "No match: if this is the correct filter, no output in this block pays to this script and no input spends from it. That certainty covers only what the filter holds: OP_RETURN outputs, for one, are left out."}
            </p>
          </>
        ) : null}
      </section>

      <section class="atlas-panel" aria-label="Golomb-Rice coding">
        <h3 class="atlas-panel__title">The filter on the wire: {d.filterBytes} byte{d.filterBytes === 1 ? "" : "s"}</h3>
        {!showCoding ? (
          <p class="atlas-panel__empty">Hidden. Tick “Reveal Golomb-Rice coding” to see how the sorted values become bits.</p>
        ) : (
          <>
            <p class="atlas-bf-hex"><code class="atlas-break">{d.filterHex}</code></p>
            {d.N === 0 ? <p>N = 0: a filter with no elements is written as one zero byte.</p> : (
              <>
                <p>First byte{d.filterHex.length > 2 && d.N >= 0xfd ? "s" : ""}: N = {d.N} as a CompactSize. Then each gap between sorted values, as q ones, a zero, and 19 remainder bits:</p>
                <ol class="atlas-bf-codes">
                  {d.codes.map((c) => (
                    <li>
                      <span class="atlas-bf-codes__delta">gap {group(c.delta)}</span>
                      <code><span data-part="unary">{c.unary}</span><span data-part="rem">{c.remainder}</span></code>
                      <small>q = {c.q}, r = {group(c.r)}</small>
                    </li>
                  ))}
                </ol>
                <p class="atlas-panel__scope">{d.codes.length < d.N ? `${d.N - d.codes.length} more codes follow. ` : ""}{d.bitsTotal} bits of codes, then {d.paddingBits} zero bit{d.paddingBits === 1 ? "" : "s"} of padding to the byte boundary.</p>
              </>
            )}
          </>
        )}
      </section>
      <p class="atlas-lab__source">
        Source: BIP 158 testnet-19.json, block {group(String(d.height))}{d.notes ? ` (“${d.notes}”)` : ""}, line {f.source.line}. Rebuilt at build time by the tested model; the filter bytes and the filter header equal the vector’s.
      </p>
    </div>
  );
}
