import { Drawing, Value, idsFor } from "../kit";

/**
 * versionbits-bit-reuse.v1 — static, schematic (no values). One deployment
 * bit over time: deployment A's window, its end, a recommended pause, then a
 * later deployment B on the same bit.
 */
export function VersionbitsReuse() {
  const ids = idsFor("a11-reuse");
  const y = 58, h = 26;
  const a = [16, 136], p = [136, 206], b = [206, 328];
  return (
    <Drawing
      id="a11-reuse"
      width={344}
      height={150}
      title="Reusing a bit"
      desc="A schematic timeline of one deployment bit. Deployment A's window runs from its start to its timeout or activation. A later deployment B may use the same bit only if it starts after that point; BIP 9 recommends a pause in between, which helps detect buggy clients and, after a successful soft fork, leaves time for warnings and upgrades. A new use of the bit then refers to a new BIP."
    >
      <Value at={[16, 16]} text="ONE DEPLOYMENT BIT · SCHEMATIC" size={8.5} cls="k-value--label" />
      <line class="k-leader k-dashed" x1={a[1]} y1={34} x2={a[1]} y2={y + h + 30} />
      <Value at={[a[1], 30]} text="B MAY START ONLY AFTER THIS" size={8.5} anchor="middle" cls="k-value--label" />
      <rect class="k-cell k-fill--time" x={a[0]} y={y} width={a[1] - a[0]} height={h} />
      <Value at={[a[0] + 6, y + 16]} text="DEPLOYMENT A" size={8.5} cls="k-value--label" />
      <rect class="k-cell k-fill--plain k-dashed" x={p[0]} y={y} width={p[1] - p[0]} height={h} />
      <Value at={[(p[0] + p[1]) / 2, y + 16]} text="PAUSE" size={8.5} anchor="middle" cls="k-value--label" />
      <rect class="k-cell k-fill--time" x={b[0]} y={y} width={b[1] - b[0]} height={h} />
      <Value at={[b[0] + 6, y + 16]} text="DEPLOYMENT B" size={8.5} cls="k-value--label" />
      <Value at={[a[0], y + h + 14]} text="START → TIMEOUT" size={8.5} cls="k-value--muted" />
      <Value at={[a[0], y + h + 25]} text="OR ACTIVATION" size={8.5} cls="k-value--muted" />
      <Value at={[(p[0] + p[1]) / 2, y + h + 14]} text="RECOMMENDED" size={8} anchor="middle" cls="k-value--muted" />
      <Value at={[b[0] + 6, y + h + 14]} text="A NEW BIP" size={8.5} cls="k-value--muted" />
      <path class="k-line" d={`M16 ${y + h + 44} H330`} marker-end={ids.arrow} />
      <Value at={[330, y + h + 58]} text="TIME, AS MEDIAN TIME PAST" size={8} anchor="end" cls="k-value--muted" />
    </Drawing>
  );
}
