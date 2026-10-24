import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzePsbtExtensions } from "../src/psbtExtensions";
import { parsePsbtMapSequence, type PsbtRecord } from "../src/psbt";

interface Fixture {
  id: string;
  label: string;
  hex: string;
  expected: string;
  stage?: string;
  source: { bip: number; line: number; quote: string; base64?: string; duplicateOf?: string; normalization?: string };
}
const { fixtures }: { fixtures: Fixture[] } = JSON.parse(readFileSync(new URL("../../../fixtures/psbt-extensions.json", import.meta.url), "utf8"));

const compactSize = (value: number) => {
  if (value < 0xfd) return [value];
  if (value <= 0xffff) return [0xfd, value & 255, value >>> 8];
  throw new RangeError("Test value is too large");
};
const recordBytes = (record: PsbtRecord) => {
  const key = Array.from(Buffer.from(record.keyHex, "hex"));
  const value = Array.from(Buffer.from(record.valueHex, "hex"));
  return [...compactSize(key.length), ...key, ...compactSize(value.length), ...value];
};
const serializeMaps = (maps: ReturnType<typeof parsePsbtMapSequence>) => {
  const chunks: number[] = [0x70, 0x73, 0x62, 0x74, 0xff];
  for (const record of maps.global) chunks.push(...recordBytes(record));
  chunks.push(0);
  for (const map of [...maps.inputs, ...maps.outputs]) {
    for (const record of map) chunks.push(...recordBytes(record));
    chunks.push(0);
  }
  return Buffer.from(chunks).toString("hex");
};
const editPsbt = (hex: string, edit: (maps: ReturnType<typeof parsePsbtMapSequence>) => void) => {
  const maps = parsePsbtMapSequence(hex);
  edit(maps);
  return serializeMaps(maps);
};
const fixture = (id: string) => fixtures.find((item) => item.id === id)!;

describe("BIP 370/371/373 published PSBT cases", () => {
  for (const item of fixtures) {
    it(item.id, () => {
      const result = analyzePsbtExtensions(item.hex);
      expect(result.valid, result.errors.slice(0, 4).join("; ")).toBe(item.expected === "valid");
      if (result.valid) expect(result.records.length).toBeGreaterThan(0);
      if (item.source.base64) expect(Buffer.from(item.source.base64, "base64").toString("hex")).toBe(item.hex);
      if (item.source.normalization) expect(item.source.quote).toBe(`<${item.hex}`);
      if (item.source.duplicateOf) expect(item.hex).toBe(fixture(item.source.duplicateOf).hex);
    });
  }

  it("decodes a PSBTv2 creator with zero inputs and outputs", () => {
    const result = analyzePsbtExtensions("70736274ff0100");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects trailing data after the output maps", () => {
    const result = analyzePsbtExtensions("70736274ff010000");
    expect(result.valid).toBe(false);
  });

  it("keeps the updated-v2 case distinct from the following sequence case", () => {
    expect(fixture("bip370-26-1-input-2-output-updated-psbtv2").source.line).toBe(409);
    expect(fixture("bip370-26-1-input-2-output-updated-psbtv2").hex).not.toBe(fixture("bip370-27-1-input-2-output-updated-psbtv2-with-psbt-in-seq").hex);
  });

  it.each([
    ["bip371-02-psbt-with-tt-psbt-in-tap-key-sig-tt-signature-th", "PSBT_IN_TAP_KEY_SIG", "64 or 65 bytes"],
    ["bip371-03-psbt-with-tt-psbt-in-tap-key-sig-tt-signature-th", "PSBT_IN_TAP_KEY_SIG", "64 or 65 bytes"],
    ["bip371-04-psbt-with-tt-psbt-in-tap-bip32-derivation-tt-key", "PSBT_IN_TAP_BIP32_DERIVATION", "32 bytes"],
  ] as const)("%s fails at the intended field after source normalization", (id, field, message) => {
    const item = fixture(id);
    const result = analyzePsbtExtensions(item.hex);
    expect(item.source.normalization).toBeTruthy();
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes(field) && error.includes(message))).toBe(true);
    expect(result.errors).not.toContain("Expected lowercase even-length hex");
  });

  it("marks the duplicated output-participant case instead of claiming independent coverage", () => {
    const item = fixture("bip373-10-psbt-with-an-x-only-output-participant-pubkey");
    expect(item.source.duplicateOf).toBe("bip373-09-psbt-with-x-only-aggregate-pubkey-in-output-part");
    expect(analyzePsbtExtensions(item.hex).errors.some((error) => error.includes("aggregate key must be a compressed public key"))).toBe(true);
  });
});

