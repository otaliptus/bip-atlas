import { Drawing, Value, idsFor } from "../kit";

/**
 * bip322-choice.v1 — static, schematic (no values). Which envelope a signer
 * uses, as BIP 322's encoding rules give it: two questions, three outcomes.
 */
export function Bip322Choice() {
  const ids = idsFor("a18-choice");
  const q = (y: number, a: string, b: string) => (
    <g>
      <path class="k-outline k-fill--plain" d={`M96 ${y} L176 ${y + 22} L96 ${y + 44} L16 ${y + 22} Z`} />
      <text class="k-b3-l" x="96" y={y + 20} text-anchor="middle">{a}</text>
      <text class="k-b3-l" x="96" y={y + 31} text-anchor="middle">{b}</text>
    </g>
  );
  const out = (y: number, prefix: string, note: string) => (
    <g>
      <rect class="k-outline k-mark--plain" x="226" y={y} width="40" height="22" rx="2" />
      <text class="k-b3-h k-cell__t--on" x="246" y={y + 15} text-anchor="middle">{prefix}</text>
      <text class="k-b3-l" x="272" y={y + 14}>{note}</text>
    </g>
  );
  return (
    <Drawing
      id="a18-choice"
      width={344}
      height={196}
      title="Which format"
      desc="Schematic of BIP 322's encoding rules. If the signer added inputs to to_sign, it must use proof of funds (pof). Otherwise, if version, sequence and lock time are all 0 and the address is native SegWit, it may use simple (smp), or full; otherwise full (ful)."
    >
      {q(10, "ADDED INPUTS", "(UTXOS TO SHOW)?")}
      <path class="k-line" d="M176 32 H222" marker-end={ids.arrow} />
      <Value at={[182, 26]} text="YES" size={8.5} cls="k-value--label" />
      {out(21, "pof", "MUST · PSBT")}
      <path class="k-line" d="M96 54 V80" marker-end={ids.arrow} />
      <Value at={[102, 70]} text="NO" size={8.5} cls="k-value--label" />
      {q(84, "ALL DEFAULTS AND", "NATIVE SEGWIT?")}
      <path class="k-line" d="M176 106 H222" marker-end={ids.arrow} />
      <Value at={[182, 100]} text="YES" size={8.5} cls="k-value--label" />
      {out(95, "smp", "MAY, OR ful")}
      <path class="k-line" d="M96 128 V160 H222" marker-end={ids.arrow} />
      <Value at={[102, 150]} text="NO" size={8.5} cls="k-value--label" />
      {out(149, "ful", "WHOLE TX")}
      <Value at={[16, 188]} text="DEFAULTS: VERSION, SEQUENCE, LOCK TIME 0 · SCHEMATIC" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
