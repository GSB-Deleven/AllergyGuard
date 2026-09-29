# Anleitung: AllergyGuard einrichten und betreuen

Diese Anleitung ist für Menschen ohne Programmiererfahrung geschrieben. Jeder Schritt hat eine Checkbox. Einmal durchgehen, dann läuft alles automatisch.

> **Kurzfassung:** Code liegt auf GitHub → GitHub testet ihn automatisch → GitHub Pages veröffentlicht ihn gratis als Web-App → du installierst sie am iPhone über Safari.

---

## 0. Einmalig: `main` als Standard-Branch festlegen

- [ ] **⚙️ Settings → General → Default branch** → auf das Pfeil-Symbol ⇄ klicken → **main** wählen → **Update** → bestätigen.

Warum? GitHub startet Automatiken wie Labels und Wiki nur vom Standard-Branch aus, und nur von `main` wird die App veröffentlicht.

## 1. Einmalig: Die App online stellen (GitHub Pages)

GitHub Pages ist ein Gratis-Webhosting von GitHub. Das Repository muss dafür **öffentlich** sein (ist es schon).

- [ ] Im Repository oben auf **⚙️ Settings** klicken.
- [ ] Links im Menü **Pages** wählen.
- [ ] Unter **Build and deployment → Source** die Option **GitHub Actions** auswählen. Speichern ist nicht nötig.
- [ ] Oben auf **Actions** klicken. Dort läuft „Tests & Veröffentlichen“, sobald Code auf `main` landet (siehe Abschnitt 4).
- [ ] Nach 1–2 Minuten ist die App erreichbar unter:
  **https://gsb-deleven.github.io/AllergyGuard/**

**Fehler „Branch "main" is not allowed to deploy to github-pages due to environment protection rules“?**
GitHub erlaubt Veröffentlichungen nur von bestimmten Branches. Wurde Pages eingeschaltet, als `main` noch nicht der Standard-Branch war, steht `main` nicht auf der Liste. So behebst du das:
- [ ] **⚙️ Settings → Environments → github-pages**
- [ ] Unter **Deployment branches and tags** den alten Eintrag löschen und mit **Add deployment branch or tag rule** den Eintrag **`main`** hinzufügen.
- [ ] **Actions** → den roten Lauf öffnen → **Re-run jobs → Re-run failed jobs**.

✅ Ein grüner Haken bei Actions heisst: getestet und veröffentlicht. ❌ Ein rotes Kreuz heisst: Ein Test ist fehlgeschlagen, und die alte Version bleibt online. Nichts geht kaputt.

## 2. Einmalig: Wiki einschalten

Die Wiki-Seiten liegen im Ordner `docs/wiki/` und werden automatisch ins GitHub-Wiki kopiert. Dafür braucht es eine erste, leere Seite:

- [ ] Oben auf **📖 Wiki** klicken.
- [ ] **Create the first page** → einfach auf **Save page** klicken. Der Inhalt wird gleich überschrieben.
- [ ] Unter **Actions → „Wiki aktualisieren“ → Run workflow** einmal von Hand starten. Später passiert das automatisch.

## 3. Einmalig: Labels, Meilensteine, Projekt-Board

**Labels** (farbige Etiketten für Issues):
- [ ] **Actions → „Labels einrichten“ → Run workflow**. Das legt alle Labels aus `.github/labels.yml` an.

**Meilensteine** (Fortschritt pro Phase, optional):
- [ ] **Issues → Milestones → New milestone**, je einen anlegen: „Phase 1 – MVP“, „Phase 1b – Offline & Sprachen“, „Phase 3 – KI“, „Phase 4 – Speisekarte“.
- [ ] Danach Claude sagen: „Ordne die Issues den Meilensteinen zu.“

**Projekt-Board** (Kanban-Tafel mit Spalten „Geplant / In Arbeit / Fertig“, optional):
- [ ] Oben auf **Projects → Link a project → New project → Board**.
- [ ] Name „AllergyGuard Roadmap“, dann **Add item** → alle Issues hinzufügen (`#` tippen).

> Auch ohne Meilensteine und Board siehst du den Stand jederzeit im angepinnten Issue **„📍 Roadmap – wo stehen wir?“**. Dort zeigt jede Phase einen Fortschrittsbalken.

## 4. Wie Änderungen live gehen

So läuft jede Änderung, egal ob Claude oder jemand anderes sie macht:

