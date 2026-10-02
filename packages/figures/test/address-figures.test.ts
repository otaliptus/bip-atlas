import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { CHARSET, analyzeSegwitAddress, formatResidue, hrpExpand, polymod } from "@bip-atlas/models/bech32";
import { AddressAnatomy } from "../src/AddressAnatomy";
import { AddressChecksumLab } from "../src/AddressChecksumLab";
import { ProgramRegrouping } from "../src/ProgramRegrouping";
import { AddressAlphabet } from "../src/address/AddressAlphabet";
import { AddressCase } from "../src/address/AddressCase";
import { PolymodStory } from "../src/address/PolymodStory";
import { QWeakness } from "../src/address/QWeakness";
import { ScriptOpcodes } from "../src/address/ScriptOpcodes";
import { TwoConstants } from "../src/address/TwoConstants";
import { TypoStory } from "../src/address/TypoStory";
import type { AddressFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const all: AddressFixture[] = JSON.parse(readFileSync(new URL("fixtures/addresses.json", root), "utf8")).fixtures;
const fx = (id: string) => all.find((f) => f.id === id)!;
const html = (n: VNode<any>) => render(n);
const disclosure = (s: string) => s.slice(s.indexOf("<details"));

describe("AddressAnatomy", () => {
  const s = html(h(AddressAnatomy, { fixture: fx("v0-p2wpkh") }));
  it("names the five parts with values from the model", () => {
    for (const t of ["PREFIX", "SEPARATOR", "VERSION", "PROGRAM", "CHECKSUM", "20 BYTES · 32 CHARACTERS", "BECH32 · NO INFORMATION", "NETWORK: MAINNET"]) expect(s).toContain(t);
    for (const c of fx("v0-p2wpkh").address) expect(s).toContain(`>${c}<`);
  });
  it("refuses an invalid fixture", () => expect(() => html(h(AddressAnatomy, { fixture: fx("v0-typo") }))).toThrow());
});

describe("AddressAlphabet", () => {
  it("draws the 32 characters in value order and the four left out", () => {
    const s = html(h(AddressAlphabet, {}));
    expect(CHARSET.length).toBe(32);
    expect(s).toContain(">q<");
    expect(s).toContain(">31<");
    for (const c of ["1", "b", "i", "o"]) {
      expect(CHARSET.includes(c)).toBe(false);
      expect(s).toContain(`>${c}<`);
    }
  });
});

describe("AddressCase", () => {
  const f = [fx("v0-p2wpkh"), fx("v0-upper"), fx("mixed-case")];
  const s = html(h(AddressCase, { fixtures: f }));
  it("accepts both single-case spellings, refuses mixed case first", () => {
    expect(analyzeSegwitAddress(f[1].address, "bc").scriptPubKeyHex).toBe(analyzeSegwitAddress(f[0].address, "bc").scriptPubKeyHex);
    expect(s).toContain("REFUSED AT CHARACTERS: MIXED CASE");
    expect(s).toContain("BIP 173 LINE 306");
    expect(disclosure(s)).toContain(f[2].address);
  });
});

describe("PolymodStory", () => {
  const f = fx("v0-p2wpkh");
  const s = html(h(PolymodStory, { fixture: f }));
  it("expands the prefix and lands on 1", () => {
    expect(hrpExpand("bc")).toEqual([3, 3, 0, 2, 3]);
    const sep = f.address.lastIndexOf("1");
    expect(polymod([...hrpExpand("bc"), ...[...f.address.slice(sep + 1)].map((c) => CHARSET.indexOf(c))])).toBe(1);
    expect(s).toContain(formatResidue(1));
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
  });
});

describe("AddressChecksumLab (hero)", () => {
  const lab = all.filter((f) => f.lab);
  const at = (initial?: { fixtureId: string; edit: { index: number; char: string } | null; cursor?: number }) => html(h(AddressChecksumLab, { fixtures: lab, figureId: "fig-a04-5", initial }));
  it("no-JS default: the valid v0 sample passes every gate", () => {
    const s = at();
    expect(s).toContain('data-hydrated="false"');
    expect(s.split(`data-status="pass"`).length - 1).toBe(12); // six gates, wide and narrow
    expect(disclosure(s)).toContain("0014751e76e8199196d454941c45d1b3a323f1433bd6");
  });
  it("one edited character stops at the checksum and matches neither constant", () => {
    const s = at({ fixtureId: "v0-p2wpkh", edit: { index: 20, char: "q" }, cursor: 20 });
    expect(s).toContain('data-stage="checksum" data-status="fail"');
    expect(s).toContain("✕ NEITHER");
    expect(s).toContain("REFUSED · NO CORRECTED VERSION OFFERED");
  });
  it("wrong family passes the checksum and stops at the family gate", () => {
    const s = at({ fixtureId: "v1-bech32-checksum", edit: null });
    expect(s).toContain('data-stage="checksum" data-status="pass"');
    expect(s).toContain('data-stage="family" data-status="fail"');
  });
});

describe("TypoStory", () => {
  const s = html(h(TypoStory, { fixtures: [fx("v0-p2wpkh"), fx("v0-typo")] }));
  it("finds the one changed position and shows both residues", () => {
    expect(s).toContain("position 42");
    expect(s).toContain(formatResidue(analyzeSegwitAddress(fx("v0-typo").address, "bc").residue!));
    expect(s).toContain("MATCHES NEITHER CONSTANT");
  });
});

describe("QWeakness", () => {
  it("is schematic: no real address", () => {
    const s = html(h(QWeakness, {}));
    expect(s).not.toMatch(/bc1|tb1/);
    expect(s).toContain("SCHEMATIC");
  });
});

describe("TwoConstants", () => {
  const s = html(h(TwoConstants, { fixtures: [fx("v0-p2wpkh"), fx("v1-32byte"), fx("v1-bech32-checksum")] }));
  it("shows both constants and the family refusal", () => {
    expect(s).toContain("0x2bc830a3");
    expect(s).toContain("REFUSED AT FAMILY");
    expect(disclosure(s)).toContain(fx("v1-bech32-checksum").address);
  });
});

describe("ProgramRegrouping", () => {
  const s = html(h(ProgramRegrouping, { fixtures: [fx("v0-p2wpkh"), fx("v1-32byte")] }));
  it("regroups to the address's own characters, with padding at the end of a 32-byte program", () => {
    expect(s).toContain("CHARACTERS 5–12");
    expect(s).toContain("4 ZERO BITS OF PADDING");
  });
});

describe("ScriptOpcodes", () => {
  const s = html(h(ScriptOpcodes, { fixtures: [fx("v0-p2wpkh"), fx("v1-32byte")] }));
  it("turns versions 0 and 1 into 00 and 51", () => {
    expect(s).toContain("OP_0");
    expect(s).toContain("OP_1");
    expect(disclosure(s)).toContain(analyzeSegwitAddress(fx("v1-32byte").address, "bc").scriptPubKeyHex!);
    expect(analyzeSegwitAddress(fx("v1-32byte").address, "bc").scriptPubKeyHex!.slice(0, 2)).toBe("51");
  });
});
