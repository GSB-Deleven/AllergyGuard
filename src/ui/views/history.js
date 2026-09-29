import { store } from "../../storage/store.js";
import { esc, icon, chipText, timeAgo } from "../dom.js";

export function render(main, _params, app) {
  const s = store.get();
  main.innerHTML = `
    <h1>Verlauf</h1>
    ${s.queue.length ? `<section class="card stack"><h2>Später prüfen</h2>
      <p class="small muted">Diese Barcodes wurden ohne Internet gescannt. Sie werden geprüft, sobald du wieder online bist, oder du tippst sie jetzt an.</p>
      <div class="list">${s.queue.map((b) => `<a class="item" href="#/result/${encodeURIComponent(b)}"><span class="t"><b>${esc(b)}</b><small>noch nicht geprüft</small></span><span class="chip unknown">? offen</span></a>`).join("")}</div>
    </section>` : ""}
    ${s.history.length ? `<div class="list">${s.history.map((h) => `
      <a class="item" href="${h.barcode ? `#/result/${encodeURIComponent(h.barcode)}` : "#/history"}">
        <span class="t"><b>${esc(h.name)}</b><small>${timeAgo(h.at)}${h.personName ? ` · für ${esc(h.personName)}` : ""}${h.barcode ? "" : " · Text/Foto"}</small></span>
        <span class="chip ${h.verdict}">${chipText[h.verdict]}</span>
      </a>`).join("")}</div>
      <button class="btn block danger" data-clear>${icon.trash} Verlauf löschen</button>`
    : `<div class="empty card flat">${icon.history}<p>Hier erscheinen deine geprüften Produkte.</p><a class="btn primary" href="#/scan">Erstes Produkt scannen</a></div>`}
    <p class="small muted">Tipp: Ein Eintrag öffnet das Ergebnis neu. Wenn du ein anderes Profil wählst, wird es für diese Person geprüft.</p>`;
  main.querySelector("[data-clear]")?.addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirm) { store.clearHistory(); app.refresh(); return; }
    b.dataset.confirm = "1";
    b.textContent = "Wirklich löschen? Nochmals tippen";
  });
}
