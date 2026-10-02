import type { DescriptorDerived, DescriptorTokenRole } from "../types";

type Token = DescriptorDerived["tokens"][number];

export type DescNode =
  | { kind: "fn"; name: string; children: DescNode[] }
  | { kind: "tree"; children: DescNode[] }
  | { kind: "key"; index: number; parts: Array<{ role: DescriptorTokenRole; text: string }> }
  | { kind: "num"; text: string }
  | { kind: "text"; text: string };

/**
 * Rebuild the nesting of a parsed descriptor from its derived tokens: a
 * function and its parenthesis open a box, braces open a script-tree box,
 * consecutive tokens of one key form one key. Throws on anything unbalanced,
 * so a drawing can never show a shape the parser did not produce.
 */
export function descTree(tokens: Token[]): DescNode {
  const root: DescNode = { kind: "tree", children: [] };
  const stack: DescNode[] = [root];
  const top = () => stack[stack.length - 1] as Extract<DescNode, { children: DescNode[] }>;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.role === "hash" || t.role === "checksum") break;
    if (t.role === "fn") {
      if (tokens[i + 1]?.text !== "(") throw new Error(`descriptor token ${t.text} is not followed by "("`);
      const n: DescNode = { kind: "fn", name: t.text, children: [] };
      top().children.push(n);
      stack.push(n);
      i++;
    } else if (t.role === "punct") {
      if (t.text === "{") {
        const n: DescNode = { kind: "tree", children: [] };
        top().children.push(n);
        stack.push(n);
      } else if (t.text === ")" || t.text === "}") {
        if (stack.length < 2) throw new Error("unbalanced descriptor");
        stack.pop();
      } else if (t.text !== ",") throw new Error(`unexpected punctuation ${t.text}`);
    } else if (t.key !== null) {
      const last = top().children.at(-1);
      if (last && last.kind === "key" && last.index === t.key) last.parts.push({ role: t.role, text: t.text });
      else top().children.push({ kind: "key", index: t.key, parts: [{ role: t.role, text: t.text }] });
    } else if (t.role === "num") top().children.push({ kind: "num", text: t.text });
    else top().children.push({ kind: "text", text: t.text });
  }
  if (stack.length !== 1 || root.kind !== "tree" || root.children.length !== 1) throw new Error("a descriptor is one top-level script expression");
  return root.children[0];
}

/** Long keys shortened for drawing (the exact text goes in a disclosure). */
export function shortKey(text: string): string {
  return text.length > 14 ? `${text.slice(0, text.startsWith("xp") || text.startsWith("tp") ? 12 : 8)}…` : text;
}

/** Hardened steps written with ' are shown with a prime, as in the rest of the book. */
export const prime = (s: string) => s.replace(/'/g, "′");
