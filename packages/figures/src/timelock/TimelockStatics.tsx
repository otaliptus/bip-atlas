import { MEDIAN_TIME_SPAN, medianTimePast } from "@bip-atlas/models/timelock";
import { Arrow, Drawing, IsoBox, Storyboard, Value, type Frame } from "../kit";
import type { DerivedTimelockBipTxFixture, DerivedTimelockCaseFixture, DerivedTimelockEncodingFixture, TimelockCheckView } from "../types";
import { BitRow, CELL, bitRole } from "./bits";

const num = (n: number) => n.toLocaleString("en-US");
const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;
const day = (iso: string) => iso.slice(0, 10);

/**
 * timelock-ranges.v1 — static. nLockTime's 32 bits on one ruler, split at
 * the threshold into heights and Unix times; and the 16 value bits of a
 * relative lock read as blocks or as 512-second units, to one wall-clock
 * scale at the 600-second average BIP 68 uses.
 */
export function TimelockRanges({ fixture }: { fixture: DerivedTimelockEncodingFixture }) {
  const d = fixture.derived;
  const MAX = 2 ** 32 - 1;
  const x0 = 14, w = 316;
  const split = x0 + (d.threshold / MAX) * w;
  const blockSeconds = d.maxBlocks * 600;
  const unit = w / blockSeconds;
  return (
    <Drawing
      id="a10-ranges"
      width={344}
      height={196}
      title="One field, two scales"
      desc={`nLockTime is 32 bits. Values below ${num(d.threshold)} are block heights; from ${num(d.threshold)} (${day(d.thresholdIso)}) to ${num(MAX)} (${day(d.maxLockTimeIso)}) they are Unix times. A relative lock keeps 16 bits: up to ${num(d.maxBlocks)} blocks, or up to ${num(d.maxTimeUnits)} units of 512 seconds, ${num(d.maxTimeSeconds)} seconds; at 600 seconds a block the first is the longer.`}
    >
      <Value at={[x0, 14]} text="nLOCKTIME · 32 BITS, TO SCALE" size={9} cls="k-value--label" />
      <rect class="k-cell k-fill--time k-cell--em" x={x0} y={24} width={split - x0} height="20" />
      <rect class="k-cell k-fill--time" x={split} y={24} width={x0 + w - split} height="20" />
      <text class="k-card__name" x={split + 6} y={37.5}>UNIX TIMES</text>
      <text class="k-card__name" x={x0} y={58}>0 · HEIGHTS</text>
      <line class="k-cut" x1={split} y1={18} x2={split} y2={50} />
      <Value at={[split - 2, 72]} text={`${num(d.threshold)} = ${day(d.thresholdIso)}`} size={9} cls="k-value--label" />
      <Value at={[x0 + w, 86]} text={`${num(MAX)} = ${day(d.maxLockTimeIso)}`} size={9} anchor="end" cls="k-value--muted" />
      <Value at={[x0, 112]} text="nSEQUENCE · LOW 16 BITS, IN WALL-CLOCK TIME" size={9} cls="k-value--label" />
      <rect class="k-cell k-fill--time" x={x0} y={120} width={blockSeconds * unit} height="16" />
      <text class="k-card__name" x={x0 + 5} y={131.5}>{`BIT 22 CLEAR: ${num(d.maxBlocks)} BLOCKS (≈ 1.25 YEARS)`}</text>
      <rect class="k-cell k-mark--time" x={x0} y={144} width={d.maxTimeSeconds * unit} height="16" />
      <text class="k-card__name k-card__name--on" x={x0 + 5} y={155.5}>{`BIT 22 SET: ${num(d.maxTimeUnits)} × 512 S (≈ 1.06 YEARS)`}</text>
      <Value at={[x0, 180]} text={`= ${num(d.maxTimeSeconds)} S · BARS AT 600 S A BLOCK`} size={9} cls="k-value--muted" />
    </Drawing>
  );
}

/**
 * timelock-not-a-lock.v1 — static storyboard, schematic. Why nLockTime alone
 * locks nothing: a transaction with a future nLockTime proves a later spend
 * is possible, but another transaction of the same coin with no lock may
 * already exist; putting CHECKLOCKTIMEVERIFY in the coin's own script makes
 * that one fail.
 */
