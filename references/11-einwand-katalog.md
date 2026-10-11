# Einwand-Katalog (was ein anspruchsvoller Kunde sagt und was dagegen hilft)

Dieser Katalog sammelt jeden Einwand, den der Auftraggeber im Ursprungslauf (Produktfilm, 86 s, elf Fassungen plus Unterfassungen v1 bis v11h) gegen eine Fassung erhoben hat, dazu die Befunde aus zwei Praxistests mit fremden Nutzern und dem Beweistest C (Analytics-Produkt, nur Vorbild und Link). Er ist das Gedächtnis der Regie-Schleife (`10-regie-schleife.md`): Die Kritiker prüfen jeden Film gegen diese Einträge, bevor ein Nutzer ihn sieht, und die Synthese wählt nur Fixes, die nachweislich gewirkt haben.

**So liest man einen Eintrag:**
- **Einwand:** sinngemäß, wie ein Kunde ihn sagt (Originalwortlaut, Namen neutralisiert).
- **Erkennen:** Messgröße aus `scripts/qualitaet.py` oder eine Prüffrage, die ein Kritiker am Kontaktbogen beantworten kann.
- **Ursache:** was im Ursprungslauf dahinter steckte.
- **Gewirkt:** der Fix, nach dem der Einwand nicht wiederkam.
- **Nicht gewirkt:** was versucht wurde und den Einwand verschlimmert oder einen neuen ausgelöst hat. Diese Wege wählt die Synthese nie.

**Neutralisiert:** „das Produkt“ (das beworbene Werkzeug), „die Kundenmarke“ (die Marke, deren Material im Film zu sehen ist), „Marken-Mails“, „Versand-Tool“, „Design-Tool“, „Shop-System“, „KI-Assistent“, „Bildmodell“. Versionsangaben (v5, v9 …) beziehen sich auf den Ursprungslauf, „Praxistest A/B“ auf die Tests mit fremden Nutzern.

**Gruppen und Kritiker-Linsen** (`10-regie-schleife.md` §3):

| Gruppe | IDs | Linse |
|---|---|---|
| Message und Klarheit | M01 bis M07 | Message/Klarheit |
| Lesefluss | L01 bis L04 | Message/Klarheit |
| Überladung | U01 bis U03 | Überladung |
| Platzhalter, Leere, Material | P01 bis P07 | Überladung (Dichte in beide Richtungen) |
| Typo | T01 bis T05 | Typo |
| Bewegung und Übergänge | B01 bis B07 | Bewegung/Übergänge |
| Ton und Musik | S01 bis S08 | Ton |
| Marke und Wahrheit | W01 bis W06 | Marke/Wahrheit |
| Auslieferung und CTA | A01 bis A04 | Marke/Wahrheit |

**Schwere** (gleich für alle Kritiker): **hoch** = fällt beim ersten Ansehen auf oder war im Ursprungslauf ein Ablehnungsgrund (im Eintrag mit ⚑ markiert); **mittel** = sichtbar beim zweiten Ansehen, die Szene wirkt billiger als die Maßstab-Szene; **niedrig** = Feinschliff, nur im Einzelbild sichtbar.

---

## Message und Klarheit

**M01 ⚑ · „Da fehlen so viele Funktionen.“** (v4)
- Erkennen: Funktionsliste aus dem Blueprint gegen die Beats legen. Prüffrage: „Welche belegte Kernfunktion, die der Nutzer genannt hat, hat keinen eigenen Beat?“
- Ursache: Der Film folgte nur den Beats der Referenz; Funktionen ohne passenden Referenz-Beat fielen weg.
- Gewirkt: Jede wichtige Funktion bekommt einen eigenen Beat mit eigener Aussage (v6). Was nicht passt, geht in eine zweite, längere Fassung mit eigenem Funktionskapitel (Kurz- und Langfassung aus einem Projekt).
- Nicht gewirkt: Funktionen als Zweittext, Chips, Tags oder Kindzeilen in bestehende Szenen verdichten (v5, Folge: U01).

**M02 ⚑ · „Macht keinen Sinn.“** (Szene, die eine Funktion zeigen soll, v6)
- Erkennen: Prüffrage je Beat: „Würde ein Fremder nach dieser Szene in einem Satz sagen, was die Funktion tut?“ Und: „Gehört jedes Bildelement zur Funktion, oder stammt es nur aus der Referenz-Mechanik?“ (Beispiel: eine Tonspur-Wellenform unter E-Mails).
- Ursache: Referenz-Mechanik 1:1 übernommen, nur der Inhalt getauscht; das Bild erzählte etwas anderes als die Funktion.
- Gewirkt: Szene vom Nutzen her neu denken: zeigen, was passiert (dieselbe Mail in fünf Sprachen, ein Klick auf „Veröffentlichen“, je Sprache ein Haken). Die Mechanik der Referenz (Clips fallen, Linie zeichnet sich) bleibt als Bewegung, der Inhalt folgt der Funktion.
- Nicht gewirkt: Mechanik und Bildelemente der Referenz behalten, die nicht zur Funktion passen.

**M03 ⚑ · „Die Bewegung macht keinen Sinn.“** (v6, Varianten-Szene)
- Erkennen: Prüffrage: „Hat jede Bewegung eine Ursache im Bild (Klick, Laden, Ergebnis)?“ Unschärfe-Fahrten, Knöpfe oder Nahaufnahmen ohne Bezug zur Aussage zählen als Befund.
- Ursache: Kamerafahrten und Effekte der Referenz liefen weiter, obwohl die neue Szene etwas anderes erzählt.
- Gewirkt: Ablauf als Ursache und Wirkung: Klick, kurzes Laden, Ergebnis formt sich, Beschriftung („A“, „B“) und eine Stützzeile mit der Hypothese. Kamera ruhig mit Drift.
- Nicht gewirkt: Effekte der Referenz behalten, „weil sie hochwertig aussehen“.

