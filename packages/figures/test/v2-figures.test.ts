import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { MAX_GARBAGE, REKEY_INTERVAL, V1_PREFIX, deriveKeys, encPacket, senderFor, v2Ecdh } from "@bip-atlas/models/v2transport";
import { V2Detect } from "../src/v2/V2Detect";
import { V2Eavesdropper } from "../src/v2/V2Eavesdropper";
import { V2Ellswift } from "../src/v2/V2Ellswift";
import { V2Framing } from "../src/v2/V2Framing";
import { V2Handshake } from "../src/v2/V2Handshake";
import { V2KeyStory } from "../src/v2/V2KeyStory";
import { V2PacketBytes } from "../src/v2/V2PacketBytes";
import { V2Rekey } from "../src/v2/V2Rekey";
import { V2Terminator } from "../src/v2/V2Terminator";
import type { DerivedV2Fixture, DerivedV2FramingFixture, DerivedV2RekeyFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/v2-transport.json", root), "utf8")).fixtures;
const [head, ...lines] = readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0324/packet_encoding_test_vectors.csv", root), "utf8").trim().split(/\r?\n/);
const rows = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [head.split(",")[i], v])));

function run(f: { id: string; source: { line: number } }) {
  const v = rows[f.source.line - 2];
  const initiating = v.in_initiating === "1";
  const { xShared, secret } = v2Ecdh(hexToBytes(v.in_priv_ours), hexToBytes(v.in_ellswift_theirs), hexToBytes(v.in_ellswift_ours), v.mid_x_theirs, initiating);
  expect(xShared).toBe(v.mid_x_shared);
  expect(bytesToHex(secret)).toBe(v.mid_shared_secret);
  const k = deriveKeys(secret);
  expect(bytesToHex(k.sessionId)).toBe(v.out_session_id);
  return { v, initiating, xShared, secret, k };
}
/** The values deriveV2 computes (the build also checks every one against the vector). */
function vec(id: string): DerivedV2Fixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const { v, initiating, xShared, secret, k } = run(f);
  const s = senderFor(k, initiating);
  for (let i = 0; i < f.index; i++) encPacket(s, new Uint8Array(0));
  const unit = hexToBytes(v.in_contents), n = Number(v.in_multiply);
  const contents = new Uint8Array(unit.length * n);
  for (let i = 0; i < n; i++) contents.set(unit, i * unit.length);
  const p = encPacket(s, contents, hexToBytes(v.in_aad), v.in_ignore === "1");
  const hex = bytesToHex(p.packet);
  if (v.out_ciphertext) expect(hex).toBe(v.out_ciphertext);
  else expect(hex.endsWith(v.out_ciphertext_endswith)).toBe(true);
  const H = bytesToHex;
  return {
    ...f,
    derived: {
      initiating, ellOurs: v.in_ellswift_ours, ellTheirs: v.in_ellswift_theirs, xOurs: v.mid_x_ours, xTheirs: v.mid_x_theirs, xShared,
      sharedSecret: H(secret), sessionId: H(k.sessionId),
      keys: { initiatorL: H(k.initiatorL), initiatorP: H(k.initiatorP), responderL: H(k.responderL), responderP: H(k.responderP) },
      sendTerminator: H(initiating ? k.initiatorTerminator : k.responderTerminator), recvTerminator: H(initiating ? k.responderTerminator : k.initiatorTerminator),
      packet: {
        index: p.index, nonce: p.nonce, rekeysSoFar: p.rekeysSoFar, lengthPlain: p.lengthPlain, lengthEnc: p.lengthEnc, ignore: p.header === 0x80,
        contentsLen: contents.length, contentsHead: H(contents.slice(0, 24)), aadLen: v.in_aad.length / 2,
        ciphertextHead: H(p.aeadCiphertext.slice(0, 24)), ciphertextTail: H(p.aeadCiphertext.slice(-24, -16)), tag: p.tag, totalLen: p.packet.length,
        checkedBytes: v.out_ciphertext ? p.packet.length : v.out_ciphertext_endswith.length / 2,
      },
    },
  };
}
const framing = (): DerivedV2FramingFixture => ({
  ...fixtures.find((x: { id: string }) => x.id === "v2-framing"),
  derived: {
    messageType: "ping", shortId: 18,
    v1: [{ field: "network magic", bytes: 4 }, { field: "command, 12 ASCII bytes", bytes: 12 }, { field: "payload length", bytes: 4 }, { field: "checksum", bytes: 4 }],
    v2: [{ field: "encrypted length", bytes: 3 }, { field: "header (ignore bit)", bytes: 1 }, { field: "message type ID 18", bytes: 1 }, { field: "Poly1305 tag", bytes: 16 }],
  },
});
function rekey(): DerivedV2RekeyFixture {
  const f = fixtures.find((x: { id: string }) => x.id === "v2-rekey");
  const { initiating, k } = run(f);
  const s = senderFor(k, initiating);
  const out: DerivedV2RekeyFixture["derived"]["rows"] = [];
  for (let i = 0; i <= Math.max(...f.show); i++) {
    if (f.show.includes(i)) out.push({ packet: i, nonce: bytesToHex(s.P.nonce()), epoch: Math.floor(i / REKEY_INTERVAL), key: bytesToHex(s.P.key) });
    encPacket(s, new Uint8Array(0));
  }
  return { ...f, derived: { initiating, rows: out } };
}
const html = (n: VNode<any>) => render(n);
const p0 = vec("v2-packet-0"), p1 = vec("v2-packet-1");

