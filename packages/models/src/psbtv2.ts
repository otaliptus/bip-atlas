/**
 * BIP 370 teaching model: read a PSBT of version 0 or 2 and apply BIP 370's
 * inclusion and exclusion rules, determine the transaction's lock time from
 * the inputs' requirements, build the unsigned transaction a version 2 PSBT
 * describes (for its unique ID and for conversion to version 0), and update
 * PSBT_GLOBAL_TX_MODIFIABLE as BIP 370's Signer rules say.
 *
 * Version 0 PSBTs go through the BIP 174 model (./psbt) first; version 2
 * maps are read with the same reader and record checks. It never signs.
 */
import { bytesToHex, hexToBytes } from "./hex";
import { PSBT_MAGIC, PsbtError, Reader, checkRecord, parsePsbt, readCompactSizeFrom, readMap, type MapScope, type PsbtRecord } from "./psbt";
import { LOCKTIME_THRESHOLD } from "./timelock";
import { dsha256 } from "./tx";

/** The fields BIP 370 adds, by map and key type. */
export const V2_FIELDS: Record<MapScope, Record<number, string>> = {
  global: { 0x02: "PSBT_GLOBAL_TX_VERSION", 0x03: "PSBT_GLOBAL_FALLBACK_LOCKTIME", 0x04: "PSBT_GLOBAL_INPUT_COUNT", 0x05: "PSBT_GLOBAL_OUTPUT_COUNT", 0x06: "PSBT_GLOBAL_TX_MODIFIABLE" },
  input: { 0x0e: "PSBT_IN_PREVIOUS_TXID", 0x0f: "PSBT_IN_OUTPUT_INDEX", 0x10: "PSBT_IN_SEQUENCE", 0x11: "PSBT_IN_REQUIRED_TIME_LOCKTIME", 0x12: "PSBT_IN_REQUIRED_HEIGHT_LOCKTIME" },
  output: { 0x03: "PSBT_OUT_AMOUNT", 0x04: "PSBT_OUT_SCRIPT" },
};
/** Fields version 2 must include ("Versions Requiring Inclusion: 2"). */
export const V2_REQUIRED: Record<MapScope, number[]> = { global: [0x02, 0x04, 0x05], input: [0x0e, 0x0f], output: [0x03, 0x04] };
export const UNSIGNED_TX = "PSBT_GLOBAL_UNSIGNED_TX";

/** Value sizes in bytes; "compact" is one compact-size integer filling the value. */
const V2_SIZES: Record<MapScope, Record<number, number | "compact" | "any">> = {
  global: { 0x02: 4, 0x03: 4, 0x04: "compact", 0x05: "compact", 0x06: 1 },
  input: { 0x0e: 32, 0x0f: 4, 0x10: 4, 0x11: 4, 0x12: 4 },
  output: { 0x03: 8, 0x04: "any" },
};

export type Bip370Rule = "v0-excludes" | "v2-excludes" | "v2-requires" | "time-range" | "height-range" | "format" | "structure";

/** Why a PSBT is invalid under BIP 370: the rule, the field it concerns and where. */
export interface Bip370Violation {
  rule: Bip370Rule;
  field: string;
  scope: MapScope | "psbt";
  /** Input or output index, for per-map rules. */
  index?: number;
  /** The out-of-range value, for the lock-time range rules. */
  value?: number;
  message: string;
}

export class Psbt370Error extends PsbtError {
  constructor(readonly violation: Bip370Violation) {
    super(violation.message);
  }
}

export interface V2Input {
  /** PSBT_IN_PREVIOUS_TXID as stored: standard byte order, not display order. */
  txidHex: string;
  outputIndex: number;
  /** PSBT_IN_SEQUENCE, or null when omitted (then 0xffffffff is assumed). */
  sequence: number | null;
  requiredTime: number | null;
  requiredHeight: number | null;
}
export interface V2Output { amountSats: bigint; scriptHex: string }

