import { Drawing, Value } from "../kit";
import type { DerivedDescriptorFixture } from "../types";

/**
 * descriptor-typo-forgery.v1 — static. BIP 380's valid vector and its
 * error-in-payload vector, plus what anyone can do next: recompute the
 * checksum for the altered text. All three checksums come from the tested
 * checksum model; no key is involved in any of them.
 */
export function DescriptorTypo({ fixtures }: { fixtures: DerivedDescriptorFixture[] }) {
  const good = fixtures.find((f) => f.derived.checksumVerdict === "valid");
  const typo = fixtures.find((f) => f.derived.checksumVerdict === "mismatch");
  if (!good || !typo || good.derived.body.length !== typo.derived.body.length) throw new Error("descriptor-typo-forgery.v1 needs a valid vector and a same-length mismatch");
  const diff = [...good.derived.body].findIndex((c, i) => c !== typo.derived.body[i]);
  if (diff < 0 || typo.derived.checksumGiven !== good.derived.checksumGiven) throw new Error("the two vectors should differ in the payload only");
  const forged = typo.derived.checksumComputed;
  const rows = [
    { text: good.derived.body, cs: good.derived.checksumGiven!, verdict: "✓ MATCHES", note: `BIP 380 LINE ${good.source.line}`, mark: -1 },
    { text: typo.derived.body, cs: typo.derived.checksumGiven!, verdict: "✕ TYPO CAUGHT", note: `BIP 380 LINE ${typo.source.line} · COMPUTED #${forged}`, mark: diff },
    { text: typo.derived.body, cs: forged, verdict: "✓ MATCHES", note: "COMPUTED HERE, NOT IN BIP 380 · NO KEY NEEDED", mark: diff },
  ];
  const CW = 13;
  const desc =
    `${good.derived.body}#${good.derived.checksumGiven} is BIP 380's valid vector: the checksum matches. ` +
    `${typo.derived.body}#${typo.derived.checksumGiven} changes character ${diff + 1} and keeps the checksum: the computed checksum is #${forged}, so it is rejected. ` +
    `But anyone can compute #${forged} for the altered text and write ${typo.derived.body}#${forged}, which passes: the checksum catches typos, not tampering.`;
  return (
    <Drawing id="a13-typo" width={344} height={176} title="A typo caught, a change not" desc={desc}>
      {rows.map((r, i) => {
        const y = 16 + i * 52;
        const csx = 8 + r.text.length * CW + 6;
        return (
          <g>
            {[...r.text].map((c, j) => (
              <g>
                <rect class={`k-cell k-fill--plain${j === r.mark ? " k-cell--em" : ""}`} x={8 + j * CW} y={y} width={CW} height="18" />
                <Value at={[8 + j * CW + CW / 2, y + 13]} text={c} anchor="middle" size={10} />
              </g>
            ))}
            <Value at={[csx - 2, y + 13]} text="#" size={10} />
            {[...r.cs].map((c, j) => (
              <g>
                <rect class={`k-cell k-fill--check${i === 2 ? " k-cell--em" : ""}`} x={csx + 8 + j * 11} y={y} width="11" height="18" />
                <Value at={[csx + 13.5 + j * 11, y + 13]} text={c} anchor="middle" size={9.5} />
              </g>
            ))}
            <Value at={[8, y + 32]} text={`${r.verdict} · ${r.note}`} size={9} cls="k-value--label" />
          </g>
        );
      })}
    </Drawing>
  );
}
