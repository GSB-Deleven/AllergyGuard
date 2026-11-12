// Import checks: a backup file or profile QR code with wrong content must be rejected,
// never taken over silently (a profile with an unknown allergen finds nothing).
import { test } from "node:test";
import assert from "node:assert/strict";

// store.js keeps its data in localStorage. A small stand-in is enough for the tests.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { validateAllergens, validatePerson, validateBackupData, personFromSharePayload } = await import("../src/core/profile.js");
const { store, personToShareHash, personFromShareHash } = await import("../src/storage/store.js");

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const backup = (data) => JSON.stringify({ app: "AllergyGuard", kind: "backup", data });
const lena = { id: "lena", name: "Lena", allergens: { milk: "avoidTraces" } };

test("allergen keys and levels are checked strictly", () => {
  assert.deepEqual(validateAllergens({ milk: "severe", eggs: "tracesOk" }), { milk: "severe", eggs: "tracesOk" });
  assert.throws(() => validateAllergens({ Milk: "severe" }), /Unbekanntes Allergen/);
  assert.throws(() => validateAllergens({ milk: "Severe" }), /Unbekannte Spuren-Stufe/);
  assert.throws(() => validateAllergens({ milk: true }), /Spuren-Stufe/);
  assert.throws(() => validateAllergens({ toString: "severe" }), /Unbekanntes Allergen/);
  assert.throws(() => validateAllergens({}), /keine Allergene/);
  assert.throws(() => validateAllergens(null), /keine Allergene/);
  assert.throws(() => validateAllergens(["milk"]), /keine Allergene/);
  assert.throws(() => validatePerson({ name: "x", allergens: { milk: "severe" } }), /beschädigt/);
});

test("profile QR code: wrong content is rejected with a German message", () => {
  assert.throws(() => personFromShareHash("#/import/" + b64({ a: { Milk: "severe" } })), /Ungültiger Profil-Link/);
  assert.throws(() => personFromShareHash("#/import/" + b64({ v: 1, a: { Milk: "severe" } })), /Unbekanntes Allergen/);
  assert.throws(() => personFromShareHash("#/import/" + b64({ v: 1, a: { milk: "sehr" } })), /Spuren-Stufe/);
  assert.throws(() => personFromShareHash("#/import/" + b64({ v: 1, a: {} })), /keine Allergene/);
  assert.throws(() => personFromShareHash("#/import/%%%"), /beschädigt/);
  assert.throws(() => personFromSharePayload(null), /Ungültig/);
  assert.equal(personFromShareHash("#/start"), null);
});

test("profile QR code: a real profile makes the round trip", () => {
  const p = personFromShareHash(personToShareHash({ name: "Lena", allergens: { milk: "avoidTraces", lactose: "tracesOk" } }));
  assert.equal(p.name, "Lena");
  assert.deepEqual(p.allergens, { milk: "avoidTraces", lactose: "tracesOk" });
  assert.ok(p.id);
});

test("backup: wrong content changes nothing", () => {
  store.resetAll();
  store.savePerson({ ...lena });
  const before = JSON.stringify(store.get());
  for (const [text, msg] of [
    ['{"a":{"Milk":"severe"}}', /keine AllergyGuard-Sicherung/],
    ["kein json", /kein lesbares JSON/],
    [backup({ people: [{ id: "x", name: "X", allergens: { Milk: "severe" } }], activeId: "x", onboarded: true }), /Unbekanntes Allergen/],
    [backup({ people: [{ id: "x", name: "X", allergens: { milk: "schlimm" } }] }), /Spuren-Stufe/],
    [backup({ people: [{ id: "x", name: "X", allergens: {} }] }), /keine Allergene/],
    [backup({ people: "nope" }), /keine Profile/],
    [backup({ people: [lena, lena] }), /doppelte Profile/],
  ]) {
    assert.throws(() => store.importBackup(text), msg, text);
    assert.equal(JSON.stringify(store.get()), before, "state must be untouched");
  }
});

test("backup: a valid file is restored, the active profile always exists", () => {
  store.resetAll();
  store.importBackup(backup({ people: [lena, { id: "tim", name: "Tim", allergens: { peanuts: "severe" } }], activeId: "gone", onboarded: true, history: "broken" }));
  assert.equal(store.get().people.length, 2);
  assert.equal(store.activePerson().id, "lena");
  assert.deepEqual(store.get().history, []);
  const round = validateBackupData(JSON.parse(store.exportBackup()).data);
  assert.equal(round.people.length, 2);
});

test("an invalid profile already on the device is never the active one", () => {
  store.replaceAll({ onboarded: true, activeId: "bad", people: [{ id: "bad", name: "Alt", allergens: { Milk: "severe" } }, { ...lena }] });
  assert.equal(store.activePerson().id, "lena");
  store.replaceAll({ onboarded: true, activeId: "bad", people: [{ id: "bad", name: "Alt", allergens: { Milk: "severe" } }] });
  assert.equal(store.activePerson(), null);
});
