import { Computer, Drawing, Value, idsFor } from "../kit";

/** Three network topologies; symbols are schematic, not invented wire bytes. */
export function V2Eavesdropper() {
  const ids = idsFor("a17-listening");
  const ends = (y: number) => <>
    <Computer at={[20, y]} label="node a" />
    <Computer at={[298, y]} label="node b" />
  </>;
  const eye = (y: number) => <g>
    <path class="k-outline k-fill--plain" d={`M154 ${y} Q172 ${y - 18} 190 ${y} Q172 ${y + 18} 154 ${y} Z`} />
    <circle class="k-outline k-fill--plain" cx="172" cy={y} r="5" />
  </g>;
  return <Drawing id="a17-listening" width={344} height={448}
    title="Listening is different from joining the conversation"
    desc="Schematic comparison. On v1, a passive listener reads the messages between node A and node B. On v2, the same listener cannot read the contents, though packet sizes and timing remain visible. An active attacker can instead establish one encrypted connection with each node. The session IDs A and B differ; comparing them through another channel can reveal the interception. v2 does not authenticate the peer.">
    <Value at={[20, 16]} text="V1 / READABLE ON THE WIRE" size={10} />
    {ends(40)}
    <path class="k-line" d="M50 51 H294" marker-end={ids.arrow} />
    <rect class="k-outline k-fill--net" x="83" y="38" width="178" height="26" rx="13" />
    <Value at={[172, 55]} text="version · tx · block" size={10} anchor="middle" />
    <path class="k-leader k-dashed" d="M172 66 V88" />
    {eye(102)}
    <Value at={[172, 128]} text="A LISTENER CAN READ THE MESSAGES" size={9} anchor="middle" />
    <line class="k-leader" x1="20" y1="147" x2="324" y2="147" />

    <Value at={[20, 171]} text="V2 / SAME PATH, ENCRYPTED CONTENTS" size={10} />
    {ends(195)}
    <path class="k-line" d="M50 206 H294" marker-end={ids.arrow} />
    <rect class="k-outline" x="83" y="193" width="178" height="26" rx="13" fill={ids.hatch} />
    <rect class="k-fill--plain" x="125" y="197" width="94" height="18" />
    <Value at={[172, 210]} text="encrypted" size={10} anchor="middle" />
    <path class="k-leader k-dashed" d="M172 221 V243" />
    {eye(257)}
    <Value at={[172, 283]} text="HIDDEN CONTENTS · VISIBLE SIZES & TIMING" size={9.5} anchor="middle" />
    <line class="k-leader" x1="20" y1="302" x2="324" y2="302" />

    <Value at={[20, 326]} text="V2 / THE ATTACKER JOINS IN" size={10} />
    {ends(352)}
    <Computer at={[159, 352]} label="attacker" />
    <path class="k-line" d="M50 363 H153 M191 363 H294" marker-end={ids.arrow} />
    <Value at={[101, 350]} text="SESSION A" size={9.5} anchor="middle" />
    <Value at={[243, 350]} text="SESSION B" size={9.5} anchor="middle" />
    <Value at={[172, 413]} text="A ≠ B" size={15} anchor="middle" />
    <Value at={[172, 434]} text="COMPARE IDs THROUGH ANOTHER CHANNEL" size={9} anchor="middle" />
  </Drawing>;
}
