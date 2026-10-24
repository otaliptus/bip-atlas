import { readFileSync } from "node:fs";
import {
  analyzePsbtExtensions,
  analyzeSegwitAddress,
  compactShortId,
  differentialIndexes,
  encodeAddrV2,
  evaluateAddrV2Entry,
  evaluatePaymentCallback,
  evaluateRbfScenario,
  measureTransaction,
  parsePaymentInstruction,
  parseTransaction,
  reconstructCompactBlock,
  validateSendAddrV2Sequence,
  type CompactResolvedTransaction,
} from "@bip-atlas/models";
import type { BaseFixture } from "@bip-atlas/figures";
import type { ExpansionLab, ExpansionPanel, ExpansionStage, ExpansionView, DerivedExpansionFixture } from "@bip-atlas/figures/expansion/types.ts";
import { ROOT } from "./root";

const sourceNote = (fixture: BaseFixture) => `${"origin" in fixture && fixture.origin === "synthetic" ? "Synthetic teaching case" : "Published example"} · BIP ${fixture.source.bip} L${fixture.source.line}.`;
const panel = (title: string, value: string, label = "value"): ExpansionPanel => ({ title, fields: [{ label, value }] });
const panels = (title: string, fields: Array<{ label: string; value: string }>): ExpansionPanel => ({ title, fields });
const stage = (id: string, title: string, status: ExpansionStage["status"], detail: string): ExpansionStage => ({ id, title, status, detail });
const pass = (title: string, detail: string) => stage(title, title, "pass", detail);
const fail = (title: string, detail: string) => stage(title, title, "fail", detail);
const pending = (title: string, detail: string) => stage(title, title, "not-reached", detail);
const lab = (stages: ExpansionLab["stages"], initialKey: string, noJsId: string, staticNote: string): ExpansionLab => ({ scenarios: [], stages, initialKey, noJsId, staticNote });
const view = (layout: ExpansionView["layout"], summary: string, panelList: ExpansionPanel[], stages: ExpansionStage[], source: string, extra: Partial<ExpansionView> = {}): ExpansionView => ({ layout, summary, panels: panelList, stages, source, ...extra });
const stageFor = (ok: boolean, title: string, detail: string) => ok ? pass(title, detail) : fail(title, detail);

