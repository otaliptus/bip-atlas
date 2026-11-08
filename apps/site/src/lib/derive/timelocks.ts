import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROOT } from "../root";
import { parseTransaction, evaluateCoreLockCase, lockFieldsOf, readAbsolute, readSequence, encodeRelative, LOCKTIME_THRESHOLD, SEQUENCE_LOCKTIME_MASK, SEQUENCE_LOCKTIME_TYPE_FLAG, SEQUENCE_LOCKTIME_GRANULARITY } from "@bip-atlas/models";
import type { TimelockCaseFixture, DerivedTimelockCaseFixture, TimelockBipTxFixture, DerivedTimelockBipTxFixture, TimelockEncodingFixture, DerivedTimelockEncodingFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, pinnedText, resolvePointer } from "./sources";

let lockCases: any = null;
function coreLockCases() {
  if (lockCases) return lockCases;
  const file = "core-locktime-cases-excerpt.json";
  const bytes = readFileSync(`${ROOT}sources/external/${file}`);
  const lock = JSON.parse(readFileSync(`${ROOT}sources/external/external.lock.json`, "utf8"));
  const entry = lock.files.find((f: { file: string }) => f.file === file);
  if (!entry || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`${file} does not match the external lock`);
  lockCases = JSON.parse(bytes.toString("utf8"));
  for (const [name, sha] of Object.entries(entry.upstreamSha256 as Record<string, string>))
    if (lockCases.commit !== entry.commit || lockCases.upstream[name]?.sha256 !== sha) throw new Error(`${file} names a different upstream ${name}`);
  if (!lockCases.scriptH.lines[2].includes(`LOCKTIME_THRESHOLD = ${LOCKTIME_THRESHOLD};`)) throw new Error("model threshold differs from the pinned script.h");
  return lockCases;
}

export function deriveTimelockCase(f: TimelockCaseFixture): DerivedTimelockCaseFixture {
  const c = resolvePointer(coreLockCases(), f.source.pointer!);
  if (!c || c.file !== f.coreFile || c.index !== f.coreIndex || c.comment !== f.comment || c.expected !== f.expected) throw new Error(`${f.id}: fixture does not match the pinned excerpt`);
  const asm: string = c.prevouts[0][2];
  const fields = lockFieldsOf(parseTransaction(c.txHex));
  const e = evaluateCoreLockCase(asm, fields, 0);
  if (e.valid !== (f.expected === "valid")) throw new Error(`${f.id}: model says ${e.valid ? "valid" : "invalid"}, Core says ${f.expected}`);
  if ((e.script.opcode === "CHECKLOCKTIMEVERIFY") !== (f.lock === "absolute")) throw new Error(`${f.id}: lock kind does not match the opcode`);
  // The hero's "change a field": the same case with one field changed, re-run through the model.
  const iso = (n: number) => new Date(n * 1000).toISOString();
  const variant = (id: string, label: string, field: "version" | "nLockTime" | "nSequence", patch: Partial<typeof fields>) => {
    const g = { ...fields, ...patch, sequences: patch.sequences ?? fields.sequences };
    const r = evaluateCoreLockCase(asm, g, 0);
    return { id, label, field, version: g.version, nLockTime: g.nLockTime, nSequence: g.sequences[0], nLockTimeIso: iso(g.nLockTime), value16: g.sequences[0] & SEQUENCE_LOCKTIME_MASK, value16Seconds: (g.sequences[0] & SEQUENCE_LOCKTIME_MASK) * 2 ** SEQUENCE_LOCKTIME_GRANULARITY, checks: r.result.checks.map((k) => ({ ...k })), valid: r.valid };
  };
  const seq0 = fields.sequences[0];
  const edits =
    f.lock === "absolute"
      ? [
          variant("locktime-plus", "nLockTime + 1", "nLockTime", { nLockTime: fields.nLockTime + 1 }),
          variant("final", seq0 === 0xffffffff ? "input made non-final" : "input made final", "nSequence", { sequences: [seq0 === 0xffffffff ? 0xfffffffe : 0xffffffff] }),
        ]
      : [
          variant("version", `version ${fields.version >= 2 ? 1 : 2}`, "version", { version: fields.version >= 2 ? 1 : 2 }),
          variant("bit31", `the input's bit 31 ${seq0 & 0x80000000 ? "cleared" : "set"}`, "nSequence", { sequences: [(seq0 ^ 0x80000000) >>> 0] }),
        ];
  if (fields.nLockTime >= 0xffffffff) throw new Error(`${f.id}: nLockTime + 1 would overflow`);
  return {
    ...f,
    derived: {
      asm,
      opcode: e.script.opcode,
      argument: e.script.argument.toString(),
      trailingOne: e.script.trailingOne,
      version: fields.version,
      nLockTime: fields.nLockTime,
      nSequence: fields.sequences[0],
      txHex: c.txHex,
      checks: e.result.checks.map((k) => ({ ...k })),
      nLockTimeIso: iso(fields.nLockTime),
      value16: fields.sequences[0] & SEQUENCE_LOCKTIME_MASK,
      value16Seconds: (fields.sequences[0] & SEQUENCE_LOCKTIME_MASK) * 2 ** SEQUENCE_LOCKTIME_GRANULARITY,
      edits,
      valid: e.valid,
    },
  };
}

export function deriveTimelockBipTx(f: TimelockBipTxFixture): DerivedTimelockBipTxFixture {
  const line = pinnedText(`bip-${String(f.source.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n")[f.source.line! - 1];
  if (!line.includes(f.txHex)) throw new Error(`${f.id}: transaction is not on BIP ${f.source.bip} line ${f.source.line}`);
  const fields = lockFieldsOf(parseTransaction(f.txHex));
  const a = readAbsolute(fields);
  return {
    ...f,
    derived: {
      version: fields.version,
      nLockTime: fields.nLockTime,
      lockKind: a.kind,
      enforced: a.enforced,
      firstHeight: a.firstHeight,
      inputs: fields.sequences.map((n) => {
        const r = readSequence(n, fields.version);
        return { nSequence: n, final: r.final, disableFlag: r.disableFlag, relative: r.enforced ? { unit: r.unit, value: r.value } : null, reason: r.reason };
      }),
    },
  };
}

export function deriveTimelockEncoding(f: TimelockEncodingFixture): DerivedTimelockEncodingFixture {
  const lines = pinnedText("bip-0068.mediawiki", SNAPSHOT_PHASE3).split("\n");
  if (!lines[f.source.line! - 1].includes(f.source.quote!) || !lines[f.timeLine - 1].includes(f.timeQuote)) throw new Error(`${f.id}: BIP 68 lines moved`);
  coreLockCases();
  const maxTime = encodeRelative({ seconds: 33_554_431 });
  const r = readSequence(maxTime, 2);
  if (encodeRelative({ blocks: 65_535 }) !== SEQUENCE_LOCKTIME_MASK || r.unit !== "time" || r.value !== SEQUENCE_LOCKTIME_MASK) throw new Error(`${f.id}: BIP 68 examples do not round-trip`);
  return {
    ...f,
    derived: {
      threshold: LOCKTIME_THRESHOLD,
      thresholdIso: new Date(LOCKTIME_THRESHOLD * 1000).toISOString(),
      maxLockTimeIso: new Date(0xffffffff * 1000).toISOString(),
      maxBlocks: SEQUENCE_LOCKTIME_MASK,
      maxTimeUnits: r.value,
      maxTimeSeconds: r.seconds!,
      typeFlagSequence: SEQUENCE_LOCKTIME_TYPE_FLAG,
    },
  };
}
