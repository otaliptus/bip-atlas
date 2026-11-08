import { parseTransaction, analyzeSegwitAddress, checkControlBlock, sigMsg, taprootOutput, taprootSighash, verifyKeyPath } from "@bip-atlas/models";
import type { TaprootTreeDerived, DerivedTaprootKeyspendFixture, DerivedTaprootTreeFixture, TaprootKeyspendFixture, TaprootTreeFixture } from "@bip-atlas/figures";
import { pinnedText, resolvePointer } from "./sources";

let walletVectors: any = null;
const bip341Vectors = () => (walletVectors ??= JSON.parse(pinnedText("bip-0341/wallet-test-vectors.json")));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Read a script made of pushes and OP_CHECKSIG; anything else is described by size only. */
function readScript(hex: string): string {
  const parts: string[] = [];
  for (let i = 0; i < hex.length; ) {
    const op = parseInt(hex.slice(i, i + 2), 16);
    i += 2;
    if (op >= 1 && op <= 75) {
      const data = hex.slice(i, i + op * 2);
      i += op * 2;
      const ascii = /^(?:[2-7][0-9a-f])+$/.test(data) ? String.fromCharCode(...(data.match(/../g) ?? []).map((h) => parseInt(h, 16))) : null;
      parts.push(op === 32 ? "<32-byte key>" : ascii && /^[ -~]+$/.test(ascii) ? `<push “${ascii}”>` : `<${op}-byte push>`);
    } else if (op === 0xac) parts.push("OP_CHECKSIG");
    else return `${hex.length / 2}-byte script`;
  }
  return parts.join(" ");
}

function spendingTx(pointer = "keyPathSpending[0]") {
  const k = resolvePointer(bip341Vectors(), pointer);
  const tx = parseTransaction(k.given.rawUnsignedTx);
  const spent = k.given.utxosSpent.map((u: { scriptPubKey: string; amountSats: number }) => ({ scriptPubKeyHex: u.scriptPubKey, amountSats: BigInt(u.amountSats) }));
  return { tx, spent };
}

/** A BIP341 scriptPubKey vector: recomputed and compared with every published intermediate and expected value. */
export function deriveTaprootTree(f: TaprootTreeFixture): DerivedTaprootTreeFixture {
  const pinned = resolvePointer(bip341Vectors(), f.source.pointer!);
  if (!pinned || !same(pinned.given, f.given) || !same(pinned.intermediary, f.intermediary) || !same(pinned.expected, f.expected)) {
    throw new Error(`${f.id}: fixture differs from wallet-test-vectors.json ${f.source.pointer}`);
  }
  const out = taprootOutput(f.given.internalPubkey, f.given.scriptTree as never);
  const byId = [...out.leaves].sort((a, b) => a.id - b.id);
  if (
    !same(byId.map((l) => l.leafHash), f.intermediary.leafHashes ?? []) || out.merkleRootHex !== f.intermediary.merkleRoot ||
    out.tweak.tweakHex !== f.intermediary.tweak || out.tweak.outputKeyHex !== f.intermediary.tweakedPubkey ||
    out.scriptPubKeyHex !== f.expected.scriptPubKey || !same(byId.map((l) => out.controlBlocks[out.leaves.indexOf(l)]), f.expected.scriptPathControlBlocks ?? [])
  ) {
    throw new Error(`${f.id}: model output differs from the published BIP341 vector`);
  }
  const addr = analyzeSegwitAddress(f.expected.bip350Address, "bc");
  if (!addr.valid || addr.witnessVersion !== 1 || addr.programHex !== out.tweak.outputKeyHex) throw new Error(`${f.id}: address does not carry the output key`);
  const leaves = byId.map((l) => {
    const cb = out.controlBlocks[out.leaves.indexOf(l)];
    const check = checkControlBlock(out.tweak.outputKeyHex, l.scriptHex, cb);
    if (!check.ok) throw new Error(`${f.id}: control block for leaf ${l.id} does not verify`);
    return { id: l.id, leafVersion: l.leafVersion, scriptHex: l.scriptHex, scriptReading: readScript(l.scriptHex), leafHash: l.leafHash, path: l.path, controlBlockHex: cb, check: check.steps };
  });
  let keySpend: TaprootTreeDerived["keySpend"] = null;
  if (f.keySpend) {
    const k = f.keySpend;
    const pk = resolvePointer(bip341Vectors(), k.pointer);
    if (!pk || pk.given.txinIndex !== k.txinIndex || pk.given.hashType !== k.hashType || pk.intermediary.sigHash !== k.sigHash || !same(pk.expected.witness, k.witness) || pk.given.merkleRoot !== f.intermediary.merkleRoot) {
      throw new Error(`${f.id}: key-path spend differs from ${k.pointer}`);
    }
    const { tx, spent } = spendingTx();
    if (spent[k.txinIndex].scriptPubKeyHex !== f.expected.scriptPubKey) throw new Error(`${f.id}: key-path spend is not for this output`);
    const sighashFor = (ht: number) => taprootSighash(sigMsg(tx, spent, k.txinIndex, ht));
    if (sighashFor(k.hashType) !== k.sigHash) throw new Error(`${f.id}: model sighash differs from the vector`);
    const verified = verifyKeyPath(out.tweak.outputKeyHex, k.witness[0], sighashFor);
    if (!verified) throw new Error(`${f.id}: published key-path signature does not verify`);
    keySpend = { signatureHex: k.witness[0], hashType: k.hashType, sighashHex: k.sigHash, verified };
  }
  return {
    ...f,
    derived: {
      internalKeyHex: out.internalKeyHex,
      merkleRootHex: out.merkleRootHex,
      tweakHex: out.tweak.tweakHex,
      outputKeyHex: out.tweak.outputKeyHex,
      parity: out.tweak.parity,
      scriptPubKeyHex: out.scriptPubKeyHex,
      address: f.expected.bip350Address,
      root: out.node,
      leaves,
      keySpend,
    },
  };
}

