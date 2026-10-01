/**
 * Bech32 / Bech32m teaching model for SegWit addresses (BIPs 173 and 350).
 *
 * A TypeScript port of scripts/demo_models.py that also reports WHICH
 * validation stage accepted or rejected an input, so a figure can show it.
 * It is not a wallet library: it checks address syntax and encoding only.
 * It never corrects input, and a passing result says nothing about
 * spendability, ownership, balance, or recipient safety.
 */
import { bytesToHex } from "./hex";

export const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
/** BIP173: a valid Bech32 string leaves this residue. */
export const BECH32_CONST = 1;
/** BIP350: a valid Bech32m string leaves this residue. */
export const BECH32M_CONST = 0x2bc830a3;

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3] as const;

export type Encoding = "bech32" | "bech32m";
export type Network = "bc" | "tb";

export type StageId = "characters" | "structure" | "checksum" | "network" | "program" | "family";

export interface StageDefinition {
  id: StageId;
  label: string;
  question: string;
}

/** Order matches the checks in scripts/demo_models.py and BIP350's decode(). */
export const STAGES: readonly StageDefinition[] = [
  { id: "characters", label: "Characters", question: "Printable ASCII, 8–90 long, not mixed case?" },
  { id: "structure", label: "Structure", question: "Prefix, separator “1”, and a data part from the 32-character alphabet?" },
  { id: "checksum", label: "Checksum", question: "Does the residue equal the Bech32 or the Bech32m constant?" },
  { id: "network", label: "Network", question: "Is the prefix the expected one (bc or tb)?" },
  { id: "program", label: "Program", question: "Version 0–16, clean padding, 2–40 bytes (20 or 32 for v0)?" },
  { id: "family", label: "Family", question: "Bech32 for v0, Bech32m for v1–v16?" },
];

export type StageStatus = "pass" | "fail" | "not-reached";

export interface StageOutcome {
  id: StageId;
  status: StageStatus;
  note: string;
}

export type CharacterRole = "hrp" | "separator" | "version" | "program" | "checksum" | "unparsed";

export interface AddressAnalysis {
  input: string;
  expectedHrp: Network;
  valid: boolean;
  failedStage: StageId | null;
  reason: string | null;
  stages: StageOutcome[];
  /** Per input character; "unparsed" when the structure stage was not passed. */
  roles: CharacterRole[];
  hrp: string | null;
  /** Polymod residue over the lowercase form, when the structure stage passed. */
  residue: number | null;
  encoding: Encoding | null;
  witnessVersion: number | null;
  programHex: string | null;
  scriptPubKeyHex: string | null;
  scope: "address syntax and encoding only; not spendability or ownership";
}

export function polymod(values: readonly number[]): number {
  let state = 1;
  for (const symbol of values) {
    if (!Number.isInteger(symbol) || symbol < 0 || symbol > 31) {
      throw new RangeError("Invalid five-bit symbol.");
    }
    const high = state >>> 25;
    state = (((state & 0x1ffffff) << 5) ^ symbol) >>> 0;
    for (let bit = 0; bit < 5; bit++) {
      if ((high >>> bit) & 1) state = (state ^ GENERATOR[bit]) >>> 0;
    }
  }
  return state;
}

export function hrpExpand(hrp: string): number[] {
  const codes = [...hrp].map((c) => c.charCodeAt(0));
  return [...codes.map((c) => c >> 5), 0, ...codes.map((c) => c & 31)];
}

/** Classify a residue. Anything other than the two constants is a mismatch. */
export function encodingForResidue(residue: number): Encoding | null {
  if (residue === BECH32_CONST) return "bech32";
  if (residue === BECH32M_CONST) return "bech32m";
  return null;
}

export class DecodeError extends Error {
  constructor(readonly stage: StageId, message: string) {
    super(message);
  }
}