**M04 ⚑ · „B hat keinen Text, man sieht den Unterschied nicht.“** (v8)
- Erkennen: Bei Vergleichen (A/B, vorher/nachher, Sprachen) im selben Bild: „Ist der Unterschied in 1 s ohne Erklärung sichtbar?“ Abgeschnittene Headlines zählen als Befund.
- Ursache: B war ein Layout-Umbau ohne sichtbare Headline, unten angeschnitten.
- Gewirkt: Ein Unterschied, groß und lesbar (Headline-Test: gleiche Mail, andere Headline in derselben Schrift), beide Varianten voll im Bild. Der Kunde nannte diese Fassung später ausdrücklich „besser“.
- Nicht gewirkt: mehrere kleine Unterschiede gleichzeitig.

**M05 ⚑ · „Wirkt nicht hochwertig, wie ein Wireframe.“** (v8, Szene „Assistent anbinden“)
- Erkennen: Prüffrage: „Sieht das wie das echte Produkt aus oder wie eine Skizze davon?“ Kleine Knöpfe (< 32 px Text), schlichte Kästen ohne Schatten, Punch-ins, die Karten anschneiden.
- Ursache: Eigene, vereinfachte Karten statt einer echten Produktoberfläche.
- Gewirkt: Ein echtes Produkt-Panel (Titel, Beschreibung, Aktion) mit Material (weiße Karte, weicher Schatten), Labels unter den Logos, verbundene Linie im Akzent.
- Nicht gewirkt: Glyphen ohne Beschriftung, Punch-ins zur Belebung.

**M06 ⚑ · „Die Szene sieht richtig hochwertig aus, die anderen nicht.“** (v9)
- Erkennen: Maßstab-Szene bestimmen (`10-regie-schleife.md` §2) und jede andere Szene daneben legen. Prüffrage: „Liegt diese Szene in Bildfüllung, Drift, Typo-Stufe oder Material sichtbar unter der Maßstab-Szene?“
- Ursache: Nur eine Szene hatte das Rezept „eine Aussage plus ein einziges klares Bild mit viel Luft“; die anderen Aussagen standen über dichter UI und wirkten wie Bildunterschriften.
- Gewirkt: Rezept der Maßstab-Szene als gemeinsame Komponente für alle Aussagen (große Icon-Kette oder ein großes UI-Element, feste Abstände), Typo-System aus der Maßstab-Szene für alle.
- Nicht gewirkt: einzelne Szenen getrennt „schöner machen“.

**M07 ⚑ · „Diese Aussagen können wir viel besser und öfter platzieren.“** (v6)
- Erkennen: Beats ohne Aussage, in denen die UI allein nicht erklärt, was passiert. Prüffrage: „Versteht man diese Szene ohne Ton und ohne Vorwissen?“
- Ursache: Nur wenige Beats trugen eine Aussage; der Rest setzte voraus, dass man das Produkt kennt.
- Gewirkt: Aussagen gezielt an die Beats, die nicht von selbst sprechen, im Stil der besten Aussage, an einer freien Bildstelle, höchstens eine je Beat.
- Nicht gewirkt: Aussagen an jedem Beat (dann U01).

## Lesefluss

**L01 ⚑ · „Die Texte sind zu schnell.“** (v8)
- Erkennen: `qualitaet.py --beats`: R2 Lesezeit je Aussage gegen max(1,2 s; 0,4 s + 0,25 s je Wort).
- Ursache: Deutsche Sätze saßen in Einstellungen der Referenz von 1 bis 1,2 s; 8 von 13 Aussagen unter Soll.
- Gewirkt: Lesezeit als Haltezeit an Stellen, an denen die Szene ruht, mit laufender Kamera (Drift); der Film wird dafür in ganzen Takten länger.
- Nicht gewirkt: Zeitlupe bzw. Zeitverzerrung im Lesefenster (v9). Sie erzeugte Standbilder (B01) und wurde als „nicht mehr smooth“ abgelehnt.
- Hinweis: Bei Hit-Folgen im Schnitt-Rhythmus hat der Kunde später eine schnelle Fassung abgenommen. Ob R2 dort gelockert wird, entscheidet der Nutzer; bis dahin gilt die Regel.
- Sonderfall „Die Aussage kommt zu spät und ist gleich wieder weg“ (v8, 0,7 s): Aussage tritt erst in den letzten 30 % einer Einstellung ein, während daneben noch Inhalt durchläuft. Gewirkt: Bild zuerst aufbauen, dann Aussage, dann Halt. Nicht gewirkt: die Aussage nur früher über laufenden Inhalt legen.

**L02 · „Ich muss die Texte jedes Mal suchen.“** (Analyse zu v8)
- Erkennen: Ein-Blick-Bogen: Grundlinie der Aussagen schwankt (Soll ± 8 px), Größen springen (z. B. 60, 64, 96 px), mal oben, mal unten.
- Ursache: Jeder Block setzte Aussagen frei.
- Gewirkt: Eine feste Lesezone (oben) für Aussagen über Grafik, Stufe H mittig für Aussagen ohne Grafik; ein Raster für Abstand Text zu Grafik.
- Nicht gewirkt: Aussage je Szene dorthin setzen, wo gerade Platz ist.

