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
