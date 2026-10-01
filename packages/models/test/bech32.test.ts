import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BECH32M_CONST,
  CHARSET,
  DecodeError,
  analyzeSegwitAddress,
  bytesToFiveBitGroups,
  decodeGeneric,
  hexToBytes,
  type Network,
  type StageId,
} from "../src";

interface Vector {
  bip: 173 | 350;
  line: number;
  family: "generic" | "segwit";
  validity: "valid" | "invalid";
  encoding?: "bech32" | "bech32m";
  string: string;
  reason?: string;
  scriptPubKeyHex?: string;
}

const root = new URL("../../../", import.meta.url);
const vectorFile = JSON.parse(readFileSync(new URL("fixtures/bip173-350-vectors.json", root), "utf8"));
const vectors: Vector[] = vectorFile.vectors;
const kitFixtures = JSON.parse(readFileSync(new URL("examples/address-fixtures.json", root), "utf8"));

const label = (v: Vector) => `BIP${v.bip} L${v.line} ${JSON.stringify(v.string).slice(0, 48)}`;
const networkFor = (s: string): Network => (s.toLowerCase().startsWith("tb") ? "tb" : "bc");

describe("vector file", () => {
  it("is pinned and has the expected counts per list", () => {
    expect(vectorFile.commit).toBe("3a10b5b5f0a7586df8928d580a3009744ebb2079");
    const count = (bip: number, family: string, validity: string) =>
      vectors.filter((v) => v.bip === bip && v.family === family && v.validity === validity).length;
    expect([count(173, "generic", "valid"), count(173, "generic", "invalid")]).toEqual([7, 12]);
    expect([count(173, "segwit", "valid"), count(173, "segwit", "invalid")]).toEqual([6, 10]);
    expect([count(350, "generic", "valid"), count(350, "generic", "invalid")]).toEqual([7, 14]);
    expect([count(350, "segwit", "valid"), count(350, "segwit", "invalid")]).toEqual([8, 15]);
  });
});

describe("generic checksum vectors (BIP173 Bech32, BIP350 Bech32m)", () => {
  for (const v of vectors.filter((x) => x.family === "generic" && x.validity === "valid")) {
    it(`accepts ${label(v)} as ${v.encoding}`, () => {
      expect(decodeGeneric(v.string).encoding).toBe(v.encoding);
    });
  }
  for (const v of vectors.filter((x) => x.family === "generic" && x.validity === "invalid")) {
    it(`rejects ${label(v)} (${v.reason})`, () => {
      expect(() => decodeGeneric(v.string)).toThrow(DecodeError);
    });
  }
});

describe("BIP350 SegWit address vectors (current rules)", () => {
  for (const v of vectors.filter((x) => x.bip === 350 && x.family === "segwit" && x.validity === "valid")) {
    it(`decodes ${label(v)}`, () => {
      const result = analyzeSegwitAddress(v.string, networkFor(v.string));
      expect(result.valid).toBe(true);
      expect(result.scriptPubKeyHex).toBe(v.scriptPubKeyHex);
      expect(result.stages.every((s) => s.status === "pass")).toBe(true);
    });
  }

  const expectedStage = (reason: string): StageId => {
    if (reason.startsWith("Invalid human-readable part")) return "network";
    if (reason.includes("instead of")) return "family";
    if (reason === "Invalid checksum") return "checksum";
    if (reason === "Invalid character in checksum") return "structure";
    if (reason === "Mixed case") return "characters";
    return "program"; // version, program length, padding, empty data
  };

  for (const v of vectors.filter((x) => x.family === "segwit" && x.validity === "invalid")) {
    const stage = expectedStage(v.reason!);
    it(`rejects ${label(v)} at ${stage} (${v.reason})`, () => {
      const result = analyzeSegwitAddress(v.string, networkFor(v.string));
      expect(result.valid).toBe(false);
      expect(result.failedStage).toBe(stage);
      const index = result.stages.findIndex((s) => s.status === "fail");
      expect(result.stages[index].id).toBe(stage);
      expect(result.stages.slice(0, index).every((s) => s.status === "pass")).toBe(true);
      expect(result.stages.slice(index + 1).every((s) => s.status === "not-reached")).toBe(true);
    });
  }

  it("wrong-family vectors still pass the generic checksum", () => {
    for (const v of vectors.filter((x) => x.reason?.includes("instead of"))) {
      expect(() => decodeGeneric(v.string)).not.toThrow();
      expect(analyzeSegwitAddress(v.string, networkFor(v.string)).failedStage).toBe("family");
    }
  });
});

