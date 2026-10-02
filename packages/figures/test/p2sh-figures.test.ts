import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { P2shCommitment } from "../src/p2sh/P2shCommitment";
import { P2shFailures, P2shShape, P2shStackStory } from "../src/p2sh/P2shStatics";
import { P2shTwoStage, p2shHeroSpec } from "../src/p2sh/P2shTwoStage";
import { P2shLimit, P2shWrapped } from "../src/p2sh/P2shWrapped";
import type { DerivedP2shFixture } from "../src/types";
import { deriveChapter } from "./derived";

const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
const all = await deriveChapter<DerivedP2shFixture>("p2sh.json", ["bip174-legacy", "bip174-p2sh-p2wsh", "bip143-p2sh-p2wpkh"]);
const [legacy, wsh, wpkh] = all;

describe("deriveP2sh additions", () => {
  it("classifies every stack item", () => {
    expect(Object.values(wsh.derived.itemKinds)).toContain("witness script");
    expect(Object.values(legacy.derived.itemKinds).sort()).toEqual(["empty", "hash", "number", "number", "public key", "public key", "redeem script", "signature", "signature"]);
    expect(wsh.derived.witnessScriptHex!.length / 2).toBe(71);
    expect(wpkh.derived.witnessScriptHex).toBeNull();
  });
  it("records three ways the legacy spend fails, each at its own stage", () => {
    const x = legacy.derived.failures!;
    expect([x.nonPush.failsAt, x.alteredRedeem.failsAt, x.swapped.failsAt]).toEqual(["push-only", "hash-match", "redeem"]);
    expect(x.alteredRedeem.hash160Hex).not.toBe(legacy.derived.committedHashHex);
    expect(wsh.derived.failures).toBeNull();
  });
});

describe("P2shTwoStage (hero, static renders)", () => {
  const r = (initial?: { id: string; revealed: boolean; stage: number }) => html(h(P2shTwoStage, { fixtures: all, figureId: "fig-a09-4", initial }));
  it("no-JS default: legacy spend revealed at its last stage", () => {
    const spec = p2shHeroSpec(all);
    const s = r(spec.states.find((x) => x.id === spec.noJsId)!.state);
    expect(s).toContain("OP_CHECKMULTISIG");
    expect(s).toContain(legacy.derived.redeemScriptHex);
    expect(s).toContain("✓ THE SPEND IS VALID");
  });
  it("before the spend nothing about the script leaks, for every spend and any stepper position", () => {
    const spec = p2shHeroSpec(all);
    // The spend strip names sources only, and every hidden key shows the one hidden state.
    expect(JSON.stringify(spec.controls)).not.toMatch(/P2WSH|P2WPKH|legacy|multisig/i);
    all.forEach((_, i) => [0, 1, 2].forEach((k) => expect(spec.states.find((x) => x.keys.includes(`s${i}|hidden|${k}`))!.id).toBe(`s${i}-hidden`)));
    for (const st of spec.states.filter((x) => !x.state.revealed)) {
      const f = all.find((x) => x.id === st.state.id)!;
      const s = r(st.state);
      expect(html(h(P2shTwoStage, { fixtures: all, figureId: `fig-a09-4-${st.id}`, initial: st.state }))).not.toMatch(/witness|redeem"|data-stage=|p2wsh|p2wpkh|legacy/i);
      expect(st.valueText).not.toMatch(/witness|P2W|multisig/i);
      expect(s).not.toContain(f.derived.redeemScriptHex);
      expect(s).not.toMatch(/OP_CHECKMULTISIG|&lt;|OP_0 /);
      expect(s).not.toContain(f.derived.redeemHash160Hex.slice(0, 8) + "… = THE LOCK");
      expect(s).not.toMatch(/WITNESS CHECKED|SCRIPT RUNS|P2WSH|P2WPKH|MULTISIG/);
      expect(s).toContain(`${f.derived.committedHashHex.slice(0, 8)}…`);
    }
  });
  it("each revealed stage draws its stack from the model", () => {
    const hash = r({ id: legacy.id, revealed: true, stage: 1 });
    expect(wideOnly(hash)).toContain("✓ EQUAL");
    const run = r({ id: wsh.id, revealed: true, stage: 2 });
    expect(run).toContain("SIG 1 → KEY 1, SIG 2 → KEY 2");
  });
});

describe("Static P2SH drawings", () => {
  it("A09.1: the lock and the script's HASH160 agree", () => {
    const s = html(h(P2shCommitment, { fixture: legacy }));
    expect(legacy.derived.redeemHash160Hex).toBe(legacy.derived.committedHashHex);
    expect(s).toContain("✓ THE SPEND'S SCRIPT HASHES TO THE LOCK");
    expect(s).toContain(legacy.derived.redeemScriptHex);
  });
  it("A09.2: three script sizes, one 23-byte shape", () => {
    const s = html(h(P2shShape, { fixtures: all }));
    expect(all.map((f) => f.derived.redeemScriptHex.length / 2)).toEqual([71, 34, 22]);
    for (const f of all) expect(f.derived.scriptPubKeyHex.length / 2).toBe(23);
    expect((s.match(/>23 B</g) ?? []).length).toBe(3);
  });
  it("A09.3: five frames from the recorded trace", () => {
    const s = html(h(P2shStackStory, { fixture: legacy }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(5);
    expect(s).toContain("SIG 1 → KEY 1 ✓");
  });
  it("A09.5: three failures, the altered hash in full", () => {
    const s = html(h(P2shFailures, { fixture: legacy }));
    expect(s).toContain(legacy.derived.failures!.alteredRedeem.hash160Hex);
    expect(s).toContain("NOT PUSH-ONLY ✗");
  });
  it("A09.6: the prose's 218, 35 and weights 872 and 358", () => {
    const s = html(h(P2shWrapped, { fixtures: all }));
    expect(legacy.derived.scriptSigBytes).toBe(218);
    expect([wsh.derived.scriptSigBytes, wsh.derived.witnessBytes]).toEqual([35, 218]);
    expect(s).toContain("SCRIPTSIG + WITNESS: 4 × 218 + 0 = 872 WU");
    expect(s).toContain("4 × 35 + 218 = 358 WU");
  });
  it("A09.7: fifteen keys in 513 bytes; the pinned script is 3 + 34 × 2", () => {
    const s = html(h(P2shLimit, { fixture: legacy }));
    expect(s).toContain("15 KEYS = 3 + 34 × 15 = 513 B");
    expect(s).toContain("71 B = 3 + 34 × 2");
  });
});
