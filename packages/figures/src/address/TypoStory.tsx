import { BECH32M_CONST, BECH32_CONST, analyzeSegwitAddress, formatResidue } from "@bip-atlas/models/bech32";
import { Computer, Storyboard, Value, type Frame } from "../kit";
import type { AddressFixture } from "../types";

const CH = 6.3;

/**
 * address-typo-story.v1 — static storyboard (the old worked example). BIP
 * 173's example address and its published one-character typo: the checksum
 * holds, then fails, the decoder says only "wrong", and it offers no fix.
 * Residues and verdicts from the tested bech32 model.
 */
export function TypoStory({ fixtures }: { fixtures: AddressFixture[] }) {
  const rows = fixtures.map((f) => ({ f, a: analyzeSegwitAddress(f.address, f.network) }));
  const good = rows.find((r) => r.a.valid);
  const typo = rows.find((r) => r.a.failedStage === "checksum");
  if (!good || !typo || good.f.address.length !== typo.f.address.length) throw new Error("address-typo-story.v1 needs a valid address and its same-length typo");
  const pos = [...typo.f.address].findIndex((c, i) => c !== good.f.address[i]);
  if (pos < 0 || [...typo.f.address].filter((c, i) => c !== good.f.address[i]).length !== 1) throw new Error("the typo should change exactly one character");
  const str = (s: string, mark: number, y: number) => (
    <g>
      <rect class="k-cell k-fill--plain" x="10" y={y - 13} width={s.length * CH + 8} height="18" />
      {mark >= 0 ? <rect class="k-cell k-mark--plain" x={14 + mark * CH - 0.5} y={y - 11} width={CH + 1} height="14" /> : null}
      {[...s].map((c, j) => <text class={`k-value${j === mark ? " k-value--on" : ""}`} x={14 + j * CH + CH / 2} y={y} text-anchor="middle" style="font-size:9.5px">{c}</text>)}
    </g>
  );
  const residueRow = (r: number, y: number) => (
    <g>
      <Value at={[10, y]} text={`POLYMOD → ${formatResidue(r)}`} size={10} />
      <Value at={[10, y + 16]} text={r === BECH32_CONST ? "= BECH32 CONSTANT ✓" : r === BECH32M_CONST ? "= BECH32M CONSTANT" : "MATCHES NEITHER CONSTANT ✕"} size={9} cls="k-value--label" />
    </g>
  );
  const frames: Frame[] = [
    {
      note: "BIP 173’s example address, copied correctly: the checksum holds.",
      desc: `${good.f.address} gives the polymod result ${formatResidue(good.a.residue!)}, the Bech32 constant.`,
      draw: () => (
        <>
          {str(good.f.address, -1, 30)}
          {residueRow(good.a.residue!, 70)}
        </>
      ),
    },
    {
      note: `One character changed, at position ${pos + 1}: ${good.f.address[pos]} became ${typo.f.address[pos]}.`,
      desc: `${typo.f.address}, BIP 173's invalid-checksum vector, differs at position ${pos + 1}. Its polymod result is ${formatResidue(typo.a.residue!)}, which matches neither constant.`,
      draw: () => (
        <>
          {str(typo.f.address, pos, 30)}
          {residueRow(typo.a.residue!, 70)}
        </>
      ),
    },
    {
      note: "This decoder reports that the string is wrong, not where. BIP 173 allows at most a hint where an error might be.",
      desc: "The decoder rejects the string at the checksum stage. It does not report which character is wrong.",
      draw: () => (
        <>
          <Computer at={[14, 20]} label="decoder" />
          <rect class="k-cell k-mark--plain" x="70" y="22" width="200" height="26" />
          <Value at={[80, 39]} text="REJECTED AT THE CHECKSUM" size={9} cls="k-value--on" />
          <Value at={[70, 76]} text="THIS DECODER: NO POSITION, NO GUESS" size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: "It offers no corrected version. Copy the address again from its source.",
      desc: "BIP 173 advises against correcting beyond pointing to where an error might be: an incorrect but valid address can lose funds. The fix is to copy the address again.",
      draw: () => (
        <>
          <rect class="k-outline k-dashed" x="10" y="16" width="270" height="22" fill="none" />
          <line class="k-leader" x1="10" y1="38" x2="280" y2="16" />
          <Value at={[16, 31]} text="“DID YOU MEAN …?”" size={10} cls="k-value--muted" />
          <Value at={[10, 66]} text="NO AUTO-CORRECTION: A WRONG BUT VALID" size={9} cls="k-value--label" />
          <Value at={[10, 78]} text="ADDRESS CAN LOSE FUNDS FOR GOOD" size={9} cls="k-value--label" />
        </>
      ),
    },
  ];
  return <Storyboard id="a04-typo" title="A typo, caught and not repaired" width={300} height={104} frames={frames} />;
}
