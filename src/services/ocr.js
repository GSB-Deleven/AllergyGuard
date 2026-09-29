// Text recognition on the device with Tesseract.js. The photo never leaves the phone.
// All files (engine + language packs) are part of the app in vendor/tesseract/,
// so it also works offline once they have been loaded or prepared.

const TESS_LANG = { de: "deu", en: "eng", fr: "fra", it: "ita", es: "spa", ca: "cat", pt: "por", nl: "nld", el: "ell", tr: "tur", hr: "hrv" };
export const DEFAULT_OCR_LANGS = ["deu", "eng", "fra", "ita", "spa"];
export const ALL_OCR_LANGS = Object.values(TESS_LANG);

let scriptPromise;
function loadScript() {
  return (scriptPromise ||= new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const s = document.createElement("script");
    s.src = "vendor/tesseract/tesseract.min.js";
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error("Texterkennung konnte nicht geladen werden"));
    document.head.append(s);
  }));
}

/** Languages to load: the default set plus the languages of the current place. */
export function ocrLangsFor(placeLangs = []) {
  const extra = placeLangs.map((l) => TESS_LANG[l]).filter(Boolean);
  // Place languages first: Tesseract weighs the first language a little more.
  return [...new Set([...extra, ...DEFAULT_OCR_LANGS])].slice(0, 7);
}

/**
 * @param {Blob} image
 * @param {string[]} langs  Tesseract codes, e.g. ["spa","deu"]
 * @param {(p:{status:string, progress:number})=>void} onProgress
 * @returns {Promise<{text:string, confidence:number}>}
 */
export async function recognize(image, langs, onProgress) {
  const T = await loadScript();
  const base = new URL("vendor/tesseract/", document.baseURI).href;
  const worker = await T.createWorker(langs.join("+"), 1, {
    workerPath: base + "worker.min.js",
    corePath: base + "core",
    langPath: base + "lang",
    gzip: true,
    workerBlobURL: false,
    cacheMethod: "none", // the service worker caches the files; no second copy in IndexedDB
    logger: (m) => onProgress?.({ status: m.status, progress: m.progress ?? 0 }),
  });
  try {
    const canvas = await prepare(image);
    const { data } = await worker.recognize(canvas);
    return { text: (data.text || "").trim(), confidence: (data.confidence ?? 0) / 100 };
  } finally {
    await worker.terminate();
  }
}

// Scale large photos down (faster, less memory on phones) and respect the photo orientation.
async function prepare(blob) {
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" }).catch(() => createImageBitmap(blob));
  const max = 2200;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d");
  ctx.filter = "grayscale(1) contrast(1.15)";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

/** Download every OCR file once so it works offline later. */
export async function prepareOffline(onProgress) {
  const files = [
    "vendor/tesseract/tesseract.min.js", "vendor/tesseract/worker.min.js",
    "vendor/tesseract/core/tesseract-core-lstm.wasm.js", "vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js", "vendor/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js",
    ...ALL_OCR_LANGS.map((l) => `vendor/tesseract/lang/${l}.traineddata.gz`),
  ];
  let done = 0;
  for (const f of files) {
    await fetch(f, { cache: "reload" }).then((r) => { if (!r.ok) throw new Error(f); return r.blob(); });
    onProgress?.(++done / files.length);
  }
}
