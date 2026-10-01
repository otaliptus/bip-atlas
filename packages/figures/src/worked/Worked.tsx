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
      note: "PBKDF2-HMAC-SHA512, 2,048 iterations, salt “mnemonic” + passphrase.",
      layer: { size: 0.7, tone: "accent" },
    },
  ];
  return (
    <WorkedExample
      intro={<>One published vector, end to end: <strong>{f.label}</strong>. A public test phrase — never use it for funds.</>}
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
      values: [{ label: "seed", value: f.seedHex }, { label: "HMAC-SHA512", value: f.derived.masterIHex }],
      note: "Left 32 bytes: master private key. Right 32 bytes: master chain code.",
      layer: { size: 0.75, tone: "plain", cells: 2 },
    },
    ...nodes.map((n): WorkedStep => ({
      title: n.path === "m" ? "Master node m" : `${n.path} — ${n.hardened ? "hardened child: needs the parent’s private key" : "normal child: derivable from the parent’s public key too"}`,
      values: [{ label: "xpub", value: n.xpub }, { label: "fingerprint", value: n.fingerprintHex }],
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
      values: [{ label: `txid (${m.baseSize} bytes hashed)`, value: m.txidHex }, { label: `wtxid (${m.totalSize} bytes)`, value: m.wtxidHex }],
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
    { title: "Human-readable part and separator", values: [{ label: "network", value: `${good.address.slice(0, sep)} + ${good.address[sep]}` }], layer: { size: 0.3, tone: "plain", cells: sep + 1 } },
    { title: "Witness version, one character", values: [{ label: "character → version", value: `${good.address[sep + 1]} → ${a.witnessVersion}` }], layer: { size: 0.25, tone: "wash", cells: 1 } },
    {
      title: `Program: ${program.length} characters of 5 bits`,
      values: [{ label: "characters", value: program }, { label: `${a.programHex!.length / 2} bytes`, value: a.programHex! }],
      layer: { tone: "wash", cells: program.length },
    },
    {
      title: `Checksum: 6 characters, ${a.encoding === "bech32" ? "Bech32" : "Bech32m"}`,
      values: [{ label: "checksum", value: good.address.slice(-6) }],
      note: `Version ${a.witnessVersion} must use ${a.witnessVersion === 0 ? "Bech32" : "Bech32m"}; it does, so the address is valid.`,
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
        note: "The checksum no longer matches either family: rejected at the checksum stage. It does not say which character is wrong.",
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
    const names = [...new Set(added.map((r) => r.name))];
    return {
      title: `${s.role} · ${s.bytes} bytes, ${records.length} record${records.length === 1 ? "" : "s"}`,
      note:
        i === 0
          ? "Unsigned transaction in the global map; every input and output map empty."
          : s.basedOn.length > 1
            ? `Merges ${s.basedOn.length} PSBTs into one holding every record from each${s.uniqueFrom ? ` (${s.uniqueFrom.join(" and ")} records found in only one of them)` : ""}.`
            : `${added.length ? `Adds ${names.join(", ")}.` : "Adds nothing new."}${removed ? ` Removes ${removed} record${removed === 1 ? "" : "s"}.` : ""}`,
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
      intro={<>The <strong>{f.label}</strong>, one published state per layer. Cells are records; filled cells were just added.</>}
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
    { title: "Split the signature: r < p and s < n", values: [{ label: "r", value: v("r-range").r }, { label: "s", value: v("s-range").s }], layer: { tone: "wash", cells: 2 } },
    { title: "Hash r ‖ P ‖ m with the BIP0340/challenge tag", values: [{ label: "m", value: f.messageHex || "(empty)" }, { label: "e", value: v("challenge").e }], layer: { size: 0.8, tone: "hatch", cells: 3 } },
    { title: "Compute R = s⋅G − e⋅P", values: [{ label: "x(R)", value: v("compute-r").x }], note: "R is a finite point with even y.", layer: { size: 0.6, tone: "wash" } },
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
    { title: `Reveal one script (leaf ${String.fromCharCode(65 + leaf.id)}) and hash it`, values: [{ label: "script", value: leaf.scriptHex }, { label: "TapLeaf hash", value: leaf.leafHash }], layer: { size: 0.4, tone: "accent" } },
    ...branches.map((b, j): WorkedStep => ({
      title: `Fold in sibling hash ${j + 1}, smaller first`,
      values: [{ label: "sibling", value: b.values.e }, { label: "TapBranch", value: b.values.next }],
      layer: { size: 0.55 + 0.2 * j, tone: "wash", cells: 2 },
    })),
    { title: "Tweak the internal key with the root", values: [{ label: "internal key P", value: d.internalKeyHex }, { label: "t", value: tweak.t }], layer: { size: 0.9, tone: "hatch", cells: 2 } },
    { title: "Q = P + t⋅G must equal the output key", values: [{ label: "output key q", value: d.outputKeyHex }], note: "It does: the output committed to this script all along.", layer: { size: 0.6, tone: "accent" } },
  ];
  return (
    <WorkedExample
      intro={<>Spending published vector {f.vectorIndex} through its deepest leaf: what the verifier rebuilds from the control block.</>}
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
    { title: "Start from the witness items", values: [{ label: "stack, top first", value: label(v.initialStack) }], layer: { size: 0.35, tone: "plain", cells: v.initialStack.length } },
    ...v.steps.map((s): WorkedStep => ({
      title: s.name,
      values: [{ label: "stack, top first", value: label(s.after) }],
      note: s.note + (s.sig ? `; budget now ${s.sig.budgetAfter}` : ""),
      layer: { size: 0.3 + 0.15 * s.after.length, tone: s.sig ? "accent" : "wash", cells: s.after.length },
    })),
  ];
  return (
    <WorkedExample
      intro={<>Bitcoin Core test case {f.caseIndex} ({f.label}), success witness, one opcode per layer. Cells are stack elements.</>}
      steps={steps}
      label="The stack after each opcode of one recorded tapscript run."
      source={<>Source: Core script_assets_test.json case {f.caseIndex}, pinned; recorded at build time and matched to Core’s label.</>}
    />
  );
}
