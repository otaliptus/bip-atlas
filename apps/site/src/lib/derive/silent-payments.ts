import { hexToBytes, createOutputs, scan as spScan, readInput as spReadInput, receiverAddresses, parseWitness, decodeAddress as spDecodeAddress } from "@bip-atlas/models";
import type { SpVectorFixture, DerivedSpFixture, SpEligibilityFixture, DerivedSpEligibilityFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, checkSourceQuote, pinnedText } from "./sources";

let spVectorsCache: any = null;
const spVectors = () => (spVectorsCache ??= JSON.parse(pinnedText("bip-0352/send_and_receive_test_vectors.json", SNAPSHOT_PHASE3)));
const spVin = (v: any) => ({ txid: v.txid, vout: v.vout, scriptSigHex: v.scriptSig, witness: parseWitness(v.txinwitness), prevoutSpkHex: v.prevout.scriptPubKey.hex });
const spInputs = (vins: any[]) =>
  vins.map((v) => {
    const r = spReadInput(spVin(v));
    return { outpoint: `${v.txid.slice(0, 8)}…:${v.vout}`, kind: r.kind, pubkey: r.pubkey, skipped: r.skipped };
  });

export function deriveSp(f: SpVectorFixture): DerivedSpFixture {
  checkSourceQuote(f);
  const c = spVectors()[f.caseIndex];
  if (c.comment !== f.source.quote) throw new Error(`${f.id}: caseIndex ${f.caseIndex} is not the cited vector`);
  const s = c.sending[0], r = c.receiving[0];
  const send = createOutputs(s.given.vin.map((v: any) => ({ ...spVin(v), privateKey: v.private_key })), s.given.recipients.flatMap((x: any) => Array(x.count ?? 1).fill(x.address)));
  if (!s.expected.outputs.some((set: string[]) => set.length === send.outputs.length && set.every((o) => send.outputs.includes(o)))) throw new Error(`${f.id}: sender outputs differ from the vector`);
  const g = r.given;
  const bScan = hexToBytes(g.key_material.scan_priv_key), bSpend = hexToBytes(g.key_material.spend_priv_key);
  const addrs = receiverAddresses(bScan, bSpend, g.labels);
  if (JSON.stringify(addrs) !== JSON.stringify(r.expected.addresses)) throw new Error(`${f.id}: addresses differ from the vector`);
  const res = spScan(g.vin.map(spVin), [...g.outputs], bScan, bSpend, g.labels);
  if (res.sharedSecret !== r.expected.shared_secret || res.tweak !== r.expected.tweak || res.A !== r.expected.input_pub_key_sum) throw new Error(`${f.id}: receiver values differ from the vector`);
  const want = r.expected.outputs.map((o: any) => o.pub_key).sort();
  if (JSON.stringify(res.found.map((x) => x.pubKey).sort()) !== JSON.stringify(want)) throw new Error(`${f.id}: found outputs differ from the vector`);
  const dec = spDecodeAddress(addrs[0]);
  const senderSecret = send.sharedSecrets.find((x) => x.Bscan === dec.Bscan)?.secret ?? null;
  const paidScan = spDecodeAddress(s.given.recipients[0].address).Bscan;
  const paidSecret = send.sharedSecrets.find((x) => x.Bscan === paidScan)?.secret;
  if (!paidSecret) throw new Error(`${f.id}: the sender has no shared secret for the scan key it pays`);
  return {
    ...f,
    derived: {
      comment: c.comment,
      inputs: spInputs(g.vin),
      smallestOutpoint: res.smallestOutpoint!,
      A: res.A!,
      inputHash: res.inputHash!,
      tweak: res.tweak!,
      sharedSecret: res.sharedSecret!,
      secretsAgree: senderSecret === res.sharedSecret,
      senderSecret: paidSecret,
      receiver: { address: addrs[0], Bscan: dec.Bscan, Bspend: dec.Bm, labels: g.labels, labeledAddresses: addrs.slice(1) },
      paidTo: [...new Set<string>(s.given.recipients.map((x: any) => x.address))].map((a) => {
        const i = addrs.indexOf(a);
        const k = spDecodeAddress(a);
        return { address: a, Bscan: k.Bscan, Bm: k.Bm, ours: i >= 0, label: i > 0 ? g.labels[i - 1] : null };
      }),
      senderOutputs: send.outputs,
      txOutputs: g.outputs.map((o: string) => {
        const hit = res.found.find((x) => x.pubKey === o);
        const step = res.steps.find((st) => st.match?.output === o);
        return { key: o, mine: !!hit, label: hit?.label ?? null, k: step?.k ?? null };
      }),
      steps: res.steps.map((st) => ({ k: st.k, tk: st.tk, Pk: st.Pk, matched: !!st.match, via: st.match?.via ?? null })),
    },
  };
}

export function deriveSpEligibility(f: SpEligibilityFixture): DerivedSpEligibilityFixture {
  checkSourceQuote(f);
  return { ...f, derived: { rows: f.caseIndices.map((i) => ({ comment: spVectors()[i].comment, inputs: spInputs(spVectors()[i].receiving[0].given.vin) })) } };
}
