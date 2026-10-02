/**
 * Timelock teaching model for BIPs 65, 68, 112 and 113: read nLockTime and
 * nSequence the way consensus does, and record the checks OP_CHECKLOCKTIMEVERIFY
 * and OP_CHECKSEQUENCEVERIFY make, in the order the BIPs' reference code makes them.
 *
 * Pure integer arithmetic, no crypto and no runtime imports, so client islands
 * can import it directly (`@bip-atlas/models/timelock`). It is not a validator:
 * it never sees the chain, so "when could this be mined" answers are stated
 * against a block height and median time past the caller supplies.
 */
import type { Transaction } from "./tx";

/** nLockTime below this is a block height, at or above it a Unix time (Bitcoin Core script.h). */
export const LOCKTIME_THRESHOLD = 500_000_000;
/** An input with this nSequence is final; if every input is, nLockTime is not enforced (BIP 65, BIP 68). */
export const SEQUENCE_FINAL = 0xffffffff;
/** BIP 68: bit 31 set means nSequence carries no relative lock-time. */
export const SEQUENCE_LOCKTIME_DISABLE_FLAG = 0x80000000;
/** BIP 68: bit 22 set means the relative lock-time counts 512-second units, clear means blocks. */
export const SEQUENCE_LOCKTIME_TYPE_FLAG = 1 << 22;
/** BIP 68: only the low 16 bits hold the relative lock-time value. */
export const SEQUENCE_LOCKTIME_MASK = 0x0000ffff;
/** BIP 68: time-based values are in units of 2^9 = 512 seconds. */
export const SEQUENCE_LOCKTIME_GRANULARITY = 9;
/** BIP 113: median time past is taken over this many blocks. */
export const MEDIAN_TIME_SPAN = 11;

export class TimelockScopeError extends Error {}

/** The fields timelocks read, with nVersion as the unsigned value BIP 68/112 compare. */
export interface LockFields {
  version: number;
  nLockTime: number;
  sequences: number[];
}

const u32le = (hex: string) => {
  if (!/^[0-9a-f]{8}$/.test(hex)) throw new RangeError("expected 4 bytes of hex");
  return (parseInt(hex.slice(6, 8) + hex.slice(4, 6) + hex.slice(2, 4) + hex.slice(0, 2), 16)) >>> 0;
};

/** Read version, nLockTime and every nSequence from a parsed transaction (little-endian fields). */
export function lockFieldsOf(tx: Pick<Transaction, "versionHex" | "locktimeHex" | "inputs">): LockFields {
  return { version: u32le(tx.versionHex), nLockTime: u32le(tx.locktimeHex), sequences: tx.inputs.map((i) => u32le(i.sequenceHex)) };
}

const isU32 = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
function assertFields(f: LockFields) {
  if (!isU32(f.version) || !isU32(f.nLockTime) || !f.sequences.every(isU32)) throw new RangeError("fields must be 32-bit unsigned integers");
}

/* ---------- absolute: nLockTime ---------- */

export type LockKind = "height" | "time";
export const lockTimeKind = (n: number): LockKind => (n < LOCKTIME_THRESHOLD ? "height" : "time");

export interface AbsoluteReading {
  nLockTime: number;
  kind: LockKind;
  /** False when every input is final: then nLockTime is not enforced at all. */
  enforced: boolean;
  /** Inputs whose nSequence is not 0xffffffff. */
  nonFinalInputs: number[];
  /** First block height that may include the transaction (height locks), as nLockTime + 1. */
  firstHeight: number | null;
  /** The median time past the previous block must exceed (time locks). */
  mtpMustExceed: number | null;
}

/**
 * How consensus reads nLockTime. A transaction is excluded from a block while
 * the height, or (after BIP 113) the median time past of the previous block,
 * is less than or equal to nLockTime — unless every input is final.
 */
