import type { Role } from "../kit";
import type { TransactionDerived } from "../types";

/** One drawn field of a serialized transaction: a model segment, or a part of one (length prefix, item). */
export interface TxField {
  id: string;
  /** The model segment this field belongs to (for lenses and the BIP 143 sources). */
  seg: string;
  part: "base" | "marker" | "witness";
  /** Name for desc and disclosure. */
  label: string;
  /** Short name drawn inside the field when it fits. */
  short: string;
  hex: string;
  bytes: number;
  role: Role;
}

const one = (hex: string, what: string) => {
  if (parseInt(hex.slice(0, 2), 16) >= 0xfd) throw new Error(`${what}: multi-byte length prefixes are outside this drawing`);
  return hex.slice(0, 2);
};

/**
 * Splits the model's segments into the fields the SegWit drawings colour:
 * the previous txid (hash) apart from its index, length prefixes apart from
 * what they count, the signature and key of a P2WPKH witness, nSequence and
 * nLockTime (time). The fields concatenate to the transaction exactly; this
 * throws otherwise.
 */
export function txFields(d: TransactionDerived): TxField[] {
  const out: TxField[] = [];
  const add = (seg: { id: string; part: TxField["part"] }, id: string, label: string, short: string, hex: string, role: Role) =>
    out.push({ id, seg: seg.id, part: seg.part, label, short, hex, bytes: hex.length / 2, role });
  for (const s of d.segments) {
    const i = s.index ?? 0;
    const input = d.inputs[i];
    if (s.id === "version") add(s, s.id, "nVersion", "nVersion", s.hex, "plain");
    else if (s.id === "marker" || s.id === "flag") add(s, s.id, s.label, s.label, s.hex, "plain");
    else if (s.id === "input-count" || s.id === "output-count") add(s, s.id, s.label, "n", s.hex, "plain");
    else if (s.id.endsWith(".outpoint")) {
      add(s, `${s.id}.txid`, `input ${i} · previous txid`, "previous txid", s.hex.slice(0, 64), "hash");
      add(s, `${s.id}.vout`, `input ${i} · output index`, "index", s.hex.slice(64), "plain");
    } else if (s.id.endsWith(".scriptsig")) {
      const len = one(s.hex, s.id);
      add(s, `${s.id}.len`, `input ${i} · scriptSig length`, "len", len, "plain");
      const body = s.hex.slice(2);
      if (body !== input.scriptSigHex) throw new Error(`${s.id}: scriptSig differs from the input view`);
      if (input.scriptSig === "signature-push") {
        add(s, `${s.id}.push`, `input ${i} · scriptSig push opcode`, "push", body.slice(0, 2), "plain");
        add(s, `${s.id}.body`, `input ${i} · scriptSig: the signature`, "scriptSig · signature", body.slice(2), "sig");
      } else if (input.scriptSig === "program-push") {
        add(s, `${s.id}.push`, `input ${i} · scriptSig push opcode`, "push", body.slice(0, 2), "plain");
        add(s, `${s.id}.version`, `input ${i} · redeem script: witness version 0`, "v0", body.slice(2, 4), "plain");
        add(s, `${s.id}.push20`, `input ${i} · redeem script: push of 20 bytes`, "push", body.slice(4, 6), "plain");
        add(s, `${s.id}.body`, `input ${i} · redeem script: the 20-byte witness program (a key hash)`, "program", body.slice(6), "hash");
      } else if (body) throw new Error(`${s.id}: expected an empty scriptSig`);
    } else if (s.id.endsWith(".sequence")) add(s, s.id, `input ${i} · nSequence`, "nSequence", s.hex, "time");
    else if (s.id.endsWith(".value")) add(s, s.id, `output ${i} · value`, "value", s.hex, "plain");
    else if (s.id.endsWith(".script")) {
      add(s, `${s.id}.len`, `output ${i} · script length`, "len", one(s.hex, s.id), "plain");
      add(s, `${s.id}.body`, `output ${i} · scriptPubKey`, "scriptPubKey", s.hex.slice(2), "plain");
    } else if (s.id.startsWith("witness.")) {
      add(s, `${s.id}.count`, `witness ${i} · item count`, "n", one(s.hex, s.id), "plain");
      let at = 2;
      input.witness.forEach((item, k) => {
        const len = one(s.hex.slice(at), s.id);
        add(s, `${s.id}.len${k}`, `witness ${i} · item ${k} length`, "len", len, "plain");
        at += 2;
        const p2wpkh = input.witnessKind === "p2wpkh";
        const name = p2wpkh ? (k === 0 ? "signature" : "public key") : `item ${k}`;
        add(s, `${s.id}.item${k}`, `witness ${i} · ${name}`, name, s.hex.slice(at, at + item.length), p2wpkh ? (k === 0 ? "sig" : "public") : "plain");
        at += item.length;
      });
      if (at !== s.hex.length) throw new Error(`${s.id}: witness items do not fill the field`);
    } else if (s.id === "locktime") add(s, s.id, "nLockTime", "nLockTime", s.hex, "time");
    else throw new Error(`Unknown segment ${s.id}`);
  }
  if (out.map((f) => f.hex).join("") !== d.segments.map((s) => s.hex).join("")) throw new Error("Fields do not reassemble the transaction");
  return out;
}

/** Byte count of each serialization group, in serialization order (for tapes and weights). */
export function txGroups(d: TransactionDerived) {
  const sum = (test: (id: string, part: string) => boolean) => d.segments.filter((s) => test(s.id, s.part)).reduce((n, s) => n + s.hex.length / 2, 0);
  return [
    { key: "version", label: "nVersion", bytes: sum((id) => id === "version"), part: "base" as const },
    { key: "marker", label: "marker + flag", bytes: sum((_, p) => p === "marker"), part: "marker" as const },
    { key: "inputs", label: "inputs", bytes: sum((id) => id.startsWith("input")), part: "base" as const },
    { key: "outputs", label: "outputs", bytes: sum((id) => id.startsWith("output")), part: "base" as const },
    { key: "witness", label: "witness", bytes: sum((_, p) => p === "witness"), part: "witness" as const },
    { key: "locktime", label: "nLockTime", bytes: sum((id) => id === "locktime"), part: "base" as const },
  ];
}

/** Palette role of a BIP 143 preimage item: summary hashes yellow, nSequence and nLockTime orange. */
export const preimageRole = (id: string): Role =>
  id === "hashPrevouts" || id === "hashSequence" || id === "hashOutputs" ? "hash" : id === "sequence" || id === "locktime" ? "time" : "plain";

/** Name of a BIP 143 sighash type item; this teaching model signs SIGHASH_ALL only, so anything else throws. */
export function sighashName(hex: string): "SIGHASH_ALL" {
  if (hex !== "01000000") throw new Error(`sighash type ${hex} is outside this drawing`);
  return "SIGHASH_ALL";
}

export const shortHex = (hex: string, n = 8) => `${hex.slice(0, n)}…`;
