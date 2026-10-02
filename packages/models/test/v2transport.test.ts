import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "../src/hex";
import {
  decPacket, deriveKeys, encPacket, FSChaCha20, REKEY_INTERVAL, senderFor, v1Header, V1_PREFIX, V2_OVERHEAD, v2Ecdh, xOf,
} from "../src/v2transport";

const root = new URL("../../../", import.meta.url);
const raw = "sources/research-2026-10-01-phase3/raw/";
const csv = (name: string) => {
  const [head, ...lines] = readFileSync(new URL(raw + "bip-0324/" + name, root), "utf8").trim().split(/\r?\n/);
  const keys = head.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [keys[i], v])));
};
const packets = csv("packet_encoding_test_vectors.csv");
const b324 = readFileSync(new URL(raw + "bip-0324.mediawiki", root), "utf8").split("\n");
const h = hexToBytes;

/** Run one packet vector through the model; returns the ciphertext. */
export function runVector(v: Record<string, string>) {
  const initiating = v.in_initiating === "1";
  const priv = h(v.in_priv_ours);
  expect(xOf(priv)).toBe(v.mid_x_ours);
  const { xShared, secret } = v2Ecdh(priv, h(v.in_ellswift_theirs), h(v.in_ellswift_ours), v.mid_x_theirs, initiating);
  expect(xShared).toBe(v.mid_x_shared);
  expect(bytesToHex(secret)).toBe(v.mid_shared_secret);
  const k = deriveKeys(secret);
  expect([k.initiatorL, k.initiatorP, k.responderL, k.responderP].map(bytesToHex)).toEqual([v.mid_initiator_l, v.mid_initiator_p, v.mid_responder_l, v.mid_responder_p]);
  expect(bytesToHex(initiating ? k.initiatorTerminator : k.responderTerminator)).toBe(v.mid_send_garbage_terminator);
  expect(bytesToHex(initiating ? k.responderTerminator : k.initiatorTerminator)).toBe(v.mid_recv_garbage_terminator);
  expect(bytesToHex(k.sessionId)).toBe(v.out_session_id);
  const s = senderFor(k, initiating);
  for (let i = 0; i < Number(v.in_idx); i++) encPacket(s, new Uint8Array(0));
  const unit = h(v.in_contents), n = Number(v.in_multiply);
  const contents = new Uint8Array(unit.length * n);
  for (let i = 0; i < n; i++) contents.set(unit, i * unit.length);
  const p = encPacket(s, contents, h(v.in_aad), v.in_ignore === "1");
  return { p, k, initiating, contents };
}

describe("BIP 324 packet encoding vectors", () => {
  it("has seven vectors", () => expect(packets.length).toBe(7));
  for (const v of packets) {
    it(`packet ${v.in_idx} (${v.in_initiating === "1" ? "initiator" : "responder"}, ${v.in_contents.length / 2 * Number(v.in_multiply)}-byte contents)`, () => {
      const { p } = runVector(v);
      const hex = bytesToHex(p.packet);
      if (v.out_ciphertext) expect(hex).toBe(v.out_ciphertext);
      if (v.out_ciphertext_endswith) expect(hex.endsWith(v.out_ciphertext_endswith)).toBe(true);
      expect(p.packet.length).toBe(V2_OVERHEAD + v.in_contents.length / 2 * Number(v.in_multiply));
    }, 120_000);
  }

  it("the receiver decrypts what the sender encrypted, and rejects a flipped bit", () => {
    for (const v of packets.filter((x) => x.in_contents.length / 2 * Number(x.in_multiply) < 1e6)) {
      const { p, k, initiating, contents } = runVector(v);
      const fresh = () => { const r = senderFor(k, initiating); for (let i = 0; i < Number(v.in_idx); i++) encPacket(r, new Uint8Array(0)); return r; };
      const ok = decPacket(fresh(), p.packet, h(v.in_aad))!;
      expect(bytesToHex(ok.contents)).toBe(bytesToHex(contents));
      expect(ok.header).toBe(v.in_ignore === "1" ? 0x80 : 0);
      const bad = p.packet.slice(); bad[bad.length - 1] ^= 1;
      expect(decPacket(fresh(), bad, h(v.in_aad))).toBeNull();
      if (v.in_aad) expect(decPacket(fresh(), p.packet, new Uint8Array(0))).toBeNull();
    }
  });
});

