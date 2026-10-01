import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { descsumCheck, descsumCreate, descsumExpand } from "../src/descsum";
import { DescriptorDerivationError, DescriptorError, DescriptorScopeError, expand, keyAt, parseDescriptor, parseKey } from "../src/descriptors";
import { bytesToHex } from "../src/hex";

const root = new URL("../../../", import.meta.url);
const raw = (n: number) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/bip-0${n}.mediawiki`, root), "utf8").split("\n");
const tt = (l: string) => [...l.matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]);

/** Valid vectors: "* <tt>DESC</tt>" then "** <tt>SCRIPT</tt>" lines (combo nests "*** " under "** Child n"). */
function validVectors(n: number) {
  const lines = raw(n);
  const start = lines.findIndex((l) => l.startsWith("==Test Vectors=="));
  const stop = lines.findIndex((l, i) => i > start && /^Invalid/i.test(l));
  const out: Array<{ desc: string; line: number; scripts: string[][] }> = [];
  for (let i = start; i < stop; i++) {
    const l = lines[i];
    if (l.startsWith("* <tt>")) out.push({ desc: tt(l)[0], line: i + 1, scripts: [] });
    else if (l.startsWith("** <tt>") && out.length) {
      const v = out[out.length - 1];
      if (v.scripts.length === 0) v.scripts.push([]);
      // A non-combo ranged descriptor lists child 0, 1, 2 as consecutive "**" lines.
      v.scripts[0].push(tt(l)[0]);
    } else if (l.startsWith("** Child")) out[out.length - 1].scripts.push([]);
    else if (l.startsWith("*** <tt>")) {
      const v = out[out.length - 1];
      v.scripts[v.scripts.length - 1].push(tt(l)[0]);
    }
  }
  return out;
}

function invalidVectors(n: number) {
  const lines = raw(n);
  const start = lines.findIndex((l) => /^Invalid/i.test(l));
  const stop = lines.findIndex((l, i) => i > start && l.startsWith("=="));
  return lines.slice(start, stop).flatMap((l, k) => (l.startsWith("* ") ? [{ desc: tt(l).at(-1)!, line: start + k + 1, why: l.replace(/<\/?tt>/g, "") }] : []));
}

describe("BIP 380 checksum vectors", () => {
  const b380 = raw(380);
  const vec = (line: number) => tt(b380[line - 1])[0];

  it("accepts the valid checksum and a descriptor without one", () => {
    expect(descsumCheck(vec(204)).verdict).toBe("valid");
    expect(descsumCreate("raw(deadbeef)")).toBe("89f8spxm");
    expect(descsumCheck(vec(205)).verdict).toBe("no-checksum");
  });

  it("rejects missing, long, short, payload-error, checksum-error and bad-character cases", () => {
    expect([206, 207, 208, 209, 210, 211].map((l) => descsumCheck(vec(l)).verdict)).toEqual(["bad-length", "bad-length", "bad-length", "mismatch", "bad-charset", "bad-charset"]);
  });

  it("expands 3 characters into 4 symbols", () => {
    const sym = descsumExpand("raw(deadbeef)")!;
    expect(sym.length).toBe(13 + Math.ceil(13 / 3));
    expect(sym.filter((s) => s.char === null).length).toBe(5);
  });

  it("detects every single-character substitution in a published descriptor", () => {
    const body = "raw(deadbeef)";
    const sum = descsumCreate(body);
    const CH = "0123456789()[],'/*abcdefgh@:$%{}";
    let missed = 0;
    for (let i = 0; i < body.length; i++) for (const c of CH) if (c !== body[i] && descsumCheck(body.slice(0, i) + c + body.slice(i + 1) + "#" + sum).verdict === "valid") missed++;
    expect(missed).toBe(0);
  });
});

describe("BIP 380 key expressions", () => {
  const b380 = raw(380);
  const valid = b380.slice(216, 237).filter((l) => l.startsWith("* ")).map((l) => tt(l).at(-1)!);
  const invalid = b380.slice(240, 256).filter((l) => l.startsWith("* ")).map((l) => tt(l).at(-1)!);

  it("parses all 21 valid key expressions", () => {
    expect(valid.length).toBe(21);
    for (const k of valid) expect(() => parseKey(k), k).not.toThrow();
  });

  it("rejects all 16 invalid ones", () => {
    expect(invalid.length).toBe(16);
    for (const k of invalid) expect(() => parseKey(k), k).toThrow(DescriptorError);
  });

  it("treats h and ' as the same hardened marker", () => {
    const a = parseKey(valid[2]).origin!.path;
    expect(parseKey(valid[3]).origin!.path).toEqual(a);
    expect(parseKey(valid[4]).origin!.path).toEqual(a);
  });
});

describe("script expansion vectors (BIPs 381–386)", () => {
  for (const n of [381, 382, 383, 384, 385, 386]) {
    it(`BIP ${n}: every listed descriptor expands to the published scripts`, () => {
      const vs = validVectors(n);
      expect(vs.length).toBeGreaterThan(0);
      let checked = 0;
      for (const v of vs) {
        if (v.scripts.length === 0) {
          // BIP 386 lists tr(…, pkh(…)) as valid without a script: Miniscript, outside this model.
          expect(() => parseDescriptor(v.desc), v.desc).toThrow(DescriptorScopeError);
          continue;
        }
        const d = parseDescriptor(v.desc);
        if (d.root.fn === "combo") v.scripts.forEach((s, i) => expect(expand(d, i), `${v.desc} child ${i}`).toEqual(s));
        else v.scripts[0].forEach((s, i) => expect(expand(d, i), `${v.desc} #${i}`).toEqual([s]));
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    });
  }
});