export function TimelockNotALock() {
  const coin = (label: string) => (
    <>
      <IsoBox at={[40, 52]} w={34} d={30} h={20} role="plain" />
      <Value at={[14, 96]} text={label} size={9} cls="k-value--label" />
    </>
  );
  const tx = (y: number, text: string, sub: string, cls = "") => (
    <g>
      <rect class={`k-outline k-fill--plain ${cls}`.trim()} x="140" y={y} width="150" height="34" />
      <text class="k-card__name" x="146" y={y + 13}>{text}</text>
      <rect class="k-cell k-fill--time" x="146" y={y + 18} width="12" height="10" />
      <text class="k-card__type" x="162" y={y + 27}>{sub}</text>
    </g>
  );
  const frames: Frame[] = [
    {
      note: "A signed transaction with a future nLockTime cannot be mined yet: it proves the coin can be spent later.",
      desc: "A coin, and a signed transaction A spending it whose nLockTime is in the future, so no block can include A yet.",
      draw: (ids) => (
        <>
          {coin("THE COIN")}
          <Arrow d="M92 40 H136" ids={ids} />
          {tx(24, "TRANSACTION A", "nLockTime: LATER")}
          <Value at={[140, 76]} text="NOT YET MINEABLE" size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: "But nothing about the coin stops another signed transaction, with no lock at all, from spending it now.",
      desc: "A second signed transaction B spends the same coin with nLockTime 0; B can be mined now, so A's future date locked nothing.",
      draw: (ids) => (
        <>
          {coin("THE SAME COIN")}
          <Arrow d="M92 40 H136" ids={ids} />
          {tx(24, "TRANSACTION A", "nLockTime: LATER", "k-faded")}
          <Arrow d="M92 70 H136" ids={ids} />
          {tx(64, "TRANSACTION B", "nLockTime: 0")}
          <Value at={[140, 116]} text="MINEABLE NOW ✓" size={9} cls="k-value--fail" />
        </>
      ),
    },
    {
      note: "BIP 65 puts the condition in the coin’s own script: OP_CHECKLOCKTIMEVERIFY fails any spend whose nLockTime is too early.",
      desc: "The coin's script now holds an expiry and OP_CHECKLOCKTIMEVERIFY. Transaction B, with nLockTime 0, fails that check, so no spend can come before the expiry.",
      draw: (ids) => (
        <>
          {coin("THE COIN'S SCRIPT")}
          <rect class="k-outline k-fill--time" x="14" y="104" width="112" height="16" />
          <text class="k-card__type" x="18" y="115.5">{"<expiry> OP_CLTV"}</text>
          <Arrow d="M92 70 H136" ids={ids} />
          {tx(64, "TRANSACTION B", "nLockTime: 0")}
          <Value at={[140, 116]} text="✗ FAILS THE SCRIPT" size={9} cls="k-value--fail" />
        </>
      ),
    },
  ];
  return <Storyboard id="a10-notlock" title="A field that does not lock a coin" width={300} height={128} frames={frames} />;
}

/**
 * timelock-pinned-fields.v1 — static. The lock fields of four transactions
 * published in BIPs 143 and 174, as cells, with how consensus reads them.
 */
export function TimelockPinned({ fixtures }: { fixtures: DerivedTimelockBipTxFixture[] }) {
  const rowH = 74;
  return (
    <Drawing
      id="a10-pinned"
      width={344}
      height={14 + fixtures.length * rowH}
      title="Reading published transactions"
      desc={fixtures
        .map((f) => {
          const d = f.derived;
          return `${f.label} (${f.shortLabel}, line ${f.source.line}): version ${d.version}, nLockTime ${num(d.nLockTime)}, inputs ${d.inputs.map((i) => `${hex32(i.nSequence)}${i.final ? " final" : ""}`).join(", ")}. ${d.enforced ? (d.lockKind === "height" ? `nLockTime enforced: no block before height ${num(d.firstHeight!)}.` : "nLockTime enforced as a time.") : "Every input is final, so nLockTime is not enforced."}`;
        })
        .join(" ")}
    >
      {fixtures.map((f, k) => {
        const d = f.derived;
        const y = 14 + k * rowH;
        const seqW = Math.min(90, (316 - 64 - 96) / d.inputs.length);
        return (
          <g data-fixture={f.id}>
            <Value at={[14, y]} text={`${f.label.toUpperCase()} · ${f.shortLabel?.toUpperCase() ?? ""}`} size={8.5} cls="k-value--label" />
            <rect class="k-cell k-fill--plain" x="14" y={y + 8} width="60" height="26" />
            <text class="k-card__type" x="18" y={y + 18}>VERSION</text>
            <text class="k-value" x="18" y={y + 30} style="font-size:9.5px">{d.version}</text>
            {d.inputs.map((i, j) => (
              <g>
                <rect class={`k-cell k-fill--time${i.final ? " k-cell--em" : ""}`} x={78 + j * seqW} y={y + 8} width={seqW - 2} height="26" />
                <text class="k-card__type" x={82 + j * seqW} y={y + 18}>{i.final ? `IN ${j} · FINAL` : `IN ${j}`}</text>
                <text class="k-value" x={82 + j * seqW} y={y + 30} style="font-size:8.5px">{hex32(i.nSequence).slice(2)}</text>
              </g>
            ))}
            <rect class="k-cell k-fill--time" x="234" y={y + 8} width="96" height="26" />
            <text class="k-card__type" x="238" y={y + 18}>nLOCKTIME</text>
            <text class="k-value" x="238" y={y + 30} style="font-size:9.5px">{num(d.nLockTime)}</text>
            <Value
              at={[14, y + 50]}
              text={d.enforced ? (d.lockKind === "height" ? `ENFORCED: NO BLOCK BELOW HEIGHT ${num(d.firstHeight!)}` : "ENFORCED AS A TIME") : "EVERY INPUT FINAL: nLOCKTIME NOT ENFORCED"}
              size={9}
              cls={d.enforced ? "k-value--label" : "k-value--muted"}
            />
          </g>
        );
      })}
    </Drawing>
  );
}

/**
 * timelock-sequence-bits.v1 — static. nSequence's 32 bits under BIP 68:
 * BIP 68's two largest relative locks, 65,535 blocks and 65,535 units of
 * 512 seconds, as bit rows with the disable flag, the type flag and the
 * 16-bit value marked.
 */
export function TimelockSequenceBits({ fixture }: { fixture: DerivedTimelockEncodingFixture }) {
  const d = fixture.derived;
  const blocks = d.maxBlocks;
  const time = (d.typeFlagSequence | d.maxTimeUnits) >>> 0;
  const x0 = 20;
  const at = (b: number) => x0 + (31 - b) * CELL + CELL / 2;
  return (
    <Drawing
      id="a10-bits"
      width={344}
      height={192}
      title="Thirty-two bits, three jobs"
      desc={`nSequence under BIP 68, bit 31 on the left. Bit 31 is the disable flag; bit 22 picks the unit; bits 0 to 15 hold the value; the rest have no meaning. ${num(d.maxBlocks)} blocks is ${hex32(blocks)}; ${num(d.maxTimeUnits)} units of 512 seconds is ${hex32(time)}.`}
    >
      <Value at={[x0, 14]} text="nSEQUENCE · BIT 31 ON THE LEFT" size={9} cls="k-value--label" />
      {([[31, "DISABLE", 24], [22, "TYPE", 38]] as const).map(([b, t, ly]) => (
        <g class="k-label">
          <path class="k-leader" d={`M${at(b)} 62 V${ly - 3} H${at(b) + 6}`} />
          <text x={at(b) + 8} y={ly}>{`BIT ${b} ${t}`}</text>
        </g>
      ))}
      <BitRow x={x0} y={62} n={blocks} label={`${num(d.maxBlocks)} BLOCKS = ${hex32(blocks)}`} />
      <BitRow x={x0} y={104} n={time} label={`${num(d.maxTimeUnits)} × 512 S = ${hex32(time)}`} />
      <path class="k-leader" d={`M${at(15) - CELL / 2} 150 V156 H${at(0) + CELL / 2} V150`} />
      <text class="k-card__name" x={at(15) - CELL / 2} y={168}>VALUE · BITS 0–15 · MASK 0x0000ffff</text>
      <Value at={[x0, 184]} text="FADED: NO MEANING UNDER BIP 68" size={8.5} cls="k-value--muted" />
    </Drawing>
  );
}

/**
 * timelock-csv-story.v1 — static storyboard (replaces the retired worked
 * example). One of Bitcoin Core's CHECKSEQUENCEVERIFY cases, check by
 * check, as the tested model ran it at build time.
 */
export function TimelockCsvStory({ fixture: f }: { fixture: DerivedTimelockCaseFixture }) {
  const d = f.derived;
  if (d.opcode !== "CHECKSEQUENCEVERIFY") throw new Error(`timelock-csv-story: ${f.id} is not a CSV case`);
  const arg = Number(BigInt(d.argument) & 0xffffffffn) >>> 0;
  // The bits each check reads: the disable flags, the type flag, or the 16 value bits.
  const focusOf = (id: string) => (b: number) => (id === "arg-disabled" || id === "input-disabled" ? bitRole(b) === "disable" : id === "type" ? bitRole(b) === "type" : id === "value" ? bitRole(b) === "value" || bitRole(b) === "type" : true);
  const frames: Frame[] = d.checks.map((c: TimelockCheckView, i): Frame => ({
    note: `${c.label}: ${c.detail}. ${c.ok ? "✓" : "✗"}`,
    desc: `Check ${i + 1} of BIP 112 on ${f.label}: ${c.label}, ${c.ok ? "passes" : "fails"} (${c.detail}).`,
    draw: () => (
      <>
        <Value at={[8, 14]} text={`CHECK ${i + 1} · ${c.ok ? "✓" : "✗"}`} size={9} cls={c.ok ? "k-value--ok" : "k-value--fail"} />
        {c.id === "version" ? (
          <>
            <rect class="k-cell k-fill--plain k-cell--em" x="8" y="30" width="80" height="26" />
            <text class="k-card__type" x="12" y="40">nVERSION</text>
            <text class="k-value" x="12" y="52">{d.version}</text>
            <Value at={[104, 47]} text={`${d.version} ≥ 2`} size={9.5} />
          </>
        ) : c.id === "stack" || c.id === "negative" ? (
          <>
            <rect class="k-cell k-fill--time k-cell--em" x="8" y="30" width="120" height="26" />
            <text class="k-card__type" x="12" y="40">TOP OF THE STACK</text>
            <text class="k-value" x="12" y="52">{d.argument}</text>
            <Value at={[138, 47]} text={c.id === "negative" ? `${d.argument} ≥ 0` : "PRESENT"} size={9.5} />
          </>
        ) : (
          <>
            <BitRow x={8} y={36} n={arg} label="ARGUMENT" ruler focus={focusOf(c.id)} />
            {c.id === "arg-disabled" ? null : <BitRow x={8} y={78} n={d.nSequence} label="INPUT 0 nSEQUENCE" focus={focusOf(c.id)} />}
          </>
        )}
      </>
    ),
  }));
  return (
    <>
      <Storyboard id="a10-csv" title="CHECKSEQUENCEVERIFY, check by check" width={320} height={110} frames={frames} />
      <p class="k-story__foot">{`${f.label}: Bitcoin Core ${f.coreFile} entry ${f.coreIndex}, labelled ${f.expected}; argument ${hex32(arg)}, input nSequence ${hex32(d.nSequence)}, version ${d.version}.`}</p>
    </>
  );
}

/**
 * timelock-mtp.v1 — static, schematic. Median time past: the last 11 block
 * timestamps, which need not be in order, sorted; the middle one is the
 * clock time locks read. Bar heights are illustrative, not data; the median
 * is picked by the tested model's medianTimePast.
 */
export function TimelockMtp() {
  // Illustrative timestamps (unitless), deliberately out of order; not chain data.
  const times = [3, 5, 4, 7, 6, 9, 8, 12, 10, 11, 14].slice(0, MEDIAN_TIME_SPAN);
  const median = medianTimePast(times);
  const sorted = [...times].sort((a, b) => a - b);
  const bar = (x: number, t: number, base: number, em: boolean) => (
    <rect class={`k-cell ${em ? "k-mark--time" : "k-fill--time"}`} x={x} y={base - t * 5} width="18" height={t * 5} />
  );
  return (
    <Drawing
      id="a10-mtp"
      width={344}
      height={200}
      title="Which clock"
      desc={`Schematic: the timestamps of the last ${MEDIAN_TIME_SPAN} blocks, in block order and not all increasing; sorted, the middle one is the median time past, which only moves forward as blocks are added. Bar heights are illustrative.`}
    >
      <Value at={[14, 14]} text={`LAST ${MEDIAN_TIME_SPAN} BLOCKS · TIMESTAMPS IN BLOCK ORDER`} size={9} cls="k-value--label" />
      {times.map((t, i) => bar(14 + i * 22, t, 90, false))}
      <Value at={[14, 104]} text="SORTED" size={9} cls="k-value--label" />
      {sorted.map((t, i) => bar(14 + i * 22, t, 186, t === median && i === Math.floor(sorted.length / 2)))}
      <path class="k-leader" d={`M${14 + Math.floor(sorted.length / 2) * 22 + 9} 112 V${186 - median * 5 - 4}`} />
      <Value at={[14 + Math.floor(sorted.length / 2) * 22 + 14, 118]} text="MEDIAN TIME PAST" size={9} cls="k-value--label" />
      <Value at={[250, 104]} text="SCHEMATIC" size={8.5} cls="k-value--muted" />
    </Drawing>
  );
}
