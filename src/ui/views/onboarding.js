import { store, uid } from "../../storage/store.js";
import { esc, LOGO, icon, toast } from "../dom.js";
import { allergenGridHTML, bindAllergenGrid, severityHTML, bindSeverity } from "../personEditor.js";
import { restoreFromFile, scanProfileQr } from "./profile.js";

export function render(main, _params, app) {
  const draft = { id: uid(), name: "", allergens: {}, createdAt: new Date().toISOString() };
  let step = 0;
  let accepted = false;

  const steps = (n) => `<div class="steps" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;

  const screens = [
    () => `
      <div class="logo" style="margin-top:8px">${LOGO} AllergyGuard</div>
      <h1>Schnell wissen, was auf den Teller darf.</h1>
      <p class="muted">Barcode scannen oder Zutatenliste fotografieren. AllergyGuard sucht Allergene in über 50 Sprachen und zeigt dir, warum.</p>
      <div class="card flat stack">
        <div class="row-flex">${icon.shield.replace("<svg", '<svg width="22" height="22"')}<b>Deine Daten bleiben auf diesem Handy.</b></div>
        <p class="small muted">Kein Konto, keine Werbung, kein Tracking. Ins Internet geht nur die Barcode-Nummer, und zwar zu Open Food Facts.</p>
      </div>
      <button class="btn primary block" data-next>Los geht's</button>
      <div class="row-flex">
        <button class="btn" style="flex:1" data-scanqr>${icon.qr} Profil-QR scannen</button>
        <button class="btn" style="flex:1" data-restore>${icon.upload} Sicherung laden</button>
      </div>
      <p class="small muted">Jemand in der Familie nutzt AllergyGuard schon? Dort unter „Profil“ den QR-Code zeigen lassen und hier scannen.</p>`,
    () => `
      ${steps(0)}
      <h1>Für wen prüfst du?</h1>
      <p class="muted">Der Name erscheint im Ergebnis („Nicht geeignet für Lena“) und auf der Allergie-Karte. Du kannst ihn auch leer lassen.</p>
      <div class="field"><label for="ob-name">Name (optional)</label>
        <input class="input" id="ob-name" autocomplete="off" maxlength="40" placeholder="z. B. Lena" value="${esc(draft.name)}"></div>
      <div class="row-flex" style="margin-top:auto"><button class="btn" data-back>Zurück</button><button class="btn primary" style="flex:1" data-next>Weiter</button></div>`,
    () => `
      ${steps(1)}
      <h1>Worauf reagiert ${esc(draft.name || "die Person")}?</h1>
      <p class="muted">Alle Allergene antippen, die vermieden werden müssen. Weitere Personen kannst du später im Profil hinzufügen.</p>
      ${allergenGridHTML(draft.allergens)}
      <p class="small muted">Wichtig: <b>Milcheiweiss</b> (Allergie) ist etwas anderes als <b>Laktose</b> (Unverträglichkeit). Laktosefreie Produkte enthalten meist trotzdem Milcheiweiss.</p>
      <div class="row-flex"><button class="btn" data-back>Zurück</button><button class="btn primary" style="flex:1" data-next ${Object.keys(draft.allergens).length ? "" : "disabled"}>Weiter</button></div>`,
    () => `
      ${steps(2)}
      <h1>Wie empfindlich bei Spuren?</h1>
      <p class="muted">„Kann Spuren enthalten“ steht auf vielen Packungen. Lege fest, wie die App das bewertet. Du kannst das jederzeit ändern, zum Beispiel nach einer neuen Einstufung beim Arzt.</p>
      ${severityHTML(draft.allergens)}
      <div class="row-flex"><button class="btn" data-back>Zurück</button><button class="btn primary" style="flex:1" data-next>Weiter</button></div>`,
    () => `
      ${steps(3)}
      <h1>Ein wichtiger Hinweis</h1>
      <div class="card flat stack">
        <p>AllergyGuard ist eine <b>Hilfe</b>, keine Garantie. Die Produktdaten stammen von Freiwilligen (Open Food Facts) oder aus der Texterkennung und können fehlen, veraltet oder falsch sein.</p>
        <p>Die App sagt deshalb nie „sicher“, wenn Angaben fehlen. Im Zweifel: <b>Verpackung selbst lesen</b> und beim Personal nachfragen. Bei einer schweren Allergie gelten immer die Anweisungen deiner Ärztin oder deines Arztes.</p>
      </div>
      <button type="button" class="opt" role="checkbox" aria-checked="${accepted}" data-accept><span class="dot"></span><span><b>Verstanden</b><small>Ich prüfe im Zweifel selbst nach.</small></span></button>
      <div class="row-flex"><button class="btn" data-back>Zurück</button><button class="btn primary" style="flex:1" data-finish ${accepted ? "" : "disabled"}>Fertig</button></div>`,
  ];

  const draw = () => {
    main.innerHTML = screens[step]();
    main.querySelector("[data-next]")?.addEventListener("click", () => {
      if (step === 1) draft.name = main.querySelector("#ob-name").value.trim();
      step++; draw();
    });
    main.querySelector("[data-back]")?.addEventListener("click", () => { if (step === 1) draft.name = main.querySelector("#ob-name").value.trim(); step--; draw(); });
    main.querySelector("#ob-name")?.addEventListener("keydown", (e) => { if (e.key === "Enter") main.querySelector("[data-next]").click(); });
    main.querySelector("[data-restore]")?.addEventListener("click", () => restoreFromFile(() => app.go("#/start")));
    main.querySelector("[data-scanqr]")?.addEventListener("click", () => scanProfileQr());
    if (step === 2) bindAllergenGrid(main, draft.allergens, () => { main.querySelector("[data-next]").disabled = !Object.keys(draft.allergens).length; });
    if (step === 3) bindSeverity(main, draft.allergens);
    main.querySelector("[data-accept]")?.addEventListener("click", (e) => {
      accepted = !accepted;
      e.currentTarget.setAttribute("aria-checked", String(accepted));
      main.querySelector("[data-finish]").disabled = !accepted;
    });
    main.querySelector("[data-finish]")?.addEventListener("click", () => {
      store.savePerson(draft);
      store.update((s) => { s.onboarded = true; s.activeId = draft.id; });
      toast("Profil gespeichert");
      app.go("#/start");
    });
    main.querySelector("h1")?.focus?.();
    window.scrollTo(0, 0);
  };
  draw();
}
