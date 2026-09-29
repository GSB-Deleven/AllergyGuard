// Looks up a barcode in Open Food Facts (https://world.openfoodfacts.org).
// Only the barcode number is sent. Data is contributed by volunteers under the
// Open Database License, which is why the app always shows where it came from.

const API = "https://world.openfoodfacts.org/api/v2/product/";
const TEXT_LANGS = ["de", "en", "fr", "it", "es", "ca", "pt", "nl", "el", "tr", "hr", "pl"];
const FIELDS = [
  "code", "product_name", "product_name_de", "generic_name", "brands", "lang", "image_front_small_url",
  "ingredients_text", ...TEXT_LANGS.map((l) => `ingredients_text_${l}`),
  "allergens_tags", "traces_tags", "last_modified_t",
].join(",");

export class LookupError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; } // kind: notFound | offline | timeout | server | invalid
}

export function isValidBarcode(code) {
  return /^\d{8}$|^\d{12,14}$/.test(String(code || "").trim());
}

/**
 * @param {string} barcode
 * @param {{fetch?: Function, timeoutMs?: number}} [opts]  fetch is injectable for tests
 * @returns {Promise<Product>}
 */
export async function lookupBarcode(barcode, { fetch: f = globalThis.fetch, timeoutMs = 9000 } = {}) {
  const code = String(barcode || "").trim();
  if (!isValidBarcode(code)) throw new LookupError("invalid", "Das ist keine gültige Barcode-Nummer (8 oder 12–14 Ziffern).");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new LookupError("offline", "Kein Internet.");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await f(`${API}${encodeURIComponent(code)}.json?fields=${FIELDS}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } catch (err) {
    throw err?.name === "AbortError"
      ? new LookupError("timeout", "Open Food Facts antwortet nicht.")
      : new LookupError("offline", "Keine Verbindung zu Open Food Facts.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw new LookupError("notFound", "Produkt nicht in Open Food Facts.");
  if (!res.ok) throw new LookupError("server", `Open Food Facts meldet Fehler ${res.status}.`);
  const json = await res.json();
  if (json.status === 0 || !json.product) throw new LookupError("notFound", "Produkt nicht in Open Food Facts.");
  return mapProduct(json.product, code);
}

/** Converts the raw API answer into the app's product shape. */
export function mapProduct(p, code = p.code) {
  // Prefer the text in the product's own language: that is what is printed on the pack.
  const own = p.lang && p[`ingredients_text_${p.lang}`];
  const candidates = [own, p.ingredients_text, ...TEXT_LANGS.map((l) => p[`ingredients_text_${l}`])].filter((t) => t && t.trim());
  return {
    barcode: String(code),
    name: (p.product_name_de || p.product_name || p.generic_name || "").trim() || "Unbekanntes Produkt",
    brand: (p.brands || "").split(",")[0].trim(),
    image: p.image_front_small_url || null,
    ingredientsText: candidates[0] || "",
    // Other language versions are checked too: a translation may name an ingredient more clearly.
    otherTexts: [...new Set(candidates.slice(1))].filter((t) => t !== candidates[0]),
    allergenTags: p.allergens_tags || [],
    traceTags: p.traces_tags || [],
    source: "openfoodfacts",
    updated: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString() : null,
    fetchedAt: new Date().toISOString(),
  };
}

export const productUrl = (barcode) => `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`;
