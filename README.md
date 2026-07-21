# SpinnankerTHWApp

Web-App zur **Traglastprüfung** von Spinnanker-Bodenankern (Type XII) für das THW.
Sie ersetzt das manuelle Ausfüllen des Protokolls und das Ablesen im
Traglastdiagramm: Stablängen aus Eilgang (EG) und Kraftgang (KG) eintragen –
Mittelwerte und Bruchlast werden per Knopfdruck berechnet.

## Bedienung

1. Für jeden der 12 Stäbe die im **Eilgang (EG)** und im **Kraftgang (KG)**
   eingedrehte Länge eintragen (in Metern, Komma oder Punkt). Beide Werte sind
   Abschnitte desselben 2-m-Stabes, daher gilt je Stab **EG + KG ≤ 2 m**.
2. Summe und Mittelwert werden live unter der Tabelle angezeigt.
3. Auf **„Bruchlast berechnen“** drücken – das Ergebnis erscheint als
   vertikale (V) und horizontale (H) Bruchlast in kN.

Über die Schaltfläche **Beispiel** wird das dokumentierte Beispiel (Bild 24)
geladen: Mittel EG 1,36 m, Mittel KG 0,64 m (Gesamtlänge 2,00 m).

## Rechenmodell

Das offizielle Traglastdiagramm (Bild 20/24, „Designwiderstand Spinnanker
XII / 1400 HTC“) besteht aus vier Ursprungsgeraden. Ihre Steigungen wurden aus
dem Originaldiagramm ausgemessen (kN je Meter Stablänge):

| Kurve | Steigung | Last bei 2 m |
| ----- | -------- | ------------ |
| EG-V  | 9,0      | 18 kN        |
| EG-H  | 5,0      | 10 kN        |
| KG-V  | 24,5     | 49 kN        |
| KG-H  | 13,6     | 27 kN        |

Die grafische Ablesekonstruktion (Parallele zur KG-Kurve, Bild 24) entspricht
der Formel:

```
Bruchlast = Steigung_EG · MittelEG + Steigung_KG · MittelKG
```

Dabei sind `MittelEG` und `MittelKG` die Mittelwerte der im jeweiligen Gang
eingedrehten Längen. Kontrolle am dokumentierten Beispiel
(EG 1,36 m + KG 0,64 m = 2,00 m Gesamtlänge): vertikal 27,9 kN – deckt sich mit
den im Diagramm abgelesenen ~27 kN.

**Geltungsbereich:** Spinnanker Type XII, Mindest-Einbaulänge 2 m,
Bodenklasse 4, Ein-/Ausdrehmaschine 1400 HTC. Das Ergebnis ersetzt keine
Ingenieurprüfung im Einzelfall.

## Weitergabe an Anwender

Die App ist rein statisch (HTML/CSS/JS) und funktioniert offline. Für die
Verteilung an nicht-technische Nutzer gibt es zwei Wege – ausführlich
beschrieben in **[DISTRIBUTION.md](DISTRIBUTION.md)**:

- **Web-Link (Handy/Tablet):** über GitHub Pages veröffentlichen; Nutzer öffnen
  den Link und wählen „Zum Startbildschirm hinzufügen“. Als installierbare PWA
  (Manifest + Service Worker) läuft die App danach auch offline.
- **Einzelne Offline-Datei:** `npm run build` erzeugt
  `dist/Spinnanker-Traglast-offline.html` – eine eigenständige Datei mit
  eingebettetem CSS/JS, die per Doppelklick bzw. im Browser geöffnet wird
  (kein Server, kein Internet).

## Entwicklung

| Befehl          | Wirkung                                                        |
| --------------- | ------------------------------------------------------------- |
| `npm start`     | Lokalen Webserver starten → http://localhost:8000             |
| `npm test`      | Rechenlogik testen (`tests/calculation.test.js`)              |
| `npm run build` | Eigenständige Offline-Datei nach `dist/` erzeugen             |
| `npm run icons` | App-Icons neu generieren (`icon-*.png`)                       |

### Projektstruktur

- `index.html`, `styles.css` – Oberfläche
- `app.js` – Bedienung/Anzeige (DOM), Service-Worker-Registrierung
- `calculation.js` – Rechenkern (auch von den Tests genutzt)
- `manifest.webmanifest`, `sw.js`, `icon.*` – PWA/Installierbarkeit
- `scripts/` – Build- und Icon-Generator
- `dist/` – erzeugte Offline-Datei (durch `npm run build`)

Nach Änderungen an den App-Dateien die Cache-Version in `sw.js`
(`const CACHE = 'spinnanker-traglast-v1'`) hochzählen, damit installierte
Geräte die neue Fassung laden.