export interface PsbtV2 {
  version: 2;
  txVersion: number;
  fallbackLocktime: number | null;
  /** PSBT_GLOBAL_TX_MODIFIABLE, or null when the field is absent. */
  modifiable: number | null;
  global: PsbtRecord[];
  inputMaps: PsbtRecord[][];
  outputMaps: PsbtRecord[][];
  inputs: V2Input[];
  outputs: V2Output[];
}

export type Bip370Reading =
  | { valid: true; version: 0 }
  | { valid: true; version: 2; psbt: PsbtV2 }
  | { valid: false; version: number; violation: Bip370Violation };

const le = (hex: string) => hexToBytes(hex).reduceRight((n, b) => n * 256 + b, 0);
const leSigned32 = (hex: string) => le(hex) | 0;
const le64Signed = (hex: string) => BigInt.asIntN(64, hexToBytes(hex).reduceRight((n, b) => (n << 8n) | BigInt(b), 0n));
const hexLE = (n: number, bytes: number) => Array.from({ length: bytes }, (_, i) => Math.floor(n / 256 ** i) % 256).map((b) => b.toString(16).padStart(2, "0")).join("");
const hexLE64 = (n: bigint) => Array.from({ length: 8 }, (_, i) => Number((BigInt.asUintN(64, n) >> BigInt(8 * i)) & 0xffn).toString(16).padStart(2, "0")).join("");
const compact = (n: number) => (n < 0xfd ? hexLE(n, 1) : n <= 0xffff ? "fd" + hexLE(n, 2) : "fe" + hexLE(n, 4));
const nameOf = (scope: MapScope, type: number) => V2_FIELDS[scope][type] ?? `0x${type.toString(16).padStart(2, "0")}`;
const fail = (v: Bip370Violation): never => {
  throw new Psbt370Error(v);
};

/** The PSBT_GLOBAL_VERSION value (0 when the field is absent), read before anything else. */
function readGlobal(bytes: Uint8Array): { r: Reader; global: PsbtRecord[]; version: number } {
  if (bytesToHex(bytes.slice(0, 5)) !== PSBT_MAGIC) throw new PsbtError("Missing the psbt magic bytes 70 73 62 74 ff.");
  const r = new Reader(bytes);
  r.take(5);
  const global = readMap(r, "global");
  const v = global.find((g) => g.keyType === 0xfb);
  if (v && (v.keyDataHex !== "" || v.valueHex.length !== 8)) throw new PsbtError("PSBT_GLOBAL_VERSION must be a 4-byte value with no key data.");
  return { r, global, version: v ? le(v.valueHex) : 0 };
}

/** Each version 2 field: no key data and the value size its table gives. */
function checkV2Format(scope: MapScope, rec: PsbtRecord, index?: number) {
  const size = V2_SIZES[scope][rec.keyType];
  if (size === undefined) return;
  const field = nameOf(scope, rec.keyType);
  const bytes = rec.valueHex.length / 2;
  if (rec.keyDataHex !== "") fail({ rule: "format", field, scope, index, message: `${field} takes no key data.` });
  if (size === "compact") {
    let ok = bytes > 0;
    try {
      ok = ok && readCompactSizeFrom(hexToBytes(rec.valueHex)).length === bytes;
    } catch {
      ok = false;
    }
    if (!ok) fail({ rule: "format", field, scope, index, message: `${field} must be one compact-size integer.` });
  } else if (size !== "any" && bytes !== size) fail({ rule: "format", field, scope, index, message: `${field} must be ${size} bytes.` });
}

/** Version 0 must carry none of the version 2 fields. */
function checkV0(hex: string, global: PsbtRecord[]): Bip370Reading {
  const p = parsePsbt(hex);
  const maps: Array<[MapScope, PsbtRecord[], number | undefined]> = [["global", global, undefined], ...p.inputs.map((m, i) => ["input", m, i] as [MapScope, PsbtRecord[], number]), ...p.outputs.map((m, i) => ["output", m, i] as [MapScope, PsbtRecord[], number])];
  for (const [scope, map, index] of maps) {
    const extra = map.find((rec) => rec.keyType in V2_FIELDS[scope]);
    if (extra) {
      const field = nameOf(scope, extra.keyType);
      return { valid: false, version: 0, violation: { rule: "v0-excludes", field, scope, index, message: `A version 0 PSBT must exclude ${field}.` } };
    }
  }
  return { valid: true, version: 0 };
}

