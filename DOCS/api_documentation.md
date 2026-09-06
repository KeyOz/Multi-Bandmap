# API Dokumentation - Multi-Bandmap

Diese Dokumentation beschreibt alle verfügbaren REST-API-Endpunkte und WebSocket-Ereignisse zur Fernsteuerung, Integration in Logging-Programme (z. B. N1MM, Log4OM, UCXLog, Ham Radio Deluxe) und Automatisierung der Multi-Bandmap.

**Basis-URL:** `http://<SERVER-IP>:3000`

---

## Inhaltsübersicht

1. [Frequenz-Steuerung (QRG)](#1-frequenz-steuerung-qrg)
2. [QSO Logging & Manuelle Spots](#2-qso-logging--manuelle-spots)
3. [QSO Worked-Status umschalten / gezielt setzen](#3-qso-worked-status-umschalten--gezielt-setzen)
4. [Worked QSOs & manuelle Spots zurücksetzen](#4-worked-qsos--manuelle-spots-zurücksetzen)
5. [Spot-Historie für ein Rufzeichen abrufen](#5-spot-historie-für-ein-rufzeichen-abrufen)
6. [Systemkonfiguration abrufen](#6-systemkonfiguration-abrufen)
7. [Systemkonfiguration aktualisieren](#7-systemkonfiguration-aktualisieren)
8. [Echtzeit-Schnittstelle (WebSocket)](#8-echtzeit-schnittstelle-websocket)
9. [Praxis-Beispiele & Logging-Integration](#9-praxis-beispiele--logging-integration)
10. [Sicherheitshinweise](#10-sicherheitshinweise)

---

## 1. Frequenz-Steuerung (QRG)

Aktualisiert die aktuelle Frequenz einer bestimmten Spalte (z. B. getriggert von einem Transceiver-CAT-Interface).

**Endpunkt:** `GET /api/qrg/:column/:freq`

### Parameter:
*   **`:column`**: Index der Spalte (`1` bis `5`, entsprechend `col1` bis `col5`).
*   **`:freq`**: Frequenz in MHz (als Fließkommazahl mit Dezimalpunkt, z. B. `144.300` oder `14.074`).

### Verhalten & Automatischer Band-Wechsel:
*   Die Bandmap zentriert bzw. markiert die neue Frequenz in der jeweiligen Spalte mit dem Frequenz-Indikator.
*   Ist in den Einstellungen der **"Autom. Band-Wechsel"** (`autoBandSwitch: true`) aktiv, prüft der Server, ob die Frequenz in ein anderes bekanntes Amateurband (160m, 80m, 40m, 30m, 20m, 17m, 15m, 12m, 10m, 6m, 4m, 2m, 70cm, 23cm) fällt. Ist dies der Fall, schaltet die Spalte automatisch auf das passende Band um und informiert alle Clients.

### Rückgabewert (JSON):
```json
{
  "success": true,
  "columnId": "col1",
  "frequency": 144.3,
  "autoSwitchedTo": "2m"
}
```

### Beispiele:
```bash
# Setzt Spalte 1 auf 144.300 MHz (2m)
curl http://<IP>:3000/api/qrg/1/144.300

# Setzt Spalte 2 auf 14.074 MHz (20m FT8)
curl http://<IP>:3000/api/qrg/2/14.074
```

---

## 2. QSO Logging & Manuelle Spots

Registriert ein gearbeitetes Rufzeichen für ein Band und kann optional einen Frequenzeintrag aktualisieren bzw. als manuellen Spot anlegen. Typischerweise aufgerufen, wenn im Logprogramm ein QSO gespeichert wird.

**Endpunkt:** `GET /api/qso/:band/:call/:freq?`

### Parameter:
*   **`:band`**: Das Band (z. B. `2m`, `70cm`, `20m`, `40m`, `80m`).
*   **`:call`**: Das gearbeitete Rufzeichen (z. B. `DL1ABC`).
*   **`:freq`** *(Optional)*: Frequenz in MHz.

### Verhalten:
1.  **Worked-Status:** Das Rufzeichen wird für das angegebene Band in die persistente Liste der gearbeiteten Stationen aufgenommen (grüne Anzeige).
2.  **Frequenzübernahme (falls `:freq` angegeben):**
    *   *Station existiert bereits in der Spotliste:* Frequenz und Zeitstempel werden aktualisiert; der Status als Cluster-Spot bleibt erhalten.
    *   *Station existiert noch nicht:* Es wird ein **manueller Spot** generiert (`isManual: true`, Spotter: `DF0OT`, Kennzeichnung: gelbe Markierung), damit die Station auf der Bandmap sofort sichtbar ist.

### Rückgabewert (JSON):
```json
{
  "success": true,
  "band": "2m",
  "call": "DL1ABC",
  "totalOnBand": 1,
  "workedCalls": ["DL1ABC"]
}
```

### Beispiele:
```bash
# Markiert DL1ABC auf 2m als gearbeitet
curl http://<IP>:3000/api/qso/2m/DL1ABC

# Markiert DL1ABC auf 2m als gearbeitet und setzt/aktualisiert Spot auf 144.350 MHz
curl http://<IP>:3000/api/qso/2m/DL1ABC/144.350
```

---

## 3. QSO Worked-Status umschalten / gezielt setzen

Erlaubt das gezielte Setzen, Aufheben oder Umschalten (Toggle) des "Gearbeitet"-Status für ein bestimmtes Rufzeichen auf einem Band (auch per REST-POST für Schnittstellen und Skripte).

**Endpunkt:** `POST /api/qso/toggle`  
**Content-Type:** `application/json`

### JSON-Body:
| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `band` | String | Ja | Bandbezeichnung, z. B. `"2m"`, `"20m"`, `"70cm"` |
| `call` | String | Ja | Rufzeichen der Station (Groß-/Kleinschreibung wird automatisch normiert) |
| `worked` | Boolean | Nein | `true`: Als gearbeitet markieren<br>`false`: Als ungearbeitet/offen markieren<br>*Wird das Feld weggelassen, wird der aktuelle Status invertiert (Toggle).* |

### Rückgabewert (JSON):
```json
{
  "success": true,
  "band": "2m",
  "call": "DK0TU",
  "worked": true,
  "totalOnBand": 5,
  "workedCalls": ["DL1ABC", "DK0TU", "..."]
}
```

### Beispiele:
```bash
# 1. Status umschalten (Toggle):
curl -X POST http://<IP>:3000/api/qso/toggle \
  -H "Content-Type: application/json" \
  -d '{"band": "2m", "call": "DK0TU"}'

# 2. Explizit als gearbeitet setzen:
curl -X POST http://<IP>:3000/api/qso/toggle \
  -H "Content-Type: application/json" \
  -d '{"band": "2m", "call": "DK0TU", "worked": true}'

# 3. Gearbeitet-Status aufheben:
curl -X POST http://<IP>:3000/api/qso/toggle \
  -H "Content-Type: application/json" \
  -d '{"band": "2m", "call": "DK0TU", "worked": false}'
```

---

## 4. Worked QSOs & manuelle Spots zurücksetzen

Setzt alle gearbeiteten Stationen auf allen Bändern zurück und entfernt alle manuell generierten Spots. Entspricht der Funktion "Worked QSOs zurücksetzen" in der Web-Oberfläche.

**Endpunkt:** `POST /api/qso/reset`

### Rückgabewert (JSON):
```json
{
  "success": true
}
```

### Beispiel:
```bash
curl -X POST http://<IP>:3000/api/qso/reset
```

---

## 5. Spot-Historie für ein Rufzeichen abrufen

Liefert die letzten bis zu 5 empfangenen DX-Spots für ein bestimmtes Rufzeichen, sortiert vom neuesten zum ältesten.

**Endpunkt:** `GET /api/spots/history/:call`

### Parameter:
*   **`:call`**: Das gesuchte Rufzeichen (z. B. `DP0GVN`).

### Rückgabewert (JSON Array):
```json
[
  {
    "id": "abc123xyz",
    "spotterCall": "OE3XMA",
    "frequency": 144.174,
    "dxCall": "DP0GVN",
    "info": "FT8 +02dB from IB59",
    "timestamp": "2026-09-06T07:15:00.000Z",
    "locator": "IB59UH",
    "distance": 13942,
    "bearing": 182,
    "isManual": false
  }
]
```

### Beispiel:
```bash
curl http://<IP>:3000/api/spots/history/DP0GVN
```

---

## 6. Systemkonfiguration abrufen

Gibt die vollständige, aktuell auf dem Server gespeicherte Systemkonfiguration (`config.json`) zurück.

**Endpunkt:** `GET /api/config`

### Rückgabewert (JSON):
```json
{
  "columns": [
    {
      "id": "col1",
      "name": "2m UKW",
      "band": "2m",
      "visible": true,
      "color": "#38bdf8",
      "centerFreq": 144.3,
      "zoomLevel": 1,
      "continentFilter": ["EU"],
      "continentTarget": "dx"
    }
  ],
  "qthLocator": "JO62QJ",
  "spotRetentionHours": 4,
  "clusterHost": "dxfun.com",
  "clusterPort": 8000,
  "clusterCallsign": "DL1XYZ",
  "autoBandSwitch": true
}
```

### Beispiel:
```bash
curl http://<IP>:3000/api/config
```

---

## 7. Systemkonfiguration aktualisieren

Speichert eine neue oder modifizierte Konfiguration auf dem Server (`config.json`). Änderungen an Cluster-Verbindungsdaten lösen einen automatischen Reconnect aus; eine Änderung des QTH-Locators berechnet Entfernungen und Peilungen aller aktiven Spots neu.

**Endpunkt:** `POST /api/config`  
**Content-Type:** `application/json`

### Rückgabewert (JSON):
```json
{
  "success": true
}
```

### Beispiel:
```bash
curl -X POST http://<IP>:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "qthLocator": "JN58TD",
    "spotRetentionHours": 6,
    "clusterHost": "dxfun.com",
    "clusterPort": 8000,
    "clusterCallsign": "DL2ABC",
    "autoBandSwitch": true,
    "columns": [...]
  }'
```

---

## 8. Echtzeit-Schnittstelle (WebSocket)

Die Anwendung betreibt auf Port 3000 einen integrierten WebSocket-Server zur Echtzeit-Synchronisation aller Browser-Clients.

**WebSocket-URL:** `ws://<SERVER-IP>:3000`

### Bei Verbindungsaufbau gesendete Nachricht (`init`):
```json
{
  "type": "init",
  "status": "CONNECTED",
  "charCount": 128490,
  "spots": [...],
  "workedQSOs": {
    "2m": ["DL1ABC"],
    "20m": ["K1N"]
  },
  "history": ["DX de OE3XMA: 144174.0 DP0GVN ..."]
}
```

### Während der Laufzeit empfangene Ereignisse:
| Ereignis-Typ (`type`) | Nutzlast | Auslöser / Bedeutung |
|---|---|---|
| `spot:new` | `{ "spot": DxSpot }` | Ein neuer DX-Spot wurde empfangen oder manuell erfasst |
| `spots:init` | `{ "spots": DxSpot[] }` | Komplette Neuberechnung / Bereinigung der Spotliste |
| `qso:update` | `{ "workedQSOs": { [band]: string[] } }` | Eine Station wurde geloggt, umgeschaltet oder die Liste zurückgesetzt |
| `column:freq` | `{ "columnId": "col1", "frequency": 144.3 }` | Die QRG einer Spalte wurde über die API geändert |
| `config` | `{ "config": AppConfig }` | Einstellungen wurden serverseitig aktualisiert (z. B. durch Auto-Band-Switch) |
| `status` | `{ "status": "CONNECTED" \| "DISCONNECTED" \| "ERROR" }` | Verbindungsstatus zum Telnet-DX-Cluster |
| `data` | `{ "lines": string[], "charCount": number }` | Rohdaten-Zeilen des Telnet-Clusters (für Terminal / Diagnose-Konsole) |

---

## 9. Praxis-Beispiele & Logging-Integration

### Integration in N1MM Logger+ oder Log4OM
In vielen Log-Programmen können externe URLs bei jedem geloggten QSO aufgerufen werden.

**Beispielhafter Aufruf-String (GET):**
```
http://192.168.1.100:3000/api/qso/{BAND}/{CALL}/{FREQ}
```
*Platzhalter `{BAND}`, `{CALL}` und `{FREQ}` werden vom jeweiligen Logprogramm automatisch eingesetzt.*

### Shell-Skript: Frequenz-Synchronisation (z. B. aus rigctl / hamlib)
```bash
#!/bin/bash
# Liest Frequenz von rigctl und sendet sie alle 2 Sekunden an Spalte 1
SERVER="http://192.168.1.100:3000"

while true; do
  # Frequenz in Hz abfragen (z.B. 144300000)
  FREQ_HZ=$(rigctl -m 1 -r /dev/ttyUSB0 get_freq 2>/dev/null)
  if [ -n "$FREQ_HZ" ]; then
    # Umrechnung in MHz mit 3 Nachkommastellen
    FREQ_MHZ=$(awk "BEGIN {printf \"%.3f\", $FREQ_HZ / 1000000}")
    curl -s "$SERVER/api/qrg/1/$FREQ_MHZ" > /dev/null
  fi
  sleep 2
done
```

---

## 10. Sicherheitshinweise

*   Die API verfügt über keine eingebaute Authentifizierung und ist für den Betrieb im **lokalen Netzwerk (LAN / VPN)** konzipiert.
*   Geben Sie Port 3000 **nicht ungeschützt ins öffentliche Internet frei**.
*   Wird ein Fernzugriff über das Internet benötigt, nutzen Sie einen VPN-Tunnel (z. B. WireGuard, Tailscale) oder einen vorgeschalteten Reverse-Proxy (z. B. Nginx / Caddy) mit HTTPS und HTTP Basic Auth oder OAuth2.

