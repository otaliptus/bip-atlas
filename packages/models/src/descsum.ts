/**
 * BIP 380 descriptor checksum, transcribed from the BIP's Python reference
 * (descsum_polymod / descsum_expand / descsum_check / descsum_create).
 *
 * Pure BigInt arithmetic, no imports, so client islands can use it
 * (`@bip-atlas/models/descsum`).
 */

export const INPUT_CHARSET = "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";
export const CHECKSUM_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0xf5dee51989n, 0xa9fdca3312n, 0x1bab10e32dn, 0x3706b1677an, 0x644d626ffdn];

export function descsumPolymod(symbols: readonly number[]): bigint {
  let chk = 1n;
  for (const value of symbols) {
    const top = chk >> 35n;
    chk = ((chk & 0x7ffffffffn) << 5n) ^ BigInt(value);
    for (let i = 0; i < 5; i++) if ((top >> BigInt(i)) & 1n) chk ^= GENERATOR[i];
  }
  return chk;
}

export interface ExpandedSymbol {
  /** Index into the descriptor text, or null for an inserted group symbol. */
  char: number | null;
  value: number;
}

/** Character → symbol expansion: each character's position in its group of 32, plus one group symbol per 3 characters. */
export function descsumExpand(s: string): ExpandedSymbol[] | null {
  const groups: number[] = [];
  const out: ExpandedSymbol[] = [];
  for (let k = 0; k < s.length; k++) {
    const v = INPUT_CHARSET.indexOf(s[k]);
    if (v < 0) return null;
    out.push({ char: k, value: v & 31 });
    groups.push(v >> 5);
    if (groups.length === 3) {
      out.push({ char: null, value: groups[0] * 9 + groups[1] * 3 + groups[2] });
      groups.length = 0;
    }
  }
  if (groups.length === 1) out.push({ char: null, value: groups[0] });
  else if (groups.length === 2) out.push({ char: null, value: groups[0] * 3 + groups[1] });
  return out;
}

/** The 8-character checksum for a descriptor body (descsum_create without the "#"). */
export function descsumCreate(body: string): string {
  const sym = descsumExpand(body);
  if (!sym) throw new RangeError("character outside the descriptor character set");
  const c = descsumPolymod([...sym.map((x) => x.value), 0, 0, 0, 0, 0, 0, 0, 0]) ^ 1n;
  return Array.from({ length: 8 }, (_, i) => CHECKSUM_CHARSET[Number((c >> BigInt(5 * (7 - i))) & 31n)]).join("");
}

export type ChecksumVerdict = "valid" | "no-checksum" | "bad-length" | "bad-charset" | "mismatch";

/** descsum_check, with the reason when it fails. A descriptor without "#" has no checksum (allowed for parsing). */
export function descsumCheck(s: string): { verdict: ChecksumVerdict; body: string; given: string | null; expected: string | null } {
  const hash = s.indexOf("#");
  if (hash < 0) return { verdict: "no-checksum", body: s, given: null, expected: null };
  const body = s.slice(0, hash);
  const given = s.slice(hash + 1);
  const sym = descsumExpand(body);
  if (!sym) return { verdict: "bad-charset", body, given, expected: null };
  const expected = descsumCreate(body);
  if (given.length !== 8) return { verdict: "bad-length", body, given, expected };
  if (![...given].every((c) => CHECKSUM_CHARSET.includes(c))) return { verdict: "bad-charset", body, given, expected };
  const ok = descsumPolymod([...sym.map((x) => x.value), ...[...given].map((c) => CHECKSUM_CHARSET.indexOf(c))]) === 1n;
  return { verdict: ok ? "valid" : "mismatch", body, given, expected };
}
