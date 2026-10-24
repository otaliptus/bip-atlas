import { analyzeSegwitAddress } from "./bech32";

export class PaymentInstructionError extends Error {}

export interface PaymentParameter {
  rawKey: string;
  key: string;
  value: string;
  required: boolean;
}

export interface PaymentInstructionValue {
  key: string;
  value: string;
  required: boolean;
}

export interface PaymentInstructionAnalysis {
  valid: boolean;
  issues: string[];
  body: string;
  parameters: PaymentParameter[];
  instructions: PaymentInstructionValue[];
  amountSats: bigint | null;
  label: string | null;
  message: string | null;
  pop: { value: string; required: boolean } | null;
}

const supported = new Set(["amount", "label", "message", "pop", "lightning", "lno", "pay", "sp", "bc", "tb"]);
const paymentKeys = new Set(["lightning", "lno", "pay", "sp", "bc", "tb"]);
const uniqueKeys = new Set(["amount", "label", "message", "pop"]);
const browserSchemes = new Set(["http", "https", "file", "javascript", "mailto"]);
const publishedLocalCallbackSchemes = new Set(["initiatingapp", "callbackuri", "app"]);

function percentDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new PaymentInstructionError("Invalid percent encoding or UTF-8 sequence.");
  }
}

export function parseDecimalBtc(value: string): bigint {
  if (!/^(?:\d+(?:\.\d{0,8})?|\.\d{1,8})$/.test(value)) throw new PaymentInstructionError("Amount must be decimal BTC with at most eight decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const sats = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, "0"));
  if (sats > 2100000000000000n) throw new PaymentInstructionError("Amount exceeds 21 million BTC.");
  return sats;
}

export function parsePaymentInstruction(uri: string): PaymentInstructionAnalysis {
  const issues: string[] = [];
  const parameters: PaymentParameter[] = [];
  const instructions: PaymentInstructionValue[] = [];
  let body = "";
  let amountSats: bigint | null = null;
  let label: string | null = null;
  let message: string | null = null;
  let pop: PaymentInstructionAnalysis["pop"] = null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(uri)?.[1]?.toLowerCase();
  if (scheme !== "bitcoin") {
    return { valid: false, issues: ["The URI scheme is not bitcoin."], body, parameters, instructions, amountSats, label, message, pop };
  }
  const rest = uri.slice(uri.indexOf(":") + 1);
  const queryAt = rest.indexOf("?");
  body = queryAt < 0 ? rest : rest.slice(0, queryAt);
  const query = queryAt < 0 ? "" : rest.slice(queryAt + 1);
  if (query) {
    for (const part of query.split("&")) {
      if (!part) {
        issues.push("Empty query parameter.");
        continue;
      }
      const equals = part.indexOf("=");
      const rawKey = equals < 0 ? part : part.slice(0, equals);
      if (!rawKey) {
        issues.push("Query parameter has an empty key.");
        continue;
      }
      const keyWithPrefix = rawKey.toLowerCase();
      const required = keyWithPrefix.startsWith("req-");
      const key = required ? keyWithPrefix.slice(4) : keyWithPrefix;
      let value = "";
      try {
        value = percentDecode(equals < 0 ? "" : part.slice(equals + 1));
      } catch (error) {
        issues.push((error as Error).message);
        continue;
      }
      parameters.push({ rawKey, key, value, required });
      if (required && !supported.has(key)) issues.push(`Unknown required parameter “${rawKey}”.`);
      if (paymentKeys.has(key)) instructions.push({ key, value, required });
    }
  }
  if (body) instructions.unshift({ key: "onchain", value: body, required: false });
  if (!instructions.length) issues.push("An empty address body needs at least one payment instruction in the query.");
  if (body) {
    const lower = body.toLowerCase();
    if (lower.startsWith("bc1") || lower.startsWith("tb1")) {
      const hrp = lower.startsWith("bc1") ? "bc" : "tb";
      const analysis = analyzeSegwitAddress(body, hrp);
      if (analysis.hrp !== hrp) issues.push("Address body has an invalid or unexpected network prefix.");
    } else if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(body)) {
      issues.push("Address body contains characters outside the Base58 alphabet.");
    }
  }
  for (const instruction of instructions.filter((item) => item.key === "bc" || item.key === "tb")) {
    const analysis = analyzeSegwitAddress(instruction.value, instruction.key as "bc" | "tb");
    if (analysis.hrp !== instruction.key) issues.push(`Parameter “${instruction.key}” contains an address for a different network.`);
  }
  for (const key of uniqueKeys) {
    const matching = parameters.filter((parameter) => parameter.key === key);
    if (matching.length > 1) issues.push(`Parameter “${key}” must not appear more than once.`);
  }
  const amount = parameters.find((parameter) => parameter.key === "amount");
  if (amount) {
    try {
      amountSats = parseDecimalBtc(amount.value);
    } catch (error) {
      issues.push((error as Error).message);
    }
  }
  label = parameters.find((parameter) => parameter.key === "label")?.value ?? null;
  message = parameters.find((parameter) => parameter.key === "message")?.value ?? null;
  const popParameter = parameters.find((parameter) => parameter.key === "pop");
  if (popParameter) pop = { value: popParameter.value, required: popParameter.required };
  return { valid: issues.length === 0, issues, body, parameters, instructions, amountSats, label, message, pop };
}

export interface PaymentCallback {
  paymentAllowed: boolean;
  opensCallback: boolean;
  callbackUrl: string | null;
  instructionKey: string | null;
  reason: string;
}

export function buildPaymentCallback(analysis: PaymentInstructionAnalysis, method: "onchain" | "lightning", paymentInfo: string): PaymentCallback {
  const pop = analysis.pop;
  if (!pop) return { paymentAllowed: analysis.valid, opensCallback: false, callbackUrl: null, instructionKey: null, reason: "No proof-of-payment callback was requested." };
  if (!analysis.valid) return { paymentAllowed: false, opensCallback: false, callbackUrl: null, instructionKey: null, reason: "The payment instruction is invalid." };
  const scheme = pop.value.split(":", 1)[0].toLowerCase();
  if (browserSchemes.has(scheme)) {
    return { paymentAllowed: !pop.required, opensCallback: false, callbackUrl: null, instructionKey: null, reason: `The ${scheme} callback scheme must not be opened.` };
  }
  if (!publishedLocalCallbackSchemes.has(scheme)) {
    return { paymentAllowed: !pop.required, opensCallback: false, callbackUrl: null, instructionKey: null, reason: `The ${scheme || "unidentified"} callback scheme is not one of this lab's reviewed local application schemes.` };
  }
  const instructionKey = method === "onchain"
    ? analysis.body ? "onchain" : analysis.instructions.find((item) => item.key === "bc" || item.key === "tb")?.key ?? null
    : analysis.instructions.some((item) => item.key === "lightning") ? "lightning" : null;
  if (!instructionKey) {
    return { paymentAllowed: !pop.required, opensCallback: false, callbackUrl: null, instructionKey: null, reason: `No ${method} payment instruction is available for the callback.` };
  }
  return {
    paymentAllowed: true,
    opensCallback: true,
    callbackUrl: `${pop.value}${instructionKey}=${paymentInfo}`,
    instructionKey,
    reason: "Callback constructed locally from the decoded prefix and the payment method used.",
  };
}

export function evaluatePaymentCallback(uri: string, method: "onchain" | "lightning", paymentInfo: string): PaymentCallback {
  return buildPaymentCallback(parsePaymentInstruction(uri), method, paymentInfo);
}
