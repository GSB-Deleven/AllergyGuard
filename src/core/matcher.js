// Checks a product (or a plain ingredient text) against a person's profile.
//
// Guiding rules:
//  1. Never "safe" without data: no ingredient text -> "unknown".
//  2. When in doubt, the stricter result wins.
//  3. Every result explains itself (which word, where, why).

import { normalize, isWordChar } from "./normalize.js";
import { byId } from "./allergens.js";

export const VERDICT = { safe: "safe", caution: "caution", unsafe: "unsafe", unknown: "unknown" };
const RANK = { safe: 0, unknown: 1, caution: 2, unsafe: 3 };
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

// Lactose intolerance reuses the milk word list. These words mean lactose itself.
const LACTOSE_WORDS = /lact|lakt|λακτ|laktoz|lattosi|milchzucker|maitosokeri|mjolksocker|maelkesukker|乳糖/;

/**
 * Finds every allergen word in a text.
 * @returns {Array<{allergen, kind, term, meaning, langs, start, end, inTraces, negated}>}
 *   start/end are offsets into the ORIGINAL text (for highlighting).
 */
export function findMatches(text, lexicon, allergenIds = Object.keys(lexicon.byAllergen)) {
  const { text: t, map } = normalize(text);
  const orig = (i) => map[i] ?? String(text).length;
  const origEnd = (i) => (i > 0 ? map[i - 1] + 1 : 0);
  const results = [];
  const notes = [];

  const traceRanges = findTraceRanges(t, lexicon.traces);
  const inTraces = (i) => traceRanges.some(([a, b]) => i >= a && i < b);

  for (const allergen of allergenIds) {
    const words = lexicon.byAllergen[allergen === "lactose" ? "milk" : allergen];
    if (!words) continue;
    const taken = []; // [start,end) ranges in normalized text already explained

    // 1. Known look-alikes ("coconut milk", "Kakaobutter") are explained first and
    //    blanked out, so the rest of the text is still checked normally.
    for (const ex of lexicon.exceptions[allergen === "lactose" ? "milk" : allergen] || []) {
      for (const at of indexesOf(t, ex.norm)) {
        if (!boundaryOk(t, at, at + ex.norm.length, "word") && !boundaryOk(t, at, at + ex.norm.length, "edge")) continue;
        if (overlaps(taken, at, at + ex.norm.length)) continue;
        taken.push([at, at + ex.norm.length]);
        notes.push({ allergen, kind: "lookalike", term: String(text).slice(orig(at), origEnd(at + ex.norm.length)), meaning: ex.de, start: orig(at), end: origEnd(at + ex.norm.length) });
      }
    }

    // 2. The word list, longest words first.
    for (const w of words) {
      for (const at of indexesOf(t, w.norm)) {
        const end = at + w.norm.length;
        const fullEnd = boundaryOk(t, at, end, w.mode);
        if (fullEnd === false) continue;
        if (overlaps(taken, at, fullEnd)) continue;
        taken.push([at, fullEnd]);
        const hit = {
          allergen,
          kind: w.kind, // "contains" | "maybe"
          term: String(text).slice(orig(at), origEnd(fullEnd)),
          listed: w.term,
          meaning: w.meaning,
          langs: w.langs,
          start: orig(at),
          end: origEnd(fullEnd),
          inTraces: inTraces(at),
          negated: isNegated(t, at, fullEnd, lexicon),
        };
        if (allergen === "lactose") hit.isLactose = LACTOSE_WORDS.test(w.norm);
        results.push(hit);
      }
    }
  }
  results.sort((a, b) => a.start - b.start);
  notes.sort((a, b) => a.start - b.start);
  return { matches: results, notes };
}

/**
 * Main entry point.
 * @param {object} input   { ingredientsText?, allergenTags?, traceTags?, textQuality? }
 *                         textQuality: 0..1 (from OCR); below 0.5 counts as unreadable.
 * @param {object} person  { name, allergens: { milk: "avoidTraces", ... } }
 * @param {object} lexicon from buildLexicon()
 */
