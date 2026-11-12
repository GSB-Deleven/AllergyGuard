// Text normalisation shared by the word list and the text being checked.
// Works without any browser API so it runs in Node tests as well.
//
// normalize("Süßmolke") -> { text: "sussmolke", map: [...], breaks: Set }
// `map[i]` is the index in the original string of normalized character i,
// so matches can be highlighted in the original text.
// `breaks` holds the positions (in the normalized text) of spaces that stand
// for a line break. Line breaks end a "may contain" statement.

const SPECIAL = {
  "ß": "ss", "ẞ": "ss", "ı": "i", "ł": "l", "Ł": "l", "ø": "o", "Ø": "o",
  "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe", "đ": "d", "Đ": "d", "þ": "th",
  "ς": "σ", "’": "'", "‘": "'", "`": "'", "´": "'", "–": "-", "—": "-", "‐": "-", "‑": "-", "−": "-",
  // Ordinal signs stay as they are, so "Nº leche" is not read as "no leche".
  "º": "º", "ª": "ª",
};

// Combining diacritics of Latin, Greek and Cyrillic (U+0300–U+036F).
// Marks of other scripts (Devanagari, Thai …) carry meaning and are kept.
const COMBINING = /[̀-ͯ]/g;

// Characters that are not part of the word they are glued to:
//  - soft hyphen and zero-width characters (invisible, common in copied text and OCR)
//  - footnote markers such as "lait¹" or "Milch†"
const INVISIBLE = /[­​-‍⁠﻿]/;
const FOOTNOTE = /[¹²³⁰-⁹₀-₉†‡]/;

const LETTER = /\p{L}/u;

function foldChar(ch) {
  if (SPECIAL[ch]) return SPECIAL[ch];
  const folded = ch.normalize("NFKD").replace(COMBINING, "").toLowerCase();
  return SPECIAL[folded] ?? folded;
}

/**
 * @param {string} input
 * @param {{joinHyphens?: boolean}} [opts]  joinHyphens: glue words that were split at the
 *        end of a line ("Mol-⏎kenpulver" -> "molkenpulver").
 */
export function normalize(input, { joinHyphens = false } = {}) {
  const src = String(input ?? "");
  let text = "";
  const map = [];
  const breaks = new Set();
  let lastWasSpace = true;
  for (let i = 0; i < src.length; i++) {
    let ch = src[i];
    // keep surrogate pairs together
    if (ch >= "\ud800" && ch <= "\udbff" && i + 1 < src.length) ch += src[++i];
    const start = ch.length === 2 ? i - 1 : i;
    if (INVISIBLE.test(ch) || FOOTNOTE.test(ch)) continue;
    let out = foldChar(ch);
    if (joinHyphens && out === "-" && text && LETTER.test(text[text.length - 1])) {
      const m = /^[^\S\n]*\r?\n\s*(?=\p{L})/u.exec(src.slice(i + 1, i + 40));
      if (m) { i += m[0].length; continue; }
    }
    if (/\s/.test(out)) {
      const isBreak = ch === "\n" || ch === "\r" || ch === " " || ch === " ";
      if (lastWasSpace) {
        if (isBreak && text) breaks.add(text.length - 1);
        continue;
      }
      out = " ";
      if (isBreak) breaks.add(text.length);
    }
    for (const c of out) {
      text += c;
      map.push(start);
    }
    lastWasSpace = out === " ";
  }
  if (text.endsWith(" ")) { text = text.slice(0, -1); map.pop(); }
  return { text, map, breaks };
}

export const norm = (s) => normalize(s).text;

// Letters and digits of any script count as "word" characters.
export const isWordChar = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
// Letters only: a digit glued to a word ("lait1", a footnote) does not continue the word.
export const isLetter = (c) => c !== undefined && LETTER.test(c);

// Scripts in which a listed word may also stand inside a longer run of letters:
// written without spaces (Chinese, Japanese, Thai …) or with glued particles
// (Korean, Arabic, Hebrew, Indian scripts).
export const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}]/u;

// Scripts the hand-checked word lists really cover. Text in any other script can
// produce a hit (red/yellow), but never a green result.
const COVERED_LETTER = /[\p{Script=Latin}\p{Script=Greek}]/u;

/** Share (0..1) of the letters that are in a script the word lists do not cover well. */
export function uncoveredShare(input) {
  let letters = 0;
  let foreign = 0;
  for (const ch of String(input ?? "")) {
    if (!LETTER.test(ch)) continue;
    letters++;
    if (!COVERED_LETTER.test(ch)) foreign++;
  }
  return letters ? foreign / letters : 0;
}

/**
 * Typical OCR mix-ups inside a word: "Mi1ch" (1 for l), "M1lch" (1 for i),
 * "Mi|ch", "MiIch" (capital I for l), "M0lke" (0 for o).
 * Returns a text of the SAME length, so offsets stay valid, and the changed positions.
 * @param {"l"|"i"} one  what a suspicious "1" or "|" is read as
 */
export function ocrRepair(input, one = "l") {
  const changed = new Set();
  const mark = (to) => (m, off) => { changed.add(off); return to; };
  const text = String(input ?? "")
    .replace(/(?<=\p{L})[1|](?!\d)|(?<!\d)[1|](?=\p{L})/gu, mark(one))
    .replace(/(?<=\p{L})0(?!\d)|(?<!\d)0(?=\p{L})/gu, mark("o"))
    .replace(/(?<=\p{Ll})I(?=\p{Ll})/gu, mark("l"));
  return { text, changed };
}
