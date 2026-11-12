// Safety net: every case here once gave a wrong green result (audit of November 2026).
// Rule of the app: strict over convenient. In doubt the stricter level, never "safe"
// without a readable ingredient list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLexicon } from "../src/core/lexicon.js";
import { checkProduct, findMatches, assessText } from "../src/core/matcher.js";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const lexicon = buildLexicon(load("data/synonyms.generated.json"), load("data/synonyms.manual.json"));
const lena = (severity = "avoidTraces") => ({ name: "Lena", allergens: { milk: severity } });
const check = (text, person = lena(), extra = {}) => checkProduct({ ingredientsText: text, ...extra }, person, lexicon);
const verdictOf = (text, person, extra) => check(text, person, extra).verdict;
const allUnsafe = (texts, person) => { for (const t of texts) assert.equal(verdictOf(t, person), "unsafe", t); };

test("K1: look-alikes only count as whole words", () => {
  allUnsafe([
    "goat milk, salt, rennet",          // contains "oat milk"
    "Zucker, tejsavópor, só",           // Hungarian whey powder, contains "tejsav" (lactic acid)
    "Schafermilch, Salz",               // contains "Hafermilch"
    "Zucker, Kakaobuttermilch",
    "peanut buttermilk cookies, sugar",
  ]);
  // the look-alikes themselves still work
  for (const t of ["oat milk, water", "Hafermilch, Wasser", "Wasser, tejsav, cukor", "Bio-Kokosmilch, Wasser", "Kokosmilchpulver, Zucker"]) assert.equal(verdictOf(t), "safe", t);
});

test("K1: a look-alike that asks to check the ingredients is a caution, not green", () => {
  assert.equal(verdictOf("zucchero, crema di nocciole 30%"), "caution");
  assert.equal(verdictOf("azúcar, crema de cacao"), "caution");
});

test("K1 self-test: every word of every list is found by the checker", () => {
  const missed = [];
  for (const [allergen, list] of Object.entries(lexicon.byAllergen)) {
    for (const w of list) {
      const { matches } = findMatches(w.term, lexicon, [allergen]);
      if (!matches.some((m) => !m.negated)) missed.push(`${allergen}: ${w.term}`);
    }
  }
  assert.deepEqual(missed, []);
  assert.ok(lexicon.byAllergen.milk.length > 4000);
});

test("K2: text that is no ingredient list is never green", () => {
  for (const t of ["Zutaten: siehe Verpackung", "Ingredients: see packaging", "Zutaten:", "Ingredients", "Schoko Keks", "12345678", "........", "Voir emballage, merci"]) {
    assert.equal(verdictOf(t), "unknown", t);
  }
  assert.equal(check("Zutaten: siehe Verpackung").why, "notList");
  assert.equal(assessText("Wasser, Hafer 10%, Rapsöl").readable, true);
});

test("K2: scripts the word lists do not cover are never green", () => {
  for (const t of [
    "配料：白砂糖、可可脂、大豆卵磷脂",        // Chinese, no milk word
    "설탕, 코코아, 소금",          // Korean
    "น้ำตาล โกโก้ เกลือ, น้ำ",                 // Thai
    "चीनी, कोको, नमक",                        // Hindi
    "砂糖、ココア、食塩",                      // Japanese
    "سكر، كاكاو، ملح",                         // Arabic
    "סוכר, קקאו, מלח",                         // Hebrew
    "сахар, какао, соль",                      // Russian
  ]) {
    const r = check(t);
    assert.equal(r.verdict, "unknown", t);
    assert.equal(r.why, "script", t);
  }
  // Latin and Greek stay checkable
  assert.equal(verdictOf("Ζάχαρη, κακάο, αλάτι"), "safe");
});

test("K2: milk in other scripts is still found (red wins over 'no data')", () => {
  allUnsafe([
    "配料：白砂糖、全脂乳粉、可可脂",
    "설탕, 전지분유, 코코아버터",
    "น้ำตาล นมผง โกโก้",
    "चीनी, दूध पाउडर",
    "成分：砂糖、全粉乳、ココアバター",
    "سكر، حليب مجفف، كاكاو",
    "סוכר, אבקת חלב, קקאו",
    "Состав: сахар, сухое молоко, какао",
    "сахар, молочный жир, сливки",
    "захар, мляко на прах",
  ]);
});

test("K2: a hit counts even in a text that is too short to be a list", () => {
  assert.equal(verdictOf("Milch"), "unsafe");
  assert.equal(verdictOf("Zucker, Vollmilchpulver, Butter", lena(), { textQuality: 0.4 }), "unsafe");
});