describe("rekeying and framing", () => {
  it("rekeys every 224 packets", () => {
    expect(REKEY_INTERVAL).toBe(224);
    expect(b324[413]).toContain("re-keying every 224 packets");
    const s = senderFor(deriveKeys(new Uint8Array(32).fill(7)), true);
    for (let i = 0; i < 224; i++) encPacket(s, new Uint8Array(0));
    expect([s.P.rekeys, s.L.rekeys]).toEqual([1, 1]);
    expect(bytesToHex(s.P.nonce())).toBe("00000000" + "0100000000000000");
  });

  it("the length stream continues across packets instead of restarting", () => {
    const L1 = new FSChaCha20(new Uint8Array(32)), L2 = new FSChaCha20(new Uint8Array(32));
    const a = L1.crypt(new Uint8Array(3)); const b = L1.crypt(new Uint8Array(3));
    expect(bytesToHex(L2.crypt(new Uint8Array(3)))).toBe(bytesToHex(a));
    expect(bytesToHex(b)).not.toBe(bytesToHex(a));
  });

  it("the v1 prefix is the mainnet magic followed by 'version' padded to 12 bytes", () => {
    expect(V1_PREFIX.length / 2).toBe(16);
    expect(b324[346]).toContain("V1_PREFIX = NETWORK_MAGIC + b'version\\x00\\x00\\x00\\x00\\x00'");
  });

  it("v1 header is 24 bytes; v2 overhead is 20", () => {
    expect(v1Header("ping", new Uint8Array(8)).length).toBe(24);
    expect(V2_OVERHEAD).toBe(20);
  });
});

describe("v2-transport chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/v2-transport.json", root), "utf8");
  const has = (s: string) => expect(text).toContain(s);

  it("dates and sizes the BIP states", () => {
    expect(b324[10]).toContain("Assigned: 2019-03-08");
    expect(b324[8]).toContain("Status: Deployed");
    has("BIP 324 was assigned in 2019 and is recorded as Deployed");
    expect(b324[111]).toContain("64-byte ElligatorSwift");
    has("ElligatorSwift encoding: 64 bytes");
    expect(b324[111]).toContain("about 50% chance of being a valid X coordinate");
    expect(b324[112]).toContain("May send up to 4095");
    expect(b324[123]).toContain("Receive up to 4111 bytes");
    expect(4095 + 16).toBe(4111);
    has("A receiver reads at most 4111 bytes, 4095 of garbage and the terminator");
    expect(V1_PREFIX.length / 2).toBe(16);
    has("It examines the first 16 bytes");
    expect(b324[156]).toContain("The total size of a packet is 20 bytes plus the length of its contents.");
    has("A packet is 20 bytes plus its contents: a 3-byte length, encrypted, then ChaCha20-Poly1305 over a 1-byte header and the contents, ending in a 16-byte tag. Contents can be up to 2^24 − 1 bytes.");
    expect(b324[159]).toContain("''2<sup>24</sup>-1''");
    has("two 16-byte garbage terminators");
    has("zero byte followed by the familiar v1 command name");
  });

  it("framing and rekeying arithmetic", () => {
    expect(v1Header("ping", new Uint8Array(0)).length).toBe(24);
    expect(V2_OVERHEAD + 1).toBe(21);
    has("v1 adds a 24-byte cleartext header. v2 adds 21 bytes for a message with a short ID.");
    expect(V2_OVERHEAD + 13).toBe(33);
    has("long form uses 33 bytes");
    expect(REKEY_INTERVAL).toBe(224);
    has("Both ciphers change their keys every 224 packets.");
    has("the first 32 bytes of encrypting 32 zero bytes under the old key");
    has("the next 32 bytes of its own stream");
    // The rekey figure: keys change after packets 223 and 447.
    const s = senderFor(deriveKeys(new Uint8Array(32).fill(3)), false);
    const keys: string[] = [];
    for (let i = 0; i <= 448; i++) { keys.push(bytesToHex(s.P.key)); encPacket(s, new Uint8Array(0)); }
    expect(keys[223]).toBe(keys[0]);
    expect(keys[224]).not.toBe(keys[223]);
    expect(keys[447]).toBe(keys[224]);
    expect(keys[448]).not.toBe(keys[447]);
    has("after the 224th packet");
  });

  it("figure facts", () => {
    const fx = JSON.parse(readFileSync(new URL("fixtures/v2-transport.json", root), "utf8")).fixtures;
    expect(fx.filter((f: { kind: string }) => f.kind === "v2-vector").length).toBe(5);
    const chapter = JSON.parse(text);
    const hero = chapter.sections.flatMap((s: any) => s.blocks).find((b: any) => b.recipe === "v2-handshake.v1");
    expect(hero.fixtures).toHaveLength(5);
  });

  it("packets 223 and 448 publish only a 128-byte ciphertext suffix", () => {
    const fx = JSON.parse(readFileSync(new URL("fixtures/v2-transport.json", root), "utf8")).fixtures;
    for (const idx of [223, 448]) {
      const f = fx.find((x: { id: string }) => x.id === `v2-packet-${idx}`);
      expect(f.index).toBe(idx);
      const v = packets[f.source.line - 2];
      expect(v.in_idx).toBe(String(idx));
      expect(v.out_ciphertext).toBe("");
      expect(v.out_ciphertext_endswith.length / 2).toBe(128);
      // A suffix, not the whole packet.
      expect(V2_OVERHEAD + v.in_contents.length / 2 * Number(v.in_multiply)).toBeGreaterThan(128);
    }
    has("For packets 223 and 448, the published vectors supply only the last 128 bytes of ciphertext.");
  });
});

describe("vector parsing", () => {
  it("reads every column, including the last (the CSV has CRLF line endings)", () => {
    expect(packets.filter((v) => v.out_ciphertext_endswith).length).toBe(4);
    expect(packets.filter((v) => v.out_ciphertext).length).toBe(3);
  });
});
