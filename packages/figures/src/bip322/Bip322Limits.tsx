import { Drawing, Value, idsFor } from "../kit";

/** A schematic challenge and response. No fictitious keys, signatures or balances. */
export function Bip322Limits() {
  const ids = idsFor("a18-limits");
  return (
    <Drawing id="a18-limits" width={344} height={354} title="A proof for this message and this address"
      desc="Schematic of a valid BIP 322 response. The exact message and address define a script challenge. A response satisfies that script under the verification rules; it does not identify the signer, date the signature, or establish a current balance. A verifier-chosen challenge can give the message freshness. No real coins move: the virtual transactions are never broadcast.">
      <Value at={[14, 15]} text="THE CHALLENGE" size={9} cls="k-value--label" />
      <path class="k-outline k-fill--plain" d="M14 30 H152 L168 46 V115 H14 Z M152 30 V46 H168" />
      <Value at={[28, 53]} text="EXACT MESSAGE" size={9} cls="k-value--label" />
      {[66, 77, 88].map((y, i) => <line class="k-leader" x1="28" y1={y} x2={i === 2 ? 108 : 150} y2={y} />)}
      <rect class="k-outline k-fill--public" x="188" y="55" width="142" height="60" />
      <Value at={[201, 76]} text="ADDRESS" size={9} cls="k-value--label" />
      <Value at={[201, 96]} text="its spending script" size={8.5} />
      <path class="k-line" d="M91 120 V139 H259 V120" />
      <path class="k-line" d="M172 139 V157" marker-end={ids.arrow} />
      <rect class="k-outline k-fill--plain" x="90" y="164" width="164" height="61" />
      <Value at={[172, 185]} text="CHECK THE RESPONSE" size={9} anchor="middle" cls="k-value--label" />
      <rect class="k-cell k-fill--sig" x="112" y="195" width="120" height="16" />
      <Value at={[172, 206]} text="script satisfied ✓" size={9} anchor="middle" />
      <Value at={[14, 247]} text="PROVES THIS SCRIPT COULD BE SATISFIED" size={8.5} cls="k-value--label" />
      <line class="k-sep k-leader" x1="14" y1="261" x2="330" y2="261" />
      {[["WHO?", "identity"], ["WHEN?", "freshness"], ["STILL FUNDED?", "current balance"]].map(([q, a], i) => <g>
        <rect class="k-outline" x={14 + i * 107} y="273" width="100" height="41" style={`fill:${ids.hatch}`} />
        <Value at={[64 + i * 107, 291]} text={q} size={8.5} anchor="middle" />
        <Value at={[64 + i * 107, 307]} text={a} size={8} anchor="middle" />
      </g>)}
      <Value at={[14, 339]} text="SEPARATE QUESTIONS · NO COINS MOVE" size={8.5} cls="k-value--muted" />
    </Drawing>
  );
}
