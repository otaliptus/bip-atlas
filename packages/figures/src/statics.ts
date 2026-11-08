/**
 * Static figures: each recipe's drawing and how it takes its fixtures. These
 * render on the server only (no client directive), so this table never
 * reaches the browser. Interactive heroes are wired in Figure.astro.
 */
import type { ComponentType } from "preact";
import { AddressAlphabet } from "./address/AddressAlphabet";
import { AddressCase } from "./address/AddressCase";
import { PolymodStory } from "./address/PolymodStory";
import { QWeakness } from "./address/QWeakness";
import { ScriptOpcodes } from "./address/ScriptOpcodes";
import { TwoConstants } from "./address/TwoConstants";
import { TypoStory } from "./address/TypoStory";
import { AddressAnatomy } from "./AddressAnatomy";
import { Bip321Anatomy } from "./bip321/Bip321Anatomy";
import { Bip321Case } from "./bip321/Bip321Case";
import { Bip321Pop } from "./bip321/Bip321Pop";
import { Bip48Paths } from "./bip67/Bip48Paths";
import { Bip67ByteOrder } from "./bip67/Bip67ByteOrder";
import { Bip67ScriptStory } from "./bip67/Bip67ScriptStory";
import { Bip85Path } from "./bip85/Bip85Path";
import { Bip85Story } from "./bip85/Bip85Story";
import { Bip85Uses } from "./bip85/Bip85Uses";
import { Bip322Formats } from "./bip322/Bip322Formats";
import { Bip322Hash } from "./bip322/Bip322Hash";
import { Bip322Limits } from "./bip322/Bip322Limits";
import { Bip322Verdicts } from "./bip322/Bip322Verdicts";
import { Bip322Witness } from "./bip322/Bip322Witness";
import { BfBuildStory } from "./blockfilters/BfBuildStory";
import { BfDirections } from "./blockfilters/BfDirections";
import { BfPeerStory } from "./blockfilters/BfPeerStory";
import { BfSieve } from "./blockfilters/BfSieve";
import { BfSize } from "./blockfilters/BfSize";
import { DescriptorIndex } from "./descriptors/DescriptorIndex";
import { DescriptorOutputs } from "./descriptors/DescriptorOutputs";
import { DescriptorSentence } from "./descriptors/DescriptorSentence";
import { DescriptorTemplate } from "./descriptors/DescriptorTemplate";
import { DescriptorTypo } from "./descriptors/DescriptorTypo";
import { ExtendedKeyLayout } from "./hd/ExtendedKeyLayout";
import { ExtendedKeyPlates } from "./hd/ExtendedKeyPlates";
import { HdSharing } from "./hd/HdSharing";
import { HmacInputs } from "./hd/HmacInputs";
import { MasterKeySplit } from "./hd/MasterKeySplit";
import { TwoRoutes } from "./hd/TwoRoutes";
import { WeaknessStory } from "./hd/WeaknessStory";
import { ChecksumStory } from "./mnemonic/ChecksumStory";
import { EntropyBits } from "./mnemonic/EntropyBits";
import { LastWordOdds } from "./mnemonic/LastWordOdds";
import { MnemonicCard } from "./mnemonic/MnemonicCard";
import { MnemonicChain } from "./mnemonic/MnemonicChain";
import { PassphraseSeeds } from "./mnemonic/PassphraseSeeds";
import { SeedDerivation } from "./mnemonic/SeedDerivation";
import { WordlistIndex } from "./mnemonic/WordlistIndex";
import { ChainView } from "./musig2/ChainView";
import { Musig2KeyAgg } from "./musig2/Musig2KeyAgg";
import { Musig2PsigChecks } from "./musig2/Musig2PsigChecks";
import { NonceOnce } from "./musig2/NonceOnce";
import { P2shCommitment } from "./p2sh/P2shCommitment";
import { P2shFailures, P2shShape } from "./p2sh/P2shStatics";
import { P2shLimit, P2shWrapped } from "./p2sh/P2shWrapped";
import { ProgramRegrouping } from "./ProgramRegrouping";
import { PsbtLayout } from "./psbt/PsbtLayout";
import { PsbtCombine, PsbtFinalize, UnknownFields } from "./psbt/PsbtMerge";
import { PsbtRecords } from "./psbt/PsbtRecords";
import { SignerDisplay, UtxoCheck } from "./psbt/PsbtSigner";
import { ByteSizes } from "./schnorr/ByteSizes";
import { ChallengePreimage } from "./schnorr/ChallengePreimage";
import { Equation } from "./schnorr/Equation";
import { EvenY } from "./schnorr/EvenY";
import { FailGates } from "./schnorr/FailGates";
import { SignatureLayout } from "./schnorr/SignatureLayout";
import { EcdhStory } from "./silentpayments/EcdhStory";
import { ScanLoop } from "./silentpayments/ScanLoop";
import { SpAddress } from "./silentpayments/SpAddress";
import { SpEligibility } from "./silentpayments/SpEligibility";
import { SpLabels } from "./silentpayments/SpLabels";
import { DepthProof } from "./taproot/DepthProof";
import { SigMsgLayout } from "./taproot/SigMsgLayout";
import { SpendReveals } from "./taproot/SpendReveals";
import { TaprootTweak } from "./taproot/TaprootTweak";
import { VerifierStory } from "./taproot/VerifierStory";
import { WitnessStacks } from "./taproot/WitnessStacks";
import { MinimalIf } from "./tapscript/MinimalIf";
import { MultisigChain } from "./tapscript/MultisigChain";
import { OpSuccess } from "./tapscript/OpSuccess";
import { SigPays } from "./tapscript/SigPays";
import { SigRules } from "./tapscript/SigRules";
import { TapscriptWitness } from "./tapscript/TapscriptWitness";
import { TimelockCsvStory, TimelockMtp, TimelockNotALock, TimelockPinned, TimelockRanges, TimelockSequenceBits } from "./timelock/TimelockStatics";
import { AmountStory } from "./tx/AmountStory";
import { Bip143Preimage } from "./tx/Bip143Preimage";
import { NestedInput } from "./tx/NestedInput";
import { SighashReuse } from "./tx/SighashReuse";
import { TwoSerializations } from "./tx/TwoSerializations";
import { WeightMeter } from "./tx/WeightMeter";
import { WitnessCommitment } from "./tx/WitnessCommitment";
import { WitnessField } from "./tx/WitnessField";
import { V2Detect } from "./v2/V2Detect";
import { V2Eavesdropper } from "./v2/V2Eavesdropper";
import { V2Ellswift } from "./v2/V2Ellswift";
import { V2Framing } from "./v2/V2Framing";
import { V2PacketBytes } from "./v2/V2PacketBytes";
import { V2Rekey } from "./v2/V2Rekey";
import { VersionbitsBip8 } from "./versionbits/VersionbitsBip8";
import { VersionbitsField } from "./versionbits/VersionbitsField";
import { VersionbitsRecord } from "./versionbits/VersionbitsRecord";
import { VersionbitsThreshold } from "./versionbits/VersionbitsThreshold";
import { WalletDiscovery } from "./wallet/WalletDiscovery";
import { WalletPathLevels } from "./wallet/WalletPathLevels";
import { WalletPathSchemes } from "./wallet/WalletPathSchemes";
import { WalletSpendLayouts } from "./wallet/WalletSpendLayouts";
import { WalletXpubReach } from "./wallet/WalletXpubReach";

