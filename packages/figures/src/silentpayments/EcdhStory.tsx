import { Arrow, Boundary, Computer, KeyGlyph, Storyboard, Value, type DrawingIds, type Frame } from "../kit";

type Step = 1 | 2 | 3 | 4 | 5;

/** One frame of the scene: Alice left, Bob right, an observer under the open network. */
function scene(step: Step, ids: DrawingIds) {
  const pt = (x: number, y: number, t: string, role: "public" | "secret" | "hidden") => (
    <g>
      <rect class={`k-outline k-fill--${role === "hidden" ? "plain" : role}${role === "secret" ? " k-dashed" : ""}`} x={x} y={y} width="56" height="16" style={role === "hidden" ? `fill:${ids.hatch}` : undefined} />
      <text class="k-value" x={x + 28} y={y + 11.5} text-anchor="middle" style="font-size:9px">{t}</text>
    </g>
  );
  return (
    <>
      <Computer at={[14, 14]} label="Alice" />
      <Computer at={[260, 14]} label="Bob" />
      <Boundary x={150} y1={4} y2={100} label="open network" />
      <Computer at={[137, 104]} />
      <Value at={[176, 120]} text="OBSERVER" size={8} cls="k-value--muted" />
      {/* Bob's keys */}
      {pt(232, 60, "b", "secret")}
      {pt(232, 80, "B", "public")}
      {step >= 1 ? <Arrow d="M230 88 H90" ids={ids} /> : null}
      {step >= 1 ? pt(30, 80, "B", "public") : null}
      {/* Alice's keys */}
      {step >= 2 ? (
        <>
          {pt(30, 60, "a", "secret")}
          {pt(90, 22, "A", "public")}
          <Arrow d="M146 30 H204 V108 H228" ids={ids} />
          {pt(232, 100, "A", "public")}
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Value at={[42, 136]} text="a·B" size={11} anchor="middle" />
          <Value at={[260, 136]} text="b·A" size={11} anchor="middle" />
        </>
      ) : null}
      {step >= 4 ? (
        <>
          {pt(14, 124, "S = a·B", "secret")}
          {pt(232, 124, "S = b·A", "secret")}
          {pt(160, 62, "S ?", "hidden")}
        </>
      ) : null}
      {step === 5 ? (
        <>
          {pt(94, 40, "P", "public")}
          <Value at={[150, 156]} text="P = B + hash(S)·G" size={9} anchor="middle" />
        </>
      ) : null}
    </>
  );
}

/**
 * sp-ecdh.v1 — static, symbolic. BIP 352's simple case as a storyboard:
 * Alice and Bob either side of an open network, an observer watching it.
 * Bob's B is public; Alice's A shows in her transaction; a·B and b·A are the
 * same point S, which the observer cannot compute; Alice pays to
 * P = B + hash(S)·G. Symbols only: the full protocol, with real values, is
 * the next figure.
 */
export function EcdhStory() {
  const frames: Frame[] = [
    { note: "Bob publishes his public key B. Everyone, the observer included, can see it.", desc: "Bob holds the secret key b and publishes the public key B; Alice and the observer both see B.", draw: (ids) => scene(1, ids) },
    { note: "Alice holds a secret key a; its public key A shows in the transaction she makes.", desc: "Alice holds the secret key a. Her transaction shows the public key A, which Bob and the observer can read.", draw: (ids) => scene(2, ids) },
    { note: "Each multiplies the other's public key by their own secret: Alice computes a·B, Bob computes b·A.", desc: "Alice computes a·B; Bob computes b·A. The observer has neither a nor b.", draw: (ids) => scene(3, ids) },
    { note: "Both get the same point S (Diffie–Hellman). The observer, with only A and B, cannot.", desc: "a·B equals b·A, the shared point S, known to Alice and Bob. The observer's copy is unknown, drawn hatched.", draw: (ids) => scene(4, ids) },
    { note: "Alice pays to P = B + hash(S)·G. Bob recomputes it and finds P; the observer sees a key it cannot connect to B.", desc: "Alice pays to the key P = B + hash(S)·G. Bob, knowing S, computes the same P and recognises it. The observer sees P but cannot link it to B.", draw: (ids) => scene(5, ids) },
  ];
  return <Storyboard id="a15-ecdh" title="A secret two parties can compute" width={300} height={160} frames={frames} />;
}
