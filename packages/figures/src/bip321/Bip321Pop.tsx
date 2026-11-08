import { Storyboard, Value, type Frame } from "../kit";
import type { DerivedBip321Fixture } from "../types";

const wrap = (s: string, n: number) => s.match(new RegExp(`.{1,${n}}`, "g")) ?? [s];

/**
 * bip321-pop.v1 — static storyboard. BIP 321's proof-of-payment examples:
 * after paying, the wallet opens the decoded pop prefix plus the key it paid
 * with and the payment information; a callback that would open a web page is
 * never opened, and if it was required, the wallet does not pay at all.
 */
export function Bip321Pop({ fixtures }: { fixtures: DerivedBip321Fixture[] }) {
  const frames: Frame[] = fixtures.map((f) => {
    const p = f.derived.pop!;
    const outcome = p.opened ? `OPENS ${p.opened}` : !p.mayPay ? "DOES NOT PAY AT ALL" : "PAYS, BUT OPENS NOTHING";
    const note = p.opened
      ? `Paid ${f.paidWith === "lightning" ? "over Lightning" : "on-chain"}: it opens the prefix, “${f.paidWith}=”, then the payment information.`
      : !p.mayPay
        ? "A required callback to a web page: the wallet must not pay."
        : "A callback to a web page: pay as usual, but never open it.";
    return {
      note,
      desc: `The link ${f.uri}. Its pop value decodes to ${p.callback}. ${outcome}.`,
      draw: () => (
        <>
          {wrap(f.uri, 50).map((l, i) => <Value at={[14, 16 + i * 12]} text={l} size={8} />)}
          <Value at={[14, 52]} text={`POP PREFIX, DECODED: ${p.callback}`} size={8} cls="k-value--muted" />
          {wrap(outcome, 46).map((l, i) => <Value at={[14, 74 + i * 13]} text={l} size={8.5} cls={p.opened ? "k-value--ok" : p.mayPay ? "k-value--label" : "k-value--fail"} />)}
        </>
      ),
    };
  });
  return <Storyboard id="a21-pop" title="Proof of payment" width={300} height={104} frames={frames} />;
}
