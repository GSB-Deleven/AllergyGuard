import { store } from "../../storage/store.js";
import { regions } from "../../data.js";
import { findPlace, languagesFor } from "../../core/places.js";
import { recognize, ocrLangsFor } from "../../services/ocr.js";
import { icon, toast } from "../dom.js";

const STATUS = {
  "loading tesseract core": "Texterkennung wird geladen",
  "initializing tesseract": "Texterkennung startet",
  "loading language traineddata": "Sprachpakete werden geladen",
  "initializing api": "Bereit",
  "recognizing text": "Text wird gelesen",
};

export function render(main, _params, app) {
  const textMode = new URLSearchParams(location.hash.split("?")[1] || "").has("text");
  main.innerHTML = `
    <div class="spread"><h1>${textMode ? "Zutaten eingeben" : "Zutatenliste fotografieren"}</h1><a class="btn small" href="#/start" aria-label="Zurück">${icon.back}</a></div>
    <div class="stack" id="shoot" ${textMode ? "hidden" : ""}>
      <div class="card flat stack">
        <b>So klappt es am besten</b>
        <p class="small muted">Gutes Licht, Verpackung möglichst flach, nur die Zutatenliste ins Bild, nah genug, dass die Schrift scharf ist.</p>
      </div>
      <label class="hero-btn" for="file" style="cursor:pointer">
        <span class="ic">${icon.photo}</span><span><b>Foto aufnehmen</b><small>oder ein Bild aus der Galerie wählen</small></span>
      </label>
      <input type="file" id="file" accept="image/*" capture="environment" hidden>
      <p class="small muted">Das Foto wird nur auf deinem Handy ausgewertet und nirgends hochgeladen.</p>
    </div>
    <img id="preview" alt="Dein Foto" hidden style="border-radius:16px;max-height:220px;object-fit:contain;background:var(--surface-2)">
    <div class="card flat stack" id="progress" hidden><b id="p-status">Texterkennung wird geladen …</b><div class="progress"><i id="p-bar"></i></div>
      <p class="small muted">Beim ersten Mal werden die Sprachpakete geladen (einige MB). Danach geht es schneller und auch offline.</p></div>
    <form class="stack" id="edit" ${textMode ? "" : "hidden"}>
      <div class="field"><label for="text">${textMode ? "Zutatenliste eintippen oder einfügen" : "Erkannter Text – bitte kurz prüfen und bei Bedarf korrigieren"}</label>
        <textarea class="input" id="text" placeholder="z. B. Harina de trigo, azúcar, suero lácteo …"></textarea></div>
      <p id="quality" class="small" hidden></p>
      <button class="btn primary block" type="submit">Jetzt prüfen</button>
      ${textMode ? `<a class="btn block" href="#/photo">${icon.photo} Lieber ein Foto machen</a>` : `<label class="btn block" for="file">${icon.photo} Neues Foto</label>`}
    </form>`;

  let quality = 1;
  const file = main.querySelector("#file");

  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    const prev = main.querySelector("#preview");
    prev.src = URL.createObjectURL(f);
    prev.hidden = false;
    main.querySelector("#shoot").hidden = true;
    main.querySelector("#edit").hidden = true;
    const box = main.querySelector("#progress");
    box.hidden = false;
    const place = await currentPlaceLangs();
    try {
      const res = await recognize(f, ocrLangsFor(place), ({ status, progress }) => {
        main.querySelector("#p-status").textContent = `${STATUS[status] || "Bitte warten"} …`;
        main.querySelector("#p-bar").style.width = `${Math.round((status === "recognizing text" ? progress : progress * 0.3) * 100)}%`;
      });
      if (!app.isCurrent(main)) return;
      quality = res.text.length < 12 ? 0 : res.confidence;
      box.hidden = true;
      main.querySelector("#edit").hidden = false;
      main.querySelector("#text").value = res.text;
      const q = main.querySelector("#quality");
      q.hidden = false;
      q.innerHTML = quality < 0.5
        ? `<span class="chip unknown">? Schlecht lesbar</span> Das Foto ist schwer zu lesen. Bitte ein schärferes Foto machen oder den Text korrigieren.`
        : `<span class="chip neutral">Lesbarkeit ${Math.round(quality * 100)} %</span> Tippfehler im Text bitte korrigieren, dann „Jetzt prüfen“.`;
    } catch (err) {
      box.hidden = true;
      main.querySelector("#shoot").hidden = false;
      toast(`Texterkennung fehlgeschlagen: ${err.message || err}`, 4000);
    }
  });

  main.querySelector("#text").addEventListener("input", () => { quality = Math.max(quality, 0.6); }); // a corrected text counts as readable
  main.querySelector("#edit").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = main.querySelector("#text").value.trim();
    if (text.length < 3) return toast("Bitte zuerst Text eingeben");
    sessionStorage.setItem("ag.check", JSON.stringify({ text, quality: textMode ? 1 : quality, source: textMode ? "manual" : "photo" }));
    app.go("#/check");
  });
  if (textMode) main.querySelector("#text").focus();
}

async function currentPlaceLangs() {
  const p = store.get().place;
  if (!p) return [];
  return languagesFor(findPlace(await regions(), p.countryId, p.regionId));
}

