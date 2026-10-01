import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexToBytes } from "../src/hex";
import { createOutputs, decodeAddress, K_MAX, parseWitness, readInput, receiverAddresses, scan, spendKeyMatches, type Vin } from "../src/silentpayments";

const root = new URL("../../../", import.meta.url);
const vectors = JSON.parse(readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0352/send_and_receive_test_vectors.json", root), "utf8"));
const b352 = readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0352.mediawiki", root), "utf8").split("\n");

const toVin = (v: any): Vin => ({ txid: v.txid, vout: v.vout, scriptSigHex: v.scriptSig, witness: parseWitness(v.txinwitness), prevoutSpkHex: v.prevout.scriptPubKey.hex });

describe("BIP 352 send-and-receive vectors", () => {
  it("has 28 cases", () => expect(vectors.length).toBe(28));

  for (const c of vectors) {
    it(c.comment, () => {
      for (const s of c.sending) {
        const vins = s.given.vin.map((v: any) => ({ ...toVin(v), privateKey: v.private_key }));
        const recipients = s.given.recipients.flatMap((r: any) => Array(r.count ?? 1).fill(r.address));
        for (const r of s.given.recipients) expect([decodeAddress(r.address).Bscan, decodeAddress(r.address).Bm]).toEqual([r.scan_pub_key, r.spend_pub_key]);
        const res = createOutputs(vins, recipients);
        expect(res.inputPubKeys).toEqual(s.expected.input_pub_keys);
        if (s.expected.input_private_key_sum) expect(res.aSum).toBe(s.expected.input_private_key_sum);
        // shared_secrets has one entry per listed recipient (null when sending fails): the secret of that recipient's scan-key group.
        (s.expected.shared_secrets ?? []).forEach((want: string | null, i: number) => {
          const got = res.sharedSecrets.find((x) => x.Bscan === s.given.recipients[i]?.scan_pub_key)?.secret ?? null;
          expect(got).toBe(want);
        });
        const ok = s.expected.outputs.some((set: string[]) => set.length === res.outputs.length && set.every((o) => res.outputs.includes(o)));
        expect(ok, `sending: ${res.failure ?? ""}`).toBe(true);
      }
      for (const r of c.receiving) {
        const g = r.given;
        const bScan = hexToBytes(g.key_material.scan_priv_key);
        const bSpend = hexToBytes(g.key_material.spend_priv_key);
        expect(receiverAddresses(bScan, bSpend, g.labels)).toEqual(r.expected.addresses);
        const res = scan(g.vin.map(toVin), [...g.outputs], bScan, bSpend, g.labels);
        if (r.expected.input_pub_key_sum) expect(res.A).toBe(r.expected.input_pub_key_sum);
        if (r.expected.tweak) expect(res.tweak).toBe(r.expected.tweak);
        if (r.expected.shared_secret) expect(res.sharedSecret).toBe(r.expected.shared_secret);
        if ("outputs" in r.expected) {
          const got = res.found.map((f) => `${f.pubKey}:${f.privKeyTweak}`).sort();
          const want = r.expected.outputs.map((o: any) => `${o.pub_key}:${o.priv_key_tweak}`).sort();
          expect(got).toEqual(want);
          for (const f of res.found) expect(spendKeyMatches(bSpend, f.privKeyTweak, f.pubKey)).toBe(true);
        } else {
          expect(res.found.length).toBe(r.expected.n_outputs);
        }
      }
    });
  }
});

describe("input eligibility", () => {
  const byComment = (s: string) => vectors.find((c: any) => c.comment === s);

  it("reads a key from a malleated P2PKH scriptSig", () => {
    const c = byComment("Pubkey extraction from malleated p2pkh");
    const readings = c.receiving[0].given.vin.map((v: any) => readInput(toVin(v)));
    expect(readings.every((r: any) => r.kind === "p2pkh" && r.pubkey)).toBe(true);
  });

  it("skips uncompressed keys, non-P2WPKH P2SH and the NUMS taproot script path", () => {
    const unc = byComment("P2PKH and P2WPKH Uncompressed Keys are skipped").receiving[0].given.vin.map((v: any) => readInput(toVin(v)));
    expect(unc.filter((r: any) => r.pubkey === null).length).toBeGreaterThan(0);
    const p2sh = byComment("Skip invalid P2SH inputs").receiving[0].given.vin.map((v: any) => readInput(toVin(v)));
    expect(p2sh.some((r: any) => r.pubkey === null)).toBe(true);
    const nums = byComment("Single recipient: taproot input with NUMS point").receiving[0].given.vin.map((v: any) => readInput(toVin(v)));
    expect(nums.some((r: any) => r.skipped?.includes("NUMS"))).toBe(true);
  });

  it("lists exactly four input types, MUST", () => {
    expect(b352[224]).toContain("the sender and receiver MUST use inputs from the following list");
    expect(b352.slice(226, 230).join(" ")).toMatch(/P2TR.*P2WPKH.*P2SH-P2WPKH.*P2PKH/);
  });
});

describe("labels and limits", () => {
  it("K_max is 2323 as the BIP states", () => {
    expect(b352.find((l) => l.includes("K<sub>max</sub>'' (=2323)"))).toBeDefined();
    expect(K_MAX).toBe(2323);
  });

  it("a v0 address is 116 characters with the sp prefix", () => {
    const addr = vectors[0].receiving[0].expected.addresses[0];
    expect(addr.length).toBe(116);
    expect(addr.startsWith("sp1q")).toBe(true);
  });
});

describe("silent-payments chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/silent-payments.json", root), "utf8");

  it("dates, sizes and counts", () => {
    expect(b352[9]).toContain("Assigned: 2023-03-09");
    expect(b352[7]).toContain("Status: Complete");
    expect(text).toContain("BIP 352, assigned in 2023 and recorded as Complete");
    const addr = vectors[0].receiving[0].expected.addresses[0];
    expect(addr.length).toBe(116);
    expect(text).toContain("116 characters for version 0 on mainnet, always starting sp1q");
    const { Bscan, Bm } = decodeAddress(addr);
    expect([Bscan.length / 2, Bm.length / 2]).toEqual([33, 33]);
    expect(text).toContain("two public keys of 33 bytes each");
    expect(text).toContain("inputs of four types: P2TR, P2WPKH, P2SH-P2WPKH and P2PKH");
    expect(b352[509]).toContain("'''1.1.0'''");
    expect(b352[510]).toContain("K<sub>max</sub>");
    expect(text).toContain("Since version 1.1.0 the search is also capped");
    expect(text).toContain("K_max = 2323 outputs, and a receiver stops at k = 2323");
    expect(b352[194]).toContain("SegWit version > 1");
    expect(text).toContain("SegWit version above 1");
  });

  it("figure facts the prose relies on", () => {
    const fx = JSON.parse(readFileSync(new URL("fixtures/silent-payments.json", root), "utf8")).fixtures;
    expect(fx.filter((f: { kind: string }) => f.kind === "sp-vector").length).toBe(6);
    expect(text).toContain("Six of BIP 352’s send-and-receive vectors");
    expect(fx.find((f: { kind: string }) => f.kind === "sp-eligibility").caseIndices.length).toBe(5);
    expect(text).toContain("The inputs of five published vectors");
  });
});