**L03 ⚑ · „Während ich lese, passiert schon was anderes.“** (v8)
- Erkennen: `qualitaet.py --beats`: R3 Ereignisse (Klick, Punch-in, Push) zwischen `lesbarAb` und `ausstiegAb`.
- Ursache: Punch-ins, Pushes und Klicks liefen parallel zur Aussage.
- Gewirkt: Kein Klick, kein Punch-in, kein Kamerasprung, solange gelesen wird. Ein Zweitelement darf frühestens 0,8 s nach „voll lesbar“ außerhalb der Lesezone eintreten.
- Nicht gewirkt: die Aussage länger stehen lassen, ohne die Störung zu entfernen.

**L04 · „Der Text liegt auf der Oberfläche.“** (Regel aus v6 bis v11)
- Erkennen: Ein-Blick-Bogen: Textbox überlappt UI-Inhalt (Karte, Ecke, Knopf).
- Ursache: Aussage über volle UI-Ausschnitte gelegt.
- Gewirkt: Aussage nie über UI; UI kleiner oder versetzt, Abstand nach Raster.
- Nicht gewirkt: Schatten oder Kasten hinter den Text legen.

## Überladung

**U01 ⚑ · „Überladen, die Message verwaschen, Sachen draufgeklatscht.“** (v5)
- Erkennen: Ein-Blick-Bogen (R1): je Bild mehr als 1 Aussage + 1 Stützzeile, Chips, Tags, Infokarten, Kindzeilen, Hex-Werte, Mini-Labels, mehr als eine Status-Pille oder Bestätigung gleichzeitig (v4/v5: drei Pillen nebeneinander). Gegenfrage: „Wie viele getrennte Botschaften siehst du? Liste sie.“
- Ursache: Funktionen als Zweittexte auf bestehende Szenen gestapelt; jede Funktion wollte ihren Nachweis in derselben Szene.
- Gewirkt: Alles zurücknehmen auf die letzte minimalistische Fassung; ein Feature pro Beat, eine Aussage ≤ 6 Wörter, höchstens eine ruhige Stützzeile, eine Pille je Szene, die UI zeigt nur, was die Aussage beweist (Rest leer oder unscharf).
- Nicht gewirkt: Zweittexte verkleinern oder blasser machen; Pillen gestaffelt nacheinander einblenden.

**U02 · „Zu viele Punkte auf einmal.“** (v5: Gedächtnis-Grafik mit 10 Knoten, Menü mit 6 Einträgen)
- Erkennen: Grafik oder Menü mit mehr als 5 gleichrangigen Elementen, die alle beschriftet sind; Prüffrage: „Kann man jedes Label in der Standzeit lesen?“
- Ursache: Vollständigkeit vor Wirkung.
- Gewirkt: Auf das reduzieren, was die Aussage trägt (5 Knoten; Menü mit 3 Einträgen, einer davon wird geklickt).
- Nicht gewirkt: alle Elemente behalten und kleiner setzen.

**U03 · „Da stehen ja zwei Aufforderungen.“** (Social-Fassung mit Band und Endkarte)
- Erkennen: R12 „genau eine Aufforderung je Fassung“; Endkarte und Band ansehen.
- Ursache: Band unter dem Film angehängt, ohne die Endkarte anzupassen.
- Gewirkt: Social-Fassung: Aufforderung nur im Band, Endkarte nur Marke. Website-Fassung: kein Band, Endkarte mit Adresse.
- Nicht gewirkt: beide Aufforderungen gleich formulieren.

## Platzhalter, Leere, Material

**P01 ⚑ · „Es wirkt, als gäbe es unbefüllte Platzhalter.“** (v9)
- Erkennen: Kontaktbogen alle 0,1 s an jedem Ladeereignis: Skelettzeilen, „+N“-Zähler, dunkle Ladekacheln, Geisterkarten mit halber Deckkraft, Lade- oder Leerzustand > 0,4 s. Gegenfrage: „Wirkt irgendetwas unfertig, leer oder wie ein Platzhalter?“
- Ursache: Ladezustände der Referenz übernommen, aber nie mit echtem Inhalt gefüllt; Karten mit fester Höhe ohne Inhalt.
- Gewirkt: Laden ≤ 0,4 s über ein unscharfes echtes Bild, endet immer in echtem Inhalt; keine Zähler; Raster voll mit echten Inhalten; Karten so hoch wie ihr Inhalt.
- Nicht gewirkt: Platzhalter stehen lassen, „weil die Referenz auch lädt“.
- Sonderfall Vorlagen-Platzhalter im echten Material (v3: [CODE], [X] %): `grep` und Sichtung auf eckige Klammern, „Lorem“, „XX“. Gewirkt: Demo-Werte im Original-Stil (Schrift, Größe, Laufweite gemessen), im Manifest als „vom Kunden zu bestätigen“. Nicht gewirkt: Platzhalter unscharf machen.

**P02 ⚑ · „Die Vereinfachung hat die Tiefe genommen.“** (v10: Ring statt Mindmap, Glyphen statt Daten)
- Erkennen: `qualitaet.py --fuellung` (bewegte Fläche, Zeilen mit Inhalt) gegen die Vorfassung; Prüffrage: „Zeigt die Grafik Belege (echte Daten, Labels, Bilder) oder nur Symbole?“
- Ursache: Beim Aufräumen Belege durch Icons ersetzt, Kamera-Timing beibehalten; belegte Rasterzellen fielen von 60 auf 26 %.
- Gewirkt: Belegte Fassung zurückholen (Faktenkarten, Thumbnails, farbcodierte Knoten), nur die Typo und Bewegung angleichen.
- Nicht gewirkt: Reduzieren durch Weglassen von Inhalt (Reduzieren heißt weniger Elemente, nicht leerere Elemente).

