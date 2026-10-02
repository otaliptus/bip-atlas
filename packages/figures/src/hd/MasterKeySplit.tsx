import { Arrow, Bracket, Cells, Drawing, Machine, Value, idsFor } from "../kit";
import type { DerivedBip32Fixture } from "../types";

const bytes = (hex: string) => hex.match(/.{2}/g)!;

/**
 * master-key-split.v1 — static. The seed goes into HMAC-SHA512 keyed with the
 * text "Bitcoin seed"; the 64-byte output is cut in half: the left half is the
 * master private key (secret pink), the right half the master chain code
 * (public green: it travels in every xpub). Every byte from the tested model.
 */
export function MasterKeySplit({ fixture }: { fixture: DerivedBip32Fixture }) {
  const { masterIHex, nodes } = fixture.derived;
  const master = nodes.find((n) => n.path === "m");
  if (!master || master.vectorLine === null) throw new Error(`${fixture.id}: master-key-split.v1 needs the published master node`);
  if (masterIHex.slice(0, 64) !== master.privateKeyHex || masterIHex.slice(64) !== master.chainCodeHex) throw new Error(`${fixture.id}: I does not split into the master key and chain code`);
  const seed = bytes(fixture.seedHex);
  const I = bytes(masterIHex);
  const half = I.length / 2;
  const ids = idsFor("a02-split");
  const rows = Math.ceil(seed.length / 16);
  const seedY = 24;
  const seedBottom = seedY + rows * 18 + (rows - 1) * 4;
  const mTop = seedBottom + 30;
  const oy = mTop + 26;
  const outY = oy + 112;
  const cell = 16;
  const gridW = 8 * cell;
  const lx = 28, rx = 344 - 28 - gridW;
  const gridH = (half / 8) * cell;
  const H = outY + gridH + 74;
  return (
    <>
      <Drawing
        id="a02-split"
        width={344}
        height={H}
        title="The first split"
        desc={`The ${seed.length}-byte seed ${fixture.seedHex} goes into HMAC-SHA512 keyed with the text "Bitcoin seed". Out come ${I.length} bytes, ${masterIHex}. They are cut in half: the first ${half} bytes, ${master.privateKeyHex}, are the master private key; the last ${half}, ${master.chainCodeHex}, are the master chain code. Together they serialize to the master xprv listed on BIP 32 line ${master.vectorLine + 2}.`}
      >
        <Value at={[28, 16]} text={`SEED · ${seed.length} BYTES · TEST VECTOR 1`} size={9} cls="k-value--label" />
        <Cells x={28} y={seedY} values={seed} size={18} perRow={16} roleOf={() => "secret"} />
        <Arrow d={`M172 ${seedBottom + 4} V${mTop - 2}`} ids={ids} />
        <Machine at={[147.75, oy]} w={96} d={40} h={26} label="HMAC-SHA512" />
        <rect class="k-outline k-fill--plain" x="246" y={oy - 36} width="88" height="30" />
        <Value at={[252, oy - 25]} text="KEY" size={9} cls="k-value--muted" />
        <Value at={[252, oy - 12]} text={`"Bitcoin seed"`} size={9} />
        <Arrow d={`M270 ${oy - 6} V${oy + 12} H${236}`} ids={ids} />
        <Arrow d={`M172 ${oy + 58} V${outY - 38}`} ids={ids} />
        <Bracket x1={lx} x2={rx + gridW} y={outY - 6} below={false} text={`I · ${I.length} bytes`} />
        <Cells x={lx} y={outY} values={I.slice(0, half)} size={cell} perRow={8} rowGap={0} roleOf={() => "secret"} />
        <Cells x={rx} y={outY} values={I.slice(half)} size={cell} perRow={8} rowGap={0} roleOf={() => "public"} />
        <line class="k-cut" x1="172" y1={outY - 4} x2="172" y2={outY + gridH + 4} />
        <Bracket x1={lx} x2={lx + gridW} y={outY + gridH + 4} text="I_L → master private key" />
        <Bracket x1={rx} x2={rx + gridW} y={outY + gridH + 4} text="I_R → master chain code" />
        <Value at={[172, outY + gridH + 52]} text={`(k, c) = m · ${master.xprv.slice(0, 12)}…`} anchor="middle" size={9.5} />
        <Value at={[172, outY + gridH + 66]} text={`MATCHES BIP 32 LINE ${master.vectorLine + 2}`} anchor="middle" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact master extended private key</summary>
        <code class="atlas-break">{master.xprv}</code>
      </details>
    </>
  );
}