function readV2(r: Reader, global: PsbtRecord[]): PsbtV2 {
  const g = (type: number) => global.find((rec) => rec.keyType === type);
  if (g(0x00)) fail({ rule: "v2-excludes", field: UNSIGNED_TX, scope: "global", message: `A version 2 PSBT must exclude ${UNSIGNED_TX}.` });
  for (const rec of global) {
    checkRecord("global", rec);
    checkV2Format("global", rec);
  }
  for (const type of V2_REQUIRED.global) if (!g(type)) fail({ rule: "v2-requires", field: nameOf("global", type), scope: "global", message: `A version 2 PSBT must include ${nameOf("global", type)}.` });
  const count = (type: number) => readCompactSizeFrom(hexToBytes(g(type)!.valueHex)).value;
  const read = (scope: MapScope, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const map = readMap(r, `${scope} ${i}`);
      for (const rec of map) {
        checkRecord(scope, rec);
        checkV2Format(scope, rec, i);
      }
      return map;
    });
  const inputMaps = read("input", count(0x04));
  const outputMaps = read("output", count(0x05));
  if (!r.done) fail({ rule: "structure", field: "PSBT_GLOBAL_OUTPUT_COUNT", scope: "psbt", message: "Unexpected data after the last output map." });
  const value = (map: PsbtRecord[], type: number) => map.find((rec) => rec.keyType === type)?.valueHex ?? null;
  const require = (scope: MapScope, map: PsbtRecord[], i: number) => {
    for (const type of V2_REQUIRED[scope]) if (value(map, type) === null) fail({ rule: "v2-requires", field: nameOf(scope, type), scope, index: i, message: `${scope === "input" ? "Input" : "Output"} ${i} of a version 2 PSBT must include ${nameOf(scope, type)}.` });
  };
  const inputs = inputMaps.map((m, i): V2Input => {
    require("input", m, i);
    const time = value(m, 0x11), height = value(m, 0x12), seq = value(m, 0x10);
    const t = time === null ? null : le(time), h = height === null ? null : le(height);
    if (t !== null && t < LOCKTIME_THRESHOLD) fail({ rule: "time-range", field: "PSBT_IN_REQUIRED_TIME_LOCKTIME", scope: "input", index: i, value: t, message: `Input ${i}'s required time lock ${t} is below ${LOCKTIME_THRESHOLD}.` });
    if (h !== null && !(h > 0 && h < LOCKTIME_THRESHOLD)) fail({ rule: "height-range", field: "PSBT_IN_REQUIRED_HEIGHT_LOCKTIME", scope: "input", index: i, value: h, message: `Input ${i}'s required height lock ${h} is not greater than 0 and less than ${LOCKTIME_THRESHOLD}.` });
    return { txidHex: value(m, 0x0e)!, outputIndex: le(value(m, 0x0f)!), sequence: seq === null ? null : le(seq), requiredTime: t, requiredHeight: h };
  });
  const outputs = outputMaps.map((m, i): V2Output => {
    require("output", m, i);
    return { amountSats: le64Signed(value(m, 0x03)!), scriptHex: value(m, 0x04)! };
  });
  const fallback = g(0x03), mod = g(0x06);
  return {
    version: 2,
    txVersion: leSigned32(g(0x02)!.valueHex),
    fallbackLocktime: fallback ? le(fallback.valueHex) : null,
    modifiable: mod ? le(mod.valueHex) : null,
    global,
    inputMaps,
    outputMaps,
    inputs,
    outputs,
  };
}

/**
 * Read a PSBT of version 0 or 2 under BIP 370. Invalid PSBTs come back with
 * the first rule they break; malformed data that BIP 174 already rejects
 * throws PsbtError, and versions other than 0 and 2 are out of scope.
 */
