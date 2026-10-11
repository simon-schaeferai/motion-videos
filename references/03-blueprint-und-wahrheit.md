# Blueprint und Wahrheit (G2 = Station 4 Vorschlag)

Der Blueprint übersetzt jeden Beat der Referenz in eine eigene Szene, ohne die Mechanik zu verändern.

## Format (`BLUEPRINT.md` im Lauf-Ordner)
| # | Zeit (s) | Referenz | Bildwelt | eigene Szene (nur das Sichtbare) | Aussage (≤ 6 Wörter, wörtlich) | Wörter | Lesezeit Soll/Ist | Fassung | Beleg |
|---|---|---|---|---|---|---|---|---|---|
Beleg-Spalte: **✓ belegt** (Quelle nennen: App-UI, MCP-Werkzeugkatalog, Website, Nutzer) · **? bestätigen** (wird in G2 gefragt). Fassung-Spalte: **kurz+lang** oder **nur lang** (Kapitel der Langfassung). Bildwelt-Spalte wie im Vorschlag; im Code als Ereignis `bildwelt` mit `art` am Szenenanfang (`qualitaet.py --fuellung` prüft den Anteil „kachel“). Lesezeit-Soll nach der Formel unten, Ist aus der Ereignisliste (`lesbarAb` bis `ausstiegAb`).
Danach Abschnitte „Gestaltung“ (Marke, Akzentfarbe, Typo-System, was aus der Referenz bewusst wegfällt, z. B. eine Pixelschrift) und „Footage über Generierung“ (Liste, Formate, Kosten grob).

<!-- Warum Spalten Aussage/Wörter/Lesezeit/Fassung: Ohne sie wurden übersetzte Aussagen in zu kurze Einstellungen gesetzt und zusätzliche Features als Zweittext in die Kurzfassung gestapelt. -->

## Regeln
- **Ein Feature pro Beat.** Jeder Beat trägt genau eine Aussage (höchstens 6 Wörter) und höchstens eine ruhige Stützzeile. Keine Chips, Tags, Infokarten, Zweitbeschriftungen oder Mini-Labels. Die UI zeigt nur, was die Aussage beweist; alles andere ist leer oder unscharf. Will der Nutzer mehr Funktionen zeigen, bekommen sie eigene Beats oder ein Kapitel in einer Langfassung, nie Zweittext in bestehenden Szenen. Prüfung: Ein-Blick-Test (je Beat ein Standbild im Moment „voll lesbar“, siehe `07-qa.md`).
- **Nur echte Funktionen.** Gibt es etwas nicht, Szene umdeuten auf eine echte Funktion mit gleicher Mechanik (Beispiele aus einem echten Lauf: Messenger-Chat → Chat im Agenten-Client, „Skills entwickeln sich“ → Prompt-Versionen, Podcast-Clips → Übersetzungs-Karten).
- **Erzähl-Logik prüfen.** Reihenfolge muss stimmen (Fehler aus einem echten Lauf: Kundenfreigabe vor der Erstellung des Inhalts war unlogisch → zurück zur Referenz-Reihenfolge).
- **Ehrlichen Weg zeigen.** Läuft das Produkt über einen Agenten/Connector (z. B. Claude + MCP), dann genau so zeigen; das passt oft schon zur Referenz (Modellname im Eingabefeld).
- **Avatar/Figur → Marken-Icon** als Code-Animation, spart Generierung und bleibt markentreu.
- **Echte Logos.** Integrations-Logos als SVG aus ihren Originalformen und -farben nachbauen und Form für Form aufbauen lassen; nie generieren, nie verfremden.
- **Zeichen statt Kürzel.** Sprachen, Länder, Kanäle mit eindeutigem Zeichen (Flagge als Inline-SVG, echtes Logo) statt nur Kürzel; dasselbe Zeichen in allen Szenen, die es zeigen.
- **Keine Platzhalter, keine leeren Icons.** Kein Lade- oder Leerzustand > 0,4 s, nie dunkel, immer mit echtem Inhalt am Ende; keine „+N“-Zähler, keine stehenden Skelettzeilen; Karten so hoch wie ihr Inhalt. Reduzieren heißt weniger Elemente, nicht leere: Jede Grafik trägt echte, belegte Daten (Label, Wert, Bild). Ein Icon ohne Beschriftung ist kein Beleg.
- **Platzhalter in echten Kunden-Assets** (`[CODE]`, `[Y] %`, `[UHRZEIT]` …) im Film mit plausiblen Demo-Werten im Original-Stil überdecken und im Manifest als „vom Kunden zu bestätigen“ listen.
- **Datumsangaben** nur, wo belegt; Wochentage gegen den Kalender prüfen.
- **Revisionen** unten anhängen („Revision N“, Datum, Grund, Basis-Version), nie alte Fassung löschen. Je Revision höchstens drei Änderungen; die Basis ist die beste bisherige Version, nicht automatisch die letzte (SKILL.md Grundsatz 8).

