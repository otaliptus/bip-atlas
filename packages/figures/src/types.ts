import type { Network } from "@bip-atlas/models/bech32";

/** Where a fixture's values come from: a pinned BIP line, or a pinned external vector file. */
export interface FixtureSource {
  bip?: number;
  line?: number;
  section?: string;
  /** Auxiliary file in the BIP's directory (e.g. "bip-0340/test-vectors.csv"); defaults to the BIP itself. */
  file?: string;
  /** Verbatim text that must appear on the cited BIP line. */
  quote?: string;
  /** File name in sources/external/external.lock.json. */
  external?: string;
  /** Location inside the external file, e.g. "english[0]". */
  pointer?: string;
}

/** A reviewed public fixture as passed to figure recipes. */
export interface BaseFixture {
  id: string;
  kind: string;
  label: string;
  shortLabel?: string;
  source: FixtureSource;
}

export interface AddressFixture extends BaseFixture {
  kind: "address";
  address: string;
  network: Network;
  lab: boolean;
}

export interface MnemonicFixture extends BaseFixture {
  kind: "mnemonic";
  entropyHex: string;
  mnemonic: string;
  passphrase: string;
  seedHex: string;
  lab: boolean;
}

/** Values computed at build time by the tested BIP39 model and passed to figures. */
export interface MnemonicDerived {
  layout: { entropyBits: number; checksumBits: number; totalBits: number; wordCount: number; lastWordEntropyBits: number };
  entropyBits: string;
  hashHex: string;
  checksumBits: string;
  groups: Array<{ position: number; bits: string; index: number; word: string; entropyBitCount: number; checksumBitCount: number }>;
  seeds: Array<{ passphrase: string; seedHex: string; origin: "vector" | "computed" }>;
  /** Last-word odds: indices of every last word that would pass the checksum after the first n − 1 words. */
  lastWord: { prefixWords: number; validIndices: number[]; actualIndex: number };
  /** The first wordlist entries, for drawing the list itself. */
  wordlistSample: Array<{ index: number; word: string }>;
  /** Number of words in the wordlist the model used (2,048 for BIP 39). */
  wordlistSize: number;
}

export type DerivedMnemonicFixture = MnemonicFixture & { derived: MnemonicDerived };

export interface Bip32SeedFixture extends BaseFixture {
  kind: "bip32-seed";
  seedHex: string;
  /** Chains copied verbatim from the BIP's test vector, with their source lines. */
  vectorChains: Array<{ path: string; line: number; xpub: string; xprv: string }>;
  tree: { paths: string[]; toggle: { normal: string; hardened: string } };
  serializePath: string;
}

export interface Bip32NodeDerived {
  path: string;
  parentPath: string | null;
  depth: number;
  indexLabel: string;
  hardened: boolean;
  xprv: string;
  xpub: string;
  fingerprintHex: string;
  parentFingerprintHex: string;
  childNumberHex: string;
  chainCodeHex: string;
  publicKeyHex: string;
  privateKeyHex: string;
  /** HMAC input used to derive this node from its parent (null for the master). */
  hmacDataHex: string | null;
  /** Line in the BIP's test vector that lists this node, if any. */
  vectorLine: number | null;
  /** First hardened path segment, if any; public-only derivation from M stops there. */
  hardenedAncestor: string | null;
}

export interface Bip32Derived {
  masterIHex: string;
  nodes: Bip32NodeDerived[];
  serialization: {
    path: string;
    rows: Array<{ kind: "public" | "private"; rawHex: string; checksumHex: string; base58: string }>;
  };
}

export type DerivedBip32Fixture = Bip32SeedFixture & { derived: Bip32Derived };

export interface TransactionFixture extends BaseFixture {
  kind: "transaction";
  txHex: string;
  inputKinds: string[];
  sighash: {
    inputIndex: number;
    scriptCodeHex: string;
    scriptCodeLine: number;
    amountSats: string;
    amountLine: number;
    amountQuote: string;
    preimageLine: number;
    preimageHex: string;
    sighashLine: number;
    sighashHex: string;
  };
}

