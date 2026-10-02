# Ton (G5)

<!-- Warum: In einem echten Lauf wurde die erste Tonfassung abgelehnt („immer derselbe Sound, ich wollte einen ähnlichen Sound wie im Referenzvideo“). Ursache: nur das Timing der Referenz genutzt, nicht ihr Klang; Musik erst gegen Ende; ein einziger Pop für alle Einsätze. -->

## Reihenfolge (nie überspringen)
1. **Referenz-Ton beschreiben**, bevor irgendetwas ausgewählt wird: `scripts/ton-referenz.mjs` (Musik-Stil, BPM, Struktur mit Zeiten, Effekt-Palette, Event-Karte, Mix, Rezept). Ergänzend messen (Code-Vorlage unten). Die Energiekurve ist das Abnahme-Maß: der eigene Mix soll ihr folgen.
2. **Quelle wählen.** Eigene, lizenzierte Bibliothek, falls vorhanden und ein Track Stil und Tempo trifft. Sonst Generierung (G5 mit Prompts wörtlich, Kosten aus der Preisabfrage des Anbieters):
   - Musik: Musikgenerator (Empfehlung: Google Lyria), instrumental, Dauer = Film + 4 s, **2 Takes**. Prompt mit Stil, BPM, Instrumenten und **Struktur auf der Uhr** (Intro bis X, Drop bei X, Pause bei X, Breakdown, Hits auf den Statements, harter Stopp, Ausklang).
   - Effekte: SFX-Generator (Empfehlung: ElevenLabs Sound Effects), **je Typ 4 Varianten** (Klick, Glas-Pop, Swoosh, Tipp-Burst, Sparkle, Handy-Chime, Sub-Thud, Kachel-Flattern; je nach Film ergänzen).
3. **Take wählen** per Energiekurve/Tempo gegen die Wunsch-Struktur.
4. **Musik auf Filmzeit schneiden**: nur an Takt-Einsen (Beat-Raster per Onset bestimmen), 10 bis 30 ms Crossfade auf Nulldurchgang, kein Stretch, keine Tonhöhe. Groove-Takte wiederholen/kürzen, bis Drop, Pausen, Breakdown, Hits und Stopp auf den Filmzeiten liegen (Ziel ±15 ms).
5. **Effekte legen**: Varianten rotieren (nie dieselbe zweimal hintereinander), je Einsatz ±1 bis 2 Halbtöne, eigenes Panorama; Kaskaden aufsteigend gepitcht; viele Kacheln = Flattern + wenige Pops statt Pop-Kette; Sparkle nur an KI-Momenten; größter Hit auf das größte Bild-Ereignis mit 0,15 bis 0,25 s Stille davor; max. 1 bis 2 Booms.
6. **Mix**: Musik ~6 dB unter UI-Transienten, 2 bis 3 dB Ducking bei Klicks/Tippen, UI-Sounds Hochpass ~350 Hz, Kaskaden im Stereo verteilt, Raumton sehr leise; Ziel −14 LUFS, True Peak < −1 dBTP.
7. In HyperFrames als eigene Sub-Composition `compositions/audio.html`, erzeugt aus einer Cue-Liste (kleines Skript, das je Cue ein `<audio>`-Element mit Start, Dauer und Lautstärke schreibt), Slot in `index.html`. Für Fades, Ducking und Effekte den Skill `hyperframes-audio` nutzen.
8. **Prüfen**: `ffmpeg -af ebur128=peak=true`, Energiekurve neben Referenz, Cue-Timing ±1 Frame, Waveform an jeder Musik-Schnittstelle, Liste „keine identischen Samples direkt hintereinander“, Bild unverändert.
9. **Der Nutzer hört**; Claude kann nicht hören. Im Bericht die unsicheren Punkte konkret nennen (Wiederholungen hörbar? Pops zu dicht? Hit zu laut?).

## Code-Vorlage Energie + Tempo
```python
import numpy as np, wave
def analyse(p):
    w=wave.open(p); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
    hop=512; fr=np.lib.stride_tricks.sliding_window_view(x,1024)[::hop]; fps=sr/hop
    db=20*np.log10(np.sqrt((fr**2).mean(1))+1e-6)
    spec=np.abs(np.fft.rfft(fr*np.hanning(1024),axis=1)); flux=np.maximum(0,np.diff(spec,axis=0)).sum(1); flux=(flux-flux.mean())/flux.std()
    ac=np.correlate(flux,flux,'full')[len(flux)-1:]; lags=np.arange(len(ac))/fps; m=(lags>60/180)&(lags<60/80)
    seg=int(2*fps); return 60/lags[m][np.argmax(ac[m])], [round(float(db[i:i+seg].mean()),1) for i in range(0,len(db),seg)]
# Eingang: mono WAV 22,05 kHz (ffmpeg -ac 1 -ar 22050). Tempo kann halb/doppelt erkannt werden: mit der Gemini-Angabe abgleichen.
```

## Lizenz
„YouTube-sicher“ heißt nicht „frei für Website, Werbung oder Sales-Deck“. Generierte Musik: Lizenz des Anbieter-Plans vom Nutzer bestätigen lassen. Im Manifest unter „Offen“.
