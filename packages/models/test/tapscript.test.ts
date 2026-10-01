import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { taprootOutput } from "../src/taproot";
import {
  TraceScopeError,
  castToBool,
  decodeNum,
  decodeTapscript,
  encodeNum,
  isOpSuccess,
  traceTapscript,
  type ScriptAssetCase,
} from "../src/tapscript";

const root = new URL("../../../", import.meta.url);
const excerpt = JSON.parse(readFileSync(new URL("sources/external/core-script-assets-excerpt.json", root), "utf8"));
const lock = JSON.parse(readFileSync(new URL("sources/external/external.lock.json", root), "utf8"));
const bip342 = readFileSync(new URL("sources/research-2026-10-01/raw/bip-0342.mediawiki", root), "utf8").split("\n");
const cases = excerpt.cases as Record<string, ScriptAssetCase>;
const get = (i: number) => cases[String(i)];

/** What each reviewed case should show: where the failure witness stops, and why. */
const REVIEWED: Record<number, { failStage: string; reason: RegExp; successSigOps: number }> = {
  804: { failStage: "execute", reason: /OP_CHECKMULTISIG is disabled/, successSigOps: 1 },
  1135: { failStage: "execute", reason: /public key is empty/, successSigOps: 1 },
  1109: { failStage: "execute", reason: /n is 5 bytes, larger than 4/, successSigOps: 1 },
  662: { failStage: "execute", reason: /MINIMALIF/, successSigOps: 1 },
  824: { failStage: "execute", reason: /fails BIP 340 verification/, successSigOps: 1 },
  50: { failStage: "final-stack", reason: /0 elements/, successSigOps: 0 },
};

describe("pinned Core script-assets excerpt", () => {
  it("is locked by hash and records the full upstream file", () => {
    const entry = lock.files.find((f: { file: string }) => f.file === "core-script-assets-excerpt.json");
    expect(entry.commit).toBe(excerpt.upstream.commit);
    expect(entry.upstreamSha256).toBe(excerpt.upstream.sha256);
    expect(excerpt.upstream.cases).toBe(2244);
  });

  it("holds exactly the reviewed cases, all with TAPROOT consensus flags", () => {
    expect(Object.keys(cases).map(Number).sort((a, b) => a - b)).toEqual(Object.keys(REVIEWED).map(Number).sort((a, b) => a - b));
    for (const c of Object.values(cases)) expect(c.flags.split(",")).toContain("TAPROOT");
  });
});

describe("reviewed traces agree with Bitcoin Core's labels", () => {
  for (const [i, r] of Object.entries(REVIEWED)) {
    const c = get(Number(i));
    it(`case ${i} (${c.comment}): success witness passes, failure witness fails where expected`, () => {
      const ok = traceTapscript(c, "success");
      expect(ok.valid, ok.reason).toBe(true);
      expect(ok.commitmentOk).toBe(true);
      expect(ok.sigOpsCounted).toBe(r.successSigOps);
      const bad = traceTapscript(c, "failure");
      expect(bad.valid).toBe(false);
      expect(bad.commitmentOk).toBe(true);
      expect(bad.failStage).toBe(r.failStage);
      expect(bad.reason).toMatch(r.reason);
      if (bad.failStage === "execute") expect(bad.steps.at(-1)!.failed).toBe(true);
    });
  }

  it("counts the sigops budget as 50 + witness size, minus 50 per non-empty signature", () => {
    const c = get(1135);
    const t = traceTapscript(c, "success");
    const w = c.success!.witness;
    const size = 1 + w.reduce((n, e) => n + (e.length / 2 < 253 ? 1 : 3) + e.length / 2, 0);
    expect(t.budgetStart).toBe(50 + size);
    const sigSteps = t.steps.filter((s) => s.sig);
    expect(sigSteps.map((s) => s.sig!.check)).toEqual(["valid", "empty"]);
    expect(sigSteps.map((s) => s.sig!.budgetAfter)).toEqual([t.budgetStart - 50, t.budgetStart - 50]);
  });

  it("skips OP_RETURN in an unexecuted branch (case 662)", () => {
    const t = traceTapscript(get(662), "success");
    const ret = t.steps.find((s) => s.name === "OP_RETURN")!;
    expect(ret.executed).toBe(false);
  });

  it("treats a 33-byte key as an unknown key type: counted, not verified (case 824)", () => {
    const t = traceTapscript(get(824), "success");
    expect(t.steps.find((s) => s.sig)!.sig).toEqual({ check: "unknown-key-type", budgetAfter: t.budgetStart - 50, keyBytes: 33 });
  });

  it("finds OP_SUCCESS while decoding and executes nothing (case 50)", () => {
    const t = traceTapscript(get(50), "success");
    expect(t.steps).toEqual([]);
    expect(t.reason).toMatch(/OP_SUCCESS126/);
  });

  it("rejects a valid signature once a single byte of the transaction changes", () => {
    const c = structuredClone(get(804));
    c.tx = c.tx.slice(0, -2) + (c.tx.endsWith("00") ? "01" : "00");
    const t = traceTapscript(c, "success");
    expect(t.valid).toBe(false);
    expect(t.reason).toMatch(/fails BIP 340 verification/);
  });
});

