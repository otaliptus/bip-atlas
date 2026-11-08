import { checkSpec, type HeroSpec } from "../heroStates";
import { Arrow, Drawing, IsoBox, KeyGlyph, Machine, Responsive, Value, idsFor, short } from "../kit";
import type { DerivedBip85Fixture } from "../types";
import { ByteBar, OUTPUT_NAME, PathRibbon, byteBarHeight, outputLines, usesText } from "./parts";

export interface Bip85HeroState { id: string }

interface Props {
  fixtures: DerivedBip85Fixture[];
  figureId: string;
  /** The application to draw; the first one by default (also the no-JS state). */
  initial?: Bip85HeroState;
}

/** One state per application; the leak toggle shows a layer every state draws. */
export function bip85HeroSpec(fixtures: DerivedBip85Fixture[]): HeroSpec<Bip85HeroState> {
  return checkSpec({
    controls: [
      { kind: "strip", name: "app", label: "Application", options: fixtures.map((f, i) => ({ value: `a${i}`, text: f.shortLabel ?? f.label })) },
      { kind: "toggle", name: "leak", label: "Show what one leaked output reveals", options: [] },
    ],
    states: fixtures.map((f, i) => ({ id: `a${i}`, keys: [`a${i}`], state: { id: f.id } })),
    initialKey: "a0",
    noJsId: "a0",
    staticNote: `Static view: ${fixtures[0].label}, with what a leaked output reveals. With JavaScript you can choose among ${fixtures.length} applications.`,
  });
}

const LEAK = [
  "IF THIS OUTPUT LEAKS:",
  "k STAYS UNKNOWN (HMAC IS ONE-WAY)",
  "THE ROOT STAYS UNKNOWN: IT WOULD NEED k,",
  "AND k WOULD NOT GIVE IT (HARDENED)",
  "OTHER PATHS' OUTPUTS STAY UNRELATED",
];

/**
 * bip85-applications.v1 — the Derived seeds chapter's hero (drawing-first).
 *
 * One published root key, a fully hardened path that names the application,
 * the child key k, HMAC-SHA512 keyed with "bip-entropy-from-k", the 64 bytes
 * it returns and the part each application reads, and the output BIP 85's
 * vector prints. Every value was recomputed by the tested model at build
 * time (the vectors print the outputs, not k); the toggle hatches what
 * someone holding only the output cannot know.
 */
