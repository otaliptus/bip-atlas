import { Arrow, Drawing, IsoBox, Machine, Value, idsFor } from "../kit";
import type { Role } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { short } from "./stages";

/** The fixed part of the challenge input: SHA256(tag) twice, r and P, 32 bytes each. */
const FIXED = [
  { key: "tag1", label: "SHA256(tag)", bytes: 32, role: "hash" as Role },
  { key: "tag2", label: "SHA256(tag)", bytes: 32, role: "hash" as Role },
  { key: "r", label: "r", bytes: 32, role: "sig" as Role },
  { key: "p", label: "P", bytes: 32, role: "public" as Role },
];
const FIXED_BYTES = FIXED.reduce((n, p) => n + p.bytes, 0);

/**
 * challenge-preimage.v1 — static. The tagged hash that makes e, as a
 * machine fed SHA256(tag) twice, r, P and the message; below it, what the
 * machine is fed for published messages of five lengths, to scale. Hashes
 * from the tested verifier trace; exact values in the disclosure.
 */
export function ChallengePreimage({ fixtures }: { fixtures: DerivedSchnorrFixture[] }) {
  const tag = fixtures[0].derived.challengeTagHex;
  if (fixtures.some((f) => f.derived.challengeTagHex !== tag)) throw new Error("challenge tag hash differs between fixtures");
  const rows = fixtures.map((f) => {
    const hash = f.derived.challengeHashHex;
    if (!hash || !f.expected) throw new Error(`${f.id}: needs a valid vector whose challenge was computed`);
    return { f, m: f.messageHex.length / 2, hash };
  });
  const max = Math.max(...rows.map((r) => FIXED_BYTES + r.m));
  const unit = 300 / max;
  const ids = idsFor("a06-chal");
  const top = 176, rowH = 44;
  const desc =
    `The challenge e is SHA-256 of SHA256("BIP0340/challenge") written twice (${tag}), then r, then P, then the message, reduced mod n. ` +
    rows.map((r) => `Vector ${r.f.vectorIndex}: a ${r.m}-byte message, so the hash reads ${FIXED_BYTES + r.m} bytes; the hash is ${r.hash}.`).join(" ");
  return (
    <>
      <Drawing id="a06-chal" width={344} height={top + rows.length * rowH + 4} title="One hash, any message" desc={desc}>
        <Value at={[14, 18]} text={`H(TAG) = SHA256("BIP0340/challenge") = ${short(tag)}`} size={8.5} cls="k-value--label" />
        {[...FIXED, { key: "m", label: "m", bytes: 24, role: "plain" as Role }].map((p, i) => (
          <g>
            <rect class={`k-cell k-fill--${p.role}${p.key === "m" ? " k-dashed" : ""}`} x={14 + i * 52} y={28} width={50} height={20} />
            <Value at={[14 + i * 52 + 4, 42]} text={p.key.startsWith("tag") ? "H(tag)" : p.label} size={9} />
            <Value at={[14 + i * 52 + 25, 60]} text={p.key === "m" ? "ANY" : `${p.bytes} B`} size={8} anchor="middle" cls="k-value--muted" />
          </g>
        ))}
        <Arrow d="M144 66 V82" ids={ids} />
        <Machine at={[130, 108]} w={64} d={28} h={22} label="SHA-256" role="hash" />
        <Arrow d="M192 98 H222" ids={ids} />
        <IsoBox at={[236, 104]} w={16} d={16} h={10} role="hash" />
        <Value at={[256, 96]} text="HASH;" size={8.5} cls="k-value--label" />
        <Value at={[256, 108]} text="e = HASH mod n" size={9.5} />

        {rows.map((r, i) => {
          const y = top + i * rowH;
          let x = 14;
          const parts = [...FIXED.map((p) => ({ ...p })), { key: "m", label: "m", bytes: r.m, role: "plain" as Role }];
          return (
            <g data-vector={r.f.vectorIndex}>
              <Value at={[14, y + 8]} text={`V${r.f.vectorIndex} · ${r.m}-BYTE MESSAGE · ${FIXED_BYTES + r.m} BYTES IN`} size={8.5} cls="k-value--label" />
              {parts.map((p) => {
                const px = x;
                x += p.bytes * unit;
                return p.bytes ? <rect class={`k-cell k-fill--${p.role}`} x={px} y={y + 13} width={p.bytes * unit} height={12} /> : null;
              })}
              <Value at={[14, y + 37]} text={`hash → ${short(r.hash)}`} size={9} cls="k-value--hash" />
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>SHA256("BIP0340/challenge")</dt><dd><code class="atlas-break">{tag}</code></dd>
          {rows.map((r) => (
            <>
              <dt>Vector {r.f.vectorIndex}: challenge hash ({r.m}-byte message)</dt>
              <dd><code class="atlas-break">{r.hash}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
