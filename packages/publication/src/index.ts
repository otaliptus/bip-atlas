/**
 * bip-atlas.publication.v1 — the typed article contract.
 *
 * Chapters are data only. Text fields are plain strings with two inline
 * marks (`code` and *emphasis*); markup, scripts and styles are rejected.
 * Figures name a registered recipe and approved fixture IDs; the recipe's
 * trusted code draws them and the tested model computes every exact value.
 *
 * This is a new versioned schema. It does not extend or reinterpret the
 * earlier generic publication schema.
 */

export const PUBLICATION_SCHEMA = "bip-atlas.publication.v1";
export const EVIDENCE_SCHEMA = "bip-atlas.evidence.v1";

export type ClaimScope =
  | "normative-rule"
  | "author-rationale"
  | "history"
  | "observed-implementation"
  | "computed-fixture"
  | "editorial-analysis";

export interface EvidenceSpan {
  bip: number;
  /** Auxiliary file in the BIP's directory (e.g. "bip-0174/type-registry.mediawiki"); defaults to the BIP itself. */
  file?: string;
  lines: [number, number];
  quote: string;
}

export interface Claim {
  id: string;
  statement: string;
  scope: ClaimScope;
  support: "explicit" | "inference" | "disputed" | "missing";
  evidence: EvidenceSpan[];
}

export interface EvidenceLedger {
  schemaVersion: typeof EVIDENCE_SCHEMA;
  chapterId: string;
  commit: string;
  snapshot: string;
  claims: Claim[];
}

export interface Paragraph { type: "paragraph"; text: string; claims: string[] }
export interface List { type: "list"; items: string[]; claims: string[] }
export interface Callout { type: "callout"; label: "Caveat" | "Note"; text: string; claims: string[] }
export interface Table { type: "table"; caption: string; columns: string[]; rows: string[][]; claims: string[] }
export interface FixtureTable { type: "fixture-table"; caption: string; fixtures: string[]; claims: string[] }
export interface Figure {
  type: "figure";
  figure: string;
  recipe: string;
  title: string;
  fixtures: string[];
  caption: string;
  claims: string[];
  layout: "prose" | "wide";
}
export interface Details {
  type: "details";
  summary: string;
  blocks: Array<Paragraph | List | Table | FixtureTable>;
}

export type Block = Paragraph | List | Callout | Table | FixtureTable | Figure | Details;

export interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface Publication {
  schemaVersion: typeof PUBLICATION_SCHEMA;
  chapterId: string;
  primaryBips: number[];
  specimenLabel: string;
  title: string;
  dek: string;
  authorship: "hand-authored" | "pipeline-generated";
  reviewState: "draft-unreviewed" | "in-review" | "approved";
  sourceSnapshot: string;
  opening: { blocks: Paragraph[]; figure: Figure };
  sections: Section[];
}

export type InlineSegment = { kind: "text" | "code" | "em"; value: string };

