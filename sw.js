// Service worker: keeps AllergyGuard working without internet.
//
// - App files (HTML, CSS, JS, word lists): served from the cache immediately and
//   refreshed in the background.
// - Every release has its own cache (APP_VERSION). A new release is downloaded completely,
//   takes over at once and tells the open app, which shows "Neue Version verfügbar".
// - Large libraries in vendor/ (text recognition, language packs): cached on first
//   use or via "Für unterwegs vorbereiten", then always served from the cache.
// - Open Food Facts: always live. The app keeps its own copy of checked products.

// Must be the same as "version" in package.json (tests/sw.test.js checks it).
const APP_VERSION = "0.2.0";
const VERSION = `ag-${APP_VERSION}`;
// Releases before 0.2.0 all used this cache name and had no update notice.
const LEGACY_PREFIX = "ag-v1";
const SHELL = `${VERSION}-shell`;
const VENDOR = `${VERSION}-vendor`;

// Everything needed to start the app offline. tests/sw.test.js checks that each file exists.
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "src/app.js",
  "src/data.js",
  "src/core/allergens.js",
  "src/core/card.js",
  "src/core/lexicon.js",
  "src/core/matcher.js",
  "src/core/normalize.js",
  "src/core/places.js",
  "src/core/profile.js",
  "src/core/words.js",
  "src/services/ocr.js",
  "src/services/openFoodFacts.js",
  "src/storage/store.js",
  "src/ui/dom.js",
  "src/ui/personEditor.js",
  "src/ui/views/card.js",
  "src/ui/views/history.js",
  "src/ui/views/home.js",
  "src/ui/views/info.js",
  "src/ui/views/onboarding.js",
  "src/ui/views/photo.js",
  "src/ui/views/profile.js",
  "src/ui/views/result.js",
  "src/ui/views/scan.js",
  "src/ui/views/words.js",
  "data/synonyms.generated.json",
  "data/synonyms.manual.json",
  "data/regions.json",
  "data/cards/de.json", "data/cards/en.json", "data/cards/fr.json", "data/cards/it.json",
  "data/cards/es.json", "data/cards/ca.json", "data/cards/pt.json", "data/cards/nl.json",
  "data/cards/el.json", "data/cards/tr.json", "data/cards/hr.json",
  "vendor/zxing/zxing-browser.min.js",
  "vendor/qrcode/qrcode.mjs",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/apple-touch-icon.png",
  "fonts/quicksand-latin-600-normal.woff2",
  "fonts/quicksand-latin-700-normal.woff2",
  "fonts/nunito-latin-400-normal.woff2",
  "fonts/nunito-latin-700-normal.woff2",
  "fonts/nunito-latin-800-normal.woff2",
];

self.addEventListener("install", (event) => {
  // cache: "reload" skips the browser's HTTP cache, so a new release never mixes old and new files.
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter((k) => k.startsWith("ag-") && !k.startsWith(VERSION));
    // The downloaded text recognition (about 30 MB) moves to the new cache instead of being loaded again.
    const oldVendor = old.find((k) => k.endsWith("-vendor"));
    if (oldVendor) {
      const [from, to] = await Promise.all([caches.open(oldVendor), caches.open(VENDOR)]);
      for (const req of await from.keys()) {
        const res = await from.match(req);
        if (res) await to.put(req, res);
      }
    }
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window" });
    const fromLegacy = old.some((k) => k.startsWith(LEGACY_PREFIX));
    for (const client of windows) {
      // Open pages of 0.2.0 and later show a notice. Older pages cannot, so they are reloaded once.
      client.postMessage({ type: "ag-updated", version: APP_VERSION });
      if (fromLegacy) { try { await client.navigate(client.url); } catch { /* not supported: next start */ } }
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Open Food Facts etc.: straight to the network

  if (url.pathname.includes("/vendor/tesseract/")) {
    event.respondWith(cacheFirst(req, VENDOR));
  } else {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await cache.match("index.html") : null);
  const refresh = fetch(req)
    .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  const res = await refresh;
  return res || new Response("Offline und noch nicht gespeichert.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
