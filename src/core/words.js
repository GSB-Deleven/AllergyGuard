// "Word check": what does this foreign word on the package mean?

import { norm } from "./normalize.js";

/**
 * @returns {{ exact: Array, partial: Array, lookalike: object|null }}
 */
export function lookupWord(lexicon, query) {
  const q = norm(query).trim();
  if (q.length < 2) return { exact: [], partial: [], lookalike: null };
  const exact = [];
  const partial = [];
  for (const [allergen, list] of Object.entries(lexicon.byAllergen)) {
    for (const e of list) {
      if (e.norm === q) exact.push({ allergen, ...e });
      else if (q.length >= 3 && (e.norm.includes(q) || (q.includes(e.norm) && e.norm.length >= 4))) partial.push({ allergen, ...e });
    }
  }
  let lookalike = null;
  for (const [allergen, list] of Object.entries(lexicon.exceptions)) {
    const hit = list.find((x) => x.norm === q || q.includes(x.norm));
    if (hit) lookalike = { allergen, ...hit };
  }
  partial.sort((a, b) => a.norm.length - b.norm.length);
  return { exact, partial: partial.slice(0, 12), lookalike };
}

/** All words for one allergen in one language, shortest (most common) first. */
export function wordsFor(lexicon, allergen, lang, limit = 60) {
  return (lexicon.byAllergen[allergen] || [])
    .filter((e) => e.langs.includes(lang) && e.kind === "contains")
    .sort((a, b) => a.norm.length - b.norm.length || a.norm.localeCompare(b.norm))
    .slice(0, limit);
}
