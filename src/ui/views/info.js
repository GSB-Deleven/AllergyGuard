import { store } from "../../storage/store.js";
import { prepareOffline } from "../../services/ocr.js";
import { icon, toast, LOGO } from "../dom.js";
import { REPO } from "./result.js";

export const VERSION = "0.1.1";

export function render(main) {
  const s = store.get();
  main.innerHTML = `
    <div class="spread"><div class="logo">${LOGO} AllergyGuard</div><a class="btn small" href="#/start" aria-label="Zurück">${icon.back}</a></div>

    <section class="card stack">
      <h2>Für unterwegs vorbereiten</h2>
      <p class="small muted">Lädt Texterkennung und Sprachpakete (ca. 27 MB) einmal herunter. Danach funktionieren Zutaten-Foto, Allergie-Karte und Wörter-Check auch ohne Internet, etwa in der Tiefgarage oder im Flugzeug. Am besten im WLAN.</p>
      <div class="progress" id="off-progress" hidden><i></i></div>
      <button class="btn primary block" data-offline>${icon.download} Jetzt vorbereiten</button>
      <p class="small muted" id="storage"></p>
    </section>

    <section class="card stack">
      <h2>So prüft AllergyGuard</h2>
      <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:6px">
        <li><b>Rot – Enthält:</b> Ein Allergen steht in den Zutaten oder in den Allergen-Angaben.</li>
        <li><b>Gelb – Achtung:</b> „Kann Spuren enthalten“ (je nach Einstellung) oder ein Wort, das oft, aber nicht immer das Allergen enthält, etwa Margarine oder „crema“.</li>
        <li><b>Grün – Nichts gefunden:</b> In den vorhandenen Angaben steht nichts davon. Das ist keine Garantie.</li>
        <li><b>Grau – Keine Daten:</b> Es gibt keine lesbare Zutatenliste. Die App sagt dann nie „grün“.</li>
      </ul>
      <p class="small muted">Gesucht wird immer in allen Sprachen gleichzeitig, mit über 7'000 Begriffen (davon über 4'000 für Milch) aus der offenen Open-Food-Facts-Datenbank und einer von Hand gepflegten Liste.</p>
    </section>

    <section class="card stack">
      <h2>Datenschutz</h2>
      <p class="small">Profile, Verlauf und Fotos bleiben auf diesem Gerät. Es gibt kein Konto, keine Werbung und kein Tracking. Beim Barcode-Scan geht nur die Barcode-Nummer an Open Food Facts. Die Texterkennung läuft auf deinem Handy.</p>
    </section>

    <section class="card stack">
      <h2>Wichtiger Hinweis</h2>
      <p class="small">AllergyGuard ist eine Hilfe, kein Medizinprodukt. Daten können fehlen oder falsch sein, und Rezepturen ändern sich. Lies im Zweifel die Verpackung und frag nach. Bei einer schweren Allergie gelten immer die Anweisungen deiner Ärztin oder deines Arztes.</p>
    </section>

    <section class="card stack">
      <h2>Hilfe & Mitmachen</h2>
      <a class="item" href="${REPO}#faq" target="_blank" rel="noopener"><span class="t"><b>Häufige Fragen</b><small>Installation, Offline, Sicherung …</small></span></a>
      <a class="item" href="${REPO}/issues/new/choose" target="_blank" rel="noopener"><span class="t"><b>Fehler oder Idee melden</b><small>Auf GitHub, auch ohne Programmierkenntnisse</small></span></a>
      <a class="item" href="${REPO}/issues/1" target="_blank" rel="noopener"><span class="t"><b>Roadmap</b><small>Was als Nächstes kommt</small></span></a>
    </section>
    <p class="small muted">Version ${VERSION} · Produktdaten © Open Food Facts (ODbL) · Quellcode unter MIT-Lizenz</p>`;

  const storageEl = main.querySelector("#storage");
  navigator.storage?.estimate?.().then(({ usage, quota }) => {
    storageEl.textContent = `Belegt: ${(usage / 1e6).toFixed(1)} MB${quota ? ` von ${(quota / 1e9).toFixed(1)} GB` : ""}${s.offlineReadyAt ? ` · vorbereitet am ${new Date(s.offlineReadyAt).toLocaleDateString("de-CH")}` : ""}`;
  });

  main.querySelector("[data-offline]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const bar = main.querySelector("#off-progress");
    btn.disabled = true;
    bar.hidden = false;
    try {
      await navigator.storage?.persist?.();
      await prepareOffline((p) => { bar.firstElementChild.style.width = `${Math.round(p * 100)}%`; });
      store.update((st) => { st.offlineReadyAt = new Date().toISOString(); });
      toast("Fertig – die App ist offline bereit");
      btn.innerHTML = `${icon.check} Offline bereit`;
    } catch (err) {
      toast(`Das hat nicht geklappt: ${err.message || err}. Bitte im WLAN nochmals versuchen.`, 4500);
      btn.disabled = false;
    }
  });
}
