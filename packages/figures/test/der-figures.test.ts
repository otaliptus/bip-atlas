import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { DerAnatomy } from "../src/der/DerAnatomy";
import { DerLowS } from "../src/der/DerLowS";
import { DerSignatureChecks, derHeroSpec } from "../src/der/DerSignatureChecks";
import { DerTxidFlip } from "../src/der/DerTxidFlip";
import type { DerivedDerFixture } from "../src/types";
import { deriveChapter } from "./derived";

const root = new URL("../../../", import.meta.url);
const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
const [in0, in1] = await deriveChapter<DerivedDerFixture>("strict-signatures.json", ["input0-p2pk", "input1-p2wpkh"]);
const v = (f: DerivedDerFixture, id: string) => f.derived.variants.find((x) => x.id === id)!;

describe("strict-signatures fixtures", () => {
  it("compute five changes for input 0 and four for input 1 (no R pad)", () => {
    expect(in0.derived.variants.map((x) => x.id)).toEqual(["published", "pad-removed", "zero-added", "length-byte", "s-flipped"]);
    expect(in1.derived.variants.map((x) => x.id)).toEqual(["published", "zero-added", "length-byte", "s-flipped"]);
    expect(in1.derived.digestHex).toBe(in1.sighashHex);
  });
  it("mark what each change touches", () => {
    expect(v(in0, "pad-removed").changed).toEqual(["total", "r-len", "r"]);
    expect(v(in0, "length-byte").changed).toEqual(["total"]);
    expect(v(in0, "s-flipped").changed).toEqual(["total", "s-len", "s"]);
  });
});

describe("A23.1 hero", () => {
  const spec = derHeroSpec([in0]);
  const r = (change: string) => wideOnly(html(h(DerSignatureChecks, { fixtures: [in0], figureId: "fig-a23-1", initial: { change: change as never } })));
  it("has five states, the published one first and without JavaScript", () => {
    expect(spec.states.map((s) => s.id)).toEqual(["published", "pad-removed", "zero-added", "length-byte", "s-flipped"]);
    expect(spec.noJsId).toBe("published");
    expect(() => derHeroSpec([in1])).toThrow(/padded R/);
  });
  it("runs BIP 66's checks up to the first failure", () => {
    const count = (s: string, state: string) => (s.match(new RegExp(`data-check="[^"]+" data-state="${state}"`, "g")) ?? []).length;
    const pub = r("published");
    expect([count(pub, "on"), count(pub, "off"), count(pub, "idle")]).toEqual([14, 0, 0]);
    const pad = r("pad-removed");
    expect([count(pad, "on"), count(pad, "off"), count(pad, "idle")]).toEqual([8, 1, 5]);
    expect(pad).toContain("BIP 66 rejects it at line 84");
    expect(r("length-byte")).toContain("BIP 66 rejects it at line 62");
    expect(r("zero-added")).toContain("BIP 66 rejects it at line 101");
  });
  it("reaches ECDSA and LOW_S only for strict encodings", () => {
    expect(r("zero-added")).toContain("NOT REACHED");
    const flip = r("s-flipped");
    expect(flip).toContain("VALID SIGNATURE");
    expect(flip).toContain("S > n / 2: WOULD FAIL");
    expect(flip).toContain("BIP 146 records LOW_S as relay policy, not a consensus rule.");
    expect(r("pad-removed")).toContain("R'S DIGITS KEPT, NOW READ AS NEGATIVE");
    expect(flip).toContain("S REPLACED BY n − S");
    expect(flip).toContain("(changed)");
    expect(r("published")).toContain("S ≤ n / 2");
  });
});

describe("A23.2 to A23.4", () => {
  it("A23.2 explains R's pad on input 0 and its absence on input 1", () => {
    const s = html(h(DerAnatomy, { fixtures: [in0, in1] }));
    expect(s).toContain("R STARTS 00 8b: 8B HAS ITS TOP BIT SET, SO ONE 00 IS REQUIRED");
    expect(s).toContain("R STARTS 36: TOP BIT CLEAR, SO NO PAD IS ALLOWED");
    expect(s).toContain("INPUT 0 · SCRIPTSIG · 72 BYTES");
    expect(s).toContain("INPUT 1 · WITNESS · 71 BYTES");
  });
  it("A23.3 puts each S below n / 2 and its twin above", () => {
    for (const f of [in0, in1]) {
      expect(f.derived.sFraction).toBeLessThan(0.5);
      expect(f.derived.flippedFraction).toBeGreaterThan(0.5);
      expect(f.derived.sFraction + f.derived.flippedFraction).toBeCloseTo(1, 5);
    }
    const s = html(h(DerLowS, { fixtures: [in0, in1] }));
    expect(s).toContain("25.1% of the way to n");
    expect(s).toContain("34.1% of the way to n");
  });
  it("A23.4: a scriptSig flip changes both identifiers, a witness flip only the wtxid", () => {
    const s = html(h(DerTxidFlip, { fixtures: [in0, in1] }));
    expect(v(in0, "s-flipped").txidHex).not.toBe(in0.derived.published.txidHex);
    expect(v(in1, "s-flipped").txidHex).toBe(in1.derived.published.txidHex);
    expect(v(in1, "s-flipped").wtxidHex).not.toBe(in1.derived.published.wtxidHex);
    expect(s.split(">CHANGED<").length - 1).toBe(3);
    expect(s.split(">SAME<").length - 1).toBe(1);
  });
});

describe("strict-signatures prose", () => {
  const text = readFileSync(new URL("content/chapters/strict-signatures.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("Input 0's R begins with 0x8b, whose top bit is set, so it carries one zero byte and is 33 bytes long. Input 1's R begins with 0x36");
    const r = (f: DerivedDerFixture) => v(f, "published").fields.find((x) => x.id === "r")!.hex;
    expect(r(in0).slice(0, 4)).toBe("008b");
    expect(r(in0).length / 2).toBe(33);
    expect(r(in1).slice(0, 2)).toBe("36");
    expect(text).toContain("Of S and its twin, exactly one is in that half");
    expect(text).toContain("BIP 66 rejects each at a different check");
    expect(new Set(["pad-removed", "zero-added", "length-byte"].map((c) => v(in0, c).encoding.failed!.line)).size).toBe(3);
  });
});
