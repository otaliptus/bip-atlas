/**
 * v2 P2P transport teaching model (BIP 324): the X-only ECDH shared secret,
 * HKDF key and session-ID derivation, the rekeying wrappers FSChaCha20 and
 * FSChaCha20Poly1305, and packet encryption and decryption.
 *
 * Curve arithmetic from @noble/curves, SHA-256 and HKDF from @noble/hashes,
 * ChaCha20 and ChaCha20-Poly1305 from @noble/ciphers. ElligatorSwift itself
 * is out of scope: no audited library implements it, so this model takes the
 * X coordinate an encoding decodes to as given (BIP 324 publishes those
 * decodings as test vectors) and never generates encodings.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { chacha20, chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { expand, extract } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./hex";

const Point = secp256k1.Point;
const enc = (s: string) => new TextEncoder().encode(s);
const concat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const le = (n: number, len: number) => { const o = new Uint8Array(len); for (let i = 0; i < len; i++) o[i] = Math.floor(n / 256 ** i) % 256; return o; };

export const MAINNET_MAGIC = "f9beb4d9";
export const V1_PREFIX = MAINNET_MAGIC + bytesToHex(enc("version")) + "0000000000";
export const REKEY_INTERVAL = 224;
export const LENGTH_FIELD_LEN = 3;
export const HEADER_LEN = 1;
export const TAG_LEN = 16;
export const MAX_GARBAGE = 4095;

export class V2Error extends Error {}

const taggedHash = (tag: string, msg: Uint8Array) => { const t = sha256(enc(tag)); return sha256(concat(t, t, msg)); };

/** x(priv·G) for a 32-byte private key. */
export const xOf = (priv: Uint8Array) => bytesToHex(Point.BASE.multiply(BigInt("0x" + bytesToHex(priv))).toBytes(true).slice(1));

/** x(priv·lift_x(xTheirs)): X-only ECDH; either lift gives the same x. */
export function xonlyEcdh(priv: Uint8Array, xTheirs: string): string {
  const P = Point.fromHex("02" + xTheirs);
  return bytesToHex(P.multiply(BigInt("0x" + bytesToHex(priv))).toBytes(true).slice(1));
}

/** v2_ecdh, with the peer's decoded X coordinate supplied (see the module note). */
export function v2Ecdh(priv: Uint8Array, ellTheirs: Uint8Array, ellOurs: Uint8Array, xTheirs: string, initiating: boolean): { xShared: string; secret: Uint8Array } {
  if (ellTheirs.length !== 64 || ellOurs.length !== 64) throw new V2Error("ElligatorSwift encodings are exactly 64 bytes.");
  const xShared = xonlyEcdh(priv, xTheirs);
  const first = initiating ? ellOurs : ellTheirs, second = initiating ? ellTheirs : ellOurs;
  return { xShared, secret: taggedHash("bip324_ellswift_xonly_ecdh", concat(first, second, hexToBytes(xShared))) };
}

export interface SessionKeys {
  sessionId: Uint8Array;
  initiatorL: Uint8Array;
  initiatorP: Uint8Array;
  responderL: Uint8Array;
  responderP: Uint8Array;
  initiatorTerminator: Uint8Array;
  responderTerminator: Uint8Array;
}

/** HKDF-SHA256 key schedule of initialize_v2_transport. */
export function deriveKeys(ecdhSecret: Uint8Array, magicHex = MAINNET_MAGIC): SessionKeys {
  const prk = extract(sha256, ecdhSecret, concat(enc("bitcoin_v2_shared_secret"), hexToBytes(magicHex)));
  const x = (info: string) => expand(sha256, prk, enc(info), 32);
  const gt = x("garbage_terminators");
  return {
    sessionId: x("session_id"), initiatorL: x("initiator_L"), initiatorP: x("initiator_P"),
    responderL: x("responder_L"), responderP: x("responder_P"),
    initiatorTerminator: gt.slice(0, 16), responderTerminator: gt.slice(16),
  };
}

/** FSChaCha20Poly1305: nonce = packet counter within the epoch (4 LE) ‖ epoch (8 LE); rekey every 224 messages. */
export class FSChaCha20Poly1305 {
  packetCounter = 0;
  rekeys = 0;
  constructor(public key: Uint8Array) {}
  nonce(): Uint8Array { return concat(le(this.packetCounter % REKEY_INTERVAL, 4), le(Math.floor(this.packetCounter / REKEY_INTERVAL), 8)); }
  private crypt(aad: Uint8Array, text: Uint8Array, decrypt: boolean): Uint8Array | null {
    const nonce = this.nonce();
    let ret: Uint8Array | null;
    if (decrypt) {
      try { ret = chacha20poly1305(this.key, nonce, aad).decrypt(text); } catch { ret = null; }
    } else ret = chacha20poly1305(this.key, nonce, aad).encrypt(text);
    if ((this.packetCounter + 1) % REKEY_INTERVAL === 0) {
      const rekeyNonce = concat(Uint8Array.of(0xff, 0xff, 0xff, 0xff), nonce.slice(4));
      this.key = chacha20poly1305(this.key, rekeyNonce, new Uint8Array(0)).encrypt(new Uint8Array(32)).slice(0, 32);
      this.rekeys++;
    }
    this.packetCounter++;
    return ret;
  }
  encrypt(aad: Uint8Array, plaintext: Uint8Array) { return this.crypt(aad, plaintext, false)!; }
  decrypt(aad: Uint8Array, ciphertext: Uint8Array) { return this.crypt(aad, ciphertext, true); }
}