<!-- Warum ein Feature pro Beat: Auftrag „Features bestmöglich verpacken“ führte in Revision 5 zu Chips, Tags, Infokarten und Kindzeilen. Nutzer: „überladen, die Message verwaschen, Sachen draufgeklatscht. Es soll minimalistisch und hochwertig sein, jedes Feature soll die Aufmerksamkeit bekommen, die es verdient.“ Die zurückgebaute Revision 6 wurde am Ende die Basis des abgenommenen Films. -->
<!-- Warum echte Logos: Ein aus seinen Originalformen aufgebautes Logo wirkte, ein statisches Logo am Ende wurde abgelehnt. -->
<!-- Warum Zeichen statt Kürzel: Nutzer zu den Sprach-Szenen: „Bei den Sprachen Flaggen davor.“ -->
<!-- Warum keine Platzhalter: „es wirkt, als gäbe es unbefüllte Platzhalter“; eine spätere Revision ersetzte Inhalte durch Glyphen (Ring statt Mindmap, Statuspillen ohne Inhalt) und verlor Tiefe. -->
<!-- Warum höchstens drei Änderungen: Große Revisionen mit vielen gleichzeitigen Änderungen machten unklar, welche Änderung den Film verschlechtert hatte. -->

## Lesefluss
- **Lesezeit:** Jede Aussage ist voll lesbar mindestens max(1,2 s; 0,4 s + 0,25 s je Wort), von „letztes Wort voll da“ bis zum Beginn des Ausstiegs. Im Blueprint je Aussage Soll und Ist eintragen.
- **Eine Lesezone:** Aussagen über einer Grafik stehen immer an derselben Stelle (Standard oben mittig, Grundlinie ca. 14 % der Bildhöhe), die Grafik wird darunter komponiert. Aussagen ohne Grafik stehen groß und mittig (Hit-Stufe). Das Auge sucht nie.
- **Nie über UI:** Eine Aussage liegt nie über UI-Inhalt, Karten oder Bildern. Ist kein freier Platz, wird die Grafik verkleinert oder verschoben, nicht der Text darübergelegt.
- **Ruhe beim Lesen:** Solange eine Aussage gelesen wird, kein Punch-in, kein Klick, kein neues Element in der Lesezone. Ein Zweitelement darf frühestens 0,8 s nach „voll lesbar“ außerhalb der Lesezone eintreten.
- **Keine Zeitlupe als Lesezeit:** Lesezeit entsteht als Haltezeit dort, wo die Szenenlogik ruht (Aufbau fertig, kein Whip-Anlauf), in ganzen Zählzeiten und ganzen Frames. Kamera, Glanzlauf, Pulse und Unschärfe laufen in neuer Zeit weiter (Zoom 2 bis 4 %/s über Grafik, 3 bis 10 %/s bei Aussagen ohne Grafik). Nie die Zeit einer laufenden Animation dehnen (keine Zeitverzerrung, keine `warp`-Funktion mit Steigung < 1).
- **Übersetzte Texte sind länger:** Reicht die Einstellung der Referenz nicht, wird der Film in ganzen Takten länger (Freigabe in G1), statt den Text zu beschleunigen.

