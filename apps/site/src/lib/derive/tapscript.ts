import { resolvePointer } from "./sources";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROOT } from "../root";
import { decodeNum, decodeTapscript, traceTapscript, decodeScript } from "@bip-atlas/models";
import type { DerivedTapscriptFixture, TapscriptCaseFixture, TapscriptTraceView } from "@bip-atlas/figures";

let scriptAssets: any = null;
/** The pinned excerpt of Core's script assets, checked against the external lock. */
function coreScriptAssets() {
  if (scriptAssets) return scriptAssets;
  const file = "core-script-assets-excerpt.json";
  const bytes = readFileSync(`${ROOT}sources/external/${file}`);
  const lock = JSON.parse(readFileSync(`${ROOT}sources/external/external.lock.json`, "utf8"));
  const entry = lock.files.find((f: { file: string }) => f.file === file);
  if (!entry || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`${file} does not match the external lock`);
  scriptAssets = JSON.parse(bytes.toString("utf8"));
  if (scriptAssets.upstream.commit !== entry.commit || scriptAssets.upstream.sha256 !== entry.upstreamSha256) throw new Error(`${file} names a different upstream file`);
  return scriptAssets;
}

function traceView(c: any, which: "success" | "failure"): TapscriptTraceView {
  const t = traceTapscript(c, which);
  if (t.valid !== (which === "success")) throw new Error(`case ${c.comment}: recorded ${which} witness ${t.valid ? "passes" : "fails"}, but Core labels it ${which}`);
  if (!t.commitmentOk) throw new Error(`case ${c.comment}: ${which} witness fails the BIP 341 commitment check`);
  const w: string[] = c[which].witness;
  const sigs = new Set(t.initialStack.filter((e) => e.length === 128 || e.length === 130));
  const elements: TapscriptTraceView["elements"] = [];
  const idx = (hex: string) => {
    let i = elements.findIndex((e) => e.hex === hex);
    if (i < 0) {
      const bytes = hex.length / 2;
      const n = bytes <= 4 ? decodeNum(hex) : null;
      const label = bytes === 0 ? "empty" : sigs.has(hex) ? `${bytes}-byte signature` : n !== null ? `number ${n}` : bytes === 32 ? "32-byte key" : `${bytes}-byte value`;
      elements.push({ hex, bytes, label });
      i = elements.length - 1;
    }
    return i;
  };
  const initialStack = t.initialStack.map(idx);
  const steps = t.steps.map((s) => ({ position: s.position, name: s.name, executed: s.executed, note: s.note, failed: !!s.failed, before: s.stackBefore.map(idx), after: s.stackAfter.map(idx), sig: s.sig ?? null }));
  // A value a signature opcode popped as its key is a key of an unknown type unless it is 32 bytes (BIP 342).
  for (const s of steps) {
    if (!s.sig) continue;
    const key = elements[s.before[s.before.length - 1]];
    if (key.bytes !== 32 && key.bytes !== 0) key.label = `${key.bytes}-byte key, unknown type`;
  }
  // An OP_SUCCESSx met while decoding ends validation as valid before anything runs (BIP 342).
  const dec = decodeTapscript(t.scriptHex);
  const opSuccess = dec.kind === "op-success" ? dec.at.name : null;
  if (opSuccess !== null && (!t.valid || t.steps.length > 0)) throw new Error(`case ${c.comment}: ${opSuccess} found, but the trace is not an immediate success`);
  const size = (e: string) => (e.length / 2 < 253 ? 1 : 3) + e.length / 2;
  const control = w[w.length - (t.annexHex ? 2 : 1)];
  return {
    expected: which,
    valid: t.valid,
    failStage: t.failStage,
    reason: t.reason,
    scriptHex: t.scriptHex,
    ops: t.ops.map((o) => ({ position: o.position, name: o.dataHex !== null ? `<${o.dataHex.length / 2}-byte push>` : o.name, dataBytes: o.dataHex === null ? null : o.dataHex.length / 2 })),
    elements,
    initialStack,
    witness: {
      items: w.length,
      stackBytes: t.initialStack.reduce((n, e) => n + size(e), 0),
      scriptBytes: size(t.scriptHex),
      controlBytes: size(control),
      annexBytes: t.annexHex ? size(t.annexHex) : 0,
      totalBytes: t.witnessBytes,
      siblings: (control.length / 2 - 33) / 32,
      controlHex: control,
    },
    budgetStart: t.budgetStart,
    sigOpsCounted: t.sigOpsCounted,
    opSuccess,
    steps,
  };
}

export function deriveTapscript(f: TapscriptCaseFixture): DerivedTapscriptFixture {
  const c = resolvePointer(coreScriptAssets(), f.source.pointer!);
  if (!c || c.comment !== f.comment || f.source.pointer !== `cases.${f.caseIndex}`) throw new Error(`${f.id}: fixture does not match the pinned excerpt`);
  return { ...f, derived: { success: traceView(c, "success"), failure: traceView(c, "failure") } };
}

/** Short reading of a script: data pushes by size, opcodes by name. */
export function scriptAsm(hex: string): string {
  return decodeScript(hex).map((o) => (o.dataHex === null ? o.name : o.dataHex === "" ? "OP_0" : `<${o.dataHex.length / 2} bytes>`)).join(" ");
}