describe("out-of-scope input rejection", () => {
  const withScript = (scriptHex: string) => {
    // Reuse case 804's spend, replacing the script; the commitment check then fails first.
    const c = structuredClone(get(804));
    c.success!.witness = [c.success!.witness[0], scriptHex, c.success!.witness.at(-1)!];
    return c;
  };

  it("fails the commitment check before anything else when the script is not the committed leaf", () => {
    const t = traceTapscript(withScript("51"), "success");
    expect([t.valid, t.failStage]).toEqual([false, "commitment"]);
  });

  it("refuses unsupported opcodes rather than guessing", () => {
    // OP_ADD (0x93), OP_CODESEPARATOR (0xab), OP_CHECKLOCKTIMEVERIFY (0xb1) are outside the reviewed set.
    for (const script of ["515193", "ab51", "51b1"]) expect(() => traceTapscript(withScript(script), "success")).toThrow(TraceScopeError);
  });

  it("throws TraceScopeError for a key-path spend and for non-0xc0 leaf versions", () => {
    const c = structuredClone(get(804));
    c.success!.witness = [c.success!.witness[0]];
    expect(() => traceTapscript(c, "success")).toThrow(TraceScopeError);
    const d = structuredClone(get(804));
    const cb = d.success!.witness.at(-1)!;
    d.success!.witness[d.success!.witness.length - 1] = "c2" + cb.slice(2);
    expect(() => traceTapscript(d, "success")).toThrow(TraceScopeError);
  });

  it("decodes OP_SUCCESS before a broken push, and fails a push past the end", () => {
    expect(decodeTapscript("504c").kind).toBe("op-success");
    expect(decodeTapscript("4c").kind).toBe("bad-push");
    expect(decodeTapscript("0201").kind).toBe("bad-push");
  });

  it("lists the OP_SUCCESSx ranges exactly as BIP 342 does", () => {
    expect(bip342[56]).toContain("80, 98, 126-129, 131-134, 137-138, 141-142, 149-153, 187-254");
    const listed = [80, 98, 126, 127, 128, 129, 131, 132, 133, 134, 137, 138, 141, 142, 149, 150, 151, 152, 153, ...Array.from({ length: 68 }, (_, i) => 187 + i)];
    expect(Array.from({ length: 256 }, (_, i) => i).filter(isOpSuccess)).toEqual(listed);
  });
});

describe("rules found in review", () => {
  /** Case 804's transaction, re-pointed at an output that commits to `scriptHex` alone. */
  const committed = (scriptHex: string, stack: string[] = [], scriptSig = "") => {
    const c = structuredClone(get(804));
    const internal = "dff1d77f2a671c5f36183726db2341be58feae1da2deced843240f7b502ba659"; // BIP 340 vector 1's public key
    const out = taprootOutput(internal, { id: 0, script: scriptHex, leafVersion: 0xc0 });
    const amount = c.prevouts[c.index].slice(0, 16);
    c.prevouts[c.index] = amount + "22" + out.scriptPubKeyHex;
    c.success = { scriptSig, witness: [...stack, scriptHex, out.controlBlocks[0]] };
    return c;
  };

  it("checks the 520-byte push limit even in an unexecuted branch", () => {
    const big = "4d0902" + "00".repeat(521); // PUSHDATA2 of 521 bytes
    const t = traceTapscript(committed("0063" + big + "6851"), "success");
    expect([t.valid, t.reason]).toEqual([false, "push larger than 520 bytes"]);
    const ok = traceTapscript(committed("0063" + "4d0802" + "00".repeat(520) + "6851"), "success");
    expect(ok.valid).toBe(true);
  });

  it("fails a spend with a non-empty scriptSig", () => {
    const t = traceTapscript(committed("51", [], "00"), "success");
    expect([t.valid, t.failStage]).toEqual([false, "bip141"]);
    expect(traceTapscript(committed("51"), "success").valid).toBe(true);
  });
});

