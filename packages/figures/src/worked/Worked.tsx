/**
 * "Worked example" tabs: one concrete, static walk through a published case
 * for each interactive figure. Every value comes from the same build-time
 * derived data as the interactive view (or, for addresses, the tested bech32
 * model run at build time); nothing here is invented or computed in the browser.
 */
import { analyzeSegwitAddress } from "@bip-atlas/models/bech32";
import type {
  AddressFixture,
  DerivedBip32Fixture,
  DerivedMnemonicFixture,
  DerivedPsbtTraceFixture,
  DerivedSchnorrFixture,
  DerivedTaprootTreeFixture,
  DerivedTapscriptFixture,
  DerivedTransactionFixture,
  DerivedP2shFixture,
  DerivedTimelockCaseFixture,
} from "../types";
import { WorkedExample, type WorkedStep } from "./WorkedExample";

const bits = (s: string) => s.match(/.{1,11}/g)?.join(" ") ?? s;

/* ---------- BIP 39 ---------- */
export function MnemonicWorked({ fixture: f }: { fixture: DerivedMnemonicFixture }) {
  const d = f.derived;
  const steps: WorkedStep[] = [
    { title: `Start with ${d.layout.entropyBits} bits of entropy`, values: [{ label: "entropy (hex)", value: f.entropyHex }], layer: { size: 0.85, tone: "plain", cells: d.layout.entropyBits / 8 } },
    {
      title: `Hash it and keep the first ${d.layout.checksumBits} bits as the checksum`,
      values: [{ label: "SHA-256", value: d.hashHex }, { label: "checksum bits", value: d.checksumBits }],
      layer: { size: 0.3, tone: "hatch", cells: d.layout.checksumBits },
    },
    {
      title: `Cut the ${d.layout.totalBits} bits into ${d.layout.wordCount} groups of 11`,
      values: [{ label: "groups", value: bits(d.entropyBits + d.checksumBits) }],
      note: `The last group holds ${d.layout.lastWordEntropyBits} entropy bits and the ${d.layout.checksumBits} checksum bits.`,
      layer: { tone: "wash", cells: d.layout.wordCount, mark: [d.layout.wordCount - 1] },
    },
    {
      title: "Look each group up in the 2,048-word list",
      values: [{ label: "indices", value: d.groups.map((g) => g.index).join(", ") }, { label: "words", value: f.mnemonic }],
      layer: { tone: "accent", cells: d.layout.wordCount },
    },
    {
      title: "Stretch words and passphrase into a 64-byte seed",
      values: [{ label: "passphrase", value: f.passphrase || "(empty)" }, { label: "seed", value: d.seeds[0].seedHex }],
      note: "PBKDF2-HMAC-SHA512, 2,048 iterations; password the words, salt “mnemonic” + passphrase, both UTF-8 NFKD.",
      layer: { size: 0.7, tone: "accent" },
    },
  ];
  return (
    <WorkedExample
      intro={<>One published vector, end to end: <strong>{f.label}</strong>. The hatched layer is the checksum. A public test phrase — never use it for funds.</>}
      steps={steps}
      label={`Entropy, checksum, ${d.layout.wordCount} groups, words, then seed, drawn as stacked layers.`}
      source={<>Source: {f.source.external ? `${f.source.external} ${f.source.pointer}` : `BIP 39 line ${f.source.line}`}; computed by the tested BIP 39 model.</>}
    />
  );
}

/* ---------- BIP 32 ---------- */
export function Bip32Worked({ fixture: f }: { fixture: DerivedBip32Fixture }) {
  const chain = ["m", "m/0H", "m/0H/1", "m/0H/1/2H"];
  const nodes = chain.map((p) => f.derived.nodes.find((n) => n.path === p)).filter((n): n is NonNullable<typeof n> => !!n);
  const steps: WorkedStep[] = [
    {
      title: "Seed → master key and chain code",
      values: [{ label: "seed", value: f.seedHex }, { label: "HMAC-SHA512, key “Bitcoin seed”", value: f.derived.masterIHex }],
      note: "Left 32 bytes: master private key. Right 32 bytes: master chain code.",
      layer: { size: 0.75, tone: "plain", cells: 2 },
    },
    ...nodes.map((n): WorkedStep => ({
      title: n.path === "m" ? "Master node m" : `${n.path} — ${n.hardened ? "hardened child: needs the parent’s private key" : "normal child: derivable from the parent’s extended public key too"}`,
      values: [{ label: "xpub", value: n.xpub }, { label: "own key fingerprint", value: n.fingerprintHex }],
      layer: { size: 0.9 - n.depth * 0.12, tone: n.path === "m" ? "accent" : n.hardened ? "hatch" : "wash" },
    })),
  ];
  return (
    <WorkedExample
      intro={<>Walking one branch of <strong>{f.label}</strong>, from the seed to {chain[chain.length - 1]}. Hatched layers are hardened steps.</>}
      steps={steps}
      label="Seed, master node and three child derivations, drawn as stacked layers."
      source={<>Source: BIP 32 test vector 1; every xpub matches the vector where the BIP lists it.</>}
    />
  );
}

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