export interface TransactionDerived {
  segments: Array<{ id: string; label: string; part: "base" | "marker" | "witness"; hex: string; index?: number }>;
  measures: { txidHex: string; wtxidHex: string; baseSize: number; totalSize: number; weight: number; vsize: number };
  digest: {
    items: Array<{ id: string; label: string; hex: string; from: string[]; note: string }>;
    sighashHex: string;
  };
}

export type DerivedTransactionFixture = TransactionFixture & { derived: TransactionDerived };

export interface PsbtTraceFixture extends BaseFixture {
  kind: "psbt-trace";
  steps: Array<{ id: string; role: string; line: number; basedOn: string[]; hex: string }>;
  extracted: { line: number; hex: string };
}

export interface PsbtCombineFixture extends BaseFixture {
  kind: "psbt-combine";
  parts: Array<{ line: number; hex: string }>;
  combined: { line: number; hex: string };
}

export interface PsbtRecordView {
  scope: "global" | "input" | "output";
  index: number;
  keyType: number;
  name: string;
  constant: string | null;
  parentBip: number | null;
  keyDataHex: string;
  valueHex: string;
  /** Short computed reading of the value, e.g. a derivation path. */
  reading: string | null;
}

export interface PsbtStateView {
  id: string;
  role: string;
  line: number;
  basedOn: string[];
  bytes: number;
  /** For a merge step: how many records in the result came from only one of the inputs, per input. */
  uniqueFrom: number[] | null;
  maps: Array<{ scope: "global" | "input" | "output"; index: number; records: Array<PsbtRecordView & { status: "added" | "kept" }>; removed: PsbtRecordView[] }>;
}

export interface PsbtTraceDerived {
  states: PsbtStateView[];
  extracted: { bytes: number; txidHex: string; wtxidHex: string; inputs: number; outputs: number };
  outputsBtc: string[];
}

export type DerivedPsbtTraceFixture = PsbtTraceFixture & { derived: PsbtTraceDerived };

export interface PsbtCombineDerived {
  parts: Array<{ line: number; records: PsbtRecordView[] }>;
  combined: { line: number; records: PsbtRecordView[] };
}

export type DerivedPsbtCombineFixture = PsbtCombineFixture & { derived: PsbtCombineDerived };

export interface SchnorrVectorFixture extends BaseFixture {
  kind: "schnorr-vector";
  vectorIndex: number;
  publicKeyHex: string;
  messageHex: string;
  signatureHex: string;
  /** The CSV's "verification result" column. */
  expected: boolean;
  /** The CSV's comment column, verbatim. */
  comment: string;
}

export type SchnorrStageId = "lift-x" | "r-range" | "s-range" | "challenge" | "compute-r" | "infinity" | "even-y" | "x-match";

export interface SchnorrTraceView {
  valid: boolean;
  failedStage: SchnorrStageId | null;
  steps: Array<{ stage: SchnorrStageId; ok: boolean; values: Record<string, string> }>;
}

export interface SchnorrDerived {
  /** Messages available in this figure: each comes from one of its fixtures. */
  messages: Array<{ key: string; fromVector: number; hex: string; bytes: number }>;
  /** Key of this vector's own message in `messages`. */
  ownMessage: string;
  /** Verification trace of this vector's key and signature against each message. */
  traces: Record<string, SchnorrTraceView>;
  /** SHA256("BIP0340/challenge"), the tag half of the challenge prefix. */
  challengeTagHex: string;
  challengeHashHex: string | null;
}

export type DerivedSchnorrFixture = SchnorrVectorFixture & { derived: SchnorrDerived };

export type TaprootScriptTree = null | { id: number; script: string; leafVersion: number } | [TaprootScriptTree, TaprootScriptTree];

export interface TaprootTreeFixture extends BaseFixture {
  kind: "taproot-tree";
  vectorIndex: number;
  given: { internalPubkey: string; scriptTree: TaprootScriptTree };
  intermediary: { leafHashes?: string[]; merkleRoot: string | null; tweak: string; tweakedPubkey: string };
  expected: { scriptPubKey: string; bip350Address: string; scriptPathControlBlocks?: string[] };
  /** A published key-path spend of this same output, if the vectors include one. */
  keySpend?: { pointer: string; txinIndex: number; hashType: number; sigHash: string; witness: string[] };
}

export interface TaprootNodeView {
  hash: string;
  leaf: number | null;
  children: TaprootNodeView[];
}

