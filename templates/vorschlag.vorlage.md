<!-- Vorschlag (Station 4): der Film, bevor gebaut wird. Nach <lauf>/VORSCHLAG.md kopieren, alle <…> ersetzen, im Chat
     zeigen (Szenen-Tabelle, Standbilder, Annahmen, offene Fakten, Kosten), dann auf EIN ausdrückliches Go warten und es mit
     `node <skill-dir>/scripts/navi.mjs go "<Wortlaut>"` festhalten. Kommentare wie dieser bleiben stehen, sie stören nicht.
     Prüfung (navi pruefen): keine <…> mehr, mindestens 2 Szenen, jede Aussage ≤ 6 Wörter, jede Szene mit Beleg und
     Bildwelt, höchstens ein Drittel „Kachel“, 2 bis 4 Standbilder in vorschlag/standbilder/, Budget gesetzt, Go festgehalten.
     Warum ein Vorschlag statt vieler Fragen: Im Praxistest kostete die Fragerunde vor dem Bau Runden, ohne dass der Nutzer
     etwas sah; ein Film-Vorschlag mit Bildern und Empfehlungen lässt sich mit einem Satz korrigieren. -->

# Vorschlag: <Titel des Films>

<Datum> · Lauf `<lauf>` · Vorbild: <Link oder Datei, Länge> · Produkt: <URL>

**In einem Satz:** <Wer sieht was, und was soll danach passieren. Beispiel: „Teams sehen in 25 s, wie Nordlicht Notes Ideen sortiert, und fragen eine Demo an.“>

## Szenen

<!-- Eine Zeile je Beat des Vorbilds. Funktion nur mit Beleg: Zitat + Quelle aus produkt/funktionen.json (status belegt
     oder nutzer). Unbelegtes mit „? offen“ in der Beleg-Spalte und unten unter „Offene Fakten“ fragen, nie erfinden.
     Aussage: höchstens 6 Wörter, eine je Szene, wörtlich wie im Film (Lesezeit entsteht später als Haltezeit).
     Bildwelt: eine von Fenster (Desktop-Fenster mit echtem Screen), Handy, Gerät, Produktfoto (vom Nutzer), Foto,
     Website (Bild von der Seite), Live-Daten (Demo), Aussage, Logo, Kachel. Zeigt das Vorbild Foto, Mensch oder Gerät, steht
     hier eine echte Ersatz-Bildwelt, keine Kachel. „Kachel“ höchstens in einem Drittel der Szenen; zeigt das Vorbild dort
     selbst eine Kachel: „Kachel (wie Vorbild)“. Warum: im Beweistest 8 von 11 Szenen „Kachel auf Weiß“, der Film wirkte
     monoton und ärmer als das Vorbild.
     Bildidee: nur was man sieht, aus echtem Material (assets/screens, produkt/screens/demo-*, produkt/screens), keine Chips
     oder Zweittexte. -->

| # | Vorbild-Beat (Zeit) | Funktion | Beleg (Zitat + Quelle) | Aussage (≤ 6 Wörter) | Bildwelt | Bildidee |
|---|---|---|---|---|---|---|
| 1 | <0,0 bis 2,4 s: Titel fährt ins Bild> | <Funktion> | „<Zitat>“ (<URL oder Nutzer, Datum>) | <Aussage> | <Fenster> | <was man sieht> |
| 2 | <…> | <…> | <…> | <…> | <…> | <…> |

Nicht im Film (bewusst weggelassen, ein Feature pro Beat): <Funktionen, die in eine Langfassung oder gar nicht gehen>

## Standbilder

<!-- 2 bis 4 Bilder: node <skill-dir>/scripts/standbilder.mjs <lauf>. Es nimmt das echte Material (eigene Screens, sonst
     die öffentliche Demo, sonst die Website) in deiner Marke: Desktop-Fenster, Nahaufnahme, Handy, Aussage mit Logo. Vorher
     selbst ansehen (vorschlag/standbilder/uebersicht.jpg). Steht in standbilder.json "quelle": "demo", gab es kein Material:
     dann sagen, dass die Oberfläche noch fehlt. Ohne Vorbild: zusätzlich 2 bis 3 Stil-Richtungen. -->

So sieht dein Film aus (echte Screens <deines Produkts | der öffentlichen Demo>, deine Farben und Schrift):
- `vorschlag/standbilder/01_<…>.png`: <Aussage 1>
- `vorschlag/standbilder/02_<…>.png`: <Aussage 2>

## Marke