**P03 · „Grauer Text auf grauer Pille, kaum lesbar.“** (v10)
- Erkennen: Kontrast < 4,5 : 1 in UI-Nahaufnahmen, < 3 : 1 im Übergang; Pille am Bildrand angeschnitten.
- Ursache: Statuszeile aus Grautönen der Referenz.
- Gewirkt: Weiße Karte mit Schatten, voll im Bild, Titel fast schwarz und kräftig, eine sichtbare Aktion.
- Nicht gewirkt: Grau etwas dunkler machen.

**P04 ⚑ · Leere Momente: „Das Vorbild ist viel voller.“** (Praxistest A und B)
- Erkennen: `qualitaet.py --fuellung`: leere Strecke (stehendes Bild, leeres Band > 45 % länger als 0,5 s), Median „Zeilen mit Inhalt“ < 35 %; Seite-an-Seite-Kontaktbogen mit dem Vorbild: Film sichtbar leerer.
- Ursache: Ein kleines Element (Pille, Terminal oben) auf großer Fläche; die Rubrik prüfte Fehler, nicht Dichte.
- Gewirkt: Hauptelement größer oder näher (Zoom ≥ 1,3×), Karte so hoch wie ihr Inhalt, ein zweites echtes Element aus derselben Szene ins Bild (zum Beispiel die betroffene Zeile im Plan neben der Warnung).
- Nicht gewirkt: Dekor, Muster oder Verläufe in die leere Fläche.

**P05 · „Die Karte ist zur Hälfte leer.“** (v10, Log-Karten zu 84 % leer)
- Erkennen: Karte im Kontaktbogen mit Weißraum > 50 % ihrer Höhe; „Karte startet leer“ länger als 0,4 s.
- Ursache: Kartenhöhe aus der Referenz, Inhalt gekürzt.
- Gewirkt: Kartenhöhe an den Inhalt binden; Inhalt mit dem Aufbau der Karte zeigen, nicht danach.
- Nicht gewirkt: leere Zeilen mit grauen Balken füllen (wird P01).

**P06 · „Das Icon/Logo sieht nicht korrekt aus.“** (v9, Favicon der Kundenmarke)
- Erkennen: Jedes Logo und Icon im Einzelbild 2× vergrößert prüfen; Push mit falschem App-Icon (Absender und Icon passen nicht).
- Ursache: Icon nachgebaut oder aus kleiner Quelle hochskaliert; Benachrichtigung mit dem Icon einer anderen App.
- Gewirkt: Originaldatei, unverändert, ausreichend groß; Absender-Icon passt zum Absender-Namen.
- Nicht gewirkt: generierte oder abgemalte Logos.

**P07 ⚑ · „Jede Szene ist dieselbe Kachel auf Weiß; das Vorbild hat Fotos, Menschen, Geräte.“** (Beweistest C)
- Erkennen: `qualitaet.py --fuellung`, Zeile „Bildwelten: nicht nur Kacheln“ (mehr als ein Drittel der Szenen `kachel`) und Hinweis „Bildwelt reich“ deutlich unter dem Vorbild; Seite-an-Seite-Bogen: Wo das Vorbild Foto, Person oder Gerät zeigt, steht im Film eine Karte auf leerem Grund. Prüffrage: „Wie viele Szenen sehen gleich gebaut aus (Fläche, eine Karte, Headline)?“
- Ursache: Ohne eigene Screens baute der Lauf jede Szene als UI-Karte nach; Foto-, Menschen- und Geräte-Szenen des Vorbilds wurden ersatzlos ersetzt (8 von 11 Szenen). Messwerte grün (Füllung 47 %, Stand 0,3 %), Wirkung „Feature-Liste statt Film“.
- Gewirkt: Ersatz-Bildwelt je Vorbild-Szene aus echtem Material: Desktop-Fenster mit dem echten Screen (öffentliche Demo, sonst Website), Handy mit dem Screen, Produktfoto, Bild von der Website, Live-Daten in Bewegung; Bildwelten wechseln (hell, dunkel, Fenster, Handy, Foto) wie im Vorbild. Im Ursprungslauf trug genau das den abgenommenen Film: Produktfoto, macOS-Desktop, Telefon-Chat, Verlaufs-Timeline.
- Nicht gewirkt: dieselbe Kachel größer machen oder mit Deko füllen (wird P04); generierte Menschen ohne Gate; Fremdlogos als Füllung.

## Typo

**T01 ⚑ · „Die Schrift ist nicht hochwertig.“** (v9/v10)
- Erkennen: R4: Versalhöhe der Hit-Stufe < 8 % der Bildhöhe; Luminanz über 5 Höhenbänder flach (kein Verlauf); Gegenfrage: „Wirkt die Schrift wie Motion-Design oder wie UI-Beschriftung?“
- Ursache: Aussagen im Text-Schnitt mit 64 px und flacher Tinte (4,4 % Versalhöhe gegen 11 bis 12 % in der Referenz).
- Gewirkt: Stufen-System aus `09-qualitaets-dna.md` §2 (H ca. 120 px, Z ca. 84 px, Display-Schnitt) mit senkrechtem Schrift-Verlauf, Akzentwort im Akzent-Verlauf. Damit angenommen.
- Nicht gewirkt: Laufweiten-Animation, Glow, nur größer setzen ohne Material.