export interface TaprootLeafView {
  id: number;
  leafVersion: number;
  scriptHex: string;
  /** Short reading of the script, e.g. "<32-byte key> OP_CHECKSIG". */
  scriptReading: string;
  leafHash: string;
  path: string[];
  controlBlockHex: string;
  /** The verifier's recomputation from the control block, step by step. */
  check: Array<{ id: string; ok: boolean; values: Record<string, string> }>;
}

export interface TaprootTreeDerived {
  internalKeyHex: string;
  merkleRootHex: string | null;
  tweakHex: string;
  outputKeyHex: string;
  parity: 0 | 1;
  scriptPubKeyHex: string;
  address: string;
  root: TaprootNodeView | null;
  leaves: TaprootLeafView[];
  keySpend: { signatureHex: string; hashType: number; sighashHex: string; verified: boolean } | null;
}

export type DerivedTaprootTreeFixture = TaprootTreeFixture & { derived: TaprootTreeDerived };

export interface TaprootKeyspendFixture extends BaseFixture {
  kind: "taproot-keyspend";
  rawUnsignedTx: string;
  utxosSpent: Array<{ scriptPubKey: string; amountSats: number }>;
  inputSpending: {
    given: { txinIndex: number; merkleRoot: string | null; hashType: number };
    intermediary: { internalPubkey: string; tweak: string; sigMsg: string; precomputedUsed: string[]; sigHash: string };
    expected: { witness: string[] };
  };
}

export interface TaprootKeyspendDerived {
  inputs: number;
  outputs: number;
  txinIndex: number;
  hashType: number;
  items: Array<{ id: string; label: string; hex: string; bytes: number; note: string }>;
  sigMsgBytes: number;
  sighashHex: string;
  totalSpentSats: string;
  totalOutSats: string;
}

export type DerivedTaprootKeyspendFixture = TaprootKeyspendFixture & { derived: TaprootKeyspendDerived };

export interface TapscriptCaseFixture extends BaseFixture {
  kind: "tapscript-case";
  /** Index of the case in the upstream script_assets_test.json array. */
  caseIndex: number;
  /** The upstream case's comment, verbatim. */
  comment: string;
}

export interface TapscriptElement {
  hex: string;
  bytes: number;
  /** Short reading: "signature", "32-byte key", "number 24", "empty"… */
  label: string;
}

export interface TapscriptTraceView {
  /** Core's label for this witness. */
  expected: "success" | "failure";
  valid: boolean;
  failStage: string | null;
  reason: string;
  scriptHex: string;
  ops: Array<{ position: number; name: string; dataBytes: number | null }>;
  elements: TapscriptElement[];
  /** Indices into `elements`, bottom of stack first. */
  initialStack: number[];
  /** Serialized sizes, each including its length prefix; totalBytes adds the item-count prefix. */
  witness: { items: number; stackBytes: number; scriptBytes: number; controlBytes: number; annexBytes: number; totalBytes: number; siblings: number };
  budgetStart: number;
  sigOpsCounted: number;
  steps: Array<{
    position: number;
    name: string;
    executed: boolean;
    note: string;
    failed: boolean;
    before: number[];
    after: number[];
    sig: { check: string; budgetAfter: number; keyBytes: number } | null;
  }>;
}

export interface TapscriptDerived {
  success: TapscriptTraceView;
  failure: TapscriptTraceView;
}

export type DerivedTapscriptFixture = TapscriptCaseFixture & { derived: TapscriptDerived };

export interface P2shSpendFixture extends BaseFixture {
  kind: "p2sh-spend";
  txHex: string;
  inputIndex: number;
  /** Where the spent output comes from: a record in the BIP 174 updater PSBT, or a BIP line. */
  prevout:
    | { from: "psbt-non-witness-utxo" | "psbt-witness-utxo"; line: number; inputIndex: number }
    | { from: "bip-line"; line: number; scriptPubKeyHex: string; amountQuote: string };
  /** Satoshis spent, needed only for wrapped SegWit (BIP 143 commits to it). */
  amountSats: string | null;
}

export interface P2shStageView {
  id: string;
  title: string;
  ok: boolean;
  scriptAsm: string | null;
  scriptBytes: number | null;
  stackBefore: string[];
  steps: Array<{ name: string; note: string; stackAfter: string[]; failed: boolean; checks: Array<{ sigIndex: number; keyIndex: number | null; ok: boolean }> | null }>;
  note: string;
}

