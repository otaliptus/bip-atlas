import { bip48Levels, bip48Path, bip67Multisig, firstDifference, multisigScript, p2shAddress, permutations } from "@bip-atlas/models";
import type { Bip48ExampleFixture, Bip67VectorFixture, DerivedBip48Fixture, DerivedBip67Fixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE4, checkSourceQuote, pinnedText } from "./sources";

const lineHas = (bip: string, line: number, value: string) => pinnedText(bip, SNAPSHOT_PHASE4).split("\n")[line - 1]?.includes(value);

/** A BIP 67 vector rebuilt by the model: sorted keys, script and address must equal the published ones on their lines. */
export function deriveBip67(f: Bip67VectorFixture): DerivedBip67Fixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  const file = "bip-0067.mediawiki";
  const published = [...f.list.map((k, i) => [k, f.lines.list[i]] as const), ...f.sorted.map((k, i) => [k, f.lines.sorted[i]] as const), [f.scriptHex, f.lines.script] as const, [f.address, f.lines.address] as const];
  for (const [value, line] of published) if (!lineHas(file, line, value)) throw new Error(`${f.id}: ${value.slice(0, 12)}… is not on BIP 67 line ${line}`);
  const r = bip67Multisig(f.m, f.list);
  if (r.sorted.join() !== f.sorted.join()) throw new Error(`${f.id}: sorted keys differ from the vector`);
  if (r.scriptHex !== f.scriptHex || r.address !== f.address) throw new Error(`${f.id}: script or address differs from the vector`);
  const letterOf = Object.fromEntries(f.list.map((k, i) => [k, String.fromCharCode(65 + i)]));
  const orders = f.list.length > 3 ? [] : permutations(f.list).map((keys) => {
    const scriptHex = multisigScript(f.m, keys);
    return { letters: keys.map((k) => letterOf[k]).join(""), keys, scriptHex, address: p2shAddress(scriptHex).address };
  });
  if (orders.length && new Set(orders.map((o) => o.address)).size !== orders.length) throw new Error(`${f.id}: two orders gave one address; update the prose`);
  return {
    ...f,
    derived: { letterOf, sorted: r.sorted, scriptHex: r.scriptHex, hash160Hex: r.hash160Hex, address: r.address, firstDifferences: r.sorted.slice(1).map((k, i) => firstDifference(r.sorted[i], k)), orders },
  };
}

/** A BIP 48 example row: the model's path for its columns must be the printed path. */
export function deriveBip48(f: Bip48ExampleFixture): DerivedBip48Fixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  const ord = { first: 0, second: 1 } as const;
  const p = { network: f.network, account: ord[f.account], script: f.script, change: f.chain === "external" ? 0 : 1, index: ord[f.address] } as const;
  const path = bip48Path(p);
  if (path !== f.path.replace(/\s/g, "")) throw new Error(`${f.id}: model path ${path} differs from BIP 48's ${f.path}`);
  return { ...f, derived: { levels: bip48Levels(p), path } };
}
