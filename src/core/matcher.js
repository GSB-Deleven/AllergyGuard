// Checks a product (or a plain ingredient text) against a person's profile.
//
// Guiding rules:
//  1. Never "safe" without data: no ingredient text -> "unknown".
//  2. When in doubt, the stricter result wins.
//  3. Every result explains itself (which word, where, why).

import { normalize, norm, isWordChar, isLetter, uncoveredShare, ocrRepair } from "./normalize.js";
import { byId } from "./allergens.js";

// "review": nothing found, but the text comes from a photo (OCR), so it is never plain green.
export const VERDICT = { safe: "safe", review: "review", caution: "caution", unsafe: "unsafe", unknown: "unknown" };
const RANK = { safe: 0, review: 1, unknown: 2, caution: 3, unsafe: 4 };
const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);
const SEVERITIES = new Set(["tracesOk", "avoidTraces", "severe"]);

// Lactose intolerance reuses the milk word list. These words mean lactose itself.
const LACTOSE_WORDS = /lact|lakt|λακτ|laktoz|lattosi|milchzucker|maitosokeri|mjolksocker|maelkesukker|乳糖|лактоз|לקטוז|لاكتوز/;

// A word split at the end of a line: "Mol-⏎kenpulver".
const HYPHEN_BREAK = /\p{L}[-‐–]\s*\n\s*\p{L}/u;
// Digits or "|" glued to letters, or a capital I inside a lower-case word: typical OCR errors.
const OCR_SUSPECT = /\p{L}[01|]|[01|]\p{L}|\p{Ll}I\p{Ll}/u;

/**
 * Finds every allergen word in a text.
 * @returns {{matches: Array<{allergen, kind, term, meaning, langs, start, end, inTraces, negated}>, notes: Array}}
 *   start/end are offsets into the ORIGINAL text (for highlighting).
 *   kind: "contains" | "maybe" | "ocr" (word only found after repairing a likely OCR error)
 */
