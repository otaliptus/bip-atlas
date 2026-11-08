import type { DerivedPsbtV2Fixture } from "../types";

/** "PSBT_IN_REQUIRED_TIME_LOCKTIME" → "REQUIRED_TIME_LOCKTIME". */
export const bare = (name: string) => name.replace(/^PSBT_(GLOBAL|IN|OUT)_/, "");

/** A lock time for reading: a height, or a Unix time with its UTC date. */
export const lockText = (kind: "height" | "time", value: number) =>
  kind === "height" ? `block height ${value}` : `Unix time ${value} (${new Date(value * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC")})`;

/** What one input requires and which lock-time types it can take. */
export function inputReading(i: DerivedPsbtV2Fixture["derived"]["inputs"][number]) {
  const reqs = [i.requiredHeight !== null ? `height ${i.requiredHeight}` : null, i.requiredTime !== null ? `time ${i.requiredTime}` : null].filter(Boolean) as string[];
  const takes = i.requiredHeight !== null && i.requiredTime === null ? "a height only" : i.requiredTime !== null && i.requiredHeight === null ? "a time only" : "either type";
  return { reqs, takes, none: reqs.length === 0 };
}

/** BIP 370's three steps for this vector, in words: who requires a lock time, the common type, the value. */
export function lockSteps(f: DerivedPsbtV2Fixture) {
  const d = f.derived;
  const lt = d.lockTime!;
  const names = lt.requiring.map((k) => String(k + 1));
  const list = names.length === 1 ? `input ${names[0]}` : `inputs ${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const each = lt.requiring.length === 1 ? "It accepts" : "Each of them accepts";
  const step1 = lt.requiring.length ? `Requiring a lock time: ${list}.` : "No input requires a lock time.";
  const step2 = !lt.requiring.length
    ? d.fallbackLocktime === null ? "No fallback field, so the fallback is 0." : `Use the fallback lock time, ${d.fallbackLocktime}.`
    : lt.accepted.height && lt.accepted.time ? `${each} both types: height wins the tie.`
    : lt.accepted.height ? `${each} a height.`
    : lt.accepted.time ? `${each} a time.`
    : "No type suits all of them: one needs a height, another a time.";
  const values = lt.kind === "height" || lt.kind === "time" ? lt.requiring.map((k) => (lt.kind === "height" ? d.inputs[k].requiredHeight! : d.inputs[k].requiredTime!)) : [];
  const step3 = lt.kind === null ? "No lock time can be chosen." : lt.kind === "fallback" ? `nLockTime = ${lt.value}.` : values.length > 1 ? `Largest required ${lt.kind}: max(${values.join(", ")}) = ${lt.value}.` : `The required ${lt.kind}: ${lt.value}.`;
  return [step1, step2, step3];
}
