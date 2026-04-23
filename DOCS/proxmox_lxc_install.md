# Installation in Proxmox LXC

Diese Anleitung beschreibt die Installation der AIS DX-CONTROL Applikation in einem Proxmox LXC Container.

## 1. LXC Container Erstellung
Erstellen Sie in Proxmox einen neuen LXC Container mit folgenden empfohlenen Spezifikationen:

*   **Template:** Ubuntu 22.04 oder Debian 12
*   **CPU:** 1-2 Cores
*   **Memory:** 512MB - 1GB RAM
*   **Disk:** 4GB+
*   **Netzwerk:** Statische IP oder DHCP (merken Sie sich die IP)

## 2. System Vorbereitung
Loggen Sie sich per SSH oder über die Proxmox Konsole in den Container ein und führen Sie folgende Befehle aus:

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential
```

## 3. Node.js Installation
Die App benötigt Node.js (Version 18 oder höher). Wir empfehlen die Installation über das NodeSource Repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Prüfen Sie die Installation:
```bash
node -v
npm -v
```

## 4. Applikation einrichten
Kopieren Sie die Dateien der Applikation in ein Verzeichnis Ihrer Wahl (z.B. `/opt/dx-control`):

```bash
mkdir -p /opt/dx-control
# Kopieren Sie hier Ihre Dateien in das Verzeichnis (z.B. per SCP oder Git)
cd /opt/dx-control
```

Installieren Sie die Abhängigkeiten und bauen Sie die App:

```bash
npm install
npm run build
```

## 5. Automatischer Start (systemd)
Um sicherzustellen, dass die App beim Booten startet und nach Abstürzen neu gestartet wird, erstellen wir einen systemd Service:

Erstellen Sie die Datei `/etc/systemd/system/dx-control.service`:

```ini
[Unit]
Description=AIS DX-CONTROL Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/dx-control
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten Sie den Service:

```bash
systemctl daemon-reload
systemctl enable dx-control
systemctl start dx-control
```

## 6. Zugriff
Die Applikation ist nun über die IP-Adresse Ihres Containers auf Port **3000** erreichbar:

`http://<CONTAINER-IP>:3000`

---

## Fehlerbehebung
*   **Logs prüfen:** `journalctl -u dx-control -f`
*   **Status prüfen:** `systemctl status dx-control`
*   **Persistence:** Die Konfigurationen werden in `config.json` und `worked_qsos.json` im App-Verzeichnis gespeichert. Sichern Sie diese Dateien regelmäßig.
