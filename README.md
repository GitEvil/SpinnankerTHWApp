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

## Lokal starten

1. Terminal in diesem Ordner öffnen.
2. `npm start` (startet einen lokalen Webserver).
3. http://localhost:8000 im Browser öffnen.

Die App ist rein statisch (HTML/CSS/JS) und funktioniert offline.

## Tests

Die Berechnungslogik ist durch automatisierte Tests abgedeckt:

```
npm test
```
