import { BASIC_M, BASIC_P, filterKey } from "@bip-atlas/models/blockfilter";
import { bytesToHex } from "@bip-atlas/models/hex";
import { Arrow, Bracket, Cells, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { Code } from "./BfGolomb";
import { along, group, shortHex } from "./parts";

/**
 * bf-build-story.v1 — static storyboard (was the worked example). One
 * vector block's basic filter, built step by step: scripts into SipHash,
 * values on [0, F), gaps, Golomb-Rice codes, and the serialized bytes. The
 * filter equals the published one (checked at build time).
 */
export function BfBuildStory({ fixture }: { fixture: DerivedBfBlockFixture }) {
  const d = fixture.derived;
  if (d.N === 0 || d.codes.length !== d.N) throw new Error(`${fixture.id}: the storyboard draws every code, so it needs a small non-empty filter`);
  if (d.N >= 0xfd || d.filterHex.slice(0, 2) !== d.N.toString(16).padStart(2, "0")) throw new Error(`${fixture.id}: the storyboard assumes N fits a one-byte CompactSize`);
  const set = d.elements.filter((e) => e.included);
  const key = bytesToHex(filterKey(d.hash));
  const bytes = d.filterHex.match(/.{2}/g)!;
  const line = (y: number, arcs: boolean) => (
    <g>
      <line class="k-line" x1="14" y1={y} x2="286" y2={y} />
      <line class="k-leader" x1="14" y1={y - 4} x2="14" y2={y + 4} />
      <line class="k-leader" x1="286" y1={y - 4} x2="286" y2={y + 4} />
      <Value at={[14, y + 16]} text="0" size={8.5} cls="k-value--muted" />
      <Value at={[286, y + 16]} text={`F = ${group(d.F)}`} size={8.5} anchor="end" cls="k-value--muted" />
      {d.values.map((v, i) => {
        const x = along(v, d.F, 14, 286), px = i === 0 ? 14 : along(d.values[i - 1], d.F, 14, 286);
        return (
          <g>
            {arcs ? <path class="k-leader" d={`M${px} ${y} Q${(px + x) / 2} ${y - 34} ${x} ${y}`} /> : null}
            {arcs ? <text class="k-bf-gap" x={(px + x) / 2} y={y - 20} text-anchor="middle">{group(d.codes[i].delta)}</text> : null}
            <rect class="k-cell k-mark--hash" x={x - 3} y={y - 3} width="6" height="6" />
            {arcs ? null : <text class="k-bf-gap" x={x} y={y - 9 - (i % 2) * 14} text-anchor="middle">{group(v)}</text>}
          </g>
        );
      })}
    </g>
  );
  const frames: Frame[] = [
    {
      note: `The block's ${d.N} scripts go through SipHash-2-4, keyed with the first 16 bytes of the block hash.`,
      desc: `The ${d.N} distinct scripts of testnet block ${d.height} (${set.map((e) => e.script).join(", ")}) are hashed with SipHash-2-4 under the key ${key}, the first 16 bytes of the block hash in little-endian order.`,
      draw: (ids) => (
        <>
          {set.map((e, i) => (
            <g>
              <rect class="k-outline k-fill--plain" x="14" y={18 + i * 18} width="84" height="13" />
              <text class="k-bf-hex" x="19" y={27.5 + i * 18}>{shortHex(e.script, 5)}</text>
            </g>
          ))}
          <Arrow d="M104 44 H140" ids={ids} />
          <Machine at={[180, 60]} w={64} d={34} h={28} label="SipHash" sub="2-4" role="hash" />
          <Value at={[150, 116]} text={`KEY ${key.slice(0, 8)}…`} size={8.5} cls="k-value--label" />
        </>
      ),
    },
    {
      note: `Each 64-bit hash is scaled into [0, F), F = N · M = ${d.N} × ${group(BASIC_M.toString())}.`,
      desc: `Each hash is multiplied by F = ${d.F} and the top 64 bits kept, giving ${d.values.join(", ")}.`,
      draw: () => line(78, false),
    },
    {
      note: "Sorted, only the gaps between neighbours are kept.",
      desc: `Sorted, the values give the gaps ${d.codes.map((c) => c.delta).join(", ")}.`,
      draw: () => line(84, true),
    },
    {
      note: `Each gap becomes a Golomb-Rice code: the quotient by 2^${BASIC_P} in unary, then ${BASIC_P} remainder bits.`,
      desc: d.codes.map((c) => `Gap ${c.delta}: q = ${c.q}, ${c.unary} then ${c.remainder}`).join(". ") + ".",
      draw: () => (
        <>
          {d.codes.map((c, i) => (
            <g>
              <Value at={[14, 26 + i * 34]} text={`GAP ${group(c.delta)}`} size={8} cls="k-value--label" />
              <Code x={14} y={31 + i * 34} unary={c.unary} remainder={c.remainder} size={11.5} />
            </g>
          ))}
        </>
      ),
    },
    {
      note: `Pad with ${d.paddingBits} zero bit${d.paddingBits === 1 ? "" : "s"} to whole bytes and put N in front: the ${d.filterBytes}-byte filter, equal to the published one.`,
      desc: `${d.bitsTotal} code bits and ${d.paddingBits} padding bits make ${d.filterBytes - 1} bytes; with N = ${d.N} as a one-byte CompactSize in front, the filter is ${d.filterHex}, as published.`,
      draw: () => {
        const cw = Math.min(30, 272 / bytes.length);
        return (
          <>
            <Cells x={14} y={50} values={bytes} size={cw} roleOf={(i) => (i === 0 ? "plain" : "net")} />
            <Bracket x1={14} x2={14 + cw} y={46} text={`N = ${d.N}`} below={false} align="start" />
            <Bracket x1={14 + cw} x2={14 + bytes.length * cw} y={50 + cw + 4} text={`${d.bitsTotal} code bits + ${d.paddingBits} padding`} />
          </>
        );
      },
    },
  ];
  return (
    <>
      <Storyboard id="a16-build" title={`Building block ${group(d.height)}'s filter`} width={300} height={130} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Block hash</dt><dd><code class="atlas-break">{d.hash}</code></dd>
          <dt>SipHash key</dt><dd><code class="atlas-break">{key}</code></dd>
          {set.map((e, i) => <><dt>Script {i + 1}</dt><dd><code class="atlas-break">{e.script}</code></dd></>)}
          <dt>Filter ({d.filterBytes} bytes)</dt><dd><code class="atlas-break">{d.filterHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
