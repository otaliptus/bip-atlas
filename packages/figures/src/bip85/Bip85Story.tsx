import { Arrow, Bracket, Cells, IsoBox, KeyGlyph, Storyboard, Value, short, type Frame } from "../kit";
import type { DerivedBip85Fixture } from "../types";

/**
 * bip85-story.v1 — static storyboard. One published BIP 39 vector from root
 * key to words: hardened derivation to k, HMAC-SHA512 to 64 bytes, the bytes
 * kept, and the mnemonic. Values recomputed by the tested model.
 */
export function Bip85Story({ fixture: f }: { fixture: DerivedBip85Fixture }) {
  const d = f.derived;
  if (d.outputKind !== "words") throw new Error("bip85-story: needs a BIP 39 vector");
  const kept = d.uses[0].to;
  const words = d.output.split(" ");
  const bytes = d.entropyHex.match(/../g)!;
  const grid = (filled: (i: number) => boolean) => <Cells x={14} y={40} values={bytes} size={16.5} perRow={16} rowGap={3} text={false} roleOf={(i) => (filled(i) ? "secret" : "plain")} />;
  const frames: Frame[] = [
    {
      note: "Start from the root key: the one backup.",
      desc: `The published BIP 32 root key, ${f.rootXprv}.`,
      draw: () => (
        <>
          <IsoBox at={[60, 34]} w={52} d={34} h={22} role="secret" />
          <Value at={[134, 40]} text="ROOT KEY" size={9} cls="k-value--label" />
          <Value at={[134, 54]} text={short(f.rootXprv, 16)} size={9} />
        </>
      ),
    },
    {
      note: `Derive along ${f.path}, hardened at every level, to the child key k.`,
      desc: `Hardened derivation along ${f.path} gives the 32-byte private key k = ${d.derivedKeyHex}.`,
      draw: (ids) => (
        <>
          {d.levels.map((l, i) => (
            <g>
              <rect class="k-cell k-fill--secret" x={14 + i * 54} y={18} width={50} height={20} />
              <Value at={[39 + i * 54, 32]} text={l.value} size={l.value.length > 7 ? 7.5 : 9} anchor="middle" />
            </g>
          ))}
          <Arrow d="M150 42 V60" ids={ids} />
          <KeyGlyph at={[136, 66]} role="secret" label="k" />
          <Value at={[180, 76]} text={short(d.derivedKeyHex, 12)} size={9} />
        </>
      ),
    },
    {
      note: "HMAC-SHA512, keyed with the text bip-entropy-from-k, turns k into 64 bytes.",
      desc: `HMAC-SHA512 with the key bip-entropy-from-k and the message k gives 64 bytes: ${d.entropyHex}.`,
      draw: () => (
        <>
          <Value at={[14, 26]} text="HMAC-SHA512(KEY “bip-entropy-from-k”, k)" size={8.5} cls="k-value--label" />
          {grid(() => true)}
        </>
      ),
    },
    {
      note: `Keep the first ${kept} bytes, ${kept * 8} bits, and drop the other ${64 - kept}.`,
      desc: `The first ${kept} bytes are kept: ${d.entropyHex.slice(0, kept * 2)}. The remaining ${64 - kept} bytes are not used.`,
      draw: () => (
        <>
          {grid((i) => i < kept)}
          <Bracket x1={14} x2={14 + Math.min(kept, 16) * 16.5} y={36} text={`${kept} bytes kept`} below={false} align="start" />
        </>
      ),
    },
    {
      note: `BIP 39 turns those ${kept * 8} bits into ${words.length} words: ${words.slice(0, 3).join(" ")} …`,
      desc: `BIP 39 encodes the ${kept * 8} kept bits as ${words.length} words: ${d.output}.`,
      draw: () => (
        <>
          {words.map((w, i) => (
            <Value at={[14 + (i % 3) * 94, 24 + Math.floor(i / 3) * 16]} text={`${String(i + 1).padStart(2, "0")} ${w}`} size={9} />
          ))}
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a19-story" title="From root key to twelve words" width={300} height={124} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>k</dt><dd><code class="atlas-break">{d.derivedKeyHex}</code></dd>
          <dt>All 64 bytes</dt><dd><code class="atlas-break">{d.entropyHex}</code></dd>
          <dt>The {kept} bytes kept</dt><dd><code class="atlas-break">{d.entropyHex.slice(0, kept * 2)}</code></dd>
        </dl>
      </details>
    </>
  );
}
