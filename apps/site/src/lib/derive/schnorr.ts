import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, parseBip340Csv, nobleVerify, verifyTrace } from "@bip-atlas/models";
import type { DerivedSchnorrFixture, SchnorrDerived, SchnorrVectorFixture } from "@bip-atlas/figures";
import { pinnedText } from "./sources";

let bip340: ReturnType<typeof parseBip340Csv> | null = null;
const bip340Vectors = () => (bip340 ??= parseBip340Csv(pinnedText("bip-0340/test-vectors.csv")));

/**
 * A BIP340 vector, checked field by field against the pinned CSV, traced
 * against its own message and against every other message in the same figure.
 */
export function deriveSchnorr(f: SchnorrVectorFixture, group: SchnorrVectorFixture[]): DerivedSchnorrFixture {
  const v = bip340Vectors().find((x) => x.line === f.source.line);
  if (
    !v || v.index !== f.vectorIndex || v.publicKeyHex !== f.publicKeyHex || v.messageHex !== f.messageHex ||
    v.signatureHex !== f.signatureHex || v.result !== f.expected || v.comment !== f.comment
  ) {
    throw new Error(`${f.id}: fixture differs from test-vectors.csv line ${f.source.line}`);
  }
  const messages: SchnorrDerived["messages"] = [];
  for (const g of group) {
    if (!messages.some((m) => m.hex === g.messageHex)) {
      messages.push({ key: `m${g.vectorIndex}`, fromVector: g.vectorIndex, hex: g.messageHex, bytes: g.messageHex.length / 2 });
    }
  }
  const traces: SchnorrDerived["traces"] = {};
  for (const m of messages) {
    const t = verifyTrace(f.publicKeyHex, m.hex, f.signatureHex);
    if (nobleVerify(f.publicKeyHex, m.hex, f.signatureHex) !== t.valid) throw new Error(`${f.id}: step-by-step verdict differs from noble for message ${m.key}`);
    traces[m.key] = { valid: t.valid, failedStage: t.failedStage, steps: t.steps };
  }
  const ownMessage = messages.find((m) => m.hex === f.messageHex)!.key;
  if (traces[ownMessage].valid !== f.expected) throw new Error(`${f.id}: model verdict differs from the published result`);
  const own = verifyTrace(f.publicKeyHex, f.messageHex, f.signatureHex);
  return {
    ...f,
    derived: {
      messages,
      ownMessage,
      traces,
      challengeTagHex: bytesToHex(sha256(new TextEncoder().encode("BIP0340/challenge"))),
      challengeHashHex: own.steps.find((s) => s.stage === "challenge")?.values.hash ?? null,
    },
  };
}
