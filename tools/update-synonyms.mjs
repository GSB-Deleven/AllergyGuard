#!/usr/bin/env node
// Builds data/synonyms.generated.json from the open Open Food Facts taxonomies
// (https://github.com/openfoodfacts/openfoodfacts-server, data under ODbL).
//
// Usage:
//   node tools/update-synonyms.mjs                 # downloads the taxonomies from GitHub
//   node tools/update-synonyms.mjs <allergens.txt> <ingredients.txt>
//
// The generated file is committed so that every change to the word list is
// visible in the git history. Hand-curated additions live in data/synonyms.manual.json.

import { readFile, writeFile } from "node:fs/promises";

const RAW = "https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies";

// Allergens we support, mapped to their Open Food Facts ids.
export const ALLERGEN_IDS = {
  milk: "en:milk",
  gluten: "en:gluten",
  eggs: "en:eggs",
  fish: "en:fish",
  crustaceans: "en:crustaceans",
  molluscs: "en:molluscs",
  peanuts: "en:peanuts",
  nuts: "en:nuts",
  soybeans: "en:soybeans",
  celery: "en:celery",
  mustard: "en:mustard",
  sesame: "en:sesame-seeds",
  sulphites: "en:sulphur-dioxide-and-sulphites",
  lupin: "en:lupin",
};

// Ingredient-taxonomy roots whose descendants all count as milk.
const MILK_ROOTS = ["en:dairy", "en:milk"];

// Words that are too ambiguous to use on their own (they have a common
// non-food or non-dairy meaning in some language). They are dropped from
// the generated list; the manual list can still add precise phrases.
const DROP = new Set(["bleu", "comte", "voi", "hera", "ost", "sir", "tej", "vaj", "room", "nata de coco"]);

// Languages taken from the taxonomy. Words from rarely used languages caused
// false alarms (e.g. Frisian "sûpe" inside French "supérieur") and add little,
// so only the languages a traveller in Europe and beyond is likely to meet are kept.
// "xx" holds language-independent names such as "Emmental".
const LANGS = new Set([
  "xx", "de", "als", "lb", "fr", "it", "es", "ca", "gl", "eu", "pt", "en", "nl", "nl_be",
  "el", "tr", "hr", "bs", "sr", "sl", "mk", "sq", "pl", "cs", "sk", "hu", "ro", "bg",
  "sv", "da", "nb", "nn", "no", "fi", "is", "et", "lv", "lt", "mt", "ga", "cy",
  "ru", "uk", "ar", "he", "fa", "hi", "ja", "zh", "ko", "th", "vi", "id", "ms",
]);

async function load(pathOrUrl) {
  if (/^https?:/.test(pathOrUrl)) {
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`${pathOrUrl}: HTTP ${res.status}`);
    return res.text();
  }
  return readFile(pathOrUrl, "utf8");
}

const idOf = (lang, name) => `${lang}:${name.trim().toLowerCase().replace(/[\s_]+/g, "-")}`;

// Parses an OFF taxonomy file into blocks: { id, parents[], names{lang:[...]}, props{} }.
export function parseTaxonomy(text) {
  const blocks = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const block = { id: null, parents: [], names: {}, props: {} };
    for (const raw of chunk.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("<")) {
        const m = line.slice(1).trim().match(/^([a-z_]{2,5}):\s*(.+)$/);
        if (m) block.parents.push(idOf(m[1], m[2]));
        continue;
      }
      const prop = line.match(/^([a-z_0-9]+):([a-z_]{2,5}):\s*(.*)$/);
      if (prop) { block.props[`${prop[1]}:${prop[2]}`] = prop[3]; continue; }
      const m = line.match(/^([a-z]{2,3}(?:_[a-z]{2})?):\s*(.+)$/);
      if (!m || m[1] === "synonyms" || m[1] === "stopwords") continue;
      const names = m[2].split(",").map((s) => s.trim()).filter(Boolean);
      if (!names.length) continue;
      block.names[m[1]] = names;
      if (!block.id) block.id = idOf(m[1], names[0]);
    }
    if (block.id) blocks.push(block);
  }
  return blocks;
}

