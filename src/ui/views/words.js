import { lexicon, regions } from "../../data.js";
import { store } from "../../storage/store.js";
import { findPlace, languagesFor } from "../../core/places.js";
import { lookupWord, wordsFor } from "../../core/words.js";
import { byId } from "../../core/allergens.js";
import { esc, icon } from "../dom.js";

const LANG_NAMES = { de: "Deutsch", en: "Englisch", fr: "Französisch", it: "Italienisch", es: "Spanisch", ca: "Katalanisch", pt: "Portugiesisch", nl: "Niederländisch", el: "Griechisch", tr: "Türkisch", hr: "Kroatisch", pl: "Polnisch", cs: "Tschechisch", hu: "Ungarisch", sv: "Schwedisch", da: "Dänisch", nb: "Norwegisch", fi: "Finnisch", ro: "Rumänisch", sl: "Slowenisch", sk: "Slowakisch", mt: "Maltesisch", ru: "Russisch", uk: "Ukrainisch", ar: "Arabisch", he: "Hebräisch", ja: "Japanisch", zh: "Chinesisch", ko: "Koreanisch", th: "Thailändisch", xx: "international" };
const LIST_LANGS = ["es", "ca", "it", "fr", "pt", "en", "nl", "el", "tr", "hr", "pl", "cs", "hu", "sv", "da", "fi", "ro"];

export async function render(main, _params, app) {
  const [lex, reg] = await Promise.all([lexicon(), regions()]);
  if (!app.isCurrent(main)) return;
  const person = store.activePerson();
  const allergen = Object.keys(person.allergens).find((a) => a !== "lactose") || "milk";
  const p = store.get().place;
  const placeLangs = p ? languagesFor(findPlace(reg, p.countryId, p.regionId)) : [];
  let listLang = placeLangs.find((l) => LIST_LANGS.includes(l)) || "es";

  main.innerHTML = `
    <div class="spread"><h1>Wörter-Check</h1><a class="btn small" href="#/start" aria-label="Zurück">${icon.back}</a></div>
    <p class="muted">Ein Wort von der Verpackung oder Speisekarte eintippen. Die App sucht in allen Sprachen gleichzeitig.</p>
    <div class="field"><label for="q">Wort</label><input class="input" id="q" autocomplete="off" autocapitalize="off" placeholder="z. B. nata, burro, lactosérum"></div>
    <div id="answer" aria-live="polite"></div>
    <section class="card stack">
      <div class="spread"><h2>${esc(byId[allergen].short)} heisst auf …</h2></div>
      <div class="seg" id="langs">${LIST_LANGS.map((l) => `<button data-l="${l}" aria-pressed="${l === listLang}">${esc(LANG_NAMES[l])}</button>`).join("")}</div>
      <p class="small muted" id="list"></p>
    </section>`;

  const q = main.querySelector("#q");
  const answer = main.querySelector("#answer");
  const showList = () => {
    const words = wordsFor(lex, allergen, listLang, 80);
    main.querySelector("#list").innerHTML = words.length ? words.map((w) => `<b>${esc(w.term)}</b>${w.meaning ? ` (${esc(w.meaning)})` : ""}`).join(" · ") : "Für diese Sprache sind noch keine Wörter hinterlegt.";
  };
  main.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => {
    listLang = b.dataset.l;
    main.querySelectorAll("[data-l]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    showList();
  }));
  showList();

  q.addEventListener("input", () => {
    const v = q.value.trim();
    if (v.length < 2) { answer.innerHTML = ""; return; }
    const r = lookupWord(lex, v);
    const mine = (list) => list.filter((e) => e.allergen in person.allergens || (e.allergen === "milk" && "lactose" in person.allergens));
    const exact = mine(r.exact);
    const others = r.exact.filter((e) => !exact.includes(e));
    const langsOf = (e) => e.langs.map((l) => LANG_NAMES[l] || l).slice(0, 4).join(", ");
    if (r.lookalike && !exact.length) {
      answer.innerHTML = `<section class="verdict safe"><div class="head">${icon.verdict.safe}<span>${esc(r.lookalike.phrase)}</span></div><p>${esc(r.lookalike.de)}</p></section>`;
    } else if (exact.length) {
      const e = exact[0];
      const maybe = e.kind === "maybe";
      const shown = e.allergen === "milk" && !("milk" in person.allergens) ? "lactose" : e.allergen;
      answer.innerHTML = `<section class="verdict ${maybe ? "caution" : "unsafe"}"><div class="head">${icon.verdict[maybe ? "caution" : "unsafe"]}<span>${esc(e.term)}: ${maybe ? "Vorsicht" : esc(byId[shown].short)}</span></div>
        <p>${e.meaning ? esc(e.meaning) + " · " : ""}${esc(langsOf(e))}</p></section>`;
    } else {
      const partial = mine(r.partial).slice(0, 6);
      answer.innerHTML = `<section class="verdict unknown"><div class="head">${icon.verdict.unknown}<span>Nicht in der Liste</span></div>
        <p>Das heisst nicht, dass es unbedenklich ist. Im Zweifel nachfragen.</p></section>
        ${partial.length ? `<p class="small muted" style="margin-top:8px">Ähnliche Wörter: ${partial.map((e) => `<b>${esc(e.term)}</b>${e.meaning ? ` (${esc(e.meaning)})` : ""}`).join(", ")}</p>` : ""}
        ${others.length ? `<p class="small muted">Gehört zu: ${others.map((e) => esc(byId[e.allergen]?.name || e.allergen)).join(", ")} (nicht in deinem Profil)</p>` : ""}`;
    }
  });
  q.focus();
}
