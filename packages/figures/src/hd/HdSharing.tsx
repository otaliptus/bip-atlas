import { Arrow, Boundary, Computer, Drawing, KeyGlyph, Responsive, Value, idsFor, type DrawingIds } from "../kit";

const HOLDERS = [
  { who: "WEBSHOP SERVER", holds: "xpub of one account’s", holds2: "external chain", does: "a fresh address", does2: "for every order" },
  { who: "AUDITOR", holds: "every account’s xpub", holds2: "", does: "sees every", does2: "transaction" },
  { who: "BUSINESS PARTNER", holds: "xpub of one account’s", holds2: "external chain", does: "pays to a kind of", does2: "super address" },
] as const;

/**
 * hd-sharing.v1 — static, schematic (no values). BIP 32's own examples of
 * partial sharing: each party holds an extended public key (green), none
 * holds a key that can spend (pink stays with the owner).
 */
export function HdSharing() {
  const desc =
    `The wallet owner keeps the seed and the master private key. Across the line, three parties hold only extended public keys: ` +
    `a webshop server holds the xpub of one account's external chain and makes a fresh address for every order; ` +
    `an auditor holds every account's xpub and sees every transaction; a business partner holds the xpub of one account's external chain and uses it as a kind of super address. ` +
    `None of them holds a private key. If the webshop server is broken into, the attacker can at most see the incoming payments.`;
  const parts = (ids: DrawingIds, wide: boolean) => {
    const bx = wide ? 168 : 14;
    const rowY = (i: number) => (wide ? 22 + i * 64 : 152 + i * 92);
    const owner = wide ? [40, 64] : [26, 22];
    return (
      <>
        <Computer at={[owner[0], owner[1]]} label="wallet owner" />
        <KeyGlyph at={[owner[0] - 2, owner[1] + 52]} role="secret" />
        <Value at={[owner[0] + 34, owner[1] + 62]} text="seed, m" size={9} />
        <Value at={[owner[0] - 2, owner[1] + 80]} text="CAN SPEND" size={9} cls="k-value--label" />
        {wide ? <Boundary x={bx - 18} y1={8} y2={208} label="shared" /> : <line class="k-boundary__line" x1={8} y1={124} x2={322} y2={124} />}
        {wide ? HOLDERS.map((_, i) => <line class="k-leader" x1={owner[0] + 30} y1={owner[1] + 10} x2={bx - 4} y2={rowY(i) + 12} />) : null}
        {wide ? null : <Value at={[14, 140]} text="SHARED: XPUBS ONLY" size={9} cls="k-value--label" />}
        {HOLDERS.map((h, i) => {
          const y = rowY(i);
          const kx = wide ? bx : 14;
          const c: [number, number] = wide ? [bx + 196, y] : [62, y + 34];
          const t: [number, number] = wide ? [c[0] + 40, y + 10] : [104, y + 46];
          return (
            <g>
              <KeyGlyph at={[kx, y + 6]} role="public" />
              <Value at={[kx + 38, y + 10]} text={h.holds} size={9} />
              {h.holds2 ? <Value at={[kx + 38, y + 22]} text={h.holds2} size={9} /> : null}
              <Arrow d={wide ? `M${kx + 164} ${y + 12} H${c[0] - 6}` : `M${kx + 15} ${y + 22} V${y + 46} H${c[0] - 6}`} ids={ids} />
              <Computer at={c} label={h.who} />
              <Value at={t} text={h.does} size={9} cls="k-value--label" />
              <Value at={[t[0], t[1] + 12]} text={h.does2} size={9} cls="k-value--label" />
            </g>
          );
        })}
        <Value at={wide ? [bx, 222] : [14, 444]} text="NONE OF THEM HOLDS A KEY THAT CAN SPEND" size={9} cls="k-value--label" />
        <Value at={wide ? [bx, 236] : [14, 458]} text="SERVER BROKEN INTO: AT MOST SEES INCOMING PAYMENTS" size={9} cls="k-value--muted" />
      </>
    );
  };
  return (
    <Responsive
      wide={<Drawing id="a02-share-w" width={560} height={246} title="Sharing without spending" desc={desc}>{parts(idsFor("a02-share-w"), true)}</Drawing>}
      narrow={<Drawing id="a02-share-n" width={330} height={468} title="Sharing without spending" desc={desc}>{parts(idsFor("a02-share-n"), false)}</Drawing>}
    />
  );
}
