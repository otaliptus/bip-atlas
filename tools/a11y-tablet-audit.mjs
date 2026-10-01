// Tablet layout check and accessibility-tree + keyboard audit of each chapter's hero.
// This is NOT a screen-reader session: it reads Chromium's accessibility tree
// (Playwright ariaSnapshot), drives the hero with the keyboard only, and runs axe-core.
// Serve the built site first (pnpm build && pnpm preview, or any static server for dist).
//
//   ATLAS_BASE=http://localhost:4321 AXE_PATH=/path/to/axe.min.js \
//   PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs \
//   node tools/a11y-tablet-audit.mjs <outdir> [chapter ...]
//
// Writes <outdir>/<chapter>-<width>-top.png, -hero.png, <chapter>-768-hero-state.png,
// cover-<width>-top.png and <outdir>/audit.json. AXE_PATH is optional (axe is skipped without it).
// PLATES_DIR, if set, also gets a 768 screenshot of every figure plate (for looking, not committing).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const BASE = process.env.ATLAS_BASE ?? "http://localhost:4321";
const AXE = process.env.AXE_PATH ? readFileSync(process.env.AXE_PATH, "utf8") : null;
const [outdir, ...only] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const chapters = only.length ? only : readdirSync(new URL("../content/chapters/", import.meta.url)).map((f) => f.replace(/\.json$/, "")).sort();
const SIZES = [{ width: 768, height: 1024 }, { width: 1024, height: 768 }];
const HERO = "figure.atlas-plate:has(.atlas-plate__kind)";

const browser = await chromium.launch();
const out = { base: BASE, generated: new Date().toISOString(), pages: [], heroes: [] };

// axe-core is evaluated from a local file the auditor points AXE_PATH at (trusted, not page
// content). It goes through evaluate so it also runs in a no-JS context, where page scripts are off.
async function axe(page, include) {
  if (!AXE) return null;
  return page.evaluate(async ([src, inc]) => {
    if (!window.axe) (0, eval)(src);
    const r = await window.axe.run(inc ? { include: [inc] } : document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ")) }));
  }, [AXE, include]).catch((e) => [{ id: "axe-error", impact: String(e).slice(0, 200), nodes: [] }]);
}

/** Elements that stick out of the viewport or have content clipped by overflow:hidden/clip. */
function layoutProbe() {
  const vw = document.documentElement.clientWidth;
  const sticking = [], clipped = [], scrollers = [], tinySvgText = [], spill = [];
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  for (const el of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1 && cs.position !== "fixed" && !el.closest(".atlas-skip")) {
      const scroller = el.parentElement?.closest("*");
      let p = el.parentElement, inScroll = false;
      while (p && p !== document.body) { const s = getComputedStyle(p).overflowX; if (s === "auto" || s === "scroll" || s === "hidden" || s === "clip") { inScroll = true; break; } p = p.parentElement; }
      if (!inScroll) sticking.push(name(el) + ` right=${Math.round(r.right)}`);
    }
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1) {
      if (cs.overflowX === "hidden" || cs.overflowX === "clip") clipped.push(name(el) + ` ${el.scrollWidth}>${el.clientWidth}`);
      else if (cs.overflowX === "visible" && el.closest("figure") && cs.display !== "inline") spill.push(name(el) + ` ${el.scrollWidth}>${el.clientWidth}`);
      else if (cs.overflowX === "auto" || cs.overflowX === "scroll") scrollers.push(name(el) + ` ${el.scrollWidth}>${el.clientWidth} focusable=${el.tabIndex >= 0}`);
    }
    if (el instanceof SVGTextElement) {
      const h = el.getBoundingClientRect().height;
      if (h > 0 && h < 9) tinySvgText.push(`${(el.textContent || "").slice(0, 20)} ${h.toFixed(1)}px`);
    }
  }
  return { vw, sticking: sticking.slice(0, 12), clipped: clipped.slice(0, 12), spill: spill.slice(0, 20), spillCount: spill.length, scrollers: scrollers.slice(0, 12), tinySvgText: tinySvgText.slice(0, 12), tinySvgTextCount: tinySvgText.length };
}

