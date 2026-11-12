// The 13 allergens besides milk (marked "Beta" in the app): the most common words
// in German, English, French and Italian must be found.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLexicon } from "../src/core/lexicon.js";
import { checkProduct } from "../src/core/matcher.js";
import { ALLERGENS } from "../src/core/allergens.js";

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const lexicon = buildLexicon(load("data/synonyms.generated.json"), load("data/synonyms.manual.json"));
const verdictOf = (text, id) => checkProduct({ ingredientsText: text }, { name: "T", allergens: { [id]: "avoidTraces" } }, lexicon).verdict;

const FOUND = {
  eggs: ["Ei", "Eier", "Eigelb", "Eiklar", "Volleipulver", "Hühnerei", "Lysozym", "Ovalbumin", "E1105", "Mayonnaise", "egg", "egg white", "œufs", "oeuf", "jaune d'œuf", "uova", "uovo", "tuorlo", "albume"],
  gluten: ["Weizenmehl", "Dinkel", "Roggen", "Gerstenmalzextrakt", "Haferflocken", "Grieß", "Hartweizengriess", "Couscous", "Bulgur", "Seitan", "Emmer", "Grünkern", "Malzextrakt", "Paniermehl", "Semmelbrösel", "wheat", "barley", "rye", "oats", "semolina", "farine de blé", "avoine", "seigle", "chapelure", "frumento", "avena", "semola", "pangrattato"],
  nuts: ["Haselnüsse", "Mandeln", "Walnusskerne", "Cashewkerne", "Pistazien", "Marzipan", "Nougat", "Baumnüsse", "hazelnuts", "almonds", "marzipan", "noisettes", "amandes", "nocciole", "mandorle", "marzapane"],
  peanuts: ["Erdnüsse", "Erdnussöl", "peanuts", "groundnut", "arachide", "cacahuètes", "arachidi"],
  soybeans: ["Soja", "Sojalecithin", "Tofu", "Edamame", "Miso", "Tempeh", "Sojasauce", "soy", "soya", "soia"],
  fish: ["Lachs", "Thunfisch", "Sardellen", "Kabeljau", "Anchovis", "Forelle", "Dorsch", "Worcestersauce", "anchovies", "tuna", "cod", "poisson", "thon", "anchois", "pesce", "tonno", "acciughe"],
  crustaceans: ["Garnelen", "Krabben", "Hummer", "Krebse", "Crevetten", "Scampi", "Langusten", "Shrimps", "prawns", "crab", "lobster", "crevettes", "homard", "gamberi", "gamberetti"],
  molluscs: ["Muscheln", "Miesmuscheln", "Tintenfisch", "Austern", "Schnecken", "Calamari", "Oktopus", "mussels", "squid", "oysters", "clams", "moules", "poulpe", "cozze", "vongole", "polpo"],
  sesame: ["Sesam", "Sesamöl", "Tahin", "Tahini", "sesame", "sésame", "sesamo"],
  celery: ["Sellerie", "Knollensellerie", "Selleriesalz", "celery", "celeriac", "céleri", "sedano"],
  mustard: ["Senf", "Senfkörner", "Senfsaat", "mustard", "moutarde", "senape"],
  lupin: ["Lupinen", "Lupinenmehl", "Süsslupinen", "lupin", "lupini"],
  sulphites: ["Sulfite", "Schwefeldioxid", "Natriummetabisulfit", "Natriumdisulfit", "E220", "E 220", "E-220", "E223", "E224", "E228", "geschwefelt", "sulphites", "sulfites", "sulphur dioxide", "solfiti", "anidride solforosa", "Antioxidationsmittel: E223"],
};

test("common words of the other allergens are found", () => {
  for (const [id, words] of Object.entries(FOUND)) {
    for (const w of words) assert.equal(verdictOf(`Zutaten: Wasser, ${w}, Salz`, id), "unsafe", `${id}: ${w}`);
  }
});

test("the examples from the audit", () => {
  assert.equal(verdictOf("Reis, Garnelen, Salz", "crustaceans"), "unsafe");
  assert.equal(verdictOf("Zucker, Marzipan, Kakao", "nuts"), "unsafe");
  assert.equal(verdictOf("Seitan, Wasser, Salz", "gluten"), "unsafe");
  assert.equal(verdictOf("Kichererbsen, Tahini, Salz", "sesame"), "unsafe");
  assert.equal(verdictOf("Mehl, Ei, Salz", "eggs"), "unsafe");
  assert.equal(verdictOf("Wein, Antioxidationsmittel E220", "sulphites"), "unsafe");
});

test("false friends of the other allergens", () => {
  const safe = {
    eggs: ["eggplant, oil, salt", "Meersalz, Reis, Bohnen"],
    gluten: ["Buchweizen, Wasser, Salz", "Buchweizenmehl, Wasser", "grano saraceno, acqua"],
    nuts: ["noix de coco, eau, sel", "noix de muscade, sel, poivre"],
    molluscs: ["Zimtschnecken, Zucker, Zimt", "Austernpilze, Öl, Salz", "Muschelnudeln, Wasser"],
    fish: ["Tintenfisch, Öl, Salz"],
    sulphites: ["Farbstoff E160a, Wasser, E330", "Wasser, E2201 Test, Salz"],
  };
  for (const [id, texts] of Object.entries(safe)) for (const t of texts) assert.equal(verdictOf(t, id), "safe", `${id}: ${t}`);
});

test("everything except milk and lactose is marked as Beta", () => {
  for (const a of ALLERGENS) assert.equal(a.beta, !["milk", "lactose"].includes(a.id), a.id);
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /Beta/);
});
