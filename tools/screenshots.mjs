// Screenshot chapter states and check for horizontal overflow, page errors and
// third-party requests. Serve the built site first (pnpm build && pnpm preview).
//
//   node tools/screenshots.mjs <chapter> <outdir> '<json steps>'
//   steps: [{"name":"desktop-top","width":1440}, {"name":"hero","width":375,"height":812,
//            "figure":"#fig-a08-2","actions":[{"label":"Failure fixture"},{"click":"Next step"}]},
//           {"name":"nojs","width":1440,"figure":"#fig-a08-2","nojs":true}]
//   actions: {"label": text} checks a radio by its label; {"click": text} presses a button;
//            {"press": key}; {"focus": selector}.
// PLAYWRIGHT_MODULE overrides where Playwright is imported from (e.g. a global install).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const BASE = process.env.ATLAS_BASE ?? "http://localhost:4321";
const [chapter, outdir, stepsJson] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const browser = await chromium.launch();
const report = [];
for (const s of steps) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height ?? 900 }, javaScriptEnabled: !s.nojs, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const external = [];
  page.on("request", (r) => { if (!r.url().startsWith(BASE)) external.push(r.url()); });
  await page.goto(`${BASE}/learn/${chapter}/`, { waitUntil: "networkidle" });
  if (s.figure) {
    const el = page.locator(s.figure).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  for (const a of s.actions ?? []) {
    if (a.label) await page.getByLabel(a.label, { exact: a.exact ?? false }).first().check();
    if (a.click) await page.getByRole("button", { name: a.click }).first().click();
    if (a.press) await page.keyboard.press(a.press);
    if (a.focus) await page.locator(a.focus).first().focus();
    await page.waitForTimeout(150);
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const file = `${outdir}/${chapter}-${s.name}.png`;
  if (s.figure) await page.locator(s.figure).first().screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: !!s.full });
  report.push({ name: s.name, width: s.width, scrollWidth: sw, overflow: sw !== s.width, errors, external });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