**T02 · „Die Schrift auf Schwarz wirkt neblig.“** (v10, Statement auf Schwarz)
- Erkennen: Weißer Glow oder `text-shadow` um Buchstaben; weiche Kanten im Einzelbild.
- Ursache: Glow als Wertigkeits-Trick.
- Gewirkt: Glow streichen, Silber-Verlauf auf Schwarz.
- Nicht gewirkt: Glow schwächer stellen.

**T03 · „Der Text verschwindet komisch.“** (v10)
- Erkennen: Tinten-Integral fällt in einem Frame ohne Schnitt um > 15 %; Aussage verschwindet in einem Frame ohne Ausstieg; Ausstieg blendet nur halb und springt dann.
- Ursache: Je Block eigene Ausstiege; Ausstieg bis 39 bis 62 % Deckung, dann unsichtbar.
- Gewirkt: Ein Ausstieg für alle (0,18 s nach oben, Unschärfe, Deckung bis 0); folgt binnen 2 Frames ein Schnitt, geht die Schrift mit dem Bild.
- Nicht gewirkt: Ausstieg je Szene „passend“ wählen.
- Sonderfall Lichtlauf („Der Glanz auf dem Wort hängt“, v10): länger als 0,6 s, parkt halb auf dem Wort, vom Ausstieg abgeschnitten, weil er in gedehnter Zeit lief. Gewirkt: einmal 0,55 s in Echtzeit, Ende ≥ 0,2 s vor dem Ausstieg (oder Farbwechsel nach der Landung). Nicht gewirkt: mehrere Lichtläufe.

**T04 ⚑ · „Die kleinen Zeilen kann ich kaum lesen.“** (Praxistest B)
- Erkennen: `qualitaet.py --text`: Zeilen < 32 px bei 1080 p, die gelesen werden sollen (Terminal, UI, Stütz- und CTA-Zeile); `lesetext-bogen.jpg` in 1/3 Größe ansehen.
- Ursache: Typo-Skala erlaubte 30 px und kleiner; im Feed auf dem Handy erscheint 16:9 in etwa 1/3 Größe.
- Gewirkt: Lesetext ≥ 32 px, lieber Karte größer oder näher als Schrift kleiner; Deko kleiner nur mit `deko`-Ereignis.
- Nicht gewirkt: Kontrast erhöhen statt Größe.
- Sonderfall Endkarte (v10: Unterzeile 28 px unter 96 px Wortmarke): Unterzeile 34 bis 36 px oder als Pille, Wortmarke Stufe H mit Verlauf; die Unterzeile nie weglassen, wenn sie die Aufforderung trägt.

**T05 · „Akzent und Stützzeile stimmen nicht.“** (v10)
- Erkennen: Aussage ohne Akzent, obwohl definiert; Stützzeile in Tinte statt mittlerem Grau; Akzent auf mehr als 2 Wörtern.
- Ursache: Fehler in der Aussage-Funktion (Teilwörter nach Bindestrich, Farbe der Stützzeile).
- Gewirkt: Akzent höchstens 2 Wörter, auch Teilwörter nach Bindestrich; Stützzeile flach mittleres Grau; Satzzeichen in Tinte.
- Nicht gewirkt: Akzent je Szene neu setzen.

## Bewegung und Übergänge

**B01 ⚑ · „Nicht mehr smooth.“** (v10)
- Erkennen: R5: längster Stand > 0,4 s, Stand-Anteil > 12 %; Kontaktbogen: bildgleiche Folgeframes in Lesefenstern; Ruck an den Kanten (Tempo ×0,06 rein, bis ×12,9 raus).
- Ursache: Zeitlupe als Lesezeit über Szenen, deren Bewegung in alter Zeit codiert war: 6,5 s Standbild in 8 Fenstern.
- Gewirkt: Zeitlupe abgeschafft; Lesezeit als Haltezeit, nur wo die Szenenlogik ruht, Kamera läuft in neuer Zeit durch (2 bis 4 %/s über Grafik, 3 bis 10 %/s ohne Grafik).
- Nicht gewirkt: Zeitverzerrung „weicher“ einstellen.

**B02 ⚑ · „Das Bild steht.“** (v10: 7 von 15 Szenen ohne Drift)
- Erkennen: R6: Einstellungen < 2 %/s Drift; Halt > 0,6 s ohne Ereignis; Szene mit > 5 % Stand.
- Ursache: Keine Pflicht-Hülle; Neubauten endeten im Stand.
- Gewirkt: Jede Einstellung: Settle, linearer Drift, Potenz-Ausstieg aus laufender Drift in den Schnitt; Halte ohne Ereignis auf ≤ 0,6 s kürzen oder füllen.
- Nicht gewirkt: einzelne Punch-ins zur Belebung (machen L03).

**B03 ⚑ · „Die Übergänge sollen so hochwertig wie möglich sein.“** (v8) und danach „unruhig“ (v10)
- Erkennen: Übergangsarten zählen; Gegenfrage auf dem stummen Film: „Welche Übergänge wirken abrupt, ruckelig oder billig? Zeitstempel.“
- Ursache: Jeder Neubau brachte eine neue Übergangsart; sechs Arten in 20 s.
- Gewirkt: Nur drei Arten: Schnitt auf Bewegung in gleicher Richtung, echter Match-Cut, Whip mit Inhalt im ersten Frame danach. Match-Cuts dort, wo ein Element der einen Szene der Anfang der nächsten ist.
- Nicht gewirkt: Unschärfe-Überblendungen, Doppelbelichtung, Morph mit Zwischenhalt.