export interface P2shDerived {
  kind: "legacy" | "p2sh-p2wpkh" | "p2sh-p2wsh";
  valid: boolean;
  scriptPubKeyHex: string;
  committedHashHex: string;
  redeemScriptHex: string;
  redeemAsm: string;
  redeemHash160Hex: string;
  redeemSigops: number;
  /** The scriptSig's bytes (push opcodes included, its own length prefix not). */
  scriptSigBytes: number;
  /** The serialized witness: item count, each item's length prefix and the items; 0 if empty. */
  witnessBytes: number;
  stages: P2shStageView[];
}

export type DerivedP2shFixture = P2shSpendFixture & { derived: P2shDerived };

/* ---------- timelocks (BIPs 65, 68, 112, 113) ---------- */

export interface TimelockCaseFixture extends BaseFixture {
  kind: "timelock-case";
  coreFile: "tx_valid.json" | "tx_invalid.json";
  coreIndex: number;
  comment: string;
  expected: "valid" | "invalid";
  lock: "absolute" | "relative";
}

export interface TimelockCheckView {
  id: string;
  label: string;
  ok: boolean;
  stopsHere?: boolean;
  detail: string;
}

export interface TimelockCaseDerived {
  asm: string;
  opcode: "CHECKLOCKTIMEVERIFY" | "CHECKSEQUENCEVERIFY";
  /** The script argument, as a decimal string (it may exceed 32 bits or be negative). */
  argument: string;
  trailingOne: boolean;
  version: number;
  nLockTime: number;
  nSequence: number;
  txHex: string;
  checks: TimelockCheckView[];
  valid: boolean;
}
export type DerivedTimelockCaseFixture = TimelockCaseFixture & { derived: TimelockCaseDerived };

export interface TimelockBipTxFixture extends BaseFixture {
  kind: "timelock-bip-tx";
  txHex: string;
}

export interface TimelockBipTxDerived {
  version: number;
  nLockTime: number;
  lockKind: "height" | "time";
  enforced: boolean;
  firstHeight: number | null;
  inputs: Array<{ nSequence: number; final: boolean; disableFlag: boolean; relative: { unit: "blocks" | "time"; value: number } | null; reason: "version" | "disable-flag" | null }>;
}
export type DerivedTimelockBipTxFixture = TimelockBipTxFixture & { derived: TimelockBipTxDerived };

export interface TimelockEncodingFixture extends BaseFixture {
  kind: "timelock-encoding";
  timeLine: number;
  timeQuote: string;
}

export interface TimelockEncodingDerived {
  threshold: number;
  thresholdIso: string;
  maxLockTimeIso: string;
  maxBlocks: number;
  maxTimeUnits: number;
  maxTimeSeconds: number;
  typeFlagSequence: number;
}
export type DerivedTimelockEncodingFixture = TimelockEncodingFixture & { derived: TimelockEncodingDerived };

/* ---------- version bits (BIPs 9, 8) ---------- */

export interface VersionbitsDeploymentFixture extends BaseFixture {
  kind: "versionbits-deployment";
  name: string;
  crossCheck: { bip: number; mainnetLine: number; testnetLine: number };
}

export interface VersionbitsNetworkView {
  start: string;
  expire: string;
  startEpoch: number;
  expireEpoch: number;
  state: string;
  activeHeight: number | null;
  implied: { activePeriod: number; lockedInFrom: number; tallyFrom: number; tallyTo: number } | null;
  threshold: number;
}

export interface VersionbitsDeploymentDerived {
  name: string;
  bit: number;
  bips: number[];
  signalVersion: number;
  mainnet: VersionbitsNetworkView;
  testnet: VersionbitsNetworkView;
}
export type DerivedVersionbitsDeploymentFixture = VersionbitsDeploymentFixture & { derived: VersionbitsDeploymentDerived };

export interface VersionbitsGuidelineFixture extends BaseFixture {
  kind: "versionbits-guideline";
  timeoutLine: number;
  timeoutQuote: string;
}

export interface VersionbitsGuidelineDerived {
  threshold: number;
  timeoutPeriods: number;
}
export type DerivedVersionbitsGuidelineFixture = VersionbitsGuidelineFixture & { derived: VersionbitsGuidelineDerived };

