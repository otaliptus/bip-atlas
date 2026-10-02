import { Drawing, Value, idsFor } from "../kit";

/**
 * bip322-limits.v1 — static, schematic (no values). What a valid signature
 * does and does not establish, on a timeline: someone could satisfy the
 * script for this message at some point before it was presented; not who,
 * not when exactly, not whether they still can or the coins are still there.
 */
export function Bip322Limits() {
  const ids = idsFor("a18-limits");
  const y = 70;
  return (
    <Drawing
      id="a18-limits"
      width={344}
      height={176}
      title="What a signature does not prove"
      desc="Schematic timeline. A valid BIP 322 signature shows that, at some point before it was presented, someone could produce what the address's script demands for this exact message. It carries no date: T is a lock-time field, so freshness must come from the message, for example a challenge the verifier chose. It does not say who signed, that they sent any earlier transaction, whether they still control the address, or whether the coins are still there."
    >
      <path class="k-line" d={`M14 ${y} H330`} marker-end={ids.arrow} />
      <rect class="k-cell" x="22" y={y - 9} width="96" height="18" style={`fill:${ids.hatch}`} />
      <Value at={[22, y - 16]} text="SIGNED: WHEN? WHO?" size={8.5} cls="k-value--label" />
      <line class="k-cut" x1="160" y1={y - 12} x2="160" y2={y + 12} />
      <Value at={[160, y - 16]} text="PRESENTED" size={8.5} anchor="middle" cls="k-value--label" />
      <rect class="k-cell" x="200" y={y - 9} width="120" height="18" style={`fill:${ids.hatch}`} />
      <Value at={[200, y - 16]} text="COINS LATER: UNKNOWN" size={8.5} cls="k-value--label" />
      <Value at={[14, y + 32]} text="SHOWS: SOMEONE COULD SATISFY THE SCRIPT" size={8.5} cls="k-value--label" />
      <Value at={[14, y + 44]} text="FOR THIS MESSAGE, BEFORE IT WAS PRESENTED" size={8.5} cls="k-value--label" />
      <Value at={[14, y + 64]} text="T IS A LOCK-TIME FIELD, NOT A DATE: FRESHNESS" size={8.5} cls="k-value--muted" />
      <Value at={[14, y + 76]} text="MUST COME FROM THE MESSAGE (A CHALLENGE)" size={8.5} cls="k-value--muted" />
      <Value at={[14, y + 96]} text="SCHEMATIC" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