describe("BIP173 SegWit vectors under BIP350", () => {
  it("still accepts BIP173's v0 addresses", () => {
    for (const v of vectors.filter((x) => x.bip === 173 && x.family === "segwit" && x.validity === "valid")) {
      const result = analyzeSegwitAddress(v.string, networkFor(v.string));
      if (result.witnessVersion === 0) {
        expect(result.valid, label(v)).toBe(true);
        expect(result.scriptPubKeyHex).toBe(v.scriptPubKeyHex);
      }
    }
  });

  it("rejects BIP173's Bech32 v1+ examples at the family stage", () => {
    const superseded = vectors.filter(
      (x) => x.bip === 173 && x.family === "segwit" && x.validity === "valid" && !/^bc1q|^tb1q/i.test(x.string),
    );
    expect(superseded.length).toBe(3);
    for (const v of superseded) {
      const result = analyzeSegwitAddress(v.string, networkFor(v.string));
      expect(result.encoding, label(v)).toBe("bech32");
      expect(result.failedStage, label(v)).toBe("family");
    }
  });
});

describe("kit fixtures", () => {
  for (const fixture of kitFixtures.fixtures) {
    it(`matches examples/address-fixtures.json ${fixture.id}`, () => {
      const result = analyzeSegwitAddress(fixture.address, fixture.expectedHrp);
      expect({
        hrp: result.hrp,
        witnessVersion: result.witnessVersion,
        encoding: result.encoding,
        programHex: result.programHex,
        scriptPubKeyHex: result.scriptPubKeyHex,
        validationScope: result.scope,
      }).toEqual(fixture.result);
    });
  }
});

describe("teaching properties", () => {
  const v0 = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
  const v1 = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0";

  it("detects every single-character substitution in the data part at the checksum stage", () => {
    for (const address of [v0, v1]) {
      const start = address.lastIndexOf("1") + 1;
      for (let i = start; i < address.length; i++) {
        for (const c of CHARSET) {
          if (c === address[i]) continue;
          const mutated = address.slice(0, i) + c + address.slice(i + 1);
          expect(analyzeSegwitAddress(mutated, "bc").failedStage).toBe("checksum");
        }
      }
    }
  });

  it("labels each character's role", () => {
    const roles = analyzeSegwitAddress(v1, "bc").roles;
    expect(roles.slice(0, 4)).toEqual(["hrp", "hrp", "separator", "version"]);
    expect(roles.slice(-6)).toEqual(Array(6).fill("checksum"));
    expect(roles.filter((r) => r === "program").length).toBe(v1.length - 4 - 6);
  });

  it("regroups program bytes into the address's own characters", () => {
    for (const address of [v0, v1]) {
      const result = analyzeSegwitAddress(address, "bc");
      const chars = bytesToFiveBitGroups(hexToBytes(result.programHex!)).map((g) => g.char).join("");
      expect(chars).toBe(address.slice(4, -6));
    }
  });

  it("marks the padded final group for a 20-byte program", () => {
    // 20 bytes = 160 bits = exactly 32 groups; 32 bytes = 256 bits needs one padded group.
    expect(bytesToFiveBitGroups(new Uint8Array(20)).some((g) => g.padded)).toBe(false);
    const groups = bytesToFiveBitGroups(new Uint8Array(32));
    expect(groups.length).toBe(52);
    expect(groups.at(-1)!.padded).toBe(true);
  });

  it("does not extend the four-substitution guarantee across checksum families", () => {
    // Reviewer-supplied counterexample: four substitutions turn a valid Bech32 v0
    // address into a valid Bech32m v1 address with a 20-byte (non-Taproot) program.
    const changed = "bc1pw508s6qejrtdg4y5r3zarvary0c5xwykv8f3t4";
    expect([...v0].flatMap((c, i) => (c !== changed[i] ? [i + 1] : []))).toEqual([4, 9, 14, 35]);
    const result = analyzeSegwitAddress(changed, "bc");
    expect(result.valid).toBe(true);
    expect([result.encoding, result.witnessVersion, result.programHex!.length / 2]).toEqual(["bech32m", 1, 20]);
  });

  it("splits exactly half the characters in a 40-bit block across two bytes", () => {
    const crossing = [0, 1, 2, 3, 4, 5, 6, 7].filter((g) => Math.floor((g * 5) / 8) !== Math.floor((g * 5 + 4) / 8));
    expect(crossing).toEqual([1, 3, 4, 6]);
  });

  it("reports the residue that the checksum stage compared", () => {
    expect(analyzeSegwitAddress(v1, "bc").residue).toBe(BECH32M_CONST);
    expect(analyzeSegwitAddress(v0, "bc").residue).toBe(1);
  });
});
