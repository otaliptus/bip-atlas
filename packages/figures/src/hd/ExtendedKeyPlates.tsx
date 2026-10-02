import { Arrow, COS30, Drawing, IsoBox, Responsive, Tag, Value, idsFor, iso, onTop, type DrawingIds } from "../kit";
import type { Role } from "../kit";
import type { DerivedBip32Fixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const PW = 84, PD = 48, PH = 6, GAP = 36;

/**
 * hd-extended-key.v1 — static. An extended key drawn as two stacked plates:
 * the key on top, the chain code below. Neutering, N(), swaps the private key
 * k for its public key K and keeps the very same chain code c.
 */
export function ExtendedKeyPlates({ fixture }: { fixture: DerivedBip32Fixture }) {
  const m = fixture.derived.nodes.find((n) => n.path === "m");
  if (!m) throw new Error(`${fixture.id}: hd-extended-key.v1 needs the master node`);
  const desc =
    `An extended private key is two parts: the private key k (${m.privateKeyHex}) and the chain code c (${m.chainCodeHex}), shown for the master node of BIP 32 test vector 1. ` +
    `Neutering it, N(), replaces k with its public key K (${m.publicKeyHex}) and keeps the same chain code. The result, (K, c), is the extended public key: it cannot sign.`;
  const stack = (x: number, y: number, top: { role: Role; value: string; label: string }) => {
    const ox = x + PD * COS30;
    const plate = (i: number, role: Role, value: string, label: string) => {
      const oy = y + PH + i * GAP;
      const P = iso(ox, oy);
      const right = P(PW, 0, PH / 2);
      return (
        <g>
          <IsoBox at={[ox, oy]} w={PW} d={PD} h={PH} role={role} />
          <text class="k-engrave" transform={onTop(P(10, 28, PH))}>{value}</text>
          <Tag at={[right[0] + 4, right[1]]} text={label} />
        </g>
      );
    };
    const P0 = iso(ox, y + PH);
    const drops = [P0(0, PD, 0), P0(PW, PD, 0), P0(PW, 0, 0)];
    return (
      <g>
        {plate(1, "public", short(m.chainCodeHex), "chain code c · 32 B")}
        {drops.map(([dx, dy]) => <line class="k-leader k-dashed" x1={dx} y1={dy} x2={dx} y2={dy + GAP - PH} />)}
        {plate(0, top.role, top.value, top.label)}
      </g>
    );
  };
  const parts = (ids: DrawingIds, wide: boolean) => {
    const L: [number, number] = [14, 18];
    const R: [number, number] = wide ? [330, 18] : [14, 200];
    const foot = (x: number, y: number, a: string, b: string) => (
      <>
        <Value at={[x, y]} text={a} size={9} cls="k-value--label" />
        <Value at={[x, y + 13]} text={b} size={8.5} cls="k-value--muted" />
      </>
    );
    return (
      <>
        {stack(L[0], L[1], { role: "secret", value: short(m.privateKeyHex), label: "private key k · 32 B" })}
        {foot(L[0], L[1] + 132, "EXTENDED PRIVATE KEY (k, c)", "CAN SIGN")}
        {wide ? (
          <>
            <Arrow d="M262 92 H316" ids={ids} />
            <Value at={[289, 84]} text="N( )" anchor="middle" size={10} />
            <Value at={[289, 108]} text="NEUTER" anchor="middle" size={8} cls="k-value--muted" />
          </>
        ) : (
          <>
            <Arrow d="M70 172 V194" ids={ids} />
            <Value at={[80, 187]} text="N( ) · NEUTER" size={9} />
          </>
        )}
        {stack(R[0], R[1], { role: "public", value: short(m.publicKeyHex), label: "public key K · 33 B" })}
        {foot(R[0], R[1] + 132, "EXTENDED PUBLIC KEY (K, c)", "CANNOT SIGN · SAME c")}
      </>
    );
  };
  return (
    <>
      <Responsive
        wide={<Drawing id="a02-xkey-w" width={600} height={172} title="Key plus chain code" desc={desc}>{parts(idsFor("a02-xkey-w"), true)}</Drawing>}
        narrow={<Drawing id="a02-xkey-n" width={300} height={366} title="Key plus chain code" desc={desc}>{parts(idsFor("a02-xkey-n"), false)}</Drawing>}
      />
      <details class="atlas-disclosure">
        <summary>Exact values (master node of test vector 1)</summary>
        <dl class="atlas-hexlist">
          <dt>Private key k</dt><dd><code class="atlas-break">{m.privateKeyHex}</code></dd>
          <dt>Public key K</dt><dd><code class="atlas-break">{m.publicKeyHex}</code></dd>
          <dt>Chain code c</dt><dd><code class="atlas-break">{m.chainCodeHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
