import { Computer, Machine, Storyboard, Value, type DrawingIds, type Frame } from "../kit";

/**
 * bf-peer-check.v1 — static storyboard, schematic (no values). BIP 157's
 * recommended client behaviour when two peers disagree about filter
 * headers: find the first header that differs, build that block's filter
 * yourself, and ban the peer whose header does not match.
 */
export function BfPeerStory() {
  const chain = (ids: DrawingIds, x: number, y: number, name: string, bad: boolean, banned = false) => (
    <g data-peer={name}>
      <Value at={[x, y + 12]} text={name} size={8.5} cls="k-value--label" />
      {[1, 2, 3, 4].map((k) => {
        const off = bad && k >= 3;
        return (
          <g>
            <rect class={`k-cell ${off ? "k-fill--plain k-dashed" : "k-fill--hash"}`} x={x + 44 + (k - 1) * 40} y={y} width={32} height={18} />
            <text class="k-bf-gap" x={x + 60 + (k - 1) * 40} y={y + 12} text-anchor="middle">{off ? `H${k}′` : `H${k}`}</text>
            {k > 1 ? <path class="k-leader" d={`M${x + 36 + (k - 1) * 40} ${y + 9} h8`} marker-end={ids.arrow} /> : null}
          </g>
        );
      })}
      {banned ? <path class="k-bf-ban" d={`M${x - 2} ${y - 3} L${x + 206} ${y + 21}`} /> : null}
    </g>
  );
  const frames: Frame[] = [
    {
      note: "The client asks several peers for filter headers. Two agree up to H2 and differ from H3 on.",
      desc: "Schematic. Peer A sends filter headers H1 to H4; peer B sends H1, H2, then different headers H3′ and H4′. The first disagreement is at the third header.",
      draw: (ids) => (
        <>
          {chain(ids, 14, 24, "PEER A", false)}
          {chain(ids, 14, 62, "PEER B", true)}
          <path class="k-bf-target" d="M138 96 V86 M134 91 L138 85 L142 91" />
          <Value at={[138, 110]} text="FIRST DIFFERENCE" size={8.5} anchor="middle" cls="k-value--label" />
        </>
      ),
    },
    {
      note: "It downloads that block, gets the scripts its inputs spend, and builds the filter and the header from H2 itself.",
      desc: "Schematic. The client downloads the block at the first disagreement and obtains the scripts its inputs spend, which the block does not contain; it computes the filter, and from the filter hash and the agreed header H2 the third header.",
      draw: (ids) => (
        <>
          <Computer at={[14, 40]} label="client" />
          <rect class="k-outline k-fill--plain" x="56" y="20" width="58" height="22" />
          <Value at={[85, 35]} text="BLOCK" size={8.5} anchor="middle" cls="k-value--label" />
          <rect class="k-outline k-fill--plain k-dashed" x="56" y="50" width="58" height="22" />
          <Value at={[85, 65]} text="SPENT" size={8.5} anchor="middle" cls="k-value--label" />
          <Value at={[56, 86]} text="SCRIPTS: NOT IN THE BLOCK" size={8} cls="k-value--muted" />
          <path class="k-line" d="M116 31 H140 V46 H150" marker-end={ids.arrow} />
          <path class="k-line" d="M116 61 H140 V50 H150" />
          <Machine at={[180, 74]} w={52} d={28} h={22} label="filter" role="hash" />
          <path class="k-line" d="M226 54 H236" marker-end={ids.arrow} />
          <Value at={[280, 80]} text="+ H2" size={8.5} anchor="end" cls="k-value--muted" />
          <rect class="k-cell k-fill--hash k-cell--em" x="240" y="45" width="40" height="18" />
          <text class="k-bf-gap" x="260" y="57" text-anchor="middle">H3</text>
        </>
      ),
    },
    {
      note: "Peer B's header does not match the block, so the client should ban it. With one honest peer, the authors argue, it can find the right filters.",
      desc: "Schematic. The client's own third header equals peer A's H3 and not peer B's H3′, so it bans peer B. With at least one honest peer the client can identify the correct filters.",
      draw: (ids) => (
        <>
          {chain(ids, 14, 24, "PEER A", false)}
          {chain(ids, 14, 62, "PEER B", true, true)}
          <Value at={[14, 106]} text="BANNED: THE PEER THAT DISAGREED WITH THE BLOCK" size={8.5} cls="k-value--label" />
        </>
      ),
    },
  ];
  return <Storyboard id="a16-peers" title="When peers disagree" width={300} height={118} frames={frames} />;
}
