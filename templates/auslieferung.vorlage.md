# Antwort-Vorlage Auslieferung (G6)

Für jede Auslieferung im Chat (`references/07-qa.md`, „Auslieferung im Chat“). Platzhalter in <…> ersetzen, Reihenfolge behalten, nichts weglassen. Vor dem Senden die Zeile „Modellkosten je Phase“ im Manifest füllen (Wert laut Client, sonst Schätzung aus Laufzeit und Agentenzahl; „unbekannt“ ist erlaubt, leer nicht). Fehlt ein Wert, „offen“ mit Grund schreiben.

<!-- Warum: Im Praxistest fehlten in der G6-Antwort die Qualitäts-Tabelle, die Frage nach der besten Version und der Prozess-Stand, obwohl die acht Punkte in 07-qa.md standen; die letzte Version ging ohne Hörtest als „fertig“ raus. -->

```
**<Titel> · <vN> · Stand: <fertig | Bild fertig, Hörtest eingeschränkt (Ersatzmodell), bitte selbst hören | Bild fertig, Hörtest offen | Entwurf>**

<!-- Stand „fertig“ nur mit Hörtest des Hauptmodells ohne offenen Befund. Kopf der Hörtest-Datei „Ersatz für …“ = Ersatzmodell: dann „Hörtest eingeschränkt“ und den Nutzer ausdrücklich bitten, Ende und Musik-Nähte selbst zu hören. -->

1. Dateien
   - Web-Kopie: <renders/<film>_web.mp4> (<Länge> s, <MB> MB) · je Fassung eine Zeile
   - Master: <renders/<film>.mp4>

2. Gesichert: `versionen/<vN>/` (Basis: <vM>, Änderungen: <max. 3>)

3. Qualität
   | Check | Ist | ✓/✗ |
   |---|---|---|
   | R1 ★ Ein Feature pro Beat | <Ein-Blick-Bogen gesehen: …> | |
   | R2 ★ Lesezeit | <n von n ≥ Soll> | |
   | R3 ★ Lesefluss | <…> | |
   | R4 ★ Typo mit Material | <…> | |
   | R4 ★ Lesetext ≥ 32 px | <kleinste Lesezeile, Deko-Bereiche mit Grund; lesetext-bogen.jpg in 1/3 Größe gesehen> | |
   | R5 ★ Bild steht nie | <längster Stand, Anteil; „nicht gemessen“ = ✗> | |
   | R6 Kamera lebt | <…> | |
   | R7 ★ Saubere Frames | <Duplikate, Blitze> | |
   | R8 Platzhalter, Leere, Endkarte | <leere Strecken, Median Zeilen mit Inhalt (≥ 35 %, auch ohne Vorbild), Endkarte in Takten> | |
   | R9 ★ Musik ohne Loch und Schleife | <…> | |
   | R10 ★ Natürliches Ende | <Hörtest-Urteil> | |
   | R11 Ton sitzt auf dem Bild | <…> | |
   | R12 Auslieferung | <LUFS, dBTP nach AAC, MB, Länge gegen Brief (Spanne wörtlich, Zahl ± 10 %)> | |
   | Dichte gegen Referenz | <Seite-an-Seite-Kontaktbogen: …> | |
   Jeder ✗ als „✗→✓“ (behoben) oder als offener Punkt mit Grund.
   Interne Regie-Runden: <K> (Regie <voll | spar>), behoben: <Katalog-IDs, kurz> · offen: <„bekannt, nicht gelöst“ mit Grund | keine> (aus `regie/rK/REGIE.md`)

4. Bewusste Abweichungen von der Referenz: <z. B. Film in ganzen Takten länger, weil …>

5. Hörtest: <Modell (Haupt- oder Ersatzmodell)> · <Befunde mit Zeitstempel je Ende und Musik-Naht, verworfene mit Gegenprobe> · ohne eigenes Hören unsicher: <…>
   (Lief kein Hörtest: „Hörtest offen“; nur Ersatzmodell: „Hörtest eingeschränkt“; Stand oben entsprechend.)

6. Offene Freigaben: <Kunde, Lizenzen, Fakten> oder „keine“

7. Geführte Abnahme: die fünf Fragen aus `templates/abnahme-fragen.md` (Vorlage ausfüllen, je Frage Zeitstempel und Bildstreifen aus `regie/abnahme/`, Antwortraster darunter), dazu: Ist das besser als die bisher beste Version (<vM>)? Maßstab-Szene nur fragen, falls noch keine feststeht. Die Antwort wörtlich festhalten: `navi go "<Wortlaut>"`.

8. Kosten: <Claude-Nutzung bis hier in $, laut Client bzw. ca.> von <Budget> $, davon Regie-Schleife <je Runde: rK in $> (dieselben Zahlen stehen im Manifest, „Modellkosten je Phase“; `navi status` zeigt die Summe). Nie nur Tokens.

9. Prozess-Stand: erledigt <…> · offen <…> · dran: <du | Claude>
```
