import { useEffect, useState } from "preact/hooks";
import type { DerivedV2Fixture } from "../types";

interface Props {
  fixtures: DerivedV2Fixture[];
  figureId: string;
}

const short = (hex: string) => (hex.length > 24 ? `${hex.slice(0, 12)}…${hex.slice(-8)}` : hex);
const STAGES = [
  { id: "keys", title: "Public keys out", note: "Each side sends a fresh ephemeral public key as 64 ElligatorSwift bytes, which look uniformly random, optionally followed by up to 4095 bytes of garbage." },
  { id: "secret", title: "Shared secret", note: "Each side decodes the other’s 64 bytes to an X coordinate and computes X-only ECDH, then hashes it together with both 64-byte encodings exactly as sent." },
  { id: "schedule", title: "Keys and session ID", note: "HKDF-SHA256 expands the secret, salted with the network magic, into four cipher keys (length and payload, each direction), two garbage terminators and a session ID." },
  { id: "terminator", title: "Garbage terminator, version packet", note: "Each side sends its 16-byte garbage terminator, then an encrypted version packet. The first packet authenticates the garbage it sent as associated data." },
  { id: "packet", title: "Encrypted packets", note: "From here on everything is encrypted packets: a 3-byte encrypted length, then ChaCha20-Poly1305 over a header byte and the contents, ending in a 16-byte tag." },
] as const;

/**
 * v2-handshake.v1 — the v2 transport chapter's hero figure.
 *
 * BIP 324 packet-encoding vectors. At build time the tested model recomputes
 * the X-only ECDH, the shared secret, every HKDF output and the encrypted
 * packet, and the build fails unless each equals the vector. ElligatorSwift
 * decoding is taken from the vector (no audited library implements it).
 */