/* ---------- wallet paths (BIPs 44, 84, 86) ---------- */

export interface WalletPathVectorFixture extends BaseFixture {
  kind: "wallet-path-vector";
  scheme: 44 | 84 | 86;
  root: { privLine: number; pubLine: number } | null;
  account: { path: string; privLine: number | null; pubLine: number | null };
  addresses: Array<{ path: string; label: string; lines: Record<string, number> }>;
  keySource?: { bip: number; line: number; note: string };
}

export interface WalletNodeView {
  level: string;
  segment: string;
  index: number | null;
  hardened: boolean;
  depth: number;
  parentFingerprintHex: string;
  publicKeyHex: string;
}

export interface WalletAddressView {
  path: string;
  label: string;
  change: number;
  index: number;
  nodes: WalletNodeView[];
  publicKeyHex: string;
  /** null for BIP 44, which names no script type. */
  output: null | { kind: "p2wpkh"; keyHashHex: string; scriptPubKeyHex: string; address: string } | { kind: "p2tr"; internalKeyHex: string; tweakHex: string; outputKeyHex: string; scriptPubKeyHex: string; address: string };
  /** The same address re-derived from the account extended public key alone. */
  fromXpubMatches: boolean;
  /** Pinned lines this view was checked against. */
  checkedLines: number[];
}

export interface WalletPathDerived {
  scheme: 44 | 84 | 86;
  accountPath: string;
  accountXpub: string;
  accountXpubPublished: boolean;
  addresses: WalletAddressView[];
}
export type DerivedWalletPathFixture = WalletPathVectorFixture & { derived: WalletPathDerived };

/* ---------- descriptors (BIPs 380–386) ---------- */

export interface DescriptorVectorFixture extends BaseFixture {
  kind: "descriptor-vector";
  descriptor: string;
  /** Lines of the published scripts (one per child, or combo's four). */
  scriptLines: number[];
}

export type DescriptorTokenRole = "fn" | "punct" | "num" | "text" | "origin" | "key" | "path" | "range" | "checksum" | "hash";

export interface DescriptorKeyView {
  text: string;
  kind: string;
  isPrivate: boolean;
  origin: string | null;
  derivation: string | null;
  range: string | null;
  /** Public key (hex) at child 0, 1, 2 for ranged keys; one entry otherwise. */
  publicKeys: string[];
}

export interface DescriptorDerived {
  body: string;
  checksumGiven: string | null;
  checksumComputed: string;
  checksumVerdict: string;
  symbolCount: number;
  symbols: Array<{ char: number | null; value: number }>;
  tokens: Array<{ text: string; role: DescriptorTokenRole; key: number | null }>;
  /** null when the descriptor fails to parse (e.g. a checksum mismatch). */
  error: string | null;
  outline: string;
  keys: DescriptorKeyView[];
  ranged: boolean;
  hasPrivateKeys: boolean;
  /** Scripts per child index (combo: all four for the one child). */
  scripts: string[][];
}
export type DerivedDescriptorFixture = DescriptorVectorFixture & { derived: DescriptorDerived };

export interface DescriptorIndexFixture extends BaseFixture {
  kind: "descriptor-index";
  tableFrom: number;
  tableTo: number;
}

export interface DescriptorIndexDerived {
  rows: Array<{ expression: string; bip: number; contexts: string[] | null; template: string | null }>;
}
export type DerivedDescriptorIndexFixture = DescriptorIndexFixture & { derived: DescriptorIndexDerived };

/* ---------- MuSig2 (BIP 327) ---------- */

export interface Musig2SessionFixture extends BaseFixture {
  kind: "musig2-session";
  caseIndex: number;
}

export interface Musig2SignerView {
  pubkey: string;
  coefficient: string;
  /** The second distinct key gets coefficient 1 (MuSig2*). */
  secondKey: boolean;
  pubnonce: [string, string];
  psig: string;
  psigVerifies: boolean;
}

