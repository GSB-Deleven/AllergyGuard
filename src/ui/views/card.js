import { store } from "../../storage/store.js";
import { regions, card as loadCard, CARD_LANGS } from "../../data.js";
import { buildCard } from "../../core/card.js";
import { findPlace, languagesFor, placeFromPoint, placeFromTimeZone, placeLabel } from "../../core/places.js";
import { esc, icon, sheet, toast } from "../dom.js";

const LANG_NAMES = { de: "Deutsch", en: "English", fr: "Français", it: "Italiano", es: "Español", ca: "Català", pt: "Português", nl: "Nederlands", el: "Ελληνικά", tr: "Türkçe", hr: "Hrvatski" };

export async function render(main, _params, app) {
  const reg = await regions();
  let place = store.get().place ? findPlace(reg, store.get().place.countryId, store.get().place.regionId) : null;
  let suggested = false;
  if (!place) {
    place = placeFromTimeZone(reg, Intl.DateTimeFormat().resolvedOptions().timeZone);
    suggested = !!place;
  }
  let lang = languagesFor(place).find((l) => CARD_LANGS.includes(l)) || "en";
  let big = false;
  let wakeLock = null;

  const draw = async () => {
    const person = store.activePerson();
    const langs = languagesFor(place).filter((l) => CARD_LANGS.includes(l));
    const [c, de] = await Promise.all([loadCard(lang), loadCard("de")]);
    if (!app.isCurrent(main)) return;
    const emergency = place?.country.emergency;
    const built = buildCard(person, c, { emergency });
    const german = lang === "de" ? null : buildCard(person, de, { emergency });

    main.innerHTML = `
      <div class="spread"><h1>Allergie-Karte</h1><a class="btn small" href="#/start" aria-label="Zurück">${icon.back}</a></div>
      <div class="spread" style="flex-wrap:wrap">
        <button class="who" data-place>${icon.pin.replace("<svg", '<svg width="18" height="18"')}<span>${esc(placeLabel(place))}</span></button>
        <button class="btn small" data-locate>${icon.locate} Standort</button>
      </div>
      ${suggested ? `<p class="small muted">Vorschlag aus der Zeitzone deines Handys. Tippe auf den Ort, um ihn zu ändern.</p>` : ""}
      <div class="seg" role="group" aria-label="Sprache">
        ${langs.map((l) => `<button data-lang="${l}" aria-pressed="${l === lang}">${esc(LANG_NAMES[l])}</button>`).join("")}
        <button data-other aria-pressed="${!langs.includes(lang)}">${langs.includes(lang) ? "Andere …" : esc(LANG_NAMES[lang])}</button>
      </div>

      <article class="acard ${big ? "big" : ""}" lang="${lang}" id="acard">
        <div class="spread"><span class="label">${esc(built.title)}</span>
          <span class="status-pill">${c.reviewed ? "✓ Übersetzung geprüft" : "Übersetzung noch ungeprüft"}</span></div>
        <p class="lead">${esc(built.sentences[0])}</p>
        ${built.sentences.slice(1).map((s) => `<p class="line">${esc(s)}</p>`).join("")}
        ${german ? `<p class="de" lang="de"><b>Auf Deutsch:</b> ${esc(german.text)}</p>` : ""}
      </article>

      <div class="row-flex">
        <button class="btn primary" style="flex:1" data-speak>${icon.speaker} Vorlesen</button>
        <button class="btn" data-big aria-pressed="${big}">${icon.expand} ${big ? "Normal" : "Gross"}</button>
      </div>
      <button class="btn block" data-image>${icon.share} Als Bild speichern oder teilen</button>
      <p class="small muted">Die Karte funktioniert offline. Die Texte sind fest hinterlegt und nicht automatisch übersetzt. Fehler gefunden? <a href="https://github.com/GSB-Deleven/AllergyGuard/issues/19" target="_blank" rel="noopener">Hier melden</a>.</p>
      ${Object.keys(person.allergens).length ? "" : `<p class="disclaimer">Für ${esc(person.name || "diese Person")} sind noch keine Allergene gewählt. <a href="#/profile">Profil bearbeiten</a></p>`}`;

    main.querySelector("[data-place]").addEventListener("click", () => pickPlace(reg, (p) => { place = p; suggested = false; lang = languagesFor(p).find((l) => CARD_LANGS.includes(l)) || "en"; draw(); }));
    main.querySelector("[data-locate]").addEventListener("click", () => locate(reg, (p) => { place = p; suggested = false; store.setPlace(p.country.id, p.region?.id); lang = languagesFor(p).find((l) => CARD_LANGS.includes(l)) || "en"; draw(); }));
    main.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.lang; draw(); }));
    main.querySelector("[data-other]").addEventListener("click", () => sheet(`
      <h2>Sprache wählen</h2>
      <div class="seg">${CARD_LANGS.map((l) => `<button data-l="${l}" aria-pressed="${l === lang}">${esc(LANG_NAMES[l])}</button>`).join("")}</div>
      <button class="btn block" data-close>Schliessen</button>`, (el, close) => {
      el.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.l; close(); draw(); }));
    }));
    main.querySelector("[data-speak]").addEventListener("click", (e) => speak(built.text, c.voice, e.currentTarget));
    main.querySelector("[data-big]").addEventListener("click", async () => {
      big = !big;
      if (big) wakeLock = await navigator.wakeLock?.request("screen").catch(() => null);
      else { wakeLock?.release?.(); wakeLock = null; }
      draw();
    });
    main.querySelector("[data-image]").addEventListener("click", () => shareImage(built, german, c));
  };
  await draw();
  return () => { speechSynthesis?.cancel?.(); wakeLock?.release?.(); };
}