const SIGMSG_NOTES: Record<string, string> = {
  hash_type: "which parts are signed; 0x00 means SIGHASH_DEFAULT",
  nVersion: "from the transaction",
  nLockTime: "from the transaction",
  sha_prevouts: "every input’s outpoint",
  sha_amounts: "the amount of every output being spent",
  sha_scriptpubkeys: "the scriptPubKey of every output being spent",
  sha_sequences: "every input’s nSequence",
  sha_outputs: "every output this transaction creates",
  spend_type: "key path, no annex",
  input_index: "which input this signature is for",
};

export function deriveTaprootKeyspend(f: TaprootKeyspendFixture): DerivedTaprootKeyspendFixture {
  const pinned = resolvePointer(bip341Vectors(), f.source.pointer!);
  const entry = pinned?.inputSpending.find((i: any) => i.given.txinIndex === f.inputSpending.given.txinIndex);
  const strip = (e: any) => ({ ...e, given: { ...e.given, internalPrivkey: undefined }, intermediary: { ...e.intermediary, tweakedPrivkey: undefined } });
  if (!pinned || pinned.given.rawUnsignedTx !== f.rawUnsignedTx || !same(pinned.given.utxosSpent, f.utxosSpent) || !entry || !same(JSON.parse(JSON.stringify(strip(entry))), f.inputSpending)) {
    throw new Error(`${f.id}: fixture differs from wallet-test-vectors.json ${f.source.pointer}`);
  }
  const { tx, spent } = spendingTx(f.source.pointer);
  const g = f.inputSpending.given;
  const items = sigMsg(tx, spent, g.txinIndex, g.hashType);
  const sighash = taprootSighash(items);
  if ("00" + items.map((i) => i.hex).join("") !== f.inputSpending.intermediary.sigMsg || sighash !== f.inputSpending.intermediary.sigHash) {
    throw new Error(`${f.id}: model SigMsg or sighash differs from the vector`);
  }
  const q = spent[g.txinIndex].scriptPubKeyHex.slice(4);
  if (!verifyKeyPath(q, f.inputSpending.expected.witness[0], (ht) => taprootSighash(sigMsg(tx, spent, g.txinIndex, ht)))) {
    throw new Error(`${f.id}: published signature does not verify`);
  }
  const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n).toString();
  return {
    ...f,
    derived: {
      inputs: tx.inputs.length,
      outputs: tx.outputs.length,
      txinIndex: g.txinIndex,
      hashType: g.hashType,
      items: items.map((i) => ({ ...i, bytes: i.hex.length / 2, note: SIGMSG_NOTES[i.id] ?? "" })),
      sigMsgBytes: items.reduce((n, i) => n + i.hex.length / 2, 0),
      sighashHex: sighash,
      totalSpentSats: sum(spent.map((s: { amountSats: bigint }) => s.amountSats)),
      totalOutSats: sum(tx.outputs.map((o) => o.valueSats)),
    },
  };
}
