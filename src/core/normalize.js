// Text normalisation shared by the word list and the text being checked.
// Works without any browser API so it runs in Node tests as well.
//
// normalize("Süßmolke") -> { text: "sussmolke", map: [...] }
// `map[i]` is the index in the original string of normalized character i,
// so matches can be highlighted in the original text.

const SPECIAL = {
  "ß": "ss", "ẞ": "ss", "ı": "i", "ł": "l", "Ł": "l", "ø": "o", "Ø": "o",
  "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe", "đ": "d", "Đ": "d", "þ": "th",
  "ς": "σ", "’": "'", "‘": "'", "`": "'", "´": "'", "–": "-", "—": "-", "‐": "-",
};

// Combining diacritics of Latin, Greek and Cyrillic (U+0300–U+036F).
// Marks of other scripts (Devanagari, Thai …) carry meaning and are kept.
const COMBINING = /[̀-ͯ]/g;

function foldChar(ch) {
  if (SPECIAL[ch]) return SPECIAL[ch];
  const folded = ch.normalize("NFKD").replace(COMBINING, "").toLowerCase();
  return SPECIAL[folded] ?? folded;
}

export function normalize(input) {
  const src = String(input ?? "");
  let text = "";
  const map = [];
  let lastWasSpace = true;
  for (let i = 0; i < src.length; i++) {
    let ch = src[i];
    // keep surrogate pairs together
    if (ch >= "\ud800" && ch <= "\udbff" && i + 1 < src.length) ch += src[++i];
    const start = ch.length === 2 ? i - 1 : i;
    let out = foldChar(ch);
    if (/\s/.test(out)) {
      if (lastWasSpace) continue;
      out = " ";
    }
    for (const c of out) {
      text += c;
      map.push(start);
    }
    lastWasSpace = out === " ";
  }
  if (text.endsWith(" ")) { text = text.slice(0, -1); map.pop(); }
  return { text, map };
}

export const norm = (s) => normalize(s).text;

// Letters and digits of any script count as "word" characters.
export const isWordChar = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

// Scripts written without spaces between words.
export const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
