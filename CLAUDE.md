# AllergyGuard – Hinweise für Claude

Web-App (PWA) zum Prüfen von Lebensmitteln auf Allergene, Fokus Milcheiweiss. Der Besitzer ist Anfänger: Erklärungen auf Deutsch, einfach, Schritt für Schritt.

## Regeln
- **Kein Build-Schritt, keine npm-Abhängigkeiten zur Laufzeit.** Bibliotheken liegen in `vendor/` (nie CDN).
- **Streng statt bequem:** Ohne lesbare Daten nie „safe“. Im Zweifel die strengere Stufe.
- **Jede Änderung an der Prüflogik oder an Wörterlisten braucht einen Test** in `tests/`. Vor jedem Commit: `node --test` und `node tools/check-secrets.mjs`.
- **Neue Datei in `src/` oder `data/`?** In `sw.js` → `PRECACHE` eintragen (der Test prüft das).
- **Doku im selben PR mitpflegen:** `README.md`, `docs/wiki/`, bei sichtbaren Änderungen Screenshots neu erzeugen (`node tools/screenshots.mjs`), `docs/wiki/Aenderungsprotokoll.md` ergänzen, Roadmap-Issue #1 aktualisieren.
- **Niemals Schlüssel, Tokens oder Passwörter ins Repo.** Öffentlich nur allgemein beschreiben, wie Secrets gehandhabt werden. Konkrete Einrichtungsschritte nur im Chat.
- UI-Texte Deutsch, Code und Kommentare Englisch. Design-Tokens stehen oben in `css/app.css` (Entwurf C „Aprikose klar“).
- Issues nutzen: Arbeit einem Issue zuordnen, PR-Beschreibung mit „Closes #…“.

## Befehle
- Tests: `node --test`
- Lokal starten: `python3 -m http.server 8765` → http://localhost:8765
- Wörterliste neu: `node tools/update-synonyms.mjs`
- Screenshots: `node tools/screenshots.mjs` (Server muss laufen)

## Projektstand & Entscheidungen
Damit eine neue Session ohne den alten Chat weiterarbeiten kann. Keine persönlichen Daten hier eintragen, das Repo ist öffentlich.

**Stand**
- Version 0.1.1 ist online: https://gsb-deleven.github.io/AllergyGuard/. Phase 1 ist fertig.
- Roadmap: Issue #1. Epics: #3 (Phase 1b: Offline-Länderpakete #17, Schriften #18, Übersetzungen prüfen #19, Konto/Sync #25), #4 (KI), #5 (Speisekarte), #26 (Monetarisierung).
- Git: Arbeit auf dem Session-Branch (bisher `claude/allergyguard-ios-app-z3xw3x`), veröffentlicht wird von `main`. Der Besitzer hat erlaubt, denselben Stand nach `main` zu pushen. Standard-Branch ist `main`. GitHub Pages (Quelle: Actions), Wiki-Sync und Labels sind eingerichtet.

**Entscheidungen (nicht neu diskutieren, ausser der Besitzer will es)**
- PWA statt nativer App: kein Mac, gratis, Updates ohne App Store.
- Profile nur lokal (localStorage), mehrere Personen möglich. Teilen per QR-Code **in der App** („Profil-QR scannen“), weil die Home-Bildschirm-App am iPhone einen eigenen Speicher hat, getrennt von Safari. Sicherung als Datei. Konto/Sync erst später (#25).
- Prüfung immer in allen Sprachen gleichzeitig. Milcheiweiss ≠ Laktose, „laktosefrei“ ist nie eine Entwarnung.
- Texte der Allergie-Karte fest in `data/cards/` (11 Sprachen), nicht per KI übersetzt. Nur Deutsch ist als „geprüft“ markiert.
- **Tonalität der Karte:** Nur die Stufe „Schwere Reaktion“ spricht von Gefahr und nennt den Notruf (`tracesSevere`, `introSevere`). „Auch Spuren meiden“ bleibt sachlich („Bitte auch kleinste Spuren vermeiden“). Hauptnutzer ist ein Kind mit Milcheiweiss-Allergie: Reaktion Bauchschmerzen und Ausschlag, keine Anaphylaxie.
- Design: Entwurf C „Aprikose klar“, ohne Maskottchen. Allergen-Raster am Handy 2-spaltig.
- KI (Phase 3, noch nicht gebaut): Gemini-Gratis-Stufe über einen Cloudflare Worker als Vermittler. Der Schlüssel liegt nur als Secret im Worker, nie in App oder Repo. Die konkrete Einrichtungsanleitung gibt es nur im Chat. KI-Ergebnisse sind nie „sicher“.
- Monetarisierung: vorerst MIT-Lizenz. Später eventuell Spenden oder KI-Extras als Abo. Nie Werbung oder Datenverkauf (#26).

**Umgebung (Cloud-Session)**
- Open Food Facts und tessdata sind über den Proxy gesperrt, darum mit `tests/fixtures/` testen. npm-Registry, raw.githubusercontent.com und `git ls-remote` zu GitHub funktionieren.
- Playwright/Chromium ist vorinstalliert, Import: `$(npm root -g)/playwright/index.mjs` (z. B. `PLAYWRIGHT_PATH=... node tools/screenshots.mjs`).
- Das GitHub-MCP kann keine Labels oder Milestones anlegen. Labels kommen aus `.github/labels.yml` über den Workflow „Labels einrichten“.

**Nächste sinnvolle Schritte:** Kamera-Scan am echten iPhone testen, Offline-Länderpakete (#17), Übersetzungen prüfen lassen (#19).

**Kommunikation:** Der Besitzer ist Anfänger. Deutsch, einfach, Klick für Klick. GitHub-Einstellungen, die nur er ändern kann, als nummerierte Schritte beschreiben.
