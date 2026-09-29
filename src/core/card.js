// Builds the allergy card text for one person in one language.
// All sentences come from data/cards/<lang>.json, so they are fixed,
// reviewable and never machine-translated at runtime.

/**
 * @param {object} person   { name, allergens: { milk: "avoidTraces", ... } }
 * @param {object} card     parsed data/cards/<lang>.json
 * @param {{emergency?: string}} [opts]
 * @returns {{ title: string, sentences: string[], text: string }}
 */
export function buildCard(person, card, { emergency } = {}) {
  const ids = Object.keys(person?.allergens || {});
  const levels = Object.values(person?.allergens || {});
  const severe = levels.includes("severe");
  const strictTraces = levels.some((l) => l === "avoidTraces" || l === "severe");
  const name = (person?.name || "").trim() || card.noName;
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

  const list = ids.map((id) => card.allergens[id] || id).join(", ");
  const foods = ids.map((id) => card.foods?.[id]).filter(Boolean).join("; ");

  const sentences = [
    fill(severe ? card.introSevere : card.intro, { name, list }),
    card.kitchen,
    foods ? fill(card.avoid, { foods }) : null,
    severe ? card.tracesSevere : strictTraces ? card.tracesStrict : card.tracesOk,
    card.cross,
    ids.includes("milk") || ids.includes("lactose") ? card.crossMilk : null,
    card.unsure,
    severe && emergency ? fill(card.emergency, { number: emergency }) : null,
    card.thanks,
  ].filter(Boolean);

  return { title: card.title, sentences, text: sentences.join(" ") };
}
