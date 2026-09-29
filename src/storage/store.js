// Everything the app remembers, stored only on this device (localStorage).
// No account, no server. Wrapped in try/catch because private browsing or
// full storage can make localStorage throw.

const KEY = "allergyguard.v1";
const MAX_HISTORY = 100;
const MAX_PRODUCTS = 400;

const empty = () => ({
  version: 1,
  people: [],          // [{ id, name, allergens: { milk: "avoidTraces" }, createdAt }]
  activeId: null,
  history: [],         // [{ id, at, barcode?, name, verdict, personId, source }]
  products: {},        // barcode -> product (offline cache)
  queue: [],           // barcodes scanned offline, checked when back online
  place: null,         // { countryId, regionId }
  recentPlaces: [],
  lastBackupAt: null,
  onboarded: false,
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return migrate(JSON.parse(raw));
  } catch {
    return empty();
  }
}

function migrate(s) {
  // Future format changes go here. Unknown fields are kept.
  return { ...empty(), ...s };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Speichern fehlgeschlagen", err);
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
  update(fn) { fn(state); save(); },

  activePerson() {
    return state.people.find((p) => p.id === state.activeId) || state.people[0] || null;
  },
  savePerson(person) {
    const i = state.people.findIndex((p) => p.id === person.id);
    if (i >= 0) state.people[i] = person; else state.people.push(person);
    if (!state.activeId) state.activeId = person.id;
    save();
  },
  removePerson(id) {
    state.people = state.people.filter((p) => p.id !== id);
    if (state.activeId === id) state.activeId = state.people[0]?.id || null;
    save();
  },
  setActive(id) { state.activeId = id; save(); },

  addHistory(entry) {
    // Opening the same result again replaces the entry instead of adding a duplicate.
    const rest = state.history.filter((h) => !(h.personId === entry.personId && (entry.barcode ? h.barcode === entry.barcode : h.name === entry.name && !h.barcode)));
    state.history = [{ id: uid(), at: new Date().toISOString(), ...entry }, ...rest].slice(0, MAX_HISTORY);
    save();
  },
  clearHistory() { state.history = []; save(); },

  cacheProduct(p) {
    state.products[p.barcode] = p;
    const keys = Object.keys(state.products);
    if (keys.length > MAX_PRODUCTS) {
      keys.sort((a, b) => (state.products[a].fetchedAt || "").localeCompare(state.products[b].fetchedAt || ""));
      for (const k of keys.slice(0, keys.length - MAX_PRODUCTS)) delete state.products[k];
    }
    save();
  },
  cachedProduct: (barcode) => state.products[barcode] || null,

  enqueue(barcode) { if (!state.queue.includes(barcode)) { state.queue.push(barcode); save(); } },
  dequeue(barcode) { state.queue = state.queue.filter((b) => b !== barcode); save(); },

  setPlace(countryId, regionId) {
    state.place = { countryId, regionId: regionId || null };
    const key = `${countryId}|${regionId || ""}`;
    state.recentPlaces = [key, ...state.recentPlaces.filter((k) => k !== key)].slice(0, 5);
    save();
  },

  // ----- backup & sharing -----
  exportBackup() {
    state.lastBackupAt = new Date().toISOString();
    save();
    const { products, ...rest } = state; // product cache can be re-downloaded
    return JSON.stringify({ app: "AllergyGuard", kind: "backup", exportedAt: state.lastBackupAt, data: rest }, null, 1);
  },
  importBackup(text) {
    const parsed = JSON.parse(text);
    if (parsed?.app !== "AllergyGuard" || parsed.kind !== "backup" || !parsed.data) throw new Error("Das ist keine AllergyGuard-Sicherung.");
    state = migrate({ ...parsed.data, products: state.products });
    save();
  },
  replaceAll(next) { state = migrate(next); save(); },
  resetAll() { state = empty(); save(); },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ----- share one person via link / QR code -----
// The data sits in the part after "#", which browsers never send to a server.
const SHARE_PREFIX = "#/import/";

export function personToShareHash(person) {
  const payload = { v: 1, n: person.name || "", a: person.allergens };
  return SHARE_PREFIX + base64url(JSON.stringify(payload));
}

export function personFromShareHash(hash) {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const json = JSON.parse(fromBase64url(hash.slice(SHARE_PREFIX.length)));
  if (json.v !== 1 || typeof json.a !== "object") throw new Error("Ungültiger Link");
  const allergens = {};
  for (const [k, v] of Object.entries(json.a)) if (["tracesOk", "avoidTraces", "severe"].includes(v)) allergens[String(k)] = v;
  return { id: uid(), name: String(json.n || "").slice(0, 40), allergens, createdAt: new Date().toISOString() };
}

function base64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
