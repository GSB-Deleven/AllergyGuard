# Wie die Prüfung funktioniert

1. **Daten sammeln:** Zutatenliste (von Open Food Facts, aus dem Foto oder getippt) und die Allergen-Angaben von Open Food Facts.
2. **Text aufräumen:** Am Zeilenende getrennte Wörter werden zusammengesetzt (*Mol-⏎kenpulver*), unsichtbare Trennzeichen und Fussnotenzeichen (*lait¹*) entfernt. Typische Lesefehler der Texterkennung (*Mi1chpulver*, 1 statt l, 0 statt o) ergeben mindestens Gelb („möglicher Lesefehler“).
2. **Doppelgänger erkennen:** „Kokosmilch“, „Kakaobutter“, „Erdnussbutter“, „Milchsäure“ sind keine Milch. Sie erscheinen als Hinweis, und der Rest wird normal geprüft. Ein Doppelgänger gilt nur als **ganzes Wort**: „oat milk“ versteckt nicht „goat milk“.
3. **Alle Sprachen gleichzeitig durchsuchen:** über 8'000 Begriffe, davon über 4'000 für Milch. Auch zusammengesetzte Wörter wie *Süssmolkenpulver* oder *Vollmilchschokolade* werden erkannt, dazu gebeugte Formen über Wortstämme (kroatisch *maslaca*, türkisch *peyniri*, griechisch *τυριού*) und Schweizer Wörter (*Anken*, *Ziger*, *Nidel*).
4. **Spuren-Hinweise finden:** „kann Spuren enthalten“, „puede contener trazas“, „may contain“ … Der Hinweis gilt bis zum Satzende, bis zur schliessenden Klammer, bis zu einem Doppelpunkt (neue Liste) oder bis zum Zeilenumbruch. Was danach steht, ist wieder eine normale Zutat. Im Zweifel endet der Hinweis lieber zu früh (strenger).
5. **Verneinungen beachten:** „milchfrei“, „milk-free“, „frei von Milch“, „sans lait“. Die Verneinung gilt nur für das Wort, an dem sie hängt: „Vollmilch frei von Gentechnik“ bleibt Milch. Wichtig: **Laktosefrei ist nie eine Entwarnung für Milcheiweiss.**
6. **Bewerten** nach deiner Spuren-Stufe:

| | Spuren okay | Auch Spuren meiden | Schwere Reaktion |
|---|---|---|---|
| Enthält | ⛔ | ⛔ | ⛔ |
| Kann Spuren enthalten | ✅ + Hinweis | ⚠️ | ⛔ |
| „Vielleicht“-Wort (Margarine, crema …) | ⚠️ | ⚠️ | ⚠️ |
| Möglicher Lesefehler (*Mi1chpulver*) | ⚠️ | ⚠️ | ⚠️ |
| Foto, nichts gefunden | 🔎 vergleichen | 🔎 vergleichen | 🔎 vergleichen |
| Keine lesbare Zutatenliste | ❔ | ❔ | ❔ |
| Text ist keine Zutatenliste („siehe Verpackung“) | ❔ | ❔ | ❔ |
| Schrift, die die Wortliste nicht abdeckt (Chinesisch, Arabisch, Kyrillisch …) und kein Treffer | ❔ | ❔ | ❔ |

7. **Im Zweifel streng:** Bei Widersprüchen gewinnt das strengere Ergebnis. Ohne Daten gibt es nie Grün. Grün gibt es nur für eine plausible Zutatenliste (mehrere Zutaten) in lateinischer oder griechischer Schrift, die getippt wurde oder von Open Food Facts stammt. Ein Treffer zählt dagegen immer, auch in anderen Schriften.

## Beta: die anderen Allergene
Milcheiweiss (und Laktose) ist der Schwerpunkt. Die 13 anderen Allergene sind in der App als **Beta** markiert: Die häufigsten Wörter sind drin (z. B. *Garnelen*, *Marzipan*, *Seitan*, *Tahini*, *Ei*, *E220*), die Listen sind aber noch nicht vollständig.

## Milcheiweiss vs. Laktose
| | Milcheiweiss-Allergie | Laktose-Unverträglichkeit |
|---|---|---|
| Problem | Eiweiss (Kasein, Molke) | Milchzucker |
| Laktosefreie Milch | ⛔ nicht geeignet | ✅ meist geeignet |
| Butter, Hartkäse | ⛔ | ⚠️ oft wenig Laktose |

## Woher kommen die Wörter?
- Aus der offenen Taxonomie von **Open Food Facts** (tausende Zutaten in über 50 Sprachen)
- Aus einer **von Hand gepflegten Liste** mit Quellen, geprüft durch automatische Tests mit echten Zutatenlisten aus ES, IT, FR, GR, TR, HR …
- Aus euren **Meldungen** über „Falsches Ergebnis melden“
