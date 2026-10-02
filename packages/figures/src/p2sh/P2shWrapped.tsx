import { Drawing, Value, type Role } from "../kit";
import type { DerivedP2shFixture, P2shItemKind } from "../types";

const KIND: Record<string, string> = { legacy: "Legacy P2SH", "p2sh-p2wpkh": "P2SH-P2WPKH", "p2sh-p2wsh": "P2SH-P2WSH" };
const roleOf = (k: P2shItemKind): Role => (k === "signature" ? "sig" : k === "public key" ? "public" : "plain");
/** BIP 141 weight of these bytes: outside the witness four units each, in the witness one. */
const weight = (d: DerivedP2shFixture["derived"]) => 4 * d.scriptSigBytes + d.witnessBytes;

interface Seg { bytes: number; role: Role; text: string }

/** The scriptSig's and the witness's contents, item by item; push and length bytes as one plain segment. */
function contents(d: DerivedP2shFixture["derived"]) {
  const pushed = d.stages.find((s) => s.id === "hash-match")?.stackBefore;
  if (!pushed) throw new Error("p2sh-wrapped: no recorded pushes");
  const kindOf = (x: string) => {
    const k = d.itemKinds[x];
    if (!k) throw new Error("p2sh-wrapped: an item without a reviewed kind");
    return k;
  };
  const items = (list: string[]): Seg[] => list.filter((x) => x !== "").map((x) => ({ bytes: x.length / 2, role: roleOf(kindOf(x)), text: kindOf(x) }));
  const witness = d.kind === "legacy" ? [] : [...(d.stages.at(-1)?.stackBefore ?? []), ...(d.witnessScriptHex ? [d.witnessScriptHex] : [])];
  const withOverhead = (segs: Seg[], total: number, what: string): Seg[] => {
    const rest = total - segs.reduce((n, s) => n + s.bytes, 0);
    if (rest < 0) throw new Error("p2sh-wrapped: items exceed their field");
    return rest ? [{ bytes: rest, role: "plain", text: what }, ...segs] : segs;
  };
  return {
    scriptSig: withOverhead(items(pushed), d.scriptSigBytes, "push bytes"),
    witness: d.witnessBytes ? withOverhead(items(witness), d.witnessBytes, "count, lengths") : [],
  };
}

/**
 * p2sh-wrapped.v1 — static. Where each pinned spend carries its signatures:
 * the scriptSig and the witness of each, to one byte scale and split into
 * what they hold, with the weight they cost (a scriptSig byte four units, a
 * witness byte one).
 */
export function P2shWrapped({ fixtures }: { fixtures: DerivedP2shFixture[] }) {
  const unit = 300 / Math.max(...fixtures.map((f) => Math.max(f.derived.scriptSigBytes, f.derived.witnessBytes)));
  const maxW = Math.max(...fixtures.map((f) => weight(f.derived)));
  const rowH = 120;
  const fits = (s: Seg) => s.bytes * unit > s.text.length * 5.3 + 8;
  const bar = (segs: Seg[], x: number, y: number) => {
    let at = x;
    const drawn = segs.map((s) => {
      const w = s.bytes * unit;
      const sx = at;
      at += w;
      return (
        <g>
          <rect class={`k-cell k-fill--${s.role}`} x={sx} y={y} width={w} height="16" />
          {fits(s) ? <text class="k-card__name" x={sx + 4} y={y + 11.5}>{s.text}</text> : null}
        </g>
      );
    });
    // Items too short to name inside are named after the bar, in order.
    const rest = segs.filter((s) => !fits(s) && s.text !== "push bytes" && s.text !== "count, lengths").map((s) => s.text);
    return (
      <>
        {drawn}
        {rest.length ? <text class="k-card__name" x={at + 6} y={y + 11.5}>{`← ${rest.join(", ")}`}</text> : null}
      </>
    );
  };
  return (
    <Drawing
      id="a09-wrapped"
      width={344}
      height={14 + fixtures.length * rowH}
      title="Where the signatures live"
      desc={fixtures
        .map((f) => {
          const d = f.derived;
          const c = contents(d);
          return `${KIND[d.kind]}: scriptSig ${d.scriptSigBytes} bytes (${c.scriptSig.map((s) => `${s.text} ${s.bytes}`).join(", ")}); witness ${d.witnessBytes ? `${d.witnessBytes} bytes (${c.witness.map((s) => `${s.text} ${s.bytes}`).join(", ")})` : "empty"}; weight 4 × ${d.scriptSigBytes} + ${d.witnessBytes} = ${weight(d)}.`;
        })
        .join(" ")}
    >
      {fixtures.map((f, k) => {
        const d = f.derived;
        const c = contents(d);
        const y = 14 + k * rowH;
        const w = weight(d);
        return (
          <g data-fixture={f.id}>
            <Value at={[14, y]} text={KIND[d.kind].toUpperCase()} size={9} cls="k-value--label" />
            <Value at={[14, y + 17]} text={`SCRIPTSIG · ${d.scriptSigBytes} B`} size={9} cls="k-value--muted" />
            {bar(c.scriptSig, 14, y + 21)}
            <Value at={[14, y + 51]} text={d.witnessBytes ? `WITNESS · ${d.witnessBytes} B` : "WITNESS · NONE"} size={9} cls="k-value--muted" />
            {bar(c.witness, 14, y + 55)}
            <rect class="k-cell k-mark--plain" x="14" y={y + 76} width={(w / maxW) * 150} height="5" />
            <Value at={[14 + (w / maxW) * 150 + 6, y + 82]} text={`${w} WU`} size={10} cls="k-value--label" />
            <Value at={[14, y + 100]} text={`SCRIPTSIG + WITNESS: 4 × ${d.scriptSigBytes} + ${d.witnessBytes} = ${w} WU`} size={9} cls="k-value--muted" />
          </g>
        );
      })}
    </Drawing>
  );
}

