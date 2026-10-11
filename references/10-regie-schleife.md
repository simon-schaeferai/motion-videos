# Regie-Schleife (der Skill spielt den anspruchsvollen Kunden)

Ein fremder Nutzer sagt nach v1 oft nur „sieht gut aus“. Im Ursprungslauf kam der Film erst durch elf Runden Kritik eines anspruchsvollen Auftraggebers auf Premium-Niveau; in zwei Praxistests ohne diese Kritik blieben die Filme auf Stand v1 (Bildfüllung 12 bis 44 %, leere Momente, lange Endkarte, Musiksprünge), obwohl die Rubrik grün war. Die Regie-Schleife übernimmt diese Rolle: Gebündelte Kritiker (alle sechs Linsen, bei „voll“ auf drei Agenten verteilt, bei „spar“ in einem) prüfen den Gesamt-Render gegen den Einwand-Katalog (`11-einwand-katalog.md`) und die Maßstab-Szene, der Hauptlauf wählt in der Synthese höchstens drei Änderungen, gemessen wird vorher und nachher. Die Schleife hat ein festes Rundenlimit und ein Budget: Im Beweistest lief sie ohne Limit vier Runden mit 25 Kritikern, kostete 48,8 $ von 95,76 $ und riss das Wochenlimit des Abos.

## 1. Wann sie läuft
- **Nach jedem Gesamt-Render und vor jeder Fassung, die der Nutzer sieht** (G6, und jede Revision danach).
- **Vor v1 genau 2 interne Runden bei „voll“, 1 bei „spar“.** Der Nutzer sieht als erste Fassung das Ergebnis der letzten Runde, nie den ersten Gesamt-Render.
- **Bei „voll“ eine Prüfrunde nach dem Ton** (Station 7, Ablage `regie/pruefung/`): Messen mit Ton, Hörtest, dieselben drei Kritiker prüfen nach; geändert wird nur, was Schwere „hoch“ hat. Danach keine weitere Runde.
- **Nach Nutzer-Feedback:** Die Änderungen des Nutzers (höchstens drei, aus der geführten Abnahme, `templates/abnahme-fragen.md`) werden umgesetzt, dann läuft **eine** Runde nur als Prüfung (Messen, Kritiker, keine neuen Änderungen außer Fehlern mit Schwere „hoch“, die die Umsetzung selbst erzeugt hat).
- **Nicht** auf Teil-Renders einzelner Blöcke (dort gilt die Qualitätsschleife aus Vorlage B) und nicht auf der Probe (Station 5: eigene Mängel misst und behebt der Hauptlauf, der Nutzer sieht sie als Zwischenstand; gewartet wird nur, wenn er im Vorschlag „Probe abwarten“ gewählt hat).

**Abbruch (fest):** „voll“ nach Runde 2, „spar“ nach Runde 1, früher, wenn eine Runde **keinen Befund mit Schwere ≥ mittel** liefert oder Runde 2 die Befund-Punkte um weniger als 20 % senken würde (dann Runde 2 nur, wenn ein Befund „hoch“ offen ist). Offene „mittel“-Befunde verlängern die Schleife nicht. Bleiben Befunde „hoch“ offen, wird geliefert, und sie stehen in der Auslieferung als „bekannt, nicht gelöst“ mit Grund oder gehen als Frage in die geführte Abnahme.
**Budget:** Vor jeder Runde `node <skill-dir>/scripts/navi.mjs pruefen`. Meldet Station 6 „Budget erreicht“, beginnt keine Runde mehr: Rückfrage an den Nutzer nach `00-navigator.md` „Kosten und Budget“. Nach jeder Runde eine Kostenzeile „Regie rK“ in $ ins Manifest (Station 6 prüft das).

<!-- Warum festes Limit: Im Beweistest (11.10.2026) ließ die alte Regel „weiter, solange ein Befund ≥ mittel offen ist“ die Schleife bis zur Höchstzahl 4 laufen; die Punkte sanken 59 → 34 → 26 → 25, die Runden 3 und 4 brachten zusammen 9 Punkte für ca. 26 $. -->

## 2. Maßstab-Szene (einmal je Lauf, in Runde 1)
Die Maßstab-Szene ist die stärkste Szene des eigenen Films; alle anderen Szenen werden auf ihr Niveau gehoben (Katalog M06). Hat der Nutzer eine Szene genannt („die gefällt mir“, G4), gilt seine Wahl.