function derivePayment(fixture: BaseFixture & { uri: string; expected?: string }): DerivedExpansionFixture {
  const source = sourceNote(fixture);
  const analysis = parsePaymentInstruction(fixture.uri);
  const summary = analysis.valid ? "The URI parses as a payment instruction; destination safety is a separate question." : analysis.issues.join(" ");
  const instruction = view("flow", summary, [
    panel("SCHEME", "bitcoin (case-insensitive)"),
    panel("ADDRESS BODY", analysis.body || "empty"),
    panel("PAYMENT INSTRUCTIONS", analysis.instructions.map((item) => `${item.key}${item.required ? " (required)" : ""}`).join(" · ") || "none"),
    panel("AMOUNT", analysis.amountSats === null ? "not specified" : `${analysis.amountSats} sat`),
  ], [
    stageFor(analysis.valid, "scheme", "Scheme and parameters parse"),
    stageFor(!analysis.issues.some((issue) => issue.includes("must not appear")), "duplicates", "Duplicate rules checked"),
    stageFor(!analysis.issues.some((issue) => issue.includes("Unknown required")), "required", "Unknown required parameters refused"),
    stageFor(analysis.instructions.length > 0, "instruction", "At least one instruction exists"),
  ], source);
  const method = analysis.instructions.some((item) => item.key === "lightning") ? "lightning" : "onchain";
  const paymentInfo = method === "lightning" ? "$HEX_ENCODED_PAYMENT_PREIMAGE" : "$HEX_ENCODED_TRANSACTION";
  const callback = evaluatePaymentCallback(fixture.uri, method, paymentInfo);
  const callbackView = view("gates", callback.reason, [
    panel("POP PREFIX", analysis.pop?.value ?? "not requested"),
    panel("PAYMENT METHOD", method),
    panel("CALLBACK", callback.callbackUrl ?? "not opened"),
  ], [
    stageFor(analysis.valid, "instruction", "Payment instruction validity"),
    stageFor(callback.opensCallback || callback.paymentAllowed, "scheme", "Callback scheme is allowed or optional"),
    stageFor(callback.opensCallback, "callback", "Callback can be constructed locally"),
    stageFor(callback.paymentAllowed, "payment", "Payment is not blocked by callback policy"),
  ], source);
  const amount = view("comparison", analysis.amountSats === null ? "No BTC amount is requested in this example." : `The decimal BTC amount becomes exactly ${analysis.amountSats} satoshis.`, [
    panel("DECIMAL BTC", analysis.parameters.find((parameter) => parameter.key === "amount")?.value ?? "none"),
    panel("SATOSHIS", analysis.amountSats === null ? "not computed" : `${analysis.amountSats}`),
  ], [pass("exact", "Integer conversion, no floating point")], source, {
    comparison: [{ label: "decimal BTC", left: analysis.parameters.find((parameter) => parameter.key === "amount")?.value ?? "none", right: analysis.amountSats === null ? "no satoshi value" : `${analysis.amountSats} sat` }],
  });
  const duplicates = view("gates", analysis.issues.length ? analysis.issues.join(" ") : "Known singleton keys occur once; multiple payment instructions and unknown optional keys remain allowed.", [
    panel("LABEL COUNT", String(analysis.parameters.filter((parameter) => parameter.key === "label").length)),
    panel("MESSAGE COUNT", String(analysis.parameters.filter((parameter) => parameter.key === "message").length)),
    panel("POP COUNT", String(analysis.parameters.filter((parameter) => parameter.key === "pop").length)),
    panel("AMOUNT COUNT", String(analysis.parameters.filter((parameter) => parameter.key === "amount").length)),
  ], [
    stageFor(!analysis.issues.some((issue) => issue.includes("must not appear")), "singletons", "Singleton parameters checked"),
    pass("instructions", "Payment-instruction keys may repeat"),
    pass("unknown", "Unknown optional keys may repeat and be ignored"),
  ], source);
  const history = view("comparison", "BIP 321 keeps the familiar URI shape but makes modern payment instructions and callback behavior explicit.", [
    panel("BIP 21", "Historical address + amount + label + message"),
    panel("BIP 321", "Modern instructions, duplicates, empty fallback and pop"),
  ], [pass("replacement", "BIP 321 replaces BIP 21")], source, {
    comparison: [
      { label: "query keys", left: "case-sensitive", right: "case-insensitive" },
      { label: "address body", left: "Base58 examples", right: "Base58, Bech32, Bech32m or empty with instructions" },
      { label: "new methods", left: "not standardized", right: "lightning, lno, pay, sp and future HRP keys" },
      { label: "proof", left: "no pop parameter", right: "pop or req-pop with scheme refusal" },
    ],
  });
  const examples = view("gates", summary, [panel("PUBLISHED EXAMPLE", fixture.label), panel("EXPECTED", fixture.expected ?? "valid")], analysis.issues.length ? analysis.issues.map((issue, index) => fail(`Issue ${index + 1}`, issue)) : [pass("valid", "Published valid example")], source);
  const views: DerivedExpansionFixture["derived"]["views"] = {
    overview: instruction,
    history,
    amount,
    duplicates,
    pop: callbackView,
    examples,
    [`${fixture.id}/instruction`]: instruction,
    [`${fixture.id}/callback`]: callbackView,
  };
  return {
    ...fixture,
    derived: {
      views,
      lab: lab([
        { id: "instruction", label: "Parsed instruction" },
        { id: "callback", label: "Proof callback / refusal" },
      ], `${fixture.id}|instruction`, `${fixture.id}|instruction`, "Static view: a published payment instruction, with its address body, query keys and validation result. With JavaScript you can change examples and inspect callback construction or refusal."),
    },
  };
}

let compactReferences: Record<string, CompactResolvedTransaction> | undefined;
function referencesForCompact(): Record<string, CompactResolvedTransaction> {
  if (compactReferences) return compactReferences;
  const segwit = JSON.parse(readFileSync(`${ROOT}fixtures/segwit.json`, "utf8"));
  const compact = JSON.parse(readFileSync(`${ROOT}fixtures/compact-blocks.json`, "utf8"));
  const resolve = (txHex: string): CompactResolvedTransaction => {
    const measures = measureTransaction(parseTransaction(txHex));
    return { txHex, txidHex: measures.txidHex, wtxidHex: measures.wtxidHex };
  };
  compactReferences = { "synthetic-coinbase": resolve(compact.syntheticCoinbaseHex) };
  for (const fixture of segwit.fixtures) compactReferences[fixture.id] = resolve(fixture.txHex);
  return compactReferences;
}

