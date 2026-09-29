// Small helpers shared by all screens.

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const svg = (paths, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const icon = {
  home: svg('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  scan: svg('<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/>'),
  photo: svg('<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/>'),
  card: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
  words: svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  history: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-5 8-5s6.5 1 8 5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  speaker: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  locate: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>'),
  share: svg('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>'),
  download: svg('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 19h14"/>'),
  upload: svg('<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 19h14"/>'),
  qr: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>'),
  torch: svg('<path d="M8 2h8l-1 6H9z"/><path d="M9 8h6v4l-1 10h-4L9 12z"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  check: svg('<path d="M5 12l5 5L20 7"/>'),
  offline: svg('<path d="M2 8.5a15 15 0 0 1 4-2.3M22 8.5A15 15 0 0 0 10 5M5 12a10 10 0 0 1 3-1.8M19 12a10 10 0 0 0-5-2.7M8.5 15.5a5 5 0 0 1 5-1M12 19h.01M3 3l18 18"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  verdict: {
    safe: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', 'stroke-width="2.4"'),
    caution: svg('<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.5"/>', 'stroke-width="2.4"'),
    unsafe: svg('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M9 9l6 6M15 9l-6 6"/>', 'stroke-width="2.4"'),
    unknown: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.5"/>', 'stroke-width="2.4"'),
  },
};

export const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l11 4v8c0 7-4.7 11.8-11 14-6.3-2.2-11-7-11-14V7z" fill="var(--accent)"/><path d="M11 16l3.5 3.5L21.5 12" stroke="var(--accent-ink)" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Wording for the four results. "safe" deliberately says "no … found" instead of
// promising safety: the app can only report what the data shows.
export function verdictText(verdict, person, allergenLabel) {
  const who = person?.name ? ` für ${person.name}` : "";
  return {
    safe: { title: `Kein${allergenLabel ? "e " + allergenLabel : " Allergen"} gefunden`, sub: `Nach den vorhandenen Angaben geeignet${who}` },
    caution: { title: "Achtung, unsicher", sub: `Bitte genau prüfen, bevor ${person?.name || "die Person"} das isst` },
    unsafe: { title: `Enthält ${allergenLabel || "Allergene"}!`, sub: `Nicht geeignet${who}` },
    unknown: { title: "Keine Daten", sub: "Bitte Zutatenliste selbst lesen oder fotografieren" },
  }[verdict];
}

export const chipText = { safe: "✓ Nichts gefunden", caution: "! Achtung", unsafe: "✕ Enthält", unknown: "? Keine Daten" };

export function toast(msg, ms = 2600) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Bottom sheet. Returns a close() function. */
export function sheet(html, onMount) {
  const bd = document.createElement("div");
  bd.className = "sheet-backdrop";
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => bd.remove();
  bd.addEventListener("click", (e) => { if (e.target === bd || e.target.closest("[data-close]")) close(); });
  document.body.append(bd);
  onMount?.(bd.querySelector(".sheet"), close);
  bd.querySelector("button, input, a")?.focus();
  return close;
}

export const initials = (name) => (name || "?").trim().slice(0, 1).toUpperCase() || "?";

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
  const d = Math.round(s / 86400);
  return d === 1 ? "gestern" : d < 30 ? `vor ${d} Tagen` : new Date(iso).toLocaleDateString("de-CH");
}

export function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const file = new File([blob], filename, { type });
  // On iPhone the share sheet lets you save straight to iCloud Drive / Files.
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: filename }).catch(() => {});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
