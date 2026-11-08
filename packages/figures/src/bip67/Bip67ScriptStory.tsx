import { Cells, Machine, Storyboard, Value, short, type Frame } from "../kit";
import type { DerivedBip67Fixture } from "../types";

/**
 * bip67-script-story.v1 — static storyboard. One published vector from
 * sorted keys to address: the 2-of-n script laid out byte by byte, its
 * HASH160, and the Base58Check address with version 05.
 */
export function Bip67ScriptStory({ fixture: f }: { fixture: DerivedBip67Fixture }) {
  const d = f.derived;
  const L = (k: string) => d.letterOf[k];
  const n = d.sorted.length;
  // The script as items: opcode or push byte, then each 33-byte key.
  const items: Array<{ hex: string; what: string; bytes: number; key?: boolean }> = [
    { hex: d.scriptHex.slice(0, 2), what: "OP_2 · signatures needed", bytes: 1 },
    ...d.sorted.flatMap((k) => [
      { hex: "21", what: "push the next 33 bytes", bytes: 1 },
      { hex: short(k, 4), what: `key ${L(k)}`, bytes: 33, key: true },
    ]),
    { hex: d.scriptHex.slice(-4, -2), what: `OP_${n} · keys listed`, bytes: 1 },
    { hex: d.scriptHex.slice(-2), what: "OP_CHECKMULTISIG", bytes: 1 },
  ];
  if (items.reduce((s, x) => s + x.bytes, 0) * 2 !== d.scriptHex.length) throw new Error(`${f.id}: script items do not add up to the script`);
  const frames: Frame[] = [
    {
      note: `Sort the ${n} keys by their bytes: ${d.sorted.map(L).join(", ")}.`,
      desc: `The keys in byte order: ${d.sorted.map((k) => `${L(k)} ${k}`).join(", ")}.`,
      draw: () => (
        <>
          {d.sorted.map((k, i) => (
            <g>
              <rect class="k-outline k-fill--public" x={14} y={14 + i * 28} width={230} height={22} />
              <Value at={[20, 29 + i * 28]} text={`${i + 1}. ${L(k)} · ${short(k, 20)}`} size={9} />
            </g>
          ))}
        </>
      ),
    },
    {
      note: `Build the script: OP_2, ${n} pushes of 33 bytes, OP_${n}, OP_CHECKMULTISIG: ${d.scriptHex.length / 2} bytes.`,
      desc: `The script, ${d.scriptHex.length / 2} bytes: ${d.scriptHex}.`,
      draw: () => (
        <>
          {items.map((x, i) => (
            <g>
              <rect class={`k-cell k-fill--${x.key ? "public" : "plain"}`} x={14} y={6 + i * 12} width={58} height={11} />
              <Value at={[18, 14.5 + i * 12]} text={x.hex} size={8} />
              <Value at={[80, 14.5 + i * 12]} text={x.what} size={8} />
              <Value at={[286, 14.5 + i * 12]} text={`${x.bytes} B`} size={8} anchor="end" cls="k-value--muted" />
            </g>
          ))}
          <Value at={[286, 124]} text={`${d.scriptHex.length / 2} BYTES`} size={8} anchor="end" cls="k-value--label" />
        </>
      ),
    },
    {
      note: `HASH160 of the script gives 20 bytes: ${short(d.hash160Hex, 8)}`,
      desc: `HASH160 of the script is ${d.hash160Hex}.`,
      draw: () => (
        <>
          <Machine at={[60, 20]} w={70} d={22} h={18} label="HASH160" role="hash" />
          <Cells x={14} y={78} values={d.hash160Hex.match(/../g)!} size={13.5} roleOf={() => "hash"} />
        </>
      ),
    },
    {
      note: `Base58Check with version 05 gives the address ${short(d.address, 10)}`,
      desc: `Version byte 05, the 20-byte hash and a 4-byte checksum, in Base58: ${d.address}.`,
      draw: () => (
        <>
          <rect class="k-outline k-fill--hash k-cell--em" x={14} y={40} width={270} height={26} />
          <Value at={[22, 57]} text={d.address} size={9.5} />
          <Value at={[14, 84]} text="STARTS WITH 3: A MAINNET P2SH ADDRESS" size={8} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a20-story" title="From sorted keys to an address" width={300} height={130} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Script ({d.scriptHex.length / 2} bytes)</dt><dd><code class="atlas-break">{d.scriptHex}</code></dd>
          <dt>HASH160</dt><dd><code class="atlas-break">{d.hash160Hex}</code></dd>
        </dl>
      </details>
    </>
  );
}