function deriveCompact(fixture: BaseFixture & import("@bip-atlas/models").CompactFixture): DerivedExpansionFixture {
  const source = sourceNote(fixture);
  const references = referencesForCompact();
  const result = reconstructCompactBlock(fixture, references, 2);
  const v1 = reconstructCompactBlock(fixture, references, 1);
  const savings = result.fullBlockBytes - result.compactBlockBytes;
  const overview = view("comparison", `The compact announcement is ${result.compactBlockBytes} bytes instead of ${result.fullBlockBytes}: ${savings} bytes are not sent again in this synthetic example.`, [
    panel("FULL BLOCK", `${result.fullBlockBytes} B`),
    panel("COMPACT", `${result.compactBlockBytes} B`),
    panel("NOT RESENT", `${savings} B`),
  ], [stageFor(!result.collision, "reconstruct", result.reason)], source, {
    comparison: [
      { label: "full block", left: `${result.fullBlockBytes} B`, right: "every transaction, every time" },
      { label: "compact block", left: `${result.compactBlockBytes} B`, right: "short IDs + only what is missing" },
    ],
  });
  const announce = view("packet", `Header, nonce, six-byte short IDs and any prefilled transactions arrive first. ${result.bestRtt}.`, [
    panel("SHORT IDS", `${result.shortIds.length} × 6 B`),
    panel("PREFILLED", `${fixture.transactions.filter((item) => item.prefilled).length} transactions`),
    panel("MISSING", `${result.missing.length}`),
  ], [
    pass("header", "80-byte header + 8-byte nonce"),
    pass("ids", "Six bytes per non-prefilled transaction"),
    stageFor(!result.collision, "ambiguity", "No ambiguous match accepted"),
  ], source, {
    packet: {
      perRow: 96,
      fields: [
        { id: "header", label: "header", bytes: 80, role: "hash" },
        { id: "nonce", label: "nonce", bytes: 8, role: "time" },
        { id: "shortids", label: `${result.shortIds.length} short IDs`, bytes: result.shortIds.length * 6, role: "check" },
        { id: "prefilled", label: "prefilled tx", bytes: result.prefilledBytes, role: "public" },
      ],
    },
  });
  const match = view("gates", result.collision ? "An available short ID has more than one match. The receiver cannot choose safely." : "Every short ID has at most one local match; missing entries become explicit requests.", [
    panel("LOCAL", `${result.localMatches.filter((item) => item.match).length} unique matches`),
    panel("MISSING", `${result.missing.length}`),
    panel("AMBIGUOUS", `${result.localMatches.filter((item) => item.ambiguous).length}`),
  ], result.localMatches.map((item) => stageFor(!item.ambiguous && !!item.match, item.id, item.ambiguous ? "Ambiguous: do not guess" : item.match ? `Matched ${item.match}` : "Missing: request by index")), source);
  const reconstruct = view("flow", result.reason, [
    panel("REQUEST INDEXES", result.missing.map((item) => item.index).join(", ") || "none"),
    panel("DIFFERENTIAL", result.differential.join(", ") || "none"),
    panel("RESULT", result.reconstructed?.join(" → ") ?? "full-block fallback"),
  ], [
    stageFor(!result.collision, "collision", result.collision ? "Collision requires fallback" : "No collision guessed"),
    result.collision ? pending("request", "No getblocktxn request: full-block fallback") : pass("request", result.missing.length ? "Missing transactions requested in order" : "No missing-transaction request is needed"),
    result.collision ? pending("reconstruct", "Full block is requested instead of reconstructing through ambiguity") : pass("reconstruct", "Block reconstructed in original order"),
  ], source);
  const identifiers = view("comparison", "Version 1 short IDs use txid; version 2 uses wtxid, so witness changes enter the short-ID computation.", [
    panel("V1 · TXID", v1.shortIds[0]?.hex ?? "none"),
    panel("V2 · WTXID", result.shortIds[0]?.hex ?? "none"),
  ], [pass("different", "The two identifier families are distinct")], source, {
    comparison: [
      { label: "v1", left: "txid", right: v1.shortIds[0]?.hex ?? "none" },
      { label: "v2", left: "wtxid", right: result.shortIds[0]?.hex ?? "none" },
    ],
  });
  const first = fixture.transactions.find((item) => !item.prefilled)!;
  const firstReference = references[first.ref];
  const shortId = view("flow", "One SHA-256 of header‖nonce keys SipHash-2-4; the low 48 bits become the six-byte short ID.", [
    panel("HEADER", `${fixture.headerHex.length / 2} B`),
    panel("NONCE", fixture.nonceHex),
    panel("TX ID", `${firstReference.wtxidHex.slice(0, 16)}…`),
    panel("SHORT ID", result.shortIds[0]?.hex ?? compactShortId(fixture.headerHex, fixture.nonceHex, firstReference.wtxidHex)),
  ], [pass("siphash", "SipHash-2-4 with a per-connection key"), pass("truncate", "Only 48 bits remain; this is not a unique transaction ID")], source);
  const flow = view("comparison", "High-bandwidth mode can announce short IDs immediately; low-bandwidth mode first asks for the compact block. Missing transactions add a round trip in either mode.", [
    panel("HIGH", result.missing.length ? "1.5*RTT best case with a miss" : "0.5*RTT best case"),
    panel("LOW", result.missing.length ? "2.5*RTT best case with a miss" : "1.5*RTT best case"),
  ], [pass("savings", "Both modes avoid resending known transactions")], source, {
    comparison: [
      { label: "high-bandwidth", left: "short IDs in the announcement", right: result.missing.length ? "request missing transactions" : "reconstruct immediately" },
      { label: "low-bandwidth", left: "request compact block first", right: result.missing.length ? "another round trip for the miss" : "no further transaction request" },
    ],
  });
  const indexExample = [0, 1, 3, 10];
  const indexes = view("flow", `Differential indexes compress gaps, not positions. The example ${indexExample.join(", ")} becomes ${differentialIndexes(indexExample).join(", ")}.`, [
    panel("ABSOLUTE", indexExample.join(" → ")),
    panel("DIFFERENTIAL", differentialIndexes(indexExample).join(" → ")),
    panel("THIS EXAMPLE", result.differential.join(", ") || "no missing indexes"),
  ], [pass("previous", "Previous index starts at −1"), pass("delta", "Delta = index − previous − 1")], source);
  const collision = view("gates", result.collision ? result.reason : "This scenario has no ambiguous match. A short-ID collision would force a safe fallback, not a guessed transaction.", [
    panel("MATCHES", `${result.localMatches.filter((item) => item.ambiguous).length} ambiguous`),
    panel("FALLBACK", result.fallback ? "full block" : "not needed"),
  ], [
    stageFor(!result.collision, "ambiguity", result.collision ? "More than one candidate matches" : "No ambiguous match in this scenario"),
    stageFor(!result.fallback, "continue", result.fallback ? "Do not reconstruct through ambiguity" : "Reconstruction can proceed"),
  ], source);
  const views: DerivedExpansionFixture["derived"]["views"] = {
    overview,
    "short-id": shortId,
    flow,
    indexes,
    collision,
    [`${fixture.id}/announce`]: announce,
    [`${fixture.id}/match`]: match,
    [`${fixture.id}/reconstruct`]: reconstruct,
    [`${fixture.id}/identifiers`]: identifiers,
  };
  return {
    ...fixture,
    derived: {
      views,
      lab: lab([
        { id: "announce", label: "Announcement" },
        { id: "match", label: "Local matching" },
        { id: "reconstruct", label: "Reconstruction" },
        { id: "identifiers", label: "txid vs wtxid" },
      ], `${fixture.id}|announce`, "compact-one-missing|reconstruct", "Static view: one missing transaction, its requested index and the reconstructed block. With JavaScript you can compare scenarios and txid/wtxid short IDs."),
    },
  };
}

