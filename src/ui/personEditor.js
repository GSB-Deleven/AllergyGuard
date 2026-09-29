// Allergen selection and trace setting, used by the first-run setup and the profile.

import { ALLERGENS, SEVERITY } from "../core/allergens.js";
import { esc } from "./dom.js";

export function allergenGridHTML(selected) {
  return `<div class="allergen-grid" role="group" aria-label="Allergene wählen">
    ${ALLERGENS.map((a) => `
      <button type="button" class="allergen" data-allergen="${a.id}" aria-pressed="${a.id in selected}">
        <span class="check">${a.id in selected ? "✓" : ""}</span>
        <span>${esc(a.name)}${a.hint ? `<small>${esc(a.hint)}</small>` : ""}</span>
      </button>`).join("")}
  </div>`;
}

export function bindAllergenGrid(root, selected, onChange) {
  root.querySelectorAll("[data-allergen]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.allergen;
      if (id in selected) delete selected[id];
      else selected[id] = "avoidTraces";
      btn.setAttribute("aria-pressed", String(id in selected));
      btn.querySelector(".check").textContent = id in selected ? "✓" : "";
      onChange?.();
    }));
}

export function severityHTML(selected, name) {
  const ids = Object.keys(selected);
  if (!ids.length) return `<p class="muted">Noch kein Allergen gewählt.</p>`;
  return ids.map((id) => {
    const a = ALLERGENS.find((x) => x.id === id);
    return `<fieldset class="stack" style="border:0;padding:0;margin:0">
      <legend class="label" style="margin-bottom:8px">${esc(a.name)}${name ? ` · ${esc(name)}` : ""}</legend>
      <div class="stack" role="radiogroup" aria-label="Spuren-Stufe ${esc(a.name)}">
        ${Object.values(SEVERITY).map((s) => `
          <button type="button" class="opt" role="radio" data-sev-for="${id}" data-sev="${s.id}" aria-checked="${selected[id] === s.id}">
            <span class="dot"></span><span><b>${esc(s.label)}</b><small>${esc(s.help)}</small></span>
          </button>`).join("")}
      </div>
    </fieldset>`;
  }).join("");
}

export function bindSeverity(root, selected) {
  root.querySelectorAll("[data-sev-for]").forEach((btn) =>
    btn.addEventListener("click", () => {
      selected[btn.dataset.sevFor] = btn.dataset.sev;
      root.querySelectorAll(`[data-sev-for="${btn.dataset.sevFor}"]`).forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
    }));
}

export function severitySummary(person) {
  const entries = Object.entries(person.allergens || {});
  if (!entries.length) return "Keine Allergene gewählt";
  return entries.map(([id, sev]) => `${ALLERGENS.find((a) => a.id === id)?.short || id} (${SEVERITY[sev]?.label || sev})`).join(", ");
}