test("K3: inflected forms", () => {
  allUnsafe([
    "šećer, maslaca, sol", "brašno, sira, sol", "šećer, vrhnja 5%", "šećer, mlijekom", "šećer, sirutkin prah",
    "şeker, sütü, tuz", "un, peyniri, tuz", "şeker, süttozu", "un, yoğurdu", "un, kaymağı", "şeker, tereyağlı", "şeker, sütten",
    "ζάχαρη, τυριού, αλάτι", "ζάχαρη, γιαουρτιού", "ζάχαρη, τυριά", "ζάχαρη, γαλακτοκομικών",
    "cukier, masła", "cukier, sera", "cukier, śmietany", "cukier, serwatki", "cukier, mleka w proszku",
    "cukr, másla", "cukr, syrovátky", "cukr, smetany",
    "cukor, tejet", "cukor, vajat", "zahăr, laptele", "zahăr, untului", "sokeri, voin",
    "farina, lattoproteine", "zucchero, burri", "sucre, lactoprotéines", "suiker, kazen",
  ]);
});

test("K3: footnote marks and glued words", () => {
  allUnsafe(["sucre, lait¹, sel", "sucre, lait1, sel", "Zucker, Milch*, Salz", "Zucker, Butter², Salz", "sugar, milkpowder, salt", "sugar, wheypowder, salt", "sugar, milkfat"]);
});

test("K3: stems do not trigger on false friends", () => {
  for (const t of ["šećer, maslinovo ulje, sol", "ζάχαρη, γαλακτωματοποιητής, αλάτι", "šećer, glukozni sirup, sol", "farine, laitue, sel", "sucre glace, farine"]) {
    assert.equal(verdictOf(t), "safe", t);
  }
});

test("K4: a trace statement does not swallow what follows", () => {
  for (const sev of ["tracesOk", "avoidTraces"]) {
    allUnsafe([
      "Zucker, Kakao (kann Spuren von Nüssen enthalten), Butterreinfett",
      "Zucker, Kakao. Kann Spuren von Nüssen enthalten\n\nSugar, cocoa, milk powder",
      "Zucker, Kakaobutter Kann Spuren von Nüssen enthalten\nIngrédients: sucre, lait entier en poudre",
      "Kann Spuren von Nüssen enthalten, Zutaten: Zucker, Vollmilchpulver",
      "Kann Spuren von Nüssen enthalten Zutaten: Zucker, Vollmilchpulver",
      "May contain nuts\nIngredients: sugar, butter, flour",
      "May contain nuts Ingredients: sugar, butter, flour",
      "Sugar, cocoa – may contain: peanuts, tree nuts – whole milk powder",
    ], lena(sev));
  }
});

test("K4: real trace statements still count as traces", () => {
  for (const t of [
    "Zucker, Kakao. Kann Spuren von Milch enthalten.",
    "Zucker, Kakao (kann Spuren von Nüssen und Milch enthalten), Salz",
    "Sucre, cacao. Peut contenir : lait, noisettes.",
    "Sugar, cocoa. May contain: milk.",
    "Sugar, cocoa. May contain traces of nuts (hazelnuts, almonds) and milk.",
  ]) {
    assert.equal(verdictOf(t, lena("avoidTraces")), "caution", t);
    assert.equal(verdictOf(t, lena("severe")), "unsafe", t);
  }
});

test("K5: 'frei/free' only denies the word it belongs to", () => {
  allUnsafe([
    "Vollmilch frei von Gentechnik, Zucker",
    "Butter frei von Palmöl, Mehl",
    "Zucker, Käse frei von Zusatzstoffen",
    "Sugar, butter free range eggs",
    "Zutaten: Eier frei laufender Hühner, Milch frei von Gentechnik",
    "Ohne Gentechnik hergestellte Milch, Zucker",
    "Glutenfrei. Milch, Zucker",
    "Nº leche 3, azúcar",
  ]);
  for (const t of ["Zucker, Reis. Milchfrei.", "Sugar, rice. Milk-free.", "Zucker, Reis, frei von Milch", "Sugar, rice, free from milk", "Zucker, Reis, ohne Milch", "Sucre, riz, sans lait", "Sugar, rice. Milk free."]) {
    const r = check(t);
    assert.equal(r.verdict, "safe", t);
    assert.ok(r.findings.some((f) => f.kind === "negated"), t);
  }
  const eggs = { name: "E", allergens: { eggs: "avoidTraces" } };
  assert.equal(verdictOf("Eier frei laufender Hühner, Zucker", eggs), "unsafe");
});

test("hyphenation: words split at a line end, soft hyphens, zero-width characters", () => {
  allUnsafe([
    "Zucker, Mol-\nkenpulver, Salz", "Zucker, But-\nter, Mehl", "Weizenmehl, Mager-\nmilchpulver", "Zucker, Sahne-\npulver",
    "harina, le-\nche en polvo", "sucre, lacto-\nsérum", "Zucker, Mol-  \n  kenpulver",
    "Zucker, Mol­kenpulver, Salz", "Zucker, Rahm­pulver, Salz", "Zucker, Mi​lch, Salz",
    "Zucker, Voll-\nMilch, Salz",
  ]);
  // a look-alike split at the line end stays a look-alike
  assert.equal(verdictOf("Wasser, Kokos-\nmilch, Salz"), "safe");
  const text = "Zucker, Mol-\nkenpulver, Salz";
  const { matches } = findMatches(text, lexicon, ["milk"]);
  assert.equal(text.slice(matches[0].start, matches[0].end), "Mol-\nkenpulver");
});