function deriveRbf(fixture: BaseFixture & import("@bip-atlas/models").RbfScenario): DerivedExpansionFixture {
  const source = sourceNote(fixture);
  const result = evaluateRbfScenario(fixture);
  const gateDetails = new Map(result.gates.map((gate) => [gate.id, gate.detail]));
  const overview = view("gates", result.valid ? "This replacement passes every BIP 125 gate in the synthetic scenario. That still does not guarantee relay or confirmation." : `Replacement stops at ${result.failedGate}: ${gateDetails.get(result.failedGate!)}`, [
    panel("ORIGINAL FEE", `${result.originalFeeSats} sat`),
    panel("CANDIDATE FEE", `${fixture.candidate.feeSats} sat`),
    panel("REQUIRED", `${result.requiredFeeSats} sat`),
    panel("SIGNAL", result.signal),
  ], result.gates.map((gate) => stageFor(gate.ok, gate.id, gate.detail)), source);
  const signals = view("comparison", `Replaceability can be explicit in one input’s nSequence or inherited from an unconfirmed ancestor. This example: ${result.signal}.`, [
    panel("EXPLICIT", result.signal === "explicit" || result.signal === "both" ? "present" : "not present"),
    panel("INHERITED", result.signal === "inherited" || result.signal === "both" ? "present" : "not present"),
  ], [stageFor(result.signal !== "none", "opt-in", "An opt-in exists in the required ancestry")], source, {
    comparison: [
      { label: "explicit", left: "nSequence < 0xfffffffe", right: "one input is enough" },
      { label: "inherited", left: "an ancestor opted in", right: "that ancestor must remain unconfirmed" },
    ],
  });
  const fees = view("comparison", `Required total = original fees + bandwidth bump. ${result.requiredFeeSats} = ${result.originalFeeSats} + ${result.bandwidthBumpSats} satoshis.`, [
    panel("ORIGINAL TOTAL", `${result.originalFeeSats} sat`),
    panel("BANDWIDTH BUMP", `${fixture.candidate.vbytes} vB × ${fixture.minRelayFeeRate} = ${result.bandwidthBumpSats} sat`),
    panel("CANDIDATE", `${fixture.candidate.feeSats} sat`),
  ], [
    stageFor(fixture.candidate.feeSats >= result.originalFeeSats, "absolute", "Absolute fee does not decrease"),
    stageFor(fixture.candidate.feeSats >= result.requiredFeeSats, "bandwidth", "Bandwidth bump is fully paid"),
  ], source, {
    comparison: [
      { label: "original fees", left: `${result.originalFeeSats} sat`, right: "sum of originals" },
      { label: "bandwidth", left: `${result.bandwidthBumpSats} sat`, right: `${fixture.candidate.vbytes} vB at ${fixture.minRelayFeeRate} sat/vB` },
      { label: "required", left: `${result.requiredFeeSats} sat`, right: `candidate has ${fixture.candidate.feeSats} sat` },
    ],
  });
  const policy = view("gates", "BIP 125 is opt-in full-RBF signaling policy. A passing replacement can still fail to propagate, and a recipient may wait for confirmation.", [
    panel("POLICY", "Mempool replacement, not consensus"),
    panel("RECIPIENT", "Unconfirmed payment needs caution"),
    panel("CONFIRMATION", "Not guaranteed"),
  ], [
    pass("policy", "Policy is explicitly not a consensus rule"),
    pass("receiver", "Recipients may treat opt-in transactions as unconfirmed"),
    pass("propagation", "Replacement is not a propagation guarantee"),
  ], source);
  const examples = view("gates", result.valid ? "Every gate passes in this synthetic replacement." : `This synthetic replacement fails at ${result.failedGate}.`, [
    panel("ORIGINALS", `${fixture.originals.length}`),
    panel("EVICTIONS", `${fixture.evictedCount}`),
    panel("RESULT", result.valid ? "accepted by the model" : "refused by the model"),
  ], result.gates.map((gate) => stageFor(gate.ok, gate.id, gate.detail)), source);
  const views: DerivedExpansionFixture["derived"]["views"] = {
    overview,
    signals,
    fees,
    policy,
    examples,
    [`${fixture.id}/overview`]: overview,
  };
  for (const gate of result.gates) {
    views[`${fixture.id}/${gate.id}`] = view("gates", gate.detail, [
      panel("ORIGINAL FEE", `${result.originalFeeSats} sat`),
      panel("CANDIDATE FEE", `${fixture.candidate.feeSats} sat`),
      panel("REQUIRED", `${result.requiredFeeSats} sat`),
    ], result.gates.map((other) => stageFor(other.ok, other.id, other.id === gate.id ? gate.detail : other.detail)), source);
  }
  return {
    ...fixture,
    derived: {
      views,
      lab: lab([
        { id: "overview", label: "Replacement overview" },
        { id: "signal", label: "01 · Opt-in" },
        { id: "inputs", label: "02 · Inputs" },
        { id: "absolute-fee", label: "03 · Absolute fee" },
        { id: "bandwidth", label: "04 · Bandwidth" },
        { id: "evictions", label: "05 · Evictions" },
      ], `${fixture.id}|overview`, "rbf-low-bandwidth-bump|bandwidth", "Static view: a replacement whose fee rate rises but whose absolute bandwidth bump is too small. With JavaScript you can inspect every gate and its arithmetic."),
    },
  };
}

