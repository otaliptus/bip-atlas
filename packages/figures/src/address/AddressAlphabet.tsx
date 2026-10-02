import { CHARSET } from "@bip-atlas/models/bech32";
import { Drawing, Value } from "../kit";

/**
 * address-alphabet.v1 — static. Bech32's 32 data characters in their value
 * order (from the model's CHARSET), as a 4 × 8 grid of 5-bit values, and
 * the four alphanumerics left out. No fixture: the alphabet is the BIP's.
 */
export function AddressAlphabet() {
  if (CHARSET.length !== 32) throw new Error("Bech32 has 32 data characters");
  const all = "0123456789abcdefghijklmnopqrstuvwxyz";
  const missing = [...all].filter((c) => !CHARSET.includes(c));
  const C = 34, X = 14, Y = 26;
  const desc =
    `The 32 data characters in value order, 0 to 31: ${[...CHARSET].map((c, v) => `${c} = ${v}`).join(", ")}. ` +
    `Of the 36 lowercase letters and digits, ${missing.join(", ")} are left out.`;
  return (
    <Drawing id="a04-alpha" width={344} height={Y + 4 * (C + 6) + 52} title="Thirty-two characters" desc={desc}>
      <Value at={[X, 14]} text="32 CHARACTERS · ONE PER 5-BIT VALUE" size={9} cls="k-value--label" />
      {[...CHARSET].map((c, v) => {
        const x = X + (v % 8) * C, y = Y + Math.floor(v / 8) * (C + 6);
        return (
          <g>
            <rect class="k-cell k-fill--plain" x={x} y={y} width={C} height={C} />
            <Value at={[x + C / 2 - 3, y + 24]} text={c} anchor="middle" size={13} />
            <Value at={[x + C - 2, y + 9]} text={String(v)} anchor="end" size={9} cls="k-value--muted" />
          </g>
        );
      })}
      <Value at={[X, Y + 4 * (C + 6) + 14]} text="LEFT OUT:" size={9} cls="k-value--label" />
      {missing.map((c, i) => {
        const x = X + 80 + i * 40, y = Y + 4 * (C + 6) + 2;
        return (
          <g>
            <rect class="k-cell k-fill--plain k-dashed" x={x} y={y} width="26" height="26" />
            <Value at={[x + 13, y + 18]} text={c} anchor="middle" size={14} cls="k-value--muted" />
            <line class="k-leader" x1={x + 3} y1={y + 23} x2={x + 23} y2={y + 3} />
          </g>
        );
      })}
      <Value at={[X, Y + 4 * (C + 6) + 46]} text="NO CASE: ONE ADDRESS, TWO SPELLINGS (ALL LOWER, ALL UPPER)" size={9} cls="k-value--muted" />
    </Drawing>
  );
}