test("OCR slips (1/l/I, 0/o) are at least a caution", () => {
  for (const t of ["Zucker, Mi1chpulver, Salz", "Zucker, MiIchpulver, Salz", "Zucker, M1lchpulver, Salz", "Zucker, Mi|chpulver, Salz", "Zucker, M0lkenpulver, Salz", "sugar, mi1k powder, salt"]) {
    const r = check(t);
    assert.equal(r.verdict, "caution", t);
    assert.ok(r.findings.some((f) => f.kind === "ocr" && /Lesefehler/.test(f.reason)), t);
  }
  // digits that belong there do not create hits
  for (const t of ["Zucker, Vitamin B1, B12, E150d, 100g Hafer", "Wasser, Farbstoff E160a, Aroma1 frei, Salz 0,5%"]) {
    assert.ok(!check(t).findings.some((f) => f.kind === "ocr"), t);
  }
});

test("a photo result is never plain green", () => {
  const photo = { source: "ocr", textQuality: 0.9 };
  assert.equal(verdictOf("Wasser, Hafer 10%, Rapsöl, Meersalz", lena(), photo), "review");
  assert.equal(verdictOf("Wasser, Hafer 10%, Rapsöl, Meersalz", lena(), { source: "manual" }), "safe");
  assert.equal(verdictOf("Zucker, Molkenpulver", lena(), photo), "unsafe");
  assert.equal(verdictOf("Zucker, Margarine", lena(), photo), "caution");
  assert.equal(verdictOf("Wasser, Hafer", lena(), { source: "ocr", textQuality: 0.3 }), "unknown");
  // a trace hint that is fine for this person does not turn a photo green either
  assert.equal(verdictOf("Zucker, Kakao. Kann Spuren von Milch enthalten.", lena("tracesOk"), photo), "review");
});

test("other language versions can only make the result stricter", () => {
  const p = { ingredientsText: "Harina de trigo, azúcar, sal", extraTexts: ["Weizenmehl, Zucker, Molkenpulver, Salz"] };
  assert.equal(checkProduct(p, lena(), lexicon).verdict, "unsafe");
  assert.equal(checkProduct({ ingredientsText: "Harina de trigo, azúcar, sal", extraTexts: ["Weizenmehl, Zucker, Salz"] }, lena(), lexicon).verdict, "safe");
  // main text unusable, translation is a real list: checkable
  assert.equal(checkProduct({ ingredientsText: "砂糖、ココア、食塩", extraTexts: ["Sugar, cocoa, salt"] }, lena(), lexicon).verdict, "safe");
  assert.equal(checkProduct({ ingredientsText: "砂糖、ココア、食塩", extraTexts: ["Siehe Verpackung"] }, lena(), lexicon).verdict, "unknown");
});

test("Swiss words", () => {
  allUnsafe([
    "Mehl, Anken, Salz", "Mehl, Ankenzopf", "Zucker, Ziger", "Zucker, Schabziger", "Kartoffeln, Sbrinz AOP", "Kartoffeln, Vacherin Fribourgeois",
    "Kartoffeln, Gruyère", "Kartoffeln, Greyerzer", "Kartoffeln, Emmentaler", "Kartoffeln, Appenzeller", "Kartoffeln, Tilsiter", "Kartoffeln, Raclette",
    "Kartoffeln, Tête de Moine", "Zucker, Rahm", "Zucker, Nidel", "Zucker, Nidle", "Zucker, Quark", "Zucker, Molke", "Zucker, Schotte", "Zucker, Kaese",
  ]);
  assert.equal(verdictOf("Zucker, Glace, Früchte"), "caution");
  for (const t of ["Wein aus Franken, Zucker", "würziger Pfeffer, Salz"]) assert.equal(verdictOf(t), "safe", t);
});

test("a profile with an unknown allergen or level is never green", () => {
  const text = "Wasser, Hafer 10%, Rapsöl, Meersalz";
  assert.equal(checkProduct({ ingredientsText: text }, { allergens: { Milk: "severe" } }, lexicon).verdict, "unknown");
  assert.equal(checkProduct({ ingredientsText: text }, { allergens: { milk: "bogus" } }, lexicon).verdict, "unknown");
  assert.equal(checkProduct({ ingredientsText: text }, { allergens: {} }, lexicon).verdict, "unknown");
  assert.equal(checkProduct({ ingredientsText: text }, { allergens: { milk: "severe", Eggs: "severe" } }, lexicon).verdict, "unknown");
  assert.equal(checkProduct({ ingredientsText: "Zucker, Butter" }, { allergens: { milk: "severe", Eggs: "severe" } }, lexicon).verdict, "unsafe");
});
