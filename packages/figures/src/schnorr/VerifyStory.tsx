import { Arrow, Bracket, Cells, IsoBox, KeyGlyph, Lamp, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { ownTrace, short, stageValues } from "./stages";

const even = (hexY: string) => BigInt(`0x${hexY}`) % 2n === 0n;

/** A hash value as a small yellow cube with its label and short value. */
function HashCube({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g>
      <IsoBox at={[x, y + 10]} w={18} d={18} h={12} role="hash" />
      <Value at={[x + 20, y]} text={label} size={8.5} cls="k-value--label" />
      <Value at={[x + 20, y + 12]} text={short(value)} size={9} />
    </g>
  );
}

/**
 * schnorr-verify-story.v1 — static. One valid published vector through
 * Verify, one frame per step (the chapter's former worked example). Values
 * from the tested step-by-step verifier; exact ones in the disclosure.
 */
export function VerifyStory({ fixture }: { fixture: DerivedSchnorrFixture }) {
  const t = ownTrace(fixture);
  if (!t.valid) throw new Error(`${fixture.id}: the storyboard follows a valid vector`);
  const lift = stageValues(t, "lift-x"), r = stageValues(t, "r-range").r, s = stageValues(t, "s-range").s;
  const ch = stageValues(t, "challenge"), R = stageValues(t, "compute-r"), xm = stageValues(t, "x-match");
  if (!even(lift.y) || !even(R.y)) throw new Error(`${fixture.id}: a valid trace must have even y for P and R`);
  const m = fixture.messageHex.length / 2;
  // r ‖ P ‖ m to scale (1.1 units per byte); an empty message still gets a sliver so it can be named.
  const preimage = [{ bytes: 32, role: "sig", t: "r" }, { bytes: 32, role: "public", t: "P" }, { bytes: Math.max(m, 4), role: "plain", t: "m" }].map((p, i, all) => ({
    ...p,
    w: p.bytes * 1.1,
    x: 14 + all.slice(0, i).reduce((n, q) => n + q.bytes * 1.1, 0),
  }));
  const frames: Frame[] = [
    {
      note: `Lift the key: pk is an x coordinate; lift_x returns the point P with that x and even y.`,
      desc: `The 32-byte key ${fixture.publicKeyHex} is lifted to the point P with x = ${lift.x} and even y = ${lift.y}.`,
      draw: (ids) => (
        <>
          <KeyGlyph at={[14, 40]} role="public" label="pk" />
          <Value at={[14, 82]} text={short(fixture.publicKeyHex)} size={9} />
          <Arrow d="M52 46 H86" ids={ids} />
          <Machine at={[112, 58]} w={56} d={28} h={22} label="lift_x" />
          <Arrow d="M178 46 H206" ids={ids} />
          <Value at={[214, 40]} text="POINT P" size={8.5} cls="k-value--label" />
          <Value at={[214, 54]} text={`x ${short(lift.x)}`} size={9} />
          <Value at={[214, 68]} text={`y ${short(lift.y)}`} size={9} />
          <Value at={[214, 84]} text="y EVEN ✓" size={8.5} cls="k-value--ok" />
        </>
      ),
    },
    {
      note: `Split the signature: r is bytes 0–31, s bytes 32–63. Check r < p and s < n.`,
      desc: `r = ${r}, which is below the field size p. s = ${s}, which is below the group order n.`,
      draw: () => (
        <>
          <Cells x={22} y={36} values={Array.from({ length: 64 }, () => "")} size={4} text={false} roleOf={() => "sig"} cutBefore={(i) => i === 32} />
          <Bracket x1={22} x2={150} y={42} text="bytes 0–31" />
          <Bracket x1={150} x2={278} y={42} text="bytes 32–63" />
          <Value at={[86, 82]} text={`r ${short(r)}`} size={9} anchor="middle" />
          <Value at={[214, 82]} text={`s ${short(s)}`} size={9} anchor="middle" />
          <Value at={[86, 104]} text="r < p ✓" size={9} anchor="middle" cls="k-value--ok" />
          <Value at={[214, 104]} text="s < n ✓" size={9} anchor="middle" cls="k-value--ok" />
        </>
      ),
    },
    {
      note: `Hash the challenge: SHA-256 tagged BIP0340/challenge over r ‖ P ‖ m, then mod n gives e.`,
      desc: `The tagged hash of r, P and the ${m}-byte message is ${ch.hash}; reduced mod n it is e = ${ch.e}.`,
      draw: (ids) => (
        <>
          {preimage.map((p) => (
            <g>
              <rect class={`k-cell k-fill--${p.role}`} x={p.x} y={40} width={p.w} height={18} />
              <Value at={[p.x + 4, 53]} text={p.t} size={9} />
            </g>
          ))}
          <Arrow d="M64 62 V82 H96" ids={ids} />
          <Machine at={[122, 96]} w={58} d={28} h={30} label="SHA-256" sub="tagged" role="hash" />
          <Arrow d="M190 80 H204" ids={ids} />
          <HashCube x={212} y={70} label="e (mod n)" value={ch.e} />
        </>
      ),
    },
    {
      note: `Compute R = s⋅G − e⋅P with curve arithmetic. R comes out as a point with coordinates.`,
      desc: `s⋅G − e⋅P is the point R with x = ${R.x} and y = ${R.y}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 46]} text={`s ${short(s)}`} size={9} />
          <Value at={[14, 64]} text={`e ${short(ch.e)}`} size={9} />
          <Value at={[14, 82]} text="P (lifted key)" size={9} />
          <Arrow d="M110 62 H124" ids={ids} />
          <Machine at={[150, 80]} w={60} d={28} h={30} label="curve" sub="s·G − e·P" />
          <Arrow d="M216 62 H226" ids={ids} />
          <Value at={[232, 50]} text="POINT R" size={8.5} cls="k-value--label" />
          <Value at={[232, 64]} text={`x ${short(R.x)}`} size={9} />
          <Value at={[232, 78]} text={`y ${short(R.y)}`} size={9} />
        </>
      ),
    },
    {
      note: `Two checks on R: it is not the point at infinity, and its y coordinate is even.`,
      desc: `R is an ordinary point, not infinity, and its y coordinate ${R.y} is even.`,
      draw: () => (
        <>
          <Lamp at={[80, 64]} state="on" label="R ≠ ∞" />
          <Lamp at={[210, 64]} state="on" label="y(R) EVEN" />
          <Value at={[150, 120]} text={`y = ${short(R.y)}, LAST HEX DIGIT ${R.y.slice(-1)}`} size={8.5} anchor="middle" cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Compare x(R) with r. They are equal, so Verify succeeds: the published result is TRUE.`,
      desc: `x(R) = ${xm.xR} equals r = ${xm.r}. Verification succeeds, as the CSV records for vector ${fixture.vectorIndex}.`,
      draw: () => (
        <>
          <Value at={[20, 52]} text="x(R)" size={8.5} cls="k-value--label" />
          <Value at={[20, 66]} text={short(xm.xR)} size={9.5} />
          <Value at={[124, 64]} text="=" size={16} anchor="middle" />
          <Value at={[150, 52]} text="r" size={8.5} cls="k-value--label" />
          <Value at={[150, 66]} text={short(xm.r)} size={9.5} />
          <Lamp at={[262, 60]} state="on" label="TRUE" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a06-story" title={`Verifying vector ${fixture.vectorIndex}`} width={300} height={130} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values, step by step</summary>
        <dl class="atlas-hexlist">
          <dt>pk = x(P)</dt><dd><code class="atlas-break">{fixture.publicKeyHex}</code></dd>
          <dt>y(P)</dt><dd><code class="atlas-break">{lift.y}</code></dd>
          <dt>m ({m} bytes)</dt><dd><code class="atlas-break">{fixture.messageHex || "(empty)"}</code></dd>
          <dt>r</dt><dd><code class="atlas-break">{r}</code></dd>
          <dt>s</dt><dd><code class="atlas-break">{s}</code></dd>
          <dt>challenge hash</dt><dd><code class="atlas-break">{ch.hash}</code></dd>
          <dt>e = hash mod n</dt><dd><code class="atlas-break">{ch.e}</code></dd>
          <dt>x(R)</dt><dd><code class="atlas-break">{R.x}</code></dd>
          <dt>y(R)</dt><dd><code class="atlas-break">{R.y}</code></dd>
        </dl>
      </details>
    </>
  );
}