function pickPlace(reg, onPick) {
  const recent = store.get().recentPlaces.map((k) => { const [c, r] = k.split("|"); return findPlace(reg, c, r); }).filter(Boolean);
  sheet(`
    <h2>Wo bist du?</h2>
    ${recent.length ? `<p class="label">Zuletzt</p><div class="seg">${recent.map((p) => `<button data-c="${p.country.id}" data-r="${p.region?.id || ""}">${esc(p.country.flag)} ${esc(placeLabel(p))}</button>`).join("")}</div>` : ""}
    <p class="label">Alle Länder</p>
    <div class="list">${reg.countries.map((c) => `
      <div class="card flat stack" style="padding:10px 12px">
        <button class="spread" data-c="${c.id}" data-r="" style="background:none;border:0;padding:4px 0;cursor:pointer;text-align:left;font-weight:700">
          <span>${esc(c.flag)} ${esc(c.name)}</span><span class="small muted">${c.languages.map((l) => l.toUpperCase()).join(" · ")}</span></button>
        ${(c.regions || []).length ? `<div class="seg">${c.regions.map((r) => `<button data-c="${c.id}" data-r="${r.id}">${esc(r.name)}</button>`).join("")}</div>` : ""}
      </div>`).join("")}</div>
    <button class="btn block" data-close>Abbrechen</button>`, (el, close) => {
    el.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
      const p = findPlace(reg, b.dataset.c, b.dataset.r);
      store.setPlace(p.country.id, p.region?.id);
      close();
      onPick(p);
    }));
  });
}

function locate(reg, onFound) {
  if (!navigator.geolocation) return toast("Standort ist auf diesem Gerät nicht verfügbar");
  toast("Standort wird bestimmt …");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const p = placeFromPoint(reg, pos.coords.latitude, pos.coords.longitude);
      if (!p) return toast("Ort nicht in der Liste – bitte von Hand wählen");
      toast(`Erkannt: ${placeLabel(p)}`);
      onFound(p);
    },
    () => toast("Standort nicht erlaubt – bitte Ort von Hand wählen", 3500),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
  );
}

function speak(text, voiceLang, btn) {
  if (!("speechSynthesis" in window)) return toast("Vorlesen wird von diesem Browser nicht unterstützt");
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices();
  const prefix = voiceLang.slice(0, 2);
  const voice = voices.find((v) => v.lang === voiceLang) || voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
  if (voices.length && !voice) {
    toast("Für diese Sprache ist keine Stimme installiert. iPhone: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen.", 6000);
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voiceLang;
  if (voice) u.voice = voice;
  u.rate = 0.9;
  btn.disabled = true;
  u.onend = u.onerror = () => { btn.disabled = false; };
  speechSynthesis.speak(u);
}

async function shareImage(built, german, c) {
  const W = 1080, pad = 70;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  const wrap = (text, font, maxW) => {
    ctx.font = font;
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };
  const blocks = [
    { t: built.title.toUpperCase(), f: "800 34px Nunito, sans-serif", c: "#6E6C88", gap: 26 },
    { t: built.sentences[0], f: "700 56px Quicksand, Nunito, sans-serif", c: "#26244A", gap: 30 },
    ...built.sentences.slice(1).map((s) => ({ t: s, f: "700 42px Nunito, sans-serif", c: "#26244A", gap: 22 })),
    ...(german ? [{ t: `Auf Deutsch: ${german.text}`, f: "400 30px Nunito, sans-serif", c: "#6E6C88", gap: 0, top: 30 }] : []),
  ];
  const laid = blocks.map((b) => ({ ...b, lines: wrap(b.t, b.f, W - pad * 2), lh: parseInt(b.f.split(" ")[1], 10) * 1.3 }));
  const H = pad * 2 + laid.reduce((h, b) => h + (b.top || 0) + b.lines.length * b.lh + b.gap, 0) + 40;
  cv.width = W; cv.height = H;
  ctx.fillStyle = "#FFFBF6"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#E8663D"; ctx.lineWidth = 10; ctx.strokeRect(20, 20, W - 40, H - 40);
  let y = pad + 20;
  for (const b of laid) {
    y += b.top || 0;
    ctx.font = b.f; ctx.fillStyle = b.c; ctx.textBaseline = "top";
    for (const l of b.lines) { ctx.fillText(l, pad, y); y += b.lh; }
    y += b.gap;
  }
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  const file = new File([blob], `allergie-karte-${c.lang}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: built.title }).catch(() => {});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
}
