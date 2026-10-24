import { bytesToHex, hexToBytes } from "./hex";
import { parsePsbtMapSequence, PsbtError, type MapScope, type PsbtRecord } from "./psbt";

export interface PsbtExtensionRecord extends PsbtRecord {
  scope: MapScope;
  index: number;
  family: "global-v2" | "taproot" | "musig2" | "base" | "unknown";
  name: string;
  reading: string | null;
}

export interface PsbtExtensionAnalysis {
  valid: boolean;
  errors: string[];
  version: number | null;
  records: PsbtExtensionRecord[];
  locktime: { kind: "height" | "time" | "fallback"; value: number } | null;
}

const short = (hex: string, length = 16) => hex.length <= length ? hex : `${hex.slice(0, length)}…`;
const u32 = (hex: string) => {
  const bytes = hexToBytes(hex);
  if (bytes.length !== 4) throw new PsbtError("A 32-bit value must have four bytes.");
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
};
const i32 = (hex: string) => {
  const value = u32(hex);
  return value >= 0x80000000 ? value - 0x100000000 : value;
};
const i64 = (hex: string) => {
  const bytes = hexToBytes(hex);
  if (bytes.length !== 8) throw new PsbtError("A 64-bit value must have eight bytes.");
  const value = bytes.reduceRight((result, byte) => (result << 8n) | BigInt(byte), 0n);
  return value >= 1n << 63n ? value - (1n << 64n) : value;
};
const compact = (bytes: Uint8Array, offset: number): { value: number; next: number } => {
  if (offset >= bytes.length) throw new PsbtError("Unexpected end of CompactSize value.");
  const first = bytes[offset];
  const size = first < 0xfd ? 0 : first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
  if (offset + 1 + size > bytes.length) throw new PsbtError("Unexpected end of CompactSize value.");
  let value = size === 0 ? first : 0;
  for (let i = size; i >= 1; i--) value = value * 256 + bytes[offset + i];
  const minimal = value < 0xfd ? 0 : value <= 0xffff ? 2 : value <= 0xffffffff ? 4 : 8;
  if (size !== minimal) throw new PsbtError("Non-minimal CompactSize value.");
  return { value, next: offset + 1 + size };
};
const countValue = (hex: string) => {
  const bytes = hexToBytes(hex);
  const result = compact(bytes, 0);
  if (result.next !== bytes.length) throw new PsbtError("CompactSize value has trailing bytes.");
  return result.value;
};
const compressedPubkey = (hex: string) => hex.length === 66 && (hex.startsWith("02") || hex.startsWith("03"));