export function readAbsolute(f: LockFields): AbsoluteReading {
  assertFields(f);
  const nonFinalInputs = f.sequences.flatMap((s, i) => (s === SEQUENCE_FINAL ? [] : [i]));
  const enforced = nonFinalInputs.length > 0;
  const kind = lockTimeKind(f.nLockTime);
  return {
    nLockTime: f.nLockTime,
    kind,
    enforced,
    nonFinalInputs,
    firstHeight: enforced && kind === "height" ? f.nLockTime + 1 : null,
    mtpMustExceed: enforced && kind === "time" ? f.nLockTime : null,
  };
}

/** May a transaction with these fields go into a block at `height` whose previous block has median time past `mtp`? */
export function absoluteSatisfied(f: LockFields, height: number, mtp: number): boolean {
  const r = readAbsolute(f);
  if (!r.enforced) return true;
  return r.nLockTime < (r.kind === "height" ? height : mtp);
}

/* ---------- relative: nSequence (BIP 68) ---------- */

export interface SequenceReading {
  nSequence: number;
  final: boolean;
  /** Bit 31. When set, BIP 68 gives the field no meaning. */
  disableFlag: boolean;
  /** Bit 22: "time" (512-second units) or "blocks". Meaningful only when a relative lock applies. */
  unit: "blocks" | "time";
  /** The low 16 bits. */
  value: number;
  /** value × 512 for time-based locks. */
  seconds: number | null;
  /** True only when BIP 68 enforces a relative lock: version ≥ 2 and the disable flag clear. */
  enforced: boolean;
  /** Why it is not enforced, when it is not. */
  reason: "version" | "disable-flag" | null;
  /** Bits with no meaning under BIP 68 that are set here (16–21, 23–30), only when the disable flag is clear. */
  unusedBitsSet: number[];
}

export function readSequence(nSequence: number, version: number): SequenceReading {
  if (!isU32(nSequence) || !isU32(version)) throw new RangeError("fields must be 32-bit unsigned integers");
  const disableFlag = (nSequence & SEQUENCE_LOCKTIME_DISABLE_FLAG) !== 0;
  const unit = nSequence & SEQUENCE_LOCKTIME_TYPE_FLAG ? "time" : "blocks";
  const value = nSequence & SEQUENCE_LOCKTIME_MASK;
  const enforced = version >= 2 && !disableFlag;
  const unusedBitsSet = disableFlag ? [] : [16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30].filter((b) => ((nSequence >>> b) & 1) === 1);
  return {
    nSequence,
    final: nSequence === SEQUENCE_FINAL,
    disableFlag,
    unit,
    value,
    seconds: unit === "time" ? value << SEQUENCE_LOCKTIME_GRANULARITY : null,
    enforced,
    reason: enforced ? null : version < 2 ? "version" : "disable-flag",
    unusedBitsSet,
  };
}

/** BIP 68's encodings: `nSequence = nHeight` and `nSequence = (1 << 22) | (nTime >> 9)`. */
export function encodeRelative(lock: { blocks: number } | { seconds: number }): number {
  if ("blocks" in lock) {
    if (!Number.isInteger(lock.blocks) || lock.blocks < 0 || lock.blocks > SEQUENCE_LOCKTIME_MASK) throw new RangeError("0 <= nHeight <= 65535");
    return lock.blocks;
  }
  const units = Math.floor(lock.seconds / 512);
  if (!Number.isInteger(lock.seconds) || lock.seconds < 0 || units > SEQUENCE_LOCKTIME_MASK) throw new RangeError("0 <= nTime < 33554432");
  return (SEQUENCE_LOCKTIME_TYPE_FLAG | (lock.seconds >>> SEQUENCE_LOCKTIME_GRANULARITY)) >>> 0;
}

/**
 * BIP 68's relative-lock evaluation for one input, given the height and median
 * time past at which the spent output was mined (the MTP of the block before
 * it) and the height / previous-block MTP of the candidate block.
 */
export function relativeSatisfied(
  nSequence: number,
  version: number,
  coin: { height: number; mtpBefore: number },
  block: { height: number; prevMtp: number },
): boolean {
  const r = readSequence(nSequence, version);
  if (!r.enforced) return true;
  // CalculateSequenceLocks keeps "last invalid" semantics (minus one); EvaluateSequenceLocks fails on >=.
  if (r.unit === "blocks") return coin.height + r.value - 1 < block.height;
  return coin.mtpBefore + r.seconds! - 1 < block.prevMtp;
}