export function V2Handshake({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [at, setAt] = useState(0);
  const [compare, setCompare] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const step = hydrated ? at : STAGES.length - 1;
  const reached = (sid: string) => STAGES.findIndex((s) => s.id === sid) <= step;
  const showCompare = hydrated ? compare : true;
  const me = d.initiating ? "initiator" : "responder";
  const them = d.initiating ? "responder" : "initiator";
  const p = d.packet;

  return (
    <div class="atlas-lab atlas-v2-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published packet vector</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-vec`} checked={x.id === id} onChange={() => setId(x.id)} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-v2-compare">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare((e.target as HTMLInputElement).checked)} />
            Compare v1 and v2 framing
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first vector with every stage shown. With JavaScript you can step through the handshake and choose among {fixtures.length} published vectors.</p>
      )}

      <ol class="atlas-mu-stages" aria-label="Handshake stages">
        {STAGES.map((s, i) => (
          <li data-state={i === step ? "current" : i < step ? "done" : "ahead"}>
            {hydrated ? (
              <button type="button" onClick={() => setAt(i)} aria-current={i === step ? "step" : undefined}><span class="atlas-mu-stages__n">{i + 1}</span> {s.title}</button>
            ) : (
              <span><span class="atlas-mu-stages__n">{i + 1}</span> {s.title}</span>
            )}
          </li>
        ))}
      </ol>
      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the handshake">
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.max(0, step - 1))} disabled={step === 0}>← Previous</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.min(STAGES.length - 1, step + 1))} disabled={step === STAGES.length - 1}>Next →</button>
        </div>
      ) : null}
      <p class="atlas-mu-note" aria-live="polite">{STAGES[step].note}</p>

      <div class="atlas-v2-lanes">
        <section class="atlas-panel" aria-label={`This side: the ${me}`}>
          <h3 class="atlas-panel__title">This side: the {me}</h3>
          <dl class="atlas-v2-dl">
            <div><dt>sends 64 bytes (u ‖ t)</dt><dd><code>{short(d.ellOurs.slice(0, 64))}</code> ‖ <code>{short(d.ellOurs.slice(64))}</code></dd></div>
            <div><dt>which decode to x</dt><dd><code>{short(d.xOurs)}</code><small> = x(priv · G)</small></dd></div>
            {reached("terminator") ? <div><dt>its garbage terminator</dt><dd><code>{d.sendTerminator}</code></dd></div> : null}
          </dl>
        </section>
        <section class="atlas-panel" aria-label={`The peer: the ${them}`}>
          <h3 class="atlas-panel__title">The peer: the {them}</h3>
          <dl class="atlas-v2-dl">
            <div><dt>sends 64 bytes (u ‖ t)</dt><dd><code>{short(d.ellTheirs.slice(0, 64))}</code> ‖ <code>{short(d.ellTheirs.slice(64))}</code></dd></div>
            <div><dt>which decode to x</dt><dd><code>{short(d.xTheirs)}</code><small> (decoding from the vector)</small></dd></div>
            {reached("terminator") ? <div><dt>its garbage terminator</dt><dd><code>{d.recvTerminator}</code></dd></div> : null}
          </dl>
        </section>
      </div>

      <section class="atlas-panel" aria-label="Derived values">
        <h3 class="atlas-panel__title">Derived on both sides</h3>
        {!reached("secret") ? <p class="atlas-panel__empty">Nothing yet: the keys are still in flight.</p> : (
          <dl class="atlas-v2-dl">
            <div><dt>X-only ECDH</dt><dd><code>{short(d.xShared)}</code></dd></div>
            <div><dt>shared secret</dt><dd><code>{short(d.sharedSecret)}</code><small> tagged hash of initiator’s 64 bytes ‖ responder’s 64 bytes ‖ x</small></dd></div>
            {reached("schedule") ? (
              <>
                <div><dt>initiator_L · initiator_P</dt><dd><code>{short(d.keys.initiatorL)}</code> · <code>{short(d.keys.initiatorP)}</code></dd></div>
                <div><dt>responder_L · responder_P</dt><dd><code>{short(d.keys.responderL)}</code> · <code>{short(d.keys.responderP)}</code></dd></div>
                <div><dt>session ID</dt><dd><code class="atlas-break">{d.sessionId}</code><small> the same on both ends unless someone is in the middle</small></dd></div>
              </>
            ) : null}
          </dl>
        )}
      </section>

      <section class="atlas-panel" aria-label="The vector's packet">
        <h3 class="atlas-panel__title">Packet {p.index} from the {me}{p.ignore ? " (a decoy: ignore bit set)" : ""}</h3>
        {!reached("packet") ? <p class="atlas-panel__empty">Reached at the last stage.</p> : (
          <>
            <ol class="atlas-v2-ribbon" aria-label={`${p.totalLen}-byte packet`}>
              <li data-part="len"><span>length, 3 bytes</span><code>{p.lengthEnc}</code><small>encrypts {p.lengthPlain} = {p.contentsLen} (little-endian)</small></li>
              <li data-part="ct"><span>header + contents, {1 + p.contentsLen} bytes, encrypted</span><code>{p.ciphertextHead}{p.contentsLen + 1 > 24 ? "…" : ""}</code></li>
              <li data-part="tag"><span>Poly1305 tag, 16 bytes</span><code>{p.tag}</code></li>
            </ol>
            <dl class="atlas-v2-dl">
              <div><dt>nonce (packet in epoch ‖ epoch)</dt><dd><code>{p.nonce}</code><small> {p.rekeysSoFar} rekey{p.rekeysSoFar === 1 ? "" : "s"} so far</small></dd></div>
              <div><dt>associated data</dt><dd>{p.aadLen ? `${p.aadLen} bytes: the garbage this side sent, authenticated by its first packet` : "none"}</dd></div>
              <div><dt>total</dt><dd>{p.totalLen.toLocaleString("en-US")} bytes = 3 + 1 + {p.contentsLen.toLocaleString("en-US")} + 16</dd></div>
            </dl>
            {showCompare ? (
              <p class="atlas-v2-cmp">
                Framing the same {p.contentsLen.toLocaleString("en-US")}-byte contents as a v1 message with a 1-byte type ID would carry a {24}-byte cleartext header (magic, command, length, checksum) instead of the type byte: {(24 + Math.max(0, p.contentsLen - 1)).toLocaleString("en-US")} bytes against {p.totalLen.toLocaleString("en-US")}, and every v1 byte readable on the wire.
              </p>
            ) : null}
          </>
        )}
      </section>
      <p class="atlas-lab__source">
        Source: BIP 324 packet_encoding_test_vectors.csv, row for packet {p.index} (line {f.source.line}). Recomputed at build time by the tested model; ECDH, secret, keys, session ID, terminators and packet equal the vector’s. ElligatorSwift decodings are the vector’s own.
      </p>
    </div>
  );
}
