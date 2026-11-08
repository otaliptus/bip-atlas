import { bip143Digest, bytesToHex, hexToBytes, measureTransaction, parseTransaction, hash160, p2wpkh } from "@bip-atlas/models";
import type { DerivedTransactionFixture, TransactionFixture, TxInputView } from "@bip-atlas/figures";
import { btc } from "./psbt";

export function deriveTransaction(f: TransactionFixture): DerivedTransactionFixture {
  const tx = parseTransaction(f.txHex);
  if (tx.segments.map((s) => s.hex).join("") !== f.txHex) throw new Error(`${f.id}: transaction does not round-trip`);
  const s = f.sighash;
  const digest = bip143Digest(tx, s.inputIndex, s.scriptCodeHex, BigInt(s.amountSats));
  if (digest.preimageHex !== s.preimageHex || digest.sighashHex !== s.sighashHex) {
    throw new Error(`${f.id}: BIP143 digest differs from the published example`);
  }
  const ids = (prefix: string, suffix = "") => tx.segments.filter((g) => g.id.startsWith(prefix) && g.id.endsWith(suffix)).map((g) => g.id);
  const i = s.inputIndex;
  const sources: Record<string, { from: string[]; note: string }> = {
    version: { from: ["version"], note: "copied from the transaction" },
    hashPrevouts: { from: ids("input.", ".outpoint"), note: "double SHA-256 of every input’s outpoint" },
    hashSequence: { from: ids("input.", ".sequence"), note: "double SHA-256 of every input’s nSequence" },
    outpoint: { from: [`input.${i}.outpoint`], note: "the input being signed" },
    scriptCode: tx.inputs[i].scriptSigHex
      ? { from: [`input.${i}.scriptsig`], note: `built from the 20-byte witness program inside this input’s redeemScript (BIP 143 line ${s.scriptCodeLine})` }
      : { from: [], note: `built from the spent output’s 20-byte program, which is not in this transaction (BIP 143 line ${s.scriptCodeLine})` },
    amount: { from: [], note: `not in this transaction: the value of the output being spent (BIP 143 line ${s.amountLine})` },
    sequence: { from: [`input.${i}.sequence`], note: "the input being signed" },
    hashOutputs: { from: ids("output."), note: "double SHA-256 of every output" },
    locktime: { from: ["locktime"], note: "copied from the transaction" },
    hashType: { from: [], note: "SIGHASH_ALL, chosen by the signer" },
  };
  // Per-input view for the drawings, from the reviewed input kinds, checked structurally.
  const program = s.scriptCodeHex.match(/^1976a914([0-9a-f]{40})88ac$/)?.[1];
  if (!program) throw new Error(`${f.id}: scriptCode is not the P2WPKH template`);
  if (f.inputKinds.length !== tx.inputs.length) throw new Error(`${f.id}: one input kind per input expected`);
  const inputs = tx.inputs.map((inp, k): TxInputView => {
    const kind = f.inputKinds[k];
    const witness = tx.witnesses[k] ?? [];
    const sig = inp.scriptSigHex;
    const p2wpkh = () => {
      if (witness.length !== 2) throw new Error(`${f.id}: input ${k} P2WPKH witness must have two items`);
      if (k !== s.inputIndex || bytesToHex(hash160(hexToBytes(witness[1]))) !== program) throw new Error(`${f.id}: input ${k} key does not hash to the program`);
    };
    if (kind.startsWith("P2PK (legacy)")) {
      const n = parseInt(sig.slice(0, 2), 16);
      if (!(n >= 1 && n <= 75 && sig.length === 2 + 2 * n) || witness.length) throw new Error(`${f.id}: input ${k} is not a single-push P2PK spend`);
      return { kind, scriptSigHex: sig, scriptSig: "signature-push", witness, witnessKind: "empty", programHex: null };
    }
    if (kind.startsWith("P2WPKH")) {
      if (sig !== "") throw new Error(`${f.id}: native input ${k} must have an empty scriptSig`);
      p2wpkh();
      return { kind, scriptSigHex: sig, scriptSig: "empty", witness, witnessKind: "p2wpkh", programHex: program };
    }
    if (kind.startsWith("P2SH-P2WPKH")) {
      if (sig !== `160014${program}`) throw new Error(`${f.id}: input ${k} scriptSig is not a push of the 22-byte program`);
      p2wpkh();
      return { kind, scriptSigHex: sig, scriptSig: "program-push", witness, witnessKind: "p2wpkh", programHex: program };
    }
    throw new Error(`${f.id}: input kind "${kind}" is outside the reviewed set`);
  });
  const sats = BigInt(s.amountSats);
  return {
    ...f,
    derived: {
      segments: tx.segments,
      measures: measureTransaction(tx),
      digest: { items: digest.items.map((it) => ({ ...it, ...sources[it.id] })), sighashHex: digest.sighashHex },
      inputs,
      amountBtc: btc(sats),
    },
  };
}
