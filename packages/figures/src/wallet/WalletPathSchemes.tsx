import { COS30, Drawing, IsoBox, Value, iso, onTop } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;
const PW = 56, PD = 34, PH = 5, GAP = 15, COL = 112;

/** What each BIP fixes beyond the path (words from the BIPs; addresses from the vectors). */
const SAYS: Record<number, { script: string; keys: string; keysNote: string }> = {
  44: { script: "NO SCRIPT NAMED", keys: "—", keysNote: "NOT ADDRESSED" },
  84: { script: "P2WPKH", keys: "zpub / zprv", keysNote: "NEW BYTES" },
  86: { script: "P2TR KEY PATH", keys: "xpub / xprv", keysNote: "NONE NEW" },
};

/**
 * wallet-path-schemes.v1 — static. The same five-level tower under three
 * purposes. Only the top plate (the purpose) and what comes out at the
 * bottom differ; the first receiving key under each purpose is unrelated to
 * the others, though all come from one mnemonic.
 */
export function WalletPathSchemes({ fixtures }: { fixtures: DerivedWalletPathFixture[] }) {
  const cols = [...fixtures].sort((a, b) => a.derived.scheme - b.derived.scheme);
  const firsts = cols.map((f) => f.derived.addresses[0]);
  if (new Set(firsts.map((a) => a.publicKeyHex)).size !== firsts.length) throw new Error("the three purposes should give unrelated keys");
  const desc = cols
    .map((f, i) => {
      const a = firsts[i];
      const o = a.output;
      return `Purpose ${f.derived.scheme}′: the same five levels, first receiving path ${a.path}, key ${a.publicKeyHex}; ${o ? `${SAYS[f.derived.scheme].script} output, address ${o.address}` : "BIP 44 names no script type and no address format"}; extended-key version bytes: ${SAYS[f.derived.scheme].keys} (${SAYS[f.derived.scheme].keysNote.toLowerCase()})${f.derived.scheme === 44 ? "; BIP 44 publishes no keys, so its key is computed from BIP 84's test mnemonic" : ""}.`;
    })
    .join(" ");
  const towerH = 4 * GAP + (PW + PD) / 2 + PH;
  return (
    <>
      <Drawing id="a12-schemes" width={344} height={towerH + 150} title="Same shape, three purposes" desc={desc}>
        {cols.map((f, c) => {
          const a = firsts[c];
          const o = a.output;
          const ox = 8 + c * COL + PD * COS30;
          const x = 8 + c * COL;
          const levels = a.nodes.slice(1);
          const by = towerH + 18;
          return (
            <g data-scheme={f.derived.scheme}>
              {[...levels].map((n, k) => ({ n, k })).reverse().map(({ n, k }) => {
                const P = iso(ox, 12 + PH + k * GAP);
                const top = k === 0;
                return (
                  <g>
                    <IsoBox at={[ox, 12 + PH + k * GAP]} w={PW} d={PD} h={PH} role={n.hardened ? "plain" : "public"} cls={top ? "k-iso--em" : ""} />
                    {top ? <text class="k-engrave k-engrave--big" transform={onTop(P(10, PD - 10, PH))}>{`${n.index}′`}</text> : null}
                    {n.hardened ? <rect class="k-outline k-mark--plain" transform={onTop(P(PW - 16, PD - 10, PH))} width="8" height="4" /> : null}
                  </g>
                );
              })}
              <Value at={[x, by]} text={`BIP ${f.derived.scheme}`} size={9.5} cls="k-value--label" />
              <Value at={[x, by + 15]} text={SAYS[f.derived.scheme].script} size={9} cls="k-value--label" />
              <Value at={[x, by + 30]} text={o ? short(o.address, 9) : "no address"} size={9} cls={o ? "" : "k-value--muted"} />
              <Value at={[x, by + 45]} text={SAYS[f.derived.scheme].keys} size={9} />
              <Value at={[x, by + 57]} text={SAYS[f.derived.scheme].keysNote} size={9} cls="k-value--muted" />
              <Value at={[x, by + 76]} text={`key ${short(a.publicKeyHex, 6)}${f.derived.scheme === 44 ? " *" : ""}`} size={9} />
            </g>
          );
        })}
        <Value at={[8, towerH + 116]} text="SAME LEVELS AND INDICES; EVERY KEY BELOW THE" size={9} cls="k-value--muted" />
        <Value at={[8, towerH + 128]} text="PURPOSE DIFFERS. * BIP 44 PUBLISHES NO KEYS:" size={9} cls="k-value--muted" />
        <Value at={[8, towerH + 140]} text="COMPUTED FROM BIP 84'S TEST MNEMONIC" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values: first receiving key and address under each purpose</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {cols.map((f, i) => (
            <>
              <dt>{firsts[i].path}</dt>
              <dd><code class="atlas-break">{firsts[i].publicKeyHex}</code>{firsts[i].output ? <><br /><code class="atlas-break">{firsts[i].output!.address}</code></> : null}</dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
