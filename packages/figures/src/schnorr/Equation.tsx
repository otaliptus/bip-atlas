import { Drawing, Value } from "../kit";
import type { Role } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { ownTrace, short, stageValues } from "./stages";

function Chip({ x, y, t, role }: { x: number; y: number; t: string; role: Role }) {
  return (
    <g>
      <rect class={`k-outline k-fill--${role}`} x={x} y={y} width="18" height="16" />
      <text class="k-value" x={x + 9} y={y + 11.5} text-anchor="middle">{t}</text>
    </g>
  );
}

/**
 * schnorr-equation.v1 — static. The equation a valid signature satisfies,
 * s⋅G = R + e⋅P, drawn as a balance, with a key to where each term comes
 * from. Points are labels, never plotted. r, s and e are one published
 * vector's, from the tested verifier trace.
 */
export function Equation({ fixture }: { fixture: DerivedSchnorrFixture }) {
  const t = ownTrace(fixture);
  if (!t.valid) throw new Error(`${fixture.id}: the balance figure needs a valid vector`);
  const r = stageValues(t, "r-range").r, s = stageValues(t, "s-range").s, e = stageValues(t, "challenge").e;
  const desc =
    `A balance for vector ${fixture.vectorIndex}. On the left pan s⋅G, on the right R + e⋅P, and the beam is level because the signature is valid. ` +
    `s is the second half of the signature, ${s}. G is the curve's fixed base point. R is the point whose x coordinate is r, the first half of the signature (${r}), with even y. ` +
    `e is the challenge, a tagged hash of r, P and m reduced mod n: ${e}. P is the public key lifted to its point with even y. The verifier rearranges the equation to R = s⋅G − e⋅P and checks that x(R) equals r.`;
  const legend: Array<{ t: string; role: Role; text: string }> = [
    { t: "s", role: "sig", text: `SIGNATURE BYTES 32–63 · ${short(s)}` },
    { t: "G", role: "plain", text: "THE CURVE'S FIXED BASE POINT" },
    { t: "R", role: "public", text: `x(R) = r, SIGNATURE BYTES 0–31 · ${short(r)}` },
    { t: "e", role: "hash", text: `HASH OF r ‖ P ‖ m, MOD n · ${short(e)}` },
    { t: "P", role: "public", text: "THE KEY pk, LIFTED WITH EVEN y" },
  ];
  return (
    <>
      <Drawing id="a06-balance" width={344} height={288} title="The equation a signature satisfies" desc={desc}>
        <Value at={[172, 20]} text={`VECTOR ${fixture.vectorIndex}: THE BEAM IS LEVEL`} size={9} anchor="middle" cls="k-value--label" />
        <line class="k-ring" x1="70" y1="70" x2="274" y2="70" />
        <polygon class="k-outline k-fill--plain" points="172,70 154,140 190,140" />
        <line class="k-leader" x1="136" y1="140" x2="208" y2="140" />
        <Value at={[172, 56]} text="=" size={18} anchor="middle" />
        {[70, 274].map((cx) => (
          <g>
            <path class="k-leader" d={`M${cx} 70 L${cx - 60} 138 M${cx} 70 L${cx + 60} 138`} />
            <path class="k-outline k-fill--plain" d={`M${cx - 62} 138 Q${cx} 154 ${cx + 62} 138 Z`} />
          </g>
        ))}
        <Chip x={42} y={120} t="s" role="sig" />
        <Value at={[66, 132]} text="·" size={12} anchor="middle" />
        <Chip x={76} y={120} t="G" role="plain" />
        <Chip x={232} y={120} t="R" role="public" />
        <Value at={[256, 132]} text="+" size={11} anchor="middle" />
        <Chip x={262} y={120} t="e" role="hash" />
        <Value at={[285, 132]} text="·" size={12} anchor="middle" />
        <Chip x={290} y={120} t="P" role="public" />
        {legend.map((l, i) => (
          <g>
            <Chip x={14} y={170 + i * 20} t={l.t} role={l.role} />
            <Value at={[40, 182 + i * 20]} text={l.text} size={8.5} />
          </g>
        ))}
        <Value at={[14, 280]} text="VERIFY COMPUTES R = s·G − e·P, THEN THE CHECKS ON R" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>r</dt><dd><code class="atlas-break">{r}</code></dd>
          <dt>s</dt><dd><code class="atlas-break">{s}</code></dd>
          <dt>e</dt><dd><code class="atlas-break">{e}</code></dd>
        </dl>
      </details>
    </>
  );
}
