import { readFileSync } from "node:fs";

const root = new URL("../../../", import.meta.url);

/**
 * The site's own build-time derive, loaded at run time so the figure tests
 * exercise exactly what the build draws (with all its fail-closed checks).
 * Loaded dynamically so the package typecheck does not pull in the site.
 */
export async function deriveChapter<T>(file: string, ids?: string[]): Promise<T[]> {
  const mod = (await import(/* @vite-ignore */ new URL("apps/site/src/lib/derive.ts", root).href)) as { deriveFixtures: (f: unknown[]) => unknown[] };
  const all = JSON.parse(readFileSync(new URL(`fixtures/${file}`, root), "utf8")).fixtures as Array<{ id: string }>;
  const picked = ids ? ids.map((id) => all.find((f) => f.id === id)!) : all;
  return mod.deriveFixtures(picked) as T[];
}
