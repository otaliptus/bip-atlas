import { Drawing, KeyGlyph, Value } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;

/**
 * wallet-xpub-reach.v1 — static. One account's extended public key and the
 * two public levels below it: every published receiving and change address
 * of the account, re-derived at build time from the xpub alone (derive.ts
 * throws if one does not match).
 */
export function WalletXpubReach({ fixture }: { fixture: DerivedWalletPathFixture }) {
  const d = fixture.derived;
  if (!d.addresses.every((a) => a.fromXpubMatches && a.output)) throw new Error(`${fixture.id}: every address must have an output re-derived from the account xpub`);
  const chains = [0, 1].map((c) => ({ change: c, addrs: d.addresses.filter((a) => a.change === c) }));
  const lineOf = (a: (typeof d.addresses)[number]) => a.checkedLines[a.checkedLines.length - 1];
  // Each chain: a header row, then one row per published address, 22 apart.
  let y = 82;
  const layout = chains.map((ch) => {
    const top = y;
    const ys = ch.addrs.map((_, i) => top + 22 * (i + 1));
    y = top + 22 * ch.addrs.length + 56;
    return { ...ch, top, ys };
  });
  const H = y - 4;
  const desc =
    `The account extended public key of ${d.accountPath} (${d.accountXpub}) and the two public levels below it. ` +
    layout.map((ch) => `Chain ${ch.change} (${ch.change === 0 ? "receiving" : "change"}): ${ch.addrs.map((a) => `index ${a.index}, ${a.output!.address}, re-derived from the xpub alone and equal to BIP ${d.scheme} line ${lineOf(a)}`).join("; ")}, and every later index.`).join(" ") +
    ` The xpub reveals all of them but cannot spend.`;
  return (
    <>
      <Drawing id="a12-reach" width={344} height={H} title="What one account xpub reaches" desc={desc}>
        <KeyGlyph at={[14, 14]} role="public" />
        <Value at={[52, 20]} text={`ACCOUNT XPUB${d.scheme === 84 ? " (ZPUB)" : ""} · ${d.accountPath.replace(/'/g, "′")}`} size={9} cls="k-value--label" />
        <Value at={[52, 33]} text={short(d.accountXpub, 16)} size={9.5} />
        <Value at={[52, 46]} text={d.accountXpubPublished ? `PUBLISHED, BIP ${d.scheme} LINE ${fixture.account.pubLine}` : "COMPUTED"} size={9} cls="k-value--muted" />
        <line class="k-line" x1="29" y1="30" x2="29" y2={layout[1].top} />
        {layout.map((ch) => (
          <g>
            <line class="k-line" x1="29" y1={ch.top} x2="44" y2={ch.top} />
            <rect class="k-cell k-fill--public" x="44" y={ch.top - 9} width="18" height="18" />
            <Value at={[53, ch.top + 4]} text={String(ch.change)} anchor="middle" size={10} />
            <Value at={[70, ch.top + 4]} text={ch.change === 0 ? "EXTERNAL · RECEIVING" : "INTERNAL · CHANGE"} size={9} cls="k-value--label" />
            {ch.addrs.map((a, i) => (
              <g>
                <path class="k-line" d={`M53 ${ch.top + 9} V${ch.ys[i]} H76`} />
                <rect class="k-cell k-fill--public" x="76" y={ch.ys[i] - 8} width="16" height="16" />
                <Value at={[84, ch.ys[i] + 4]} text={String(a.index)} anchor="middle" size={9.5} />
                <Value at={[100, ch.ys[i] + 4]} text={short(a.output!.address, 16)} size={9.5} />
                <Value at={[330, ch.ys[i] + 4]} text={`= LINE ${lineOf(a)}`} anchor="end" size={9} cls="k-value--label" />
              </g>
            ))}
            <Value at={[100, ch.ys[ch.ys.length - 1] + 22]} text="… AND EVERY LATER INDEX" size={9} cls="k-value--muted" />
          </g>
        ))}
        <Value at={[14, H - 12]} text="ALL RE-DERIVED FROM THE XPUB ALONE · IT CANNOT SPEND" size={9} cls="k-value--label" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Account extended public key</dt><dd><code class="atlas-break">{d.accountXpub}</code></dd>
          {d.addresses.map((a) => <><dt>{a.path}</dt><dd><code class="atlas-break">{a.output!.address}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
