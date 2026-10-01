/**
 * Build-time content loading. Everything is validated here, and any problem
 * stops the build: an invalid chapter is never rendered.
 */
import { readFileSync, readdirSync } from "node:fs";
import { RECIPE_MAP, type BaseFixture } from "@bip-atlas/figures";
import {
  validatePublication,
  walkBlocks,
  type Claim,
  type EvidenceLedger,
  type Publication,
} from "@bip-atlas/publication";

import { ROOT } from "./root";
const readJson = <T>(path: string): T => JSON.parse(readFileSync(ROOT + path, "utf8")) as T;

export interface SourceLockEntry {
  number: number;
  path: string;
  title: string;
  headersRaw: Record<string, string>;
  statusRaw: string;
  readerUrl: string;
  canonicalUrl: string;
}
export interface SourceLock {
  repository: string;
  commit: string;
  retrievedAt: string;
  sources: SourceLockEntry[];
  files: Array<{ path: string; gitBlob: string; sha256: string; bytes: number }>;
}
export interface ExternalLock {
  retrievedAt: string;
  files: Array<{ file: string; repository: string; commit: string; path: string; sha256: string; citedBy: { bip: number; line: number } }>;
}

export interface CatalogChapter {
  id: string;
  primaryBips: number[];
  phase: number;
  readingOrder: number;
  questionTitle: string;
  releaseState: string;
}
export interface Catalog {
  projectName: string;
  observedResearchCommit: string;
  chapters: CatalogChapter[];
}

export function loadCatalog(): Catalog {
  return readJson<Catalog>("catalog.json");
}

export function loadExternalLock(): ExternalLock {
  return readJson<ExternalLock>("sources/external/external.lock.json");
}

/** Chapters that have publication content, in catalog reading order. */
export function listChapterIds(): string[] {
  const present = new Set(
    readdirSync(ROOT + "content/chapters").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")),
  );
  return loadCatalog().chapters.filter((c) => present.has(c.id)).sort((a, b) => a.readingOrder - b.readingOrder).map((c) => c.id);
}

/** Anchor id for the citation marker of the block at `path` (a walkBlocks path). */
export const citeAnchor = (path: string) => `cite-${path.replace(/[^A-Za-z0-9]+/g, "-").replace(/-$/, "")}`;

export interface Citation {
  anchor: string;
  /** Where the citing text sits, for the back-link's accessible name. */
  where: string;
}

export interface LoadedChapter {
  publication: Publication;
  ledger: EvidenceLedger;
  fixtures: Map<string, BaseFixture>;
  lock: SourceLock;
  /** Claims in order of first citation, numbered from 1. */
  citedClaims: Array<Claim & { number: number }>;
  claimNumbers: Map<string, number>;
  /** Every place each claim is cited, in reading order. */
  citations: Map<string, Citation[]>;
}

const cache = new Map<string, LoadedChapter>();

export function loadChapter(id: string): LoadedChapter {
  const hit = cache.get(id);
  if (hit) return hit;
  const publication = readJson<Publication>(`content/chapters/${id}.json`);
  const ledger = readJson<EvidenceLedger>(`content/evidence/${id}.json`);
  const fixtureList = readJson<{ fixtures: BaseFixture[] }>(`fixtures/${id}.json`).fixtures;
  const fixtures = new Map(fixtureList.map((f) => [f.id, f]));
  const lock = readJson<SourceLock>(`${publication.sourceSnapshot}/sources.lock.json`);

  const problems = validatePublication(publication, {
    claims: new Set(ledger.claims.map((c) => c.id)),
    fixtures: new Set(fixtures.keys()),
    recipes: RECIPE_MAP,
  });
  if (ledger.commit !== lock.commit) problems.push("evidence ledger and source lock name different commits");
  if (problems.length) throw new Error(`Chapter ${id} failed validation:\n- ${problems.join("\n- ")}`);

  const claimNumbers = new Map<string, number>();
  const citations = new Map<string, Citation[]>();
  const headings = new Map(publication.sections.map((s) => [s.id, s.heading]));
  for (const { block, path } of walkBlocks(publication)) {
    if (!("claims" in block)) continue;
    const section = /^sections\.([^[]+)/.exec(path)?.[1];
    const place = section ? headings.get(section)! : "Opening";
    const where = block.type === "figure" ? `Fig. ${block.figure} caption` : place;
    for (const c of block.claims) {
      if (!claimNumbers.has(c)) claimNumbers.set(c, claimNumbers.size + 1);
      citations.set(c, [...(citations.get(c) ?? []), { anchor: citeAnchor(path), where }]);
    }
  }
  const byId = new Map(ledger.claims.map((c) => [c.id, c]));
  const citedClaims = [...claimNumbers].map(([cid, number]) => ({ ...byId.get(cid)!, number }));
  const loaded = { publication, ledger, fixtures, lock, citedClaims, claimNumbers, citations };
  cache.set(id, loaded);
  return loaded;
}

export const shortCommit = (commit: string) => commit.slice(0, 7);

export function sourceLineUrl(lock: SourceLock, bip: number, lines: [number, number], auxFile?: string): string {
  const file = auxFile ?? `bip-${String(bip).padStart(4, "0")}.mediawiki`;
  const anchor = lines[0] === lines[1] ? `L${lines[0]}` : `L${lines[0]}-L${lines[1]}`;
  return `https://github.com/bitcoin/bips/blob/${lock.commit}/${file}?plain=1#${anchor}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