**B04 · „Der Match-Cut springt.“** (v10)
- Erkennen: Über den Schnitt wechselt Lage, Größe oder Richtung des Elements; Match-Cut aus dem Stand (Bewegung 7,0 → 0,5); Energie über Schnitt außerhalb 0,5 bis 2.
- Ursache: Beide Szenen getrennt gebaut, Kachel wuchs vor dem Schnitt und schrumpfte danach.
- Gewirkt: Element in beiden Szenen an gleicher Lage und Größe, oder die Bewegung läuft über den Schnitt weiter; Nebenelemente 3 bis 4 Frames vorher zurücknehmen.
- Nicht gewirkt: Sprung durch Unschärfe kaschieren.
- Sonderfall Klick und Morph („Der Klick springt, die Form pumpt“, v10): Kachel +11 % in einem Frame, Erfolgszustand Frames lang unsichtbar, Morph groß, halten, klein. Gewirkt: Klick-Feedback mit Anstieg ≥ 2 Frames, ein durchgehender Morph, Erfolgszustand gefüllt. Nicht gewirkt: Überschwinger-Easing (`backOut`).

**B05 · „Schnelle Bewegung wirkt hart oder verwaschen.“** (v10)
- Erkennen: Bewegung ≥ 2 % Bildhöhe pro Frame gestochen scharf; Unschärfe in beiden Achsen oder in der falschen Achse; letzte Frames vor einem Schnitt scharf.
- Ursache: Unschärfe nur in einer Achse, aus alter Zeit, oder per CSS-`blur()` am Objekt.
- Gewirkt: Richtungsunschärfe aus der Geschwindigkeit, zwei Achsen, ein Faktor für Elemente, einer für Whips; jeder Ausstieg in einen Schnitt verwischt.
- Nicht gewirkt: gleichmäßige Unschärfe.

**B06 ⚑ · Ruckler an Schnitten (Duplikat- und Blitzframes)** (v10, Block-Nähte; v1 Naht-Sprung)
- Erkennen: R7 `qualitaet.py --frames`: Duplikat nach Bewegung, Blitzframe mit dem Blockanfang; Nähte N-2 bis N+2.
- Ursache: Ereigniszeiten in Bruchteil-Frames, Sichtbarkeit an zwei Stellen gesteuert.
- Gewirkt: Ereignisse auf ganzen Frames, Sichtbarkeit nur an einer Stelle, Naht-Frames nebeneinander prüfen.
- Nicht gewirkt: einzelne Frames von Hand ersetzen.

**B07 · „Die Szene schleppt sich.“** (Analyse der Maßstab-Szene, Praxistest A)
- Erkennen: Einstellungen in UI-Sequenzen > 2,7 s ohne Ereignis alle ≤ 0,6 s; Ereignisdichte < 1 je 0,4 s; Szene im Seite-an-Seite-Bogen deutlich ruhiger als das Vorbild an derselben Stelle.
- Ursache: Eine Einstellung trägt zu wenig Ereignisse; die Maßstab-Szene schnitt alle 0,96 s.
- Gewirkt: Einstellungslänge 0,7 bis 1,2 s in UI-Sequenzen, Aufbau-Einstellungen nur mit Ereignis alle ≤ 0,6 s.
- Nicht gewirkt: Tempo durch schnellere Kamera allein.

## Ton und Musik

**S01 ⚑ · „Immer derselbe Sound, soll wie die Referenz klingen.“** (Ton Runde 1)
- Erkennen: Hörtest Frage „Akzente“; R11: dasselbe Sample zweimal hintereinander; Effekt-Palette gegen `analyse/ton-referenz.md`.
- Ursache: Wenige Bibliotheks-Sounds für alle Ereignisse, Musik ohne den Stil der Referenz.
- Gewirkt: Referenz-Ton analysieren (Palette, Tempo, Struktur), Musik und Effekt-Varianten im Stil der Referenz (über Gate), Effekte rotieren und pitchen.
- Nicht gewirkt: eine Bibliothek ohne passendes Material weiter durchsuchen.

**S02 ⚑ · „Mehr zum Beat, Gänsehaut fehlt nach dem Anfang.“** (v7, v9)
- Erkennen: Hits und Schnitte neben dem Raster (Q9); kein Höhepunkt (letzter Drop nicht lauter, breiter, neuer als der vorige); Energiekurve des Films gegen die Referenz.
- Ursache: Bild nicht auf dem Musikraster; Musik-Take mit nur zwei Grooves.
- Gewirkt: Bild zuerst auf das Raster legen, Musik danach auf dieses Raster; Musik nach den Schnitt-Regeln R1 bis R8 (`06-ton.md`) neu schneiden, ohne Wiederholung, Drop auf dem Raster. Damit angenommen.
- Nicht gewirkt: „Gänsehaut-Pass“ mit gekachelten Stillen, Hits in digitaler Stille und Kopien von Takten (v10).

**S03 · Energieloch in der Mitte** (Diagnose v10)
- Erkennen: R9/`--ton`: Strecke > 3 s mehr als 3 dB unter dem Groove-Median, außer gewollter Ruhe (`stille`).
- Ursache: Halftime unter Aussagen, Ausklänge gekachelt.
- Gewirkt: Groove mit vollem Pegel unter Kette und Aussagen; Ruhe nur, wo sie als `stille` gewollt ist.
- Nicht gewirkt: leise Musik „damit man lesen kann“.