describe("PSBT mutation helpers", () => {
  it("round-trips a published PSBT byte for byte", () => {
    const item = fixture("bip370-25-1-input-2-output-psbtv2-required-fields-only");
    expect(editPsbt(item.hex, () => {})).toBe(item.hex);
  });
});

describe("MuSig2 signing-round fixtures", () => {
  it("contains participants, all nonces and all partial signatures", () => {
    const rounds = fixtures.filter((item) => item.id.startsWith("bip373-01-"));
    expect(rounds.map((item) => item.stage)).toEqual(["participant pubkeys only", "all pubnonces", "all partial signatures"]);
    const analyses = rounds.map((item) => analyzePsbtExtensions(item.hex));
    expect(analyses.map((analysis) => analysis.records.filter((record) => record.keyType === 0x1b).length)).toEqual([0, 3, 3]);
    expect(analyses.map((analysis) => analysis.records.filter((record) => record.keyType === 0x1c).length)).toEqual([0, 0, 3]);
    for (const analysis of analyses) expect(analysis.valid).toBe(true);
  });
});

describe("PSBT extension boundaries", () => {
  it("decodes signed transaction versions and output amounts", () => {
    const hex = editPsbt(fixture("bip370-25-1-input-2-output-psbtv2-required-fields-only").hex, (maps) => {
      maps.global.find((record) => record.keyType === 0x02)!.valueHex = "ffffffff";
      maps.outputs[0].find((record) => record.keyType === 0x03)!.valueHex = "ffffffffffffffff";
    });
    const result = analyzePsbtExtensions(hex);
    expect(result.version, result.errors.join("; ")).toBe(2);
    expect(result.records.find((record) => record.scope === "global" && record.keyType === 0x02)!.reading).toBe("transaction version -1");
    expect(result.records.find((record) => record.scope === "output" && record.keyType === 0x03)!.reading).toBe("-1 satoshis");
  });

  it("preserves standard proprietary records without interpreting them", () => {
    const hex = editPsbt(fixture("bip370-25-1-input-2-output-psbtv2-required-fields-only").hex, (maps) => {
      maps.inputs[0].push({ keyType: 0xfc, keyHex: "fc0000", keyDataHex: "0000", valueHex: "01" });
    });
    const result = analyzePsbtExtensions(hex);
    expect(result.valid, result.errors.join("; ")).toBe(true);
    expect(result.records.some((record) => record.name === "PSBT_IN_PROPRIETARY" && record.valueHex === "01")).toBe(true);
    expect(result.records.some((record) => record.name === "PSBT_GLOBAL_VERSION")).toBe(true);
  });

  it("refuses an empty Taproot tree", () => {
    const hex = editPsbt(fixture("bip371-16-psbt-with-one-p2tr-script-path-only-output-with-").hex, (maps) => {
      maps.outputs.flat().find((record) => record.keyType === 0x06)!.valueHex = "";
    });
    const result = analyzePsbtExtensions(hex);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("Taproot tree must contain at least one tuple")), result.errors.join("; ")).toBe(true);
  });
});

describe("BIP 370 locktime selection", () => {
  it.each([
    [405, { kind: "fallback", value: 0 }],
    [465, { kind: "fallback", value: 0 }],
    [469, { kind: "fallback", value: 0 }],
    [475, { kind: "height", value: 10000 }],
    [479, { kind: "height", value: 10000 }],
    [483, { kind: "height", value: 10000 }],
    [487, { kind: "height", value: 10000 }],
    [493, { kind: "time", value: 1657048460 }],
    [497, { kind: "time", value: 1657048460 }],
    [500, { kind: "time", value: 1657048460 }],
    [506, null],
  ] as const)("BIP 370 vector at line %s", (line, expected) => {
    const item = fixtures.find((candidate) => candidate.source.bip === 370 && candidate.source.line === line)!;
    const result = analyzePsbtExtensions(item.hex);
    expect(result.locktime).toEqual(expected);
    if (expected) expect(Number.isFinite(result.locktime!.value)).toBe(true);
  });
});
