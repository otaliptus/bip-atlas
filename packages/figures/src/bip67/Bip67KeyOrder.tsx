import { checkSpec, type HeroSpec } from "../heroStates";
import { Arrow, Drawing, KeyGlyph, Machine, Responsive, Value, idsFor, short } from "../kit";
import type { DerivedBip67Fixture } from "../types";

export interface Bip67HeroState { order: number; sorted: boolean }

interface Props {
  fixtures: DerivedBip67Fixture[];
  figureId: string;
  /** The order and mode to draw; the listed order, sorted, by default (also the no-JS state). */
  initial?: Bip67HeroState;
}

/** Twelve states: each of the six orders, built as received or sorted first. */
export function bip67HeroSpec(fixtures: DerivedBip67Fixture[]): HeroSpec<Bip67HeroState> {
  const orders = fixtures[0].derived.orders;
  if (orders.length !== 6) throw new Error("bip67-key-order: needs a vector with three keys");
  return checkSpec<Bip67HeroState>({
    controls: [
      { kind: "strip", name: "order", label: "Order the keys arrive in", options: orders.map((o, i) => ({ value: `o${i}`, text: o.letters.split("").join(" ") })) },
      { kind: "strip", name: "sort", label: "Before building the script", options: [{ value: "raw", text: "Use as received" }, { value: "sorted", text: "Sort first (BIP 67)" }] },
    ],
    states: orders.flatMap((o, i) => [
      { id: `o${i}-raw`, keys: [`o${i}|raw`], state: { order: i, sorted: false } },
      { id: `o${i}-sorted`, keys: [`o${i}|sorted`], state: { order: i, sorted: true } },
    ]),
    initialKey: "o0|raw",
    noJsId: "o0-sorted",
    staticNote: "Static view: the keys as the vector lists them, sorted first. With JavaScript you can try all six orders, with and without sorting.",
  });
}

/**
 * bip67-key-order.v1 — the Sorted multisig chapter's hero (drawing-first).
 *
 * BIP 67's vector 4: three cosigners' keys arriving in one of six orders,
 * used as received or sorted by their bytes first, the 2-of-3 script built
 * from that order, and its P2SH address. As received, the six orders give six
 * addresses; sorted, all six give the vector's address. Every script and
 * address comes from the tested model at build time.
 */
