// Builds a searchable index from the word lists in data/.
// Pure JavaScript: the caller passes the parsed JSON (fetch in the browser,
// fs in the tests), so this module never touches the network or the disk.

import { norm, NO_SPACE_SCRIPT } from "./normalize.js";

// Languages that glue words together ("Vollmilchschokolade"). In these, a
// word from the list may also appear inside a longer word.
const COMPOUND_LANGS = new Set(["de", "als", "lb", "nl", "nl_be", "da", "sv", "nb", "nn", "no", "is", "fi", "hu"]);

/**
 * @param {object} generated  data/synonyms.generated.json
 * @param {object} manual     data/synonyms.manual.json
 */
export function buildLexicon(generated, manual) {
  const entries = new Map(); // key: `${allergen}|${normTerm}` -> entry

  const put = (allergen, lang, term, meaning, kind, stem = false) => {
    const n = norm(term);
    if (n.length < 2) return;
    const key = `${allergen}|${n}`;
    const prev = entries.get(key);
    const langs = new Set(prev?.langs || []);
    langs.add(lang);
    const isStem = stem || prev?.stem === true;
    entries.set(key, {
      allergen,
      term,
      norm: n,
      langs: [...langs],
      meaning: meaning ?? prev?.meaning ?? null,
      // "maybe" wins over "contains" for the same word: it is the more careful reading
      // for words like "crema" that are often, but not always, dairy.
      kind: prev?.kind === "maybe" || kind === "maybe" ? "maybe" : "contains",
      stem: isStem,
      mode: widest(matchMode(n, [...langs]), isStem ? "prefix" : "word"),
    });
  };

  for (const [allergen, { terms }] of Object.entries(generated.allergens)) {
    for (const [lang, words] of Object.entries(terms)) {
      for (const [word, meaning] of Object.entries(words)) put(allergen, lang, word, meaning?.de || null, "contains");
    }
  }
  for (const [allergen, langs] of Object.entries(manual.add || {})) {
    for (const [lang, words] of Object.entries(langs)) for (const [word, meaning] of Object.entries(words)) put(allergen, lang, word, meaning, "contains");
  }
  for (const [allergen, langs] of Object.entries(manual.maybe || {})) {
    for (const [lang, words] of Object.entries(langs)) for (const [word, meaning] of Object.entries(words)) put(allergen, lang, word, meaning, "maybe");
  }

  // Word stems: match at the start of a word, whatever ending follows
  // ("maslac" -> "maslaca", "maslacem"). For languages that inflect their nouns.
  for (const [allergen, langs] of Object.entries(manual.stems || {})) {
    if (allergen.startsWith("_")) continue;
    for (const [lang, words] of Object.entries(langs)) for (const [word, meaning] of Object.entries(words)) put(allergen, lang, word, meaning, "contains", true);
  }

  const exceptions = {};
  for (const [allergen, list] of Object.entries(manual.exceptions || {})) {
    if (!Array.isArray(list)) continue;
    exceptions[allergen] = list.map((e) => ({ ...e, norm: norm(e.phrase) })).sort((a, b) => b.norm.length - a.norm.length);
  }

  const byAllergen = {};
  for (const e of entries.values()) (byAllergen[e.allergen] ||= []).push(e);
  // Longest first, so "suero de leche" wins over "leche".
  for (const list of Object.values(byAllergen)) list.sort((a, b) => b.norm.length - a.norm.length);

  return {
    byAllergen,
    exceptions,
    traces: (manual.traces?.phrases || []).map(norm).sort((a, b) => b.length - a.length),
    traceClosers: (manual.traces?.closers || []).map(norm),
    negPrefix: (manual.negations?.prefix || []).map(norm),
    negSuffix: (manual.negations?.suffix || []).map(norm),
    size: entries.size,
  };
}

// How strictly a word must stand on its own to count as a match.
//  - "substring": anywhere (scripts without spaces, long words in compound languages)
//  - "edge": at the start or end of a word (4-letter words in compound languages)
//  - "prefix": at the start of a word, any ending (word stems)
//  - "word": as a whole word, plural -s/-es allowed
const WIDTH = { word: 0, prefix: 1, edge: 2, substring: 3 };
// "edge" and "prefix" together: an edge match already covers the word start.
const widest = (a, b) => (WIDTH[a] >= WIDTH[b] ? a : b);

function matchMode(n, langs) {
  if (NO_SPACE_SCRIPT.test(n)) return "substring";
  const compound = langs.some((l) => COMPOUND_LANGS.has(l));
  if (compound && !n.includes(" ")) {
    if (n.length >= 5) return "substring";
    if (n.length === 4) return "edge";
  }
  return "word";
}
