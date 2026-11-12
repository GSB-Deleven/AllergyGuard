// Strict checks for profiles that come from outside (backup file, profile QR code,
// old data on the device). A profile with a wrong allergen name would find nothing
// and show green for everything, so anything unknown is rejected, never ignored.

import { byId, SEVERITY } from "./allergens.js";

/**
 * @param {object} allergens  e.g. { milk: "avoidTraces" }
 * @returns {object} a clean copy
 * @throws {Error} with a German message if a key or level is unknown
 */
export function validateAllergens(allergens) {
  if (!allergens || typeof allergens !== "object" || Array.isArray(allergens)) throw new Error("Das Profil enthält keine Allergene.");
  const out = {};
  for (const [id, level] of Object.entries(allergens)) {
    if (!Object.hasOwn(byId, id)) throw new Error(`Unbekanntes Allergen im Profil: „${String(id).slice(0, 30)}“. Das Profil wurde nicht übernommen.`);
    if (typeof level !== "string" || !Object.hasOwn(SEVERITY, level)) throw new Error(`Unbekannte Spuren-Stufe im Profil bei „${byId[id].name}“. Das Profil wurde nicht übernommen.`);
    out[id] = level;
  }
  if (!Object.keys(out).length) throw new Error("Das Profil enthält keine Allergene.");
  return out;
}

/** @returns {object} a clean person; throws like validateAllergens */
export function validatePerson(person) {
  if (!person || typeof person !== "object") throw new Error("Das Profil ist beschädigt.");
  if (typeof person.id !== "string" || !person.id) throw new Error("Das Profil ist beschädigt (Kennung fehlt).");
  return { ...person, name: String(person.name ?? "").slice(0, 40), allergens: validateAllergens(person.allergens) };
}

export function isValidPerson(person) {
  try { validatePerson(person); return true; } catch { return false; }
}

/**
 * Checks the data part of a backup file before it replaces anything.
 * @returns {object} cleaned data (activeId always points to an existing, valid profile)
 */
export function validateBackupData(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.people)) throw new Error("Die Sicherung enthält keine Profile.");
  const people = data.people.map(validatePerson);
  const ids = new Set(people.map((p) => p.id));
  if (ids.size !== people.length) throw new Error("Die Sicherung ist beschädigt (doppelte Profile).");
  const activeId = ids.has(data.activeId) ? data.activeId : people[0]?.id || null;
  return {
    ...data,
    people,
    activeId,
    history: Array.isArray(data.history) ? data.history : [],
    queue: Array.isArray(data.queue) ? data.queue.filter((b) => typeof b === "string") : [],
    recentPlaces: Array.isArray(data.recentPlaces) ? data.recentPlaces : [],
    onboarded: people.length > 0 && data.onboarded === true,
  };
}

// ----- share one person via link / QR code -----
// The data sits in the part after "#", which browsers never send to a server.
export const SHARE_PREFIX = "#/import/";

/** Parses the payload of a shared profile ({ v, n, a }). Throws on anything unexpected. */
export function personFromSharePayload(json) {
  if (!json || json.v !== 1) throw new Error("Ungültiger Profil-Link.");
  return { name: String(json.n ?? "").slice(0, 40), allergens: validateAllergens(json.a) };
}
