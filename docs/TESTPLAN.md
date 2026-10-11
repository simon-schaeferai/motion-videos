# Testplan

Der Skill ist Markdown plus Skripte, das Claude Code ausführt. Getestet wird deshalb beides: das Verhalten einer frischen Claude-Code-Sitzung mit einem Nutzer, der den Skill nur aus dem README kennt, und die Skripte selbst. Jeder Test ist binär entscheidbar. Stand Oktober 2026.

Aufbau der Praxistests: Skill frisch nach README installiert (eigener Projektordner, `install.sh --projekt`), Lauf über `claude -p` in Runden, der Testnutzer antwortet knapp, kennt keine internen Regeln, gibt keine Qualitätstipps und lehnt kostenpflichtige Generierung ab. Gemessen wurde danach mit `scripts/qualitaet.py` auf der Web-Kopie und mit `scripts/hoertest.mjs`.

## T1 · Installation nach README

**Schritte:** Repo klonen, `bash install.sh --projekt`, `bash scripts/setup_check.sh --gemini`.
**Bestanden, wenn:** der Check „Alles bereit“ meldet oder für jedes fehlende Teil einen Befehl nennt.
**Ergebnis:** BESTANDEN: in allen drei Praxistests meldete der Check nach dem Eintragen des Gemini-Keys grün (17 bzw. 18 ok). Befunde daraus: OpenCV war im ersten Test nur ein Hinweis und ist jetzt Pflicht; mit reinen Projekt-Einstellungen sieht die Sitzung globale HyperFrames-Skills nicht, der Check nennt dafür jetzt den Kopierbefehl; ein leeres Gemini-Tageskontingent meldet `--gemini` vor dem Lauf.

## T2 · Fertiger Film mit Vorbild, ohne eigene Screens

**Schritte:** `/motion-videos Ich will so ein Video wie <vorbild.mp4> für mein Produkt …`, eigene Musik, keine Screens, kein Generator.
**Bestanden, wenn:** am Ende eine Web-Kopie steht und die Rubrik R1 bis R12 bestanden ist (kein ★ rot).
**Ergebnis:** BESTANDEN: Film 30,8 s, alle ★ grün, R8 und R11 gelb; 7 Runden, 1 h 31 min, 35,61 $ Claude-Nutzung laut Client. Befund: sichtbar leerer als das Vorbild, daraus entstanden Navigator und Regie-Schleife.

## T3 · Fertiger Film ohne Vorbild

**Schritte:** `/motion-videos Mach mir ein kurzes Teaser-Video für mein Open-Source-Tool … Kein Vorbild`.
**Bestanden, wenn:** der Skill Stil-Richtungen vorschlägt und einen fertigen Film ausliefert.
**Ergebnis:** BESTANDEN: Teaser 15,9 s, alle ★ grün, R8 Bildfüllung rot (untere Bildhälfte leer, danach als Messung `--fuellung` eingebaut); 5 Runden, 48 min, 12,82 $.

## T4 · Beweistest: Vorbild + Produkt-Link + ein Go

**Schritte:** `/motion-videos Ich will so ein Video wie <vorbild.mp4> für unser Produkt: <url>`. Der Testnutzer gibt genau ein Go auf den Vorschlag und beantwortet die fünf Abnahme-Fragen.
**Bestanden, wenn:** der Film ohne weitere Eingriffe fertig wird und die Messung kein ✗ zeigt.
**Ergebnis:** BESTANDEN: Film 41,4 s nach genau einem Go, Abnahme „5 × passt“; `qualitaet.py` 18 ✓ · 0 ✗ (nach Korrektur einer Fehlmessung bei großer Schrift, Gegenprobe mit echter Kleinschrift bleibt rot). Kosten 95,76 $ bei vier Regie-Runden; das Wochenlimit des Abos unterbrach den Lauf einmal ohne Arbeitsverlust.

## T5 · Kostendeckel und Budget-Stopp

**Schritte:** `navi kosten`, dann am Klon des Beweistests `navi budget 40` mit 83,8 $ bisheriger Nutzung, danach `navi budget 90` ohne und mit Wortlaut des Nutzers.
**Bestanden, wenn:** `navi kosten` die Spanne in $ je Stufe zeigt, Station 6 beim Budget stoppt und ein Erhöhen nur mit Wortlaut geht.
**Ergebnis:** BESTANDEN: 40-s-Film voll 30 bis 40 $, spar 15 bis 20 $; Stopp mit Rückfrage; Erhöhen ohne Wortlaut Exit 1, mit Wortlaut Exit 0 und Manifest-Zeile. Offen: Die Planwerte sind noch nicht in einem vollen Lauf nachgemessen.

## T6 · Schwellen des Navigators blocken

**Schritte:** Lauf mit Attrappen durch alle neun Stationen, jede Schwelle einmal absichtlich verfehlen (fehlendes Vorbild, 0 belegte Funktionen, Material 3 von 10, 7-Wort-Aussage, kein Go, ★ rot in der Probe, fehlende Version, fehlender Hörtest, fehlende Abnahme).
**Bestanden, wenn:** `navi weiter` jedes Mal mit Liste und Befehl stoppt und erst nach Behebung weitergeht; Station 6 und 9 nicht überspringbar.
**Ergebnis:** BESTANDEN: jede Schwelle blockte, `zurueck vN` sicherte den Stand vorher und holte die Version bildgleich zurück.

## T7 · Produktseite und öffentliche Demo lesen

**Schritte:** `node scripts/produkt-lesen.mjs <öffentliche Produktseite> <lauf>`.
**Bestanden, wenn:** Funktionen mit Zitat und URL, Marke mit Hex-Werten und Logo vorliegen, eine öffentliche Demo gefunden und geholt wird und Login-Seiten verworfen werden.
**Ergebnis:** BESTANDEN: Analytics-Produkt: 18 Kandidaten mit Zitat, Marke und Logo, Demo „View live demo“ geholt (5 Screens), „My dashboard“ (Login) verworfen. Reine Skript-App ohne Text: `FEHLT.md` mit geführter Nachfrage.

## T8 · Gemini fällt aus

**Schritte:** Hörtest mit einem Free-Tier-Key, dessen Tageskontingent leer ist.
**Bestanden, wenn:** das Skript das Kontingent als Ursache nennt und auf das Ersatzmodell wechselt.
**Ergebnis:** BESTANDEN: Meldung „Tageskontingent erschöpft (Free Tier: 20 Anfragen/Tag)“, Ersatzmodell sprang automatisch ein.

## T9 · Skripte kompilieren und scheitern sauber

**Schritte:** `node --check` aller `.mjs`, `bash -n` aller `.sh`, Python-AST aller `.py`; jedes Skript ohne Argumente aufrufen.
**Bestanden, wenn:** alles kompiliert und ohne Argumente eine Nutzungszeile statt eines Tracebacks kommt.
**Ergebnis:** BESTANDEN: alle Skripte kompilieren, keine Tracebacks bei fehlenden Argumenten.