export interface StaticFigure {
  component: ComponentType<any>;
  props: (fixtures: unknown[]) => Record<string, unknown>;
}

/** Draws the first fixture, all of them, or none (a schematic). */
const one = (component: ComponentType<any>): StaticFigure => ({ component, props: (f) => ({ fixture: f[0] }) });
const all = (component: ComponentType<any>): StaticFigure => ({ component, props: (f) => ({ fixtures: f }) });
const none = (component: ComponentType<any>): StaticFigure => ({ component, props: () => ({}) });

export const STATIC_FIGURES: Record<string, StaticFigure> = {
  // mnemonics
  "mnemonic-card.v1": one(MnemonicCard),
  "seed-derivation.v1": one(SeedDerivation),
  "entropy-bits.v1": one(EntropyBits),
  "checksum-storyboard.v1": one(ChecksumStory),
  "wordlist-index.v1": one(WordlistIndex),
  "last-word-odds.v1": one(LastWordOdds),
  "passphrase-seeds.v1": one(PassphraseSeeds),
  "mnemonic-chain.v1": one(MnemonicChain),

  // hd-wallets
  "master-key-split.v1": one(MasterKeySplit),
  "hd-extended-key.v1": one(ExtendedKeyPlates),
  "hd-hmac-inputs.v1": one(HmacInputs),
  "hd-two-routes.v1": one(TwoRoutes),
  "hd-sharing.v1": none(HdSharing),
  "hd-weakness-story.v1": one(WeaknessStory),
  "extended-key-layout.v1": one(ExtendedKeyLayout),

  // wallet-paths
  "wallet-path-levels.v1": one(WalletPathLevels),
  "wallet-discovery.v1": one(WalletDiscovery),
  "wallet-xpub-reach.v1": one(WalletXpubReach),
  "wallet-spend-layouts.v1": none(WalletSpendLayouts),
  "wallet-path-schemes.v1": all(WalletPathSchemes),

  // derived-seeds
  "bip85-path.v1": all(Bip85Path),
  "bip85-story.v1": one(Bip85Story),
  "bip85-uses.v1": all(Bip85Uses),

  // addresses
  "address-anatomy.v1": one(AddressAnatomy),
  "address-alphabet.v1": none(AddressAlphabet),
  "address-case.v1": all(AddressCase),
  "address-polymod-story.v1": one(PolymodStory),
  "address-typo-story.v1": all(TypoStory),
  "address-two-constants.v1": all(TwoConstants),
  "address-q-weakness.v1": none(QWeakness),
  "program-regrouping.v1": all(ProgramRegrouping),
  "address-script.v1": all(ScriptOpcodes),

  // p2sh
  "p2sh-commitment.v1": one(P2shCommitment),
  "p2sh-shape.v1": all(P2shShape),
  "p2sh-failures.v1": one(P2shFailures),
  "p2sh-wrapped.v1": all(P2shWrapped),
  "p2sh-limit.v1": one(P2shLimit),

  // payment-links
  "bip321-anatomy.v1": one(Bip321Anatomy),
  "bip321-case.v1": all(Bip321Case),
  "bip321-pop.v1": all(Bip321Pop),

  // sorted-multisig
  "bip67-byte-order.v1": all(Bip67ByteOrder),
  "bip67-script-story.v1": one(Bip67ScriptStory),
  "bip48-paths.v1": all(Bip48Paths),

  // segwit
  "two-serializations.v1": one(TwoSerializations),
  "witness-field.v1": one(WitnessField),
  "witness-commitment.v1": one(WitnessCommitment),
  "nested-input.v1": one(NestedInput),
  "weight-meter.v1": all(WeightMeter),
  "sighash-reuse.v1": none(SighashReuse),
  "bip143-preimage.v1": one(Bip143Preimage),
  "amount-storyboard.v1": one(AmountStory),

  // timelocks
  "timelock-ranges.v1": one(TimelockRanges),
  "timelock-not-a-lock.v1": none(TimelockNotALock),
  "timelock-pinned-fields.v1": all(TimelockPinned),
  "timelock-sequence-bits.v1": one(TimelockSequenceBits),
  "timelock-csv-story.v1": one(TimelockCsvStory),
  "timelock-mtp.v1": none(TimelockMtp),

  // psbt
  "psbt-layout.v1": one(PsbtLayout),
  "psbt-records.v1": one(PsbtRecords),
  "psbt-signer-display.v1": one(SignerDisplay),
  "psbt-utxo-check.v1": one(UtxoCheck),
  "psbt-combine.v1": one(PsbtCombine),
  "psbt-finalize.v1": one(PsbtFinalize),
  "unknown-fields.v1": one(UnknownFields),

  // schnorr
  "schnorr-signature-layout.v1": one(SignatureLayout),
  "schnorr-byte-sizes.v1": one(ByteSizes),
  "schnorr-equation.v1": one(Equation),
  "schnorr-fail-gates.v1": all(FailGates),
  "challenge-preimage.v1": all(ChallengePreimage),
  "schnorr-even-y.v1": all(EvenY),

  // taproot
  "taproot-tweak.v1": all(TaprootTweak),
  "taproot-sigmsg.v1": one(SigMsgLayout),
  "taproot-witness-stacks.v1": one(WitnessStacks),
  "taproot-verifier-story.v1": one(VerifierStory),
  "taproot-reveals.v1": one(SpendReveals),
  "taproot-depth.v1": one(DepthProof),

  // tapscript
  "tapscript-witness.v1": one(TapscriptWitness),
  "tapscript-sig-rules.v1": all(SigRules),
  "tapscript-multisig.v1": one(MultisigChain),
  "tapscript-sig-pays.v1": all(SigPays),
  "tapscript-op-success.v1": one(OpSuccess),
  "tapscript-minimalif.v1": one(MinimalIf),

  // musig2
  "musig2-chain-view.v1": one(ChainView),
  "musig2-keyagg.v1": one(Musig2KeyAgg),
  "musig2-nonce-once.v1": one(NonceOnce),
  "musig2-psig-checks.v1": one(Musig2PsigChecks),

  // descriptors
  "descriptor-outputs.v1": one(DescriptorOutputs),
  "descriptor-sentence.v1": one(DescriptorSentence),
  "descriptor-template.v1": one(DescriptorTemplate),
  "descriptor-typo-forgery.v1": all(DescriptorTypo),
  "descriptor-expressions.v1": one(DescriptorIndex),

  // silent-payments
  "sp-address.v1": one(SpAddress),
  "sp-ecdh.v1": none(EcdhStory),
  "sp-input-eligibility.v1": one(SpEligibility),
  "sp-scan-loop.v1": one(ScanLoop),
  "sp-labels.v1": one(SpLabels),

  // message-signing
  "bip322-formats.v1": one(Bip322Formats),
  "bip322-message-hash.v1": all(Bip322Hash),
  "bip322-witness.v1": one(Bip322Witness),
  "bip322-verdicts.v1": one(Bip322Verdicts),
  "bip322-limits.v1": none(Bip322Limits),

  // block-filters
  "bf-two-directions.v1": one(BfDirections),
  "bf-element-sieve.v1": one(BfSieve),
  "bf-build-story.v1": one(BfBuildStory),
  "bf-size.v1": all(BfSize),
  "bf-peer-check.v1": none(BfPeerStory),

  // v2-transport
  "v1-v2-framing.v1": one(V2Framing),
  "v2-eavesdropper.v1": none(V2Eavesdropper),
  "v2-ellswift.v1": one(V2Ellswift),
  "v2-detect.v1": one(V2Detect),
  "v2-packet-bytes.v1": one(V2PacketBytes),
  "v2-rekey.v1": one(V2Rekey),

  // version-bits
  "versionbits-field.v1": all(VersionbitsField),
  "versionbits-threshold.v1": all(VersionbitsThreshold),
  "versionbits-record.v1": all(VersionbitsRecord),
  "versionbits-bip8.v1": one(VersionbitsBip8),
};