1. Die Änderung wird auf einem eigenen **Branch** gemacht (eine Arbeitskopie).
2. Daraus entsteht ein **Pull Request (PR)**, ein Änderungsvorschlag. GitHub testet ihn automatisch.
3. Du schaust ihn dir an. Bei grünem Haken klickst du auf **Merge pull request**.
4. Nach 1–2 Minuten ist die neue Version online. Die App am iPhone aktualisiert sich beim nächsten Öffnen von selbst (eventuell zweimal öffnen).

**Etwas ist kaputt?** Im gemergten PR auf **Revert** klicken → neuer PR → Merge. Damit ist die alte Version zurück.

## 5. App aufs iPhone

- [ ] **Safari** öffnen (nicht Chrome, am iPhone braucht es Safari für den Home-Bildschirm).
- [ ] https://gsb-deleven.github.io/AllergyGuard/ aufrufen.
- [ ] Unten **Teilen** (□↑) → **Zum Home-Bildschirm** → **Hinzufügen**.
- [ ] App vom Home-Bildschirm starten → Profil einrichten.
- [ ] Im WLAN: **Info (ⓘ) → Für unterwegs vorbereiten**.
- [ ] **Profil → Sicherung speichern** → in iCloud Drive ablegen.

**Zweites Handy (Partner:in):** Dort ebenfalls installieren, dann **Profil → Profil-QR scannen** und den QR-Code vom ersten Handy scannen.

### Test-Checkliste nach einem Update (5 Minuten)
- [ ] Barcode eines Milchprodukts scannen → **rot** „Enthält Milch!“
- [ ] Barcode von Wasser oder Nudeln scannen → **grün** oder „Keine Daten“
- [ ] Zutatenliste fotografieren → Text erscheint → „Jetzt prüfen“
- [ ] Allergie-Karte → Ort wählen → Vorlesen
- [ ] Flugmodus an → App öffnen → Allergie-Karte geht weiterhin

## 6. Mit Issues arbeiten

Issues sind die To-do-Liste des Projekts.

- **Neues Issue:** **Issues → New issue** → Vorlage wählen (Fehler, falsches Ergebnis, Idee, Übersetzung).
- **Claude beauftragen:** In Claude Code sagen, z. B. „Setze Issue #17 um“. Claude liest das Issue, macht die Änderung, testet und öffnet einen PR.
- **Erledigt:** Ein PR mit „Closes #17“ in der Beschreibung schliesst das Issue beim Merge automatisch.

## 7. Sicherheit: Schlüssel und Passwörter

Die App selbst braucht **keine** Schlüssel. Für die geplanten KI-Funktionen (Phase 3) gilt:

- **Schlüssel gehören nie in den Code oder in dieses Repository.** Das Repository ist öffentlich, und alles darin kann jeder lesen.
- Schlüssel werden ausschliesslich als **verschlüsseltes Secret** beim Anbieter des Vermittlungsdienstes hinterlegt. Die App im Browser kennt den Schlüssel nie.
- Zur Absicherung prüft bei jedem Push ein automatischer Test (`tools/check-secrets.mjs`), ob etwas wie ein Schlüssel aussieht. Wenn ja, wird der Test rot.

Zusätzlich einschalten (gratis bei öffentlichen Repos):
- [ ] **Settings → Advanced Security** (bzw. „Code security“) → **Secret scanning** aktivieren
- [ ] ebenda **Push protection** aktivieren. Dann blockiert GitHub einen Push, der einen bekannten Schlüssel enthält.

**Falls doch einmal ein Schlüssel im Repo landet:** Den Schlüssel sofort beim Anbieter löschen bzw. neu erstellen. Aus dem Code entfernen allein reicht nicht, weil er in der Git-Geschichte sichtbar bleibt.

## 8. Wo finde ich was?

| Ich will … | Datei / Ort |
|---|---|
| Ein Milch-Wort ergänzen | `data/synonyms.manual.json` (plus Test in `tests/matcher.test.js`) |
| Text der Allergie-Karte ändern | `data/cards/<sprache>.json` |
| Ein Land / eine Region ergänzen | `data/regions.json` |
| Farben / Aussehen ändern | `css/app.css` (ganz oben die Farbwerte) |
| Die Doku ändern | `README.md`, `docs/wiki/` |
| Den Stand sehen | Issue **#1 Roadmap** |