const names: Record<string, string> = {
  "global/0x00": "PSBT_GLOBAL_UNSIGNED_TX",
  "global/0x01": "PSBT_GLOBAL_XPUB",
  "global/0xfb": "PSBT_GLOBAL_VERSION",
  "input/0x00": "PSBT_IN_NON_WITNESS_UTXO",
  "input/0x01": "PSBT_IN_WITNESS_UTXO",
  "input/0x02": "PSBT_IN_PARTIAL_SIG",
  "input/0x03": "PSBT_IN_SIGHASH_TYPE",
  "input/0x04": "PSBT_IN_REDEEM_SCRIPT",
  "input/0x05": "PSBT_IN_WITNESS_SCRIPT",
  "input/0x06": "PSBT_IN_BIP32_DERIVATION",
  "input/0x07": "PSBT_IN_FINAL_SCRIPTSIG",
  "input/0x08": "PSBT_IN_FINAL_SCRIPTWITNESS",
  "input/0x09": "PSBT_IN_POR_COMMITMENT",
  "input/0x0a": "PSBT_IN_RIPEMD160",
  "input/0x0b": "PSBT_IN_SHA256",
  "input/0x0c": "PSBT_IN_HASH160",
  "input/0x0d": "PSBT_IN_HASH256",
  "output/0x00": "PSBT_OUT_REDEEM_SCRIPT",
  "output/0x01": "PSBT_OUT_WITNESS_SCRIPT",
  "output/0x02": "PSBT_OUT_BIP32_DERIVATION",
  "global/0x02": "PSBT_GLOBAL_TX_VERSION",
  "global/0x03": "PSBT_GLOBAL_FALLBACK_LOCKTIME",
  "global/0x04": "PSBT_GLOBAL_INPUT_COUNT",
  "global/0x05": "PSBT_GLOBAL_OUTPUT_COUNT",
  "global/0x06": "PSBT_GLOBAL_TX_MODIFIABLE",
  "input/0x0e": "PSBT_IN_PREVIOUS_TXID",
  "input/0x0f": "PSBT_IN_OUTPUT_INDEX",
  "input/0x10": "PSBT_IN_SEQUENCE",
  "input/0x11": "PSBT_IN_REQUIRED_TIME_LOCKTIME",
  "input/0x12": "PSBT_IN_REQUIRED_HEIGHT_LOCKTIME",
  "output/0x03": "PSBT_OUT_AMOUNT",
  "output/0x04": "PSBT_OUT_SCRIPT",
  "input/0x13": "PSBT_IN_TAP_KEY_SIG",
  "input/0x14": "PSBT_IN_TAP_SCRIPT_SIG",
  "input/0x15": "PSBT_IN_TAP_LEAF_SCRIPT",
  "input/0x16": "PSBT_IN_TAP_BIP32_DERIVATION",
  "input/0x17": "PSBT_IN_TAP_INTERNAL_KEY",
  "input/0x18": "PSBT_IN_TAP_MERKLE_ROOT",
  "output/0x05": "PSBT_OUT_TAP_INTERNAL_KEY",
  "output/0x06": "PSBT_OUT_TAP_TREE",
  "output/0x07": "PSBT_OUT_TAP_BIP32_DERIVATION",
  "input/0x1a": "PSBT_IN_MUSIG2_PARTICIPANT_PUBKEYS",
  "input/0x1b": "PSBT_IN_MUSIG2_PUB_NONCE",
  "input/0x1c": "PSBT_IN_MUSIG2_PARTIAL_SIG",
  "output/0x08": "PSBT_OUT_MUSIG2_PARTICIPANT_PUBKEYS",
};
const familyOf = (scope: MapScope, keyType: number): PsbtExtensionRecord["family"] => {
  if ((scope === "global" && keyType >= 0x02 && keyType <= 0x06) || (scope === "input" && keyType >= 0x0e && keyType <= 0x12) || (scope === "output" && (keyType === 0x03 || keyType === 0x04))) return "global-v2";
  if ((scope === "input" && keyType >= 0x13 && keyType <= 0x18) || (scope === "output" && keyType >= 0x05 && keyType <= 0x07)) return "taproot";
  if ((scope === "input" && keyType >= 0x1a && keyType <= 0x1c) || (scope === "output" && keyType === 0x08)) return "musig2";
  if (keyType === 0xfc || names[`${scope}/0x${keyType.toString(16).padStart(2, "0")}`]) return "base";
  return "unknown";
};
const keyName = (scope: MapScope, keyType: number) => names[`${scope}/0x${keyType.toString(16).padStart(2, "0")}`] ?? (keyType === 0xfc ? `PSBT_${scope === "global" ? "GLOBAL" : scope === "input" ? "IN" : "OUT"}_PROPRIETARY` : `UNKNOWN_TYPE_0x${keyType.toString(16).padStart(2, "0")}`);