export interface Musig2SessionDerived {
  msg: string;
  keyListHash: string;
  signers: Musig2SignerView[];
  /** Aggregate key before tweaks: plain (33 bytes) and x-only. */
  aggPlain: string;
  aggXonly: string;
  tweaks: Array<{ tweak: string; xonly: boolean; resultXonly: string }>;
  finalXonly: string;
  aggnonce: [string, string];
  b: string;
  R: string;
  rEvenY: boolean;
  e: string;
  tacc: string;
  signature: string;
  signatureVerifies: boolean;
}
export type DerivedMusig2SessionFixture = Musig2SessionFixture & { derived: Musig2SessionDerived };

export interface Musig2KeyaggFixture extends BaseFixture {
  kind: "musig2-keyagg";
  caseIndices: number[];
}

export interface Musig2KeyaggDerived {
  orders: Array<{ keys: string[]; coefficients: string[]; aggXonly: string }>;
  /** The x coordinate of P1 + P2 + P3, which MuSig2 does not use. */
  naiveSumXonly: string;
}
export type DerivedMusig2KeyaggFixture = Musig2KeyaggFixture & { derived: Musig2KeyaggDerived };

export interface Musig2PsigChecksFixture extends BaseFixture {
  kind: "musig2-psig-checks";
}

export interface Musig2PsigChecksDerived {
  rows: Array<{ label: string; signer: number; psig: string; verdict: "valid" | "invalid" | "error"; detail: string }>;
}
export type DerivedMusig2PsigChecksFixture = Musig2PsigChecksFixture & { derived: Musig2PsigChecksDerived };

/* ---------- silent payments (BIP 352) ---------- */

export interface SpVectorFixture extends BaseFixture {
  kind: "sp-vector";
  caseIndex: number;
}

export interface SpInputView {
  outpoint: string;
  kind: string;
  pubkey: string | null;
  skipped: string | null;
}

export interface SpDerived {
  comment: string;
  inputs: SpInputView[];
  smallestOutpoint: string;
  A: string;
  inputHash: string;
  tweak: string;
  sharedSecret: string;
  /** The sender's shared secret for this receiver equals the receiver's. */
  secretsAgree: boolean;
  /** The sender's shared secret with the (first) scan key it pays. */
  senderSecret: string;
  receiver: { address: string; Bscan: string; Bspend: string; labels: number[]; labeledAddresses: string[] };
  /** The addresses the sender pays; ours = in the receiving case's address list, label null = its unlabeled address. */
  paidTo: Array<{ address: string; Bscan: string; Bm: string; ours: boolean; label: number | null }>;
  senderOutputs: string[];
  txOutputs: Array<{ key: string; mine: boolean; label: number | null; k: number | null }>;
  steps: Array<{ k: number; tk: string; Pk: string; matched: boolean; via: string | null }>;
}
export type DerivedSpFixture = SpVectorFixture & { derived: SpDerived };

export interface SpEligibilityFixture extends BaseFixture {
  kind: "sp-eligibility";
  caseIndices: number[];
}

export interface SpEligibilityDerived {
  rows: Array<{ comment: string; inputs: SpInputView[] }>;
}
export type DerivedSpEligibilityFixture = SpEligibilityFixture & { derived: SpEligibilityDerived };

/* ---------- BIPs 157/158 ---------- */
export interface BfBlockFixture extends BaseFixture {
  kind: "bf-block";
  height: number;
}
export interface BfCode { delta: string; q: number; r: string; unary: string; remainder: string }
export interface BfProbe {
  script: string;
  /** "this block" or "block <height>": where the script was taken from. */
  from: string;
  matched: boolean;
  target: string;
  steps: Array<{ value: string; outcome: "less" | "equal" | "greater" }>;
}
export interface BfBlockDerived {
  height: number;
  hash: string;
  notes: string;
  txCount: number;
  N: number;
  F: string;
  filterHex: string;
  filterBytes: number;
  elements: Array<{ script: string; from: "output" | "spent"; included: boolean; reason?: string }>;
  values: string[];
  codes: BfCode[];
  bitsTotal: number;
  paddingBits: number;
  probes: BfProbe[];
  filterHash: string;
  prevHeader: string;
  header: string;
}
export type DerivedBfBlockFixture = BfBlockFixture & { derived: BfBlockDerived };

export interface BfChainFixture extends BaseFixture {
  kind: "bf-chain";
  heights: number[];
}
export interface BfChainDerived {
  rows: Array<{ height: number; hash: string; filterHex: string; filterHash: string; prevHeader: string; header: string; linksToPrevious: boolean | null }>;
}
export type DerivedBfChainFixture = BfChainFixture & { derived: BfChainDerived };

