import { Cells, Drawing, Value, idsFor } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { group } from "./parts";

/** A request loop: common filter in, private query inside, observable block request out. */
export function BfDirections({ fixture }: { fixture: DerivedBfBlockFixture }) {
  const d = fixture.derived, ids = idsFor("a16-dir");
  const cell = Math.min(8, 280 / d.filterBytes);
  return <Drawing id="a16-dir" width={344} height={383} title="Search locally, download selectively"
    desc={`A full node publishes the same filter to every client. Shown is the published filter of testnet block ${group(d.height)}, ${d.filterBytes} bytes. The wallet tests watched scripts locally. A match may be a false positive, so it requests the block and checks it; a miss rules out only scripts in a correctly built filter's included set. Watched scripts are not sent with the filter request, but a peer serving a requested block can observe that request. Network layout is schematic.`}>
    <Value at={[14, 16]} text="PUBLIC · THE SAME FILTER FOR EVERYONE" size={9} cls="k-value--label" />
    <path class="k-outline k-fill--plain" d="M18 31 H53 L65 43 V93 H18 Z M53 31 V43 H65" />
    <Value at={[42, 67]} text="BLOCK" size={8} anchor="middle" />
    <path class="k-line" d="M73 62 H112" marker-end={ids.arrow} />
    <rect class="k-outline k-fill--net" x="122" y="37" width="201" height="52" />
    <Value at={[134, 55]} text="COMPACT FILTER" size={10} cls="k-value--label" />
    <Value at={[134, 75]} text={`${d.N} included scripts · ${d.filterBytes} bytes`} size={9} />
    <path class="k-line" d="M222 95 V133" marker-end={ids.arrow} />
    <Value at={[14, 119]} text="DOWNLOAD THE FILTER" size={8} cls="k-value--muted" />
    <rect class="k-outline k-fill--plain k-cell--em" x="14" y="143" width="316" height="139" rx="3" />
    <Value at={[27, 162]} text="INSIDE YOUR WALLET" size={9} cls="k-value--label" />
    <Cells x={27} y={174} values={Array(d.filterBytes).fill("")} size={cell} roleOf={() => "net"} text={false} />
    <Value at={[27, 196]} text={`FILTER OF BLOCK ${group(d.height)} · ${d.filterBytes} B`} size={8.3} />
    {/* Watched scripts stay private in the wallet: neutral and dashed, not the public green. */}
    <rect class="k-cell k-fill--plain k-dashed" x="27" y="211" width="131" height="23" data-watched="local" />
    <Value at={[92, 226]} text="YOUR WATCHED SCRIPTS" size={8} anchor="middle" />
    <path class="k-line" d="M163 222 H188" marker-end={ids.arrow} />
    <Value at={[199, 219]} text="TEST LOCALLY" size={9} cls="k-value--label" />
    <Value at={[199, 233]} text="no address list sent" size={8} cls="k-value--muted" />
    <path class="k-leader" d="M226 243 V260" />
    <path class="k-leader" d="M226 260 H84 V297" marker-end={ids.arrow} />
    <path class="k-leader" d="M226 260 H264 V297" marker-end={ids.arrow} />
    <rect class="k-outline k-fill--plain" x="14" y="302" width="140" height="44" />
    <Value at={[84, 320]} text="NO MATCH" size={10} anchor="middle" />
    <Value at={[84, 335]} text="skip this block*" size={8} anchor="middle" />
    <rect class="k-outline k-fill--net" x="174" y="302" width="156" height="44" />
    <Value at={[252, 320]} text="MAYBE A MATCH" size={10} anchor="middle" />
    <Value at={[252, 335]} text="fetch the block and check" size={8} anchor="middle" />
    <Value at={[14, 364]} text="*FOR INCLUDED SCRIPTS, GIVEN THE CORRECT FILTER" size={7.6} cls="k-value--muted" />
    <Value at={[14, 378]} text="A BLOCK REQUEST IS STILL VISIBLE TO ITS PEER" size={8} cls="k-value--label" />
  </Drawing>;
}
