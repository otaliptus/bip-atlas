import { checkSpec, type HeroSpec } from "../heroStates";
import { Arrow, Cells, Drawing, Machine, Magnifier, Responsive, Value, idsFor } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { BytePacket, bytesHeight, layoutBytes, type ByteField } from "./BytePacket";

import { preimageRole, shortHex, txFields } from "./fields";

type Lens = "txid" | "wtxid" | "bip143";
export interface TxHeroState { fixtureId: string; lens: Lens }

interface Props {
  fixtures: DerivedTransactionFixture[];
  figureId: string;
  /** The state to draw. Defaults to the first example through the txid lens (also the no-JS state). */
  initial?: TxHeroState;
}

/** The hero's controls and its six pre-rendered states (two examples × three lenses). */
export function transactionHeroSpec(fixtures: DerivedTransactionFixture[]): HeroSpec<TxHeroState> {
  return checkSpec({
    controls: [
      { kind: "strip", name: "tx", label: "Published example", options: fixtures.map((f) => ({ value: f.id, text: f.shortLabel ?? f.label })) },
      { kind: "strip", name: "lens", label: "Lens", options: LENSES.map((l) => ({ value: l.id, text: l.text })) },
    ],
    states: fixtures.flatMap((f) => LENSES.map((l) => ({ id: `${f.id}-${l.id}`, keys: [`${f.id}|${l.id}`], state: { fixtureId: f.id, lens: l.id } }))),
    initialKey: `${fixtures[0].id}|txid`,
    noJsId: `${fixtures[0].id}-txid`,
    staticNote: "Static view: the first example through the txid lens. With JavaScript you can switch to the wtxid and BIP 143 lenses and to the second example.",
  });
}

const LENSES: Array<{ id: Lens; text: string }> = [
  { id: "txid", text: "txid" },
  { id: "wtxid", text: "wtxid" },
  { id: "bip143", text: "BIP 143 preimage" },
];

const LEGEND: Array<{ role: string; text: string }> = [
  { role: "hash", text: "hash · txid" },
  { role: "sig", text: "signature" },
  { role: "public", text: "public key" },
  { role: "time", text: "nSequence · nLockTime" },
];

/**
 * transaction-anatomy.v1 — the SegWit chapter's hero (drawing-first).
 *
 * A published BIP 143 transaction drawn as a packet diagram on a byte grid,
 * every field from the tested model. Through the txid lens the marker, flag
 * and witness are hatched out and the rest goes into a double SHA-256
 * machine; through the wtxid lens everything does. The BIP 143 lens numbers
 * the bytes that feed each of the ten preimage items, draws the preimage,
 * dashes the items that come from outside the transaction, and gives the
 * published sighash. Controls: an example strip and a lens strip.
 */
