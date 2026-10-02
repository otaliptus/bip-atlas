/**
 * "Worked example" tabs: one concrete, static walk through a published case
 * for each interactive figure. Every value comes from the same build-time
 * derived data as the interactive view (or, for addresses, the tested bech32
 * model run at build time); nothing here is invented or computed in the browser.
 */
import type {
  DerivedMnemonicFixture,
  DerivedPsbtTraceFixture,
  DerivedTaprootTreeFixture,
  DerivedTransactionFixture,
  DerivedP2shFixture,
  DerivedTimelockCaseFixture,
} from "../types";
import { WorkedExample, type WorkedStep } from "./WorkedExample";

/* ---------- BIPs 141/143 ---------- */
export function TxWorked({ fixture: f }: { fixture: DerivedTransactionFixture }) {
  const segs = f.derived.segments;
  const sum = (test: (s: (typeof segs)[number]) => boolean) => segs.filter(test).reduce((n, s) => n + s.hex.length / 2, 0);
  const m = f.derived.measures;
  const groups = [
    { title: "nVersion", test: (s: (typeof segs)[number]) => s.id === "version", tone: "plain" as const },
    { title: "marker and flag (SegWit only)", test: (s: (typeof segs)[number]) => s.part === "marker", tone: "hatch" as const },
    { title: "inputs", test: (s: (typeof segs)[number]) => s.id.startsWith("input"), tone: "wash" as const },
    { title: "outputs", test: (s: (typeof segs)[number]) => s.id.startsWith("output"), tone: "wash" as const },
    { title: "witness", test: (s: (typeof segs)[number]) => s.part === "witness", tone: "hatch" as const },
    { title: "nLockTime", test: (s: (typeof segs)[number]) => s.id === "locktime", tone: "plain" as const },
  ];
  const present = groups.filter((g) => sum(g.test) > 0);
  const max = Math.max(...present.map((g) => sum(g.test)));
  const steps: WorkedStep[] = [
    ...present.map((g): WorkedStep => {
      const b = sum(g.test);
      return {
        title: `${g.title} · ${b} bytes${g.tone === "hatch" ? " · not in the txid" : ""}`,
        layer: { size: 0.3 + 0.7 * (b / max), tone: g.tone },
      };
    }),
    {
      title: "Two identifiers",
      values: [{ label: `txid (${m.baseSize} bytes hashed)`, value: m.txidHex }, { label: `wtxid (${m.totalSize} bytes hashed)`, value: m.wtxidHex }],
      note: `Hashes in the byte order they are computed. Weight 3 × ${m.baseSize} + ${m.totalSize} = ${m.weight}; ${m.vsize} virtual bytes.`,
      layer: { size: 0.5, tone: "accent", cells: 2 },
    },
  ];
  return (
    <WorkedExample
      intro={<>The published example <strong>{f.label}</strong>, layer by layer. Hatched layers are left out of the txid.</>}
      steps={steps}
      label="A serialized transaction exploded into its fields, then its two identifiers."
      source={<>Source: BIP 143 line {f.source.line}; sizes and hashes from the tested transaction model.</>}
    />
  );
}

