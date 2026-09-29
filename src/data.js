// Loads the word lists, regions and card texts once. Everything is served from
// the app itself (and cached by the service worker), so it works offline.

import { buildLexicon } from "./core/lexicon.js";

const cache = {};
const getJson = async (path) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

export function lexicon() {
  return (cache.lexicon ||= Promise.all([getJson("data/synonyms.generated.json"), getJson("data/synonyms.manual.json")]).then(([g, m]) => buildLexicon(g, m)));
}

export function regions() {
  return (cache.regions ||= getJson("data/regions.json"));
}

export const CARD_LANGS = ["de", "en", "fr", "it", "es", "ca", "pt", "nl", "el", "tr", "hr"];

export function card(lang) {
  return (cache[`card-${lang}`] ||= getJson(`data/cards/${lang}.json`));
}
