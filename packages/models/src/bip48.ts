/**
 * BIP 48 teaching model: the m/48' path levels for multisig wallets. Each
 * cosigner derives keys at the same path from their own seed; BIP 48 wallets
 * then sort the keys as BIP 67 describes. Paths only: no key derivation here
 * (that is ./bip32).
 */
export const BIP48_PURPOSE = 48;
/** Script types BIP 48 covers, by the hardened index at the script level. */
export const BIP48_SCRIPT_TYPES = { "p2sh-p2wsh": 1, p2wsh: 2 } as const;
export type Bip48Script = keyof typeof BIP48_SCRIPT_TYPES;

export interface Bip48Level { name: string; value: string; hardened: boolean }

export interface Bip48Params {
  network: "mainnet" | "testnet";
  account: number;
  script: Bip48Script;
  change: 0 | 1;
  index: number;
}

/** m / purpose' / coin_type' / account' / script_type' / change / address_index. */
export function bip48Levels(p: Bip48Params): Bip48Level[] {
  if (!(p.script in BIP48_SCRIPT_TYPES)) throw new RangeError(`BIP 48 covers p2sh-p2wsh and p2wsh, not ${p.script}`);
  for (const [name, v] of [["account", p.account], ["index", p.index]] as const) if (!Number.isInteger(v) || v < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return [
    { name: "purpose", value: `${BIP48_PURPOSE}'`, hardened: true },
    { name: "coin type", value: `${p.network === "mainnet" ? 0 : 1}'`, hardened: true },
    { name: "account", value: `${p.account}'`, hardened: true },
    { name: "script type", value: `${BIP48_SCRIPT_TYPES[p.script]}'`, hardened: true },
    { name: "change", value: String(p.change), hardened: false },
    { name: "address index", value: String(p.index), hardened: false },
  ];
}

export const bip48Path = (p: Bip48Params) => ["m", ...bip48Levels(p).map((l) => l.value)].join("/");
