# Update-Anleitung: Von Version 0.2.3 auf die aktuelle Version (0.3.0)

Diese Anleitung beschreibt Schritt für Schritt, wie Sie eine bestehende Installation der **Multi-Bandmap** (z. B. auf einem Linux-Server, Raspberry Pi oder in einem Proxmox LXC-Container unter `/opt/dx-control`) von Version **0.2.3** auf die aktuelle Version **0.3.0** aktualisieren.

---

## 📋 Wichtige Neuerungen seit Version 0.2.3

Bevor Sie das Update durchführen, hier ein Überblick über die wichtigsten Neuerungen:
* **Individuelle Akzentfarben für jede Band-Spalte:** Farb-Picker direkt in jedem Spaltenkopf (12 Farbpresets + freie HEX-Farbauswahl) mit dynamischer Farbgebung von Header, Zeilen-Hover, VFO-Marker und Detail-Tooltips.
* **Erweiterte DXCC- & Länderflaggen-Erkennung:** Umfassende weltweite Präfix-Datenbank (inkl. Rufzeichen mit Gastland-Präfixen wie `EA8/DL1ABC`, Inselgruppen, Kronbesitzungen etc.).
* **Eigener QTH-Locator & Peilung (QRB / QTE):** Eingabe des eigenen QTH-Locators in den Einstellungen zur automatischen Berechnung von Entfernung (km) und Himmelsrichtung mit Kompass-Pfeil bei Spots mit Locator.
* **Neueste Abhängigkeiten & Performance:** Umstellung auf Vite 6, Tailwind CSS 4 und optimierte WebSocket-Verarbeitung.

---

## 🛠️ Schritt-für-Schritt-Update

### Schritt 1: Service stoppen
Stoppen Sie den laufenden `dx-control`-Dienst, damit während des Dateiaustauschs keine Schreibkonflikte auf `config.json` oder WebSocket-Ports entstehen:

```bash
# Falls Sie systemd nutzen (Standard laut Proxmox-Anleitung):
systemctl stop dx-control

# Falls Sie PM2 nutzen:
pm2 stop dx-control
```

---

### Schritt 2: Backup der bestehenden Konfiguration erstellen
Sichern Sie Ihre Konfigurations- und Log-Dateien, um Ihre bisherigen Einstellungen (Cluster-Login, sichtbare Spalten, gearbeitete QSOs) zu bewahren:

```bash
# In das Anwendungsverzeichnis wechseln
cd /opt/dx-control

# Backup-Ordner anlegen und Konfigurationsdateien sichern
mkdir -p /root/dx-backup-0.2.3
cp config.json /root/dx-backup-0.2.3/ 2>/dev/null || true
cp worked_qsos.json /root/dx-backup-0.2.3/ 2>/dev/null || true
cp .env /root/dx-backup-0.2.3/ 2>/dev/null || true
```

---

### Schritt 3: Quellcode aktualisieren

Wählen Sie die Methode, mit der Sie die Anwendung bereitgestellt haben:

#### Variante A: Bei Nutzung von Git
```bash
cd /opt/dx-control
git fetch --all
git pull origin main
```

#### Variante B: Manuelles Kopieren / Entpacken eines Release-ZIPs
Laden Sie das neue Archiv herunter oder übertragen Sie es per SCP auf Ihren Server:
```bash
# Beispiel: Entpacken des neuen Archivs über die bestehende Installation
cd /opt/dx-control
# Kopieren Sie die neuen Dateien (src/, DOCS/, package.json, server.ts, index.html, etc.)
# Achten Sie darauf, config.json nicht versehentlich mit einer leeren Datei zu überschreiben.
```

---

### Schritt 4: Abhängigkeiten aktualisieren (`npm install`)
Da neue Pakete und Typen (z. B. Farbpaletten, Icons, Tooling) hinzugekommen sind, müssen die `node_modules` aktualisiert werden:

```bash
cd /opt/dx-control
npm install
```

> **Hinweis zu Node.js:** Die Anwendung benötigt Node.js 18 oder 20+ LTS. Falls Sie noch eine ältere Node.js-Version installiert haben, aktualisieren Sie diese über das offizielle NodeSource-Repository (`curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs`).

---

### Schritt 5: Produktions-Build neu erstellen (`npm run build`)
Bauen Sie die statischen Frontend-Assets mit Vite neu:

```bash
cd /opt/dx-control
npm run build
```
*Nach erfolgreichem Durchlauf liegt der optimierte Build im Ordner `dist/` bereit.*

---

### Schritt 6: Konfigurations-Migration prüfen
Die neue Version ist **vollständig abwärtskompatibel** zu Ihrer bisherigen `config.json`.
* Fehlende neue Eigenschaften (wie `qthLocator` oder die individuellen Spaltenfarben) werden beim Starten automatisch mit sinnvollen Standardwerten initialisiert.
* Falls Sie eine neue Installation aufgesetzt haben, können Sie Ihre gesicherte `config.json` wieder zurückkopieren:
```bash
cp /root/dx-backup-0.2.3/config.json /opt/dx-control/config.json 2>/dev/null || true
cp /root/dx-backup-0.2.3/worked_qsos.json /opt/dx-control/worked_qsos.json 2>/dev/null || true
```

---

### Schritt 7: Service neu starten
Starten Sie den Dienst wieder und aktivieren Sie ggf. geänderte systemd-Dateien:

```bash
# systemd neu laden und starten:
systemctl daemon-reload
systemctl restart dx-control

# Status überprüfen:
systemctl status dx-control
```

---

### Schritt 8: Browser-Cache leeren & Funktionstest
1. Öffnen Sie die Web-App in Ihrem Browser (`http://<SERVER-IP>:3000`).
2. Führen Sie einen **Hard Refresh** im Browser durch (**Strg + F5** bzw. **Cmd + Shift + R**), damit die neuen JavaScript-Bundles und Styles geladen werden.
3. Prüfen Sie oben links die Versionsnummer: Es sollte nun **v0.3.0** angezeigt werden.
4. **QTH-Locator eintragen:** Öffnen Sie oben rechts das ⚙️ **Einstellungen**-Menü und tragen Sie Ihren eigenen QTH-Locator (z. B. `JO62QJ`) ein.
5. **Farben anpassen:** Klicken Sie im Kopf einer beliebigen Band-Spalte auf das neue Farbfeld-Symbol, um Ihre Wunsch-Akzentfarbe für dieses Band festzulegen.

---

## 🔍 Fehlerbehebung (Troubleshooting)

| Problem | Ursache | Lösung |
| :--- | :--- | :--- |
| **App startet nicht (`systemctl status dx-control` zeigt `failed`)** | Veraltetes Node.js oder fehlende Pakete | Logs ansehen mit `journalctl -u dx-control -f -n 50`. Führen Sie `npm install` und `npm run build` manuell im Verzeichnis aus. |
| **Alte Version wird im Browser angezeigt** | Browser-Cache hält altes Bundle | Browser-Cache leeren mit `Strg + Shift + R` oder Seite im Inkognito-Fenster öffnen. |
| **Farben oder Locator werden nicht gespeichert** | Fehlende Schreibrechte auf `config.json` | Dateirechte anpassen: `chown -R root:root /opt/dx-control` bzw. den entsprechenden User setzen. |
| **Port 3000 bereits belegt** | Alter Node-Prozess läuft noch im Hintergrund | Prüfen mit `lsof -i :3000` oder `killall node` und Dienst neu starten. |

---

## 📞 Support & Logs
Die Live-Logs können Sie jederzeit im Terminal einsehen:
```bash
journalctl -u dx-control -f
```
