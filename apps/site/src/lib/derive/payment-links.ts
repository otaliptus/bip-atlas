import { GENERAL_KEYS, INSTRUCTION_KEYS, popCallback, popRule, readBitcoinUri } from "@bip-atlas/models";
import type { Bip321UriFixture, Bip321WalletView, DerivedBip321Fixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE4, checkSourceQuote, pinnedText } from "./sources";

/**
 * Three illustrative wallets, defined here and not by BIP 321: one that reads
 * only BIP 21's keys, one that adds Lightning (BOLT 11 invoices and BOLT 12
 * offers) and proof of payment, and one that implements every key BIP 321
 * defines. Each reading below applies BIP 321's rules to that key set.
 */
export const WALLETS: Array<{ name: string; implemented: string[] }> = [
  { name: "BIP 21 keys only", implemented: ["amount", "label", "message"] },
  { name: "Adds Lightning", implemented: ["amount", "label", "message", "pop", "lightning", "lno"] },
  { name: "Every BIP 321 key", implemented: [...GENERAL_KEYS, ...INSTRUCTION_KEYS] },
];

const onLine = (line: number, text: string) => pinnedText("bip-0321.mediawiki", SNAPSHOT_PHASE4).split("\n")[line - 1]?.includes(text);

/** A BIP 321 example read by the model; the verdict, and any callback, must be the ones the BIP gives. */
export function deriveBip321(f: Bip321UriFixture): DerivedBip321Fixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  if (!onLine(f.noteLine, f.note)) throw new Error(`${f.id}: note not on BIP 321 line ${f.noteLine}`);
  const r = readBitcoinUri(f.uri);
  if (r.valid !== (f.expect === "valid")) throw new Error(`${f.id}: the model reads it as ${r.valid ? "valid" : "invalid"}, BIP 321 as ${f.expect}`);
  const wallets: Bip321WalletView[] = WALLETS.map((w) => {
    const x = readBitcoinUri(f.uri, w.implemented);
    return { name: w.name, implemented: w.implemented, valid: x.valid, reason: x.reason, pays: x.instructions.map((i) => i.key), ignored: x.ignored };
  });
  let pop: DerivedBip321Fixture["derived"]["pop"] = null;
  if (f.group === "pop") {
    const rule = popRule(r);
    let opened: string | null = null;
    if (f.callback !== undefined) {
      if (!onLine(f.callbackLine!, f.callback)) throw new Error(`${f.id}: callback not on BIP 321 line ${f.callbackLine}`);
      opened = popCallback(r, f.paidWith!, f.callback.slice(f.callback.lastIndexOf("$")));
      if (opened !== f.callback) throw new Error(`${f.id}: the model opens ${opened}, BIP 321 ${f.callback}`);
    }
    if (f.rule !== undefined) {
      if (!onLine(f.ruleLine!, f.rule)) throw new Error(`${f.id}: rule not on BIP 321 line ${f.ruleLine}`);
      const forbidsPay = /MUST NOT make a payment/.test(f.rule);
      if (rule.mayPay === forbidsPay || rule.mayOpen) throw new Error(`${f.id}: the model's pop rule contradicts "${f.rule}"`);
    }
    pop = { ...rule, opened };
  }
  return {
    ...f,
    derived: {
      reading: { valid: r.valid, reason: r.reason, scheme: r.scheme, address: r.address, addressForm: r.addressForm, params: r.params, instructions: r.instructions },
      wallets,
      pop,
    },
  };
}
