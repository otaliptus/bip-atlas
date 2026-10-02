import { Boundary, Cells, Computer, Storyboard, Value, type DrawingIds, type Frame } from "../kit";

/**
 * v2-eavesdropper.v1 — static storyboard, schematic (no values). Two nodes
 * across an open network and someone listening. v1: everything readable.
 * v2: random-looking bytes. To read v2 traffic the listener has to sit in
 * the middle, which gives each end a different session ID.
 */
export function V2Eavesdropper() {
  const scene = (ids: DrawingIds, wire: "v1" | "v2" | "mitm") => (
    <>
      <Computer at={[8, 26]} label="node a" />
      <Computer at={[266, 26]} label="node b" />
      <Boundary x={52} y1={6} y2={112} label="open network" />
      <Boundary x={256} y1={6} y2={112} label="" />
      {wire === "mitm" ? (
        <>
          <Computer at={[141, 22]} label="attacker" />
          <path class="k-line" d="M38 38 H137" marker-end={ids.arrow} />
          <path class="k-line" d="M171 38 H262" marker-end={ids.arrow} />
          <Value at={[8, 78]} text="SESSION" size={8.5} cls="k-value--label" />
          <Value at={[8, 90]} text="ID A" size={8.5} cls="k-value--label" />
          <Value at={[292, 78]} text="SESSION" size={8.5} anchor="end" cls="k-value--label" />
          <Value at={[292, 90]} text="ID B" size={8.5} anchor="end" cls="k-value--label" />
          <Value at={[154, 92]} text="A ≠ B" size={10} anchor="middle" cls="k-value--label" />
          <Value at={[154, 106]} text="COMPARED OUT OF BAND" size={8.5} anchor="middle" cls="k-value--muted" />
        </>
      ) : (
        <>
          <path class="k-line" d="M38 38 H262" marker-end={ids.arrow} />
          {wire === "v1" ? (
            <>
              <rect class="k-cell k-fill--plain" x="96" y="27" width="108" height="16" />
              <text class="k-v2-t" x="100" y="38.5">MAGIC · "version"</text>
            </>
          ) : (
            <Cells x={96} y={29} values={Array(9).fill("")} size={12} roleOf={() => "net"} text={false} />
          )}
          <line class="k-leader k-dashed" x1="150" y1="44" x2="150" y2="68" />
          <Computer at={[137, 70]} />
          {wire === "v2" ? <Value at={[176, 106]} text="TIMING STILL SHOW" size={8.5} cls="k-value--label" /> : null}
          <Value at={[176, 82]} text={wire === "v1" ? "READS IT ALL" : "RANDOM-LOOKING"} size={8.5} cls="k-value--label" />
          <Value at={[176, 94]} text={wire === "v1" ? "AND WHEN" : "BYTES; SIZES AND"} size={8.5} cls="k-value--label" />
        </>
      )}
    </>
  );
  const frames: Frame[] = [
    {
      note: "v1: anyone on the path can read every message, and the fixed magic bytes give the connection away.",
      desc: "Schematic. Node A sends node B a v1 message across an open network; it starts with the network magic and the command, in the clear. A listener on the path reads every message and when it was sent.",
      draw: (ids) => scene(ids, "v1"),
    },
    {
      note: "v2: the same listener sees bytes that look random. Passive reading no longer works, though sizes and timing still show.",
      desc: "Schematic. The same path carries v2 traffic: every byte looks random to the listener, who learns no message contents, though packet sizes and timing remain visible.",
      draw: (ids) => scene(ids, "v2"),
    },
    {
      note: "To read, the attacker must sit in the middle for the whole connection. Each end then has a different session ID.",
      desc: "Schematic. An active attacker between the nodes runs one v2 session with each. Node A's session ID differs from node B's; operators who compare them out of band can notice. Nothing in v2 itself authenticates the peer.",
      draw: (ids) => scene(ids, "mitm"),
    },
  ];
  return <Storyboard id="a17-eve" title="Passive and active listeners" width={300} height={116} frames={frames} />;
}