/** Split text into plain, `code` and *em* segments. Never produces markup. */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /`([^`]+)`|\*([^*]+)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) segments.push({ kind: "text", value: text.slice(last, match.index) });
    if (match[1] !== undefined) segments.push({ kind: "code", value: match[1] });
    else segments.push({ kind: "em", value: match[2] });
    last = match.index! + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments;
}

export function plainText(text: string): string {
  return parseInline(text).map((s) => s.value).join("");
}

export interface ValidationContext {
  claims: ReadonlySet<string>;
  fixtures: ReadonlySet<string>;
  recipes: ReadonlyMap<string, { maxFixtures: number; minFixtures: number }>;
}

const MARKUP = /<\/?[a-z!][^>]*>|javascript:|on[a-z]+=/i;

/** Every block in reading order, including those inside disclosures. */
export function* walkBlocks(pub: Publication): Generator<{ block: Block; path: string; inDetails: boolean }> {
  for (const [i, block] of pub.opening.blocks.entries()) yield { block, path: `opening.blocks[${i}]`, inDetails: false };
  yield { block: pub.opening.figure, path: "opening.figure", inDetails: false };
  for (const section of pub.sections) {
    for (const [i, block] of section.blocks.entries()) {
      const path = `sections.${section.id}[${i}]`;
      yield { block, path, inDetails: false };
      if (block.type === "details") {
        for (const [j, inner] of block.blocks.entries()) yield { block: inner, path: `${path}.blocks[${j}]`, inDetails: true };
      }
    }
  }
}

function textsOf(block: Block): string[] {
  switch (block.type) {
    case "paragraph": return [block.text];
    case "callout": return [block.text];
    case "list": return block.items;
    case "table": return [block.caption, ...block.columns, ...block.rows.flat()];
    case "fixture-table": return [block.caption];
    case "figure": return [block.title, block.caption];
    case "details": return [block.summary];
  }
}

/** Words on the default reading path: prose outside disclosures, not captions or tables. */
export function defaultPathWordCount(pub: Publication): number {
  let words = 0;
  for (const { block, inDetails } of walkBlocks(pub)) {
    if (inDetails) continue;
    if (block.type === "paragraph" || block.type === "callout") words += countWords(block.text);
    if (block.type === "list") words += block.items.reduce((n, item) => n + countWords(item), 0);
  }
  return words;
}

function countWords(text: string): number {
  return plainText(text).split(/\s+/).filter(Boolean).length;
}

/** Return a list of problems; an empty list means the publication is structurally valid. */
export function validatePublication(pub: Publication, ctx: ValidationContext): string[] {
  const problems: string[] = [];
  if (pub.schemaVersion !== PUBLICATION_SCHEMA) problems.push(`schemaVersion must be ${PUBLICATION_SCHEMA}`);
  if (!pub.title.endsWith("?")) problems.push("title must be a question");

  const figureIds: string[] = [];
  const sectionIds = new Set<string>();
  for (const section of pub.sections) {
    if (sectionIds.has(section.id)) problems.push(`duplicate section id ${section.id}`);
    sectionIds.add(section.id);
    if (!/^[a-z0-9-]+$/.test(section.id)) problems.push(`section id ${section.id} is not a slug`);
  }

  for (const text of [pub.title, pub.dek, pub.specimenLabel]) {
    if (MARKUP.test(text)) problems.push(`markup in header text: ${text.slice(0, 40)}`);
  }

  for (const { block, path, inDetails } of walkBlocks(pub)) {
    for (const text of textsOf(block)) {
      if (MARKUP.test(text)) problems.push(`${path}: markup is not allowed (${text.slice(0, 40)})`);
      if ((text.match(/`/g) ?? []).length % 2) problems.push(`${path}: unbalanced code mark`);
    }
    if ("claims" in block) {
      for (const id of block.claims) if (!ctx.claims.has(id)) problems.push(`${path}: unknown claim ${id}`);
      if (block.type === "paragraph" && block.claims.length === 0) problems.push(`${path}: paragraph has no claims`);
    }
    if (block.type === "figure") {
      if (inDetails) problems.push(`${path}: figures cannot live inside disclosures`);
      figureIds.push(block.figure);
      const recipe = ctx.recipes.get(block.recipe);
      if (!recipe) problems.push(`${path}: unregistered recipe ${block.recipe}`);
      else if (block.fixtures.length < recipe.minFixtures || block.fixtures.length > recipe.maxFixtures) {
        problems.push(`${path}: ${block.recipe} takes ${recipe.minFixtures}–${recipe.maxFixtures} fixtures`);
      }
      if (block.claims.length === 0) problems.push(`${path}: figure has no claims`);
    }
    if (block.type === "figure" || block.type === "fixture-table") {
      for (const id of block.fixtures) if (!ctx.fixtures.has(id)) problems.push(`${path}: unknown fixture ${id}`);
    }
    if (block.type === "table") {
      for (const row of block.rows) {
        if (row.length !== block.columns.length) problems.push(`${path}: row width differs from columns`);
      }
    }
  }

  const unique = new Set(figureIds);
  if (unique.size !== figureIds.length) problems.push("duplicate figure numbers");
  return problems;
}
