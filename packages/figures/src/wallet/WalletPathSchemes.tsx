import { Drawing, Value, idsFor } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

const SAYS: Record<number, { script: string; keys: string }> = {
  44: { script: "SCRIPT NOT SPECIFIED", keys: "version bytes not specified" },
  84: { script: "P2WPKH", keys: "zpub / zprv" },
  86: { script: "P2TR KEY PATH", keys: "xpub / xprv" },
};

/** Paths are routes to different keys, not three copies of the same stack of levels. */
export function WalletPathSchemes({ fixtures }: { fixtures: DerivedWalletPathFixture[] }) {
  const cols = [...fixtures].sort((a, b) => a.derived.scheme - b.derived.scheme);
  const firsts = cols.map((f) => f.derived.addresses[0]);
  if (new Set(firsts.map((a) => a.publicKeyHex)).size !== firsts.length) throw new Error("purposes must derive different keys");
  const ids = idsFor("a12-schemes");
  const desc = cols.map((f, i) => `${firsts[i].path} gives public key ${firsts[i].publicKeyHex}. ${firsts[i].output ? `${SAYS[f.derived.scheme].script}, address ${firsts[i].output!.address}.` : "BIP 44 does not specify an output script; this key is computed from BIP 84's public test mnemonic."}`).join(" ");
  return <>
    <Drawing id="a12-schemes" width={344} height={cols.length * 106 + 54} title="One seed, three different destinations" desc={desc}>
      <Value at={[14, 16]} text="SAME TEST SEED · DIFFERENT HARDENED PURPOSES" size={8.5} cls="k-value--label" />
      <path class="k-leader" d={`M20 33 V${34 + (cols.length - 1) * 106}`} />
      {cols.map((f, i) => {
        const a = firsts[i], y = 35 + i * 106;
        return <g data-scheme={f.derived.scheme}>
          <path class="k-line" d={`M20 ${y} H42`} marker-end={ids.arrow} />
          <Value at={[52, y + 3]} text={a.path.replaceAll("h", "′").replaceAll("H", "′")} size={11} />
          <path class="k-leader" d={`M64 ${y + 12} V${y + 22}`} />
          <rect class="k-outline k-fill--public" x="52" y={y + 25} width="278" height="50" />
          <Value at={[64, y + 42]} text={SAYS[f.derived.scheme].script} size={10} cls="k-value--label" />
          <Value at={[64, y + 59]} text={`key ${a.publicKeyHex.slice(0, 6)}…`} size={9} />
          <Value at={[318, y + 59]} text={a.output ? `${a.output.address.slice(0, 13)}…` : "output chosen separately"} size={8} anchor="end" />
          <Value at={[52, y + 90]} text={SAYS[f.derived.scheme].keys} size={8.5} cls="k-value--muted" />
        </g>;
      })}
      <Value at={[14, cols.length * 106 + 44]} text="BIP 44 KEY: COMPUTED FROM BIP 84'S TEST MNEMONIC" size={7.7} cls="k-value--muted" />
    </Drawing>
    <details class="atlas-disclosure"><summary>Exact first receiving keys and addresses</summary><dl class="atlas-hexlist">
      {firsts.map((a) => <><dt>{a.path}</dt><dd><code class="atlas-break">{a.publicKeyHex}</code>{a.output && <><br /><code class="atlas-break">{a.output.address}</code></>}</dd></>)}
    </dl></details>
  </>;
}
