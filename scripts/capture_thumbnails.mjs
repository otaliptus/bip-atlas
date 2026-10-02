/**
 * Refresh homepage previews from the site's opening SVG illustrations.
 * Requires a running site and Playwright with Chromium installed:
 *   node scripts/capture_thumbnails.mjs http://127.0.0.1:4321
 * PLAYWRIGHT_MODULE can point to an existing Playwright installation.
 * The output is decorative; full diagrams and their text remain in chapters.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.argv[2] ?? "http://127.0.0.1:4321";
const root = new URL("../", import.meta.url);
const output = new URL("apps/site/public/thumbnails/", root);
await mkdir(output, { recursive: true });
const chapters = (await readdir(new URL("content/chapters/", root)))
  .filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).sort();

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const cdp = await page.context().newCDPSession(page);
  for (const chapter of chapters) {
    const response = await page.goto(new URL(`/learn/${chapter}/`, base).href, { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`Cannot load ${chapter}: ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    // Use the first illustration, choosing its wide/narrow composition to fit
    // the thumbnail. Do not squeeze a long address strip into a tiny line.
    const id = await page.locator(".atlas-chapter-hero").evaluate((hero) => {
      const drawings = [...hero.querySelectorAll(".k-drawing")];
      const first = drawings.find((svg) => svg.getBoundingClientRect().width > 0);
      if (!first) throw new Error("Opening figure has no visible SVG");
      const title = first.querySelector("title")?.textContent;
      const candidates = drawings.filter((svg) => svg.querySelector("title")?.textContent === title);
      const fit = (svg) => Math.abs(Math.log((svg.viewBox.baseVal.width / svg.viewBox.baseVal.height) / (4 / 3)));
      const best = candidates.sort((a, b) => fit(a) - fit(b))[0];
      for (let parent = best.parentElement; parent && parent !== hero; parent = parent.parentElement) {
        if (getComputedStyle(parent).display === "none") parent.style.display = "block";
      }
      return best.querySelector("title").id;
    });
    const drawing = page.locator(`.atlas-chapter-hero svg:has(title[id="${id}"])`);
    await drawing.evaluate((svg) => {
      // Preserve the figure's viewBox and aspect ratio in a consistent frame.
      Object.assign(svg.style, { width: "176px", height: "132px", maxWidth: "none", overflow: "hidden" });
      for (const node of svg.querySelectorAll("*")) node.style.vectorEffect = "none";
    });
    const bounds = await drawing.evaluate((svg) => {
      const r = svg.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    });
    // Native capture keeps exact dimensions when the layout uses fractional pixels.
    const capture = await cdp.send("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true, fromSurface: true, clip: { ...bounds, scale: 2 },
    });
    await writeFile(new URL(`${chapter}.png`, output), Buffer.from(capture.data, "base64"));
    console.log(`${chapter}.png`);
  }
} finally {
  await browser.close();
}