export function Bip85Applications({ fixtures, figureId, initial }: Props) {
  const f = fixtures.find((x) => x.id === (initial?.id ?? fixtures[0].id));
  if (!f) throw new Error(`bip85-applications: no fixture ${initial?.id}`);
  const d = f.derived;
  const uses = usesText(f);
  const read = d.uses.map((u) => (u.from === 0 && u.to === 64 ? `all 64 bytes: ${u.as}` : `bytes ${u.from + 1}–${u.to}: ${u.as}`)).join("; ");
  const status = `${f.label}: ${f.path} gives k, HMAC-SHA512 gives 64 bytes, and the application reads ${read}. Output: ${d.outputKind === "words" ? d.output.split(" ").slice(0, 3).join(" ") + " …" : short(d.output, 16)}`;
  const desc =
    `Published root key ${short(f.rootXprv, 12)}. Path ${f.path}, every level hardened: ${d.levels.map((l) => `${l.value} ${l.meaning}`).join(", ")}. ` +
    `Hardened derivation gives the private key k = ${d.derivedKeyHex}. HMAC-SHA512 keyed with bip-entropy-from-k turns k into 64 bytes, ${d.entropyHex}. ` +
    `The application reads ${read}. The ${OUTPUT_NAME[d.outputKind]} is ${d.output}. If this output leaks, k stays unknown because HMAC-SHA512 is one-way; the root stays unknown because finding it would need k, and even k would not give it, as every level is hardened; and other paths' outputs stay unrelated. The hatching covers what someone holding only the output cannot know: the root, k and the bytes the application does not read.`;

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${wide ? "w" : "n"}`;
    const ids = idsFor(fid);
    const x0 = wide ? 20 : 14;
    const hatch = { fill: ids.hatch };
    // Root key, then the path.
    const ribbonX = wide ? 112 : x0;
    const ribbonY = wide ? 34 : 82;
    const cellW = wide ? Math.min(84, Math.floor((W - ribbonX - 20 - 16) / d.levels.length) - 4) : Math.floor((W - 2 * x0 - 16) / d.levels.length) - 4;
    // Key derivation row: hardened CKD, k, HMAC.
    const rowY = wide ? 118 : 160;
    const ckdX = wide ? 150 : x0 + 30;
    const kX = wide ? 230 : x0 + 112;
    const hmacX = wide ? 352 : x0 + 30;
    const hmacY = wide ? rowY : rowY + 92;
    // The 64 bytes.
    const size = wide ? 9 : 17;
    const perRow = wide ? 64 : 16;
    const barY = wide ? 196 : hmacY + 74;
    const barH = byteBarHeight(size, perRow);
    const usesY = barY + barH + 16;
    const outY = usesY + uses.length * 13 + 12;
    const lines = outputLines(f, W - 2 * x0 - 16);
    const outH = 24 + lines.length * 14;
    // Wide: the leak notes sit right of the HMAC box, so hiding them leaves no gap; narrow: below the output.
    const leak = wide ? { x: 450, y: 140 } : { x: x0, y: outY + outH + 18 };
    const H = wide ? outY + outH + 8 : leak.y + LEAK.length * 12 + 6;
    const unread = Array.from({ length: 64 }, (_, i) => i).filter((i) => !d.uses.some((u) => i >= u.from && i < u.to));
    return (
      <Drawing id={fid} width={W} height={H} title="One root, a separate output for each application" desc={desc}>
        <Value at={[x0, 14]} text={`PUBLIC TEST VECTOR · ${f.label.toUpperCase()}`} size={8.5} cls="k-value--label" />
        {/* Root key */}
        <IsoBox at={[x0 + 26, 40]} w={40} d={26} h={18} role="secret" />
        <rect class="k-leak" x={x0 + 2} y={20} width={64} height={52} style={hatch} />
        {wide ? (
          <>
            <Value at={[x0, 90]} text="ROOT KEY" size={8.5} cls="k-value--label" />
            <Value at={[x0, 102]} text={short(f.rootXprv, 11)} size={8.5} />
            <rect class="k-leak" x={x0 - 2} y={93} width={74} height={13} style={hatch} />
          </>
        ) : (
          <>
            <Value at={[x0 + 78, 40]} text="ROOT KEY · THE ONE BACKUP" size={8.5} cls="k-value--label" />
            <Value at={[x0 + 78, 54]} text={short(f.rootXprv, 20)} size={8.5} />
            <rect class="k-leak" x={x0 + 76} y={45} width={124} height={13} style={hatch} />
          </>
        )}
        {wide ? <Arrow d={`M${x0 + 64} 45 H${ribbonX - 4}`} ids={ids} /> : null}
        <Value at={[ribbonX + 16, ribbonY - 8]} text="PATH · ' = HARDENED" size={7.5} cls="k-value--muted" />
        <PathRibbon x={ribbonX} y={ribbonY} f={f} cellW={cellW} />
        {/* Hardened derivation → k → HMAC */}
        <Arrow d={wide ? `M${ckdX} 76 V${rowY - 24}` : `M${ckdX} ${ribbonY + 42} V${rowY - 24}`} ids={ids} />
        <Machine at={[ckdX, rowY]} w={62} d={26} h={20} label="CKDpriv" role="secret" />
        <Arrow d={`M${ckdX + 56} ${rowY + 10} H${kX - 6}`} ids={ids} />
        <KeyGlyph at={[kX, rowY + 4]} role="secret" label="k" />
        <rect class="k-leak" x={kX - 4} y={rowY - 2} width={40} height={36} style={hatch} />
        <Value at={[kX, rowY + 44]} text={short(d.derivedKeyHex, 10)} size={8.5} />
        <rect class="k-leak" x={kX - 2} y={rowY + 35} width={68} height={13} style={hatch} />
        <Value at={[kX, rowY + 56]} text="32-BYTE CHILD KEY" size={7.5} cls="k-value--muted" />
        {wide ? <Arrow d={`M${kX + 36} ${rowY + 10} H${hmacX - 30}`} ids={ids} /> : <Arrow d={`M${kX + 14} ${rowY + 62} V${rowY + 70} H${hmacX + 20} V${hmacY - 22}`} ids={ids} />}
        <Machine at={[hmacX, hmacY]} w={96} d={26} h={20} label="HMAC-SHA512" role="hash" />
        <Value at={[hmacX + (wide ? 92 : 98), hmacY + 6]} text={wide ? "KEY: “bip-entropy-from-k”" : "KEY:"} size={8} cls="k-value--muted" />
        {!wide ? <Value at={[hmacX + 98, hmacY + 18]} text="“bip-entropy-from-k”" size={8} cls="k-value--muted" /> : null}
        <Arrow d={wide ? `M${hmacX + 40} ${hmacY + 50} V${barY - 14}` : `M${hmacX + 20} ${hmacY + 52} V${barY - 14}`} ids={ids} />
        {/* The 64 bytes and the part this application reads. */}
        <Value at={[wide ? x0 : x0 + 64, barY - 6]} text="64 BYTES OF ENTROPY · FILLED = READ" size={7.5} cls="k-value--muted" />
        <ByteBar x={x0} y={barY} f={f} size={size} perRow={perRow} />
        <g class="k-leak">
          {unread.map((i) => <rect x={x0 + (i % perRow) * size} y={barY + Math.floor(i / perRow) * (size + 3)} width={size} height={size} style={hatch} />)}
        </g>
        {uses.map((u, i) => <Value at={[x0, usesY + i * 13]} text={u} size={8} cls="k-value--label" />)}
        {/* The output */}
        <rect class="k-outline k-fill--secret" x={x0} y={outY} width={W - 2 * x0} height={outH} />
        <Value at={[x0 + 8, outY + 15]} text={`OUTPUT · ${OUTPUT_NAME[d.outputKind].toUpperCase()}`} size={8} cls="k-value--label" />
        {lines.map((l, i) => <Value at={[x0 + 8, outY + 30 + i * 14]} text={l} size={wide ? 9 : 8.5} />)}
        {/* What a leaked output reveals: a layer every state draws; the toggle shows it. */}
        <g class="k-leak">
          {LEAK.map((l, i) => <Value at={[leak.x, leak.y + i * 12]} text={l} size={7.5} cls={i === 0 ? "k-value--label" : "k-value--muted"} />)}
        </g>
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Path</dt><dd><code>{f.path}</code></dd>
          <dt>Published root key</dt><dd><code class="atlas-break">{f.rootXprv}</code></dd>
          <dt>k, the private key at the path</dt><dd><code class="atlas-break">{d.derivedKeyHex}</code></dd>
          <dt>HMAC-SHA512 output (64 bytes)</dt><dd><code class="atlas-break">{d.entropyHex}</code></dd>
          <dt>Output ({OUTPUT_NAME[d.outputKind]})</dt><dd><code class="atlas-break">{d.output}</code></dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 85 line {f.source.line}. The output, and every byte BIP 85 prints, equal the published vector at build time; k and the bytes the vector does not print are computed by the same tested model. Public test material: never use it for funds or passwords.</p>
    </>
  );
}
