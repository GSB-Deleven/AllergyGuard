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