- Farben: Hintergrund <hex>, Tinte <hex>, Akzent <hex> (aus `produkt/marke.json`, Quelle <URL oder Brand-Datei>)
- Schrift: <Familie> (<Datei mit Lizenz | Ersatz Inter, bis die Markenschrift als Datei kommt>)
- Logo: <Datei> · Absender: <wessen Marke trägt der Film>

## Ton

- Musik: <eigene Datei mit BPM | Generator (Anbieter, Modell) | keine> · Stil wie das Vorbild: <BPM, Charakter aus analyse/ton-referenz.md>
- Effekte: <Bibliothek | Generator | im Code synthetisiert (Empfohlen ohne Generator, kostenlos, schlichter)>

## Länge, Format, Fassungen

- Länge: <x s> (Vorbild <y s>; wächst nur in ganzen Takten, ± 10 %) · Format: <16:9> · Sprache: <Deutsch>
- Fassungen: <nur Kurzfassung (Social) | Kurz + Lang> · Aufforderung je Fassung (genau eine): <Text, Band oder Endkarte>

## Annahmen (Empfohlen, mit einem Satz änderbar)

<!-- Alles aus references/01-referenz-gate.md §1, was der Auftrag nicht beantwortet hat: Empfehlung + Warum. -->

| Frage | Empfehlung | Warum |
|---|---|---|
| Ziel | <Mechanik des Vorbilds, eigener Inhalt> | <ein Satz> |
| Demo-Inhalt | <fiktive Demo-Daten im Stil deines Produkts> | <keine Freigabe nötig> |
| Probe abwarten? | <nein, ich baue nach dem Go durch und zeige die Probe nur als Zwischenstand> | <ein Satz> |

## Regie-Schleife (Qualitätsrunden, bevor du den Film siehst)

<!-- Zahlen aus `node <skill-dir>/scripts/navi.mjs kosten --laenge <s>` übernehmen (Planwerte in $, Opus-Listenpreise),
     nie Token-Zahlen. Gewählt wird mit `navi init … --regie` bzw. `navi regie voll|spar`, das Budget nach dem Go mit
     `navi budget <usd>`. Warum: Im Beweistest standen hier „5 bis 7 Mio. Tokens“; real kostete der Lauf 95,76 $ und riss
     das Wochenlimit des Abos. -->

| Wahl | was passiert | Zeit zusätzlich | Claude-Nutzung gesamt (<x> s Film) |
|---|---|---|---|
| **voll (Empfohlen)** | 3 Kritiker mit je zwei Blickwinkeln, 2 Runden, bevor du die erste Fassung siehst, dazu 1 Prüfrunde mit Ton | ca. 1 bis 1,5 h | ca. <30 bis 40> $ |
| spar | 1 Kritiker mit allen Blickwinkeln, 1 Runde | ca. 15 bis 30 min | ca. <15 bis 20> $ |

Im Claude-Abo zählt das gegen dein Wochenlimit; ein voller Lauf kann einen großen Teil davon verbrauchen. Über die API sind es diese Beträge. Hast du diese Woche nur noch wenig Kontingent, nimm „spar“. Ich halte das Budget fest und frage nach, bevor ich darüber gehe. Empfohlen ist „voll“, weil Filme ohne Kritik in den Praxistests auf dem Stand der ersten Fassung blieben (leere Momente, lange Endkarte, Musiksprünge), obwohl alle Messwerte grün waren.

Wahl: <voll | spar>

## Offene Fakten

<!-- Nummeriert, höchstens 7, je mit Szene. Keine offenen Fakten: „keine“. -->

1. <Gibt es …? (Szene N)>

## Kosten

- Claude-Nutzung: ca. <…> bis <…> $ gesamt mit der gewählten Regie-Schleife (aus `navi kosten`, ohne Generierung); Budget: <…> $, darüber nur nach Rückfrage. Im Claude-Abo zählt das gegen dein Wochenlimit; ein voller Lauf kann einen großen Teil davon verbrauchen.
- Generierung: <keine | je Stufe: Anbieter, Modell, Umfang, Preis laut Preisabfrage; Prompts wörtlich in PROMPTS.md>

## Was nach dem Go passiert

Probe der ersten Sekunden, gemessen gegen das Vorbild → Bau mit Regie-Schleife (Kritik-Runden wie oben gewählt, beste Version bleibt Basis) → Ton → geführte Abnahme mit dir → Auslieferung. Ich frage dich erst zur Abnahme wieder, außer eine kostenpflichtige Generierung braucht ein eigenes Go, das Budget ist erreicht oder eine Messung bleibt nach den Korrektur-Runden rot.

**Schreib „Go“, oder „Go, aber …“ mit deiner Änderung in einem Satz.**
