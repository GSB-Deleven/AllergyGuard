// App start and navigation. Screens live in src/ui/views/, the checking logic in src/core/.

import { store } from "./storage/store.js";
import { icon } from "./ui/dom.js";
import * as onboarding from "./ui/views/onboarding.js";
import * as home from "./ui/views/home.js";
import * as scan from "./ui/views/scan.js";
import * as result from "./ui/views/result.js";
import * as photo from "./ui/views/photo.js";
import * as card from "./ui/views/card.js";
import * as words from "./ui/views/words.js";
import * as history from "./ui/views/history.js";
import * as profile from "./ui/views/profile.js";
import * as info from "./ui/views/info.js";

// path -> [render function, tab to highlight, show tab bar]
const ROUTES = {
  start: [home.render, "start", true],
  scan: [scan.render, "scan", true],
  result: [result.render, "scan", true],
  check: [result.renderText, "scan", true],
  photo: [photo.render, "scan", true],
  card: [card.render, "card", true],
  words: [words.render, "start", true],
  history: [history.render, "history", true],
  profile: [profile.render, "profile", true],
  info: [info.render, "profile", true],
  import: [profile.renderImport, null, false],
  welcome: [onboarding.render, null, false],
};

const TABS = [
  ["start", "Start", icon.home],
  ["scan", "Prüfen", icon.scan],
  ["card", "Karte", icon.card],
  ["history", "Verlauf", icon.history],
  ["profile", "Profil", icon.user],
];

const main = document.querySelector("main");
const tabbar = document.querySelector(".tabbar");
let cleanup = null;
let current = null;

const app = {
  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  refresh() { route(); },
  /** Screens load data asynchronously; this tells them whether they are still on screen. */
  isCurrent(el) { return el === main && main.dataset.view === current; },
};

async function route() {
  const hash = location.hash || "#/start";
  const [path, ...params] = hash.replace(/^#\/?/, "").split("?")[0].split("/");
  let name = ROUTES[path] ? path : "start";

  const needsSetup = !store.get().onboarded || !store.get().people.length;
  if (needsSetup && name !== "import") name = "welcome";

  try { cleanup?.(); } catch {}
  document.querySelectorAll(".sheet-backdrop").forEach((el) => el.remove());
  cleanup = null;
  const [render, tab, showTabs] = ROUTES[name];
  current = `${name}:${Date.now()}`;
  main.dataset.view = current;
  main.classList.toggle("no-tabs", !showTabs);
  tabbar.hidden = !showTabs;
  tabbar.querySelectorAll("a").forEach((a) => (a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));

  try {
    const maybe = await render(main, params, app);
    if (typeof maybe === "function") cleanup = maybe;
  } catch (err) {
    console.error(err);
    main.innerHTML = `<h1>Da ist etwas schiefgelaufen</h1><p class="muted">${String(err.message || err)}</p><a class="btn primary block" href="#/start">Zur Startseite</a>`;
  }
}

function buildTabbar() {
  tabbar.innerHTML = `<ul>${TABS.map(([id, label, ic]) => `<li><a href="#/${id}" data-tab="${id}">${ic}<span>${label}</span></a></li>`).join("")}</ul>`;
}

function watchOnline() {
  const banner = document.querySelector(".offline-banner");
  const update = () => {
    banner.hidden = navigator.onLine;
    if (navigator.onLine) checkQueue();
  };
  addEventListener("online", update);
  addEventListener("offline", update);
  update();
}

// Barcodes scanned without internet are looked up once we are back online.
async function checkQueue() {
  const queue = [...store.get().queue];
  if (!queue.length) return;
  const { lookupBarcode } = await import("./services/openFoodFacts.js");
  for (const code of queue) {
    try {
      const p = await lookupBarcode(code);
      store.cacheProduct(p);
      store.dequeue(code);
    } catch (err) {
      if (err.kind === "notFound") store.dequeue(code);
    }
  }
}

buildTabbar();
watchOnline();
addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service Worker", e));
}
navigator.storage?.persist?.().catch(() => {});