<!-- Warum Lesefluss: Revision 8 mit neuen deutschen Aussagen, Nutzer: „Texte zu schnell.“ Analyse: 8 von 13 Aussagen unter der Lesezeit, Aussagen mal oben, mal unten, in drei Größen, gleichzeitig Punch-ins und Klicks. -->
<!-- Warum keine Zeitlupe: Revision 9 löste die Lesezeit per Zeitverzerrung (Steigung 0,2 in Lesefenstern). Messung: in 5 von 8 Fenstern Standbild 0,43 bis 1,90 s (zusammen 6,5 s), Ruck an den Kanten bis Faktor 12,9, gedehnte Glanzläufe; Nutzer: „wirkt nicht mehr smooth“. -->

## Gestaltung
- **Bildwelt je Szene, nie Kachel als Standard:** Zeigt das Vorbild Foto, Mensch oder Gerät, bekommt die Szene eine echte Ersatz-Bildwelt: Desktop-Fenster mit dem echten Screen (eigene Screens, sonst die öffentliche Demo), Handy mit dem Screen, Produktfoto des Nutzers, Bild von der Website, Live-Daten in Bewegung. Bildwelten wechseln über den Film (hell, dunkel, Fenster, Handy, Foto), wie im Vorbild. „Kachel auf leerem Grund“ höchstens in einem Drittel der Szenen; nur dort, wo das Vorbild selbst eine Kachel zeigt, mehr („Kachel (wie Vorbild)“).
- **Typo-System vor dem Bau:** Stufen H (Aussage ohne Grafik, Hit, Endkarte), Z (Lesezone über Grafik), S (Stützzeile), L (Labels in Grafiken), UI (wie das Produkt, nie Verlauf). Größen aus der gemessenen Versalhöhe der Referenz, Pflichtwerte und Material in `09-qualitaets-dna.md`. Wird in der Probe festgelegt und vom Nutzer als Maßstab abgenommen.

<!-- Warum Bildwelt: Im Beweistest (Analytics-Produkt, 11.10.2026) ersetzte der Film Fotos, Menschen und Geräte des Vorbilds durch Kacheln: 8 von 11 Szenen „weiße Fläche, Kachel, Headline“; beim Vergleich mit dem abgenommenen Ursprungsfilm lag dieser bei Bildfüllung und Dichte klar vorn, obwohl alle Messwerte grün waren. -->
<!-- Warum: Aussagen in einem Text-Schnitt mit 64 px und flacher Tinte hatten 4,4 % Versalhöhe gegen 11 bis 12 % in der Referenz. Nutzer: Eine Szene „sieht richtig hochwertig aus. Die anderen Textplatzierungen nicht.“ Erst das Typo-System mit Schrift-Verlauf wurde angenommen. -->

## G2-Präsentation im Chat (Vorschlag)
Der Nutzer sieht den Vorschlag nach `templates/vorschlag.vorlage.md` (`<lauf>/VORSCHLAG.md`): Szenen-Tabelle (Vorbild-Beat → Funktion mit Beleg → Aussage → Bildwelt → Bildidee), 2 bis 4 Standbilder aus echtem Material in seiner Marke (`scripts/standbilder.mjs`), Gestaltung, Ton, Länge, Annahmen mit Empfehlung, was generiert wird, welche Beats nur in die Langfassung gehen, nummerierte offene Fakten (max. 7), Kosten in $ je Stufe mit Wahl der Regie-Schleife (`navi kosten`) und dem Satz zum Wochenlimit. Dann EIN Go (`navi go "…"`). Nach dem Go wird daraus der vollständige `BLUEPRINT.md` im Format oben (Zeit, Lesezeit Soll, Fassung); erst danach Prompts und Bau.
