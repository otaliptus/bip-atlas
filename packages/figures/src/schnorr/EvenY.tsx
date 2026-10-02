import { Arrow, Drawing, KeyGlyph, Lamp, Value, idsFor } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { SCHNORR_STAGES, ownTrace, short, stageValues } from "./stages";

const isEven = (hexY: string) => BigInt(`0x${hexY}`) % 2n === 0n;

/**
 * schnorr-even-y.v1 — static. One x coordinate, two candidate y values: the
 * even one is kept (lift_x for the key, the even-y check for R) and the odd
 * one never used. Then the side effect the BIP states: two secret keys, sk
 * and n − sk, behind one x-only key (glyphs only, no values). Keys are glyphs
 * and points are labels; nothing is plotted.
 */
export function EvenY({ fixtures }: { fixtures: DerivedSchnorrFixture[] }) {
  const keyF = fixtures.find((f) => f.expected);
  const oddF = fixtures.find((f) => ownTrace(f).failedStage === "even-y");
  if (!keyF || !oddF) throw new Error("schnorr-even-y needs a valid vector and one rejected at the even-y check");
  const lift = stageValues(ownTrace(keyF), "lift-x");
  const R = stageValues(ownTrace(oddF), "compute-r");
  if (!isEven(lift.y) || isEven(R.y)) throw new Error("schnorr-even-y: parities differ from the trace");
  const gate = SCHNORR_STAGES.findIndex((s) => s.id === "even-y") + 1;
  const ids = idsFor("a06-even");
  const desc =
    `The key of vector ${keyF.vectorIndex}, x = ${keyF.publicKeyHex}, matches two curve points: one with even y and one with odd y. lift_x keeps the even one, y = ${lift.y}; the odd one, p − y, is never used. ` +
    `The same rule applies to R: in vector ${oddF.vectorIndex}, R = s⋅G − e⋅P has x = ${R.x} and odd y = ${R.y}, so Verify stops at gate ${gate}, the even-y check. ` +
    `A side effect: every public key has two secret keys, sk and n − sk, that give the same x-only key.`;
  return (
    <>
      <Drawing id="a06-even" width={344} height={330} title="One x, two y, one kept" desc={desc}>
        <Value at={[14, 18]} text={`THE KEY · VECTOR ${keyF.vectorIndex}`} size={9} cls="k-value--label" />
        <rect class="k-outline k-fill--public" x="14" y="30" width="98" height="22" />
        <Value at={[20, 45]} text={`x ${short(keyF.publicKeyHex)}`} size={9} />
        <Arrow d="M112 41 H136 V30 H160" ids={ids} />
        <Arrow d="M136 41 V68 H160" ids={ids} />
        <KeyGlyph at={[168, 22]} role="public" scale={0.7} />
        <Value at={[196, 30]} text={`y ${short(lift.y)}`} size={9} />
        <Value at={[196, 42]} text="EVEN · KEPT AS P" size={8.5} cls="k-value--ok" />
        <g class="k-faded">
          <KeyGlyph at={[168, 60]} role="public" scale={0.7} />
        </g>
        <Value at={[196, 68]} text="other y = p − y · ODD" size={9} cls="k-value--muted" />
        <Value at={[196, 80]} text="NEVER USED" size={8.5} cls="k-value--muted" />
        <line class="k-sep k-leader" x1="14" y1="100" x2="330" y2="100" />

        <Value at={[14, 122]} text={`R · VECTOR ${oddF.vectorIndex}`} size={9} cls="k-value--label" />
        <rect class="k-outline k-fill--public" x="14" y="132" width="98" height="22" />
        <Value at={[20, 147]} text={`x ${short(R.x)}`} size={9} />
        <Arrow d="M112 143 H160" ids={ids} />
        <Value at={[168, 140]} text={`y ${short(R.y)}`} size={9} />
        <Value at={[168, 152]} text="ODD" size={8.5} cls="k-value--label" />
        <Lamp at={[300, 143]} state="off" label={`GATE ${gate}`} />
        <Value at={[14, 178]} text="VERIFY STOPS: R MUST HAVE EVEN y" size={8.5} cls="k-value--muted" />
        <line class="k-sep k-leader" x1="14" y1="196" x2="330" y2="196" />

        <Value at={[14, 218]} text="TWO SECRET KEYS, ONE X-ONLY KEY" size={9} cls="k-value--label" />
        <KeyGlyph at={[14, 236]} role="secret" />
        <Value at={[29, 260]} text="sk" size={9.5} anchor="middle" />
        <KeyGlyph at={[14, 282]} role="secret" />
        <Value at={[29, 306]} text="n − sk" size={9.5} anchor="middle" />
        <Arrow d="M50 242 H120 V262 H150" ids={ids} />
        <Arrow d="M50 288 H120 V266 H150" ids={ids} />
        <KeyGlyph at={[160, 258]} role="public" label="same pk" />
        <Value at={[206, 268]} text="NO VALUES: SECRET" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Vector {keyF.vectorIndex}: pk = x(P)</dt><dd><code class="atlas-break">{keyF.publicKeyHex}</code></dd>
          <dt>y(P), even</dt><dd><code class="atlas-break">{lift.y}</code></dd>
          <dt>Vector {oddF.vectorIndex}: x(R)</dt><dd><code class="atlas-break">{R.x}</code></dd>
          <dt>y(R), odd</dt><dd><code class="atlas-break">{R.y}</code></dd>
        </dl>
      </details>
    </>
  );
}
