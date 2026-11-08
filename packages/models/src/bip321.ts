/**
 * BIP 321 teaching model: how a wallet reads a bitcoin: URI.
 *
 * It splits a URI into its scheme, address body and query parameters,
 * percent-decodes values, and applies the rules that make a URI invalid
 * (duplicate keys, amount format, required keys the wallet does not
 * implement, an empty body without a payment instruction, an address under
 * the wrong key). Addresses are read by their form only: BIP 321's own
 * examples use deliberately invalid addresses. Nothing here pays or opens a
 * callback; `popCallback` only builds the URI a wallet would open.
 */

/** Keys BIP 321 defines for every URI. */
export const GENERAL_KEYS = ["amount", "label", "message", "pop"] as const;
/** Keys BIP 321 defines for payment instructions, plus SegWit addresses keyed by their HRP (bc, tb). */
export const INSTRUCTION_KEYS = ["lightning", "lno", "pay", "sp", "bc", "tb"] as const;
/** Keys that MUST NOT appear twice. BIP 321 names label, message and pop; its invalid examples add amount. */
export const SINGLE_KEYS = ["amount", "label", "message", "pop"] as const;
/** Schemes a wallet must not open as a proof-of-payment callback. */
export const BLOCKED_POP_SCHEMES = ["http", "https", "file", "javascript", "mailto"] as const;

export type ParamKind = "amount" | "label" | "message" | "pop" | "instruction" | "unknown";

export interface UriParam {
  /** The parameter as written, before decoding. */
  raw: string;
  /** The key without any req- prefix, lowercased (keys are case-insensitive). */
  key: string;
  required: boolean;
  /** Percent-decoded value; null when the parameter has no "=". */
  value: string | null;
  kind: ParamKind;
}

export interface UriReading {
  valid: boolean;
  /** The first rule the URI breaks, for an invalid one. */
  reason: string | null;
  scheme: string;
  /** The address body; "" when empty. */
  address: string;
  addressForm: "base58" | "bech32" | "empty" | "other";
  params: UriParam[];
  /** Payment instructions in order: the body address as "onchain", then instruction parameters. */
  instructions: Array<{ key: string; value: string }>;
  /** Parameters this wallet does not implement and may ignore (not req-). */
  ignored: string[];
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const BECH32 = /^[a-z0-9]+1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;
const isBech32 = (s: string) => s === s.toLowerCase() ? BECH32.test(s) : s === s.toUpperCase() && BECH32.test(s.toLowerCase());
const hrpOf = (s: string) => s.slice(0, s.lastIndexOf("1")).toLowerCase();

function kindOf(key: string): ParamKind {
  if ((GENERAL_KEYS as readonly string[]).includes(key)) return key as ParamKind;
  if ((INSTRUCTION_KEYS as readonly string[]).includes(key)) return "instruction";
  return "unknown";
}

/**
 * Read a URI as a wallet that implements `implemented` would. Keys outside
 * that list are ignored, unless prefixed with req-, which makes the URI
 * invalid. The default is every key BIP 321 defines.
 */
export function readBitcoinUri(uri: string, implemented: readonly string[] = [...GENERAL_KEYS, ...INSTRUCTION_KEYS]): UriReading {
  const fail = (reason: string, partial: Partial<UriReading> = {}): UriReading => ({ valid: false, reason, scheme: "", address: "", addressForm: "other", params: [], instructions: [], ignored: [], ...partial });
  const colon = uri.indexOf(":");
  const scheme = colon < 0 ? "" : uri.slice(0, colon);
  if (scheme.toLowerCase() !== "bitcoin") return fail("The scheme is not bitcoin: (in any letter case).", { scheme });
  const rest = uri.slice(colon + 1);
  const q = rest.indexOf("?");
  const address = q < 0 ? rest : rest.slice(0, q);
  const query = q < 0 ? "" : rest.slice(q + 1);
  const addressForm = address === "" ? "empty" : isBech32(address) ? "bech32" : BASE58.test(address) ? "base58" : "other";
  const params: UriParam[] = query === "" ? [] : query.split("&").map((raw) => {
    const eq = raw.indexOf("=");
    const rawKey = (eq < 0 ? raw : raw.slice(0, eq)).toLowerCase();
    const required = rawKey.startsWith("req-");
    const key = required ? rawKey.slice(4) : rawKey;
    let value: string | null = eq < 0 ? null : raw.slice(eq + 1);
    try {
      value = value === null ? null : decodeURIComponent(value);
    } catch {
      /* left as written; reported below */
    }
    return { raw, key, required, value, kind: kindOf(key) };
  });
  const base = { scheme, address, addressForm, params } as const;
  if (addressForm === "other") return fail("The body is not a base58 or bech32 address.", base);
  for (const k of SINGLE_KEYS) {
    if (params.filter((p) => p.key === k).length > 1) return fail(`The key ${k} appears more than once${k === "pop" ? ", counting req-pop" : ""}.`, base);
  }
  const amount = params.find((p) => p.key === "amount");
  if (amount && !/^\d*(\.\d*)?$/.test(amount.value ?? "")) return fail("The amount is not decimal BTC with a period separator.", base);
  const unknownRequired = params.find((p) => p.required && !implemented.includes(p.key));
  if (unknownRequired) return fail(`A required key, req-${unknownRequired.key}, is not implemented.`, base);
  for (const p of params) {
    if ((p.key === "bc" || p.key === "tb") && p.value !== null && hrpOf(p.value) !== p.key) return fail(`A ${hrpOf(p.value)} address is under the key ${p.key}.`, base);
  }
  const instructions = [
    ...(address ? [{ key: "onchain", value: address }] : []),
    ...params.filter((p) => p.kind === "instruction" && implemented.includes(p.key) && p.value !== null).map((p) => ({ key: p.key, value: p.value! })),
  ];
  const anyInstruction = params.some((p) => p.kind === "instruction");
  if (!address && !anyInstruction) return fail("The body is empty and no payment instruction is given.", base);
  const ignored = params.filter((p) => !implemented.includes(p.key)).map((p) => p.raw);
  return { valid: true, reason: null, ...base, instructions, ignored };
}


/** The proof-of-payment rule: which callback a wallet may open, and whether it may pay at all. */
export function popRule(r: UriReading): { callback: string | null; mayOpen: boolean; mayPay: boolean } {
  const p = r.params.find((x) => x.key === "pop");
  if (!p || p.value === null) return { callback: null, mayOpen: false, mayPay: r.valid };
  const scheme = p.value.slice(0, p.value.indexOf(":")).toLowerCase();
  const mayOpen = p.value.includes(":") && !(BLOCKED_POP_SCHEMES as readonly string[]).includes(scheme);
  return { callback: p.value, mayOpen, mayPay: r.valid && (mayOpen || !p.required) };
}

/** The URI a wallet opens after paying: the decoded prefix, the instruction's key ("onchain" for the body), "=", the payment information. */
export function popCallback(r: UriReading, usedKey: string, paymentInformation: string): string {
  const rule = popRule(r);
  if (!rule.callback || !rule.mayOpen) throw new Error("There is no callback this wallet may open.");
  return `${rule.callback}${usedKey}=${paymentInformation}`;
}