describe("invalid-descriptor cases (BIPs 381–386)", () => {
  for (const n of [381, 382, 383, 384, 385, 386]) {
    it(`BIP ${n}: every listed invalid descriptor is rejected`, () => {
      const vs = invalidVectors(n);
      expect(vs.length).toBeGreaterThan(0);
      for (const v of vs) expect(() => expand(parseDescriptor(v.desc)), v.why).toThrow(DescriptorError);
    });
  }
});

describe("rules the vectors do not exercise (review follow-ups)", () => {
  const X = "a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd";
  it("rejects uncompressed keys anywhere under tr(), leaves included (BIP 386)", () => {
    expect(() => parseDescriptor(`tr(${X},pk(04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235))`)).toThrow(DescriptorError);
    expect(() => parseDescriptor(`tr(${X},pk(5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss))`)).toThrow(DescriptorError);
  });
  it("rejects BIP 383's 16-key P2SH multisig while parsing", () => {
    const bad = invalidVectors(383).find((v) => v.why.startsWith("* More than 15 keys"))!;
    expect(() => parseDescriptor(bad.desc)).toThrow(/520-byte/);
  });
});

describe("key derivation inside descriptors", () => {
  it("ranged keys step the last index; xpub and xprv agree", () => {
    const pub = parseDescriptor("wpkh([ffffffff/13']xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9LgpeyGmXUbC6wb7ERfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH/1/2/*)");
    expect(pub.ranged).toBe(true);
    expect(pub.hasPrivateKeys).toBe(false);
    const k = pub.keys[0];
    expect(keyAt(k, 5).derivedPath).toEqual([{ index: 1, hardened: false }, { index: 2, hardened: false }, { index: 5, hardened: false }]);
    const priv = parseDescriptor("wpkh([ffffffff/13']xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQRUT3dKYnjwih2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt/1/2/0)");
    expect(priv.hasPrivateKeys).toBe(true);
    expect(bytesToHex(keyAt(priv.keys[0], 0).pub)).toBe(bytesToHex(keyAt(k, 0).pub));
  });

  it("parses hardened steps after an xpub (BIP 380 lists them as valid) but cannot derive from them", () => {
    const k = parseKey("xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL/3h/4h/5h/*");
    expect(k.path.every((p) => p.hardened)).toBe(true);
    expect(() => keyAt(k, 0)).toThrow(DescriptorDerivationError);
  });
});

describe("descriptors chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/descriptors.json", root), "utf8");
  const b380 = raw(380);
  const b383 = raw(383);

  it("dates, sizes and the character set", async () => {
    const { INPUT_CHARSET } = await import("../src/descsum");
    for (const n of [380, 381, 382, 383, 384, 385, 386]) expect(raw(n).slice(0, 12).join("\n")).toContain("Assigned: 2021-06-27");
    expect(text).toContain("assigned in 2021 as BIPs 380 to 386");
    expect(b380[48]).toContain("8 character alphanumeric descriptor checksum");
    expect(text).toContain("an eight-character checksum");
    // BIP 380 says "3 groups of 32", but its own INPUT_CHARSET has 32 + 32 + 31 characters.
    expect(b380[110]).toContain("3 groups of 32 characters");
    expect(INPUT_CHARSET.length).toBe(95);
    expect(INPUT_CHARSET.slice(64).length).toBe(31);
    expect(b380[139]).toContain(`INPUT_CHARSET = "${INPUT_CHARSET.slice(0, 20)}`);
    expect(text).toContain("a fixed set of 95, which BIP 380 describes as three groups of 32 (the last group is one short)");
  });

  it("the checksum guarantees", () => {
    expect(b380[127]).toContain("49154 characters");
    expect(b380[128]).toContain("507 characters");
    expect(b380[129]).toContain("77 characters");
    expect(b380[131]).toContain("1 in 2<super>40</super>");
    expect(text).toContain("any two or three in a descriptor up to 49,154 characters; any four up to 507; any five up to 77");
    expect(text).toContain("a chance of 1 in 2^40");
    expect(text).toContain("raw(deadbeef)#89f8spxm");
  });

  it("multisig limits, versions and the ranged example", () => {
    expect(b383[40]).toContain("at most 3 keys");
    expect(b383[44]).toContain("at most 15 compressed public keys");
    expect(b383[46]).toContain("the maximum number of keys is 20");
    expect(b383[43]).toContain("520 byte limit");
    expect(b383[44]).toContain("at most 7 uncompressed");
    expect(text).toContain("15 compressed keys (or 7 uncompressed) directly inside sh()");
    expect(raw(381)[26]).toContain("3 main standard output script formats");
    expect(text).toContain("the three main standard formats from before SegWit");
    expect(text).toContain("the key’s 20-byte hash");

    expect(b380[267]).toContain("since version 0.17");
    expect(raw(386)[121]).toContain("since version 22.0");
    expect(text).toContain("in Bitcoin Core since version 0.17, and tr() since 22.0");
    const ranged = validVectors(382).find((v) => v.desc.startsWith("wpkh([ffffffff/13']xpub"))!;
    expect(ranged.scripts[0].length).toBe(3);
    expect(text).toContain("lists its first three");
  });
});
