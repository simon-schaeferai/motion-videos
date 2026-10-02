# Referenz-Gate (G1)

Vor jeder Analyse und jedem Bau: Zutaten klären. Was der Auftrag schon beantwortet, nicht nochmal fragen. Den Rest in **einer** Runde fragen (Rückfrage-Werkzeug des Clients, sonst nummerierte Liste; max. 4 Fragen pro Runde, Empfehlung zuerst mit „(Empfohlen)“). Antworten sofort ins Manifest.

## 1. Pflicht-Zutaten

| Zutat | Warum | Typische Optionen / Default |
|---|---|---|
| **Vorbild** | Spezifikation für Mechanik | Video-URL, Datei, oder „kein Vorbild“ → Stil-Richtungen vorschlagen |
| **Ziel** | entscheidet Treue vs. Eigenständigkeit | Mechanik übernehmen + eigener Inhalt (Empfohlen) · interne 1:1-Studie (nie veröffentlichen) · Fähigkeitstest eines Generators |
| **Absender** | Branding-Weiche | eigene Marke des Nutzers → dessen Branding · Kunde/Produkt → dessen Branding aus Website/App, nie Marken mischen |
| **Produkt / Thema** | Inhalt jeder Szene | mit Link; Funktionsumfang erfragen oder selbst lesend prüfen (App im Browser nur ansehen) |
| **Format** | Layout-Umrechnung | 16:9 wie Referenz · 9:16 Reel · beides (erst 16:9 abnehmen, dann ableiten) |
| **Sprache** | Textlängen ändern Typo-Größen | Deutsch · Englisch (UI-Texte wirken oft echter) |
| **Einsatz / Kanal** | CTA, Lizenzen, Freigaben | eigener Kanal mit Keyword · Kunden-/Produktkanal nur URL · Website/Sales-Deck ohne Social-CTA |
| **Demo-Inhalt** | was im Film „produziert“ wird | fiktive Demo-Marke (Empfohlen, keine Freigabe nötig) · echte Kundendaten (nur mit schriftlichem OK) · eigene Marke |
| **Generatoren** | welche Route möglich ist | welche Bild-, Video-, Musik- und SFX-Anbieter angeschlossen sind (MCP, API-Key) · keiner → Code-only-Route mit eigenen Assets |

## 2. Fakten-Gate (nach der Analyse, vor dem Blueprint-Go)
Für jede Szene, die eine Produktfunktion zeigt: „Gibt es das wirklich?“ Nicht raten. Typische Fragen:
- Name des Modus / der Hauptfunktion? Welche Modelle darf man zeigen? Welche Integrationen (Publish-Ziele, Connectors)?
- Benachrichtigungskanal? Sprachen? Begriffe (z. B. „Flows“)? Akzentfarbe?
- Belege, die du selbst holen kannst (lesend): Werkzeugkatalog eines MCP-Connectors, Login-Screen/App-UI per Browser (nichts klicken, was schreibt), Website-CSS (Farben, Schrift).

## 3. Asset-Gate (was du vom Nutzer brauchst)
Frag konkret nach Dateien, mit Zielordner und Klick-Anleitung:
- Logos/Wortmarken (SVG bevorzugt), echte Produktfotos, Screens/Exports (z. B. „im Tool je Ansicht Export → PNG“).
- **macOS-Datenschutz:** Claude kann `~/Downloads`, `~/Desktop`, `~/Documents` oft nicht lesen („Operation not permitted“). Gleich bitten, Dateien nach `motion-runs/<lauf>/assets/<thema>/` zu ziehen, und beide Ordner per `open` im Finder öffnen.
- Kundendaten: wenn ein Connector-Lesezugriff von einem Sicherheits-Check (personenbezogene Daten) blockiert wird, **nicht umgehen**; der Nutzer liefert das Material selbst oder erteilt die Berechtigung.

## 4. Freigaben, die vor Veröffentlichung fehlen können
- Schriftliches OK der gezeigten Kundenmarke (inkl. echter Personen-Fotos, Demo-Werte für Platzhalter).
- Lizenz für Musik/SFX: „YouTube-sicher“ heißt nicht „frei für Website oder Werbung“; generierte Musik: Lizenz des jeweiligen Anbieter-Plans prüfen.
- Fremde Logos (Modelle, Tools) nur als Nennung von Integrationen, die es gibt.

## 5. Ergebnis
Manifest-Abschnitt „Entscheidungen“ (Nutzer) + „Abgeleitet“ (Claude, korrigierbar) + „Offen“. Erst danach Phase 2.