function deriveAddrV2(fixture: BaseFixture & import("@bip-atlas/models").AddrV2Entry & { expected?: string }): DerivedExpansionFixture {
  const source = sourceNote(fixture);
  const verdict = evaluateAddrV2Entry(fixture);
  let packetHex = "";
  let packetError = "";
  try {
    packetHex = encodeAddrV2([fixture]);
  } catch (error) {
    packetError = (error as Error).message;
  }
  const fields = view("packet", packetError || "One synthetic addrv2 entry, split into time, services, network ID, address length, address bytes and port.", [
    panel("TIME", String(fixture.time)),
    panel("SERVICES", String(fixture.services)),
    panel("NETWORK ID", `0x${fixture.networkId.toString(16).padStart(2, "0")}`),
    panel("ADDRESS", `${fixture.addressHex.length / 2} B`),
    panel("PORT", String(fixture.port)),
  ], [
    stageFor(!packetError, "structure", packetError || "Packet serializes with minimal CompactSize"),
    stageFor(verdict.outcome !== "reject", "network", verdict.reason),
  ], source, {
    packet: {
      perRow: 32,
      fields: [
        { id: "time", label: "time", bytes: 4, role: "time" },
        { id: "services", label: "services", bytes: fixture.services < 0xfd ? 1 : 3, role: "net" },
        { id: "network", label: "network ID", bytes: 1, role: "net" },
        { id: "addr-len", label: "addr length", bytes: fixture.addressHex.length / 2 < 0xfd ? 1 : 3, role: "check" },
        { id: "address", label: "address", bytes: fixture.addressHex.length / 2, role: "public" },
        { id: "port", label: "port", bytes: 2, role: "net" },
      ],
    },
    notes: packetHex ? [`Packet: ${packetHex}`] : undefined,
  });
  const validation = view("gates", verdict.reason, [
    panel("NETWORK", `0x${fixture.networkId.toString(16).padStart(2, "0")}`),
    panel("EXPECTED LENGTH", `${fixture.addressHex.length / 2} B`),
    panel("OUTCOME", verdict.outcome.toUpperCase()),
  ], [
    stageFor(verdict.outcome !== "reject", "length", verdict.outcome === "reject" ? verdict.reason : "Address length and structure are accepted"),
    stageFor(verdict.outcome !== "reject", "network", verdict.reason),
    stageFor(verdict.outcome === "accept", "receive", verdict.outcome === "accept" ? "Accepted by the teaching model" : verdict.reason),
  ], source);
  const networks = view("comparison", "Each reserved network ID has one exact address length. Unknown IDs are not an invitation to invent a new format.", [
    panel("FIXED IDS", "01 IPv4 · 02 IPv6 · 03 Tor v2 · 04 Tor v3 · 05 I2P · 06 CJDNS · 07 Yggdrasil"),
    panel("LENGTHS", "4 · 16 · 10 · 32 · 32 · 16 · 16 bytes"),
  ], [pass("registry", "Network IDs and lengths come from BIP 155")], source, {
    comparison: [
      { label: "01 / 02", left: "IPv4 4 B · IPv6 16 B", right: "ordinary internet addresses" },
      { label: "03 / 04", left: "Tor v2 10 B · Tor v3 32 B", right: "v2 ignored; v3 accepted with 32-byte pubkey" },
      { label: "05 / 06 / 07", left: "I2P 32 B · CJDNS 16 B · Yggdrasil 16 B", right: "overlay-network-specific rules" },
    ],
  });
  const negotiation = view("flow", "sendaddrv2 belongs between version and verack. Older peers keep receiving legacy addr messages without the new address types.", [
    panel("VERSION", "peer announces capabilities"),
    panel("SENDADDRV2", "prefer addrv2 messages"),
    panel("VERACK", "only now may addrv2 arrive"),
  ], [
    stageFor(validateSendAddrV2Sequence(["version", "sendaddrv2", "verack"]).valid, "order", "version → sendaddrv2 → verack"),
    pass("legacy", "Legacy addr remains the fallback for older peers"),
  ], source);
  const reserved = view("gates", "Tor v2 is no longer relayed. IPv4-in-IPv6 and OnionCat forms use their own canonical IDs instead of being treated as ordinary IPv6 peers.", [
    panel("TOR V2", "ignore on receive; do not relay"),
    panel("IPV4-IN-IPV6", "ignore as IPv6; use IPv4"),
    panel("ONIONCAT", "ignore as IPv6; use Tor’s network ID"),
  ], [
    pass("deprecated", "Deprecated forms are ignored, not guessed"),
    pass("canonical", "Canonical network IDs prevent duplicate peer identities"),
  ], source);
  const limits = view("gates", "A decodable packet is not proof that an endpoint exists, is reachable or is safe to contact. addrv2 also caps count and address size.", [
    panel("COUNT", "at most 1,000 addresses"),
    panel("ADDRESS SIZE", "at most 512 bytes"),
    panel("REACHABILITY", "not established"),
  ], [
    pass("count", "Message count limit"),
    pass("size", "Per-address size limit"),
    pass("reachability", "No reachability or ownership claim"),
  ], source);
  const views: DerivedExpansionFixture["derived"]["views"] = {
    overview: fields,
    networks,
    negotiation,
    reserved,
    limits,
    [`${fixture.id}/fields`]: fields,
    [`${fixture.id}/validation`]: validation,
  };
  return {
    ...fixture,
    derived: {
      views,
      lab: lab([
        { id: "fields", label: "Packet fields" },
        { id: "validation", label: "Acceptance / refusal" },
      ], `${fixture.id}|fields`, "addr-wrong-length|validation", "Static view: a Tor v3-shaped entry with the wrong address length, stopped at validation. With JavaScript you can inspect other networks and outcomes."),
    },
  };
}

