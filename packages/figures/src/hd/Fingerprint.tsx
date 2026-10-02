import { Arrow, Bracket, Cells, Drawing, KeyGlyph, Machine, Value, idsFor } from "../kit";
import type { DerivedBip32Fixture } from "../types";
import { hdNode } from "./HmacInputs";

const bytes = (hex: string) => hex.match(/.{2}/g)!;

/**
 * hd-fingerprint.v1 — static. A key's identifier is the Hash160 of its
 * public key; the first four bytes are its fingerprint, which each child
 * carries as "parent fingerprint". Values from the tested model; the build
 * of this figure throws if the child's field differs.
 */
export function Fingerprint({ fixture }: { fixture: DerivedBip32Fixture }) {
  const parent = hdNode(fixture, "m");
  const child = hdNode(fixture, "m/0H");
  const id = bytes(parent.identifierHex);
  const fp = parent.identifierHex.slice(0, 8);
  if (fp !== parent.fingerprintHex || child.parentFingerprintHex !== fp) throw new Error(`${fixture.id}: fingerprint does not match the child's field`);
  const ids = idsFor("a02-fp");
  const cell = 15;
  const x0 = (344 - id.length * cell) / 2;
  return (
    <>
      <Drawing
        id="a02-fp"
        width={344}
        height={262}
        title="Four bytes that name a parent"
        desc={`The public key of m, ${parent.publicKeyHex}, goes through Hash160 (SHA-256, then RIPEMD-160). The ${id.length}-byte result, ${parent.identifierHex}, is m's identifier. Its first 4 bytes, ${fp}, are m's fingerprint, and they reappear as the parent fingerprint field of its child ${child.path}. Different keys can share a fingerprint.`}
      >
        <KeyGlyph at={[x0, 14]} role="public" />
        <Value at={[x0 + 38, 18]} text="PUBLIC KEY OF m · 33 B" size={9} cls="k-value--label" />
        <Value at={[x0 + 38, 31]} text={`${parent.publicKeyHex.slice(0, 16)}…`} size={9.5} />
        <Arrow d={`M${x0 + 15} 32 V52 H138`} ids={ids} />
        <Machine at={[160, 74]} w={84} d={34} h={24} label="HASH160" role="hash" />
        <Value at={[256, 92]} text="SHA-256," size={9} cls="k-value--muted" />
        <Value at={[256, 104]} text="THEN RIPEMD-160" size={9} cls="k-value--muted" />
        <Arrow d="M190 130 V150" ids={ids} />
        <Value at={[x0 + id.length * cell, 152]} text={`IDENTIFIER · ${id.length} BYTES`} anchor="end" size={9} cls="k-value--label" />
        <Cells x={x0} y={158} values={id} size={cell} roleOf={() => "hash"} emphasis={(i) => i < 4} />
        <Bracket x1={x0} x2={x0 + 4 * cell} y={176} text="fingerprint" align="start" />
        <Arrow d={`M${x0 + 2 * cell} 204 V222 H${x0 + 104}`} ids={ids} />
        <Value at={[x0 + 108, 218]} text={`${child.path} · PARENT FINGERPRINT`} size={9} cls="k-value--label" />
        <Cells x={x0 + 108} y={224} values={bytes(child.parentFingerprintHex)} size={cell} roleOf={() => "hash"} />
        <Value at={[x0, 254]} text="A SHORTCUT, NOT A NAME: COLLISIONS ARE POSSIBLE" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Public key of m</dt><dd><code class="atlas-break">{parent.publicKeyHex}</code></dd>
          <dt>Hash160 identifier</dt><dd><code class="atlas-break">{parent.identifierHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
