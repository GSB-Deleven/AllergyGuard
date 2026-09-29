import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lookupBarcode, mapProduct, isValidBarcode, LookupError } from "../src/services/openFoodFacts.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/off-galletas.json", import.meta.url), "utf8"));
const fakeFetch = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

test("barcode validation", () => {
  assert.ok(isValidBarcode("4000417025005"));
  assert.ok(isValidBarcode("12345670"));
  assert.ok(!isValidBarcode("123"));
  assert.ok(!isValidBarcode("abc4000417025"));
});

test("maps the API answer to a product, preferring the pack's own language", () => {
  const p = mapProduct(fixture.product);
  assert.equal(p.name, "Galletas María");
  assert.equal(p.brand, "Ejemplo");
  assert.match(p.ingredientsText, /suero lácteo/);
  assert.equal(p.otherTexts.length, 1);
  assert.match(p.otherTexts[0], /Molkenpulver/);
  assert.deepEqual(p.allergenTags, ["en:gluten", "en:milk"]);
});

test("lookup returns the product", async () => {
  const p = await lookupBarcode("0000000000017", { fetch: fakeFetch(200, fixture) });
  assert.equal(p.barcode, "0000000000017");
});

test("unknown product -> notFound", async () => {
  await assert.rejects(lookupBarcode("4000000000000", { fetch: fakeFetch(200, { status: 0 }) }), (e) => e instanceof LookupError && e.kind === "notFound");
  await assert.rejects(lookupBarcode("4000000000000", { fetch: fakeFetch(404, {}) }), (e) => e.kind === "notFound");
});

test("network problems are reported clearly", async () => {
  await assert.rejects(lookupBarcode("4000000000000", { fetch: async () => { throw new TypeError("Failed to fetch"); } }), (e) => e.kind === "offline");
  const abortingFetch = (_, { signal }) => new Promise((_, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("x"), { name: "AbortError" }))));
  await assert.rejects(lookupBarcode("4000000000000", { fetch: abortingFetch, timeoutMs: 10 }), (e) => e.kind === "timeout");
  await assert.rejects(lookupBarcode("4000000000000", { fetch: fakeFetch(503, {}) }), (e) => e.kind === "server");
});
