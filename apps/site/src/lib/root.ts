import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Repository root, found by walking up from the working directory to the
 * pnpm workspace file. Module-relative paths break once Astro bundles the
 * build, so content loaders use this instead.
 */
export const ROOT: string = (() => {
  let dir = process.cwd();
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not find the repository root (pnpm-workspace.yaml).");
    dir = parent;
  }
  return `${dir}/`;
})();
