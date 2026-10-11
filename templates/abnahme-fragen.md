# Geführte Abnahme (Vorlage, Teil der Auslieferung ab v1)

Statt „Passt es?“ bekommt der Nutzer fünf konkrete Fragen, je mit Zeitstempel und einem Bildausschnitt. Wer nichts über Motion-Design weiß, kann so trotzdem genau sagen, was ihn stört, und jede Antwort übersetzt sich direkt in eine Änderung aus dem Einwand-Katalog (`references/11-einwand-katalog.md`). Die Fragen kommen aus der letzten Regie-Runde (`references/10-regie-schleife.md`): Wo die Kritiker am meisten zu sagen hatten oder wo eine Nutzer-Entscheidung berührt ist, wird gefragt.

## So wählt Claude die fünf Fragen
1. **Je eine Frage aus fünf verschiedenen Gruppen**, in dieser Reihenfolge, solange es dort etwas zu fragen gibt: Message (M/L), Dichte (U/P), Bewegung (B), Ton (S), Schluss (A/W, meist Endkarte und Länge). Typo (T) ersetzt eine davon, wenn ein Typo-Befund offen ist.
2. **Gefragt wird an der unsichersten Stelle**: Befunde aus `synthese.json` unter `fragen_an_nutzer` zuerst, dann zurückgestellte Befunde mit Schwere „mittel“, dann die Szene, die am weitesten unter der Maßstab-Szene liegt. Gibt es nichts Offenes, fragt Claude an der Maßstab-Szene und an der schwächsten Szene („Soll diese Szene so gut werden wie jene?“).
3. **Einfache Sprache**: kein Fachwort ohne Erklärung, keine Messwerte in der Frage (die stehen in der QA-Tabelle), ein Satz je Frage.
4. **Bildausschnitt** je Frage: vier Bilder rund um den Zeitstempel als Streifen. Befehl (unter der Sperre):
   `bash <skill-dir>/scripts/sperre.sh <lauf> -- ffmpeg -loglevel error -y -i renders/<film>_web.mp4 -vf "select='between(t,<von>,<bis>)',fps=4,scale=480:-1,tile=4x1" -frames:v 1 regie/abnahme/f<N>.jpg`
   (`<von>` bis `<bis>` = 1 s um den Zeitstempel). Den Streifen im Chat zeigen oder als Pfad nennen.

## Antwortraster (gilt für jede Frage)
Der Nutzer antwortet je Frage mit einem Wort aus dem Raster, gern mit eigenem Satz dazu. Claude übersetzt so:

| Antwort | bedeutet | Änderung (Katalog) |
|---|---|---|
| **passt** | nichts ändern | keine; Stelle wird Sperrzone für weitere Runden |
| **zu viel** | zu viele Dinge gleichzeitig | weglassen, was die Aussage nicht beweist; eine Aussage, eine Pille (U01, U02) |
| **zu leer** | wirkt dünn, viel leere Fläche | Hauptelement größer oder näher, vorhandenen echten Inhalt ins Bild (P04, P05) |
| **zu schnell** | kann nicht mitlesen oder folgen | Haltezeit mit laufender Kamera, Störung beim Lesen entfernen; nie Zeitlupe (L01, L03) |
| **zu langsam** | zieht sich, Stillstand | Halt kürzen, Einstellung kürzer schneiden, Endkarte ≤ 2 Takte (B02, B07, A02) |
| **wirkt billig** | nicht hochwertig | auf das Niveau der Maßstab-Szene heben: Typo-Stufe mit Verlauf, Material, Drift (M06, T01, M05) |
| **unklar** | verstehe nicht, was gezeigt wird | Szene vom Nutzen her neu ordnen: Ursache, Wirkung, Ergebnis sichtbar (M02, M03, M04) |
| **klingt komisch** | Musik springt, Ton passt nicht | Naht auf eine Takt-Eins, Take in Originalreihenfolge, Effekt aufs Ereignis (S08, S06, S07) |
| **stimmt nicht** | falsche Aussage, Zahl, Logo | belegen oder streichen (W01, W02, W06) |
| **zurück zu Version X** | eine frühere Fassung war besser | Version X aus `versionen/` als Basis zurückholen, bildgleich prüfen, nur Genanntes übertragen (A01) |

