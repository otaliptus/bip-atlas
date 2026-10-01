import type { DerivedSchnorrFixture } from "../types";

const PARTS = [
  { key: "tag", label: "SHA256(tag) ‖ SHA256(tag)", fixed: 64 },
  { key: "r", label: "r", fixed: 32 },
  { key: "p", label: "P", fixed: 32 },
] as const;

/**
 * challenge-preimage.v1 — static. What goes into e for published messages of
 * different lengths, drawn to scale. Hashes come from the tested model.
 */
export function ChallengePreimage({ fixtures }: { fixtures: DerivedSchnorrFixture[] }) {
  const max = Math.max(...fixtures.map((f) => 128 + f.messageHex.length / 2));
  const tag = fixtures[0].derived.challengeTagHex;
  return (
    <div class="atlas-ser atlas-challenge">
      <p class="atlas-challenge__tag">
        SHA256(“BIP0340/challenge”) = <code class="atlas-break">{tag}</code>
      </p>
      {fixtures.map((f) => {
        const m = f.messageHex.length / 2;
        const total = 128 + m;
        return (
          <div class="atlas-ser__row">
            <p class="atlas-ser__head">
              <span class="atlas-ser__name">vector {f.vectorIndex}</span>
              <span>{m}-byte message · SHA256 of {total} bytes</span>
            </p>
            <div class="atlas-ser__bar" style={`inline-size: ${(total / max) * 100}%`} role="img"
              aria-label={`Challenge hash input for vector ${f.vectorIndex}: 64 tag bytes, 32 bytes r, 32 bytes P, ${m} message bytes.`}>
              {PARTS.map((p) => (
                <span class="atlas-ser__seg" data-group={`sig-${p.key}`} style={`flex-grow: ${p.fixed}`}>
                  <span class="atlas-ser__label">{p.key === "tag" ? "tag ×2" : p.label}</span>
                </span>
              ))}
              {m > 0 ? (
                <span class="atlas-ser__seg" data-group="sig-m" style={`flex-grow: ${m}`}>
                  <span class="atlas-ser__label">{m >= 8 ? "m" : ""}</span>
                </span>
              ) : null}
            </div>
            <p class="atlas-challenge__hash">
              hash = <code class="atlas-break">{f.derived.challengeHashHex}</code> <small>→ e = hash mod n</small>
            </p>
          </div>
        );
      })}
      <p class="atlas-ser__legend">
        <span><span class="atlas-ser__key" data-group="sig-tag" />tag prefix, 64 bytes</span>
        <span><span class="atlas-ser__key" data-group="sig-r" />r, 32 bytes</span>
        <span><span class="atlas-ser__key" data-group="sig-p" />public key, 32 bytes</span>
        <span><span class="atlas-ser__key" data-group="sig-m" />message, any length</span>
      </p>
      <p class="atlas-lab__source">BIP 340 test-vectors.csv lines {fixtures.map((f) => f.source.line).join(", ")}. Every one of these signatures verifies.</p>
    </div>
  );
}
