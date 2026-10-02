import { Bracket, Storyboard, Value, type Frame } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

/** An address cell: used ones carry a dot (illustrative history, not data). */
function row(x: number, y: number, n: number, used: (i: number) => boolean, size = 12) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g>
          <rect class={`k-cell ${used(i) ? "k-fill--plain" : "k-fill--plain k-dashed"}`} x={x + i * size} y={y} width={size} height={size} />
          {used(i) ? <circle class="k-mark--plain" cx={x + i * size + size / 2} cy={y + size / 2} r="2.4" /> : null}
        </g>
      ))}
    </g>
  );
}

/**
 * wallet-discovery.v1 — static storyboard, illustrative. How BIP 44 restores
 * accounts: scan an account's external chain, stop a chain after the gap
 * limit of unused addresses, move to the next account only if this one has
 * history. Which addresses are "used" is made up for the drawing; the gap
 * limit is read from BIP 44's pinned text at build time.
 */
export function WalletDiscovery({ fixture }: { fixture: DerivedWalletPathFixture }) {
  const t = fixture.derived.bip44;
  if (!t) throw new Error(`${fixture.id}: wallet-discovery.v1 needs BIP 44's gap limit`);
  const gap = t.gapLimit;
  const usedA = new Set([0, 1, 3]);
  const lastUsed = Math.max(...usedA);
  const cell = Math.min(12, 272 / (lastUsed + 1 + gap));
  const frames: Frame[] = [
    {
      note: "Derive account 0′ and its external chain, then check its addresses for transactions, one index at a time.",
      desc: "Illustration: the external chain of account 0′, addresses 0, 1, 2, 3 checked in order; in this made-up history addresses 0, 1 and 3 have transactions.",
      draw: () => (
        <>
          <Value at={[14, 22]} text="ACCOUNT 0′ · EXTERNAL CHAIN" size={9} cls="k-value--label" />
          {row(14, 34, lastUsed + 1, (i) => usedA.has(i), 18)}
          <Value at={[14 + (lastUsed + 1) * 18 + 6, 47]} text="…" size={10} />
          <circle class="k-mark--plain" cx="18" cy="73" r="2.4" />
          <Value at={[26, 76]} text="HAS TRANSACTIONS (ILLUSTRATIVE)" size={9} cls="k-value--muted" />
          <Value at={[14, 90]} text="HISTORY, NOT BALANCE, IS WHAT COUNTS" size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `BIP 44 gave the gap limit as ${gap}: after ${gap} unused addresses in a row, it stops scanning that chain.`,
      desc: `The scan continues past the last used address, ${lastUsed}, until ${gap} unused addresses in a row have been checked, then stops. BIP 44 gives the gap limit as ${gap} (line ${t.gapLine}).`,
      draw: () => (
        <>
          <Value at={[14, 22]} text="ACCOUNT 0′ · EXTERNAL CHAIN" size={9} cls="k-value--label" />
          {row(14, 34, lastUsed + 1 + gap, (i) => usedA.has(i), cell)}
          <Bracket x1={14 + (lastUsed + 1) * cell} x2={14 + (lastUsed + 1 + gap) * cell} y={34 + cell + 3} text={`${gap} unused in a row`} />
          <Value at={[14, 96]} text={`GAP LIMIT ${gap}, AS BIP 44 GAVE IT · LINE ${t.gapLine}`} size={9} cls="k-value--muted" />
          <Value at={[286, 96]} text="STOP" anchor="end" size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: "Account 0′ had transactions, so try account 1′. Its external chain has none: discovery stops there.",
      desc: "Because account 0′ has transactions, account 1′ is derived and its external chain scanned. In this illustration it has no transactions, so discovery stops; no account 2′ is tried.",
      draw: () => (
        <>
          <Value at={[14, 22]} text="ACCOUNT 0′ · HAS HISTORY → NEXT" size={9} cls="k-value--label" />
          {row(14, 30, lastUsed + 1, (i) => usedA.has(i), 14)}
          <Value at={[14 + (lastUsed + 1) * 14 + 6, 41]} text="…" size={10} />
          <Value at={[14, 70]} text="ACCOUNT 1′ · NO HISTORY → STOP" size={9} cls="k-value--label" />
          {row(14, 78, 8, () => false, 14)}
          <Value at={[14 + 8 * 14 + 6, 89]} text="…" size={10} />
          <rect class="k-outline k-dashed" x="14" y="112" width="70" height="14" fill="none" />
          <Value at={[90, 123]} text="ACCOUNT 2′ IS NEVER TRIED" size={9} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return <Storyboard id="a12-disc" title="Finding the accounts again" width={300} height={134} frames={frames} />;
}
