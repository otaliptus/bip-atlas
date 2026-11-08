import { keyAgg, keyAggAndTweak, keyAggCoeff, musigHashKeys, nonceAgg, partialSigAgg, partialSigVerify, sessionValues, pointHex, hasEvenYPoint, xonlyPk, getSecondKey, InvalidContributionError, bip340Verify, naiveSumXonly } from "@bip-atlas/models";
import type { Musig2SessionFixture, DerivedMusig2SessionFixture, Musig2KeyaggFixture, DerivedMusig2KeyaggFixture, Musig2PsigChecksFixture, DerivedMusig2PsigChecksFixture } from "@bip-atlas/figures";
import { HX, SNAPSHOT_PHASE3, big, checkSourceQuote, hx, pinnedText } from "./sources";

const musigVectors = (name: string) => JSON.parse(pinnedText(`bip-0327/vectors/${name}.json`, SNAPSHOT_PHASE3));


export function deriveMusig2Session(f: Musig2SessionFixture): DerivedMusig2SessionFixture {
  checkSourceQuote(f);
  const d = musigVectors("sig_agg_vectors");
  const c = d.valid_test_cases[f.caseIndex];
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), T = d.tweaks.map(hx), S = d.psigs.map(hx), msg = hx(d.msg);
  const pubkeys: Uint8Array[] = c.key_indices.map((i: number) => X[i]);
  const pubnonces: Uint8Array[] = c.nonce_indices.map((i: number) => P[i]);
  const tweaks: Uint8Array[] = c.tweak_indices.map((i: number) => T[i]);
  const psigs: Uint8Array[] = c.psig_indices.map((i: number) => S[i]);
  const aggnonce = nonceAgg(pubnonces);
  if (HX(aggnonce) !== c.aggnonce.toLowerCase()) throw new Error(`${f.id}: aggregate nonce differs from the vector`);
  const session = { aggnonce, pubkeys, tweaks, isXonly: c.is_xonly as boolean[], msg };
  const v = sessionValues(session);
  const sig = partialSigAgg(psigs, session);
  if (HX(sig) !== c.expected.toLowerCase()) throw new Error(`${f.id}: aggregate signature differs from the vector`);
  const finalX = xonlyPk(keyAggAndTweak(pubkeys, tweaks, c.is_xonly));
  const verifies = bip340Verify(sig, msg, finalX);
  if (!verifies) throw new Error(`${f.id}: signature fails BIP 340 verification`);
  const pk2 = getSecondKey(pubkeys);
  const base = keyAgg(pubkeys);
  if (!psigs.every((p, i) => partialSigVerify(p, pubnonces, pubkeys, tweaks, c.is_xonly, msg, i))) throw new Error(`${f.id}: a published partial signature does not verify`);
  let ctx = base;
  const tweakViews = tweaks.map((t, i) => {
    ctx = keyAggAndTweak(pubkeys, tweaks.slice(0, i + 1), c.is_xonly.slice(0, i + 1));
    return { tweak: HX(t), xonly: c.is_xonly[i] as boolean, resultXonly: HX(xonlyPk(ctx)) };
  });
  return {
    ...f,
    derived: {
      msg: HX(msg),
      keyListHash: HX(musigHashKeys(pubkeys)),
      signers: pubkeys.map((pk, i) => ({
        pubkey: HX(pk),
        coefficient: big(keyAggCoeff(pubkeys, pk)),
        secondKey: HX(pk) === HX(pk2),
        pubnonce: [HX(pubnonces[i].slice(0, 33)), HX(pubnonces[i].slice(33))] as [string, string],
        psig: HX(psigs[i]),
        psigVerifies: partialSigVerify(psigs[i], pubnonces, pubkeys, tweaks, c.is_xonly, msg, i),
      })),
      aggPlain: pointHex(base.Q),
      aggXonly: HX(xonlyPk(base)),
      tweaks: tweakViews,
      finalXonly: HX(finalX),
      aggnonce: [HX(aggnonce.slice(0, 33)), HX(aggnonce.slice(33))],
      b: big(v.b),
      R: pointHex(v.R),
      rEvenY: hasEvenYPoint(v.R),
      e: big(v.e),
      tacc: big(v.tacc),
      signature: HX(sig),
      signatureVerifies: verifies,
    },
  };
}

export function deriveMusig2Keyagg(f: Musig2KeyaggFixture): DerivedMusig2KeyaggFixture {
  checkSourceQuote(f);
  const d = musigVectors("key_agg_vectors");
  const X = d.pubkeys.map(hx);
  const orders = f.caseIndices.map((ci) => {
    const c = d.valid_test_cases[ci];
    const keys: Uint8Array[] = c.key_indices.map((i: number) => X[i]);
    const agg = HX(xonlyPk(keyAgg(keys)));
    if (agg !== c.expected.toLowerCase()) throw new Error(`${f.id}: case ${ci} differs from the vector`);
    return { keys: keys.map(HX), coefficients: keys.map((k) => big(keyAggCoeff(keys, k))), aggXonly: agg };
  });
  const first = d.valid_test_cases[f.caseIndices[0]].key_indices.map((i: number) => X[i]);
  const naive = HX(naiveSumXonly(first));
  if (orders.some((o) => o.aggXonly === naive)) throw new Error(`${f.id}: the plain sum equals an aggregate`);
  return { ...f, derived: { orders, naiveSumXonly: naive } };
}

export function deriveMusig2PsigChecks(f: Musig2PsigChecksFixture): DerivedMusig2PsigChecksFixture {
  checkSourceQuote(f);
  const d = musigVectors("sign_verify_vectors");
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), M = d.msgs.map(hx);
  const rows: DerivedMusig2PsigChecksFixture["derived"]["rows"] = [];
  const v0 = d.valid_test_cases[0];
  const ok = partialSigVerify(hx(v0.expected), v0.nonce_indices.map((i: number) => P[i]), v0.key_indices.map((i: number) => X[i]), [], [], M[v0.msg_index], v0.signer_index);
  if (!ok) throw new Error(`${f.id}: the valid partial signature does not verify`);
  rows.push({ label: "Published valid partial signature", signer: v0.signer_index, psig: v0.expected.toLowerCase(), verdict: "valid", detail: "s·G = Re + e·a·g′·P holds" });
  for (const c of d.verify_fail_test_cases) {
    const r = partialSigVerify(hx(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index);
    if (r) throw new Error(`${f.id}: "${c.comment}" verifies but should not`);
    const s = BigInt(`0x${c.sig}`);
    rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: "invalid", detail: s >= 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n ? "s is not below the group order n" : "s·G = Re + e·a·g′·P does not hold" });
  }
  for (const c of d.verify_error_test_cases) {
    let caught: unknown = null;
    try {
      partialSigVerify(hx(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index);
    } catch (e) {
      caught = e;
    }
    if (!(caught instanceof InvalidContributionError) || caught.signer !== c.error.signer || caught.contrib !== c.error.contrib) throw new Error(`${f.id}: "${c.comment}" should blame signer ${c.error.signer} (${c.error.contrib})`);
    rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: "error", detail: `blames signer ${caught.signer! + 1} for an invalid ${caught.contrib}` });
  }
  return { ...f, derived: { rows } };
}