function svgProbe(sel) {
  const fig = document.querySelector(sel);
  return [...fig.querySelectorAll("svg")].map((s) => ({
    hidden: s.closest("[aria-hidden=true]") !== null,
    role: s.getAttribute("role"),
    label: s.getAttribute("aria-label") ?? (s.getAttribute("aria-labelledby") ? "(labelledby)" : null),
    title: s.querySelector("title")?.textContent ?? null,
    text: (s.textContent || "").trim().slice(0, 60),
    w: Math.round(s.getBoundingClientRect().width),
  }));
}

/** Attributes that carry text only AT or hover sees; checked by hand for leaks. */
function hiddenText(sel) {
  const fig = document.querySelector(sel);
  const rows = [];
  for (const el of fig.querySelectorAll("[title], [aria-label], [aria-description], [aria-valuetext]")) {
    for (const a of ["title", "aria-label", "aria-description", "aria-valuetext"]) if (el.hasAttribute(a)) rows.push(`${el.tagName.toLowerCase()}[${a}]=${el.getAttribute(a).slice(0, 90)}`);
  }
  return [...new Set(rows)];
}

function focusInfo(sel) {
  const el = document.activeElement;
  const fig = document.querySelector(sel);
  if (!el || el === document.body) return { where: "body" };
  const inside = fig.contains(el);
  const styles = [getComputedStyle(el)];
  const sib = el.nextElementSibling;
  if (el.tagName === "INPUT" && sib) styles.push(getComputedStyle(sib), getComputedStyle(sib, "::before"));
  const visible = styles.some((s) => (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none"));
  const r = (el.tagName === "INPUT" && el.closest("label") ? el.closest("label") : el).getBoundingClientRect();
  return {
    where: inside ? "hero" : "outside",
    tag: el.tagName.toLowerCase(), type: el.getAttribute("type"), role: el.getAttribute("role"),
    group: el.closest("fieldset")?.querySelector("legend")?.textContent?.trim() ?? el.closest("[role=group],[role=radiogroup],[role=tablist]")?.getAttribute("aria-label") ?? null,
    focusVisible: visible, onScreen: r.width > 0 && r.height > 0,
    key: el.id || (el.getAttribute("name") ?? "") + "|" + (el.textContent || el.closest("label")?.textContent || "").trim().slice(0, 40),
  };
}

const liveText = (sel) => [...document.querySelector(sel).querySelectorAll("[aria-live], [role=status], [role=alert], output")].map((n) => (n.textContent || "").trim().slice(0, 200));
const heroText = (sel) => (document.querySelector(sel).innerText || "").trim();

async function walkKeyboard(page, figSel, shots) {
  const log = [];
  await page.evaluate((s) => { const f = document.querySelector(s); f.tabIndex = -1; f.focus(); }, figSel);
  let tookShot = false;
  const seen = new Map();
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(60);
    const info = await page.evaluate(focusInfo, figSel);
    if (info.where !== "hero") { log.push({ stop: "left hero", ...info }); break; }
    const snap = await page.locator("*:focus").ariaSnapshot().catch(() => "?");
    const n = (seen.get(info.key) ?? 0) + 1; seen.set(info.key, n);
    if (n > 2) { log.push({ stop: "focus loop", ...info }); break; }
    const beforeText = await page.evaluate(heroText, figSel);
    const beforeLive = await page.evaluate(liveText, figSel);
    let key = null;
    if (info.type === "radio") key = "ArrowDown";
    else if (info.type === "checkbox") key = "Space";
    else if (info.role === "tab") key = "ArrowRight";
    else if (info.tag === "button" || info.role === "button" || info.tag === "summary") key = "Enter";
    else if (info.role === "treeitem") key = "ArrowRight";
    const entry = { ...info, a11y: snap.split("\n")[0].slice(0, 140) };
    if (key) {
      await page.keyboard.press(key);
      await page.waitForTimeout(200);
      const after = await page.evaluate(focusInfo, figSel);
      const afterText = await page.evaluate(heroText, figSel);
      const afterLive = await page.evaluate(liveText, figSel);
      entry.pressed = key;
      entry.changed = afterText !== beforeText;
      entry.liveChanged = JSON.stringify(afterLive) !== JSON.stringify(beforeLive);
      entry.focusAfter = after.where === "hero" ? (await page.locator("*:focus").ariaSnapshot().catch(() => "?")).split("\n")[0].slice(0, 100) : after.where;
      if (info.role === "tab") { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(150); entry.restoredTab = true; }
      if (entry.changed && !tookShot && info.role !== "tab" && shots) { await page.locator(figSel).screenshot({ path: shots }); tookShot = true; }
      if (after.where === "body") { entry.focusLost = true; await page.evaluate((s) => { const f = document.querySelector(s); f.focus(); }, figSel); }
    }
    log.push(entry);
  }
  return log;
}

/** Tab order through the hero with no actions, forwards and then backwards (Shift+Tab). */
async function tabOrder(page, figSel) {
  const fwd = [], back = [];
  await page.evaluate((s) => { const f = document.querySelector(s); f.tabIndex = -1; f.focus(); }, figSel);
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press("Tab");
    const k = await page.evaluate((s) => { const a = document.activeElement; return document.querySelector(s).contains(a) && a !== document.querySelector(s) ? (a.id || a.outerHTML.slice(0, 120)) : null; }, figSel);
    if (!k) break;
    fwd.push(k);
  }
  for (let i = 0; i < fwd.length; i++) {
    await page.keyboard.press("Shift+Tab");
    const k = await page.evaluate((s) => { const a = document.activeElement; return document.querySelector(s).contains(a) ? (a.id || a.outerHTML.slice(0, 120)) : null; }, figSel);
    if (!k) break;
    back.push(k);
  }
  return { stops: fwd.length, reversible: JSON.stringify(fwd) === JSON.stringify([...back].reverse()) };
}