/* ---------- BIP 113: median time past ---------- */

/** Median of up to the last 11 block times (fewer near genesis), as GetMedianTimePast computes it. */
export function medianTimePast(times: number[]): number {
  const last = times.slice(-MEDIAN_TIME_SPAN);
  if (!last.length) throw new RangeError("need at least one block time");
  const sorted = [...last].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/* ---------- the opcodes ---------- */

export type CheckId =
  | "stack"
  | "negative"
  | "arg-disabled"
  | "version"
  | "input-disabled"
  | "type"
  | "value"
  | "input-final";

export interface LockCheck {
  id: CheckId;
  label: string;
  ok: boolean;
  /** For "arg-disabled": the opcode stops here and acts as a NOP. */
  stopsHere?: boolean;
  detail: string;
}

export interface OpcodeResult {
  opcode: "CHECKLOCKTIMEVERIFY" | "CHECKSEQUENCEVERIFY";
  argument: bigint;
  /** The checks made, in order, up to and including the first failure (or the NOP exit). */
  checks: LockCheck[];
  ok: boolean;
}

/** BIP 65 and BIP 112 accept a 5-byte script number: up to 2^39 - 1 in magnitude. */
const MAX_5_BYTE = (1n << 39n) - 1n;
function assertArgument(arg: bigint) {
  if (arg > MAX_5_BYTE || arg < -MAX_5_BYTE) throw new TimelockScopeError("argument does not fit the 5-byte script number these opcodes read");
}

const fmt = (n: bigint | number) => n.toLocaleString("en-US");

/** OP_CHECKLOCKTIMEVERIFY on input `index`, following BIP 65's reference implementation. */
export function checkLockTimeVerify(argument: bigint, f: LockFields, index: number): OpcodeResult {
  assertFields(f);
  assertArgument(argument);
  if (!Number.isInteger(index) || index < 0 || index >= f.sequences.length) throw new RangeError("no such input");
  const checks: LockCheck[] = [];
  const done = () => ({ opcode: "CHECKLOCKTIMEVERIFY" as const, argument, checks, ok: checks.every((c) => c.ok) });
  const add = (c: LockCheck) => (checks.push(c), c.ok);
  add({ id: "stack", label: "The stack is not empty", ok: true, detail: `top item: ${fmt(argument)}` });
  if (!add({ id: "negative", label: "The argument is not negative", ok: argument >= 0n, detail: argument >= 0n ? `${fmt(argument)} ≥ 0` : `${fmt(argument)} < 0` })) return done();
  const argKind: LockKind = argument < BigInt(LOCKTIME_THRESHOLD) ? "height" : "time";
  const txKind = lockTimeKind(f.nLockTime);
  if (!add({ id: "type", label: "Argument and nLockTime are the same kind", ok: argKind === txKind, detail: `argument is a ${argKind}, nLockTime ${fmt(f.nLockTime)} is a ${txKind}` })) return done();
  const fits = argument <= BigInt(f.nLockTime);
  if (!add({ id: "value", label: "The argument is not greater than nLockTime", ok: fits, detail: `${fmt(argument)} ${fits ? "≤" : ">"} ${fmt(f.nLockTime)}` })) return done();
  const fin = f.sequences[index] === SEQUENCE_FINAL;
  add({ id: "input-final", label: "This input is not final", ok: !fin, detail: `nSequence 0x${f.sequences[index].toString(16).padStart(8, "0")}${fin ? " would switch nLockTime off" : ""}` });
  return done();
}

/** OP_CHECKSEQUENCEVERIFY on input `index`, following BIP 112's reference implementation. */
export function checkSequenceVerify(argument: bigint, f: LockFields, index: number): OpcodeResult {
  assertFields(f);
  assertArgument(argument);
  if (!Number.isInteger(index) || index < 0 || index >= f.sequences.length) throw new RangeError("no such input");
  const checks: LockCheck[] = [];
  const done = () => ({ opcode: "CHECKSEQUENCEVERIFY" as const, argument, checks, ok: checks.every((c) => c.ok) });
  const add = (c: LockCheck) => (checks.push(c), c.ok);
  add({ id: "stack", label: "The stack is not empty", ok: true, detail: `top item: ${fmt(argument)}` });
  if (!add({ id: "negative", label: "The argument is not negative", ok: argument >= 0n, detail: argument >= 0n ? `${fmt(argument)} ≥ 0` : `${fmt(argument)} < 0` })) return done();
  // Only the low 32 bits can carry flags; the argument may be up to 5 bytes.
  const arg32 = Number(argument & 0xffffffffn) >>> 0;
  if ((arg32 & SEQUENCE_LOCKTIME_DISABLE_FLAG) !== 0) {
    add({ id: "arg-disabled", label: "The argument's disable flag is set: no lock", ok: true, stopsHere: true, detail: "bit 31 is set, so the opcode does nothing (left for future soft forks)" });
    return done();
  }
  add({ id: "arg-disabled", label: "The argument's disable flag is clear", ok: true, detail: "bit 31 is clear" });
  if (!add({ id: "version", label: "Transaction version is at least 2", ok: f.version >= 2, detail: `version ${f.version}` })) return done();
  const seq = f.sequences[index];
  const seqDisabled = (seq & SEQUENCE_LOCKTIME_DISABLE_FLAG) !== 0;
  if (!add({ id: "input-disabled", label: "The input's disable flag is clear", ok: !seqDisabled, detail: `nSequence 0x${seq.toString(16).padStart(8, "0")}: bit 31 ${seqDisabled ? "set" : "clear"}` })) return done();
  const keep = (SEQUENCE_LOCKTIME_TYPE_FLAG | SEQUENCE_LOCKTIME_MASK) >>> 0;
  const argMasked = arg32 & keep, seqMasked = seq & keep;
  const argUnit = argMasked < SEQUENCE_LOCKTIME_TYPE_FLAG ? "blocks" : "time";
  const seqUnit = seqMasked < SEQUENCE_LOCKTIME_TYPE_FLAG ? "blocks" : "time";
  if (!add({ id: "type", label: "Argument and nSequence use the same unit", ok: argUnit === seqUnit, detail: `argument counts ${argUnit}, nSequence counts ${seqUnit}` })) return done();
  add({ id: "value", label: "Masked argument is not greater than masked nSequence", ok: argMasked <= seqMasked, detail: `${fmt(argMasked & SEQUENCE_LOCKTIME_MASK)} ${argMasked <= seqMasked ? "≤" : ">"} ${fmt(seqMasked & SEQUENCE_LOCKTIME_MASK)} (${argUnit === "time" ? "units of 512 s" : "blocks"})` });
  return done();
}

/* ---------- Bitcoin Core's one-input test cases ---------- */

export interface CoreLockScript {
  argument: bigint;
  opcode: "CHECKLOCKTIMEVERIFY" | "CHECKSEQUENCEVERIFY";
  /** The script ends with `1`, pushed after the opcode. */
  trailingOne: boolean;
}

/** Parse the narrow script form the pinned excerpt holds: `<decimal> CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY [1]`. */
export function parseCoreLockScript(asm: string): CoreLockScript {
  const m = /^(-?\d+) (CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY)( 1)?$/.exec(asm);
  if (!m) throw new TimelockScopeError(`script outside this model's scope: ${asm}`);
  return { argument: BigInt(m[1]), opcode: m[2] as CoreLockScript["opcode"], trailingOne: m[3] !== undefined };
}

/**
 * Evaluate a pinned case: the opcode's checks, then the final stack (the
 * argument stays on the stack; a trailing `1` sits above it). Valid when the
 * checks pass and the top item is true.
 */
export function evaluateCoreLockCase(asm: string, f: LockFields, index = 0) {
  const s = parseCoreLockScript(asm);
  const result = s.opcode === "CHECKLOCKTIMEVERIFY" ? checkLockTimeVerify(s.argument, f, index) : checkSequenceVerify(s.argument, f, index);
  const top = s.trailingOne ? 1n : s.argument;
  return { script: s, result, valid: result.ok && top !== 0n };
}
