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
  DerivedSchnorrFixture,
  DerivedTaprootTreeFixture,
  DerivedTapscriptFixture,
  DerivedP2shFixture,
  DerivedTimelockCaseFixture,
  DerivedVersionbitsDeploymentFixture,
  DerivedVersionbitsGuidelineFixture,
  DerivedWalletPathFixture,
  DerivedDescriptorFixture,
  DerivedMusig2SessionFixture,
  DerivedSpFixture,
  DerivedBfBlockFixture,
  DerivedV2Fixture,
  DerivedBip322Fixture,
} from "../types";
import { WorkedExample, type WorkedStep } from "./WorkedExample";

const bits = (s: string) => s.match(/.{1,11}/g)?.join(" ") ?? s;

/* ---------- BIP 39 ---------- */
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

/* ---------- BIPs 9, 8 ---------- */
export function VersionbitsWorked({ fixtures }: { fixtures: Array<DerivedVersionbitsDeploymentFixture | DerivedVersionbitsGuidelineFixture> }) {
  const f = fixtures.find((x): x is DerivedVersionbitsDeploymentFixture => x.kind === "versionbits-deployment")!;
  const d = f.derived;
  const m = d.mainnet;
  const i = m.implied!;
  const num = (n: number) => n.toLocaleString("en-US");
  const steps: WorkedStep[] = [
    {
      title: `The deployment's parameters: bit ${d.bit}, a start, a timeout, a threshold`,
      values: [
        { label: "starttime", value: `${m.start} UTC = ${m.startEpoch}` },
        { label: "timeout", value: `${m.expire} UTC = ${m.expireEpoch}` },
        { label: "threshold", value: `${num(m.threshold)} of 2016 blocks` },
      ],
      layer: { size: 0.55, tone: "plain", cells: 3 },
    },
    {
      title: `Once the median time past reaches starttime, a block signals by setting bit ${d.bit}`,
      values: [{ label: "signalling version", value: `0x${d.signalVersion.toString(16).padStart(8, "0")}` }],
      note: "Top bits 001 and the deployment bit set. Signalling changes no rule by itself.",
      layer: { tone: "wash", cells: 32, highlight: [2, 31 - d.bit] },
    },
    {
      title: `Blocks ${num(i.tallyFrom)}–${num(i.tallyTo)}: at least ${num(m.threshold)} of the period's 2016 signal`,
      values: [{ label: "period", value: `${num(i.activePeriod - 2)} (heights ÷ 2016)` }],
      note: "Inferred: the table records only the activation height, and BIP 9's rules put the successful count two periods before it.",
      layer: { tone: "hatch", cells: 12, highlight: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    },
    {
      title: `From block ${num(i.lockedInFrom)}: LOCKED_IN for one period`,
      values: [{ label: "state", value: "LOCKED_IN — nothing counted, rules not yet enforced" }],
      layer: { size: 0.75, tone: "plain", cells: 1 },
    },
    {
      title: `From block ${num(m.activeHeight!)}: ACTIVE`,
      values: [{ label: "recorded", value: m.state }],
      note: `From this block on, the rules of BIPs ${d.bips.join(", ")} are enforced.`,
      layer: { size: 0.85, tone: "accent", cells: 1 },
    },
  ];
  return (
    <WorkedExample
      intro={<>The <strong>{d.name}</strong> deployment on mainnet, as BIP 9’s assignment table records it, read backwards from its activation height with BIP 9’s rules.</>}
      steps={steps}
      label="A deployment's parameters, a signalling version, a counted period, lock-in and activation, drawn as stacked layers."
      source={<>Source: BIP 9 assignments, line {f.source.line}; dates cross-checked against the deployment section of BIP {f.crossCheck.bip}. Implied periods computed by the tested model.</>}
    />
  );
}

/* ---------- BIPs 44, 84, 86 ---------- */
export function WalletPathWorked({ fixtures }: { fixtures: DerivedWalletPathFixture[] }) {
  const f = fixtures.find((x) => x.derived.scheme === 86) ?? fixtures[0];
  const a = f.derived.addresses[0];
  const o = a.output;
  const nodes = a.nodes;
  const steps: WorkedStep[] = [
    {
      title: "Three hardened steps from the master key: purpose, coin type, account",
      values: [{ label: "path", value: nodes.slice(1, 4).map((n) => n.segment).join(" / ") }, { label: "account public key", value: nodes[3].publicKeyHex }],
      note: "Hardened: each needs its parent's private key.",
      layer: { size: 0.6, tone: "hatch", cells: 3 },
    },
    {
      title: "Two public steps: the receiving chain, then the first address",
      values: [{ label: "path", value: nodes.slice(4).map((n) => n.segment).join(" / ") }, { label: "derived public key", value: a.publicKeyHex }],
      note: "Anyone with the account's extended public key can take these two steps.",
      layer: { size: 0.8, tone: "wash", cells: 2 },
    },
    ...(o && o.kind === "p2tr"
      ? [
          { title: "Drop the parity byte: the internal key is the x coordinate", values: [{ label: "internal key", value: o.internalKeyHex }], layer: { size: 0.7, tone: "plain" as const, cells: 1 } },
          {
            title: "Tweak it with no script tree: Q = P + int(hashTapTweak(P))·G",
            values: [{ label: "tweak", value: o.tweakHex }, { label: "output key", value: o.outputKeyHex }],
            layer: { size: 0.7, tone: "plain" as const, cells: 1 },
          },
          { title: "Version 1 witness program, bech32m", values: [{ label: "scriptPubKey", value: o.scriptPubKeyHex }, { label: "address", value: o.address }], layer: { size: 0.9, tone: "accent" as const, cells: 2 } },
        ]
      : []),
  ];
  return (
    <WorkedExample
      intro={<>BIP {f.derived.scheme}’s <strong>{a.label}</strong> address, <code>{a.path}</code>, from the published test mnemonic. The derived key’s extended keys, the internal key, output key, scriptPubKey and address match the BIP’s test vectors; the others are derived by the same tested model.</>}
      steps={steps}
      label="Three hardened levels, two public levels, then the key-path Taproot tweak and the address, drawn as stacked layers."
      source={<>Source: BIP {f.derived.scheme} test vectors (lines {a.checkedLines.join(", ")}); derived by the tested BIP 32 and wallet-path models.</>}
    />
  );
}

/* ---------- BIPs 380–386 ---------- */
export function DescriptorWorked({ fixtures }: { fixtures: DerivedDescriptorFixture[] }) {
  const f = fixtures.find((x) => x.id === "bip382-wpkh-ranged") ?? fixtures.find((x) => x.derived.ranged) ?? fixtures[0];
  const d = f.derived;
  const k = d.keys[0];
  const part = (role: string) => d.tokens.filter((t) => t.role === role).map((t) => t.text).join("");
  const steps: WorkedStep[] = [
    { title: "The script expression says what kind of output", values: [{ label: "outline", value: d.outline }], note: "wpkh(KEY): pay to the hash of one compressed key, SegWit v0.", layer: { size: 0.5, tone: "plain", cells: 1 } },
    { title: "Key origin: where this key sits in someone's tree", values: [{ label: "origin", value: `[${k.origin}]` }], note: "A fingerprint and the steps already taken. Information about the key; it changes no script.", layer: { size: 0.6, tone: "hatch", cells: 2 } },
    { title: "The key itself: an extended public key", values: [{ label: "key", value: part("key") }], note: "Public only, so the descriptor reveals scripts but cannot spend.", layer: { tone: "wash", cells: 4 } },
    { title: "Derivation after the key, ending in a range", values: [{ label: "steps", value: k.derivation ?? "" }, ...k.publicKeys.map((p, i) => ({ label: `child ${i} key`, value: p }))], note: "/* stands for every unhardened child: one descriptor, many keys.", layer: { size: 0.8, tone: "plain", cells: 3, highlight: [2] } },
    { title: "Each child key fills the template", values: d.scripts.map((s, i) => ({ label: `child ${i} script`, value: s[0] })), note: "OP_0 <HASH160(key)>, matching the scripts BIP 382 lists.", layer: { size: 0.9, tone: "accent", cells: 3 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 382’s ranged descriptor <code>{d.body.slice(0, 22)}…</code>, read part by part and expanded for its first three children.</>}
      steps={steps}
      label="A descriptor's script expression, key origin, key, derivation and range, then the scripts each child produces, drawn as stacked layers."
      source={<>Source: BIP 382, line {f.source.line}; parsed and expanded by the tested descriptor model, checked against lines {f.scriptLines.join(", ")}.</>}
    />
  );
}

/* ---------- BIP 327 ---------- */
export function Musig2Worked({ fixtures }: { fixtures: DerivedMusig2SessionFixture[] }) {
  const f = fixtures[0];
  const d = f.derived;
  const steps: WorkedStep[] = [
    { title: `${d.signers.length} plain public keys, each with a coefficient`, values: d.signers.map((s, i) => ({ label: `signer ${i + 1} key · a`, value: `${s.pubkey} · ${s.secondKey ? "1" : s.coefficient}` })), note: "a = H(L ‖ key) mod n, except the second distinct key, which gets 1.", layer: { size: 0.7, tone: "plain", cells: d.signers.length } },
    { title: "Aggregate key Q = Σ aᵢ·Pᵢ", values: [{ label: "Q (x-only)", value: d.aggXonly }], note: "One BIP 340 public key; nothing in it shows how many signers there are.", layer: { size: 0.55, tone: "accent", cells: 1 } },
    { title: "Round 1: two-point nonces, summed", values: [...d.signers.map((s, i) => ({ label: `signer ${i + 1} nonce`, value: `${s.pubnonce[0]} ${s.pubnonce[1]}` })), { label: "aggregate nonce", value: `${d.aggnonce[0]} ${d.aggnonce[1]}` }], layer: { tone: "wash", cells: 2 * d.signers.length } },
    { title: "Session: b, R = R₁ + b·R₂, challenge e", values: [{ label: "b", value: d.b }, { label: "R", value: d.R }, { label: "e", value: d.e }], layer: { size: 0.6, tone: "hatch", cells: 3 } },
    { title: "Round 2: partial signatures, each verified", values: d.signers.map((s, i) => ({ label: `signer ${i + 1} s`, value: `${s.psig} ${s.psigVerifies ? "✓" : "✕"}` })), layer: { size: 0.8, tone: "plain", cells: d.signers.length } },
    { title: "Sum them: an ordinary BIP 340 signature", values: [{ label: "signature", value: d.signature }], note: d.signatureVerifies ? "BIP 340 verification accepts it for Q and the message." : "Verification fails.", layer: { size: 0.9, tone: d.signatureVerifies ? "accent" : "fail", cells: 2 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 327’s first signature-aggregation vector: {d.signers.length} signers, one message, from public keys to a single signature.</>}
      steps={steps}
      label="Key aggregation, nonce round, session values, partial signatures and the final signature, drawn as stacked layers."
      source={<>Source: BIP 327 sig_agg_vectors.json, case {f.caseIndex}; recomputed by the tested MuSig2 model and verified with noble.</>}
    />
  );
}

/* ---------- BIP 352 ---------- */
export function SpWorked({ fixtures }: { fixtures: DerivedSpFixture[] }) {
  const f = fixtures[0];
  const d = f.derived;
  const mine = d.txOutputs.find((o) => o.mine);
  const steps: WorkedStep[] = [
    { title: "The receiver publishes one static address", values: [{ label: "address", value: d.receiver.address }, { label: "B_scan", value: d.receiver.Bscan }, { label: "B_spend", value: d.receiver.Bspend }], layer: { size: 0.9, tone: "plain", cells: 2 } },
    { title: "The sender's eligible inputs give A", values: [...d.inputs.filter((i) => i.pubkey).map((i, n) => ({ label: `input ${n + 1} key`, value: i.pubkey! })), { label: "A = sum", value: d.A }], layer: { size: 0.7, tone: "wash", cells: d.inputs.length } },
    { title: "Input hash over the smallest outpoint and A", values: [{ label: "smallest outpoint", value: d.smallestOutpoint }, { label: "input_hash", value: d.inputHash }], layer: { size: 0.55, tone: "hatch", cells: 1 } },
    { title: "Both sides reach the same ECDH secret", values: [{ label: "input_hash·a·B_scan = input_hash·b_scan·A", value: d.sharedSecret }], note: d.secretsAgree ? "The sender used the inputs' private keys; the receiver used b_scan and the public A. Same point." : "", layer: { size: 0.6, tone: "accent", cells: 1 } },
    { title: "Output P₀ = B_spend + t₀·G, found by the receiver's scan", values: [{ label: "output key", value: mine?.key ?? "—" }], note: "The output is an ordinary taproot key; only the sender and whoever holds b_scan can recognise it.", layer: { size: 0.8, tone: "plain", cells: 1 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 352’s first send-and-receive vector, “{d.comment}”: from a static address to an output only the receiver can recognise.</>}
      steps={steps}
      label="Address, input keys, input hash, shared secret and output, drawn as stacked layers."
      source={<>Source: BIP 352 send_and_receive_test_vectors.json (line {f.source.line}); recomputed by the tested model and checked against the vector.</>}
    />
  );
}

/* ---------- BIPs 157/158 ---------- */
export function BfWorked({ fixtures }: { fixtures: DerivedBfBlockFixture[] }) {
  const f = fixtures[0];
  const d = f.derived;
  const hit = d.probes.find((p) => p.matched);
  const miss = d.probes.find((p) => !p.matched);
  const c = d.codes[0];
  const steps: WorkedStep[] = [
    { title: `Collect the elements: ${d.N} distinct scripts`, values: d.elements.filter((e) => e.included).slice(0, 3).map((e, i) => ({ label: `${e.from} ${i + 1}`, value: e.script })), note: `${d.elements.length - d.N} of ${d.elements.length} scripts are left out (OP_RETURN, empty or repeated).`, layer: { size: 0.95, tone: "plain", cells: Math.min(d.N, 8) } },
    { title: "Hash each into [0, N·M) with SipHash keyed by the block hash", values: [{ label: "F = N · 784931", value: d.F }, { label: "smallest value", value: d.values[0] ?? "—" }], layer: { size: 0.75, tone: "wash", cells: Math.min(d.N, 8) } },
    { title: "Sort, take the gaps, Golomb-Rice code them", values: c ? [{ label: `first gap ${c.delta}`, value: `${c.unary} ${c.remainder}` }] : [], note: `${d.bitsTotal} bits plus ${d.paddingBits} of padding.`, layer: { size: 0.55, tone: "hatch", cells: 1 } },
    { title: "Prefix N and serialize", values: [{ label: `filter, ${d.filterBytes} bytes`, value: d.filterHex }], layer: { size: 0.6, tone: "accent", cells: 1 } },
    { title: "Query: hash the script the same way and walk the values", values: [...(hit ? [{ label: "script in the block", value: `${hit.script.slice(0, 24)}… → match` }] : []), ...(miss ? [{ label: `script from ${miss.from}`, value: `${miss.script.slice(0, 24)}… → no match` }] : [])], note: "A match means “possibly”; no match means “not among the elements”.", layer: { size: 0.8, tone: "plain", cells: 1 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 158’s testnet block {d.height}{d.notes ? ` (“${d.notes}”)` : ""}: from the block’s scripts to the published filter, then two queries.</>}
      steps={steps}
      label="Elements, hashed values, Golomb-Rice codes, the serialized filter and a query, drawn as stacked layers."
      source={<>Source: BIP 158 testnet-19.json (line {f.source.line}); rebuilt by the tested model and checked against the vector.</>}
    />
  );
}

/* ---------- BIP 324 ---------- */
export function V2Worked({ fixtures }: { fixtures: DerivedV2Fixture[] }) {
  const f = fixtures[0];
  const d = f.derived;
  const p = d.packet;
  const steps: WorkedStep[] = [
    { title: "Two 64-byte public keys cross the wire", values: [{ label: "ours", value: d.ellOurs }, { label: "theirs", value: d.ellTheirs }], note: "ElligatorSwift encodings: uniformly random-looking bytes that decode to curve X coordinates.", layer: { size: 0.95, tone: "plain", cells: 2 } },
    { title: "X-only ECDH, hashed with both encodings", values: [{ label: "x(ECDH)", value: d.xShared }, { label: "shared secret", value: d.sharedSecret }], layer: { size: 0.7, tone: "wash", cells: 1 } },
    { title: "HKDF-SHA256 key schedule", values: [{ label: "session ID", value: d.sessionId }, { label: d.initiating ? "initiator_P (our payload key)" : "responder_P (our payload key)", value: d.initiating ? d.keys.initiatorP : d.keys.responderP }], layer: { size: 0.6, tone: "hatch", cells: 4 } },
    { title: "Garbage terminator, then encrypted packets", values: [{ label: "our terminator", value: d.sendTerminator }], layer: { size: 0.5, tone: "accent", cells: 1 } },
    { title: `Packet ${p.index}: length, ciphertext, tag`, values: [{ label: "encrypted length", value: p.lengthEnc }, { label: "nonce", value: p.nonce }, { label: "tag", value: p.tag }], note: `${p.totalLen} bytes in all for ${p.contentsLen} bytes of contents.`, layer: { size: 0.85, tone: "plain", cells: 3 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 324’s packet vector for packet {p.index}, seen from the {d.initiating ? "initiator" : "responder"}: from two public keys to one encrypted packet.</>}
      steps={steps}
      label="Public keys, shared secret, key schedule, terminator and packet, drawn as stacked layers."
      source={<>Source: BIP 324 packet_encoding_test_vectors.csv (line {f.source.line}); recomputed by the tested model and checked against the vector. ElligatorSwift decodings are taken from the vector; this site does not implement ElligatorSwift.</>}
    />
  );
}

/* ---------- BIP 322 ---------- */
export function Bip322Worked({ fixtures }: { fixtures: DerivedBip322Fixture[] }) {
  const f = fixtures[0];
  const d = f.derived;
  const steps: WorkedStep[] = [
    { title: "Hash the message with a tag", values: [{ label: "message", value: d.message || "(empty)" }, { label: "sha256_tag(\"BIP0322-signed-message\", m)", value: d.messageHash }], layer: { size: 0.6, tone: "wash", cells: 1 } },
    { title: "to_spend commits to the hash and the address", values: [{ label: "scriptSig: OP_0 PUSH32", value: d.messageHash }, { label: "output script (the address)", value: d.toSpend.challenge }, { label: "to_spend txid", value: d.toSpend.txid }], note: "Its one input spends 000…000:FFFFFFFF, an output that does not exist; it is built only to be checked.", layer: { size: 0.9, tone: "plain", cells: 2 } },
    { title: "to_sign spends it", values: [{ label: "input", value: `${d.toSpend.txid}:0` }, { label: "output", value: "0 sats to OP_RETURN" }], layer: { size: 0.8, tone: "hatch", cells: 2 } },
    { title: "The signature is to_sign’s witness", values: d.toSign.witness.map((w, i) => ({ label: `witness item ${i + 1}`, value: w || "(empty)" })), layer: { size: 0.55, tone: "accent", cells: Math.max(1, d.toSign.witness.length) } },
    { title: "Verify as if to_sign were spending a real coin", values: [{ label: "verdict", value: d.verdict.state === "valid" ? `valid at time ${d.verdict.time}, age ${d.verdict.age}` : `${d.verdict.state}: ${d.verdict.reason}` }], layer: { size: 0.7, tone: "plain", cells: 1 } },
  ];
  return (
    <WorkedExample
      intro={<>BIP 322’s vector for the message “{d.message}”, signed for {d.address.slice(0, 14)}…: two transactions built only to be checked, not to be broadcast.</>}
      steps={steps}
      label="Message hash, to_spend, to_sign, witness and verdict, drawn as stacked layers."
      source={<>Source: BIP 322 {f.source.file?.replace("bip-0322/", "")} (line {f.source.line}); rebuilt and verified by the tested model.</>}
    />
  );
}
