import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluatePaymentCallback, parseDecimalBtc, parsePaymentInstruction } from "../src/paymentInstructions";

const data: {
  fixtures: Array<{ id: string; label: string; uri: string; expected: string }>;
  callbacks: Array<{ id: string; uri: string; paymentMethod: "onchain" | "lightning"; expectedCallback: string | null; paymentAllowed: boolean; opensCallback: boolean }>;
} = JSON.parse(readFileSync(new URL("../../../fixtures/payment-instructions.json", import.meta.url), "utf8"));

describe("BIP 321 published URI examples", () => {
  for (const fixture of data.fixtures) {
    it(fixture.label, () => {
      const result = parsePaymentInstruction(fixture.uri);
      expect(result.valid, result.issues.join("; ")).toBe(fixture.expected === "valid");
      expect(result.instructions.length).toBeGreaterThan(0);
    });
  }

  it("computes 20.30 BTC without floating-point arithmetic", () => {
    const result = parsePaymentInstruction("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?amount=20.3&label=Luke-Jr");
    expect(result.amountSats).toBe(2030000000n);
    expect(result.label).toBe("Luke-Jr");
  });

  it("accepts unknown optional and multiple payment-instruction keys", () => {
    const result = parsePaymentInstruction("bitcoin:?something=unknown&bc=bc1qufgy354j3kmvuch987xe4s40836x3h0lg8f5nq&bc=bc1p5swkugezn97763tl0yty6556856uug0q6jflljvep9m4p7339x5qzyrh4q");
    expect(result.valid).toBe(true);
    expect(result.instructions.map((item) => item.key)).toEqual(["bc", "bc"]);
  });

  it("decodes the message once as UTF-8", () => {
    const result = parsePaymentInstruction("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?message=Donation%20for%20project%20xyz");
    expect(result.message).toBe("Donation for project xyz");
  });
});

describe("BIP 321 proof-of-payment examples", () => {
  for (const fixture of data.callbacks) {
    it(fixture.id, () => {
      const paymentInfo = fixture.paymentMethod === "onchain" ? "$HEX_ENCODED_TRANSACTION" : "$HEX_ENCODED_PAYMENT_PREIMAGE";
      const result = evaluatePaymentCallback(fixture.uri, fixture.paymentMethod, paymentInfo);
      expect(result.paymentAllowed).toBe(fixture.paymentAllowed);
      expect(result.opensCallback).toBe(fixture.opensCallback);
      expect(result.callbackUrl).toBe(fixture.expectedCallback);
    });
  }
});

describe("decimal BTC and malformed inputs", () => {
  it("accepts exact boundaries and the BIP's optional digit positions", () => {
    expect(parseDecimalBtc("0")).toBe(0n);
    expect(parseDecimalBtc("0.00000001")).toBe(1n);
    expect(parseDecimalBtc("00020.30")).toBe(2030000000n);
    expect(parseDecimalBtc("21000000")).toBe(2100000000000000n);
    expect(parseDecimalBtc(".5")).toBe(50000000n);
    expect(parseDecimalBtc("20.")).toBe(2000000000n);
  });

  it.each(["", ".", "50,000.00", "1e-8", "-1", "0.000000001", "21000000.00000001"])("rejects %s", (value) => {
    expect(() => parseDecimalBtc(value)).toThrow();
  });

  it("rejects an empty body without a payment instruction", () => {
    const result = parsePaymentInstruction("bitcoin:?label=only-metadata");
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("at least one payment instruction");
  });

  it("rejects malformed percent encoding", () => {
    expect(parsePaymentInstruction("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?label=%ZZ").valid).toBe(false);
  });
});

describe("callback scheme boundaries", () => {
  it.each(["data", "about", "blob", "https", "custom"])("blocks required %s callbacks when safety is unknown", (scheme) => {
    const uri = `bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?req-pop=${encodeURIComponent(`${scheme}:`)}`;
    const result = evaluatePaymentCallback(uri, "onchain", "$HEX_ENCODED_TRANSACTION");
    expect(result.paymentAllowed).toBe(false);
    expect(result.opensCallback).toBe(false);
    expect(result.callbackUrl).toBeNull();
  });

  it("allows an optional unsupported callback to be skipped without opening it", () => {
    const result = evaluatePaymentCallback("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?pop=data%3Atext%2Fhtml%2Chello", "onchain", "$HEX_ENCODED_TRANSACTION");
    expect(result.paymentAllowed).toBe(true);
    expect(result.opensCallback).toBe(false);
    expect(result.callbackUrl).toBeNull();
  });
});