export function readPsbtAnyVersion(hex: string): Bip370Reading {
  const { r, global, version } = readGlobal(hexToBytes(hex));
  if (version === 0) return checkV0(hex, global);
  if (version !== 2) throw new PsbtError(`This model reads PSBT versions 0 and 2, not ${version}.`);
  try {
    return { valid: true, version: 2, psbt: readV2(r, global) };
  } catch (e) {
    if (e instanceof Psbt370Error) return { valid: false, version: 2, violation: e.violation };
    throw e;
  }
}

/** Read a PSBT that must be a valid version 2 one. */
export function parsePsbtV2(hex: string): PsbtV2 {
  const reading = readPsbtAnyVersion(hex);
  if (!reading.valid) throw new Psbt370Error(reading.violation);
  if (reading.version !== 2) throw new PsbtError("Expected a version 2 PSBT.");
  return reading.psbt;
}

export type LockTimeKind = "fallback" | "height" | "time";
export interface LockTimeResult {
  /** Inputs that set a required time or height lock. */
  requiring: number[];
  /** Lock-time types every requiring input accepts. */
  accepted: { height: boolean; time: boolean };
  /** How the value was chosen; null when no type suits every requiring input. */
  kind: LockTimeKind | null;
  /** The transaction's nLockTime, or null when it cannot be computed. */
  value: number | null;
}

/**
 * BIP 370 "Determining Lock Time": with no requirements, the fallback (or 0);
 * otherwise the type every requiring input supports, height when both are
 * possible, and the maximum of that type. With no common type, none.
 */
export function determineLockTime(p: Pick<PsbtV2, "inputs" | "fallbackLocktime">): LockTimeResult {
  const requiring = p.inputs.flatMap((i, k) => (i.requiredHeight !== null || i.requiredTime !== null ? [k] : []));
  const req = requiring.map((k) => p.inputs[k]);
  const accepted = { height: req.every((i) => i.requiredHeight !== null), time: req.every((i) => i.requiredTime !== null) };
  if (!requiring.length) return { requiring, accepted, kind: "fallback", value: p.fallbackLocktime ?? 0 };
  if (accepted.height) return { requiring, accepted, kind: "height", value: Math.max(...req.map((i) => i.requiredHeight!)) };
  if (accepted.time) return { requiring, accepted, kind: "time", value: Math.max(...req.map((i) => i.requiredTime!)) };
  return { requiring, accepted, kind: null, value: null };
}

export interface UnsignedTxPart { id: string; label: string; scope: MapScope | "computed"; field: string; hex: string; index?: number }

/**
 * The unsigned transaction a version 2 PSBT describes, part by part with the
 * field each part comes from. `sequence: "zero"` builds the one used for the
 * unique ID; otherwise each input's PSBT_IN_SEQUENCE, or 0xffffffff.
 */
