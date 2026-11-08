import { CHANGES, CURVE_ORDER, DER_CHECKS, HALF_ORDER, applyChange, bip143Digest, changedBytes, checkSignatureEncoding, ecdsaVerify, isLowS, legacySighash, measureTransaction, numbersOf, parseTransaction, readFields, signatureIn, withSignature } from "@bip-atlas/models";
import type { DerFieldView, DerSignatureFixture, DerVariantView, DerivedDerFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE4, checkSourceQuote, pinnedText } from "./sources";

const lineHas = (line: number | undefined, value: string | undefined) => !!value && !!line && pinnedText("bip-0143.mediawiki", SNAPSHOT_PHASE4).split("\n")[line - 1]?.includes(value);
const rev = (hex: string) => hex.match(/../g)!.reverse().join("");
const hex32 = (n: bigint) => n.toString(16).padStart(64, "0");

/** The fields of a signature by its length bytes: 30 [total] 02 [lenR] R 02 [lenS] S [sighash]. */
function fieldsOf(sigHex: string): DerFieldView[] {
  const f = readFields(sigHex);
  const lenR = f.rHex.length / 2, lenS = f.sHex.length / 2;
  return [
    { id: "seq", hex: sigHex.slice(0, 2), label: "sequence (0x30)" },
    { id: "total", hex: sigHex.slice(2, 4), label: "total length" },
    { id: "r-tag", hex: "02", label: "integer (0x02)" },
    { id: "r-len", hex: lenR.toString(16).padStart(2, "0"), label: "R length" },
    { id: "r", hex: f.rHex, label: "R" },
    { id: "s-tag", hex: "02", label: "integer (0x02)" },
    { id: "s-len", hex: lenS.toString(16).padStart(2, "0"), label: "S length" },
    { id: "s", hex: f.sHex, label: "S" },
    { id: "hashtype", hex: f.hashType.toString(16).padStart(2, "0"), label: "sighash type" },
  ];
}

/**
 * A published signature from BIP 143's example and the chapter's changes to
 * it. The signature, key, and (for input 1) digest must be on their lines;
 * the signature must be the one in the transaction and must verify. Each
 * change is computed: BIP 66's check, then LOW_S and ECDSA once it passes.
 */
export function deriveDer(f: DerSignatureFixture): DerivedDerFixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  if (!lineHas(f.txLine, f.txHex)) throw new Error(`${f.id}: transaction not on BIP 143 line ${f.txLine}`);
  if (!lineHas(f.signatureLine, f.signatureHex)) throw new Error(`${f.id}: signature not on line ${f.signatureLine}`);
  if (signatureIn(f.txHex, f.inputIndex, f.where) !== f.signatureHex) throw new Error(`${f.id}: not the signature in input ${f.inputIndex}'s ${f.where}`);
  const tx = parseTransaction(f.txHex);
  let pubkeyHex: string, digestHex: string;
  if (f.digest === "legacy") {
    if (!lineHas(f.scriptPubKeyLine, f.scriptPubKeyHex) || !/^21(0[23][0-9a-f]{64})ac$/.test(f.scriptPubKeyHex!)) throw new Error(`${f.id}: expected the P2PK script on line ${f.scriptPubKeyLine}`);
    pubkeyHex = f.scriptPubKeyHex!.slice(2, -2);
    digestHex = legacySighash(tx, f.inputIndex, f.scriptPubKeyHex!, 1);
  } else {
    for (const [v, l] of [[f.pubkeyHex, f.pubkeyLine], [f.scriptCodeHex, f.scriptCodeLine], [f.amountQuote, f.amountLine], [f.sighashHex, f.sighashLine]] as const) if (!lineHas(l, v)) throw new Error(`${f.id}: ${v} not on line ${l}`);
    pubkeyHex = f.pubkeyHex!;
    digestHex = bip143Digest(tx, f.inputIndex, f.scriptCodeHex!, BigInt(f.amountSats!)).sighashHex;
    if (digestHex !== f.sighashHex) throw new Error(`${f.id}: BIP 143 digest differs from the published one`);
    if (tx.witnesses[f.inputIndex][1] !== pubkeyHex) throw new Error(`${f.id}: witness key differs from the published key`);
  }
  const der = (sig: string) => sig.slice(0, -2);
  const published = numbersOf(f.signatureHex);
  if (!checkSignatureEncoding(f.signatureHex).valid || !isLowS(published.s) || !ecdsaVerify(der(f.signatureHex), digestHex, pubkeyHex)) throw new Error(`${f.id}: the published signature should be strict DER, low S and valid`);
  const base = fieldsOf(f.signatureHex);
  const variants: DerVariantView[] = CHANGES.flatMap(({ id, label }) => {
    const hex = applyChange(f.signatureHex, id);
    if (hex === null) return [];
    const encoding = checkSignatureEncoding(hex);
    const nums = numbersOf(hex);
    const fields = fieldsOf(hex);
    const ids = measureTransaction(parseTransaction(withSignature(f.txHex, f.inputIndex, f.where, hex)));
    return [{
      id,
      label,
      hex,
      bytes: hex.length / 2,
      fields,
      changed: fields.filter((x, i) => x.hex !== base[i].hex).map((x) => x.id),
      encoding,
      rHex: hex32(nums.r),
      sHex: hex32(nums.s),
      sameNumbers: nums.r === published.r && nums.s === published.s,
      ecdsa: encoding.valid ? ecdsaVerify(der(hex), digestHex, pubkeyHex) : null,
      lowS: encoding.valid ? isLowS(nums.s) : null,
      txidHex: rev(ids.txidHex),
      wtxidHex: rev(ids.wtxidHex),
    }];
  });
  // What the chapter says about each change.
  const v = Object.fromEntries(variants.map((x) => [x.id, x]));
  const expect = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`${f.id}: ${what}; update the prose`);
  };
  expect(v["zero-added"].encoding.failed?.line === 101 && v["zero-added"].sameNumbers, "an extra zero in S should fail at line 101 with the same numbers");
  expect(v["length-byte"].encoding.failed?.line === 62 && v["length-byte"].sameNumbers, "a wrong length byte should fail at line 62");
  expect(v["s-flipped"].encoding.valid && v["s-flipped"].ecdsa === true && v["s-flipped"].lowS === false, "n − S should be strict DER, valid ECDSA, and high S");
  if (v["pad-removed"]) expect(v["pad-removed"].encoding.failed?.line === 84 && v["pad-removed"].sameNumbers, "removing R's pad should fail at line 84");
  const flipped = v["s-flipped"];
  expect(changedBytes(f.signatureHex, flipped.hex).length > 0, "flip changes bytes");
  expect((flipped.txidHex === v.published.txidHex) === (f.where === "witness"), "a witness flip keeps the txid and a scriptSig flip changes it");
  expect(flipped.wtxidHex !== v.published.wtxidHex, "a flip changes the wtxid");
  const frac = (s: bigint) => Number((s * 1_000_000n) / CURVE_ORDER) / 1_000_000;
  return {
    ...f,
    derived: {
      pubkeyHex,
      digestHex,
      checks: DER_CHECKS.map(({ id, line, label }) => ({ id, line, label })),
      sFraction: frac(published.s),
      flippedFraction: frac(CURVE_ORDER - published.s),
      halfOrderHex: hex32(HALF_ORDER),
      orderHex: hex32(CURVE_ORDER),
      published: { txidHex: v.published.txidHex, wtxidHex: v.published.wtxidHex },
      variants,
    },
  };
}
