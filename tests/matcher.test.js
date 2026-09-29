// Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLexicon } from "../src/core/lexicon.js";
import { checkProduct, findMatches } from "../src/core/matcher.js";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const lexicon = buildLexicon(load("data/synonyms.generated.json"), load("data/synonyms.manual.json"));

const lena = (severity = "avoidTraces") => ({ name: "Lena", allergens: { milk: severity } });
const check = (text, person = lena(), extra = {}) => checkProduct({ ingredientsText: text, ...extra }, person, lexicon);
const verdictOf = (text, person) => check(text, person).verdict;

test("word list is loaded", () => {
  assert.ok(lexicon.size > 5000, `only ${lexicon.size} words`);
});

test("milk in many languages is found", () => {
  const cases = {
    de: "Zucker, Weizenmehl, Molkenpulver, Salz",
    de2: "Kakaomasse, Vollmilchpulver, Emulgator",
    de3: "Weizenmehl, Süßmolkenpulver, Hefe",
    en: "Sugar, wheat flour, skimmed milk powder, salt",
    en2: "Oats, whey protein concentrate, cocoa",
    fr: "Farine de blé, lactosérum, sel",
    fr2: "Sucre, beurre concentré, œufs",
    it: "Farina di frumento, siero di latte in polvere, sale",
    it2: "Zucchero, latticello, lievito",
    es: "Harina de trigo, azúcar, suero lácteo, sal",
    es2: "Harina, leche desnatada en polvo, aceite de girasol",
    es3: "Patatas, aceite de oliva, nata, sal",
    ca: "Farina de blat, mantega, sucre",
    pt: "Farinha de trigo, soro de leite em pó, sal",
    nl: "Tarwebloem, weipoeder, suiker",
    el: "Αλεύρι σίτου, γάλα σε σκόνη, ζάχαρη",
    el2: "Ζάχαρη, βούτυρο, αλάτι",
    tr: "Buğday unu, şeker, süt tozu, tuz",
    tr2: "Un, tereyağı, şeker",
    hr: "Pšenično brašno, sirutka u prahu, šećer",
    pl: "Mąka pszenna, serwatka w proszku, cukier",
    cs: "Pšeničná mouka, sušené mléko, cukr",
    hu: "Búzaliszt, tejpor, cukor",
    sv: "Vetemjöl, vasslepulver, socker",
    fi: "Vehnäjauho, maitojauhe, sokeri",
  };
  for (const [lang, text] of Object.entries(cases)) {
    assert.equal(verdictOf(text), "unsafe", `${lang}: "${text}" should contain milk`);
  }
});

test("the matching word is explained", () => {
  const r = check("Harina de trigo, suero lácteo, sal");
  const f = r.findings.find((x) => x.kind === "contains");
  assert.equal(f.term, "suero lácteo");
  assert.match(f.reason, /Molke/);
  assert.equal("Harina de trigo, suero lácteo, sal".slice(f.start, f.end), "suero lácteo");
});

test("milk-free products are safe", () => {
  for (const text of [
    "Wasser, Hafer 10%, Rapsöl, Meersalz",
    "Harina de trigo, agua, aceite de oliva, sal, levadura",
    "Farina di grano duro, acqua",
    "Tomates, cebolla, pimiento, berenjena, aceite de oliva, sal",
  ]) {
    assert.equal(verdictOf(text), "safe", text);
  }
});

test("look-alikes are not milk, but the rest of the text is still checked", () => {
  assert.equal(verdictOf("Kokosmilch 60%, Wasser, Guarkernmehl"), "safe");
  assert.equal(verdictOf("Zucker, Kakaobutter, Kakaomasse, Emulgator Sojalecithin"), "safe");
  assert.equal(verdictOf("Sugar, cocoa butter, cocoa mass"), "safe");
  assert.equal(verdictOf("Leche de coco, agua"), "safe");
  assert.equal(verdictOf("Säuerungsmittel Milchsäure, Wasser"), "safe");
  assert.equal(verdictOf("Peanut butter, salt"), "safe");
  // look-alike AND real milk -> still unsafe
  assert.equal(verdictOf("Zucker, Kakaobutter, Vollmilchpulver"), "unsafe");
  const r = check("Kokosmilch, Wasser");
  assert.ok(r.findings.some((f) => f.kind === "lookalike"), "look-alike is shown as a note");
});

