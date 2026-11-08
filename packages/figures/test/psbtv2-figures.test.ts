import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { PsbtV2Invalid } from "../src/psbtv2/PsbtV2Invalid";
import { PsbtV2LockTime, psbtV2HeroSpec } from "../src/psbtv2/PsbtV2LockTime";
import { PsbtV2Maps } from "../src/psbtv2/PsbtV2Maps";
import { PsbtV2Modifiable } from "../src/psbtv2/PsbtV2Modifiable";
import type { DerivedPsbtV2Fixture } from "../src/types";
import { deriveChapter } from "./derived";

const root = new URL("../../../", import.meta.url);
const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
const all = await deriveChapter<DerivedPsbtV2Fixture>("psbt-v2.json");
const byLine = (n: number) => all.find((f) => f.hexLine === n)!;
const locktime = all.filter((f) => f.group === "locktime");
const invalid = all.filter((f) => f.group === "invalid");

describe("psbt-v2 fixtures", () => {
  it("cover the 24 invalid vectors, 4 valid ones and all 10 lock-time vectors", () => {
    expect(invalid).toHaveLength(24);
    expect(locktime).toHaveLength(10);
    expect(all.filter((f) => f.group === "valid").map((f) => f.hexLine)).toEqual([433, 437, 453, 457]);
  });
  it("give each lock-time vector the result its heading states", () => {
    expect(locktime.map((f) => f.derived.lockTime!.value)).toEqual(locktime.map((f) => f.expectedLockTime));
    expect(byLine(506).derived.unsignedTx).toBeNull();
    expect(byLine(493).derived.lockTime!.date).toBe("2022-07-05T19:14:20Z");
  });
});

describe("A22.4 hero", () => {
  const spec = psbtV2HeroSpec(locktime);
  const r = (line: number) => wideOnly(html(h(PsbtV2LockTime, { fixtures: locktime, figureId: "fig-a22-4", initial: { id: byLine(line).id } })));
  it("has one state per vector and starts on line 479", () => {
    expect(spec.states).toHaveLength(10);
    expect(spec.controls[0].options.map((o) => o.text)).toEqual(["No lock times", "Fallback 0", "Height · none", "Height · height", "Height · both", "Both · both", "Time · both", "Both · time", "None · time", "Height · time"]);
    expect(spec.states.find((s) => s.id === spec.noJsId)!.state).toEqual({ id: "bip370-l479" });
  });
  it("draws each vector's requirements and BIP 370's result", () => {
    for (const f of locktime) {
      const s = r(f.hexLine);
      expect(s).toContain(f.expectedLockTime === null ? "CANNOT BE COMPUTED" : `COMPUTED TO BE ${f.expectedLockTime}`);
      for (const inp of f.derived.inputs) {
        if (inp.requiredHeight !== null) expect(s).toContain(`REQUIRED HEIGHT ${inp.requiredHeight}`);
        if (inp.requiredTime !== null) expect(s).toContain(`REQUIRED TIME ${inp.requiredTime}`);
      }
    }
  });
  it("says why: the tie goes to height, a conflict has no answer", () => {
    expect(r(487)).toContain("Each of them accepts both types: height wins the tie.");
    expect(r(479)).toContain("Largest required height: max(10000, 9000) = 10000.");
    expect(r(475)).toContain("It accepts a height.");
    expect(r(506)).toContain("No type suits all of them: one needs a height, another a time.");
    expect(r(506)).toContain("NO LOCK TIME CAN BE CHOSEN");
    expect(r(465)).toContain("No fallback field, so the fallback is 0.");
    expect(r(500)).toContain("NO CASE LINE");
  });
});

describe("A22.1 to A22.3", () => {
  it("A22.1 lists every map's records and the 113-byte transaction they describe", () => {
    const f = byLine(457);
    const s = html(h(PsbtV2Maps, { fixture: f }));
    expect(s).toContain("THE UNSIGNED TRANSACTION THEY DESCRIBE · 113 BYTES");
    for (const name of ["TX_VERSION", "FALLBACK_LOCKTIME", "INPUT_COUNT", "OUTPUT_COUNT", "TX_MODIFIABLE", "PREVIOUS_TXID", "OUTPUT_INDEX", "SEQUENCE", "REQUIRED_TIME_LOCKTIME", "REQUIRED_HEIGHT_LOCKTIME", "AMOUNT", "SCRIPT", "NON_WITNESS_UTXO", "BIP32_DERIVATION"]) expect(s).toContain(`>${name}<`);
    expect(s).toContain("both types fit, so the height is used");
    expect(s.split("data-part=").length - 1).toBe(12);
    expect(f.derived.maps.flatMap((m) => m.records).filter((r) => r.v2)).toHaveLength(14);
  });
  it("A22.2 rejects every invalid vector for the field its case names", () => {
    const s = html(h(PsbtV2Invalid, { fixtures: invalid }));
    expect(s.split("data-rule=").length - 1).toBe(24);
    expect(s).toContain("STILL HAS UNSIGNED_TX");
    expect(s).toContain("499999999 &lt; 500000000");
    expect(s).toContain("500000000 ≥ 500000000");
    expect(s).toContain("0 IS NOT > 0");
    expect(s.split("NOT ALLOWED IN V0").length - 1).toBe(12);
    expect(s.split("MISSING IN V2").length - 1).toBe(7);
  });
  it("A22.3 shows the flags and what each signature leaves", () => {
    const s = html(h(PsbtV2Modifiable, { fixtures: [byLine(437), byLine(453)] }));
    expect(s).toContain("TX_MODIFIABLE = 0x03");
    expect(s).toContain("A CONSTRUCTOR MAY ADD: INPUTS ✓ · OUTPUTS ✓");
    expect(byLine(437).derived.modifiableView!.afterSigning.map((x) => x.flags)).toEqual([0x00, 0x02, 0x04, 0x01, 0x03, 0x05]);
    expect(s).toContain("ALL EIGHT BITS SET (0xff) IS STILL A VALID PSBT");
  });
});

describe("psbt-v2 prose", () => {
  const text = readFileSync(new URL("content/chapters/psbt-v2.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("The model builds the 113-byte unsigned transaction");
    expect(byLine(457).derived.unsignedTx!.hex.length / 2).toBe(113);
    expect(text).toContain("BIP 370's 24 invalid PSBTs. Twelve are version 0 PSBTs carrying a field version 2 adds.");
    expect(invalid.filter((f) => f.derived.version === 0)).toHaveLength(12);
    expect(text).toContain("The other eleven are version 2 PSBTs");
    expect(invalid.filter((f) => f.derived.version === 2 && /^PSBTv2/.test(f.label))).toHaveLength(11);
    expect(text).toContain("BIP 370's ten lock-time vectors");
    expect(locktime).toHaveLength(10);
    expect(text).toContain("The vector on line 500 is printed without a case line");
    expect(byLine(500).label).toMatch(/^Unlabelled/);
  });
  it("the vectors that differ only in sequence or flags share one ID", () => {
    const ids = [433, 437, 453].map((l) => byLine(l).derived.uniqueIdHex);
    expect(new Set([...ids, byLine(465).derived.uniqueIdHex]).size).toBe(1);
    expect(byLine(457).derived.uniqueIdHex).not.toBe(ids[0]);
  });
});