/* ---------- BIP 174 ---------- */
export function PsbtWorked({ fixture: f }: { fixture: DerivedPsbtTraceFixture }) {
  const steps: WorkedStep[] = f.derived.states.map((s, i) => {
    const records = s.maps.flatMap((m) => m.records);
    const added = records.filter((r) => r.status === "added");
    const removed = s.maps.reduce((n, m) => n + m.removed.length, 0);
    const counts = [...added.reduce((m, r) => m.set(r.name, (m.get(r.name) ?? 0) + 1), new Map<string, number>())].map(([name, n]) => `${n} ${name} record${n === 1 ? "" : "s"}`);
    const parent = s.basedOn.length === 1 ? f.derived.states.findIndex((x) => x.id === s.basedOn[0]) : -1;
    const parallel = parent >= 0 && parent !== i - 1 ? ` Works on state ${parent + 1}, in parallel with ${f.derived.states[i - 1].role}.` : "";
    return {
      title: `${s.role} · ${s.bytes} bytes, ${records.length} record${records.length === 1 ? "" : "s"}`,
      note:
        i === 0
          ? "Unsigned transaction in the global map; every input and output map empty."
          : s.basedOn.length > 1
            ? `Merges ${s.basedOn.length} PSBTs into one holding every record from each${s.uniqueFrom ? `: ${s.uniqueFrom.map((n, k) => `${n} only in ${f.derived.states.find((x) => x.id === s.basedOn[k])?.role ?? "one copy"}’s copy`).join(", ")}` : ""}.`
            : `${added.length ? `Adds ${counts.join(", ")}.` : "Adds nothing new."}${removed ? ` Removes ${removed} record${removed === 1 ? "" : "s"}.` : ""}${parallel}`,
      layer: { size: 0.45 + 0.55 * Math.min(1, records.length / 16), tone: removed ? "hatch" : i === 0 ? "plain" : "wash", cells: Math.min(records.length, 24), highlight: records.map((r, k) => (r.status === "added" && i > 0 ? k : -1)).filter((k) => k >= 0 && k < 24) },
    };
  });
  steps.push({
    title: `Extractor · network transaction, ${f.derived.extracted.bytes} bytes`,
    values: [{ label: "txid (byte order as computed)", value: f.derived.extracted.txidHex }],
    layer: { size: 0.5, tone: "accent" },
  });
  return (
    <WorkedExample
      intro={<>The <strong>{f.label}</strong>, one published state per layer. Cells are records; filled cells were just added; a hatched layer removed records.</>}
      steps={steps}
      label="Each published PSBT state stacked in order, growing as roles add records."
      source={<>Source: BIP 174 lines {f.steps[0].line}–{f.extracted.line}; parsed and combined by the tested PSBT model.</>}
    />
  );
}

/* ---------- BIP 16 ---------- */
export function P2shWorked({ fixtures }: { fixtures: DerivedP2shFixture[] }) {
  const f = fixtures.find((x) => x.derived.kind === "legacy") ?? fixtures[0];
  const d = f.derived;
  const [s1, s2, s3] = d.stages;
  const ms = s3?.steps.find((s) => s.checks);
  const steps: WorkedStep[] = [
    { title: "The output commits to a 20-byte hash", values: [{ label: `scriptPubKey (${d.scriptPubKeyHex.length / 2} bytes)`, value: d.scriptPubKeyHex }], layer: { size: 0.45, tone: "plain", cells: 3 } },
    { title: `The spend's scriptSig only pushes data: ${s1.note}`, values: [{ label: "pushes", value: s2.stackBefore.map((e) => (e === "" ? "(empty)" : `${e.length / 2} bytes`)).join(" · ") }], layer: { tone: "wash", cells: s2.stackBefore.length } },
    { title: "Hash the last push and compare", values: [{ label: "HASH160(redeem script)", value: d.redeemHash160Hex }, { label: "hash in the output", value: d.committedHashHex }], note: "Equal, so the output really committed to this script.", layer: { size: 0.5, tone: "hatch", cells: 2 } },
    { title: "Run the redeem script on the remaining stack", values: [{ label: "redeem script", value: d.redeemAsm }], note: ms ? `Each signature must match a key, in order: ${ms.checks!.map((c) => `signature ${c.sigIndex + 1} → key ${c.keyIndex! + 1}`).join(", ")}.` : undefined, layer: { size: 0.8, tone: "accent", cells: 2 } },
  ];
  return (
    <WorkedExample
      intro={<>The published spend <strong>{f.label}</strong> ({f.shortLabel}), checked the way BIP 16 describes. The hatched layer is the hash check.</>}
      steps={steps}
      label="An output's hash, the revealed script, the hash comparison and the script run, drawn as stacked layers."
      source={<>Source: BIP {f.source.bip} line {f.source.line}; recorded by the tested P2SH model, signatures verified with noble.</>}
    />
  );
}