function inspect(scope: MapScope, index: number, record: PsbtRecord, errors: string[]): PsbtExtensionRecord {
  const { keyType, keyDataHex, valueHex } = record;
  const family = familyOf(scope, keyType);
  const name = keyName(scope, keyType);
  const fail = (condition: boolean, message: string) => { if (!condition) errors.push(`${scope} ${index} ${name}: ${message}`); };
  fail(family !== "unknown" || scope === "global" || keyType <= 0xfb, "unknown field family in this teaching model");
  let reading: string | null = null;
  try {
    if (family === "global-v2" && scope === "global") {
      fail(keyDataHex === "", "global v2 key must have no key data");
      if (keyType === 0x02) reading = `transaction version ${i32(valueHex)}`;
      if (keyType === 0x03) reading = `fallback locktime ${u32(valueHex)}`;
      if (keyType === 0x04 || keyType === 0x05) reading = `${countValue(valueHex)} ${keyType === 0x04 ? "inputs" : "outputs"}`;
      if (keyType === 0x06) {
        const flagBytes = hexToBytes(valueHex);
        if (flagBytes.length !== 1) throw new PsbtError("Modifiable flags must have one byte.");
        const flags = flagBytes[0];
        reading = `modifiable flags ${flags}`;
      }
    } else if (family === "global-v2" && scope === "input") {
      fail(keyDataHex === "", "per-input v2 key must have no key data");
      if (keyType === 0x0e) { fail(valueHex.length === 64, "previous txid must be 32 bytes"); reading = `previous txid ${short(valueHex)}`; }
      if (keyType === 0x0f) reading = `output index ${u32(valueHex)}`;
      if (keyType === 0x10) reading = `sequence ${u32(valueHex)}`;
      if (keyType === 0x11) {
        const value = u32(valueHex);
        fail(value >= 500000000, "time locktime must be at least 500000000");
        reading = `required time ${value}`;
      }
      if (keyType === 0x12) {
        const value = u32(valueHex);
        fail(value > 0 && value < 500000000, "height locktime must be between 1 and 499999999");
        reading = `required height ${value}`;
      }
    } else if (family === "global-v2" && scope === "output") {
      fail(keyDataHex === "", "per-output v2 key must have no key data");
      if (keyType === 0x03) reading = `${i64(valueHex)} satoshis`;
      if (keyType === 0x04) reading = `output script, ${valueHex.length / 2} bytes`;
    } else if (scope === "input" && keyType === 0x13) {
      fail(keyDataHex === "", "key-spend signature key has no key data");
      fail(valueHex.length === 128 || valueHex.length === 130, "key-spend signature must be 64 or 65 bytes");
      reading = `Taproot key-spend signature, ${valueHex.length / 2} bytes`;
    } else if (scope === "input" && keyType === 0x14) {
      fail(keyDataHex.length === 128, "script-spend signature key data needs x-only key + leaf hash");
      fail(valueHex.length === 128 || valueHex.length === 130, "script-spend signature must be 64 or 65 bytes");
      reading = `script-spend signature, ${valueHex.length / 2} bytes`;
    } else if (scope === "input" && keyType === 0x15) {
      fail(keyDataHex.length >= 66 && (keyDataHex.length - 66) % 64 === 0, "control block must be 33 + 32m bytes");
      fail(valueHex.length >= 2, "leaf script needs at least one version byte");
      reading = `leaf script + version, ${valueHex.length / 2 - 1} script bytes`;
    } else if ((scope === "input" && keyType === 0x16) || (scope === "output" && keyType === 0x07)) {
      fail(keyDataHex.length === 64, "Taproot derivation key data must be 32 bytes");
      const bytes = hexToBytes(valueHex);
      const count = compact(bytes, 0);
      fail(count.next + count.value * 32 + 4 <= bytes.length, "derivation hashes run past the value");
      fail((bytes.length - (count.next + count.value * 32 + 4)) % 4 === 0, "derivation path must use 4-byte elements");
      reading = `${count.value} leaf hashes + fingerprint + path`;
    } else if ((scope === "input" && keyType === 0x17) || (scope === "output" && keyType === 0x05)) {
      fail(keyDataHex === "", "internal-key field must have no key data");
      fail(valueHex.length === 64, "internal key must be 32 bytes");
      reading = `internal key ${short(valueHex)}`;
    } else if (scope === "input" && keyType === 0x18) {
      fail(keyDataHex === "", "Merkle-root field must have no key data");
      fail(valueHex.length === 64, "Merkle root must be 32 bytes");
      reading = `Merkle root ${short(valueHex)}`;
    } else if (scope === "output" && keyType === 0x06) {
      fail(keyDataHex === "", "Taproot tree key must have no key data");
      const bytes = hexToBytes(valueHex);
      fail(bytes.length > 0, "Taproot tree must contain at least one tuple");
      const leaves: Array<{ depth: number; version: number; scriptHex: string }> = [];
      let offset = 0;
      while (offset < bytes.length) {
        if (offset + 2 > bytes.length) throw new PsbtError("Truncated Taproot tree tuple.");
        const depth = bytes[offset];
        const version = bytes[offset + 1];
        const length = compact(bytes, offset + 2);
        if (length.next + length.value > bytes.length) throw new PsbtError("Taproot tree script runs past the value.");
        const scriptHex = bytesToHex(bytes.slice(length.next, length.next + length.value));
        if (leaves.length && depth > leaves.at(-1)!.depth + 1) fail(false, "depth-first leaf depth skips a level");
        leaves.push({ depth, version, scriptHex });
        offset = length.next + length.value;
      }
      reading = `${leaves.length} leaves, depths ${leaves.map((leaf) => leaf.depth).join(",")}`;
    } else if ((scope === "input" && keyType === 0x1a) || (scope === "output" && keyType === 0x08)) {
      fail(compressedPubkey(keyDataHex), "aggregate key must be a compressed public key");
      fail(valueHex.length >= 66 && valueHex.length % 66 === 0, "participant list must contain whole compressed keys");
      for (let at = 0; at < valueHex.length; at += 66) fail(compressedPubkey(valueHex.slice(at, at + 66)), "participant key is not compressed");
      reading = `${valueHex.length / 66} MuSig2 participants`;
    } else if (scope === "input" && keyType === 0x1b) {
      fail(keyDataHex.length === 132 || keyDataHex.length === 196, "nonce key data needs participant + aggregate [+ leaf hash]");
      fail(valueHex.length === 132, "public nonce must be 66 bytes");
      reading = `public nonce, ${valueHex.length / 2} bytes`;
    } else if (scope === "input" && keyType === 0x1c) {
      fail(keyDataHex.length === 132 || keyDataHex.length === 196, "partial-signature key data needs participant + aggregate [+ leaf hash]");
      fail(valueHex.length === 64, "partial signature must be 32 bytes");
      reading = `partial signature, ${valueHex.length / 2} bytes`;
    } else if (family === "taproot") {
      reading = `${name}, ${valueHex.length / 2} bytes`;
    }
  } catch (error) {
    errors.push(`${scope} ${index} ${name}: ${(error as Error).message}`);
  }
  return { ...record, scope, index, family, name, reading };
}

