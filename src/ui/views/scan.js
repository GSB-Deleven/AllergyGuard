import { esc, icon, toast } from "../dom.js";
import { isValidBarcode } from "../../services/openFoodFacts.js";

let zxingPromise;
export function loadZXing() {
  return (zxingPromise ||= new Promise((resolve, reject) => {
    if (window.ZXingBrowser) return resolve(window.ZXingBrowser);
    const s = document.createElement("script");
    s.src = "vendor/zxing/zxing-browser.min.js";
    s.onload = () => resolve(window.ZXingBrowser);
    s.onerror = () => reject(new Error("Scanner konnte nicht geladen werden"));
    document.head.append(s);
  }));
}

export function render(main, _params, app) {
  main.innerHTML = `
    <div class="spread"><h1>Barcode scannen</h1><a class="btn small" href="#/start" aria-label="Zurück">${icon.back}</a></div>
    <div class="scanner" id="scanner">
      <video id="video" playsinline muted></video>
      <div class="frame" aria-hidden="true"></div>
      <div class="tools"><button type="button" id="torch" hidden aria-label="Taschenlampe">${icon.torch}</button></div>
      <p class="hint" id="hint">Kamera wird gestartet …</p>
    </div>
    <div id="cam-error" class="card flat stack" hidden></div>
    <form class="stack" id="manual" autocomplete="off">
      <div class="field"><label for="code">Oder Nummer unter dem Barcode eintippen</label>
        <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="z. B. 7610032000000"></div>
      <button class="btn block" type="submit">Prüfen</button>
    </form>
    <a class="btn soft block" href="#/photo">${icon.photo} Kein Barcode? Zutatenliste fotografieren</a>`;

  let controls = null;
  let stopped = false;
  let lastCode = null;

  const found = (code) => {
    if (stopped || code === lastCode) return;
    if (!isValidBarcode(code)) return;
    lastCode = code;
    navigator.vibrate?.(60);
    stop();
    app.go(`#/result/${encodeURIComponent(code)}`);
  };

  const stop = () => {
    stopped = true;
    try { controls?.stop(); } catch {}
  };

  main.querySelector("#manual").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = main.querySelector("#code").value.replace(/\D/g, "");
    if (!isValidBarcode(code)) return toast("Bitte 8 oder 12–14 Ziffern eingeben");
    stop();
    app.go(`#/result/${code}`);
  });

  (async () => {
    const hint = main.querySelector("#hint");
    if (!navigator.mediaDevices?.getUserMedia) return showError("Dieser Browser erlaubt keinen Kamerazugriff. Öffne die App in Safari (iPhone) oder Chrome (Android) oder tippe die Nummer ein.");
    try {
      const ZX = await loadZXing();
      // The 1D reader only looks for product barcodes (EAN/UPC), which is faster and avoids QR-code mix-ups.
      const Reader = ZX.BrowserMultiFormatOneDReader || ZX.BrowserMultiFormatReader;
      const reader = new Reader(undefined, { delayBetweenScanAttempts: 120 });
      if (stopped) return;
      controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        main.querySelector("#video"),
        (result) => { if (result) found(result.getText()); },
      );
      if (stopped) return stop();
      hint.textContent = "Barcode in den Rahmen halten";
      if (controls.switchTorch) {
        const t = main.querySelector("#torch");
        let on = false;
        t.hidden = false;
        t.addEventListener("click", async () => { on = !on; try { await controls.switchTorch(on); } catch { t.hidden = true; } });
      }
    } catch (err) {
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      showError(denied
        ? "Die Kamera ist nicht erlaubt. iPhone: Einstellungen → Safari → Kamera → „Erlauben“ (bzw. beim Home-Bildschirm-Symbol neu öffnen). Oder tippe die Nummer unten ein."
        : `Die Kamera konnte nicht gestartet werden (${esc(err?.message || err)}). Tippe die Nummer unten ein.`);
    }
  })();

  function showError(msg) {
    main.querySelector("#scanner").hidden = true;
    const box = main.querySelector("#cam-error");
    box.hidden = false;
    box.innerHTML = `<b>Kamera nicht verfügbar</b><p class="small">${msg}</p>`;
    main.querySelector("#code").focus();
  }

  return stop;
}