function derivePsbt(fixture: BaseFixture & { hex: string; expected?: string }): DerivedExpansionFixture {
  const source = sourceNote(fixture);
  const analysis = analyzePsbtExtensions(fixture.hex);
  const recordPanels = (records: typeof analysis.records, limit = 6) => records.slice(0, limit).map((record) => panel(record.name, record.reading ?? `${record.valueHex.length / 2} bytes`, `0x${record.keyType.toString(16).padStart(2, "0")}`));
  const overview = view("gates", analysis.valid ? `PSBTv${analysis.version}: ${analysis.records.length} records pass this structural teaching model. That does not make the transaction safe to sign.` : analysis.errors.slice(0, 2).join(" "), [
    panel("VERSION", analysis.version === null ? "unparsed" : `PSBTv${analysis.version}`),
    panel("RECORDS", `${analysis.records.length}`),
    panel("LOCKTIME", analysis.locktime ? `${analysis.locktime.kind} ${analysis.locktime.value}` : "v0 unsigned transaction"),
  ], [
    stageFor(analysis.valid, "records", analysis.valid ? "Map and field structure accepted" : analysis.errors[0] ?? "Invalid records"),
    stageFor(analysis.valid, "scope", "Parsing is not a signing-safety decision"),
  ], source);
  const globals = view("flow", "PSBTv2 moves transaction construction out of one global unsigned transaction and into explicit global, input and output records.", recordPanels(analysis.records.filter((record) => record.family === "global-v2" && record.scope === "global")), [
    stageFor(analysis.valid, "globals", analysis.valid ? "Required global fields and counts agree" : analysis.errors[0] ?? "Invalid globals"),
  ], source);
  const v2 = view("comparison", "PSBTv2 excludes the old global unsigned transaction. Inputs and outputs carry their own previous-output and creation data instead.", [
    panel("PSBTV0", "One global unsigned transaction + per-input/output maps"),
    panel("PSBTV2", "Version, counts, transaction fields and modifiable flags"),
  ], [pass("version", "The next PSBT version after v0 is v2")], source, {
    comparison: [
      { label: "unsigned tx", left: "required in v0", right: "excluded in v2" },
      { label: "counts", left: "read from unsigned tx", right: "explicit input/output count fields" },
      { label: "construction", left: "fixed global transaction", right: "inputs and outputs can be added" },
    ],
  });
  const taproot = view("flow", "Taproot fields tell a signer about internal keys, Merkle roots, leaf scripts, signatures and derivation paths—in either PSBT version.", recordPanels(analysis.records.filter((record) => record.family === "taproot")), [
    stageFor(analysis.valid, "taproot", analysis.valid ? "Taproot field shapes and trees decode" : analysis.errors[0] ?? "Invalid Taproot field"),
  ], source);
  const musigRecords = analysis.records.filter((record) => record.family === "musig2");
  const nonceCount = musigRecords.filter((record) => record.keyType === 0x1b).length;
  const partialCount = musigRecords.filter((record) => record.keyType === 0x1c).length;
  const round = partialCount ? "Participant keys, public nonces and partial signatures are present in this published vector." : nonceCount ? "Participant keys and public nonces are present; this vector has no partial signatures." : "Only the participant list is present; this vector has no public nonces or partial signatures.";
  const musig2 = view("flow", `${round} These are records, not a signing coordinator.`, recordPanels(musigRecords, musigRecords.length), [
    stageFor(analysis.valid, "musig2", analysis.valid ? `${nonceCount} public nonces and ${partialCount} partial signatures decoded` : analysis.errors[0] ?? "Invalid MuSig2 field"),
  ], source);
  const records = view("gates", analysis.valid ? "Every published record in this vector has a readable scope and field shape." : analysis.errors.slice(0, 2).join(" "), recordPanels(analysis.records), [
    stageFor(analysis.valid, "version", analysis.valid ? "Version and required fields are present" : analysis.errors[0] ?? "Invalid version or required fields"),
    stageFor(analysis.valid, "records", analysis.valid ? "Known record shapes decode" : analysis.errors[0] ?? "Invalid record shape"),
  ], source);
  const validation = view("gates", analysis.valid ? "This published vector passes the structural and field-specific checks." : analysis.errors.slice(0, 3).join(" "), analysis.errors.length ? analysis.errors.slice(0, 5).map((error, index) => panel(`ERROR ${index + 1}`, error)) : [panel("VALIDATION", "No errors")], analysis.errors.length ? analysis.errors.map((error, index) => fail(`Error ${index + 1}`, error)) : [pass("valid", "Published valid vector")], source);
  const locktime = view("gates", analysis.locktime ? `The selected locktime is ${analysis.locktime.value} (${analysis.locktime.kind}).` : "PSBTv0 carries an unsigned transaction; this chapter does not recompute its locktime from extension fields.", [
    panel("HEIGHT POSSIBLE", analysis.locktime?.kind === "height" ? "chosen" : "not chosen"),
    panel("TIME POSSIBLE", analysis.locktime?.kind === "time" ? "chosen" : "not chosen"),
    panel("RESULT", analysis.locktime ? String(analysis.locktime.value) : "PSBTv0"),
  ], [
    stageFor(!!analysis.locktime, "locktime", analysis.locktime ? `${analysis.locktime.kind} locktime ${analysis.locktime.value}` : "No v2 locktime computation in this vector"),
  ], source);
  const examples = view("gates", analysis.valid ? "Published valid example: the records decode." : "Published invalid example: validation stops at the first reported reason.", [
    panel("EXPECTED", fixture.expected ?? "valid"),
    panel("RECORDS", `${analysis.records.length}`),
  ], analysis.errors.length ? analysis.errors.map((error, index) => fail(`Error ${index + 1}`, error)) : [pass("valid", "Matches the published expectation")], source);
  const views: DerivedExpansionFixture["derived"]["views"] = {
    overview,
    globals,
    v2,
    taproot,
    musig2,
    records,
    validation,
    locktime,
    examples,
    [`${fixture.id}/records`]: records,
    [`${fixture.id}/validation`]: validation,
    [`${fixture.id}/locktime`]: locktime,
  };
  return {
    ...fixture,
    derived: {
      views,
      lab: lab([
        { id: "records", label: "Record inspector" },
        { id: "validation", label: "Validation" },
        { id: "locktime", label: "Locktime" },
      ], "bip370-25-1-input-2-output-psbtv2-required-fields-only|records", "bip370-25-1-input-2-output-psbtv2-required-fields-only|records", "Static view: a valid PSBTv2 with its required global, input and output fields. With JavaScript you can inspect Taproot and MuSig2 records and invalid published cases."),
    },
  };
}

export function deriveExpansionFixture(fixture: BaseFixture): DerivedExpansionFixture {
  let derived: DerivedExpansionFixture;
  if (fixture.kind === "payment-instruction") derived = derivePayment(fixture as BaseFixture & { uri: string; expected?: string });
  else if (fixture.kind === "compact-block") derived = deriveCompact(fixture as BaseFixture & import("@bip-atlas/models").CompactFixture);
  else if (fixture.kind === "rbf-case") derived = deriveRbf(fixture as BaseFixture & import("@bip-atlas/models").RbfScenario);
  else if (fixture.kind === "addrv2") derived = deriveAddrV2(fixture as BaseFixture & import("@bip-atlas/models").AddrV2Entry & { expected?: string });
  else if (fixture.kind === "psbt-extension") derived = derivePsbt(fixture as BaseFixture & { hex: string; expected?: string });
  else throw new Error(`No expansion derivation for ${fixture.kind}`);
  const motifs = { "payment-instruction": "instruction", "compact-block": "relay", "rbf-case": "replacement", addrv2: "network", "psbt-extension": "records" } as const;
  derived.derived.views.overview.motif = motifs[fixture.kind as keyof typeof motifs];
  return derived;
}