/** FSChaCha20: one keystream for all length fields; rekey every 224 chunks from the keystream itself. */
export class FSChaCha20 {
  blockCounter = 0;
  chunkCounter = 0;
  keystream = new Uint8Array(0);
  rekeys = 0;
  constructor(public key: Uint8Array) {}
  private bytes(n: number): Uint8Array {
    while (this.keystream.length < n) {
      const nonce = concat(le(0, 4), le(Math.floor(this.chunkCounter / REKEY_INTERVAL), 8));
      this.keystream = concat(this.keystream, chacha20(this.key, nonce, new Uint8Array(64), undefined, this.blockCounter));
      this.blockCounter++;
    }
    const r = this.keystream.slice(0, n);
    this.keystream = this.keystream.slice(n);
    return r;
  }
  crypt(chunk: Uint8Array): Uint8Array {
    const ks = this.bytes(chunk.length);
    const ret = chunk.map((b, i) => b ^ ks[i]);
    if ((this.chunkCounter + 1) % REKEY_INTERVAL === 0) {
      this.key = this.bytes(32);
      this.blockCounter = 0;
      this.rekeys++;
    }
    this.chunkCounter++;
    return ret;
  }
}

export interface Sender { L: FSChaCha20; P: FSChaCha20Poly1305 }
export const senderFor = (k: SessionKeys, initiating: boolean): Sender =>
  initiating ? { L: new FSChaCha20(k.initiatorL), P: new FSChaCha20Poly1305(k.initiatorP) } : { L: new FSChaCha20(k.responderL), P: new FSChaCha20Poly1305(k.responderP) };

export interface EncryptedPacket {
  /** Packet index: how many packets this direction had already sent. */
  index: number;
  lengthPlain: string;
  lengthEnc: string;
  header: number;
  aeadCiphertext: Uint8Array;
  tag: string;
  packet: Uint8Array;
  nonce: string;
  rekeysSoFar: number;
}

/** v2_enc_packet. */
export function encPacket(s: Sender, contents: Uint8Array, aad: Uint8Array = new Uint8Array(0), ignore = false): EncryptedPacket {
  if (contents.length > 2 ** 24 - 1) throw new V2Error("Contents longer than 2^24 - 1 bytes.");
  const index = s.P.packetCounter;
  const nonce = bytesToHex(s.P.nonce());
  const rekeysSoFar = s.P.rekeys;
  const header = ignore ? 0x80 : 0x00;
  const aeadCiphertext = s.P.encrypt(aad, concat(Uint8Array.of(header), contents));
  const lenPlain = le(contents.length, LENGTH_FIELD_LEN);
  const lengthEnc = s.L.crypt(lenPlain);
  return { index, lengthPlain: bytesToHex(lenPlain), lengthEnc: bytesToHex(lengthEnc), header, aeadCiphertext, tag: bytesToHex(aeadCiphertext.slice(-TAG_LEN)), packet: concat(lengthEnc, aeadCiphertext), nonce, rekeysSoFar };
}

/** v2_receive_packet for one packet: null if authentication fails. */
export function decPacket(r: Sender, packet: Uint8Array, aad: Uint8Array = new Uint8Array(0)): { length: number; header: number; contents: Uint8Array } | null {
  const length = Array.from(r.L.crypt(packet.slice(0, LENGTH_FIELD_LEN))).reduceRight((a, b) => a * 256 + b, 0);
  if (packet.length !== LENGTH_FIELD_LEN + HEADER_LEN + length + TAG_LEN) throw new V2Error("Packet length does not match its length field.");
  const pt = r.P.decrypt(aad, packet.slice(LENGTH_FIELD_LEN));
  if (!pt) return null;
  return { length, header: pt[0], contents: pt.slice(1) };
}

/** Overhead per message: v2 adds 3 + 1 + 16 bytes to the contents; v1 has a 24-byte header. */
export const V2_OVERHEAD = LENGTH_FIELD_LEN + HEADER_LEN + TAG_LEN;
export const V1_HEADER = 24;
/** v2 contents for an application message: a 1-byte short ID, or 0x00 plus a 12-byte ASCII type. */
export const v2MessageTypeBytes = (shortId: boolean) => (shortId ? 1 : 13);

/** A v1 message header: magic ‖ 12-byte command ‖ 4-byte LE length ‖ first 4 bytes of dSHA256(payload). */
export function v1Header(command: string, payload: Uint8Array, magicHex = MAINNET_MAGIC): Uint8Array {
  if (command.length > 12) throw new V2Error("Command longer than 12 bytes.");
  const cmd = new Uint8Array(12); cmd.set(enc(command));
  return concat(hexToBytes(magicHex), cmd, le(payload.length, 4), sha256(sha256(payload)).slice(0, 4));
}