**Höchstens 3 Änderungen je Runde.** Nennt der Nutzer mehr, fragt Claude einmal: „Welche drei zuerst? Empfohlen: <die drei mit der größten Wirkung>, weil …“. Der Rest steht im Manifest für die nächste Runde.

## Vorlage (ausfüllen, nicht umformulieren)

```
Fünf kurze Fragen, damit die nächste Fassung genau trifft. Antworte je Frage mit einem Wort aus der Liste unten (oder mit eigenen Worten). Wenn alles passt, reicht „passt“.

1. Message · <Zeitstempel> · <Bildstreifen>
   Versteht man bei <Szene, in Alltagsworten>, was <Produkt> hier für dich tut?
2. Dichte · <Zeitstempel> · <Bildstreifen>
   Ist bei <Szene> zu viel oder zu wenig im Bild, verglichen mit <Maßstab-Szene, Zeit>?
3. Bewegung · <Zeitstempel> · <Bildstreifen>
   Fühlt sich der Übergang von <Szene A> zu <Szene B> flüssig an?
4. Ton · <Zeitstempel>
   Hör bei <Zeitstempel> genau hin: Läuft die Musik natürlich weiter, oder springt sie?
5. Schluss · <Zeitstempel> · <Bildstreifen>
   Ist das Ende so richtig: Länge der Endkarte <s>, Aufforderung „<Text>“, ganzer Film <s> (besprochen: <Brief>)?

Antworten: passt · zu viel · zu leer · zu schnell · zu langsam · wirkt billig · unklar · klingt komisch · stimmt nicht · zurück zu Version X
Bisherige Versionen: <v1: …, v2: …> (beste bisher: <vN>). Je Runde setze ich höchstens drei Änderungen um.
```

## Beispiel (Trockentest 09.10.2026, 30,8-s-Produktfilm, Code-only, Fragen nach Regie-Runde 1)

Runde 1 hat drei Änderungen gewählt (Bruch in die Warn-Szene bei 18,2 s, Drag-and-drop zu klein, Endkarte und Länge). Gefragt wird danach an den zwei Fragen der Synthese und an den stärksten zurückgestellten Befunden:

```
1. Message · 7,4 bis 10,3 s · Streifen 8,0 bis 9,5 s
   Bei „Verfügbarkeiten per Link sammeln“: Sieht man, dass ein Link verschickt wird und die Antworten zurückkommen?
2. Dichte · 13,7 bis 14,9 s · Streifen
   Ist bei der Tauschanfrage zu wenig im Bild, verglichen mit dem Wochenplan bei 17,5 s?
3. Bewegung · 14,1 s · Streifen 13,9 bis 14,4 s
   Sieht man den einen Klick auf „Bestätigen“, oder geht er in der Fahrt unter?
4. Ton · 18,2 bis 21,5 s
   Unter „Unter 11 h Ruhe? Die App warnt.“ wird die Musik 3 Sekunden lang ganz leise. Gewollte Ruhe oder zu leer?
5. Schluss · 21,5 bis 25,9 s
   Der letzte Teil ist leiser als die Mitte, und die Wortmarke am Ende landet ohne hörbaren Schlag. Soll das Ende mehr Wumms haben?
```

Übersetzung, falls der Nutzer „unklar“ (1), „passt“ (2), „zu schnell“ (3), „zu leer“ (4), „wirkt billig“ (5) sagt: M02 (Link-Chip groß, danach leuchten die Verfügbarkeiten in der Team-Spalte auf), M03 + L03 (Karte steht erst ruhig, dann Klick, Aussage danach), S03 (nur 1 Takt Ruhe, Hallwaschung als Bett) und S08 (Sub-Akzent auf die Wortmarke, Bett davor ducken). Das sind vier Änderungen: Claude fragt einmal, welche drei zuerst (Empfehlung M02, S03, M03: zwei davon betreffen Message, eine den Ton der Kernaussage), die vierte steht im Manifest für die nächste Runde. Frage 2 mit „passt“ wird Sperrzone.

<!-- Warum: In beiden Praxistests sagten die Nutzer „Sieht gut aus, weiter“ bzw. „Bild sieht gut aus“, obwohl der Film leere Momente, eine 6-s-Endkarte und Musiksprünge hatte. Eine offene Frage „Passt es?“ holt von Laien keine verwertbare Kritik; konkrete Fragen mit Bild und festem Antwortraster schon, und jede Antwort führt auf einen Katalog-Fix, der im Ursprungslauf gewirkt hat. -->
