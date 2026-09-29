import { store } from "../../storage/store.js";
import { lookupBarcode, LookupError, productUrl } from "../../services/openFoodFacts.js";
import { checkProduct } from "../../core/matcher.js";
import { byId } from "../../core/allergens.js";
import { lexicon } from "../../data.js";
import { esc, icon, verdictText } from "../dom.js";

export const REPO = "https://github.com/GSB-Deleven/AllergyGuard";

// Result for a barcode: #/result/<barcode>
export async function render(main, params, app) {
  const barcode = decodeURIComponent(params[0] || "");
  main.innerHTML = `<div class="spread"><h1>Ergebnis</h1><a class="btn small" href="#/scan" aria-label="Zurück">${icon.back}</a></div>
    <div class="card flat stack" aria-busy="true"><p><b>Suche Produkt ${esc(barcode)} …</b></p><div class="progress"><i style="width:60%"></i></div></div>`;

  const lex = await lexicon();
  let product = null;
  let origin = "live";
  let error = null;
  try {
    product = await lookupBarcode(barcode);
    store.cacheProduct(product);
    store.dequeue(barcode);
  } catch (err) {
    error = err;
    const cached = store.cachedProduct(barcode);
    if (cached && (err.kind === "offline" || err.kind === "timeout" || err.kind === "server")) {
      product = cached; origin = "cache"; error = null;
    } else if (err.kind === "offline" || err.kind === "timeout") {
      store.enqueue(barcode);
    }
  }
  if (!app.isCurrent(main)) return;

  if (!product) return renderLookupError(main, barcode, error);
  const text = [product.ingredientsText, ...(product.otherTexts || [])].filter(Boolean).join("\n\n");
  renderResult(main, app, {
    title: product.name, subtitle: [product.brand, product.barcode].filter(Boolean).join(" · "), image: product.image,
    input: { ingredientsText: text, allergenTags: product.allergenTags, traceTags: product.traceTags },
    mainTextLength: product.ingredientsText.length,
    source: origin === "cache"
      ? `Gespeicherte Daten von Open Food Facts (Stand ${new Date(product.fetchedAt).toLocaleDateString("de-CH")}) – du bist offline.`
      : "Daten: Open Food Facts, von Freiwilligen gepflegt.",
    offLink: productUrl(product.barcode),
    barcode: product.barcode,
  }, lex);
}

// Result for a typed or photographed text: #/check
export async function renderText(main, _params, app) {
  let payload = null;
  try { payload = JSON.parse(sessionStorage.getItem("ag.check") || "null"); } catch {}
  if (!payload?.text) return app.go("#/photo");
  const lex = await lexicon();
  if (!app.isCurrent(main)) return;
  renderResult(main, app, {
    title: payload.source === "photo" ? "Zutatenliste (Foto)" : "Zutatenliste (Text)",
    subtitle: payload.source === "photo" ? "Texterkennung auf deinem Gerät" : "Von Hand eingegeben",
    input: { ingredientsText: payload.text, textQuality: payload.quality ?? 1 },
    mainTextLength: payload.text.length,
    source: payload.source === "photo" ? "Quelle: Texterkennung auf deinem Handy. Prüfe den erkannten Text, bei unscharfen Fotos können Wörter fehlen." : "Quelle: dein eingegebener Text.",
    back: "#/photo",
  }, lex);
}

