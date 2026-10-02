import type { DerivedSchnorrFixture, SchnorrStageId, SchnorrTraceView } from "../types";

/** The eight steps of Verify(pk, m, sig), in the order BIP 340 lists them. `gate` is the label on a drawn gate. */
export const SCHNORR_STAGES: ReadonlyArray<{ id: SchnorrStageId; label: string; gate: string }> = [
  { id: "lift-x", label: "Lift the key", gate: "LIFT P" },
  { id: "r-range", label: "Read r", gate: "r < p" },
  { id: "s-range", label: "Read s", gate: "s < n" },
  { id: "challenge", label: "Hash the challenge", gate: "HASH e" },
  { id: "compute-r", label: "Compute R", gate: "R" },
  { id: "infinity", label: "R is not infinity", gate: "R ≠ ∞" },
  { id: "even-y", label: "R has even y", gate: "EVEN y" },
  { id: "x-match", label: "x(R) equals r", gate: "x = r" },
];

/** First 8 hex digits and an ellipsis; every figure that uses it also lists the exact value. */
export const short = (hex: string) => `${hex.slice(0, 8)}…`;

export type GateStatus = "pass" | "fail" | "not-reached";

/** Status of each of the eight stages in a recorded trace. */
export function gateStatuses(trace: SchnorrTraceView): GateStatus[] {
  return SCHNORR_STAGES.map((st, i) => {
    const step = trace.steps[i];
    if (!step) return "not-reached";
    if (step.stage !== st.id) throw new Error(`trace step ${i} is ${step.stage}, expected ${st.id}`);
    return step.ok ? "pass" : "fail";
  });
}

/** The trace of a vector against its own (published) message. */
export function ownTrace(f: DerivedSchnorrFixture): SchnorrTraceView {
  const t = f.derived.traces[f.derived.ownMessage];
  if (!t) throw new Error(`${f.id}: no trace for its own message`);
  return t;
}

/** Values of one stage of a trace; throws if the stage did not run. */
export function stageValues(trace: SchnorrTraceView, id: SchnorrStageId): Record<string, string> {
  const s = trace.steps.find((x) => x.stage === id);
  if (!s) throw new Error(`stage ${id} did not run`);
  return s.values;
}

/** One-line reading of a stage result, used in status lines and text equivalents. */
export function stageNote(id: SchnorrStageId, values: Record<string, string>, ok: boolean): string {
  switch (id) {
    case "lift-x": return ok ? "P found, with even y" : `fails: ${values.reason === "x ≥ p" ? "pk is not below p" : "pk is the x of no curve point"}`;
    case "r-range": return ok ? "r is below p" : "r is not below p";
    case "s-range": return ok ? "s is below n" : "s is not below n";
    case "challenge": return values.hash === values.e ? "e computed (the hash was already below n)" : "e computed (the hash was reduced mod n)";
    case "compute-r": return values.R ? "R is the point at infinity" : `R computed, y ${BigInt(`0x${values.y}`) % 2n === 0n ? "even" : "odd"}`;
    case "infinity": return ok ? "R is an ordinary point" : "fails: R is the point at infinity";
    case "even-y": return ok ? "y(R) is even" : "fails: y(R) is odd";
    case "x-match": return ok ? "x(R) equals r" : "fails: x(R) differs from r";
  }
}
