import { Arrow, Bracket, Cells, Drawing, KeyGlyph, Lamp, Machine, Value, idsFor } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { ownTrace, short } from "./stages";

const PK_BYTES = 32;
const SIG_BYTES = 64;

/**
 * schnorr-signature-layout.v1 — static. The verifier as a machine with three
 * input slots of fixed shape: a 32-byte x-only key, a message of any length
 * and a 64-byte signature (r ‖ s), and a lamp for its yes-or-no answer. One
 * published vector; exact values in the disclosure.
 */
export function SignatureLayout({ fixture }: { fixture: DerivedSchnorrFixture }) {
  const pk = fixture.publicKeyHex, m = fixture.messageHex, sig = fixture.signatureHex;
  if (pk.length / 2 !== PK_BYTES || sig.length / 2 !== SIG_BYTES) throw new Error(`${fixture.id}: not a 32-byte key and 64-byte signature`);
  const r = sig.slice(0, 64), s = sig.slice(64);
  const mBytes = m.length / 2;
  const valid = ownTrace(fixture).valid;
  if (valid !== fixture.expected) throw new Error(`${fixture.id}: verdict differs from the published result`);
  const ids = idsFor("a06-inputs");
  const cell = 5;
  const msgShown = Math.min(mBytes, 32);
  const desc =
    `Vector ${fixture.vectorIndex} from the BIP 340 CSV goes into the verifier. Public key pk, 32 bytes: ${pk}. ` +
    `Message m, ${mBytes} bytes here, though any length is allowed: ${m || "(empty)"}. Signature, 64 bytes: r = ${r}, then s = ${s}. ` +
    `No secret key goes in. The verifier answers ${valid ? "true" : "false"}, as the CSV says.`;
  return (
    <>
      <Drawing id="a06-inputs" width={344} height={282} title="Three inputs, one answer" desc={desc}>
        <KeyGlyph at={[14, 14]} role="public" scale={0.8} />
        <Value at={[44, 23]} text={`PK · PUBLIC KEY · ${PK_BYTES} BYTES`} size={9} cls="k-value--label" />
        <Cells x={14} y={32} values={Array.from({ length: PK_BYTES }, () => "")} size={cell} text={false} roleOf={() => "public"} />
        <Value at={[14 + PK_BYTES * cell + 8, 40]} text={short(pk)} size={9.5} />

        <Value at={[14, 66]} text={`M · MESSAGE · ANY LENGTH, HERE ${mBytes} BYTES`} size={9} cls="k-value--label" />
        <Cells x={14} y={74} values={Array.from({ length: msgShown }, () => "")} size={cell} text={false} roleOf={() => "plain"} />
        <rect class="k-outline k-fill--plain k-dashed" x={14 + msgShown * cell} y={74} width={34} height={cell} />
        <Value at={[14 + msgShown * cell + 42, 82]} text={mBytes ? short(m) : "(empty)"} size={9.5} />

        <Value at={[14, 108]} text={`SIG · SIGNATURE · ${SIG_BYTES} BYTES = r ‖ s`} size={9} cls="k-value--label" />
        <Cells x={14} y={116} values={Array.from({ length: SIG_BYTES }, () => "")} size={cell} text={false} roleOf={() => "sig"} cutBefore={(i) => i === 32} />
        <Bracket x1={14} x2={14 + 32 * cell} y={124} text="bytes 0–31" />
        <Bracket x1={14 + 32 * cell} x2={14 + 64 * cell} y={124} text="bytes 32–63" />
        <Value at={[14 + 16 * cell, 160]} text={`r = ${short(r)}`} size={9} anchor="middle" />
        <Value at={[14 + 48 * cell, 160]} text={`s = ${short(s)}`} size={9} anchor="middle" />
        <Value at={[14 + 16 * cell, 172]} text="x of a point R" size={8.5} anchor="middle" cls="k-value--muted" />
        <Value at={[14 + 48 * cell, 172]} text="a number below n" size={8.5} anchor="middle" cls="k-value--muted" />

        <Arrow d="M174 140 V182 H150 V194" ids={ids} />
        <Machine at={[118, 198]} w={72} d={30} h={26} label="Verify" sub="BIP 340" />
        <Arrow d="M186 228 H266" ids={ids} />
        <Lamp at={[284, 228]} state={valid ? "on" : "off"} label={valid ? "TRUE" : "FALSE"} />
        <Value at={[14, 262]} text="NO SECRET KEY GOES IN" size={8.5} cls="k-value--muted" />
        <Value at={[14, 274]} text={`VECTOR ${fixture.vectorIndex} · BIP 340 CSV LINE ${fixture.source.line}`} size={8.5} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>pk (32 bytes)</dt><dd><code class="atlas-break">{pk}</code></dd>
          <dt>m ({mBytes} bytes)</dt><dd><code class="atlas-break">{m || "(empty)"}</code></dd>
          <dt>r (signature bytes 0–31)</dt><dd><code class="atlas-break">{r}</code></dd>
          <dt>s (signature bytes 32–63)</dt><dd><code class="atlas-break">{s}</code></dd>
        </dl>
      </details>
    </>
  );
}