**S04 · „Das hab ich doch gerade schon gehört.“** (Schleife, Diagnose v10)
- Erkennen: R9: Mix-Wiederkehr < 2,5 dB, Strecke > 2,5 Takte mit r > 0,97 innerhalb 30 s.
- Ursache: Takte kopiert, um Bildlänge zu füllen.
- Gewirkt: Neue Takte aus anderen Stellen des Takes, kein Takt doppelt innerhalb 30 s.
- Nicht gewirkt: kopierte Takte mit Filter verfremden.

**S05 ⚑ · Loch im Hit** (v10: −50 dBFS mitten im Statement)
- Erkennen: R9: 100-ms-Fenster < −40 dBFS, digitale Stille.
- Ursache: Hits mit kurzem Ausklang auf Stille gesetzt.
- Gewirkt: Hits über einem gehaltenen Bett, jeder Hit klingt bis zum nächsten aus.
- Nicht gewirkt: Stille als Dramatik zwischen Statements.

**S06 · Musik stolpert gegen das Bild** (Raster-Sprung, Diagnose v10; Praxistest A)
- Erkennen: Kick-Phase je Abschnitt (`scripts/ton/kick.py`): „halber Schlag daneben“; Hörtest an jeder Naht.
- Ursache: Musik mit freiem Versatz auf Bild-Frames gelegt.
- Gewirkt: Alle Abschnitte auf ganze Takte und Kick-Phase 0 ± 0,05; mitgebrachte Musik gibt das Raster vor.
- Nicht gewirkt: Korrektur nach einer Messung, die „zweideutig“ oder „unklar“ ist.

**S07 · Effekte sitzen neben dem Bild** (Diagnose v10; Praxistest A)
- Erkennen: R11: Effekt nicht ± 2 Frames an einem Ereignis aus `ereignisse.json`; Effekt ohne Bild; wichtige Effekte unter der Musik nicht hörbar.
- Ursache: Cue-Zeiten aus Referenz oder Altversionen statt aus dem Code.
- Gewirkt: Cues nur aus der Ereignisliste, ein Effekt je sichtbarem Hauptereignis; Hauptakzente im Mix hörbar (Ducking, Pegel).
- Nicht gewirkt: mehr Effekte, damit „mehr passiert“.

**S08 ⚑ · „Der Ton am Ende sitzt nicht“, „ab hier wird es komisch“, „hört sich vom Übergang nicht natürlich an“** (v11c, v11e, v11f; Musiksprünge an Nähten in Praxistest A)
- Erkennen: R10: Hörtest „natürlicher Schluss“ ≠ ja, Befunde „Abriss“, „angeklebt“, „springt“; Hit auf dem letzten Hauptereignis fehlt, Stopp nicht auf dem Klick; Pegel zwischen gestückelten Hits sehr tief; Endkarte < −35 dBFS ohne Schluss; Hörtest an jeder Musik-Naht, nicht nur am Ende.
- Ursache: Drei Runden lang verschiedene Fehler am Ende: Hit beim Neuschnitt verloren und Stopp 1 s vor dem Klick (v11c); Hits aus vier Takten und Schluss-Akkord aus drei Quellen gestückelt (v11e); fremder Groove aus anderer Stelle des Takes und Lücke vor der Endkarte (v11f).
- Gewirkt: Take in Originalreihenfolge, höchstens eine Wiederholung, ein Schnitt auf einer Takt-Eins mit kurzem Crossfade, natürlicher Schluss des Takes am Stück; Hallwaschung auf Drum-Ausstiegen; zwei Varianten bauen und per Hörtest vergleichen.
- Nicht gewirkt: Hits aus einzelnen Takten zusammensetzen; Groove aus einer anderen Stelle; „Trailer-Schluss“ mit Impact auf dem Klick (Hörtest: stolpert, leerer Puff).

## Marke und Wahrheit

**W01 ⚑ · „Das stimmt so nicht und fliegt raus.“** (v9, „Bis zu 5 Referenz-Mails“)
- Erkennen: Jede Aussage, Zahl und Funktion gegen den Faktenkatalog im Manifest (G2) legen. Prüffrage: „Wo steht der Beleg dafür?“
- Ursache: Funktion aus einer Beschreibung abgeleitet, nicht vom Nutzer bestätigt.
- Gewirkt: Nur belegte Funktionen und Zahlen; Unbelegtes fragen, nicht formulieren.
- Nicht gewirkt: vorsichtiger formulieren („bis zu“).

**W02 ⚑ · „Ist es riskant, dass das fremde Logo auftaucht?“** (v11h)
- Erkennen: Fremdlogos verändert, zerlegt, neu eingefärbt, animiert aus Einzelteilen oder größer als die eigene Marke.
- Ursache: Logo aus Einzelformen nachgebaut und als Effekt zerlegt; Markenregeln des Herstellers nicht geprüft.
- Gewirkt: Unveränderte Originaldatei, eigene Marke präsenter (Fremdlogo ≤ 85 % der eigenen Marke), Quellen in einer Liste; was nicht freigegeben ist, offen benennen.
- Nicht gewirkt: Logo „nur leicht“ verändern.