Sonst bestimmt sie Runde 1:
1. Kandidaten aus der Szenentabelle von `qualitaet.py` (Abschnitt „Szenen“): kein Stand, Drift im Soll, Bildfüllung ≥ Median, dazu eine Aussage in Stufe H oder Z, wenn vorhanden.
2. Im Seite-an-Seite-Kontaktbogen die zwei bis drei Kandidaten neben die Vorbild-Stelle legen: Welche hält dem Vorbild am ehesten stand (Dichte, Material, Typo, Bewegung)?
3. Eintrag im Manifest unter „Maßstab“: Szene, Zeitfenster, warum (drei Messwerte), Standbild-Pfad. Die Szene bleibt Sperrzone: Keine Änderung der Schleife darf sie verschlechtern.

Jeder Kritiker beantwortet für jede andere Szene: „Liegt diese Szene in meiner Linse sichtbar unter der Maßstab-Szene? Woran genau?“

## 3. Ablauf einer Runde

| # | Schritt | Wer | Ergebnis |
|---|---|---|---|
| 0 | **Version sichern**: `bash <skill-dir>/scripts/version-sichern.sh <lauf> vN-rK "Regie-Runde K, Basis …"` | Hauptlauf | Rückweg für Schritt 7 |
| 1 | **Messen** (unter der Sperre): `python3 <skill-dir>/scripts/qualitaet.py renders/<film>_web.mp4 --ref analyse/referenz.mp4 --ereignisse ereignisse.json --brief <Brief> --out regie/rK/qualitaet`; Hörtest Ende und jede Musik-Naht (`node <skill-dir>/scripts/hoertest.mjs … --out regie/rK/hoertest-*.md`) | Hauptlauf | `qualitaet.md`, Ein-Blick-Bogen, Lesetext-Bogen, Szenentabelle, Hörtest |
| 2 | **Kontaktbögen**: Seite-an-Seite mit dem Vorbild über die ganze gemeinsame Länge (`scripts/vergleich.py --start 0 --ende <kürzere Dauer> --out regie/rK/vergleich`), dazu ein Film-Kontaktbogen alle 0,5 s über die **ganze** Filmlänge inklusive Endkarte (`scripts/bewegung.py renders/<film>_web.mp4 --alle 0.5 --sperre <lauf>`, Ergebnis `<film>_web_bewegung.jpg` nach `regie/rK/film-kontakt.jpg` kopieren) und derselbe Bogen für das Vorbild; jede Kachel trägt ihre Zeit | Hauptlauf | `regie/rK/vergleich/sheets/`, `regie/rK/film-kontakt.jpg`, `regie/rK/vorbild-kontakt.jpg` |
| 3 | **Kritiker parallel** (Vorlage G in `templates/agent-prompts.md`), im Vordergrund, nur lesend: „voll“ 3 gebündelte (je zwei Linsen), „spar“ 1 mit allen sechs | 3 bzw. 1 Agent | je `regie/rK/kritik-<buendel>.json`, höchstens 6 Befunde (spar: 8) mit Zeit, Beleg, Schwere, Katalog-ID, Fix |
| 4 | **Synthese** (Vorlage H) im Hauptlauf, kein eigener Agent | Hauptlauf | `regie/rK/REGIE.md` + `regie/rK/synthese.json`: höchstens 3 Änderungen |
| 5 | **Umsetzen**: nur die gewählten Änderungen, mit Vorlage B (betroffene Blöcke) bzw. D (Ton), höchstens 2 Umsetzer je Runde (Änderungen im selben Block an denselben Agenten); Gesamt-Render | Bau-Agenten | neuer Render |
| 6 | **Neu messen**: Schritte 1 und 2 auf dem neuen Render; der Hauptlauf prüft die umgesetzten Befunde selbst am Kontaktbogen nach („behoben / nicht behoben / neuer Fehler“), ein Kritiker nur bei Widerspruch | Hauptlauf | Vergleich vorher/nachher |
| 7 | **Besser?** (Regel unten). Ja: neue Basis, nächste Runde. Nein: beste Version zurückholen (aus `versionen/`, bildgleich gegen ihren Render prüfen), Änderung im Manifest als „verworfen“ mit Grund | Hauptlauf | Basis für die nächste Runde |

**Die sechs Linsen** (Katalog-Gruppen in Klammern). Gebündelt bei „voll“: **A** Message/Klarheit + Überladung, **B** Typo + Bewegung/Übergänge, **C** Ton + Marke/Wahrheit; bei „spar“ alle sechs in einem Kritiker:

| Linse | prüft | Katalog |
|---|---|---|
| Message/Klarheit | Versteht ein Fremder je Beat, was die Funktion tut? Lesezeit, Lesezone, Störungen beim Lesen | M, L |
| Überladung | Zu viel im Bild **und** zu wenig: Chips, Zweittexte, leere Flächen, Platzhalter, Bildfüllung gegen Vorbild | U, P |
| Typo | Stufen, Verlauf, Größe, Lesetext ≥ 32 px, Ausstiege, Akzent | T |
| Bewegung/Übergänge | Stand, Drift, Schnitte, Match-Cuts, Unschärfe, Duplikate, Einstellungslänge | B |
| Ton | Musik-Nähte, Löcher, Schleifen, Ende, Effekte auf dem Bild, Hörbarkeit | S |
| Marke/Wahrheit | Belege, Fremdlogos, Absender, Länge, Endkarte, Aufforderung, Version besser als die beste? | W, A |

**Schwere** wie im Katalog: hoch (fällt beim ersten Ansehen auf, ⚑-Einwand), mittel (wirkt billiger als die Maßstab-Szene), niedrig (Feinschliff).

## 4. Regeln der Synthese
1. **Höchstens 3 Änderungen je Runde.** Befunde zum **selben Moment** (Zeitfenster überlappen) werden zu einer Änderung gebündelt, auch über Linsen hinweg (Bild und Ton an derselben Naht sind eine Änderung). Dieselbe Ursache an **verschiedenen Stellen** bleibt je Stelle eine eigene Änderung; die gemeinsame Ursache steht als Hinweis dabei. Rang nach **Wirkung vor Aufwand**: Wirkung = höchste Schwere im Bündel (hoch 3, mittel 2, niedrig 1) × Sichtbarkeit (Dauer des Bündels in s, mindestens 1; Filmanfang und letzte 5 s doppelt) × Anzahl der Kritiker, die den Moment nennen. Bei Gleichstand zuerst das Bündel mit mehr Befunden „hoch“, dann der kleinere Aufwand (S/M/L).
2. **Nie neue Features, nie neue Aussagen, nie neue Szenen.** Die Schleife verbessert, was im freigegebenen Blueprint steht. Lieber weglassen, kürzen, vergrößern, füllen mit vorhandenem echtem Inhalt.
3. **Nur Fixes, die gewirkt haben.** Jede Änderung trägt eine Katalog-ID; ihr Fix ist der „Gewirkt“-Weg des Eintrags oder dessen direkte Anwendung. Ein „Nicht gewirkt“-Weg ist ausgeschlossen (zum Beispiel Zeitlupe gegen Lesezeit, Verdichten gegen fehlende Funktionen, gestückelte Hits gegen ein schwaches Ende).
4. **Nicht gegen den Nutzer.** Entscheidungen aus G1/G2/G4 (Länge, Wortlaut, Maßstab, vom Nutzer gesetzte Sperrzonen) bleiben; Sperrzonen, die der Hauptlauf selbst gesetzt hat, schützt Regel 7. Widerspricht ein Befund einer Nutzer-Entscheidung, geht er als Frage in die geführte Abnahme, nicht in den Bau (Beispiel: Länge über Brief, die der Nutzer freigegeben hat).
5. **Keine Kosten ohne Gate.** Ein Fix, der Generierung braucht (neue Musik, neues Bild), wird nicht gebaut, sondern als Gate-Frage vorbereitet.
6. **Gegenprobe vor der Wahl:** jeden Befund „hoch“ und jeden Widerspruch zwischen Kritikern selbst prüfen (Kachel ansehen, Messung wiederholen), wie in Vorlage F. Leere (P04) immer gegen die Vorbild-Kachel derselben Zeit: Ist das Vorbild dort genauso schlicht, höchstens „mittel“. Hörtest-Befunde des Ersatzmodells nur mit Gegenprobe (Lautheitshülle Film gegen Quelle) werten.
7. **Maßstab-Szene schützen:** keine Änderung, die sie berührt, außer der Befund liegt in ihr selbst und ist „hoch“.

**Besser-Regel (Schritt 7):** Die neue Fassung ist besser, wenn (a) kein ★-Kriterium neu rot ist, (b) jeder umgesetzte Befund laut Nachprüfung behoben ist oder um mindestens eine Schwerestufe sinkt, (c) kein neuer Befund „hoch“ entsteht und (d) die Befund-Punkte (Summe der Schwere aller Befunde, gleiche Kritiker-Linsen) sinken. Sonst zurück auf die beste Version; eine verworfene Änderung wird in derselben Form nicht noch einmal versucht.

## 5. Was der Nutzer sieht
Nach der letzten internen Runde geht die Fassung mit `templates/auslieferung.vorlage.md` raus, ergänzt um:
- eine Zeile „Interne Regie-Runden: K, behoben: …, offen: …“ (aus den `REGIE.md`),
- die **geführte Abnahme** nach `templates/abnahme-fragen.md` statt „passt es?“: fünf konkrete Fragen mit Zeitstempel und Bildausschnitt, Antwortraster, das sich direkt in Änderungen übersetzt.

