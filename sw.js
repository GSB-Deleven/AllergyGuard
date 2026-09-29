// Service worker: keeps AllergyGuard working without internet.
//
// - App files (HTML, CSS, JS, word lists): served from the cache immediately and
//   refreshed in the background, so an update shows up on the next start.
// - Large libraries in vendor/ (text recognition, language packs): cached on first
//   use or via "Für unterwegs vorbereiten", then always served from the cache.
// - Open Food Facts: always live. The app keeps its own copy of checked products.

const VERSION = "ag-v1";
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
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
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
