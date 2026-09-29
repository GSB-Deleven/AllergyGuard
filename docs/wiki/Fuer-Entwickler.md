# Für Entwickler

Reines HTML/CSS/JavaScript, kein Build-Schritt, keine Laufzeit-Abhängigkeiten. Details: [docs/ARCHITEKTUR.md](https://github.com/GSB-Deleven/AllergyGuard/blob/main/docs/ARCHITEKTUR.md).

```bash
git clone https://github.com/GSB-Deleven/AllergyGuard.git
cd AllergyGuard
node --test                      # Tests (Node 20+)
python3 -m http.server 8765      # App unter http://localhost:8765
```

## Wichtige Dateien
| Datei | Zweck |
|---|---|
| `src/core/matcher.js` | Prüflogik |
| `src/core/lexicon.js` | Wörterliste aufbauen, Vergleichsarten |
| `data/synonyms.manual.json` | Wörter ergänzen, Doppelgänger, Spuren-Formulierungen |
| `tools/update-synonyms.mjs` | Wörterliste aus Open Food Facts neu erzeugen |
| `sw.js` | Offline (neue Dateien in `PRECACHE` eintragen) |

## Regeln
- Jede Änderung an Prüflogik oder Wörtern bekommt einen Test.
- Doku (README, `docs/wiki/`) im selben PR mitpflegen.
- Keine Schlüssel ins Repo, `tools/check-secrets.mjs` prüft das in CI.
- Neue Bibliotheken nach `vendor/`, nie per CDN.
