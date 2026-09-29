import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildCard } from "../src/core/card.js";
import { placeFromPoint, placeFromTimeZone, languagesFor } from "../src/core/places.js";
import { ALLERGENS } from "../src/core/allergens.js";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const regions = load("data/regions.json");
const cardFiles = readdirSync(new URL("../data/cards/", import.meta.url)).filter((f) => f.endsWith(".json"));

test("every card language has every sentence and allergen name", () => {
  const de = load("data/cards/de.json");
  for (const f of cardFiles) {
    const c = load(`data/cards/${f}`);
    for (const key of Object.keys(de)) assert.ok(key in c, `${f}: missing "${key}"`);
    for (const a of ALLERGENS) assert.ok(c.allergens[a.id], `${f}: missing allergen ${a.id}`);
    for (const s of ["intro", "introSevere", "avoid", "emergency"]) assert.ok(c[s].includes("{"), `${f}: ${s} lost its placeholder`);
  }
});

test("every language used by a region has a card", () => {
  const langs = new Set(cardFiles.map((f) => f.replace(".json", "")));
  for (const c of regions.countries) for (const l of [...c.languages, ...(c.regions || []).flatMap((r) => r.languages)]) assert.ok(langs.has(l), `${c.id}: no card for ${l}`);
});

test("card follows the trace setting and severity", () => {
  const es = load("data/cards/es.json");
  const strict = buildCard({ name: "Lena", allergens: { milk: "avoidTraces" } }, es, { emergency: "112" });
  assert.match(strict.text, /^Lena tiene una alergia alimentaria a: proteína de la leche de vaca/);
  assert.match(strict.text, /Incluso las trazas/);
  assert.match(strict.text, /mantequilla/);
  assert.doesNotMatch(strict.text, /112/); // emergency line only for severe

  const ok = buildCard({ name: "Lena", allergens: { milk: "tracesOk" } }, es);
  assert.match(ok.text, /Pequeñas trazas no son un problema/);

  const severe = buildCard({ name: "", allergens: { milk: "severe" } }, es, { emergency: "112" });
  assert.match(severe.text, /^Esta persona tiene una alergia grave/);
  assert.match(severe.text, /llame al 112/);
});

test("place from GPS point (offline)", () => {
  assert.equal(placeFromPoint(regions, 39.57, 2.65).region.id, "ES-IB");   // Palma de Mallorca
  assert.equal(placeFromPoint(regions, 41.39, 2.17).region.id, "ES-CT");   // Barcelona
  assert.equal(placeFromPoint(regions, 51.51, -0.13).country.id, "GB");    // London
  assert.equal(placeFromPoint(regions, 46.0, 8.95).region.id, "CH-TI");    // Lugano
  assert.equal(placeFromPoint(regions, 47.37, 8.54).region.id, "CH-DE");   // Zürich
  assert.equal(placeFromPoint(regions, 0, 0), null);
});

test("place from time zone and card languages", () => {
  assert.equal(placeFromTimeZone(regions, "Europe/Madrid").country.id, "ES");
  assert.equal(placeFromTimeZone(regions, "Atlantic/Canary").region.id, "ES-CN");
  assert.deepEqual(languagesFor(placeFromPoint(regions, 39.57, 2.65)), ["es", "ca"]);
});

import { buildLexicon } from "../src/core/lexicon.js";
import { lookupWord, wordsFor } from "../src/core/words.js";

test("word check explains foreign words", () => {
  const lex = buildLexicon(load("data/synonyms.generated.json"), load("data/synonyms.manual.json"));
  const nata = lookupWord(lex, "nata");
  assert.ok(nata.exact.some((e) => e.allergen === "milk" && /Sahne/.test(e.meaning)), "nata = Sahne");
  assert.ok(lookupWord(lex, "Kokosmilch").lookalike, "Kokosmilch is a look-alike");
  assert.equal(lookupWord(lex, "Tomate").exact.filter((e) => e.allergen === "milk").length, 0);
  const es = wordsFor(lex, "milk", "es").map((e) => e.norm);
  assert.ok(es.includes("leche") && es.includes("nata"));
});
