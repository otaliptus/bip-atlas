import { BECH32M_CONST, BECH32_CONST, analyzeSegwitAddress, formatResidue } from "@bip-atlas/models/bech32";
import { Drawing, Machine, Value } from "../kit";
import { stageLabel } from "../describe";
import type { AddressFixture } from "../types";

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 8)}…${s.slice(-6)}` : s);

/**
 * address-two-constants.v1 — static. One polymod, two accepted results.
 * A v0 address lands on the Bech32 constant, a v1 address on Bech32m's; the
 * v1 program with a Bech32 checksum passes the checksum stage and is refused
 * only at the family check. Residues and verdicts from the tested model.
 */
export function TwoConstants({ fixtures }: { fixtures: AddressFixture[] }) {
  const rows = fixtures.map((f) => ({ f, a: analyzeSegwitAddress(f.address, f.network) }));
  const v0 = rows.find((r) => r.a.valid && r.a.witnessVersion === 0);
  const v1 = rows.find((r) => r.a.valid && r.a.witnessVersion === 1);
  const wrong = rows.find((r) => r.a.failedStage === "family");
  if (!v0 || !v1 || !wrong) throw new Error("address-two-constants.v1 needs a v0, a v1 and a wrong-family fixture");
  const list = [
    { r: v0, verdict: "VERSION 0 + BECH32 ✓ ACCEPTED" },
    { r: v1, verdict: "VERSION 1 + BECH32M ✓ ACCEPTED" },
    { r: wrong, verdict: `VERSION 1 + BECH32 ✕ REFUSED AT ${stageLabel("family").toUpperCase()}` },
  ];
  const desc =
    list.map(({ r }) => `${r.f.address}: residue ${formatResidue(r.a.residue!)}${r.a.valid ? `, version ${r.a.witnessVersion}, accepted` : `, refused: ${r.a.reason}`}`).join(". ") +
    `. Bech32's constant is ${formatResidue(BECH32_CONST)}, Bech32m's ${formatResidue(BECH32M_CONST)}.`;
  return (
    <>
      <Drawing id="a04-const" width={344} height={250} title="Two constants" desc={desc}>
        <Machine at={[40, 46]} w={80} d={28} h={22} label="POLYMOD" role="check" />
        <Value at={[14, 112]} text="ONE FUNCTION" size={9} cls="k-value--label" />
        {[BECH32_CONST, BECH32M_CONST].map((c, k) => (
          <g>
            <rect class="k-cell k-fill--check k-cell--em" x={170 + k * 0} y={18 + k * 40} width="160" height="30" />
            <Value at={[178, 31 + k * 40]} text={k === 0 ? "BECH32 · V0" : "BECH32M · V1–V16"} size={9} cls="k-value--label" />
            <Value at={[178, 43 + k * 40]} text={formatResidue(c)} size={10} />
          </g>
        ))}
        <Value at={[170, 106]} text="TWO ACCEPTED RESULTS" size={9} cls="k-value--label" />
        {list.map(({ r, verdict }, i) => {
          const y = 140 + i * 36;
          return (
            <g>
              <Value at={[14, y]} text={short(r.f.address, 34)} size={9.5} />
              <Value at={[330, y]} text={formatResidue(r.a.residue!)} anchor="end" size={9.5} />
              <Value at={[14, y + 13]} text={verdict} size={9} cls="k-value--label" />
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact strings</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {list.map(({ r }) => <><dt>BIP {r.f.source.bip} line {r.f.source.line}</dt><dd><code class="atlas-break">{r.f.address}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