/** Press each stepping button with Enter until it disables or disappears; report where focus lands. */
async function driveToEnd(page, figSel) {
  const out = [];
  const names = await page.evaluate((s) => [...document.querySelector(s).querySelectorAll("button")].filter((b) => b.offsetParent && !b.disabled && /next|down a level|check the descriptor/i.test(b.textContent)).map((b) => b.textContent.trim()), figSel);
  for (const name of [...new Set(names)]) {
    const btn = page.locator(figSel).getByRole("button", { name, exact: true }).first();
    await btn.focus();
    let presses = 0;
    for (; presses < 60; presses++) {
      const still = await page.evaluate((n) => { const a = document.activeElement; return a && a.tagName === "BUTTON" && a.textContent.trim() === n && !a.disabled; }, name);
      if (!still) break;
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(150);
    const where = await page.evaluate((s) => { const a = document.activeElement; return !a || a === document.body ? "body" : document.querySelector(s).contains(a) ? "hero" : "outside"; }, figSel);
    const what = where === "hero" ? (await page.locator("*:focus").ariaSnapshot().catch(() => "?")).split("\n")[0].slice(0, 80) : where;
    out.push({ button: name, presses, focusEndsOn: what, lost: where === "body" });
  }
  return out;
}

// ---------- cover ----------
for (const sz of SIZES) {
  const ctx = await browser.newContext({ viewport: sz, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${outdir}/cover-${sz.width}-top.png` });
  out.pages.push({ page: "/", width: sz.width, scrollWidth: sw, innerWidth: await page.evaluate(() => innerWidth), probe: await page.evaluate(layoutProbe) });
  await ctx.close();
}

for (const ch of chapters) {
  const url = `${BASE}/learn/${ch}/`;
  // ---------- tablet layout ----------
  for (const sz of SIZES) {
    const ctx = await browser.newContext({ viewport: sz, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${outdir}/${ch}-${sz.width}-top.png` });
    const hero = page.locator(HERO).first();
    await hero.scrollIntoViewIfNeeded();
    await page.waitForSelector(`${HERO} [data-hydrated=true]`, { timeout: 5000 }).catch(() => errors.push("hero did not hydrate"));
    // Static figures too: scroll the whole page so every client:visible island hydrates.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
    await page.waitForTimeout(300);
    await hero.scrollIntoViewIfNeeded();
    await hero.screenshot({ path: `${outdir}/${ch}-${sz.width}-hero.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const iw = await page.evaluate(() => innerWidth);
    const probe = await page.evaluate(layoutProbe);
    // every figure plate, for a look at static figures
    const figs = await page.locator("figure.atlas-plate").count();
    for (let i = 0; i < figs; i++) {
      const f = page.locator("figure.atlas-plate").nth(i);
      const id = await f.getAttribute("id");
      if (sz.width === 768 && process.env.PLATES_DIR) await f.screenshot({ path: `${process.env.PLATES_DIR}/${ch}-768-${id}.png` });
    }
    out.pages.push({ page: `/learn/${ch}/`, width: sz.width, scrollWidth: sw, innerWidth: iw, errors, probe });
    await ctx.close();
  }

  // ---------- hero audit: hydrated ----------
  const rec = { chapter: ch };
  {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const hero = page.locator(HERO).first();
    rec.heroId = await hero.getAttribute("id");
    const figSel = `#${rec.heroId}`;
    await hero.scrollIntoViewIfNeeded();
    await page.waitForSelector(`${figSel} [data-hydrated=true]`, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
    rec.jsAria = await hero.ariaSnapshot();
    rec.jsSvg = await page.evaluate(svgProbe, figSel);
    rec.jsHiddenText = await page.evaluate(hiddenText, figSel);
    rec.jsLive = await page.evaluate((s) => [...document.querySelector(s).querySelectorAll("[aria-live], [role=status], [role=alert], output")].map((n) => `${n.tagName.toLowerCase()}${n.className ? "." + String(n.className).split(" ")[0] : ""} aria-live=${n.getAttribute("aria-live") ?? n.getAttribute("role")}`), figSel);
    rec.keyboard = await walkKeyboard(page, figSel, `${outdir}/${ch}-768-hero-state.png`);
    rec.axeJs = await axe(page, figSel);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(figSel).scrollIntoViewIfNeeded();
    await page.waitForSelector(`${figSel} [data-hydrated=true]`, { timeout: 5000 }).catch(() => {});
    rec.tabOrder = await tabOrder(page, figSel);
    rec.driveToEnd = await driveToEnd(page, figSel);
    await ctx.close();
  }
  // ---------- hero audit: no JS ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const hero = page.locator(`#${rec.heroId}`);
    rec.nojsAria = await hero.ariaSnapshot();
    rec.nojsHydratedFlag = await hero.locator("[data-hydrated]").first().getAttribute("data-hydrated").catch(() => null);
    rec.nojsFocusables = await hero.evaluate((f) => [...f.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]")].filter((e) => !e.closest("[hidden]") && e.tabIndex >= 0).map((e) => `${e.tagName.toLowerCase()} ${(e.textContent || "").trim().slice(0, 40)}`));
    await hero.screenshot({ path: `${outdir}/${ch}-768-hero-nojs.png` });
    await ctx.close();
  }
  // axe over the whole page, JS and no JS, at 768
  for (const js of [true, false]) {
    // axe cannot run in a javaScriptEnabled:false context, so the no-JS pass strips every
    // page script instead (same DOM a no-JS reader gets: islands stay at their SSR markup).
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    if (!js) {
      await page.route("**/*", async (route) => {
        const req = route.request();
        if (req.resourceType() === "script") return route.abort();
        if (req.resourceType() !== "document") return route.continue();
        const res = await route.fetch();
        route.fulfill({ response: res, body: (await res.text()).replace(/<script\b[\s\S]*?<\/script>/gi, "") });
      });
    }
    await page.goto(url, { waitUntil: "networkidle" });
    if (js) { await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } }); await page.waitForTimeout(300); }
    rec[js ? "axePageJs" : "axePageNojs"] = await axe(page, null);
    await ctx.close();
  }
  out.heroes.push(rec);
  console.error(`done ${ch}`);
}
await browser.close();
writeFileSync(`${outdir}/audit.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.pages.map((p) => ({ page: p.page, w: p.width, sw: p.scrollWidth, overflow: p.scrollWidth !== p.innerWidth, sticking: p.probe.sticking.length, clipped: p.probe.clipped.length, spill: p.probe.spillCount, tinySvg: p.probe.tinySvgTextCount })), null, 0));
