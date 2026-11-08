import { Arrow, Drawing, IsoBox, Storyboard, Value, idsFor, short, type Frame } from "../kit";
import type { DerivedP2shFixture } from "../types";

const KIND: Record<string, string> = { legacy: "legacy multisig", "p2sh-p2wpkh": "P2WPKH program", "p2sh-p2wsh": "P2WSH program" };

/**
 * p2sh-shape.v1 — static. Three very different redeem scripts, each hashed
 * into the same 23-byte output shape: OP_HASH160, a push of 20, OP_EQUAL.
 */
export function P2shShape({ fixtures }: { fixtures: DerivedP2shFixture[] }) {
  const ids = idsFor("a09-shape");
  const rowH = 62;
  return (
    <>
      <Drawing
        id="a09-shape"
        width={344}
        height={24 + fixtures.length * rowH}
        title="A fixed output shape"
        desc={fixtures.map((f) => `${f.label}: a ${f.derived.redeemScriptHex.length / 2}-byte redeem script (${f.derived.redeemAsm}) gives a ${f.derived.scriptPubKeyHex.length / 2}-byte output, OP_HASH160, the hash ${f.derived.committedHashHex}, OP_EQUAL.`).join(" ")}
      >
        <Value at={[14, 12]} text="REDEEM SCRIPT, TO SCALE" size={9} cls="k-value--muted" />
        <Value at={[206, 12]} text="OUTPUT" size={9} cls="k-value--muted" />
        {fixtures.map((f, k) => {
          const d = f.derived;
          const y = 26 + k * rowH;
          const w = (d.redeemScriptHex.length / 2) * 1.8;
          const spk = d.scriptPubKeyHex;
          return (
            <g data-fixture={f.id}>
              <rect class="k-cell k-fill--plain" x="14" y={y} width={w} height="20" />
              <Value at={[18, y + 13.5]} text={`${d.redeemScriptHex.length / 2} B`} size={9} />
              <Value at={[14, y + 34]} text={KIND[d.kind].toUpperCase()} size={9} cls="k-value--label" />
              <Arrow d={`M${14 + w + 4} ${y + 10} H170`} ids={ids} />
              <IsoBox at={[184, y + 14]} w={12} d={12} h={9} role="hash" />
              {k === 0 ? <Value at={[184, y - 6]} text="HASH160" size={8.5} anchor="middle" cls="k-value--muted" /> : null}
              <Arrow d={`M194 ${y + 10} H204`} ids={ids} />
              <rect class="k-cell k-fill--plain" x="206" y={y} width="18" height="20" />
              <text class="k-cell__t" x="215" y={y + 13.4} text-anchor="middle">{spk.slice(0, 2)}</text>
              <rect class="k-cell k-fill--plain" x="224" y={y} width="18" height="20" />
              <text class="k-cell__t" x="233" y={y + 13.4} text-anchor="middle">{spk.slice(2, 4)}</text>
              <rect class="k-cell k-fill--hash" x="242" y={y} width="70" height="20" />
              <Value at={[246, y + 13.5]} text={short(d.committedHashHex, 7)} size={9} />
              <rect class="k-cell k-fill--plain" x="312" y={y} width="18" height="20" />
              <text class="k-cell__t" x="321" y={y + 13.4} text-anchor="middle">{spk.slice(-2)}</text>
              <Value at={[206, y + 34]} text={`${spk.length / 2} B`} size={9} cls="k-value--label" />
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact output hashes</summary>
        <dl class="atlas-hexlist">
          {fixtures.map((f) => (
            <>
              <dt>{f.label}</dt>
              <dd><code class="atlas-break">{f.derived.scriptPubKeyHex}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}

/**
 * p2sh-failures.v1 — static storyboard. The same legacy spend broken three
 * ways, each re-run through the tested model at build time: a changed byte
 * in the script fails the hash check, a non-push opcode fails stage one, and
 * swapped signatures fail the script.
 */
export function P2shFailures({ fixture: f }: { fixture: DerivedP2shFixture }) {
  const d = f.derived;
  const x = d.failures;
  if (!x) throw new Error(`p2sh-failures: ${f.id} has no recorded failures`);
  const order = d.stages.map((s) => s.id);
  const chips = (failsAt: string) => (
    <>
      {order.map((id, i) => {
        const fi = order.indexOf(failsAt);
        const st = i < fi ? "ok" : i === fi ? "fail" : "none";
        return (
          <g class={st === "none" ? "k-faded" : undefined}>
            <rect class={`k-outline k-fill--plain${st === "fail" ? " k-cell--em" : ""}`} x={14 + i * 92} y={14} width="86" height="22" />
            <text class="k-card__name" x={20 + i * 92} y={28.5}>{`STAGE ${i + 1} ${st === "ok" ? "✓" : st === "fail" ? "✗" : "·"}`}</text>
          </g>
        );
      })}
    </>
  );
  const frames: Frame[] = [
    {
      note: `Change one byte of the redeem script (its last, ${x.alteredRedeem.fromHex} to ${x.alteredRedeem.toHex}) and its hash no longer fits the lock: stage 2 fails.`,
      desc: `With byte ${x.alteredRedeem.byteIndex} of the redeem script changed from ${x.alteredRedeem.fromHex} to ${x.alteredRedeem.toHex}, its HASH160 is ${x.alteredRedeem.hash160Hex}, not ${d.committedHashHex}. Validation fails at the hash check.`,
      draw: () => (
        <>
          {chips(x.alteredRedeem.failsAt)}
          <Value at={[14, 62]} text={`HASH160 = ${short(x.alteredRedeem.hash160Hex)}`} size={9.5} cls="k-value--hash" />
          <Value at={[14, 78]} text={`≠ THE LOCK ${short(d.committedHashHex)}`} size={9.5} cls="k-value--hash" />
        </>
      ),
    },
    {
      note: `Put a non-push opcode (${x.nonPush.opName}, 0x${x.nonPush.opHex}) in front of the scriptSig and stage 1 rejects it before anything runs.`,
      desc: `With ${x.nonPush.opName} (0x${x.nonPush.opHex}) in front of the scriptSig, it is no longer push-only and validation fails at stage 1.`,
      draw: () => (
        <>
          {chips(x.nonPush.failsAt)}
          <rect class="k-cell k-fill--plain k-cell--em" x="14" y="52" width="22" height="20" />
          <text class="k-cell__t" x="25" y="65.4" text-anchor="middle">{x.nonPush.opHex}</text>
          <rect class="k-cell k-fill--plain" x="36" y="52" width="150" height="20" />
          <Value at={[42, 65.5]} text="THE PUSHES" size={9} />
          <Value at={[14, 92]} text="NOT PUSH-ONLY ✗" size={9} cls="k-value--fail" />
        </>
      ),
    },
    {
      note: "Swap the two signatures: both are valid, but CHECKMULTISIG walks the keys in order and never goes back, so the script fails at stage 3.",
      desc: `With the two signatures in the other order the hash still matches, but CHECKMULTISIG walks the keys in order: ${x.swapped.checks.map((c) => `signature ${c.sigIndex + 1} ${c.keyIndex === null ? "finds no key left" : `${c.ok ? "matches" : "fails"} key ${c.keyIndex + 1}`}`).join(", ")}. The redeem script does not finish with true.`,
      draw: () => (
        <>
          {chips(x.swapped.failsAt)}
          <Value at={[14, 54]} text="SIGNATURES SWAPPED, AS THE MODEL RAN THEM:" size={8.5} cls="k-value--muted" />
          {x.swapped.checks.map((c, i) => (
            <Value at={[14, 70 + i * 14]} text={`SIG ${c.sigIndex + 1} → ${c.keyIndex === null ? "NO KEY LEFT" : `KEY ${c.keyIndex + 1}`} ${c.ok ? "✓" : "✗"}`} size={9} cls={c.ok ? "k-value--label" : "k-value--fail"} />
          ))}
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a09-fail" title="Three ways to fail" width={300} height={100} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact hashes</summary>
        <dl class="atlas-hexlist">
          <dt>HASH160 of the altered script</dt><dd><code class="atlas-break">{x.alteredRedeem.hash160Hex}</code></dd>
          <dt>Hash in the output</dt><dd><code class="atlas-break">{d.committedHashHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