describe("v2 figures", () => {
  it("A17.1 draws v1's 24 cleartext bytes and v2's 21", () => {
    const s = html(h(V2Framing, { fixture: framing() }));
    expect(s).toContain("V1 · 24 B IN THE CLEAR");
    expect(s).toContain("V2 · PING · 21 B, NONE IN THE CLEAR");
  });
  it("A17.2 is schematic", () => {
    const s = html(h(V2Eavesdropper, {}));
    expect(s).toContain("A ≠ B");
    expect(s).not.toMatch(/[0-9a-f]{16}/);
  });
  it("A17.3 draws all 64 key bytes, says the decoding is the vector's, and discloses exact values", () => {
    const s = html(h(V2Ellswift, { fixture: p1 }));
    for (const b of p1.derived.ellOurs.match(/.{2}/g)!) expect(s).toContain(`>${b}<`);
    expect(s).toContain("NOT DECODED HERE");
    expect(s).toContain(`GARBAGE · 0 TO ${MAX_GARBAGE.toLocaleString("en-US")} B`);
    expect(s.slice(s.indexOf("<details"))).toContain(p1.derived.xOurs);
  });
  it("A17.4 compares the v1 prefix with the start of the initiator's key", () => {
    const s = html(h(V2Detect, { fixture: p1 }));
    expect(V1_PREFIX).toBe("f9beb4d976657273696f6e0000000000");
    expect(s).toContain(">v<");
    expect(s.slice(s.indexOf("<details"))).toContain(p1.derived.ellOurs.slice(0, 32));
  });
  it("A17.5 walks packet 0's key schedule with every value disclosed", () => {
    const s = html(h(V2KeyStory, { fixture: p0 }));
    const d = p0.derived;
    expect(d.packet.aadLen).toBe(4095);
    expect(s).toContain("GARBAGE 4,095 B");
    const details = s.slice(s.indexOf("<details"));
    for (const v of [d.xShared, d.sharedSecret, d.sessionId, ...Object.values(d.keys), d.sendTerminator, d.packet.tag]) expect(details).toContain(v);
  });
  it("A17.7 reads at most 4,095 + 16 bytes", () => {
    const s = html(h(V2Terminator, { fixture: p0 }));
    expect(s).toContain("AT MOST 4,095 + 16 = 4,111 B READ");
  });
  it("A17.8 draws all 21 bytes of packet 1", () => {
    const s = html(h(V2PacketBytes, { fixture: p1 }));
    expect(p1.derived.packet.totalLen).toBe(21);
    for (const b of (p1.derived.packet.lengthEnc + p1.derived.packet.ciphertextHead).match(/.{2}/g)!) expect(s).toContain(`>${b}<`);
  });
  it("A17.9 shows the nonce reset and three epochs' keys", () => {
    const r = rekey();
    const s = html(h(V2Rekey, { fixture: r }));
    expect(s).toContain("PACKET 223 · NONCE");
    expect(s).toContain("PACKET 224 · NONCE");
    for (const e of [0, 1, 2]) expect(s).toContain(`EPOCH ${e}`);
    expect(new Set(r.derived.rows.map((x) => x.key)).size).toBe(3);
  });
});

describe("v2 hero", () => {
  const fx = ["v2-packet-0", "v2-packet-1", "v2-packet-223", "v2-packet-448", "v2-packet-999"].map(vec);
  it("renders the no-JS state at the last step", () => {
    const s = html(h(V2Handshake, { fixtures: fx, figureId: "fig-a17-6" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("Step 5 of 5");
    expect(s).toContain(`PACKET 0 · ${fx[0].derived.packet.totalLen} B`);
  });
  it("never puts the secret, keys or session ID in the listener's panel", () => {
    const s = html(h(V2Handshake, { fixtures: fx, figureId: "fig-a17-6" }));
    const listener = s.slice(s.indexOf("LISTENER SEES"), s.indexOf("NOT ON THE WIRE"));
    for (const v of [fx[0].derived.sharedSecret, fx[0].derived.sessionId, ...Object.values(fx[0].derived.keys)]) expect(listener).not.toContain(v.slice(0, 8));
  });
});

describe("v2 captions", () => {
  const text = readFileSync(new URL("content/chapters/v2-transport.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("21 bytes for a message with a short ID");
    expect(text).toContain("sent the maximum 4,095 bytes of garbage");
    expect(text).toContain("All 21 bytes of a published packet with 1 byte of contents");
    expect([p0.derived.packet.aadLen, p1.derived.packet.totalLen, p1.derived.packet.contentsLen]).toEqual([MAX_GARBAGE, 21, 1]);
  });
});