export function TransactionAnatomy({ fixtures, figureId, initial }: Props) {
  const { fixtureId, lens } = initial ?? { fixtureId: fixtures[0].id, lens: "txid" as Lens };
  const fixture = fixtures.find((f) => f.id === fixtureId);
  if (!fixture) throw new Error(`transaction-anatomy: no fixture ${fixtureId}`);
  const d = fixture.derived;
  const m = d.measures;
  const signed = fixture.sighash.inputIndex;
  const fields = txFields(d);
  const items = d.digest.items;
  const feeds = new Map<string, number[]>();
  items.forEach((it, n) => it.from.forEach((seg) => feeds.set(seg, [...(feeds.get(seg) ?? []), n + 1])));
  const preimageBytes = items.reduce((n, it) => n + it.hex.length / 2, 0);
  const outside = items.filter((it) => it.from.length === 0);
  const witnessBytes = m.totalSize - m.baseSize;

  const drawn: ByteField[] = fields.map((f) => ({
    id: f.id,
    short: f.short,
    bytes: f.bytes,
    role: f.role,
    hatched: lens === "txid" && f.part !== "base",
    faded: lens === "bip143" && !feeds.has(f.seg),
    // Badge each segment once, on its first drawn field.
    badges: lens === "bip143" && feeds.has(f.seg) && fields.find((g) => g.seg === f.seg) === f ? feeds.get(f.seg) : undefined,
  }));
  const preimage: ByteField[] = items.map((it, n) => ({
    id: `pre-${it.id}`,
    short: it.label,
    bytes: it.hex.length / 2,
    role: preimageRole(it.id),
    outside: it.from.length === 0,
    em: it.id === "amount",
    badges: [n + 1],
  }));

  const hashName = lens === "txid" ? "txid" : "wtxid";
  const hashHex = lens === "txid" ? m.txidHex : m.wtxidHex;
  const status =
    lens === "txid"
      ? `txid: double SHA-256 of the ${m.baseSize} bytes a pre-SegWit node sees. The marker, flag and witness (${witnessBytes} bytes) are left out.`
      : lens === "wtxid"
        ? `wtxid: double SHA-256 of all ${m.totalSize} bytes, marker, flag and witness included.`
        : `BIP 143 preimage for input ${signed}: ten items, ${preimageBytes} bytes. Numbered bytes feed the item with that number; ${outside.map((o) => o.label).join(", ").replace(/, ([^,]*)$/, " and $1")} are not fields of the transaction.`;
  const describe = () =>
    `${fixture.label}: a serialized transaction of ${m.totalSize} bytes. Fields in order: ${fields.map((f) => `${f.label}, ${f.bytes} byte${f.bytes === 1 ? "" : "s"}`).join("; ")}. ` +
    (lens === "bip143"
      ? `Preimage items for input ${signed}: ${items.map((it, n) => `${n + 1} ${it.label}, ${it.hex.length / 2} bytes, ${it.note}`).join("; ")}. Its double SHA-256, the sighash, is ${d.digest.sighashHex}, as published.`
      : `${status} Result: ${hashHex}.`);

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const W = wide ? 640 : 330;
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const perRow = wide ? 40 : 30, unit = 10, rowH = 20, gap = 4;
    const x0 = wide ? 24 : 15, y0 = 124;
    const segs = layoutBytes(drawn, perRow, x0, y0, unit, rowH, gap);
    const pH = bytesHeight(m.totalSize, perRow, rowH, gap);
    const pEnd = y0 + pH;
    const marker = segs.find((s) => s.field.id === "marker");
    const flagHex = fields.find((f) => f.id === "flag")?.hex;
    const markerHex = fields.find((f) => f.id === "marker")?.hex;
    // Preimage (BIP 143 lens), below the transaction.
    const preY = pEnd + 44;
    const preSegs = layoutBytes(preimage, perRow, x0, preY, unit, rowH, gap);
    const preEnd = preY + bytesHeight(preimageBytes, perRow, rowH, gap);
    // The machine: right column when wide, below when narrow.
    const mx = wide ? 520 : 110;
    const my = lens === "bip143" ? (wide ? preY + 40 : preEnd + 62) : wide ? 214 : pEnd + 62;
    const resX = wide ? 470 : 190;
    const resY = wide ? my + 86 : my - 4;
    const legendY = Math.max(lens === "bip143" ? preEnd : pEnd, resY + 30, my + 40) + 34;
    const per = wide ? 4 : 2;
    const H = legendY + Math.ceil((LEGEND.length + (lens === "txid" ? 1 : 0)) / per) * 16 + 6;
    const legend = [...LEGEND, ...(lens === "txid" ? [{ role: "hatch", text: "not in the txid" }] : [])];
    return (
      <Drawing id={id} width={W} height={H} title="Which bytes each hash covers" desc={describe()}>
        <Value at={[x0, 16]} text={`${fixture.label.toUpperCase()} · ${m.totalSize} BYTES`} size={9} cls="k-value--label" />
        {lens !== "bip143" && marker && markerHex && flagHex ? (
          <>
            <Magnifier id={`${id}-mag`} from={[marker.x + 10, marker.y + rowH / 2]} fromR={13} at={[wide ? 210 : 140, 64]} r={34}>
              <Cells x={(wide ? 210 : 140) - 22} y={53} values={[markerHex, flagHex]} size={22} roleOf={() => "plain"} />
            </Magnifier>
            {lens === "txid" ? (
              <rect x={(wide ? 210 : 140) - 22} y={53} width="44" height="22" style={`fill:${ids.hatch};opacity:0.55`} />
            ) : null}
            <Value at={[(wide ? 210 : 140) + 44, 56]} text="MARKER · FLAG" size={9} cls="k-value--label" />
            <Value at={[(wide ? 210 : 140) + 44, 70]} text={lens === "txid" ? "NOT IN THE TXID" : "HASHED INTO THE WTXID"} size={9} cls="k-value--muted" />
          </>
        ) : null}
        {lens === "bip143" ? (
          <>
            <circle class="k-outline k-fill--plain" cx={x0 + 5} cy={56} r="5" />
            <text class="k-badge__t" x={x0 + 5} y={58.6} text-anchor="middle">n</text>
            <Value at={[x0 + 16, 59]} text={wide ? "BYTES THAT FEED PREIMAGE ITEM n; FADED BYTES ARE NOT USED" : "FEEDS PREIMAGE ITEM n"} size={9} cls="k-value--label" />
            <rect class="k-cell k-fill--plain k-dashed" x={x0} y={72} width="10" height="10" />
            <Value at={[x0 + 16, 81]} text="DASHED: NOT A FIELD OF THE TX" size={9} cls="k-value--label" />
          </>
        ) : null}
        <BytePacket segs={segs} hatch={ids.hatch} ruler perRow={perRow} unit={unit} x={x0} y={y0} rowH={rowH} />
        {lens === "bip143" ? (
          <>
            <Value at={[x0, preY - 14]} text={`BIP 143 PREIMAGE · INPUT ${signed} · ${preimageBytes} BYTES`} size={9} cls="k-value--label" />
            <BytePacket segs={preSegs} hatch={ids.hatch} perRow={perRow} unit={unit} x={x0} y={preY} rowH={rowH} />
            {wide ? <Arrow d={`M${x0 + perRow * unit + 6} ${preY + 30} H${mx - 40}`} ids={ids} /> : <Arrow d={`M${mx + 20} ${preEnd + 6} V${my - 34}`} ids={ids} />}
          </>
        ) : wide ? (
          <Arrow d={`M${x0 + perRow * unit + 6} ${y0 + pH / 2} H${mx - 40}`} ids={ids} />
        ) : (
          <Arrow d={`M${mx + 20} ${pEnd + 6} V${my - 34}`} ids={ids} />
        )}
        <Machine at={[mx, my]} w={70} d={36} h={30} label="SHA-256" sub="twice" role="hash" />
        <Value at={[resX, resY]} text={lens === "bip143" ? "SIGHASH" : hashName.toUpperCase()} size={9} cls="k-value--label" />
        <Value at={[resX, resY + 13]} text={shortHex(lens === "bip143" ? d.digest.sighashHex : hashHex, 16)} size={9.5} cls="k-value--hash" />
        <Value
          at={[resX, resY + 26]}
          text={lens === "bip143" ? `= BIP 143 LINE ${fixture.sighash.sighashLine}` : lens === "txid" ? `${m.baseSize} OF ${m.totalSize} BYTES` : `ALL ${m.totalSize} BYTES`}
          size={9}
          cls="k-value--muted"
        />
        {legend.map((l, k) => {
          const lx = x0 + (k % per) * (wide ? 150 : 150);
          const ly = legendY + Math.floor(k / per) * 16;
          return (
            <g>
              <rect class={`k-cell k-fill--${l.role === "hatch" ? "plain" : l.role}`} x={lx} y={ly - 8} width="10" height="10" style={l.role === "hatch" ? `fill:${ids.hatch}` : undefined} />
              <text class="k-legend__t" x={lx + 15} y={ly + 0.5}>{l.text.toUpperCase()}</text>
            </g>
          );
        })}
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <dl class="atlas-hexlist">
          {lens === "bip143" ? (
            <>
              {items.map((it, n) => (
                <>
                  <dt>{n + 1}. {it.label} ({it.note})</dt>
                  <dd><code class="atlas-break">{it.hex}</code></dd>
                </>
              ))}
              <dt>Sighash (double SHA-256 of the preimage)</dt><dd><code class="atlas-break">{d.digest.sighashHex}</code></dd>
            </>
          ) : (
            <>
              <dt>{hashName} (byte order as computed)</dt><dd><code class="atlas-break">{hashHex}</code></dd>
              <dt>Base size · total size</dt><dd>{m.baseSize} bytes · {m.totalSize} bytes</dd>
            </>
          )}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 143 line {fixture.source.line} ({fixture.source.section}). Parsed and hashed by the tested model; the preimage and sighash match the published ones. Serialization only: nothing here checks signatures.</p>
    </>
  );
}
