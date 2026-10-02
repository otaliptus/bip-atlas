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
      note: "It downloads that one block and builds the filter itself, then the header from it and H2.",
      desc: "Schematic. The client downloads the block at the first disagreement, computes its filter, and from the filter hash and the agreed header H2 computes the third header itself.",
      draw: (ids) => (
        <>
          <Computer at={[14, 40]} label="client" />
          <rect class="k-outline k-fill--plain" x="60" y="40" width="40" height="28" />
          <Value at={[80, 58]} text="BLOCK" size={8} anchor="middle" cls="k-value--label" />
          <path class="k-line" d="M104 54 H124" marker-end={ids.arrow} />
          <Machine at={[160, 76]} w={56} d={30} h={24} label="build" role="hash" />
          <Value at={[240, 78]} text="FROM THE FILTER" size={8} cls="k-value--muted" />
          <Value at={[240, 89]} text="HASH AND H2" size={8} cls="k-value--muted" />
          <path class="k-line" d="M214 54 H234" marker-end={ids.arrow} />
          <rect class="k-cell k-fill--hash k-cell--em" x="240" y="45" width="40" height="18" />
          <text class="k-bf-gap" x="260" y="57" text-anchor="middle">H3</text>
        </>
      ),
    },
    {
      note: "Peer B's header does not match the block, so the client should ban it. One honest peer is enough.",
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