/**
 * p2sh-limit.v1 — static. A redeem script is pushed data, so 520 bytes at
 * most: for multisig with 33-byte keys, three bytes plus 34 per key, which
 * stops at 15 keys. The pinned 2-of-2 is marked on the same ruler.
 */
export function P2shLimit({ fixture: f }: { fixture: DerivedP2shFixture }) {
  const MAX_PUSH = 520, PER_KEY = 34, FIXED = 3;
  const keys = Math.floor((MAX_PUSH - FIXED) / PER_KEY);
  const total = FIXED + keys * PER_KEY;
  const own = f.derived.redeemScriptHex.length / 2;
  // The keys the redeem script pushed, as the model's trace recorded them; the length must agree.
  const run = f.derived.stages.find((s) => s.id === "redeem");
  const pushedKeys = new Set((run?.steps ?? []).flatMap((x) => x.stackAfter).filter((x) => f.derived.itemKinds[x] === "public key"));
  const ownKeys = pushedKeys.size;
  if (!ownKeys || FIXED + PER_KEY * ownKeys !== own) throw new Error(`p2sh-limit: ${f.id} redeem script is not 3 + 34 bytes per key`);
  const unit = 300 / 560;
  const x0 = 14, y = 44;
  return (
    <Drawing
      id="a09-limit"
      width={344}
      height={150}
      title="Why fifteen keys"
      desc={`A pushed item is at most ${MAX_PUSH} bytes. A multisig redeem script with 33-byte keys takes ${FIXED} bytes plus ${PER_KEY} per key, so ${keys} keys fit in ${total} bytes and one more would need ${total + PER_KEY}. The pinned 2-of-2 is ${own} bytes: ${FIXED} + ${PER_KEY} × ${ownKeys}.`}
    >
      {[0, 100, 200, 300, 400].map((b) => (
        <g>
          <line class="k-leader" x1={x0 + b * unit} y1={y - 6} x2={x0 + b * unit} y2={y - 2} />
          <text class="k-packet__ruler" x={x0 + b * unit} y={y - 9} text-anchor="middle">{b}</text>
        </g>
      ))}
      <rect class="k-cell k-fill--plain" x={x0} y={y} width={FIXED * unit} height="20" />
      {Array.from({ length: keys + 1 }, (_, i) => (
        <rect class={`k-cell k-fill--public${i === keys ? " k-dashed" : ""}`} x={x0 + (FIXED + i * PER_KEY) * unit} y={y} width={PER_KEY * unit} height="20" style={i === keys ? "fill:none" : undefined} />
      ))}
      <line class="k-cut" x1={x0 + MAX_PUSH * unit} y1={y - 12} x2={x0 + MAX_PUSH * unit} y2={y + 30} />
      <Value at={[x0 + MAX_PUSH * unit - 4, y + 42]} text={`${MAX_PUSH} B LIMIT`} size={9} anchor="end" cls="k-value--label" />
      <Value at={[x0, y + 42]} text={`${keys} KEYS = ${FIXED} + ${PER_KEY} × ${keys} = ${total} B`} size={9} cls="k-value--label" />
      <Value at={[x0, y + 56]} text={`A ${keys + 1}TH KEY WOULD NEED ${total + PER_KEY} B (DASHED)`} size={9} cls="k-value--muted" />
      <rect class="k-cell k-fill--plain" x={x0} y={y + 72} width={FIXED * unit} height="14" />
      {Array.from({ length: ownKeys }, (_, i) => <rect class="k-cell k-fill--public" x={x0 + (FIXED + i * PER_KEY) * unit} y={y + 72} width={PER_KEY * unit} height="14" />)}
      <Value at={[x0 + own * unit + 6, y + 83]} text={`THIS SPEND'S ${ownKeys} KEYS: ${own} B = ${FIXED} + ${PER_KEY} × ${ownKeys}`} size={9} cls="k-value--label" />
    </Drawing>
  );
}
