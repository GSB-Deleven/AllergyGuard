// Guards against the most common offline bug: a file listed for offline use that does not exist,
// or a new app file that was forgotten in the list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const sw = readFileSync(join(root, "sw.js"), "utf8");
const list = [...sw.matchAll(/"([^"]+\.(?:html|js|mjs|css|json|webmanifest|svg|png|woff2))"/g)].map((m) => m[1]);

test("every precached file exists", () => {
  for (const f of list) assert.ok(existsSync(join(root, f)), `sw.js lists missing file: ${f}`);
});

test("every app script and data file is precached", () => {
  const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });
  for (const f of [...walk("src"), ...walk("data")].filter((f) => /\.(js|json)$/.test(f))) {
    assert.ok(list.includes(f), `${f} is missing in sw.js PRECACHE (would not work offline)`);
  }
});

test("the cache name changes with every release", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const info = readFileSync(join(root, "src/ui/views/info.js"), "utf8");
  const swVersion = sw.match(/const APP_VERSION = "([^"]+)"/)?.[1];
  assert.equal(swVersion, pkg.version, "APP_VERSION in sw.js must match package.json");
  assert.equal(info.match(/export const VERSION = "([^"]+)"/)?.[1], pkg.version, "VERSION in info.js must match package.json");
  assert.match(sw, /const VERSION = `ag-\$\{APP_VERSION\}`/, "cache name must contain the app version");
  assert.ok(!/const VERSION = "ag-v1"/.test(sw), "the old fixed cache name must be gone");
});

test("a new release takes over at once and tells the open app", () => {
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
  assert.match(sw, /cache: "reload"/);
  assert.match(sw, /ag-updated/);
  const app = readFileSync(join(root, "src/app.js"), "utf8");
  assert.match(app, /controllerchange/);
  assert.match(app, /reg\.update\(\)/);
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /class="update-banner"[^>]*hidden[^>]*>.*Neue Version verfügbar/);
});
