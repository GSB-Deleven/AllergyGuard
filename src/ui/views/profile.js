import { store, uid, personToShareHash, personFromShareHash } from "../../storage/store.js";
import { esc, icon, initials, sheet, toast, download } from "../dom.js";
import { allergenGridHTML, bindAllergenGrid, severityHTML, bindSeverity, severitySummary } from "../personEditor.js";
import qrcode from "../../../vendor/qrcode/qrcode.mjs";
import { loadZXing } from "./scan.js";

export function render(main, _params, app) {
  const s = store.get();
  const last = s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleDateString("de-CH") : "noch nie";
  main.innerHTML = `
    <div class="spread"><h1>Profile</h1><a class="btn small" href="#/info" aria-label="Info">${icon.info}</a></div>
    <div class="list">${s.people.map((p) => `
      <div class="item">
        <span class="avatar">${esc(initials(p.name))}</span>
        <span class="t"><b>${esc(p.name || "Ohne Namen")}${p.id === store.activePerson()?.id ? ` <span class="chip neutral">aktiv</span>` : ""}</b><small>${esc(severitySummary(p))}</small></span>
        <button class="btn small" data-edit="${p.id}" aria-label="${esc(p.name || "Profil")} bearbeiten">${icon.edit}</button>
        <button class="btn small" data-share="${p.id}" aria-label="${esc(p.name || "Profil")} teilen">${icon.qr}</button>
      </div>`).join("")}</div>
    <div class="row-flex">
      <button class="btn" style="flex:1" data-add>${icon.plus} Person hinzufügen</button>
      <button class="btn" style="flex:1" data-scanqr>${icon.qr} Profil-QR scannen</button>
    </div>

    <section class="card stack">
      <h2>Sicherung</h2>
      <p class="small muted">Profile und Verlauf liegen nur auf diesem Handy. Wird die App gelöscht, sind sie weg. Speichere darum eine Sicherung, zum Beispiel in iCloud Drive oder in der Dateien-App. Letzte Sicherung: <b>${esc(last)}</b>.</p>
      <div class="row-flex">
        <button class="btn primary" style="flex:1" data-backup>${icon.download} Sicherung speichern</button>
        <button class="btn" style="flex:1" data-restore>${icon.upload} Laden</button>
      </div>
    </section>
    <section class="card stack">
      <h2>Mit Partner:in teilen</h2>
      <p class="small muted">Tippe bei einer Person auf ${icon.qr.replace("<svg", '<svg width="16" height="16" style="vertical-align:-3px"')}, um den QR-Code zu zeigen. Auf dem anderen Handy in AllergyGuard auf <b>„Profil-QR scannen“</b> tippen. Es gibt keinen Server dazwischen.</p>
    </section>
    <button class="btn block danger" data-reset>${icon.trash} Alle Daten auf diesem Gerät löschen</button>`;

  main.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editPerson(store.get().people.find((p) => p.id === b.dataset.edit), app)));
  main.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => sharePerson(store.get().people.find((p) => p.id === b.dataset.share))));
  main.querySelector("[data-add]").addEventListener("click", () => editPerson({ id: uid(), name: "", allergens: { milk: "avoidTraces" }, createdAt: new Date().toISOString() }, app, true));
  main.querySelector("[data-backup]").addEventListener("click", () => {
    download(`allergyguard-sicherung-${new Date().toISOString().slice(0, 10)}.json`, store.exportBackup());
    setTimeout(() => app.refresh(), 800);
  });
  main.querySelector("[data-restore]").addEventListener("click", () => restoreFromFile(() => app.refresh()));
  main.querySelector("[data-scanqr]").addEventListener("click", () => scanProfileQr());
  main.querySelector("[data-reset]").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirm) { b.dataset.confirm = "1"; b.textContent = "Wirklich alles löschen? Nochmals tippen"; return; }
    store.resetAll();
    app.go("#/start");
  });
}

function editPerson(person, app, isNew = false) {
  const draft = { ...person, allergens: { ...person.allergens } };
  sheet(`
    <h2>${isNew ? "Neue Person" : "Profil bearbeiten"}</h2>
    <div class="field"><label for="pe-name">Name (optional)</label><input class="input" id="pe-name" maxlength="40" value="${esc(draft.name)}" placeholder="z. B. Lena"></div>
    <p class="label">Allergene</p>
    <div id="pe-grid">${allergenGridHTML(draft.allergens)}</div>
    <p class="label">Spuren</p>
    <div id="pe-sev" class="stack">${severityHTML(draft.allergens)}</div>
    <button class="btn primary block" data-save>Speichern</button>
    ${!isNew && store.get().people.length > 1 ? `<button class="btn block" data-activate>Als aktive Person wählen</button><button class="btn block danger" data-delete>${icon.trash} Person löschen</button>` : ""}
    <button class="btn block" data-close>Abbrechen</button>`, (el, close) => {
    const sev = el.querySelector("#pe-sev");
    bindAllergenGrid(el.querySelector("#pe-grid"), draft.allergens, () => { sev.innerHTML = severityHTML(draft.allergens); bindSeverity(sev, draft.allergens); });
    bindSeverity(sev, draft.allergens);
    el.querySelector("[data-save]").addEventListener("click", () => {
      draft.name = el.querySelector("#pe-name").value.trim();
      if (!Object.keys(draft.allergens).length) return toast("Bitte mindestens ein Allergen wählen");
      store.savePerson(draft);
      if (isNew) store.setActive(draft.id);
      close(); toast("Gespeichert"); app.refresh();
    });
    el.querySelector("[data-activate]")?.addEventListener("click", () => { store.setActive(draft.id); close(); app.refresh(); });
    el.querySelector("[data-delete]")?.addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!b.dataset.confirm) { b.dataset.confirm = "1"; b.textContent = "Wirklich löschen? Nochmals tippen"; return; }
      store.removePerson(draft.id); close(); app.refresh();
    });
  });
}