export function unsignedTransaction(p: PsbtV2, opts: { sequence?: "zero" | "psbt" } = {}): { hex: string; parts: UnsignedTxPart[] } {
  const lock = determineLockTime(p);
  if (lock.value === null) throw new PsbtError("The lock time cannot be computed, so no transaction can be built.");
  const parts: UnsignedTxPart[] = [
    { id: "version", label: "nVersion", scope: "global", field: "PSBT_GLOBAL_TX_VERSION", hex: hexLE(p.txVersion >>> 0, 4) },
    { id: "input-count", label: "input count", scope: "global", field: "PSBT_GLOBAL_INPUT_COUNT", hex: compact(p.inputs.length) },
    ...p.inputs.flatMap((inp, i): UnsignedTxPart[] => [
      { id: `input.${i}.txid`, label: `input ${i} · previous txid`, scope: "input", field: "PSBT_IN_PREVIOUS_TXID", hex: inp.txidHex, index: i },
      { id: `input.${i}.index`, label: `input ${i} · output index`, scope: "input", field: "PSBT_IN_OUTPUT_INDEX", hex: hexLE(inp.outputIndex, 4), index: i },
      { id: `input.${i}.scriptsig`, label: `input ${i} · empty scriptSig`, scope: "computed", field: "unsigned: no scriptSig", hex: "00", index: i },
      opts.sequence === "zero"
        ? { id: `input.${i}.sequence`, label: `input ${i} · nSequence 0`, scope: "computed", field: "0 for the unique ID", hex: "00000000", index: i }
        : { id: `input.${i}.sequence`, label: `input ${i} · nSequence`, scope: inp.sequence === null ? "computed" : "input", field: inp.sequence === null ? "omitted: 0xffffffff" : "PSBT_IN_SEQUENCE", hex: hexLE(inp.sequence ?? 0xffffffff, 4), index: i },
    ]),
    { id: "output-count", label: "output count", scope: "global", field: "PSBT_GLOBAL_OUTPUT_COUNT", hex: compact(p.outputs.length) },
    ...p.outputs.flatMap((o, i): UnsignedTxPart[] => [
      { id: `output.${i}.amount`, label: `output ${i} · amount`, scope: "output", field: "PSBT_OUT_AMOUNT", hex: hexLE64(o.amountSats), index: i },
      { id: `output.${i}.script`, label: `output ${i} · scriptPubKey`, scope: "output", field: "PSBT_OUT_SCRIPT", hex: compact(o.scriptHex.length / 2) + o.scriptHex, index: i },
    ]),
    { id: "locktime", label: "nLockTime", scope: "computed", field: lock.kind === "fallback" ? (p.fallbackLocktime === null ? "no requirement: 0" : "PSBT_GLOBAL_FALLBACK_LOCKTIME") : `maximum required ${lock.kind}`, hex: hexLE(lock.value, 4) },
  ];
  return { hex: parts.map((x) => x.hex).join(""), parts };
}

/** BIP 370 "Unique Identification": the txid of the unsigned transaction with every sequence 0, in display order. */
export function uniqueId(p: PsbtV2): string {
  return bytesToHex(dsha256(hexToBytes(unsignedTransaction(p, { sequence: "zero" }).hex)).reverse());
}

/** PSBT_GLOBAL_TX_MODIFIABLE bits BIP 370 defines; bits 3 to 7 are undefined. */
export const MODIFIABLE_BITS = [
  { bit: 0, name: "Inputs Modifiable" },
  { bit: 1, name: "Outputs Modifiable" },
  { bit: 2, name: "Has SIGHASH_SINGLE" },
] as const;

/** What a Constructor may add, from the flags (an absent field allows nothing). */
export function constructorMay(flags: number | null): { addInputs: boolean; addOutputs: boolean; checkSighashSingle: boolean } {
  const f = flags ?? 0;
  return { addInputs: (f & 1) !== 0, addOutputs: (f & 2) !== 0, checkSighashSingle: (f & 4) !== 0 };
}

/** SIGHASH_DEFAULT (0x00) is Taproot's; it covers what ALL covers. */
export const SIGHASH = { DEFAULT: 0x00, ALL: 0x01, NONE: 0x02, SINGLE: 0x03, ANYONECANPAY: 0x80 } as const;

/**
 * BIP 370's Signer rule: after adding a signature with this sighash type,
 * clear Inputs Modifiable unless it uses ANYONECANPAY, clear Outputs
 * Modifiable unless it uses NONE, and set Has SIGHASH_SINGLE if it uses
 * SINGLE. Undefined bits are left as they are.
 */
export function signerUpdate(flags: number, sighashType: number): number {
  const base = sighashType & 0x1f;
  if (sighashType !== SIGHASH.DEFAULT && (![SIGHASH.ALL, SIGHASH.NONE, SIGHASH.SINGLE].includes(base as 1 | 2 | 3) || (sighashType & ~0x9f) !== 0)) throw new RangeError(`Unknown sighash type 0x${sighashType.toString(16)}`);
  let f = flags;
  if (!(sighashType & SIGHASH.ANYONECANPAY)) f &= ~1;
  if (base !== SIGHASH.NONE) f &= ~2;
  if (base === SIGHASH.SINGLE) f |= 4;
  return f & 0xff;
}

export const sighashName = (t: number) => ["DEFAULT", "ALL", "NONE", "SINGLE"][t & 0x1f] + (t & SIGHASH.ANYONECANPAY ? "|ANYONECANPAY" : "");
