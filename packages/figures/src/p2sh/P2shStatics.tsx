import { Arrow, Drawing, IsoBox, Machine, Storyboard, Value, idsFor, type Frame } from "../kit";
import type { DerivedP2shFixture } from "../types";
import { StackPlates, itemText, stackHeight } from "./stack";

const short = (hex: string, n = 8) => `${hex.slice(0, n)}…`;
const keyNo = (c: { keyIndex: number | null }) => {
  if (c.keyIndex === null) throw new Error("p2sh-stack-story: a signature matched no key");
  return c.keyIndex + 1;
};
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
 * p2sh-stack-story.v1 — static storyboard (replaces the retired worked
 * example). The legacy 2-of-2 spend's stack, step by step, from the model's
 * recorded trace: the pushes, the hash check on a copy, then the redeem
 * script running on what is left.
 */
export function P2shStackStory({ fixture: f }: { fixture: DerivedP2shFixture }) {
  const d = f.derived;
  const k = d.itemKinds;
  const [s1, s2, s3] = d.stages;
  if (!s1 || !s2 || !s3) throw new Error(`p2sh-stack-story: ${f.id} has fewer than three stages`);
  const hashed = s2.steps.find((x) => x.name === "OP_HASH160");
  const equal = s2.steps.find((x) => x.name === "OP_EQUAL");
  const last = s3.steps.at(-1);
  const pushes = s3.steps.slice(0, -1);
  if (!hashed || !equal || !last) throw new Error(`p2sh-stack-story: ${f.id} trace is missing a step`);
  const tallest = Math.max(...[s2.stackBefore, hashed.stackAfter, equal.stackAfter, ...s3.steps.map((x) => x.stackAfter)].map((st) => st.length));
  const H = 30 + stackHeight(tallest) + 12;
  const frame = (stack: string[], em: number | undefined, side: (y: number) => preact.JSX.Element, top = "STACK") => (
    <>
      <Value at={[14, 12]} text={top} size={9} cls="k-value--muted" />
      <StackPlates x={14} y={20} w={136} items={stack} kinds={k} em={em} />
      {side(20)}
    </>
  );
  const frames: Frame[] = [
    {
      note: `The scriptSig only pushes data: ${s2.stackBefore.length} items, the last of them the ${d.redeemScriptHex.length / 2}-byte redeem script.`,
      desc: `After the scriptSig, the stack holds, bottom to top: ${s2.stackBefore.map((x) => itemText(x, k)).join(", ")}.`,
      draw: () => frame(s2.stackBefore, s2.stackBefore.length - 1, (y) => <Value at={[164, y + 12]} text={`${s1.scriptBytes} B OF PUSHES ✓`} size={9} cls="k-value--ok" />),
    },
    {
      note: `On a copy of that stack, the output's OP_HASH160 replaces the top item with its 20-byte hash.`,
      desc: `OP_HASH160 turns the redeem script into ${d.redeemHash160Hex}. Stack: ${hashed.stackAfter.map((x) => itemText(x, k)).join(", ")}.`,
      draw: () => frame(hashed.stackAfter, hashed.stackAfter.length - 1, (y) => (
        <>
          <Machine at={[196, y + 44]} w={56} d={26} h={20} label="HASH160" role="hash" />
          <Value at={[164, y + 86]} text={short(d.redeemHash160Hex)} size={9.5} cls="k-value--hash" />
        </>
      ), "A COPY OF THE STACK"),
    },
    {
      note: `It pushes the output's 20 bytes and OP_EQUAL compares: ${equal.stackAfter.at(-1) === "01" ? "equal, so true." : "different."}`,
      desc: `The output's hash ${d.committedHashHex} is pushed and compared with the computed one. Stack: ${equal.stackAfter.map((x) => itemText(x, k)).join(", ")}.`,
      draw: () => frame(equal.stackAfter, equal.stackAfter.length - 1, (y) => (
        <>
          <Value at={[164, y + 12]} text={`${short(d.redeemHash160Hex)} =`} size={9.5} cls="k-value--hash" />
          <Value at={[164, y + 27]} text={`${short(d.committedHashHex)} ${s2.ok ? "✓" : "✗"}`} size={9.5} cls="k-value--hash" />
        </>
      ), "A COPY OF THE STACK"),
    },
    {
      note: `Stage 3 starts again from the pushes minus the script, and runs that script: first its ${pushes.length} pushes.`,
      desc: `The redeem script ${d.redeemAsm} runs on ${s3.stackBefore.map((x) => itemText(x, k)).join(", ")}. After its pushes: ${pushes.at(-1)!.stackAfter.map((x) => itemText(x, k)).join(", ")}.`,
      draw: () => frame(pushes.at(-1)!.stackAfter, undefined, (y) => (
        <>
          <Value at={[164, y + 12]} text="RUNS:" size={9} cls="k-value--label" />
          {(d.redeemAsm.match(/<[^>]+>|\S+/g) ?? []).map((t, i) => <Value at={[164, y + 27 + i * 13]} text={t} size={9} />)}
        </>
      )),
    },
    {
      note: `${last.name}: ${last.note}.`,
      desc: `${last.name} checks ${last.checks?.map((c) => `signature ${c.sigIndex + 1} against key ${keyNo(c)}`).join(" and ")}, pops one extra item, and leaves ${last.stackAfter.map((x) => itemText(x, k)).join(", ")}.`,
      draw: () => frame(last.stackAfter, 0, (y) => (
        <>
          {(last.checks ?? []).map((c, i) => <Value at={[164, y + 12 + i * 14]} text={`SIG ${c.sigIndex + 1} → KEY ${keyNo(c)} ${c.ok ? "✓" : "✗"}`} size={9} cls="k-value--label" />)}
          <Value at={[164, y + 50]} text={s3.ok ? "✓ VALID" : "✗ FAILS"} size={9.5} cls={s3.ok ? "k-value--ok" : "k-value--fail"} />
        </>
      )),
    },
  ];
  return (
    <>
      <Storyboard id="a09-stack" title="The stack, step by step" width={300} height={H} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact hashes</summary>
        <dl class="atlas-hexlist">
          <dt>HASH160 of the redeem script</dt><dd><code class="atlas-break">{d.redeemHash160Hex}</code></dd>
          <dt>Hash in the output</dt><dd><code class="atlas-break">{d.committedHashHex}</code></dd>
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