function renderResult(main, app, r, lex) {
  const person = store.activePerson();
  const res = checkProduct(r.input, person, lex);
  const ids = Object.keys(person.allergens);
  const label = ids.length === 1 ? byId[ids[0]]?.short : null;
  const vt = verdictText(res.verdict, person, label);

  // one line per distinct reason
  const seen = new Set();
  const findings = res.findings.filter((f) => { const k = f.allergen + f.reason; if (seen.has(k)) return false; seen.add(k); return true; });

  store.addHistory({ barcode: r.barcode || null, name: r.title, verdict: res.verdict, personId: person.id, personName: person.name, source: r.barcode ? "barcode" : "text" });

  const mainText = r.input.ingredientsText.slice(0, r.mainTextLength);
  const marked = highlight(mainText, res.findings.filter((f) => f.start !== undefined && f.end <= r.mainTextLength));

  main.innerHTML = `
    <div class="spread"><h1 class="small muted" style="font-size:15px">Ergebnis für ${esc(person.name || "dich")}</h1><a class="btn small" href="${r.back || "#/scan"}" aria-label="Zurück">${icon.back}</a></div>
    <div class="product">
      ${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ph" aria-hidden="true">${r.barcode ? "🛒" : "📝"}</span>`}
      <span style="min-width:0"><b>${esc(r.title)}</b><span class="small muted">${esc(r.subtitle || "")}</span></span>
    </div>
    <section class="verdict ${res.verdict}" role="status" aria-live="polite">
      <div class="head">${icon.verdict[res.verdict]}<span>${esc(vt.title)}</span></div>
      <p>${esc(vt.sub)}</p>
    </section>

    ${findings.length ? `<section class="card stack"><h2>Warum?</h2><div class="findings">
      ${findings.map((f) => `<div class="finding"><span class="dot ${f.verdict}" aria-hidden="true">${{ unsafe: "✕", caution: "!", safe: "i", unknown: "?" }[f.verdict]}</span>
        <span>${ids.length > 1 ? `<b>${esc(byId[f.allergen]?.short || f.allergen)}:</b> ` : ""}${esc(f.reason)}</span></div>`).join("")}
    </div></section>` : ""}

    ${res.verdict === "unknown" ? `<div class="card flat stack"><b>Keine Zutatenliste gefunden</b>
      <p class="small">Das Produkt ist bekannt, aber ohne lesbare Zutaten. Fotografiere die Zutatenliste, dann prüft die App den Text.</p>
      <a class="btn primary block" href="#/photo">${icon.photo} Zutatenliste fotografieren</a></div>` : ""}

    ${mainText ? `<details class="card" ${res.verdict === "safe" ? "" : "open"}><summary>Zutaten ${res.readable ? "" : "(nicht lesbar)"}</summary><p class="ingredients">${marked}</p></details>` : ""}

    <p class="source">${esc(r.source)} ${r.offLink ? `<a href="${r.offLink}" target="_blank" rel="noopener">Produkt bei Open Food Facts ansehen oder ergänzen</a>` : ""}</p>
    <p class="disclaimer">AllergyGuard ist eine Hilfe, keine Garantie. Im Zweifel die Verpackung lesen und nachfragen.</p>
    <div class="stack">
      <a class="btn primary block" href="#/scan">${icon.scan} Nächstes Produkt scannen</a>
      ${r.barcode && res.verdict !== "unknown" ? `<a class="btn block" href="#/photo">${icon.photo} Zutatenliste zusätzlich fotografieren</a>` : ""}
      <a class="btn block" target="_blank" rel="noopener" href="${reportUrl(r, res)}">Falsches Ergebnis melden</a>
    </div>`;
  // No inline handlers (blocked by the Content-Security-Policy), so fall back here.
  main.querySelector(".product img")?.addEventListener("error", (e) => {
    e.target.replaceWith(Object.assign(document.createElement("span"), { className: "ph", textContent: "🛒" }));
  });
  window.scrollTo(0, 0);
}

function renderLookupError(main, barcode, err) {
  const kind = err instanceof LookupError ? err.kind : "server";
  const msg = {
    notFound: ["Produkt nicht gefunden", `Die Nummer ${barcode} ist (noch) nicht in Open Food Facts. Fotografiere die Zutatenliste, dann prüft die App den Text direkt.`],
    offline: ["Kein Internet", "Das Produkt wurde gemerkt und wird automatisch geprüft, sobald du wieder online bist. Sofort geht es mit einem Foto der Zutatenliste, das funktioniert auch offline."],
    timeout: ["Keine Antwort", "Open Food Facts antwortet gerade nicht. Das Produkt wurde gemerkt. Sofort geht es mit einem Foto der Zutatenliste."],
    invalid: ["Ungültige Nummer", err?.message || ""],
    server: ["Fehler bei der Abfrage", err?.message || "Bitte später nochmals versuchen."],
  }[kind];
  main.innerHTML = `
    <div class="spread"><h1>Ergebnis</h1><a class="btn small" href="#/scan" aria-label="Zurück">${icon.back}</a></div>
    <section class="verdict unknown" role="status"><div class="head">${icon.verdict.unknown}<span>${esc(msg[0])}</span></div><p>${esc(msg[1])}</p></section>
    <a class="btn primary block" href="#/photo">${icon.photo} Zutatenliste fotografieren</a>
    <a class="btn block" href="#/scan">${icon.scan} Anderen Barcode scannen</a>
    ${kind === "notFound" ? `<p class="small muted">Du kannst das Produkt auch selbst bei <a href="https://world.openfoodfacts.org/cgi/product.pl?type=search_or_add&code=${encodeURIComponent(barcode)}" target="_blank" rel="noopener">Open Food Facts eintragen</a>. Dann hilft es allen.</p>` : ""}`;
}

export function highlight(text, findings) {
  const spans = findings.map((f) => ({ ...f })).sort((a, b) => a.start - b.start);
  let out = "";
  let pos = 0;
  for (const f of spans) {
    if (f.start < pos) continue;
    out += esc(text.slice(pos, f.start));
    const cls = f.verdict === "unsafe" ? "" : f.verdict;
    out += `<mark class="${cls}" title="${esc(f.reason)}">${esc(text.slice(f.start, f.end))}</mark>`;
    pos = f.end;
  }
  return out + esc(text.slice(pos));
}

function reportUrl(r, res) {
  const q = new URLSearchParams({
    template: "falsches-ergebnis.yml",
    title: `Falsches Ergebnis: ${r.title}`.slice(0, 120),
    barcode: r.barcode || "",
    ergebnis: `${res.verdict} – ${res.findings.map((f) => f.reason).join("; ")}`.slice(0, 800),
  });
  return `${REPO}/issues/new?${q}`;
}
