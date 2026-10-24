export interface RbfOriginalTransaction {
  id: string;
  inputs: string[];
  sequences: number[];
  feeSats: number;
  vbytes: number;
  unconfirmed: boolean;
  ancestors: string[];
}

export interface RbfCandidateTransaction {
  inputs: string[];
  unconfirmedInputs: string[];
  feeSats: number;
  vbytes: number;
}

export interface RbfScenario {
  originals: RbfOriginalTransaction[];
  ancestry?: RbfOriginalTransaction[];
  candidate: RbfCandidateTransaction;
  minRelayFeeRate: number;
  evictedCount: number;
}

export interface RbfGate {
  id: "signal" | "inputs" | "absolute-fee" | "bandwidth" | "evictions";
  ok: boolean;
  detail: string;
}

export interface RbfEvaluation {
  valid: boolean;
  failedGate: RbfGate["id"] | null;
  gates: RbfGate[];
  originalFeeSats: number;
  requiredFeeSats: number;
  bandwidthBumpSats: number;
  signal: "explicit" | "inherited" | "both" | "none";
}

const FINAL = 0xffffffff;
const OPT_IN = 0xfffffffe;

export function evaluateRbfScenario(scenario: RbfScenario): RbfEvaluation {
  const { originals, candidate, minRelayFeeRate, evictedCount } = scenario;
  const graph = [...originals, ...(scenario.ancestry ?? [])];
  if (!originals.length) throw new RangeError("A replacement needs at least one original transaction.");
  if (!Number.isFinite(minRelayFeeRate) || minRelayFeeRate <= 0) throw new RangeError("Minimum relay fee rate must be positive.");
  if (!Number.isInteger(evictedCount) || evictedCount < originals.length) throw new RangeError("Eviction count must include every original transaction.");
  for (const tx of [...graph, candidate]) {
    if (!Number.isInteger(tx.feeSats) || tx.feeSats < 0 || !Number.isInteger(tx.vbytes) || tx.vbytes <= 0) throw new RangeError("Fee and virtual size must be non-negative integers; size must be positive.");
  }
  const byId = new Map(graph.map((tx) => [tx.id, tx]));
  if (byId.size !== graph.length) throw new RangeError("Transaction IDs must be unique across originals and ancestry.");
  for (const tx of graph) {
    if (tx.ancestors.some((ancestor) => !byId.has(ancestor))) throw new RangeError(`Unknown ancestor in ${tx.id}.`);
    if (tx.sequences.some((sequence) => !Number.isInteger(sequence) || sequence < 0 || sequence > FINAL)) throw new RangeError(`Invalid nSequence in ${tx.id}.`);
  }
  for (const tx of originals) if (!tx.unconfirmed) throw new RangeError(`${tx.id} is confirmed and cannot be an original mempool transaction.`);
  if (candidate.unconfirmedInputs.some((input) => !candidate.inputs.includes(input))) throw new RangeError("Unconfirmed-input list must be a subset of the candidate's inputs.");

  const explicitlySignals = (tx: RbfOriginalTransaction) => tx.sequences.some((sequence) => sequence < OPT_IN);
  const checkAncestry = (tx: RbfOriginalTransaction, seen = new Set<string>()): void => {
    if (seen.has(tx.id)) throw new RangeError("Ancestor cycle.");
    seen.add(tx.id);
    for (const id of tx.ancestors) checkAncestry(byId.get(id)!, new Set(seen));
  };
  for (const tx of originals) checkAncestry(tx);
  const inheritsSignal = (tx: RbfOriginalTransaction, seen = new Set<string>()): boolean => {
    if (seen.has(tx.id)) throw new RangeError("Ancestor cycle.");
    seen.add(tx.id);
    return tx.ancestors.some((id) => {
      const ancestor = byId.get(id)!;
      return (ancestor.unconfirmed && explicitlySignals(ancestor)) || inheritsSignal(ancestor, new Set(seen));
    });
  };
  const explicit = originals.some(explicitlySignals);
  const inherited = originals.some((tx) => inheritsSignal(tx));
  const sameInput = candidate.inputs.some((input) => originals.some((tx) => tx.inputs.includes(input)));
  const signalOk = sameInput && (explicit || inherited);
  const originalFeeSats = originals.reduce((sum, tx) => sum + tx.feeSats, 0);
  const bandwidthBumpSats = Math.ceil(candidate.vbytes * minRelayFeeRate);
  const requiredFeeSats = originalFeeSats + bandwidthBumpSats;
  const inputsOk = candidate.unconfirmedInputs.every((input) => originals.some((tx) => tx.inputs.includes(input)));
  const absoluteOk = candidate.feeSats >= originalFeeSats;
  const bandwidthOk = candidate.feeSats >= requiredFeeSats;
  const evictionsOk = evictedCount <= 100;
  const signal = explicit && inherited ? "both" : explicit ? "explicit" : inherited ? "inherited" : "none";
  const signalText = signal === "both" ? "explicit and inherited" : signal === "none" ? "no explicit or unconfirmed-ancestor opt-in" : signal;
  const gates: RbfGate[] = [
    { id: "signal", ok: signalOk, detail: signalOk ? `Opt-in is ${signalText}; the candidate spends a shared input.` : `Replacement needs a shared input and an opt-in; found ${sameInput ? signalText : "no shared input"}.` },
    { id: "inputs", ok: inputsOk, detail: inputsOk ? "Every unconfirmed candidate input already appears in the originals." : "A candidate introduces an unconfirmed input not present in the originals." },
    { id: "absolute-fee", ok: absoluteOk, detail: `Candidate fee ${candidate.feeSats} sat; original total ${originalFeeSats} sat.` },
    { id: "bandwidth", ok: bandwidthOk, detail: `Required total ${requiredFeeSats} sat = ${originalFeeSats} + ${bandwidthBumpSats} for bandwidth; candidate ${candidate.feeSats} sat.` },
    { id: "evictions", ok: evictionsOk, detail: `${evictedCount} evicted transactions; limit 100.` },
  ];
  const failedGate = gates.find((gate) => !gate.ok)?.id ?? null;
  return { valid: failedGate === null, failedGate, gates, originalFeeSats, requiredFeeSats, bandwidthBumpSats, signal };
}