**W03 · Fremde Kundendaten im Film** (v3, echte Marken-Mails mit Kundenfotos)
- Erkennen: Echte Inhalte Dritter (Mails, Fotos, Bewertungen) ohne schriftliche Freigabe im Manifest.
- Ursache: Echtes Material wirkt besser als Demo-Material und wurde direkt eingebaut.
- Gewirkt: Einbauen nur mit Freigabe-Vermerk; Veröffentlichung erst nach schriftlichem OK; sonst Demo-Inhalt.
- Nicht gewirkt: Daten „nur kurz“ zeigen.

**W04 · Absender und Branding vermischt**
- Erkennen: Farben, Schriften oder Zeichen einer anderen Marke als der des Absenders; Fremdmarken aus dem Vorbild noch sichtbar.
- Ursache: Branding aus dem Vorbild oder aus dem eigenen Haus übernommen.
- Gewirkt: Absender bestimmt das Branding; nur Mechaniken (z. B. Schrift-Verlauf) werden übernommen, Farben und Schriften bleiben beim Absender; Fremdmarken des Vorbilds komplett ersetzt.
- Nicht gewirkt: „neutrales“ Design.

**W05 · „Bei den Sprachen Flaggen davor.“** (v11d)
- Erkennen: Sprachen, Länder, Kanäle nur als Kürzel; dasselbe Ding in verschiedenen Szenen verschieden gezeichnet.
- Ursache: Kürzel sind in der Bewegung nicht schnell genug erkennbar.
- Gewirkt: Eindeutiges Zeichen (Flagge als Inline-SVG, echtes Logo) vor dem Kürzel, in allen Szenen gleich.
- Nicht gewirkt: Kürzel größer setzen.

**W06 · Integrationen, die das Produkt nicht hat** (v11h)
- Erkennen: Logos in Listen oder Orbits, die nicht als Funktion des Produkts belegt sind.
- Ursache: Liste der Referenz mit plausiblen Logos aufgefüllt.
- Gewirkt: Nur belegte Integrationen; Liste darf kürzer sein als in der Referenz (dann Bild anders füllen, P04).
- Nicht gewirkt: Logos ohne Beschriftung „als Stimmung“.

## Auslieferung und CTA

**A01 ⚑ · „Neue Fassung schlechter als eine ältere.“** („Die frühere Fassung gefällt mir bisher am besten.“, v11)
- Erkennen: Nach jeder Runde fragen: „Ist das besser als die bisher beste Version?“; Regie-Schleife vergleicht Befund-Punkte gegen die Vorrunde.
- Ursache: Vier Revisionen auf eine Basis gestapelt, jede für sich freigegeben, zusammen schlechter.
- Gewirkt: Jede Version sichern, beste Version als Basis zurückholen (bildgleich prüfen), nur die genannten Punkte übertragen, höchstens drei Änderungen je Runde.
- Nicht gewirkt: weiter auf der neuesten Fassung bauen.

**A02 · Endkarte zu lang** (Praxistest A: 5,9 s = 19 % des Films)
- Erkennen: `qualitaet.py --fuellung`: Endkarte > 2 Takte ohne Begründung.
- Ursache: Endkarte bis zum Musikende gestreckt.
- Gewirkt: Endkarte ≤ 2 Takte; Musik vorher natürlich enden lassen (S08) statt die Endkarte zu verlängern; länger nur mit Ausklang und Begründung.
- Nicht gewirkt: Endkarte mit Drift „beleben“.

**A03 · Film länger als besprochen** (Praxistest A: +23 % gegen Brief)
- Erkennen: R12 `--brief`: Zahl ± 10 %, Spanne wörtlich.
- Ursache: Lesezeit und Endkarte verlängerten den Film, ohne dass die Länge neu abgestimmt wurde.
- Gewirkt: Länge im Blueprint je Beat planen, Überlänge vor dem Bau freigeben lassen; zuerst Endkarte und ereignislose Halte kürzen.
- Nicht gewirkt: Lesezeit unter Soll drücken, um die Länge zu halten (dann L01).

**A04 · „Am Anfang bewegt sich das Video nicht“ oder „nach dem Hochladen zu laut, verzerrt“** (Auslieferung)
- Erkennen: `qualitaet.py --auslieferung` auf der Web-Kopie nach AAC: faststart fehlt; True Peak > −1 dBTP; Lautheit außerhalb −14 ± 1 LUFS.
- Ursache: Web-Kopie ohne `+faststart`; nur der WAV-Mix gemessen, AAC hebt die Spitzen.
- Gewirkt: Jede Web-Kopie mit `-movflags +faststart` (auch Vergleichs-Videos); Master-Limiter mit Reserve (ca. −3 dB), Messung auf der ausgelieferten Datei.
- Nicht gewirkt: kleinere Datei; Messung am Mix.

<!-- Warum dieser Katalog: Im Ursprungslauf entstanden die Qualitätsregeln erst aus elf Ablehnungen des Auftraggebers. In zwei Praxistests blieben fremde Nutzer auf Stand v1 (Bildfüllung 12 bis 44 %), weil sie „sieht gut aus“ sagten und niemand die Rolle des anspruchsvollen Kunden übernahm. Die Regie-Schleife spielt diese Rolle mit diesem Katalog. -->
<!-- Warum „Nicht gewirkt“: Mehrere Fixes des Ursprungslaufs lösten den nächsten Einwand aus (Zeitlupe gegen „zu schnell“ ergab „nicht smooth“, Verdichten gegen „fehlende Funktionen“ ergab „überladen“, gestückelte Hits gegen „Ende sitzt nicht“ ergab „komisch“). Die Synthese muss diese Wege kennen, um sie nicht zu wiederholen. -->
