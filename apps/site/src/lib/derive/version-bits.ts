import { parseAssignments, utcToEpoch, activationHeight, bip9Implied, versionFor, BIP9_THRESHOLD, BIP8_THRESHOLD, PERIOD } from "@bip-atlas/models";
import type { VersionbitsDeploymentFixture, DerivedVersionbitsDeploymentFixture, VersionbitsGuidelineFixture, DerivedVersionbitsGuidelineFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, pinnedText } from "./sources";

export function deriveVersionbitsDeployment(f: VersionbitsDeploymentFixture): DerivedVersionbitsDeploymentFixture {
  const text = pinnedText(f.source.file!, SNAPSHOT_PHASE3);
  const row = parseAssignments(text).find((r) => r.name === f.name);
  if (!row || row.line !== f.source.line) throw new Error(`${f.id}: no "${f.name}" row at line ${f.source.line} of ${f.source.file}`);
  const cross = pinnedText(`bip-${String(f.crossCheck.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const net = (n: "mainnet" | "testnet", line: number) => {
    const r = row[n];
    const startEpoch = utcToEpoch(r.start), expireEpoch = utcToEpoch(r.expire);
    if (!cross[line - 1].includes(`(Epoch timestamp ${startEpoch})`) || !cross[line - 1].includes(`(Epoch timestamp ${expireEpoch})`))
      throw new Error(`${f.id}: ${n} dates disagree with BIP ${f.crossCheck.bip} line ${line}`);
    const h = activationHeight(r.state);
    return { ...r, startEpoch, expireEpoch, activeHeight: h, implied: h === null ? null : bip9Implied(h), threshold: BIP9_THRESHOLD[n] };
  };
  return {
    ...f,
    derived: { name: row.name, bit: row.bit, bips: row.bips, signalVersion: versionFor([row.bit]), mainnet: net("mainnet", f.crossCheck.mainnetLine), testnet: net("testnet", f.crossCheck.testnetLine) },
  };
}

export function deriveVersionbitsGuideline(f: VersionbitsGuidelineFixture): DerivedVersionbitsGuidelineFixture {
  const lines = pinnedText("bip-0008.mediawiki", SNAPSHOT_PHASE3).split("\n");
  if (!lines[f.source.line! - 1].includes(f.source.quote!) || !lines[f.timeoutLine - 1].includes(f.timeoutQuote)) throw new Error(`${f.id}: BIP 8 guideline lines moved`);
  if (!f.source.quote!.includes(String(BIP8_THRESHOLD.mainnet)) || !f.timeoutQuote.includes(String(26 * PERIOD))) throw new Error(`${f.id}: model constants differ from BIP 8`);
  return { ...f, derived: { threshold: BIP8_THRESHOLD.mainnet, timeoutPeriods: 26 } };
}