export function checkProduct(input, person, lexicon) {
  const allergenIds = Object.keys(person?.allergens || {});
  const text = (input?.ingredientsText || "").trim();
  const tags = new Set(input?.allergenTags || []);
  const traceTags = new Set(input?.traceTags || []);
  const readable = text.length >= 8 && (input?.textQuality ?? 1) >= 0.5;

  const { matches, notes } = readable ? findMatches(text, lexicon, allergenIds) : { matches: [], notes: [] };
  const findings = [];
  const perAllergen = {};

  for (const id of allergenIds) {
    const severity = person.allergens[id];
    const off = byId[id]?.off;
    let verdict = readable ? VERDICT.safe : VERDICT.unknown;
    const add = (v, f) => { verdict = worst(verdict, v); findings.push({ allergen: id, verdict: v, ...f }); };

    // Allergen information from Open Food Facts (language independent).
    const milkish = id === "lactose" ? "en:milk" : off;
    if (milkish && tags.has(milkish)) {
      add(id === "lactose" ? VERDICT.caution : VERDICT.unsafe, { source: "off", kind: "contains", reason: id === "lactose" ? "Enthält Milch – Laktosegehalt prüfen (Angabe Open Food Facts)" : "Als Allergen angegeben (Open Food Facts)" });
    }
    if (milkish && traceTags.has(milkish)) {
      add(traceVerdict(severity), { source: "off", kind: "traces", reason: "Kann Spuren enthalten (Angabe Open Food Facts)" });
    }

    for (const m of matches.filter((x) => x.allergen === id)) {
      if (m.negated) {
        findings.push({ allergen: id, verdict: VERDICT.safe, source: "text", kind: "negated", term: m.term, start: m.start, end: m.end,
          reason: id === "milk" && /lact|lakt/.test(m.term.toLowerCase())
            ? "„laktosefrei“ heisst nicht milchfrei – Milcheiweiss kann trotzdem enthalten sein"
            : "Hersteller verneint dieses Allergen hier ausdrücklich" });
        continue;
      }
      const meaning = m.meaning ? ` = ${m.meaning}` : "";
      if (m.inTraces) {
        add(traceVerdict(severity), { source: "text", kind: "traces", term: m.term, start: m.start, end: m.end, reason: `Spuren-Hinweis: ${m.term}${meaning}` });
      } else if (m.kind === "maybe") {
        add(VERDICT.caution, { source: "text", kind: "maybe", term: m.term, start: m.start, end: m.end, reason: `${m.term}: ${m.meaning || "kann dieses Allergen enthalten"}` });
      } else if (id === "lactose" && !m.isLactose) {
        add(VERDICT.caution, { source: "text", kind: "contains", term: m.term, start: m.start, end: m.end, reason: `${m.term}${meaning} – Milchprodukt, Laktosegehalt prüfen` });
      } else {
        add(VERDICT.unsafe, { source: "text", kind: "contains", term: m.term, start: m.start, end: m.end, reason: `${m.term}${meaning}` });
      }
    }
    perAllergen[id] = verdict;
  }

  for (const n of notes) if (allergenIds.includes(n.allergen)) findings.push({ ...n, verdict: VERDICT.safe, source: "text", reason: `${n.term}: ${n.meaning}` });

  let verdict = allergenIds.length ? VERDICT.safe : VERDICT.unknown;
  for (const v of Object.values(perAllergen)) verdict = worst(verdict, v);
  // Without readable text, tags alone can only make things worse, never "safe".
  if (!readable && verdict === VERDICT.safe) verdict = VERDICT.unknown;

  findings.sort((a, b) => RANK[b.verdict] - RANK[a.verdict] || (a.start ?? 1e9) - (b.start ?? 1e9));
  return { verdict, perAllergen, findings, readable };
}

function traceVerdict(severity) {
  if (severity === "tracesOk") return VERDICT.safe;
  if (severity === "severe") return VERDICT.unsafe;
  return VERDICT.caution;
}

function indexesOf(hay, needle) {
  const out = [];
  if (!needle) return out;
  let i = hay.indexOf(needle);
  while (i !== -1) { out.push(i); i = hay.indexOf(needle, i + 1); }
  return out;
}

// Returns the (possibly extended) end of the match, or false if the boundaries do not fit.
function boundaryOk(t, start, end, mode) {
  if (mode === "substring") return end;
  const startsWord = !isWordChar(t[start - 1]);
  // allow plural endings: "quesos", "huevos", "yogures"
  let e = end;
  if (!isWordChar(t[e])) {
    // exact word end
  } else if (t[e] === "s" && !isWordChar(t[e + 1])) e += 1;
  else if (t.slice(e, e + 2) === "es" && !isWordChar(t[e + 2])) e += 2;
  const endsWord = !isWordChar(t[e]);
  if (mode === "word") return startsWord && endsWord ? e : false;
  // "edge": start or end of a (compound) word
  if (startsWord) return end;
  if (!isWordChar(t[end])) return end;
  return false;
}

function overlaps(ranges, a, b) {
  return ranges.some(([x, y]) => a < y && b > x);
}

// Everything from a trace phrase ("may contain", "puede contener trazas") to the end
// of that sentence counts as a trace mention.
function findTraceRanges(t, phrases) {
  const ranges = [];
  for (const p of phrases) {
    for (const at of indexesOf(t, p)) {
      if (isWordChar(t[at - 1])) continue;
      let end = t.slice(at).search(/[.;\n•]|\s-\s/);
      end = end === -1 ? t.length : at + end;
      ranges.push([at, end]);
    }
  }
  return ranges;
}

function isNegated(t, start, end, lexicon) {
  const before = t.slice(Math.max(0, start - 14), start).trimEnd();
  const after = t.slice(end, end + 8);
  for (const p of lexicon.negPrefix) {
    if (before.endsWith(p) && !isWordChar(before[before.length - p.length - 1])) return true;
  }
  for (const s of lexicon.negSuffix) {
    const clean = s.replace(/^-/, "");
    if (after.startsWith(clean) || after.startsWith("-" + clean) || after.startsWith(" " + clean)) {
      const next = after[(after.startsWith(clean) ? 0 : 1) + clean.length];
      // "frei", "freie", "free" – but not "freiland"
      if (!isWordChar(next) || /^(e|er|es|en|em)\b/.test(after.slice((after.startsWith(clean) ? 0 : 1) + clean.length))) return true;
    }
  }
  return false;
}
