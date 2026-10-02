import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { nobleVerify, parseBip340Csv, verifyTrace } from "@bip-atlas/models/schnorr";
import { ByteSizes, DER_MAX_BYTES } from "../src/schnorr/ByteSizes";
import { ChallengePreimage } from "../src/schnorr/ChallengePreimage";
import { Equation } from "../src/schnorr/Equation";
import { EvenY } from "../src/schnorr/EvenY";
import { FailGates } from "../src/schnorr/FailGates";
import { SchnorrVerifier } from "../src/schnorr/SchnorrVerifier";
import { SignatureLayout } from "../src/schnorr/SignatureLayout";
import { VerifyStory } from "../src/schnorr/VerifyStory";
import { SCHNORR_STAGES, gateStatuses, short } from "../src/schnorr/stages";
import type { DerivedSchnorrFixture, SchnorrDerived, SchnorrVectorFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures: SchnorrVectorFixture[] = JSON.parse(readFileSync(new URL("fixtures/schnorr.json", root), "utf8")).fixtures;
const csv = parseBip340Csv(readFileSync(new URL("sources/research-2026-10-01/raw/bip-0340/test-vectors.csv", root), "utf8"));
const chapter = JSON.parse(readFileSync(new URL("content/chapters/schnorr.json", root), "utf8"));
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest();

/** The same derivation as derive.ts deriveSchnorr: each vector traced against every message of its figure. */
export function group(ids: string[]): DerivedSchnorrFixture[] {
  const picked = ids.map((id) => fixtures.find((f) => f.id === id)!);
  const messages: SchnorrDerived["messages"] = [];
  for (const g of picked) if (!messages.some((m) => m.hex === g.messageHex)) messages.push({ key: `m${g.vectorIndex}`, fromVector: g.vectorIndex, hex: g.messageHex, bytes: g.messageHex.length / 2 });
  return picked.map((f) => {
    const v = csv.find((x) => x.line === f.source.line)!;
    expect([v.publicKeyHex, v.messageHex, v.signatureHex, v.result]).toEqual([f.publicKeyHex, f.messageHex, f.signatureHex, f.expected]);
    const traces: SchnorrDerived["traces"] = {};
    for (const m of messages) {
      const t = verifyTrace(f.publicKeyHex, m.hex, f.signatureHex);
      expect(nobleVerify(f.publicKeyHex, m.hex, f.signatureHex)).toBe(t.valid);
      traces[m.key] = { valid: t.valid, failedStage: t.failedStage, steps: t.steps };
    }
    const own = verifyTrace(f.publicKeyHex, f.messageHex, f.signatureHex);
    return {
      ...f,
      derived: {
        messages,
        ownMessage: messages.find((m) => m.hex === f.messageHex)!.key,
        traces,
        challengeTagHex: sha("BIP0340/challenge").toString("hex"),
        challengeHashHex: own.steps.find((s) => s.stage === "challenge")?.values.hash ?? null,
      },
    };
  });
}
const html = (n: VNode<any>) => render(n);
const figures = (() => {
  const out: any[] = [];
  const walk = (bs: any[]) => bs.forEach((b) => (b.type === "figure" ? out.push(b) : b.blocks ? walk(b.blocks) : null));
  out.push(chapter.opening.figure);
  chapter.sections.forEach((s: any) => walk(s.blocks));
  return out;
})();
const figure = (recipe: string) => figures.find((f) => f.recipe === recipe);
const v1 = group(["bip340-v1"])[0];
const t1 = verifyTrace(v1.publicKeyHex, v1.messageHex, v1.signatureHex);
const val = (stage: string, k: string) => t1.steps.find((s) => s.stage === stage)!.values[k];

describe("schnorr figures: placement", () => {
  it("numbers the eight figures in reading order, all drawn in the kit style", () => {
    expect(figures.map((f) => f.figure)).toEqual(["A06.1", "A06.2", "A06.3", "A06.4", "A06.5", "A06.6", "A06.7", "A06.8"]);
    expect(figure("schnorr-verification.v1").figure).toBe("A06.5");
  });
});

describe("A06.1 SignatureLayout", () => {
  const s = html(h(SignatureLayout, { fixture: v1 }));
  it("shows the three inputs shortened, with their exact values disclosed", () => {
    for (const hex of [v1.publicKeyHex, v1.messageHex, v1.signatureHex.slice(0, 64), v1.signatureHex.slice(64)]) {
      expect(s).toContain(short(hex));
      expect(s).toContain(`>${hex}</code>`);
    }
    expect(s).toContain("PK · PUBLIC KEY · 32 BYTES");
    expect(s).toContain("SIG · SIGNATURE · 64 BYTES = r ‖ s");
  });
  it("lights the lamp for a valid vector and takes no secret key", () => {
    expect(s).toContain('data-state="on"');
    expect(s).toContain("NO SECRET KEY GOES IN");
  });
});

describe("A06.2 ByteSizes", () => {
  const s = html(h(ByteSizes, { fixture: v1 }));
  it("uses the BIP's 72-byte DER bound and the vector's key", () => {
    expect(readFileSync(new URL("sources/research-2026-10-01/raw/bip-0340.mediawiki", root), "utf8").split("\n")[42]).toContain(`up to ${DER_MAX_BYTES} bytes`);
    expect(s).toContain("UP TO 72 B");
    expect(s).toContain("BIP 340 SIGNATURE · 64 B, ALWAYS");
    expect(s).toContain("COMPRESSED KEY · 33 B");
    expect(s).toContain(`02${v1.publicKeyHex}`);
  });
});

describe("A06.3 Equation", () => {
  it("labels r, s and e from the independent trace", () => {
    const s = html(h(Equation, { fixture: v1 }));
    for (const hex of [val("r-range", "r"), val("s-range", "s"), val("challenge", "e")]) {
      expect(s).toContain(short(hex));
      expect(s).toContain(`>${hex}</code>`);
    }
  });
  it("refuses an invalid vector", () => expect(() => html(h(Equation, { fixture: group(["bip340-v7"])[0] }))).toThrow());
});

describe("A06.4 VerifyStory", () => {
  const s = html(h(VerifyStory, { fixture: v1 }));
  it("has six frames following the trace", () => {
    expect(s.split('class="k-story__frame"').length - 1).toBe(6);
    for (const hex of [val("lift-x", "y"), val("challenge", "e"), val("compute-r", "x"), val("compute-r", "y")]) expect(s).toContain(`>${hex}</code>`);
  });
});

describe("A06.5 SchnorrVerifier (no-JS render)", () => {
  const hero = figure("schnorr-verification.v1");
  const all = group(hero.fixtures);
  it("renders vector 1 with every gate passed and the lamp on", () => {
    const s = html(h(SchnorrVerifier, { fixtures: all, figureId: "fig-a06-5" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s.split('data-status="pass"').length - 1).toBe(2 * 8);
    expect(s).toContain("Every gate passes: Verify succeeds.");
    expect(s).toContain(v1.publicKeyHex);
  });
  it("stops vector 7 at the even-y gate and draws gate 8 as never reached", () => {
    const v7 = all.find((f) => f.vectorIndex === 7)!;
    const s = html(h(SchnorrVerifier, { fixtures: [v7, ...all.filter((f) => f !== v7)], figureId: "x" }));
    expect(s.split('data-status="fail"').length - 1).toBe(2);
    expect(s.split('data-status="not-reached"').length - 1).toBe(2);
    expect(s).toContain("Verify stops at gate 7");
    expect(s).toContain("Published result for vector 7: FALSE");
  });
});

describe("A06.6 FailGates", () => {
  const fig = figure("schnorr-fail-gates.v1");
  const s = html(h(FailGates, { fixtures: group(fig.fixtures) }));
  it("stops each vector where the BIP's verifier does", () => {
    const want: Record<number, string> = { 1: "none", 15: "none", 17: "none", 5: "lift-x", 14: "lift-x", 12: "r-range", 13: "s-range", 9: "infinity", 6: "even-y", 7: "even-y", 8: "x-match", 11: "x-match" };
    for (const [v, stage] of Object.entries(want)) expect(s).toContain(`data-vector="${v}" data-stops="${stage}"`);
  });
  it("names vector 7's lane by its CSV comment", () => expect(s).toContain("V7 · negated message"));
  it("gateStatuses marks nothing after the failing gate", () => {
    const v8 = group(["bip340-v8"])[0];
    expect(gateStatuses(v8.derived.traces[v8.derived.ownMessage])).toEqual(["pass", "pass", "pass", "pass", "pass", "pass", "pass", "fail"]);
    expect(SCHNORR_STAGES).toHaveLength(8);
  });
});

describe("A06.7 ChallengePreimage", () => {
  const fig = figure("challenge-preimage.v1");
  const g = group(fig.fixtures);
  const s = html(h(ChallengePreimage, { fixtures: g }));
  it("draws 128 fixed bytes plus each message, and its hash recomputed independently", () => {
    const tag = sha("BIP0340/challenge");
    for (const f of g) {
      const m = f.messageHex.length / 2;
      expect(s).toContain(`${m}-BYTE MESSAGE · ${128 + m} BYTES IN`);
      const P = Buffer.from(f.publicKeyHex, "hex");
      const want = sha(Buffer.concat([tag, tag, Buffer.from(f.signatureHex.slice(0, 64), "hex"), P, Buffer.from(f.messageHex, "hex")])).toString("hex");
      expect(f.derived.challengeHashHex).toBe(want);
      expect(s).toContain(`>${want}</code>`);
    }
    expect(fig.caption).toContain("128 fixed bytes");
  });
});

describe("A06.8 EvenY", () => {
  const fig = figure("schnorr-even-y.v1");
  const s = html(h(EvenY, { fixtures: group(fig.fixtures) }));
  it("keeps the even y of vector 1's key and shows vector 6's R with odd y", () => {
    expect(BigInt(`0x${val("lift-x", "y")}`) % 2n).toBe(0n);
    expect(s).toContain(`>${val("lift-x", "y")}</code>`);
    const v6 = csv.find((v) => v.index === 6)!;
    const t6 = verifyTrace(v6.publicKeyHex, v6.messageHex, v6.signatureHex);
    expect(t6.failedStage).toBe("even-y");
    expect(BigInt(`0x${t6.steps.find((x) => x.stage === "compute-r")!.values.y}`) % 2n).toBe(1n);
    expect(fig.caption).toContain("vector 6’s R has odd y");
  });
  it("draws the two secret keys without values", () => {
    expect(s).toContain(">n − sk<");
    expect(s).toContain('data-role="secret"');
  });
});