export interface BfGolombFixture extends BaseFixture {
  kind: "bf-golomb";
  /** A published block whose first delta illustrates P = 19. */
  exampleHeight: number;
}
export interface BfGolombDerived {
  table: Array<{ n: number; q: number; r: number; code: string }>;
  example: { height: number; value: string; F: string; code: BfCode };
}
export type DerivedBfGolombFixture = BfGolombFixture & { derived: BfGolombDerived };

/* ---------- BIP 324 ---------- */
export interface V2VectorFixture extends BaseFixture {
  kind: "v2-vector";
  /** in_idx: how many packets this side had sent before. */
  index: number;
}
export interface V2Derived {
  initiating: boolean;
  ellOurs: string;
  ellTheirs: string;
  xOurs: string;
  xTheirs: string;
  xShared: string;
  sharedSecret: string;
  sessionId: string;
  keys: { initiatorL: string; initiatorP: string; responderL: string; responderP: string };
  sendTerminator: string;
  recvTerminator: string;
  packet: {
    index: number;
    nonce: string;
    rekeysSoFar: number;
    lengthPlain: string;
    lengthEnc: string;
    ignore: boolean;
    contentsLen: number;
    contentsHead: string;
    aadLen: number;
    ciphertextHead: string;
    ciphertextTail: string;
    tag: string;
    totalLen: number;
    /** How many bytes of the packet the vector publishes (all, or only the tail). */
    checkedBytes: number;
  };
}
export type DerivedV2Fixture = V2VectorFixture & { derived: V2Derived };

export interface V2FramingFixture extends BaseFixture {
  kind: "v2-framing";
  messageType: string;
}
export interface V2FramingDerived {
  messageType: string;
  shortId: number;
  v1: Array<{ field: string; bytes: number }>;
  v2: Array<{ field: string; bytes: number }>;
}
export type DerivedV2FramingFixture = V2FramingFixture & { derived: V2FramingDerived };

export interface V2RekeyFixture extends BaseFixture {
  kind: "v2-rekey";
  index: number;
  show: number[];
}
export interface V2RekeyDerived {
  initiating: boolean;
  rows: Array<{ packet: number; nonce: string; epoch: number; key: string }>;
}
export type DerivedV2RekeyFixture = V2RekeyFixture & { derived: V2RekeyDerived };

/* ---------- BIP 322 ---------- */
export interface Bip322VectorFixture extends BaseFixture {
  kind: "bip322-vector";
  set: "basic" | "gen";
  group: "simple" | "full" | "error" | "proof_of_funds";
  index: number;
  expect: "valid" | "invalid" | "inconclusive";
}
export interface Bip322Derived {
  message: string;
  messageHash: string;
  address: string;
  spk: string;
  scriptKind: string;
  variant: string;
  prefixed: boolean;
  signatureHead: string;
  signatureChars: number;
  toSpend: { txid: string; scriptSig: string; challenge: string };
  toSign: { txid: string; version: number; lockTime: number; sequence: number; scriptSig: string; witness: string[] };
  verdict: { state: "valid" | "invalid" | "inconclusive"; time?: number; age?: number; reason?: string };
  checked: string;
}
export type DerivedBip322Fixture = Bip322VectorFixture & { derived: Bip322Derived };

export interface Bip322FormatsFixture extends BaseFixture { kind: "bip322-formats" }
export interface Bip322FormatsDerived { rows: Array<{ name: string; scripts: string; prefix: string; format: string }> }
export type DerivedBip322FormatsFixture = Bip322FormatsFixture & { derived: Bip322FormatsDerived };

export interface Bip322VerdictsFixture extends BaseFixture { kind: "bip322-verdicts"; cases: string[] }
export interface Bip322VerdictsDerived {
  rows: Array<{ label: string; message: string; address: string; state: string; detail: string }>;
  /** The interpreter's reviewed non-push opcodes, by script version (names without OP_). */
  reviewed: Array<{ version: string; ops: string[] }>;
}
export type DerivedBip322VerdictsFixture = Bip322VerdictsFixture & { derived: Bip322VerdictsDerived };
