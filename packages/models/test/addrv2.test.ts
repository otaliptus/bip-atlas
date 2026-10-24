import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { encodeAddrV2, evaluateAddrV2Entry, parseAddrV2, validateSendAddrV2Sequence, type AddrV2Entry } from "../src/addrv2";

const { fixtures }: { fixtures: Array<AddrV2Entry & { id: string; label: string; expected: "accept" | "ignore" | "reject" }> } = JSON.parse(readFileSync(new URL("../../../fixtures/addrv2.json", import.meta.url), "utf8"));

describe("BIP 155 network registry and packet round trips", () => {
  for (const fixture of fixtures) {
    it(fixture.label, () => {
      const verdict = evaluateAddrV2Entry(fixture);
      expect(verdict.outcome).toBe(fixture.expected);
      if (fixture.expected !== "reject" || fixture.id !== "addr-wrong-length") {
        const packet = encodeAddrV2([fixture]);
        const decoded = parseAddrV2(packet);
        expect(decoded.entries).toHaveLength(1);
        expect(decoded.entries[0].verdict.outcome).toBe(fixture.expected);
        expect(decoded.entries[0].addressHex).toBe(fixture.addressHex);
        expect(decoded.entries[0].time).toBe(fixture.time);
        expect(decoded.entries[0].services).toBe(fixture.services);
        expect(decoded.entries[0].port).toBe(fixture.port);
      }
    });
  }

  it("rejects wrong-length data at encoding and decoding", () => {
    const fixture = fixtures.find((item) => item.id === "addr-wrong-length")!;
    expect(() => encodeAddrV2([fixture])).toThrow("Address length does not match");
    const packet = encodeAddrV2([{ ...fixture, addressHex: "00".repeat(32) }]);
    const wrongLength = packet.replace(`0420${"00".repeat(32)}`, `041f${"00".repeat(31)}`);
    expect(wrongLength).not.toBe(packet);
    expect(parseAddrV2(wrongLength).entries[0].verdict).toEqual({ outcome: "reject", reason: "TORV3 requires 32 address bytes, received 31." });
  });

  it("enforces the address and message limits", () => {
    const base = fixtures.find((item) => item.id === "addr-torv3")!;
    expect(parseAddrV2(encodeAddrV2(Array.from({ length: 1000 }, () => base))).entries).toHaveLength(1000);
    const unknownLong = { ...base, networkId: 8, addressHex: "00".repeat(512) };
    const packet = encodeAddrV2([unknownLong]);
    expect(parseAddrV2(packet).entries[0].verdict.outcome).toBe("reject");
    expect(() => encodeAddrV2([{ ...base, addressHex: "00".repeat(513) }])).toThrow("512-byte");
    expect(() => encodeAddrV2(Array.from({ length: 1001 }, () => base))).toThrow("1,000");
    expect(evaluateAddrV2Entry({ ...base, addressHex: "00".repeat(513) }).outcome).toBe("reject");
  });

  it("rejects non-minimal and truncated CompactSize encodings", () => {
    expect(() => parseAddrV2("fd0100")).toThrow("Non-minimal CompactSize");
    expect(() => parseAddrV2("010000")).toThrow("Unexpected end");
  });

  it("rejects trailing bytes", () => {
    const packet = encodeAddrV2([fixtures[0]]);
    expect(() => parseAddrV2(packet + "00")).toThrow("trailing bytes");
  });

  it("rejects invalid CJDNS and Yggdrasil ranges", () => {
    expect(evaluateAddrV2Entry({ ...fixtures.find((item) => item.id === "addr-cjdns")!, addressHex: "00000000000000000000000000000001" }).outcome).toBe("reject");
    expect(evaluateAddrV2Entry({ ...fixtures.find((item) => item.id === "addr-yggdrasil")!, addressHex: "04000000000000000000000000000001" }).outcome).toBe("reject");
  });
});

describe("sendaddrv2 negotiation", () => {
  it("accepts version, sendaddrv2, verack", () => {
    expect(validateSendAddrV2Sequence(["version", "sendaddrv2", "verack"]).valid).toBe(true);
  });

  it("rejects early, late and duplicate signaling", () => {
    expect(validateSendAddrV2Sequence(["sendaddrv2", "version", "verack"]).valid).toBe(false);
    expect(validateSendAddrV2Sequence(["version", "verack", "sendaddrv2"]).valid).toBe(false);
    expect(validateSendAddrV2Sequence(["version", "sendaddrv2", "sendaddrv2", "verack"]).valid).toBe(false);
    expect(validateSendAddrV2Sequence(["version", "verack"]).valid).toBe(false);
  });
});