export function analyzePsbtExtensions(hex: string): PsbtExtensionAnalysis {
  try {
    const maps = parsePsbtMapSequence(hex);
    const errors: string[] = [];
    const versionRecord = maps.global.find((record) => record.keyType === 0xfb);
    const version = versionRecord ? u32(versionRecord.valueHex) : 0;
    if (version !== 0 && version !== 2) errors.push(`Unsupported PSBT version ${version}.`);
    if (version === 0) {
      for (const record of maps.global) if (record.keyType >= 0x02 && record.keyType <= 0x06) errors.push(`PSBTv0 contains v2 global ${keyName("global", record.keyType)}.`);
      for (const records of maps.inputs.flat()) if (records.keyType >= 0x0e && records.keyType <= 0x12) errors.push(`PSBTv0 contains v2 input ${keyName("input", records.keyType)}.`);
      for (const records of maps.outputs.flat()) if (records.keyType === 0x03 || records.keyType === 0x04) errors.push(`PSBTv0 contains v2 output ${keyName("output", records.keyType)}.`);
    }
    if (version === 2) {
      if (maps.global.some((record) => record.keyType === 0x00)) errors.push("PSBTv2 must exclude PSBT_GLOBAL_UNSIGNED_TX.");
      for (const type of [0x02, 0x04, 0x05]) if (!maps.global.some((record) => record.keyType === type)) errors.push(`PSBTv2 is missing ${keyName("global", type)}.`);
      for (const [index, records] of maps.inputs.entries()) {
        if (!records.some((record) => record.keyType === 0x0e)) errors.push(`input ${index} is missing PSBT_IN_PREVIOUS_TXID.`);
        if (!records.some((record) => record.keyType === 0x0f)) errors.push(`input ${index} is missing PSBT_IN_OUTPUT_INDEX.`);
      }
      for (const [index, records] of maps.outputs.entries()) {
        if (!records.some((record) => record.keyType === 0x03)) errors.push(`output ${index} is missing PSBT_OUT_AMOUNT.`);
        if (!records.some((record) => record.keyType === 0x04)) errors.push(`output ${index} is missing PSBT_OUT_SCRIPT.`);
      }
    }
    const records = [
      ...maps.global.map((record) => inspect("global", 0, record, errors)),
      ...maps.inputs.flatMap((records, index) => records.map((record) => inspect("input", index, record, errors))),
      ...maps.outputs.flatMap((records, index) => records.map((record) => inspect("output", index, record, errors))),
    ];
    let locktime: PsbtExtensionAnalysis["locktime"] = null;
    if (version === 2) {
      const fallbackRecord = maps.global.find((record) => record.keyType === 0x03);
      const fallback = fallbackRecord ? u32(fallbackRecord.valueHex) : 0;
      const heightPossible = maps.inputs.every((records) => records.some((record) => record.keyType === 0x12) || !records.some((record) => record.keyType === 0x11 || record.keyType === 0x12));
      const timePossible = maps.inputs.every((records) => records.some((record) => record.keyType === 0x11) || !records.some((record) => record.keyType === 0x11 || record.keyType === 0x12));
      const values = maps.inputs.map((records) => ({
        height: records.filter((record) => record.keyType === 0x12).map((record) => u32(record.valueHex)),
        time: records.filter((record) => record.keyType === 0x11).map((record) => u32(record.valueHex)),
      }));
      const hasRequirements = maps.inputs.some((records) => records.some((record) => record.keyType === 0x11 || record.keyType === 0x12));
      if (!hasRequirements) {
        locktime = { kind: "fallback", value: fallback };
      } else if (heightPossible || timePossible) {
        const kind = heightPossible ? "height" : "time";
        const candidates = values.flatMap((value) => value[kind]);
        locktime = { kind, value: Math.max(...candidates) };
      } else {
        errors.push("No locktime type is supported by every input; cannot compute nLockTime.");
      }
    }
    return { valid: errors.length === 0, errors, version, records, locktime };
  } catch (error) {
    return { valid: false, errors: [(error as Error).message], version: null, records: [], locktime: null };
  }
}