/* ---------- BIPs 65, 68, 112, 113 ---------- */
const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;
/** Bit positions (31 first) to drawn cell indices: value bits and the two flags. */
const VALUE_CELLS = Array.from({ length: 16 }, (_, i) => 16 + i);
const FLAG_CELLS = [0, 9];

export function TimelockWorked({ fixtures }: { fixtures: DerivedTimelockCaseFixture[] }) {
  const f = fixtures.find((x) => x.id === "core-valid-127") ?? fixtures.find((x) => x.lock === "relative") ?? fixtures[0];
  const d = f.derived;
  const arg = BigInt(d.argument);
  const argHex = hex32(Number(arg & 0xffffffffn));
  const check = (id: string) => d.checks.find((c) => c.id === id);
  const value = check("value");
  const steps: WorkedStep[] = [
    {
      title: "The spent output's script pushes an argument, then CHECKSEQUENCEVERIFY",
      values: [{ label: "script", value: d.asm.replace("CHECKSEQUENCEVERIFY", "OP_CHECKSEQUENCEVERIFY") }, { label: "argument", value: `${d.argument} = ${argHex}` }],
      layer: { size: 0.5, tone: "plain", cells: 2 },
    },
    {
      title: `Bit 31 of the argument is ${check("arg-disabled")?.stopsHere ? "set, so the opcode does nothing" : "clear, so the opcode checks the input"}`,
      values: [{ label: "argument bits", value: argHex }],
      note: "Bits 0–15 hold the value (filled); bit 22 picks the unit and bit 31 disables (marked).",
      layer: { tone: "wash", cells: 32, highlight: VALUE_CELLS, mark: FLAG_CELLS },
    },
    {
      title: `The transaction's version is ${d.version}`,
      values: [{ label: "nVersion", value: String(d.version) }],
      note: d.version >= 2 ? "Version 2 or more: BIP 68 gives nSequence its relative-lock meaning." : "Below 2: BIP 68 does not apply, and CHECKSEQUENCEVERIFY fails.",
      layer: { size: 0.35, tone: d.version >= 2 ? "plain" : "fail", cells: 1 },
    },
    {
      title: `The input's own bit 31 is ${check("input-disabled")?.ok === false ? "set, so the opcode fails" : "clear"}`,
      values: [{ label: "input 0 nSequence", value: hex32(d.nSequence) }],
      note: "An input with bit 31 set carries no relative lock, so it could not satisfy one.",
      layer: { size: 0.35, tone: check("input-disabled")?.ok === false ? "fail" : "plain", cells: 1 },
    },
    {
      title: "Read the input's nSequence with the same mask",
      values: [{ label: "input 0 nSequence", value: hex32(d.nSequence) }, ...(check("type") ? [{ label: "units", value: check("type")!.detail }] : [])],
      layer: { tone: "hatch", cells: 32, highlight: VALUE_CELLS, mark: FLAG_CELLS },
    },
    {
      title: value ? "Compare the masked values" : "Stop at the first failed check",
      values: value ? [{ label: "argument ≤ nSequence?", value: value.detail }] : [{ label: "failed", value: d.checks.find((c) => !c.ok)?.label ?? "—" }],
      note: d.valid ? `Every check passes, so the script continues. Bitcoin Core labels this case ${f.expected}.` : `The script fails. Bitcoin Core labels this case ${f.expected}.`,
      layer: { size: 0.6, tone: d.valid ? "accent" : "fail", cells: 2 },
    },
  ];
  return (
    <WorkedExample
      intro={<>Bitcoin Core’s test case <strong>{f.label}</strong> ({f.coreFile}, entry {f.coreIndex}), checked the way BIP 112 describes. Filled cells are the 16 value bits; marked cells are bits 22 and 31.</>}
      steps={steps}
      label="A CHECKSEQUENCEVERIFY argument and an input's nSequence, masked to the same 16 value bits and compared, drawn as stacked layers."
      source={<>Source: Bitcoin Core v29.0 transaction tests (pinned excerpt); evaluated at build time by the tested timelock model.</>}
    />
  );
}
