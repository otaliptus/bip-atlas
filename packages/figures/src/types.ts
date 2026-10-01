import type { Network } from "@bip-atlas/models/bech32";

/** Where a fixture's values come from: a pinned BIP line, or a pinned external vector file. */
export interface FixtureSource {
  bip?: number;
  line?: number;
  section?: string;
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