export function Bip67KeyOrder({ fixtures, figureId, initial }: Props) {
  const f = fixtures[0];
  const d = f.derived;
  const { order, sorted } = initial ?? { order: 0, sorted: true };
  const o = d.orders[order];
  const built = sorted ? d.sorted : o.keys;
  const script = sorted ? d.scriptHex : o.scriptHex;
  const address = sorted ? d.address : o.address;
  const same = address === f.address;
  const L = (k: string) => d.letterOf[k];
  const tally = d.orders.map((x) => (sorted ? d.address : x.address));
  const distinct = new Set(tally).size;
  const status = sorted
    ? `Received ${o.letters.split("").join(", ")}, sorted to ${d.sorted.map(L).join(", ")}: the script gives ${address}, BIP 67's published address. All six orders give this one address.`
    : `Received ${o.letters.split("").join(", ")} and used as received: the script gives ${address}${same ? ", which happens to be the sorted order" : ", not BIP 67's address"}. The six orders give ${distinct} different addresses.`;
  const desc =
    `Three compressed public keys, A ${short(f.list[0], 10)}, B ${short(f.list[1], 10)}, C ${short(f.list[2], 10)}, arrive in the order ${o.letters}. ` +
    (sorted ? `They are sorted by their bytes into ${d.sorted.map(L).join(", ")}.` : "They are used in that order.") +
    ` The 2-of-3 script OP_2, ${built.map(L).join(", ")}, OP_3, OP_CHECKMULTISIG hashes to the address ${address}. ${status}`;

  const chip = (k: string, x: number, y: number, w: number, em = false) => (
    <g data-key={L(k)}>
      <rect class={`k-outline k-fill--public${em ? " k-cell--em" : ""}`} x={x} y={y} width={w} height={22} />
      <KeyGlyph at={[x + 6, y + 5]} role="public" scale={0.6} />
      <Value at={[x + 32, y + 15]} text={`${L(k)} · ${short(k, w > 150 ? 14 : 8)}`} size={9} />
    </g>
  );

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${wide ? "w" : "n"}`;
    const ids = idsFor(fid);
    const x0 = wide ? 20 : 14;
    const chipW = wide ? 190 : 140;
    // Column 1: received; column 2: the script order.
    const rx = x0, sx = wide ? 430 : x0 + 160;
    const top = 40;
    const midY = top + 36;
    const scriptY = top + 3 * 28 + 34;
    const cells: Array<{ text: string; w: number; role: "plain" | "public" }> = [
      { text: "OP_2", w: wide ? 46 : 34, role: "plain" },
      ...built.map((k) => ({ text: wide ? `${L(k)} · 33 B` : L(k), w: wide ? 104 : 44, role: "public" as const })),
      { text: "OP_3", w: wide ? 46 : 34, role: "plain" },
      { text: wide ? "OP_CHECKMULTISIG" : "CHECKMULTISIG", w: wide ? 128 : 92, role: "plain" },
    ];
    let cx = x0;
    const addrY = scriptY + 62;
    const tallyY = addrY + 52;
    const perRow = wide ? 6 : 3;
    const tw = wide ? 96 : 98;
    const H = tallyY + Math.ceil(6 / perRow) * 40 + 8;
    return (
      <Drawing id={fid} width={W} height={H} title="Six orders, one address once the keys are sorted" desc={desc}>
        <Value at={[x0, 14]} text={wide ? "BIP 67 VECTOR 4 · 2-OF-3 · A, B, C AS THE VECTOR LISTS THEM" : "VECTOR 4 · 2-OF-3 · A, B, C AS LISTED"} size={8.5} cls="k-value--label" />
        <Value at={[rx, top - 6]} text="RECEIVED IN THIS ORDER" size={8} cls="k-value--muted" />
        {o.keys.map((k, i) => chip(k, rx, top + i * 28, chipW))}
        {sorted ? (
          <>
            <Arrow d={wide ? `M${rx + chipW + 6} ${midY} H${rx + chipW + 40}` : `M${rx + chipW + 2} ${midY} H${sx - 4}`} ids={ids} />
            {wide ? <Machine at={[rx + chipW + 70, midY + 6]} w={88} d={24} h={18} label="SORT BYTES" /> : null}
            {wide ? <Arrow d={`M${rx + chipW + 160} ${midY} H${sx - 6}`} ids={ids} /> : <Value at={[sx - 18, top - 6]} text="SORTED" size={8} cls="k-value--label" />}
          </>
        ) : (
          <path class="k-line k-dashed" d={wide ? `M${rx + chipW + 6} ${midY} H${sx - 6}` : `M${rx + chipW + 2} ${midY} H${sx - 4}`} marker-end={ids.arrow} />
        )}
        {wide ? <Value at={[sx, top - 6]} text={sorted ? "SCRIPT ORDER: SORTED BY BYTES" : "SCRIPT ORDER: AS RECEIVED"} size={8} cls="k-value--muted" /> : null}
        {built.map((k, i) => chip(k, sx, top + i * 28, wide ? chipW : W - sx - 14))}
        {/* The script, slot by slot. */}
        <Value at={[x0, scriptY - 8]} text={`THE 2-OF-3 SCRIPT · ${script.length / 2} BYTES`} size={8} cls="k-value--label" />
        {cells.map((c) => {
          const x = cx;
          cx += c.w + 2;
          return (
            <g>
              <rect class={`k-cell k-fill--${c.role}`} x={x} y={scriptY} width={c.w} height={22} />
              <Value at={[x + c.w / 2, scriptY + 15]} text={c.text} size={8.5} anchor="middle" />
            </g>
          );
        })}
        <Arrow d={`M${x0 + 30} ${scriptY + 26} V${addrY - 18}`} ids={ids} />
        <Value at={[x0 + 40, scriptY + 42]} text="HASH160 → BASE58CHECK, VERSION 05" size={8} cls="k-value--muted" />
        <rect class={`k-outline k-fill--hash${same ? " k-cell--em" : ""}`} x={x0} y={addrY - 12} width={wide ? 300 : 210} height={22} />
        <Value at={[x0 + 6, addrY + 3]} text={address} size={wide ? 9.5 : 8} />
        <Value at={[x0 + (wide ? 312 : 216), addrY + 3]} text={same ? "= BIP 67's ADDRESS ✓" : "≠ BIP 67's ADDRESS"} size={8.5} cls={same ? "k-value--ok" : "k-value--fail"} />
        {/* All six orders at once. */}
        <Value at={[x0, tallyY - 8]} text={sorted ? `SORTED FIRST: 6 ORDERS → ${distinct} ADDRESS` : `AS RECEIVED: 6 ORDERS → ${distinct} ADDRESSES`} size={8} cls="k-value--label" />
        {d.orders.map((x, i) => {
          const tx = x0 + (i % perRow) * (tw + 6), ty = tallyY + Math.floor(i / perRow) * 40;
          return (
            <g data-order={x.letters}>
              <rect class={`k-outline k-fill--${tally[i] === f.address ? "hash" : "plain"}${i === order ? " k-cell--em" : ""}`} x={tx} y={ty} width={tw} height={32} />
              <Value at={[tx + 6, ty + 13]} text={x.letters.split("").join(" ")} size={8.5} cls="k-value--label" />
              <Value at={[tx + 6, ty + 26]} text={short(tally[i], 10)} size={8.5} />
            </g>
          );
        })}
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {f.list.map((k) => <><dt>Key {L(k)}</dt><dd><code class="atlas-break">{k}</code></dd></>)}
          <dt>Script ({script.length / 2} bytes)</dt><dd><code class="atlas-break">{script}</code></dd>
          <dt>Address</dt><dd><code class="atlas-break">{address}</code></dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 67 line {f.source.line} (vector 4). Sorted keys, script and address equal the vector; unsorted orders are built by the same tested model. Public test keys: never send funds to these addresses.</p>
    </>
  );
}