function sharePerson(person) {
  const url = new URL(location.href.split("#")[0]);
  const link = url.href + personToShareHash(person);
  const qr = qrcode(0, "M");
  qr.addData(link);
  qr.make();
  sheet(`
    <h2>Profil „${esc(person.name || "Ohne Namen")}“ teilen</h2>
    <div class="qr">${qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })}</div>
    <p class="small muted">Auf dem anderen Handy in AllergyGuard unter „Profil“ auf „Profil-QR scannen“ tippen. Der Code enthält nur Name und Allergene und wird von keinem Server gespeichert. Tipp: Ein Screenshot dieses Codes ist gleichzeitig eine kleine Sicherung.</p>
    <button class="btn block" data-copy>${icon.share} Link teilen</button>
    <button class="btn block" data-close>Fertig</button>`, (el) => {
    el.querySelector("[data-copy]").addEventListener("click", async () => {
      if (navigator.share) return navigator.share({ title: "AllergyGuard-Profil", url: link }).catch(() => {});
      try { await navigator.clipboard.writeText(link); toast("Link kopiert"); } catch { prompt("Link kopieren:", link); }
    });
  });
}

/** Scans a profile QR code inside the app. On iPhone the home-screen app has its own
 *  storage, so importing via the normal camera would land in Safari instead. */
export function scanProfileQr() {
  let controls = null;
  const close = sheet(`
    <h2>Profil-QR scannen</h2>
    <div class="scanner" style="aspect-ratio:1"><video id="qr-video" playsinline muted></video></div>
    <p class="small muted" id="qr-hint">Halte die Kamera auf den QR-Code im anderen Handy.</p>
    <button class="btn block" data-close>Abbrechen</button>`, async (el) => {
    el.querySelector("[data-close]").addEventListener("click", () => { try { controls?.stop(); } catch {} });
    try {
      const ZX = await loadZXing();
      const reader = new ZX.BrowserQRCodeReader();
      controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, el.querySelector("#qr-video"), (res) => {
        if (!res) return;
        const text = res.getText();
        const hash = text.slice(text.indexOf("#"));
        try {
          if (!personFromShareHash(hash)) throw new Error();
          controls?.stop();
          close();
          location.hash = hash;
        } catch {
          el.querySelector("#qr-hint").textContent = "Das ist kein AllergyGuard-Profil.";
        }
      });
    } catch {
      el.querySelector("#qr-hint").textContent = "Kamera nicht verfügbar. Alternativ: Sicherung als Datei übertragen.";
    }
  });
}

/** Opens a file picker and restores a backup. Also used by the first-run setup. */
export function restoreFromFile(onDone) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      store.importBackup(await f.text());
      toast("Sicherung geladen");
      onDone?.();
    } catch (err) {
      toast(err.message || "Die Datei konnte nicht gelesen werden", 4000);
    }
  });
  input.click();
}

/** #/import/<data> – opened from a shared link or QR code. */
export function renderImport(main, _params, app) {
  let person;
  try { person = personFromShareHash(location.hash); } catch { person = null; }
  if (!person) {
    main.innerHTML = `<h1>Link ungültig</h1><p class="muted">Dieser Profil-Link ist beschädigt. Bitte neu teilen lassen.</p><a class="btn primary block" href="#/start">Zur App</a>`;
    return;
  }
  main.innerHTML = `
    <h1>Profil übernehmen?</h1>
    <div class="item"><span class="avatar">${esc(initials(person.name))}</span><span class="t"><b>${esc(person.name || "Ohne Namen")}</b><small>${esc(severitySummary(person))}</small></span></div>
    <p class="muted">Das Profil wird auf diesem Handy gespeichert. Bestehende Profile bleiben erhalten.</p>
    <button class="btn primary block" data-ok>Übernehmen</button>
    <a class="btn block" href="#/start">Abbrechen</a>`;
  main.querySelector("[data-ok]").addEventListener("click", () => {
    store.savePerson(person);
    store.update((s) => { s.activeId = person.id; s.onboarded = true; });
    toast("Profil übernommen");
    app.go("#/start");
  });
}