export function findMatches(text, lexicon, allergenIds = Object.keys(lexicon.byAllergen)) {
  const src = String(text ?? "");
  // Words split at a line end are glued together first ("Mol-⏎kenpulver").
  const { matches, notes } = scan(src, src, lexicon, allergenIds, true);
  const free = (m) => !matches.some((x) => x.allergen === m.allergen && m.start < x.end && m.end > x.start);

  // The hyphen may also be a real one ("Milch-⏎Schokolade"): read the text both ways,
  // the stricter reading wins. Known look-alikes found in the glued text stay look-alikes.
  if (HYPHEN_BREAK.test(src)) {
    for (const m of scan(src, src, lexicon, allergenIds, false).matches) {
      if (free(m) && !notes.some((n) => n.allergen === m.allergen && m.start < n.end && m.end > n.start)) matches.push(m);
    }
  }

  // Likely OCR errors ("Mi1chpulver"): a word that only appears after the repair is a
  // "possible" hit. It can make a result worse, never better.
  if (OCR_SUSPECT.test(src)) {
    for (const one of ["l", "i"]) {
      const { text: repaired, changed } = ocrRepair(src, one);
      if (!changed.size) break;
      for (const m of scan(repaired, src, lexicon, allergenIds, true).matches) {
        let touched = false;
        for (let i = m.start; i < m.end && !touched; i++) touched = changed.has(i);
        if (touched && free(m)) matches.push({ ...m, kind: m.kind === "maybe" ? "maybe" : "ocr" });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);
  notes.sort((a, b) => a.start - b.start);
  return { matches, notes };
}

// One pass over `text`. `display` is the original text of the same length, used for the
// quoted words (it differs from `text` only in the OCR pass).
function scan(text, display, lexicon, allergenIds, joinHyphens) {
  const { text: t, map, breaks } = normalize(text, { joinHyphens });
  const orig = (i) => map[i] ?? display.length;
  const origEnd = (i) => (i > 0 ? map[i - 1] + 1 : 0);
  const matches = [];
  const notes = [];

  const traceRanges = findTraceRanges(t, lexicon.traces, breaks, lexicon.traceClosers || []);
  const inTraces = (i) => traceRanges.some(([a, b]) => i >= a && i < b);

  for (const allergen of allergenIds) {
    const listId = allergen === "lactose" ? "milk" : allergen;
    const words = lexicon.byAllergen[listId];
    if (!words) continue;
    const taken = []; // [start,end) ranges in normalized text already explained

    // 1. Known look-alikes ("coconut milk", "Kakaobutter") are explained first and
    //    blanked out, so the rest of the text is still checked normally.
    //    They only count as a WHOLE word or phrase: "oat milk" must not hide "goat milk",
    //    and "Kakaobutter" must not hide "Kakaobuttermilch".
    for (const ex of lexicon.exceptions[listId] || []) {
      for (const at of indexesOf(t, ex.norm)) {
        const end = boundaryOk(t, at, at + ex.norm.length, "word");
        if (end === false) continue;
        if (overlaps(taken, at, end)) continue;
        taken.push([at, end]);
        notes.push({ allergen, kind: "lookalike", term: display.slice(orig(at), origEnd(end)), meaning: ex.de, start: orig(at), end: origEnd(end) });
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
          term: display.slice(orig(at), origEnd(fullEnd)),
          listed: w.term,
          meaning: w.meaning,
          langs: w.langs,
          start: orig(at),
          end: origEnd(fullEnd),
          inTraces: inTraces(at),
          negated: isNegated(t, at, fullEnd, lexicon),
        };
        if (allergen === "lactose") hit.isLactose = LACTOSE_WORDS.test(w.norm);
        matches.push(hit);
      }
    }
  }
  return { matches, notes };
}

// Phrases that stand where an ingredient list should be, but are none.
const PLACEHOLDER = /\b(siehe|vgl\.?) (die |der |das |auf der |auf |)(ver)?packung|siehe (etikett|ruckseite|aufdruck)|see (the |on |)(pack|packaging|label|back)\b|voir (l'|sur l'|)(emballage|etiquette)|ver (el |la |)(envase|etiqueta)|vedi (la |l'|)(confezione|etichetta)|zie (de |)verpakking/;
const ITEM_SEPARATOR = /[,;•·|\n\r、，،]|\s[-–—]\s/;

/**
 * Can this text justify a green result at all?
 * It must look like an ingredient list (several items) in a script the word lists cover.
 * @returns {{ readable: boolean, why: null|"empty"|"quality"|"script"|"notList" }}
 */
export function assessText(text, quality = 1) {
  const t = String(text ?? "").trim();
  if (!t) return { readable: false, why: "empty" };
  if (quality < 0.5) return { readable: false, why: "quality" };
  if (uncoveredShare(t) > 0.2) return { readable: false, why: "script" };
  const items = t.split(ITEM_SEPARATOR).filter((x) => (x.match(/\p{L}/gu) || []).length >= 2);
  if (t.length < 8 || items.length < 2) return { readable: false, why: "notList" };
  if (items.length < 4 && PLACEHOLDER.test(norm(t))) return { readable: false, why: "notList" };
  return { readable: true, why: null };
}

const WHY_RANK = { notList: 1, script: 2, quality: 3 };

/**
 * Main entry point.
 * @param {object} input   { ingredientsText?, extraTexts?, allergenTags?, traceTags?, textQuality?, source? }
 *                         textQuality: 0..1 (from OCR); below 0.5 counts as unreadable.
 *                         extraTexts: other language versions of the same list.
 *                         source: "ocr" for text read from a photo. Such a result is never plain "safe".
 * @param {object} person  { name, allergens: { milk: "avoidTraces", ... } }
 * @param {object} lexicon from buildLexicon()
 */
export function checkProduct(input, person, lexicon) {
  const allergenIds = Object.keys(person?.allergens || {});
  const text = String(input?.ingredientsText || "").trim();
  const extras = (input?.extraTexts || []).map((x) => String(x || "").trim()).filter(Boolean);
  const tags = new Set(input?.allergenTags || []);
  const traceTags = new Set(input?.traceTags || []);
  const quality = input?.textQuality ?? 1;
  const fromPhoto = input?.source === "ocr";

  // Green needs at least one text that is a plausible ingredient list on its own.
  const assessed = [text, ...extras].filter(Boolean).map((x) => assessText(x, quality));
  const readable = assessed.some((a) => a.readable);
  const why = readable ? null : assessed.map((a) => a.why).sort((a, b) => (WHY_RANK[b] || 0) - (WHY_RANK[a] || 0))[0] || "empty";

  // Words are searched in every text, readable or not: a hit always counts.
  const known = allergenIds.filter((id) => byId[id]);
  const { matches, notes } = text ? findMatches(text, lexicon, known) : { matches: [], notes: [] };
  const extraMatches = extras.flatMap((x) => findMatches(x, lexicon, known).matches.map((m) => ({ ...m, start: undefined, end: undefined, extra: true })));

  const findings = [];
  const perAllergen = {};

  for (const id of allergenIds) {
    const severity = person.allergens[id];
    // A profile that names an allergen or a level the app does not know cannot be checked.
    if (!byId[id] || !SEVERITIES.has(severity)) {
      perAllergen[id] = VERDICT.unknown;
      findings.push({ allergen: id, verdict: VERDICT.unknown, source: "profile", kind: "invalid", reason: `Das Profil enthält eine unbekannte Angabe („${id}“). Bitte das Profil neu anlegen.` });
      continue;
    }
    const off = byId[id]?.off;
    let verdict = !readable ? VERDICT.unknown : fromPhoto ? VERDICT.review : VERDICT.safe;
    const add = (v, f) => { verdict = worst(verdict, v); findings.push({ allergen: id, verdict: v, ...f }); };

    // Allergen information from Open Food Facts (language independent).
    const milkish = id === "lactose" ? "en:milk" : off;
    if (milkish && tags.has(milkish)) {
      add(id === "lactose" ? VERDICT.caution : VERDICT.unsafe, { source: "off", kind: "contains", reason: id === "lactose" ? "Enthält Milch – Laktosegehalt prüfen (Angabe Open Food Facts)" : "Als Allergen angegeben (Open Food Facts)" });
    }
    if (milkish && traceTags.has(milkish)) {
      add(traceVerdict(severity), { source: "off", kind: "traces", reason: "Kann Spuren enthalten (Angabe Open Food Facts)" });
    }

    for (const m of [...matches, ...extraMatches].filter((x) => x.allergen === id)) {
      const where = { source: "text", term: m.term, start: m.start, end: m.end };
      if (m.negated) {
        findings.push({ allergen: id, verdict: VERDICT.safe, ...where, kind: "negated",
          reason: id === "milk" && /lact|lakt/.test(m.term.toLowerCase())
            ? "„laktosefrei“ heisst nicht milchfrei – Milcheiweiss kann trotzdem enthalten sein"
            : "Hersteller verneint dieses Allergen hier ausdrücklich" });
        continue;
      }
      const meaning = m.meaning ? ` = ${m.meaning}` : "";
      if (m.kind === "ocr") {
        // Never downgraded to a trace: the word itself is already uncertain.
        add(VERDICT.caution, { ...where, kind: "ocr", reason: `Möglicher Lesefehler: „${m.term}“ könnte „${m.listed}“ heissen${m.meaning && m.meaning !== m.listed ? ` (${m.meaning})` : ""}. Bitte auf der Verpackung nachlesen.` });
      } else if (m.inTraces) {
        add(traceVerdict(severity), { ...where, kind: "traces", reason: `Spuren-Hinweis: ${m.term}${meaning}` });
      } else if (m.kind === "maybe") {
        add(VERDICT.caution, { ...where, kind: "maybe", reason: `${m.term}: ${m.meaning || "kann dieses Allergen enthalten"}` });
      } else if (id === "lactose" && !m.isLactose) {
        add(VERDICT.caution, { ...where, kind: "contains", reason: `${m.term}${meaning} – Milchprodukt, Laktosegehalt prüfen` });
      } else {
        add(VERDICT.unsafe, { ...where, kind: "contains", reason: `${m.term}${meaning}` });
      }
    }
    perAllergen[id] = verdict;
  }

  for (const n of notes) if (allergenIds.includes(n.allergen)) findings.push({ ...n, verdict: VERDICT.safe, source: "text", reason: `${n.term}: ${n.meaning}` });

  let verdict = VERDICT.unknown;
  if (allergenIds.length) {
    verdict = VERDICT.safe;
    for (const v of Object.values(perAllergen)) verdict = worst(verdict, v);
  }
  // Without readable text, tags alone can only make things worse, never "safe".
  if (!readable && RANK[verdict] < RANK[VERDICT.unknown]) verdict = VERDICT.unknown;

  findings.sort((a, b) => RANK[b.verdict] - RANK[a.verdict] || (a.start ?? 1e9) - (b.start ?? 1e9));
  return { verdict, perAllergen, findings, readable, why };
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
  // A digit glued to a word is a footnote or an OCR slip ("lait1"), not part of the word.
  // Only for words that themselves end in a digit ("E220") a following digit matters.
  const more = isLetter(t[end - 1]) ? isLetter : isWordChar;
  const before = isLetter(t[start]) ? isLetter : isWordChar;
  const startsWord = !before(t[start - 1]);
  if (mode === "prefix") {
    if (!startsWord) return false;
    let e = end;
    while (isLetter(t[e])) e++;
    return e;
  }
  // allow plural endings: "quesos", "huevos", "yogures"
  let e = end;
  if (!more(t[e])) {
    // exact word end
  } else if (t[e] === "s" && !more(t[e + 1])) e += 1;
  else if (t.slice(e, e + 2) === "es" && !more(t[e + 2])) e += 2;
  const endsWord = !more(t[e]);
  if (mode === "word") return startsWord && endsWord ? e : false;
  // "edge": start or end of a (compound) word
  if (startsWord) return end;
  if (!more(t[end])) return end;
  return false;
}

function overlaps(ranges, a, b) {
  return ranges.some(([x, y]) => a < y && b > x);
}

// A trace mention reaches from a trace phrase ("may contain", "puede contener trazas")
// to the end of that statement: sentence end, line break, closing bracket, a colon that
// starts something new, or a dash. Stopping early is the strict side: what follows is
// then read as a normal ingredient.
function findTraceRanges(t, phrases, breaks, closers) {
  const ranges = [];
  for (const p of phrases) {
    for (const at of indexesOf(t, p)) {
      if (isWordChar(t[at - 1])) continue;
      const from = at + p.length;
      let depth = 0;
      let end = t.length;
      for (let i = from; i < t.length; i++) {
        const c = t[i];
        if (breaks.has(i) || c === "." || c === ";" || c === "•" || c === "!" || c === "?" || c === "]") { end = i; break; }
        if (c === " " && t[i + 1] === "-" && t[i + 2] === " ") { end = i; break; }
        if (c === "(") depth++;
        else if (c === ")") { if (depth === 0) { end = i; break; } depth--; }
        // "may contain: nuts" belongs to the statement, "… Zutaten: Zucker" starts a new list
        else if (c === ":" && t.slice(from, i).trim() !== "") { end = i; break; }
      }
      // "kann Spuren von Nüssen enthalten": the statement ends with that verb.
      for (const w of closers) {
        const i = t.indexOf(w, from);
        if (i !== -1 && i + w.length < end && !isLetter(t[i - 1]) && !isLetter(t[i + w.length])) end = i + w.length;
      }
      ranges.push([at, end]);
    }
  }
  return ranges;
}

// Is the allergen word at [start,end) explicitly denied?
//  - a denying word directly in front: "ohne Milch", "frei von Milch", "sans lait"
//  - "frei"/"free" glued to it or joined by a hyphen: "milchfrei", "milk-free"
//  - "milk free" with a space only at the end of a statement
// Never: an allergen in FRONT of "frei von …" ("Vollmilch frei von Gentechnik"),
// or "butter free range eggs".
function isNegated(t, start, end, lexicon) {
  const before = t.slice(Math.max(0, start - 14), start).trimEnd();
  const after = t.slice(end, end + 24);
  for (const p of lexicon.negPrefix) {
    if (before.endsWith(p) && !isWordChar(before[before.length - p.length - 1])) return true;
  }
  for (const s of lexicon.negSuffix) {
    const clean = s.replace(/^-/, "");
    const glue = after.startsWith(clean) ? "" : after.startsWith("-" + clean) ? "-" : after.startsWith(" " + clean) ? " " : null;
    if (glue === null) continue;
    let rest = after.slice(glue.length + clean.length);
    const ending = /^(e|er|es|en|em)(?![\p{L}\p{N}])/u.exec(rest); // "freie", "freier", but not "freiland"
    if (ending) rest = rest.slice(ending[0].length);
    else if (isWordChar(rest[0])) continue;
    if (glue !== " ") return true;
    // With a space the statement must end here: "milk free." but not "milk free range".
    if (/^\s*([.,;:!?)\]]|$)/.test(rest)) return true;
  }
  return false;
}