function descendants(blocks, roots) {
  // Resolve any "lang:name" reference to the block that carries that name.
  const byName = new Map();
  for (const b of blocks) for (const [lang, names] of Object.entries(b.names)) for (const n of names) byName.set(idOf(lang, n), b);
  const children = new Map();
  for (const b of blocks) for (const p of b.parents) {
    const parent = byName.get(p);
    if (!parent) continue;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(b);
  }
  const out = new Set();
  const stack = roots.map((r) => byName.get(r)).filter(Boolean);
  while (stack.length) {
    const b = stack.pop();
    if (out.has(b)) continue;
    out.add(b);
    stack.push(...(children.get(b) || []));
  }
  return [...out];
}

function addTerm(target, lang, term, meaning) {
  if (!LANGS.has(lang)) return;
  const t = term.trim();
  // Very specific product names ("burro dolce 82% di grassi") add nothing over the
  // shorter words they contain and only bloat the file.
  if (t.length < 3 || DROP.has(t.toLowerCase()) || /\d/.test(t) || t.split(/\s+/).length > 4) return;
  const list = (target[lang] ||= {});
  if (!(t.toLowerCase() in list)) list[t.toLowerCase()] = meaning;
}

export function build(allergensText, ingredientsText) {
  const allergenBlocks = parseTaxonomy(allergensText);
  const ingredientBlocks = parseTaxonomy(ingredientsText);
  const out = {};

  for (const [key, offId] of Object.entries(ALLERGEN_IDS)) {
    const block = allergenBlocks.find((b) => b.id === offId || Object.entries(b.names).some(([l, ns]) => ns.some((n) => idOf(l, n) === offId)));
    const terms = {};
    if (block) {
      for (const [lang, names] of Object.entries(block.names)) for (const n of names) addTerm(terms, lang, n, null);
    }
    out[key] = { off: offId, terms };
  }

  // Milk gets the full depth: every ingredient below "dairy"/"milk", in every language,
  // with its German and English name so the app can explain a foreign word.
  // Ingredients flagged as plant-based/vegan in OFF are skipped.
  for (const b of descendants(ingredientBlocks, MILK_ROOTS)) {
    if (b.props["vegan:en"] === "yes") continue;
    const meaning = { de: b.names.de?.[0] || null, en: b.names.en?.[0] || null };
    for (const [lang, names] of Object.entries(b.names)) for (const n of names) addTerm(out.milk.terms, lang, n, meaning);
  }

  // Sort for stable diffs.
  for (const a of Object.values(out)) {
    a.terms = Object.fromEntries(Object.keys(a.terms).sort().map((lang) => [lang, Object.fromEntries(Object.entries(a.terms[lang]).sort(([x], [y]) => x.localeCompare(y)))]));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [allergensPath = `${RAW}/allergens.txt`, ingredientsPath = `${RAW}/food/ingredients.txt`] = process.argv.slice(2);
  const data = build(await load(allergensPath), await load(ingredientsPath));
  const file = {
    _info: "Automatisch erzeugt aus der Open-Food-Facts-Taxonomie (ODbL). Nicht von Hand bearbeiten – Ergänzungen in synonyms.manual.json.",
    _source: "https://github.com/openfoodfacts/openfoodfacts-server/tree/main/taxonomies",
    allergens: data,
  };
  await writeFile(new URL("../data/synonyms.generated.json", import.meta.url), JSON.stringify(file, null, 1) + "\n");
  const counts = Object.entries(data).map(([k, v]) => `${k}: ${Object.values(v.terms).reduce((n, l) => n + Object.keys(l).length, 0)}`);
  console.log("Geschrieben: data/synonyms.generated.json\n" + counts.join("\n"));
}
