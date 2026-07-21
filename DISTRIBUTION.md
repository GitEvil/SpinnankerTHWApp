# Weitergabe an andere (ohne Technikkenntnisse)

Es gibt zwei Wege, die sich ergänzen:

- **A) Web-Link (empfohlen für Handy/Tablet):** einmal öffnen, „Zum
  Startbildschirm hinzufügen“ – danach wie eine App, auch offline.
- **B) Einzelne Offline-Datei:** eine `.html`-Datei zum Weitergeben per
  E-Mail/USB/Intranet. Läuft komplett ohne Internet.

Die Nutzer brauchen in beiden Fällen **nur einen Browser** – keine Installation,
kein Terminal.

---

## A) Als Web-Link über GitHub Pages

**Einmalig einrichten (nur du, im Browser):**

1. Repository auf GitHub öffnen → **Settings** → **Pages**.
2. Unter „Build and deployment“ → **Source: Deploy from a branch**.
3. Branch **main**, Ordner **/(root)** wählen → **Save**.
4. 1–2 Minuten warten. Oben erscheint die Adresse, z. B.
   `https://<dein-name>.github.io/SpinnankerTHWApp/`.

Diese Adresse verteilst du (Link, QR-Code, E-Mail).

**Was die Nutzer tun:**

- **iPhone/iPad (Safari):** Link öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android (Chrome):** Link öffnen → Menü (⋮) → „App installieren“ bzw.
  „Zum Startbildschirm hinzufügen“.

Nach dem ersten Öffnen funktioniert die App auch **ohne Internet** (der
Service Worker speichert sie lokal).

---

## B) Als einzelne Offline-Datei

1. `npm run build` ausführen.
2. Es entsteht **`dist/Spinnanker-Traglast-offline.html`** – eine einzige
   Datei, die CSS und Programm bereits enthält.
3. Diese Datei weitergeben (E-Mail-Anhang, USB-Stick, Intranet, Cloud).

**Was die Nutzer tun:**

- **PC/Laptop:** Datei doppelklicken – sie öffnet sich im Browser.
- **Handy/Tablet:** Datei herunterladen und „mit Browser öffnen“ wählen.

Kein Server, kein Internet nötig.

---

## Aktualisieren

1. Quelldateien ändern (`index.html`, `styles.css`, `app.js`,
   `calculation.js`).
2. `npm test` (Rechenlogik prüfen) und `npm run build` (Offline-Datei neu
   erzeugen).
3. Änderungen committen und pushen → GitHub Pages aktualisiert sich
   automatisch. Neue Offline-Datei erneut verteilen.

Bei Änderungen an den App-Dateien in `sw.js` die Zeile
`const CACHE = 'spinnanker-traglast-v1';` hochzählen (…-v2, -v3), damit
installierte Geräte die neue Version laden.
