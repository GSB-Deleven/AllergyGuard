#!/usr/bin/env node
// Creates the screenshots used in README.md and the wiki (docs/screenshots/).
// Needs Playwright (npx playwright install chromium) and a local web server:
//   python3 -m http.server 8765 &
//   node tools/screenshots.mjs
// Open Food Facts is replaced by the test fixture, so the pictures are reproducible.

import { readFileSync, mkdirSync } from "node:fs";

const { chromium, devices } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.BASE_URL || "http://localhost:8765/";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const fixture = JSON.parse(readFileSync(new URL("../tests/fixtures/off-galletas.json", import.meta.url), "utf8"));

const person = { id: "lena", name: "Lena", allergens: { milk: "avoidTraces" }, createdAt: "2026-01-01T00:00:00Z" };
const now = Date.now();
const seed = {
  version: 1, onboarded: true, people: [person], activeId: "lena", queue: [], products: {}, recentPlaces: ["ES|ES-IB"],
  place: { countryId: "ES", regionId: "ES-IB" }, lastBackupAt: new Date().toISOString(),
  history: [
    { id: "1", at: new Date(now - 120000).toISOString(), name: "Hafer-Drink Barista", verdict: "safe", personId: "lena", personName: "Lena", barcode: "0000000000024" },
    { id: "2", at: new Date(now - 3600000 * 3).toISOString(), name: "Galletas María", verdict: "unsafe", personId: "lena", personName: "Lena", barcode: "0000000000017" },
    { id: "3", at: new Date(now - 86400000).toISOString(), name: "Chocolate negro 70 %", verdict: "caution", personId: "lena", personName: "Lena", barcode: "0000000000031" },
  ],
};

const browser = await chromium.launch();
async function shoot(name, hash, { dark = false, fresh = false, prepare } = {}) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "de-CH", colorScheme: dark ? "dark" : "light", serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: fixture }));
  await page.route("https://images.openfoodfacts.org/**", (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto(BASE);
  if (!fresh) await page.evaluate((s) => localStorage.setItem("allergyguard.v1", JSON.stringify(s)), seed);
  await page.goto(BASE + hash);
  await page.reload();
  await page.waitForSelector("main h1, main .hero-btn");
  if (prepare) await prepare(page);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector(".toast")?.remove());
  await page.screenshot({ path: `${OUT}${name}.png` });
  await ctx.close();
}

await shoot("01-start", "#/start");
await shoot("02-willkommen", "#/start", { fresh: true });
await shoot("03-spuren", "#/start", { fresh: true, prepare: async (p) => {
  await p.click("[data-next]"); await p.fill("#ob-name", "Lena"); await p.click("[data-next]");
  await p.click('[data-allergen="milk"]'); await p.click("[data-next]");
} });
await shoot("04-ergebnis", "#/result/0000000000017", { prepare: (p) => p.waitForSelector(".verdict") });
await shoot("05-karte", "#/card", { prepare: (p) => p.waitForSelector(".acard") });
await shoot("06-woerter", "#/words", { prepare: async (p) => { await p.fill("#q", "nata"); } });
await shoot("07-foto", "#/photo");
await shoot("08-start-dunkel", "#/start", { dark: true });
await browser.close();
console.log("Screenshots gespeichert in docs/screenshots/");
