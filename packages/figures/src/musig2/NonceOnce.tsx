import { Arrow, Drawing, Lamp, Machine, Value, idsFor } from "../kit";
import type { DerivedMusig2SessionFixture } from "../types";

/**
 * musig2-nonce-once.v1 — static, schematic. A secret nonce as a one-use
 * ticket: Sign reads it, overwrites it with zeros and returns a partial
 * signature; a second Sign with the zeroed ticket is refused. No values are
 * drawn: secret nonces never leave their signer, and the published vectors
 * do not contain them.
 */
export function NonceOnce({ fixture }: { fixture: DerivedMusig2SessionFixture }) {
  const signers = fixture.derived.signers.length;
  const ids = idsFor("a14-once");
  const desc =
    `Schematic, no values. Row 1: a signer's secret nonce, two secret scalars, goes into Sign, which returns a partial signature; as BIP 327 allows, this site's model then overwrites the secret nonce with zeros. ` +
    `Row 2: Sign is called again with the zeroed secret nonce and refuses it. Two partial signatures from one secret nonce would let whoever sees both extract the signer's secret key. ` +
    `This holds for each of the ${signers} signers of the session separately.`;
  const row = (y: number, first: boolean) => (
    <g>
      <rect class={`k-outline ${first ? "k-fill--secret" : "k-fill--plain"} k-dashed`} x="14" y={y} width="88" height="34" />
      <Value at={[20, y + 14]} text={first ? "SECRET NONCE" : "ZEROED"} size={8.5} cls="k-value--label" />
      <Value at={[20, y + 27]} text={first ? "k₁, k₂ (secret)" : "k₁, k₂ zeroed"} size={8.5} />
      <Arrow d={`M104 ${y + 17} H126`} ids={ids} />
      <Machine at={[150, y + 28]} w={50} d={24} h={22} label="Sign" />
      <Arrow d={`M200 ${y + 17} H226`} ids={ids} />
      {first ? (
        <>
          <rect class="k-outline k-fill--sig" x="232" y={y + 6} width="90" height="22" />
          <Value at={[238, y + 21]} text="partial sig s" size={8.5} />
        </>
      ) : (
        <Lamp at={[262, y + 17]} state="off" label="REFUSED" />
      )}
    </g>
  );
  return (
    <Drawing id="a14-once" width={344} height={196} title="A nonce is used once" desc={desc}>
      <Value at={[14, 14]} text="FIRST SIGN" size={8.5} cls="k-value--label" />
      {row(22, true)}
      <Value at={[14, 104]} text="THIS MODEL ZEROED IT (THE BIP ALLOWS THIS)" size={8.5} cls="k-value--label" />
      {row(112, false)}
      <Value at={[14, 186]} text="SCHEMATIC · NO VALUES" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