Sagt der Nutzer nur „passt“ oder „sieht gut aus“, ist der Film abgenommen; die Schleife hat vorher dafür gesorgt, dass „passt“ auf Premium-Niveau fällt.

## 6. Kosten und Zeit je Runde

Gemessen im Beweistest (Lauf C, 41,4-s-Film, alte Regel mit sechs Kritikern, Opus, Kosten laut Client): je Runde 10 bis 14 $, davon Kritiker zusammen ca. 5,6 $ (0,4 bis 1,7 $ je Kritiker), Umsetzer ca. 4 $ (2 bis 3 Agenten, je 0,5 bis 2,6 $), Hauptlauf 1,2 bis 3,3 $ (Messen, Bögen, Synthese, Nachprüfung). Planwerte mit den neuen Deckeln:

| Schritt | Zeit | voll (Plan) | spar (Plan) |
|---|---|---|---|
| 1, 2 Messen, Hörtest, Kontaktbögen | 3 bis 6 min | im Hauptlauf | im Hauptlauf |
| 3 Kritiker (Deckel: höchstens 12 Bilder je Linse, Bögen 360 px breit, nur eigene Katalog-Gruppen ganz lesen) | 4 bis 8 min | 3 × ca. 1,2 $ | 1 × ca. 1,5 $ |
| 4 Synthese im Hauptlauf | 3 bis 6 min | ca. 0,5 $ | ca. 0,5 $ |
| 5 Umsetzen, höchstens 2 Agenten (Deckel aus Vorlage B) + Gesamt-Render | 10 bis 20 min | ca. 2,5 $ | ca. 1,5 $ |
| 6 Nachprüfen im Hauptlauf | 2 bis 4 min | ca. 0,5 $ | ca. 0,5 $ |
| **Runde** | **ca. 20 bis 40 min** | **ca. 7 $** | **ca. 4 $** |
| Prüfrunde nach dem Ton (nur voll, ohne Umsetzen außer „hoch“) | 10 bis 15 min | ca. 2 $ | entfällt |
| **Regie gesamt** | | **ca. 16 $ (2 Runden + Prüfrunde)** | **ca. 4 $** |

Je Runde im Manifest-Abschnitt „Modellkosten je Phase“ eine Zeile „Regie rK“ in $ (Wert laut Client, sonst „ca.“ nach den Stückkosten in `00-navigator.md` „Kosten und Budget“); nie nur Tokens. Weiter sparen ohne Qualitätsverlust: Kritiker mit einem kleineren, bildfähigen Modell laufen lassen (Synthese und Umsetzen nicht). Den Katalog nicht kürzen, er ist die Messlatte.

## 7. Ablage
```
<lauf>/regie/r1/  qualitaet/  vergleich/  film-kontakt.jpg  vorbild-kontakt.jpg  hoertest-*.md
                  kritik-a.json  kritik-b.json  kritik-c.json      (voll: A Message+Überladung, B Typo+Bewegung, C Ton+Marke)
                  kritik-alle.json                                 (spar)
                  synthese.json  REGIE.md  nachpruefung.json
<lauf>/regie/r2/  …
<lauf>/regie/pruefung/  (nur voll: Prüfrunde nach dem Ton, gleiche Dateien, REGIE.md mit „Prüfrunde“)
```
Im Manifest je Runde eine Zeile in „Versionen“ (Basis, Änderungen, Sicherung, Render, Befund-Punkte vorher/nachher, Urteil besser/verworfen).

<!-- Warum: Zwei Praxistests (09.10.2026) bestanden die Rubrik und blieben trotzdem sichtbar leerer als ihr Vorbild; die Nutzer sagten „Sieht gut aus, weiter“ bzw. „Bild sieht gut aus“, also kam keine Kritik, die den Film gehoben hätte. Im Ursprungslauf hat genau diese Kritik (elf Runden) den Unterschied gemacht. -->
<!-- Warum höchstens 3 Änderungen und Besser-Regel: Im Ursprungslauf stapelten Revisionen 7 bis 10 Änderungen, bis eine ältere Fassung die beste war; Fixes ohne Nachmessung lösten den nächsten Einwand aus (Zeitlupe, Verdichten, gestückelte Hits). -->
<!-- Warum keine neuen Features: Der Einwand „überladen“ entstand, als Funktionen zu einem fertigen Film dazukamen; eine Schleife, die „verbessert“, indem sie hinzufügt, wiederholt diesen Fehler. -->
