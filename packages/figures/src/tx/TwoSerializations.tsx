import { Arrow, Bracket, Machine, Storyboard, Value, type DrawingIds, type Frame } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { shortHex, txGroups } from "./fields";

/**
 * two-serializations.v1 — static storyboard (replaces the retired worked
 * example). The serialized transaction as a tape drawn to scale: all of it
 * hashes to the wtxid; snip out the marker and flag, then the witness, and
 * the bytes left (the old serialization) hash to the txid.
 */
export function TwoSerializations({ fixture }: { fixture: DerivedTransactionFixture }) {
  const d = fixture.derived;
  const m = d.measures;
  const groups = txGroups(d);
  const g = (key: string) => {
    const x = groups.find((q) => q.key === key);
    if (!x || !x.bytes) throw new Error(`two-serializations: ${fixture.id} has no ${key}`);
    return x;
  };
  const marker = g("marker"), witness = g("witness");
  const markerHex = d.segments.filter((s) => s.part === "marker").map((s) => s.hex);
  const x0 = 15, unit = 270 / m.totalSize, tapeY = 52, tapeH = 18;

  /** The tape with some groups lifted out (and, if `closed`, the gaps closed up). */
  const tape = (lifted: string[], closed = false) => {
    let x = x0;
    return groups.map((q) => {
      const w = q.bytes * unit;
      const out = lifted.includes(q.key);
      if (closed && out) return null;
      const gx = x;
      x += w;
      return (
        <g data-group={q.key}>
          {out ? (
            <>
              <rect class="k-cell k-fill--plain k-dashed" x={gx} y={tapeY} width={w} height={tapeH} style="fill:none" />
              {q.key === "marker" ? (
                markerHex.map((hx, k) => <g><rect class="k-cell k-fill--plain" x={gx - 8 + k * 14} y={tapeY - 34} width="14" height="14" /><text class="k-cell__t" x={gx - 1 + k * 14} y={tapeY - 23.6} text-anchor="middle">{hx}</text></g>)
              ) : (
                <rect class="k-cell k-fill--plain" x={gx} y={tapeY - 30} width={w} height={tapeH} />
              )}
            </>
          ) : (
            <rect class="k-cell k-fill--plain" x={gx} y={tapeY} width={w} height={tapeH} />
          )}
          {w > 44 ? <text class="k-packet__t" x={gx + 4} y={(out && q.key !== "marker" ? tapeY - 30 : tapeY) + 12.5}>{q.label.toUpperCase()}</text> : null}
        </g>
      );
    });
  };
  const hashOut = (ids: DrawingIds, from: number, name: string, hex: string) => (
    <>
      <Arrow d={`M${from} ${tapeY + tapeH + 4} V${tapeY + tapeH + 22}`} ids={ids} />
      <Machine at={[from - 20, 128]} w={64} d={30} h={26} label="SHA-256" sub="twice" role="hash" />
      <Value at={[from + 62, 130]} text={name} size={8.5} cls="k-value--label" />
      <Value at={[from + 62, 143]} text={shortHex(hex, 12)} size={9.5} cls="k-value--hash" />
    </>
  );
  const offsetOf = (key: string) => x0 + groups.slice(0, groups.findIndex((q) => q.key === key)).reduce((n, q) => n + q.bytes * unit, 0);
  const lift = (ids: DrawingIds, key: string, label: string) => {
    const gx = offsetOf(key);
    return key === "marker" ? (
      <path class="k-leader" d={`M${gx + 22} ${tapeY - 27} H${gx + 34}`} />
    ) : (
      <path class="k-leader" d={`M${gx + g(key).bytes * unit / 2} ${tapeY - 30} V${tapeY - 40}`} />
    );
  };
  const frames: Frame[] = [
    {
      note: `The whole serialization, ${m.totalSize} bytes, hashed twice with SHA-256: the wtxid.`,
      desc: `A tape of ${m.totalSize} bytes: ${groups.map((q) => `${q.label} ${q.bytes} bytes`).join(", ")}. Double SHA-256 of all of it is the wtxid, ${m.wtxidHex}.`,
      draw: (ids) => (
        <>
          {tape([])}
          <Bracket x1={x0} x2={x0 + m.totalSize * unit} y={tapeY - 4} below={false} text={`everything · ${m.totalSize} B`} />
          {hashOut(ids, 90, "WTXID", m.wtxidHex)}
        </>
      ),
    },
    {
      note: `Cut out the marker and flag (${markerHex.join(" ")}), the ${marker.bytes} bytes after nVersion.`,
      desc: `The marker ${markerHex[0]} and flag ${markerHex[1]}, ${marker.bytes} bytes right after nVersion, are lifted out of the tape.`,
      draw: (ids) => (
        <>
          {tape(["marker"])}
          {lift(ids, "marker", "")}
          <Value at={[offsetOf("marker") + 38, tapeY - 24]} text={`MARKER · FLAG · ${marker.bytes} B`} size={8.5} cls="k-value--label" />
          <Value at={[x0, tapeY + tapeH + 18]} text="LEFT OUT OF THE TXID" size={8.5} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Cut out the witness, the ${witness.bytes} bytes just before nLockTime.`,
      desc: `The witness, ${witness.bytes} bytes just before nLockTime, is lifted out as well.`,
      draw: (ids) => (
        <>
          {tape(["marker", "witness"])}
          {lift(ids, "witness", "")}
          <Value at={[offsetOf("witness") + witness.bytes * unit / 2, tapeY - 44]} text={`WITNESS · ${witness.bytes} B`} size={8.5} anchor="middle" cls="k-value--label" />
          <Value at={[x0, tapeY + tapeH + 18]} text={`${m.totalSize - m.baseSize} B LEFT OUT IN ALL`} size={8.5} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `The ${m.baseSize} bytes left are the old serialization; hashed the same way, they give the txid.`,
      desc: `The remaining ${m.baseSize} bytes, nVersion, inputs, outputs and nLockTime, are what a pre-SegWit node sees. Double SHA-256 of them is the txid, ${m.txidHex}.`,
      draw: (ids) => (
        <>
          {tape(["marker", "witness"], true)}
          <Bracket x1={x0} x2={x0 + m.baseSize * unit} y={tapeY - 4} below={false} text={`old serialization · ${m.baseSize} B`} />
          {hashOut(ids, 90, "TXID", m.txidHex)}
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a03-ser" title="Two serializations, two hashes" width={300} height={176} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact identifiers (byte order as computed)</summary>
        <dl class="atlas-hexlist">
          <dt>wtxid, {m.totalSize} bytes hashed</dt><dd><code class="atlas-break">{m.wtxidHex}</code></dd>
          <dt>txid, {m.baseSize} bytes hashed</dt><dd><code class="atlas-break">{m.txidHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
