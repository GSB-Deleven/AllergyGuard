// The allergens the app knows: the 14 EU main allergens plus lactose
// intolerance, which is kept apart from milk protein allergy on purpose.

export const ALLERGENS = [
  { id: "milk", name: "Milcheiweiss", short: "Milch", hint: "Kuhmilch-Allergie (auch Ziegen-/Schafmilch)", off: "en:milk" },
  { id: "lactose", name: "Laktose", short: "Laktose", hint: "Unverträglichkeit, keine Allergie", off: null },
  { id: "gluten", name: "Gluten", short: "Gluten", hint: "Weizen, Roggen, Gerste, Hafer, Dinkel …", off: "en:gluten" },
  { id: "eggs", name: "Eier", short: "Ei", hint: "", off: "en:eggs" },
  { id: "peanuts", name: "Erdnüsse", short: "Erdnuss", hint: "", off: "en:peanuts" },
  { id: "nuts", name: "Schalenfrüchte", short: "Nüsse", hint: "Mandel, Haselnuss, Walnuss, Cashew …", off: "en:nuts" },
  { id: "soybeans", name: "Soja", short: "Soja", hint: "", off: "en:soybeans" },
  { id: "fish", name: "Fisch", short: "Fisch", hint: "", off: "en:fish" },
  { id: "crustaceans", name: "Krebstiere", short: "Krebstiere", hint: "Garnelen, Krabben, Hummer …", off: "en:crustaceans" },
  { id: "molluscs", name: "Weichtiere", short: "Weichtiere", hint: "Muscheln, Tintenfisch, Schnecken …", off: "en:molluscs" },
  { id: "sesame", name: "Sesam", short: "Sesam", hint: "", off: "en:sesame-seeds" },
  { id: "celery", name: "Sellerie", short: "Sellerie", hint: "", off: "en:celery" },
  { id: "mustard", name: "Senf", short: "Senf", hint: "", off: "en:mustard" },
  { id: "lupin", name: "Lupinen", short: "Lupine", hint: "", off: "en:lupin" },
  { id: "sulphites", name: "Sulfite", short: "Sulfite", hint: "Schwefeldioxid, E220–E228", off: "en:sulphur-dioxide-and-sulphites" },
];

export const byId = Object.fromEntries(ALLERGENS.map((a) => [a.id, a]));

// How strictly a person reacts. Stored per allergen in the profile.
export const SEVERITY = {
  tracesOk: { id: "tracesOk", label: "Spuren sind okay", help: "„Kann Spuren enthalten“ wird nur als Hinweis gezeigt." },
  avoidTraces: { id: "avoidTraces", label: "Auch Spuren meiden", help: "Produkte mit Spuren-Hinweis werden gelb markiert." },
  severe: { id: "severe", label: "Schwere Reaktion", help: "Anaphylaxie-Gefahr: Spuren gelten als rot." },
};
