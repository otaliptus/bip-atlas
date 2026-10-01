import type { DerivedV2FramingFixture } from "../types";

/** v1-v2-framing.v1 — static. Per-message overhead of v1 and v2 framing. */
export function V2Framing({ fixture }: { fixture: DerivedV2FramingFixture }) {
  const d = fixture.derived;
  const total = (xs: { bytes: number }[]) => xs.reduce((n, x) => n + x.bytes, 0);
  const row = (name: string, xs: { field: string; bytes: number }[], note: string) => (
    <section class="atlas-v2-frame" aria-label={`${name}: ${total(xs)} bytes besides the payload`}>
      <p class="atlas-v2-frame__head">{name}: {total(xs)} bytes besides the payload</p>
      <ol class="atlas-v2-frame__bar">
        {xs.map((x) => <li style={`flex-grow:${x.bytes}`}><span>{x.field}</span><small>{x.bytes} B</small></li>)}
      </ol>
      <p class="atlas-v2-frame__note">{note}</p>
    </section>
  );
  return (
    <div class="atlas-v2-framing">
      {row("v1", d.v1, "Sent in the clear. Every v1 message begins with the network’s 4 magic bytes, and every connection opens with the command “version”.")}
      {row("v2", d.v2, `Everything is encrypted or random-looking. A ${d.messageType} message uses the 1-byte ID ${d.shortId}; types without an ID take 13 bytes (0x00 and the 12-byte name).`)}
      <p class="atlas-lab__source">Field sizes from BIP 324’s packet and message structure; the ID for {d.messageType} read from its message-type table (line {fixture.source.line}).</p>
    </div>
  );
}