export interface GenericDecoding {
  hrp: string;
  /** Data-part values without the six checksum symbols. */
  data: number[];
  encoding: Encoding;
  residue: number;
}

function checkCharacters(text: string): void {
  if (text.length < 8 || text.length > 90) {
    throw new DecodeError("characters", `Length ${text.length} is outside 8–90 characters.`);
  }
  for (const c of text) {
    const code = c.charCodeAt(0);
    if (c.length !== 1 || code < 33 || code > 126) {
      throw new DecodeError("characters", "Contains a character outside printable US-ASCII (33–126).");
    }
  }
  if (text.toLowerCase() !== text && text.toUpperCase() !== text) {
    throw new DecodeError("characters", "Mixes uppercase and lowercase letters.");
  }
}

function splitStructure(lower: string): { hrp: string; split: number; values: number[] } {
  const split = lower.lastIndexOf("1");
  if (split < 1) {
    throw new DecodeError("structure", split === 0 ? "Empty human-readable part." : "No separator “1”.");
  }
  if (lower.length - split - 1 < 6) {
    throw new DecodeError("structure", "Data part is shorter than the six-character checksum.");
  }
  const values: number[] = [];
  for (const c of lower.slice(split + 1)) {
    const value = CHARSET.indexOf(c);
    if (value < 0) throw new DecodeError("structure", `“${c}” is not in the Bech32 alphabet.`);
    values.push(value);
  }
  return { hrp: lower.slice(0, split), split, values };
}

/** Generic Bech32/Bech32m decoding (BIP173 + BIP350), with no SegWit rules. */
export function decodeGeneric(text: string): GenericDecoding {
  checkCharacters(text);
  const lower = text.toLowerCase();
  const { hrp, values } = splitStructure(lower);
  const residue = polymod([...hrpExpand(hrp), ...values]);
  const encoding = encodingForResidue(residue);
  if (!encoding) throw new DecodeError("checksum", "Checksum mismatch: the residue matches neither constant.");
  return { hrp, data: values.slice(0, -6), encoding, residue };
}

/** 5-bit → 8-bit regrouping with BIP173's padding rules. */
export function fiveBitToBytes(values: readonly number[]): Uint8Array {
  let accumulator = 0;
  let bits = 0;
  const out: number[] = [];
  for (const value of values) {
    if (value < 0 || value > 31) throw new RangeError("Invalid five-bit value.");
    accumulator = ((accumulator << 5) | value) & 0xfff;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out.push((accumulator >> bits) & 0xff);
    }
  }
  if (bits >= 5) {
    throw new DecodeError("program", "More than 4 bits of padding.");
  }
  if ((accumulator << (8 - bits)) & 0xff) {
    throw new DecodeError("program", "Padding bits are not all zero.");
  }
  return Uint8Array.from(out);
}

export interface FiveBitGroup {
  bits: string;
  value: number;
  char: string;
  /** True when this group includes zero bits appended as padding. */
  padded: boolean;
}

/** 8-bit → 5-bit regrouping used when encoding a witness program (BIP173). */
export function bytesToFiveBitGroups(bytes: Uint8Array): FiveBitGroup[] {
  const bitString = [...bytes].map((b) => b.toString(2).padStart(8, "0")).join("");
  const groups: FiveBitGroup[] = [];
  for (let i = 0; i < bitString.length; i += 5) {
    const raw = bitString.slice(i, i + 5);
    const bits = raw.padEnd(5, "0");
    const value = parseInt(bits, 2);
    groups.push({ bits, value, char: CHARSET[value], padded: raw.length < 5 });
  }
  return groups;
}

const SCOPE = "address syntax and encoding only; not spendability or ownership" as const;