describe("script numbers and truth", () => {
  it("round-trips minimal encodings and applies CastToBool", () => {
    for (const n of [0n, 1n, -1n, 23n, 24n, 127n, 128n, -128n, 255n, 256n, 2147483647n]) expect(decodeNum(encodeNum(n))).toBe(n);
    expect(encodeNum(24n)).toBe("18");
    expect(decodeNum("0000008000")).toBeNull();
    expect([castToBool(""), castToBool("00"), castToBool("80"), castToBool("0080"), castToBool("01")]).toEqual([false, false, false, false, true]);
  });
});

// Optional: set SCRIPT_ASSETS_FULL to the full upstream file to sweep every case.
const full = process.env.SCRIPT_ASSETS_FULL;
describe.skipIf(!full || !existsSync(full))("sweep of the full upstream file", () => {
  it("never disagrees with Core on a witness it accepts", () => {
    const bytes = readFileSync(full!);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(excerpt.upstream.sha256);
    const all: ScriptAssetCase[] = JSON.parse(bytes.toString("utf8"));
    let agree = 0;
    const disagree: string[] = [];
    all.forEach((c, i) => {
      if (!c.flags.includes("TAPROOT")) return;
      for (const which of ["success", "failure"] as const) {
        if (!c[which]) continue;
        try {
          const t = traceTapscript(c, which);
          if (t.valid === (which === "success")) agree++;
          else disagree.push(`${i} ${c.comment} ${which}`);
        } catch (e) {
          if (!(e instanceof TraceScopeError)) throw e;
        }
      }
    });
    expect(disagree).toEqual([]);
    expect(agree).toBeGreaterThan(700);
  }, 300_000);
});

describe("tapscript chapter fixtures and prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/tapscript.json", root), "utf8");
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/tapscript.json", root), "utf8")).fixtures;

  it("ties every fixture to a reviewed case with its upstream comment", () => {
    expect(fixtures).toHaveLength(6);
    for (const f of fixtures) {
      expect(f.source.pointer).toBe(`cases.${f.caseIndex}`);
      expect(get(f.caseIndex).comment).toBe(f.comment);
    }
    expect(text).toContain("Six Core test cases, twelve recorded witnesses");
  });

  it("states what the recorded cases show", () => {
    const add = traceTapscript(get(1109), "success").steps.find((s) => s.name === "OP_CHECKSIGADD")!;
    expect(add.note).toContain("push n + 1 = 24");
    expect(text).toContain("a valid signature turns 23 into 24");
    expect(get(1109).failure!.witness[1].slice(0, 2)).toBe("05");
    expect(text).toContain("n is five bytes long");
    const mi = traceTapscript(get(662), "failure");
    expect(mi.initialStack.at(-1)!.length / 2).toBe(3);
    expect(text).toContain("the failing witness offers a three-byte value instead");
    expect(text).toContain("same 1-of-1 policy with OP_CHECKMULTISIG");
    expect(traceTapscript(get(804), "failure").ops.map((o) => o.name).join(" ")).toBe("OP_0 OP_SWAP OP_1 push 32 OP_1 OP_CHECKMULTISIG");
  });

  it("quotes BIP 342's limits correctly", () => {
    expect(bip342[129]).toContain("50 + the total serialized size");
    expect(text).toContain("50 plus the size of its witness in bytes");
    expect(bip342[127]).toContain("10000 bytes");
    expect(bip342[128]).toContain("201");
    expect(bip342[130]).toContain("1000 elements");
    expect(bip342[131]).toContain("520 bytes");
    expect(text).toContain("The 10,000-byte script size limit and the 201 non-push opcode limit do not apply");
    expect(text).toContain("The limit of 1,000 stack elements remains");
    expect(text).toContain("elements still may not exceed 520 bytes");
  });
});
