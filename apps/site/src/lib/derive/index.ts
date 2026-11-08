import type { BaseFixture } from "@bip-atlas/figures";
import { deriveBfBlock } from "./block-filters";
import { deriveDescriptor, deriveDescriptorIndex } from "./descriptors";
import { deriveBip32 } from "./hd-wallets";
import { deriveBip322, deriveBip322Formats, deriveBip322Verdicts } from "./message-signing";
import { deriveMnemonic } from "./mnemonics";
import { deriveMusig2Keyagg, deriveMusig2PsigChecks, deriveMusig2Session } from "./musig2";
import { deriveP2sh } from "./p2sh";
import { derivePsbtCombine, derivePsbtTrace } from "./psbt";
import { deriveSchnorr } from "./schnorr";
import { deriveTransaction } from "./segwit";
import { deriveSp, deriveSpEligibility } from "./silent-payments";
import { deriveTaprootKeyspend, deriveTaprootTree } from "./taproot";
import { deriveTapscript } from "./tapscript";
import { deriveTimelockBipTx, deriveTimelockCase, deriveTimelockEncoding } from "./timelocks";
import { deriveV2, deriveV2Framing, deriveV2Rekey } from "./v2-transport";
import { deriveVersionbitsDeployment, deriveVersionbitsGuideline } from "./version-bits";
import { deriveWalletPath } from "./wallet-paths";

/** Each fixture kind's derivation; `group` is every fixture passed to the same figure. */
const DERIVE: Record<string, (f: any, group: any[]) => unknown> = {
  // Address figures run the bech32 model on the published string themselves.
  address: (f) => f,
  mnemonic: deriveMnemonic,
  "bip32-seed": deriveBip32,
  transaction: deriveTransaction,
  "psbt-trace": derivePsbtTrace,
  "psbt-combine": derivePsbtCombine,
  "schnorr-vector": (f, group) => deriveSchnorr(f, group.filter((g) => g.kind === "schnorr-vector")),
  "taproot-tree": deriveTaprootTree,
  "taproot-keyspend": deriveTaprootKeyspend,
  "tapscript-case": deriveTapscript,
  "p2sh-spend": deriveP2sh,
  "timelock-case": deriveTimelockCase,
  "timelock-bip-tx": deriveTimelockBipTx,
  "timelock-encoding": deriveTimelockEncoding,
  "versionbits-deployment": deriveVersionbitsDeployment,
  "versionbits-guideline": deriveVersionbitsGuideline,
  "wallet-path-vector": deriveWalletPath,
  "descriptor-vector": deriveDescriptor,
  "descriptor-index": deriveDescriptorIndex,
  "musig2-session": deriveMusig2Session,
  "musig2-keyagg": deriveMusig2Keyagg,
  "musig2-psig-checks": deriveMusig2PsigChecks,
  "sp-vector": deriveSp,
  "sp-eligibility": deriveSpEligibility,
  "bf-block": deriveBfBlock,
  "v2-vector": deriveV2,
  "v2-framing": deriveV2Framing,
  "v2-rekey": deriveV2Rekey,
  "bip322-vector": deriveBip322,
  "bip322-formats": deriveBip322Formats,
  "bip322-verdicts": deriveBip322Verdicts,
};

/** Fixtures as their figure draws them: derived by the tested models and checked against the published vectors. */
export function deriveFixtures<T extends BaseFixture>(fixtures: T[]): T[] {
  return fixtures.map((f) => {
    const derive = DERIVE[f.kind];
    if (!derive) throw new Error(`${f.id}: no derivation for fixture kind ${f.kind}`);
    return derive(f, fixtures) as T;
  });
}
