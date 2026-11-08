import { v2Ecdh, xOf as v2XOf, deriveKeys as v2DeriveKeys, senderFor as v2SenderFor, encPacket as v2EncPacket, REKEY_INTERVAL } from "@bip-atlas/models";
import type { V2VectorFixture, DerivedV2Fixture, V2FramingFixture, DerivedV2FramingFixture, V2RekeyFixture, DerivedV2RekeyFixture } from "@bip-atlas/figures";
import { HX, SNAPSHOT_PHASE3, checkSourceQuote, hx, pinnedText } from "./sources";

let v2RowsCache: Record<string, string>[] | null = null;
const v2Rows = () => {
  if (v2RowsCache) return v2RowsCache;
  const [head, ...lines] = pinnedText("bip-0324/packet_encoding_test_vectors.csv", SNAPSHOT_PHASE3).trim().split(/\r?\n/);
  const keys = head.split(",");
  return (v2RowsCache = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [keys[i], v]))));
};
/** Run a packet vector through the model; throw on any intermediate or output that differs. */
function v2Run(f: { id: string; source: { line?: number } }) {
  const v = v2Rows()[f.source.line! - 2];
  const initiating = v.in_initiating === "1";
  const priv = hx(v.in_priv_ours);
  const bad = (what: string) => { throw new Error(`${f.id}: ${what} differs from the vector`); };
  if (v2XOf(priv) !== v.mid_x_ours) bad("x(ours)");
  const { xShared, secret } = v2Ecdh(priv, hx(v.in_ellswift_theirs), hx(v.in_ellswift_ours), v.mid_x_theirs, initiating);
  if (xShared !== v.mid_x_shared) bad("shared x");
  if (HX(secret) !== v.mid_shared_secret) bad("shared secret");
  const k = v2DeriveKeys(secret);
  if (HX(k.initiatorL) !== v.mid_initiator_l || HX(k.initiatorP) !== v.mid_initiator_p || HX(k.responderL) !== v.mid_responder_l || HX(k.responderP) !== v.mid_responder_p) bad("key schedule");
  const send = initiating ? k.initiatorTerminator : k.responderTerminator, recv = initiating ? k.responderTerminator : k.initiatorTerminator;
  if (HX(send) !== v.mid_send_garbage_terminator || HX(recv) !== v.mid_recv_garbage_terminator) bad("garbage terminators");
  if (HX(k.sessionId) !== v.out_session_id) bad("session ID");
  return { v, initiating, xShared, secret, k, send, recv };
}

export function deriveV2(f: V2VectorFixture): DerivedV2Fixture {
  checkSourceQuote(f);
  const { v, initiating, xShared, secret, k, send, recv } = v2Run(f);
  if (Number(v.in_idx) !== f.index) throw new Error(`${f.id}: index differs from the cited row`);
  const s = v2SenderFor(k, initiating);
  for (let i = 0; i < f.index; i++) v2EncPacket(s, new Uint8Array(0));
  const unit = hx(v.in_contents), n = Number(v.in_multiply);
  const contents = new Uint8Array(unit.length * n);
  for (let i = 0; i < n; i++) contents.set(unit, i * unit.length);
  const p = v2EncPacket(s, contents, hx(v.in_aad), v.in_ignore === "1");
  const hex = HX(p.packet);
  if (v.out_ciphertext && hex !== v.out_ciphertext) throw new Error(`${f.id}: packet differs from the vector`);
  if (v.out_ciphertext_endswith && !hex.endsWith(v.out_ciphertext_endswith)) throw new Error(`${f.id}: packet ending differs from the vector`);
  return {
    ...f,
    derived: {
      initiating, ellOurs: v.in_ellswift_ours, ellTheirs: v.in_ellswift_theirs, xOurs: v.mid_x_ours, xTheirs: v.mid_x_theirs, xShared,
      sharedSecret: HX(secret), sessionId: HX(k.sessionId),
      keys: { initiatorL: HX(k.initiatorL), initiatorP: HX(k.initiatorP), responderL: HX(k.responderL), responderP: HX(k.responderP) },
      sendTerminator: HX(send), recvTerminator: HX(recv),
      packet: {
        index: p.index, nonce: p.nonce, rekeysSoFar: p.rekeysSoFar, lengthPlain: p.lengthPlain, lengthEnc: p.lengthEnc, ignore: p.header === 0x80,
        contentsLen: contents.length, contentsHead: HX(contents.slice(0, 24)), aadLen: v.in_aad.length / 2,
        ciphertextHead: HX(p.aeadCiphertext.slice(0, 24)), ciphertextTail: HX(p.aeadCiphertext.slice(-24, -16)), tag: p.tag, totalLen: p.packet.length,
        checkedBytes: v.out_ciphertext ? p.packet.length : (v.out_ciphertext_endswith ?? "").length / 2,
      },
    },
  };
}

export function deriveV2Framing(f: V2FramingFixture): DerivedV2FramingFixture {
  checkSourceQuote(f);
  // Read the short ID from BIP 324's table: rows "!+N" then four cells.
  const lines = pinnedText("bip-0324.mediawiki", SNAPSHOT_PHASE3).split("\n");
  let base = -1, shortId = -1;
  for (const l of lines) {
    const m = l.match(/^!\+(\d+)$/);
    if (m) { base = Number(m[1]); continue; }
    if (base >= 0 && l.startsWith("|") && !l.startsWith("|-") && !l.startsWith("|}")) {
      const cells = l.slice(1).split("||");
      const at = cells.findIndex((c) => c.includes(`<code>${f.messageType}</code>`));
      if (at >= 0) shortId = base + at;
    }
  }
  if (shortId < 1) throw new Error(`${f.id}: ${f.messageType} not found in BIP 324's ID table`);
  return {
    ...f,
    derived: {
      messageType: f.messageType, shortId,
      v1: [{ field: "network magic", bytes: 4 }, { field: "command, 12 ASCII bytes", bytes: 12 }, { field: "payload length", bytes: 4 }, { field: "checksum", bytes: 4 }],
      v2: [{ field: "encrypted length", bytes: 3 }, { field: "header (ignore bit)", bytes: 1 }, { field: `message type ID ${shortId}`, bytes: 1 }, { field: "Poly1305 tag", bytes: 16 }],
    },
  };
}

export function deriveV2Rekey(f: V2RekeyFixture): DerivedV2RekeyFixture {
  checkSourceQuote(f);
  const { initiating, k } = v2Run(f);
  const s = v2SenderFor(k, initiating);
  const rows: DerivedV2RekeyFixture["derived"]["rows"] = [];
  const last = Math.max(...f.show);
  for (let i = 0; i <= last; i++) {
    if (f.show.includes(i)) rows.push({ packet: i, nonce: HX(s.P.nonce()), epoch: Math.floor(i / REKEY_INTERVAL), key: HX(s.P.key) });
    v2EncPacket(s, new Uint8Array(0));
  }
  return { ...f, derived: { initiating, rows } };
}