test("lactose-free is never an all-clear for milk protein", () => {
  assert.equal(verdictOf("Laktosefreie Milch, Laktase"), "unsafe");
  const r = check("Joghurt laktosefrei");
  assert.equal(r.verdict, "unsafe");
  const r2 = check("Reis, Wasser, laktosefrei");
  assert.ok(r2.findings.some((f) => f.kind === "negated" && /nicht milchfrei/.test(f.reason)));
});

test("traces depend on the person's trace setting", () => {
  const text = "Zucker, Haselnüsse, Kakao. Kann Spuren von Milch enthalten.";
  assert.equal(verdictOf(text, lena("tracesOk")), "safe");
  assert.equal(verdictOf(text, lena("avoidTraces")), "caution");
  assert.equal(verdictOf(text, lena("severe")), "unsafe");
});

test("trace phrases in other languages", () => {
  for (const text of [
    "Azúcar, cacao. Puede contener trazas de leche.",
    "Zucchero, cacao. Può contenere tracce di latte.",
    "Sucre, cacao. Peut contenir des traces de lait.",
    "Sugar, cocoa. May contain milk.",
    "Ζάχαρη, κακάο. Μπορεί να περιέχει ίχνη γάλακτος.",
    "Şeker, kakao. Eser miktarda süt içerebilir.",
  ]) {
    assert.equal(verdictOf(text, lena("avoidTraces")), "caution", text);
    assert.equal(verdictOf(text, lena("tracesOk")), "safe", text);
  }
});

test("an ingredient before the trace sentence is still 'contains'", () => {
  assert.equal(verdictOf("Mehl, Butter, Zucker. Kann Spuren von Nüssen enthalten.", lena("tracesOk")), "unsafe");
});

test("no data is never safe", () => {
  assert.equal(check("").verdict, "unknown");
  assert.equal(check("   ").verdict, "unknown");
  assert.equal(check("Zucker", lena(), { textQuality: 0.2 }).verdict, "unknown");
  assert.equal(checkProduct({}, lena(), lexicon).verdict, "unknown");
});

test("Open Food Facts allergen tags count even without text", () => {
  assert.equal(checkProduct({ allergenTags: ["en:milk"] }, lena(), lexicon).verdict, "unsafe");
  assert.equal(checkProduct({ ingredientsText: "Zucker, Kakao, Haselnüsse", traceTags: ["en:milk"] }, lena("avoidTraces"), lexicon).verdict, "caution");
  assert.equal(checkProduct({ ingredientsText: "Zucker, Kakao, Haselnüsse", traceTags: ["en:milk"] }, lena("tracesOk"), lexicon).verdict, "safe");
});

test("maybe-words give a caution", () => {
  assert.equal(verdictOf("Mehl, Margarine, Zucker"), "caution");
});

test("common false friends do not trigger", () => {
  for (const text of [
    "Lechuga, tomate, aceite",          // lechuga = lettuce, not leche
    "Laitue, tomates, huile",           // laitue = lettuce, not lait
    "Glucose-Fructose-Sirup, Wasser",   // sirup is not "sir" (Croatian cheese)
    "Farine d'avoine, sel",             // avoine contains "voi" (Finnish butter)
    "Mushroom, onion, garlic",          // mushroom contains "room" (Dutch cream)
    "Butternut squash, water",
    "Edamame, sal",                     // edamame is not Edam cheese
    "Savoy cabbage, carrots",           // savoy contains Hungarian "savó" (whey)
    "Jamón cocido de calidad superior", // Frisian "sûpe" is not in the list
  ]) {
    assert.equal(verdictOf(text), "safe", text);
  }
});

test("lactose intolerance: lactose is red, other dairy is a caution", () => {
  const p = { name: "Max", allergens: { lactose: "avoidTraces" } };
  assert.equal(verdictOf("Zucker, Lactose, Kakao", p), "unsafe");
  assert.equal(verdictOf("Hartkäse, Salz", p), "caution");
  assert.equal(verdictOf("Reis, Wasser", p), "safe");
});

test("other allergens work too", () => {
  const p = { name: "Tim", allergens: { peanuts: "severe", gluten: "avoidTraces" } };
  assert.equal(verdictOf("Erdnüsse, Salz", p), "unsafe");
  assert.equal(verdictOf("Harina de trigo, agua", p), "unsafe");
  assert.equal(verdictOf("Reis, Wasser", p), "safe");
});

test("findMatches returns offsets into the original text", () => {
  const text = "Zucker, SÜSSMOLKENPULVER, Salz";
  const { matches } = findMatches(text, lexicon, ["milk"]);
  assert.equal(matches.length, 1);
  assert.equal(text.slice(matches[0].start, matches[0].end), "SÜSSMOLKENPULVER");
});