/* ---------- BIPs 173/350 ---------- */
export function AddressWorked({ fixtures }: { fixtures: AddressFixture[] }) {
  const good = fixtures.find((f) => analyzeSegwitAddress(f.address, f.network).valid && analyzeSegwitAddress(f.address, f.network).witnessVersion === 0) ?? fixtures[0];
  const a = analyzeSegwitAddress(good.address, good.network);
  const typo = fixtures.find((f) => analyzeSegwitAddress(f.address, f.network).failedStage === "checksum");
  const sep = good.address.lastIndexOf("1");
  const program = good.address.slice(sep + 2, -6);
  const steps: WorkedStep[] = [
    { title: "Human-readable part and separator", values: [{ label: "HRP + separator", value: `${good.address.slice(0, sep)} + ${good.address[sep]}` }], layer: { size: 0.3, tone: "plain", cells: sep + 1 } },
    { title: "Witness version, one character", values: [{ label: "character → version", value: `${good.address[sep + 1]} → ${a.witnessVersion}` }], layer: { size: 0.25, tone: "wash", cells: 1 } },
    {
      title: `Program: ${program.length} characters of 5 bits`,
      values: [{ label: "characters", value: program }, { label: `${a.programHex!.length / 2} bytes`, value: a.programHex! }],
      layer: { tone: "wash", cells: program.length },
    },
    {
      title: `Checksum: 6 characters, ${a.encoding === "bech32" ? "Bech32" : "Bech32m"}`,
      values: [{ label: "checksum", value: good.address.slice(-6) }],
      note: `Version ${a.witnessVersion} must use ${a.witnessVersion === 0 ? "Bech32" : "Bech32m"}; it does, and the program length fits the version, so the address is valid.`,
      layer: { size: 0.4, tone: "accent", cells: 6 },
    },
  ];
  if (typo) {
    const pos = [...typo.address].findIndex((c, i) => c !== good.address[i]);
    const t = analyzeSegwitAddress(typo.address, typo.network);
    if (pos >= 0 && t.failedStage === "checksum") {
      steps.push({
        title: `Change one character (position ${pos + 1}: ${good.address[pos]} → ${typo.address[pos]})`,
        values: [{ label: "typed", value: typo.address }],
        note: "The checksum no longer matches either family: rejected at the checksum stage. Validation only rejects; BIP 173 lets software at most hint where an error might be, never suggest the correction.",
        layer: { tone: "fail", cells: good.address.length - sep - 1, mark: [pos - sep - 1] },
      });
    }
  }
  return (
    <WorkedExample
      intro={<>The published address <strong>{good.label}</strong>, split into its parts{typo ? ", then one typo" : ""}.</>}
      steps={steps}
      label="An address exploded into prefix, version, program and checksum, then a one-character typo."
      source={<>Source: BIP 173/350 test vectors; checked by the tested bech32 model at build time.</>}
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

/* ---------- BIP 340 ---------- */
export function SchnorrWorked({ fixtures }: { fixtures: DerivedSchnorrFixture[] }) {
  const f = fixtures.find((x) => x.expected) ?? fixtures[0];
  const t = f.derived.traces[f.derived.ownMessage];
  const v = (stage: string) => t.steps.find((s) => s.stage === stage)?.values ?? {};
  const steps: WorkedStep[] = [
    { title: "Lift the key to the point P with even y", values: [{ label: "pk = x(P)", value: f.publicKeyHex }, { label: "y(P)", value: v("lift-x").y }], layer: { size: 0.6, tone: "plain" } },
    { title: "Split the signature and check r < p and s < n", values: [{ label: "r", value: v("r-range").r }, { label: "s", value: v("s-range").s }], layer: { tone: "wash", cells: 2 } },
    { title: "Hash r ‖ P ‖ m with the BIP0340/challenge tag", values: [{ label: "m", value: f.messageHex || "(empty)" }, { label: "e", value: v("challenge").e }], layer: { size: 0.8, tone: "wash", cells: 3 } },
    { title: "Compute R = s⋅G − e⋅P", values: [{ label: "x(R)", value: v("compute-r").x }, { label: "y(R)", value: v("compute-r").y }], note: "Checked: R is not the point at infinity, and y(R) is even.", layer: { size: 0.6, tone: "wash" } },
    { title: "Compare x(R) with r", note: t.valid ? "Equal: the signature verifies, as the CSV says." : "Different: verification fails.", layer: { size: 0.45, tone: t.valid ? "accent" : "fail" } },
  ];
  return (
    <WorkedExample
      intro={<>Published vector {f.vectorIndex} from the BIP 340 CSV, checked step by step.</>}
      steps={steps}
      label="The five stages of verifying one valid signature, drawn as stacked layers."
      source={<>Source: BIP 340 test-vectors.csv line {f.source.line}; arithmetic by @noble/curves.</>}
    />
  );
}

/* ---------- BIP 341 ---------- */
export function TaprootWorked({ fixture: f }: { fixture: DerivedTaprootTreeFixture }) {
  const d = f.derived;
  const leaf = [...d.leaves].sort((a, b) => b.path.length - a.path.length)[0];
  const branches = leaf.check.filter((s) => s.id === "branch");
  const tweak = leaf.check.find((s) => s.id === "tweak")!.values;
  const steps: WorkedStep[] = [
    { title: `Reveal one script (leaf ${String.fromCharCode(65 + leaf.id)}) and hash it with its leaf version 0x${leaf.leafVersion.toString(16)} and length`, values: [{ label: "script", value: leaf.scriptHex }, { label: "TapLeaf hash", value: leaf.leafHash }], layer: { size: 0.4, tone: "accent" } },
    ...branches.map((b, j): WorkedStep => ({
      title: `Fold in sibling hash ${j + 1}, smaller first`,
      values: [{ label: "sibling", value: b.values.e }, { label: "TapBranch", value: b.values.next }],
      layer: { size: 0.55 + 0.2 * j, tone: "wash", cells: 2 },
    })),
    { title: "Tweak the internal key with the root", values: [{ label: "internal key P", value: d.internalKeyHex }, { label: "t", value: tweak.t }], layer: { size: 0.9, tone: "wash", cells: 2 } },
    { title: "Q = P + t⋅G must equal the output key", values: [{ label: "output key q", value: d.outputKeyHex }], note: `It does, and y(Q) is ${d.parity ? "odd" : "even"}, matching the control block’s parity bit: the output committed to this script all along.`, layer: { size: 0.6, tone: "accent" } },
  ];
  return (
    <WorkedExample
      intro={<>Spending published vector {f.vectorIndex} through one of its deepest leaves: what the verifier rebuilds from the control block.</>}
      steps={steps}
      label="A leaf hash folded with sibling hashes up to the root, then tweaked into the output key."
      source={<>Source: BIP 341 wallet-test-vectors.json, {f.source.pointer}; every value matched the vector at build time.</>}
    />
  );
}

/* ---------- BIP 342 ---------- */
export function TapscriptWorked({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const f = fixtures.find((x) => x.caseIndex === 1109) ?? fixtures[0];
  const v = f.derived.success;
  const label = (ids: number[]) => (ids.length ? [...ids].reverse().map((i) => v.elements[i].label).join(" / ") : "empty");
  const steps: WorkedStep[] = [
    {
      title: "Start from the witness, minus the script and control block",
      values: [{ label: "stack, top first", value: label(v.initialStack) }],
      note: `Sigops budget: 50 + ${v.witness.totalBytes} witness bytes = ${v.budgetStart}; each checked signature costs 50.`,
      layer: { size: 0.35, tone: "plain", cells: v.initialStack.length },
    },
    ...v.steps.map((s): WorkedStep => ({
      title: s.name,
      values: [{ label: "stack, top first", value: label(s.after) }],
      note: s.note + (s.sig ? `; budget now ${s.sig.budgetAfter}` : ""),
      layer: { size: 0.3 + 0.15 * s.after.length, tone: s.sig ? "accent" : "wash", cells: s.after.length },
    })),
  ];
  return (
    <WorkedExample
      intro={<>Bitcoin Core test case {f.caseIndex} ({f.label}), success witness: the starting stack, then one opcode per layer. Cells are stack elements.</>}
      steps={steps}
      label="The stack after each opcode of one recorded tapscript run."
      source={<>Source: Core script_assets_test.json case {f.caseIndex}, pinned; recorded at build time and matched to Core’s label.</>}
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
