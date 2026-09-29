import { store } from "../../storage/store.js";
import { esc, icon, initials, chipText, timeAgo, sheet, LOGO } from "../dom.js";
import { severitySummary } from "../personEditor.js";

export function render(main, _params, app) {
  const s = store.get();
  const person = store.activePerson();
  const recent = s.history.slice(0, 4);
  const backupOld = !s.lastBackupAt || Date.now() - new Date(s.lastBackupAt).getTime() > 1000 * 60 * 60 * 24 * 60;

  main.innerHTML = `
    <div class="spread">
      <div class="logo">${LOGO}<span>AllergyGuard</span></div>
      <a class="btn small" href="#/info" aria-label="Info und Hilfe">${icon.info}</a>
    </div>
    <div class="stack" style="gap:6px">
      <h1>Was darf ${esc(person.name || "ich")} essen?</h1>
      <button class="who" data-switch aria-label="Person wechseln">
        <span class="avatar">${esc(initials(person.name))}</span>
        <span class="small">${esc(severitySummary(person))}</span>
      </button>
    </div>

    <a class="hero-btn" href="#/scan">
      <span class="ic">${icon.scan}</span>
      <span><b>Barcode scannen</b><small>Kamera auf den Strichcode halten</small></span>
    </a>
    <div class="tiles">
      <a class="tile" href="#/photo"><span class="ic">${icon.photo}</span><b>Zutaten-Foto</b><span>Wenn kein Barcode da ist</span></a>
      <a class="tile" href="#/card"><span class="ic">${icon.card}</span><b>Allergie-Karte</b><span>Fürs Restaurant, in der Landessprache</span></a>
      <a class="tile" href="#/words"><span class="ic">${icon.words}</span><b>Wörter-Check</b><span>Was heisst „nata“?</span></a>
      <a class="tile" href="#/photo?text=1"><span class="ic">${icon.edit}</span><b>Text einfügen</b><span>Zutaten tippen oder einfügen</span></a>
    </div>

    ${s.queue.length ? `<a class="item" href="#/history"><span class="chip unknown">${s.queue.length}</span><span class="t"><b>Später prüfen</b><small>Gescannt ohne Internet – wird automatisch geprüft</small></span></a>` : ""}

    <div class="spread"><p class="label">Zuletzt geprüft</p>${recent.length ? `<a class="small" href="#/history">Alle</a>` : ""}</div>
    ${recent.length ? `<div class="list">${recent.map((h) => `
      <a class="item" href="${h.barcode ? `#/result/${encodeURIComponent(h.barcode)}` : "#/history"}">
        <span class="t"><b>${esc(h.name)}</b><small>${timeAgo(h.at)}${h.personName ? ` · ${esc(h.personName)}` : ""}</small></span>
        <span class="chip ${h.verdict}">${chipText[h.verdict]}</span>
      </a>`).join("")}</div>` : `<div class="empty card flat">${icon.scan}<p>Noch nichts geprüft. Scanne dein erstes Produkt!</p></div>`}

    ${backupOld ? `<div class="disclaimer row-flex" style="justify-content:space-between">
      <span>Tipp: Speichere eine Sicherung. Wenn die App gelöscht wird, sind die Profile sonst weg.</span>
      <a class="btn small" href="#/profile">Sichern</a></div>` : ""}
    <p class="small muted">Hinweis: AllergyGuard ersetzt nicht den Blick auf die Verpackung. <a href="#/info">Mehr erfahren</a></p>`;

  main.querySelector("[data-switch]").addEventListener("click", () => {
    const people = store.get().people;
    sheet(`
      <h2>Für wen prüfst du?</h2>
      <div class="list">${people.map((p) => `
        <button class="item" data-pick="${p.id}" style="text-align:left;cursor:pointer">
          <span class="avatar">${esc(initials(p.name))}</span>
          <span class="t"><b>${esc(p.name || "Ohne Namen")}</b><small>${esc(severitySummary(p))}</small></span>
          ${p.id === person.id ? `<span class="chip neutral">aktiv</span>` : ""}
        </button>`).join("")}</div>
      <a class="btn block" href="#/profile" data-close>${icon.plus} Person hinzufügen oder bearbeiten</a>`, (el, close) => {
      el.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => { store.setActive(b.dataset.pick); close(); app.refresh(); }));
    });
  });
}