/** Run every stage in order and report where (if anywhere) the input is rejected. */
export function analyzeSegwitAddress(input: string, expectedHrp: Network): AddressAnalysis {
  if (expectedHrp !== "bc" && expectedHrp !== "tb") {
    throw new RangeError("This teaching model only accepts an explicit bc or tb expectation.");
  }
  const notes = new Map<StageId, string>();
  const roles: CharacterRole[] = [...input].map(() => "unparsed");
  const result: AddressAnalysis = {
    input, expectedHrp, valid: false, failedStage: null, reason: null, stages: [], roles,
    hrp: null, residue: null, encoding: null, witnessVersion: null, programHex: null,
    scriptPubKeyHex: null, scope: SCOPE,
  };

  try {
    checkCharacters(input);
    notes.set("characters", `${input.length} printable characters, single case.`);

    const lower = input.toLowerCase();
    const { hrp, split, values } = splitStructure(lower);
    result.hrp = hrp;
    for (let i = 0; i < input.length; i++) {
      if (i < split) roles[i] = "hrp";
      else if (i === split) roles[i] = "separator";
      else if (i >= input.length - 6) roles[i] = "checksum";
      else if (i === split + 1) roles[i] = "version";
      else roles[i] = "program";
    }
    notes.set("structure", `Prefix “${hrp}”, separator at position ${split + 1}, ${values.length}-character data part.`);

    const residue = polymod([...hrpExpand(hrp), ...values]);
    result.residue = residue;
    const encoding = encodingForResidue(residue);
    if (!encoding) {
      throw new DecodeError("checksum", "Checksum mismatch: the residue matches neither constant.");
    }
    result.encoding = encoding;
    notes.set("checksum", `Residue equals the ${encoding === "bech32" ? "Bech32" : "Bech32m"} constant.`);

    if (hrp !== expectedHrp) {
      throw new DecodeError("network", `Prefix “${hrp}” is not the expected “${expectedHrp}”.`);
    }
    notes.set("network", `Prefix “${hrp}” matches.`);

    const data = values.slice(0, -6);
    if (data.length === 0) throw new DecodeError("program", "No witness version: the data part is only a checksum.");
    const version = data[0];
    if (version > 16) throw new DecodeError("program", `Witness version ${version} is above 16.`);
    result.witnessVersion = version;
    const program = fiveBitToBytes(data.slice(1));
    if (program.length < 2 || program.length > 40) {
      throw new DecodeError("program", `Witness program is ${program.length} bytes; it must be 2–40.`);
    }
    if (version === 0 && program.length !== 20 && program.length !== 32) {
      throw new DecodeError("program", `A version 0 program must be 20 or 32 bytes, not ${program.length}.`);
    }
    notes.set("program", `Version ${version}, ${program.length}-byte program.`);

    const expected: Encoding = version === 0 ? "bech32" : "bech32m";
    if (encoding !== expected) {
      throw new DecodeError(
        "family",
        `Version ${version} requires ${expected === "bech32" ? "Bech32" : "Bech32m"}, but the checksum is ${encoding === "bech32" ? "Bech32" : "Bech32m"}.`,
      );
    }
    notes.set("family", `Version ${version} with ${encoding === "bech32" ? "Bech32" : "Bech32m"}, as required.`);

    const opcode = version === 0 ? 0x00 : 0x50 + version;
    result.programHex = bytesToHex(program);
    result.scriptPubKeyHex = bytesToHex(Uint8Array.from([opcode, program.length, ...program]));
    result.valid = true;
  } catch (error) {
    if (!(error instanceof DecodeError)) throw error;
    result.failedStage = error.stage;
    result.reason = error.message;
    notes.set(error.stage, error.message);
  }

  let reached = true;
  result.stages = STAGES.map(({ id }) => {
    if (!reached) return { id, status: "not-reached", note: "" };
    if (id === result.failedStage) {
      reached = false;
      return { id, status: "fail", note: notes.get(id) ?? "" };
    }
    return { id, status: "pass", note: notes.get(id) ?? "" };
  });
  return result;
}

export function formatResidue(residue: number): string {
  return `0x${residue.toString(16).padStart(8, "0")}`;
}
