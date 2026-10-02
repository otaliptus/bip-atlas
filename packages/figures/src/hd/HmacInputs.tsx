import { Cells, Drawing, Magnifier, Packet, Value, type PacketField } from "../kit";
import type { Bip32NodeDerived, DerivedBip32Fixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const UNIT = 8;
const X = 24;

/** The node to draw, or a build failure: no invented fallbacks. */
export function hdNode(fixture: DerivedBip32Fixture, path: string): Bip32NodeDerived {
  const n = fixture.derived.nodes.find((x) => x.path === path);
  if (!n) throw new Error(`${fixture.id}: no node ${path} in the derived tree`);
  return n;
}

/**
 * The HMAC data of one step, split into its parts and checked against the
 * model's bytes: normal = K_par ‖ i, hardened = 00 ‖ k_par ‖ i.
 */
export function hmacParts(child: Bip32NodeDerived, parent: Bip32NodeDerived) {
  const data = child.hmacDataHex;
  if (!data) throw new Error(`${child.path}: no HMAC data`);
  const expect = child.hardened ? `00${parent.privateKeyHex}${child.childNumberHex}` : `${parent.publicKeyHex}${child.childNumberHex}`;
  if (data !== expect) throw new Error(`${child.path}: HMAC data does not split as BIP 32 says`);
  return child.hardened
    ? [{ hex: "00", role: "plain" as const, name: "00" }, { hex: parent.privateKeyHex, role: "secret" as const, name: `private key k of ${parent.path}` }, { hex: child.childNumberHex, role: "plain" as const, name: "i" }]
    : [{ hex: parent.publicKeyHex, role: "public" as const, name: `public key K of ${parent.path}` }, { hex: child.childNumberHex, role: "plain" as const, name: "i" }];
}

/**
 * hd-hmac-inputs.v1 — static. The two layouts of HMAC data on one byte
 * ruler, with real bytes from test vector 1: a normal child hashes the
 * parent's public key, a hardened child the parent's private key. The
 * index's top bit is what tells them apart.
 */
export function HmacInputs({ fixture }: { fixture: DerivedBip32Fixture }) {
  const normal = hdNode(fixture, "m/0H/1");
  const hard = hdNode(fixture, "m/0H");
  const rows = [normal, hard].map((child) => {
    const parent = hdNode(fixture, child.parentPath!);
    const parts = hmacParts(child, parent);
    const fields: PacketField[] = parts.map((p, i) => ({ id: `${child.path}-${i}`, label: p.name === "i" || p.name === "00" ? p.name : `${p.name}  ${short(p.hex)}`, bytes: p.hex.length / 2, role: p.role }));
    return { child, parent, parts, fields, bytes: child.hmacDataHex!.length / 2 };
  });
  const per = rows[0].bytes;
  if (rows[1].bytes !== per) throw new Error("both HMAC inputs are 37 bytes in BIP 32");
  const Y = [40, 106];
  const hardIdx = rows[1].child.childNumberHex;
  const topBits = [...parseInt(hardIdx.slice(0, 2), 16).toString(2).padStart(8, "0")];
  const idxX = X + (per - 4) * UNIT;
  const desc = rows
    .map((r) => `${r.child.hardened ? "Hardened" : "Normal"} child ${r.child.path} of ${r.parent.path}: the ${r.bytes} bytes of HMAC data are ${r.parts.map((p) => `${p.name} (${p.hex.length / 2} bytes, ${p.hex})`).join(", then ")}.`)
    .join(" ") + ` The first byte of the hardened index, ${hardIdx.slice(0, 2)}, is ${topBits.join("")} in binary: its top bit is set, so the index is at least 2^31. Both are keyed by the parent's chain code.`;
  return (
    <>
      <Drawing id="a02-hmacin" width={344} height={244} title="What goes into the HMAC" desc={desc}>
        {rows.map((r, k) => (
          <g>
            <Value at={[X, Y[k] - (k === 0 ? 24 : 10)]} text={`${r.child.hardened ? "HARDENED" : "NORMAL"} · ${r.parent.path} → ${r.child.path}`} size={9} cls="k-value--label" />
            <Packet x={X} y={Y[k]} fields={r.fields} perRow={per} unit={UNIT} ruler={k === 0} />
            <Value at={[X + per * UNIT, Y[k] + 34]} text={`i = ${r.child.childNumberHex}`} anchor="end" size={9} />
            {r.child.hardened ? <Value at={[X, Y[k] + 34]} text="00: ONE ZERO BYTE" size={8.5} cls="k-value--muted" /> : null}
          </g>
        ))}
        <Value at={[X + per * UNIT, Y[0] - 24]} text={`${per} B`} anchor="end" size={8.5} cls="k-value--muted" />
        <Magnifier id="a02-hmacin-mag" from={[idxX + 16, Y[1] + 11]} fromR={8} at={[262, 196]} r={38}>
          <Cells x={230} y={184} values={topBits} size={8} roleOf={() => "plain"} strong={(i) => topBits[i] === "1"} text={false} />
          <Value at={[262, 212]} text={`0x${hardIdx.slice(0, 2)} = ${topBits.join("")}`} anchor="middle" size={8.5} />
        </Magnifier>
        <Value at={[X, 182]} text="TOP BIT SET:" size={9} cls="k-value--label" />
        <Value at={[X, 195]} text="i ≥ 2³¹, HARDENED" size={9} cls="k-value--label" />
        <Value at={[X, 218]} text="BOTH KEYED BY THE PARENT’S" size={8.5} cls="k-value--muted" />
        <Value at={[X, 230]} text="CHAIN CODE c" size={8.5} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact HMAC data, both steps</summary>
        <dl class="atlas-hexlist">
          {rows.map((r) => (
            <><dt>{r.child.path} ({r.child.hardened ? "hardened" : "normal"})</dt><dd><code class="atlas-break">{r.child.hmacDataHex}</code></dd></>
          ))}
        </dl>
      </details>
    </>
  );
}
