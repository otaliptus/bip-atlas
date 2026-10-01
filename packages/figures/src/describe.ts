import { STAGES, type AddressAnalysis, type CharacterRole, type Encoding } from "@bip-atlas/models/bech32";

export const familyName = (encoding: Encoding) => (encoding === "bech32" ? "Bech32" : "Bech32m");

export const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;

export const ROLE_LABELS: Record<CharacterRole, string> = {
  hrp: "Prefix",
  separator: "Separator",
  version: "Version",
  program: "Program",
  checksum: "Checksum",
  unparsed: "Unparsed",
};

/** Short verdict, e.g. "Accepted" or "Stopped at Checksum". */
export function stageVerdict(analysis: AddressAnalysis): string {
  return analysis.valid ? "Accepted" : `Stopped at ${stageLabel(analysis.failedStage!)}`;
}

/** One sentence describing the outcome; used for captions and the live region. */
export function summarize(analysis: AddressAnalysis): string {
  if (analysis.valid) {
    const bytes = analysis.programHex!.length / 2;
    return `Accepted: witness version ${analysis.witnessVersion}, a ${bytes}-byte program, protected by ${familyName(analysis.encoding!)} as that version requires.`;
  }
  return `Rejected at the ${stageLabel(analysis.failedStage!).toLowerCase()} stage. ${analysis.reason}`;
}

/** Consecutive runs of the same role, for drawing labelled segments. */
export function roleRuns(roles: readonly CharacterRole[]): Array<{ role: CharacterRole; start: number; end: number }> {
  const runs: Array<{ role: CharacterRole; start: number; end: number }> = [];
  roles.forEach((role, i) => {
    const last = runs.at(-1);
    if (last && last.role === role) last.end = i + 1;
    else runs.push({ role, start: i, end: i + 1 });
  });
  return runs;
}
