# Änderungsprotokoll

## 0.2.0 – Prüfung gehärtet
Eine Prüfung im November 2026 hat Fälle gefunden, in denen die App fälschlich Grün zeigte. Diese Version schliesst sie. Die Grundregel bleibt: lieber zu streng als zu bequem.

- **Doppelgänger nur als ganzes Wort:** „goat milk“ (enthält „oat milk“), ungarisch „tejsavópor“ und „Schafermilch“ werden jetzt als Milch erkannt. Ein Selbsttest prüft, dass jedes Wort der Liste auch wirklich gefunden wird.
- **Grün nur bei echter Zutatenliste:** „Zutaten: siehe Verpackung“ oder Text in chinesischer, koreanischer, thailändischer, arabischer, hebräischer, kyrillischer Schrift oder Hindi ergibt „Keine Daten“ statt Grün. Die wichtigsten Milch-Wörter dieser Schriften sind neu drin und ergeben Rot.
- **Gebeugte Formen:** kroatisch „maslaca“, „sira“, türkisch „sütü“, „peyniri“, griechisch „τυριού“, dazu Polnisch, Tschechisch, Ungarisch, Rumänisch. Fussnotenzeichen („lait¹“) und zusammengeschriebene Wörter („milkpowder“) stören nicht mehr.
- **Spuren-Hinweis** endet an Klammer, Doppelpunkt, Zeilenumbruch und Satzende und schluckt keine folgenden Zutaten mehr.
- **Verneinung:** „Vollmilch frei von Gentechnik“ und „butter free range eggs“ sind keine Entwarnung mehr.
- **Texterkennung:** getrennte Wörter am Zeilenende, unsichtbare Trennzeichen und Lesefehler wie „Mi1chpulver“ werden erkannt. Ein Foto-Ergebnis ist nie mehr Grün, sondern „Im erkannten Text nichts gefunden, bitte mit der Verpackung vergleichen“.
- **Schweizer Wörter:** Anken, Ziger, Schabziger, Sbrinz, Vacherin, Greyerzer, Nidel, Schotte, Glace und weitere.
- **Andere Allergene:** häufige Wörter ergänzt (Garnelen, Marzipan, Seitan, Tahini, Ei, E220 …). Alle Allergene ausser Milcheiweiss und Laktose sind als **Beta** gekennzeichnet.
- **Import:** Eine Sicherung oder ein Profil-QR mit unbekanntem Allergen oder unbekannter Stufe wird mit einer Meldung abgelehnt. Ein ungültiges Profil wird nie aktiv.
- **Updates:** Jede Version hat ihren eigenen Offline-Speicher. Ist eine neue Version geladen, zeigt die App „Neue Version verfügbar“ mit dem Knopf „Neu laden“. Beim Wechsel von 0.1.x lädt die App einmal von selbst neu.

## 0.1.1
- Allergie-Karte: Bei „Auch Spuren meiden“ heisst es jetzt sachlich „Bitte auch kleinste Spuren vermeiden“. Von „gefährlich“ spricht die Karte nur noch bei „Schwere Reaktion“.
- Allergen-Auswahl auf dem Handy zweispaltig und besser lesbar (vorher gequetscht)

## 0.1.0 – Erste Version
- Einrichtung mit Personen-Profilen und Spuren-Stufe pro Allergen
- Barcode-Scan mit Open Food Facts, Produkt-Speicher für offline
- Prüfung in über 50 Sprachen gleichzeitig, mehr als 7'000 Begriffe
- Zutaten-Foto mit Texterkennung auf dem Gerät
- Text eingeben/einfügen
- Allergie-Karte in 11 Sprachen mit Ort/Region, Vorlesen, Bild teilen
- Wörter-Check und Wörterlisten pro Sprache
- Verlauf und „Später prüfen“ für Scans ohne Internet
- Sicherung als Datei, Profil teilen per QR-Code
- Offline-fähig (PWA), heller und dunkler Modus
