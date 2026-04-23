# API Dokumentation - Multi-Bandmap

Diese Dokumentation beschreibt die verfügbaren API-Endpunkte zur Fernsteuerung und Integration der Applikation.

## 1. Frequenz-Steuerung (QRG)

Aktualisiert die aktuelle Frequenz einer bestimmten Spalte.

**Endpunkt:** `GET /api/qrg/:column/:freq`

*   **`:column`**: Index der Spalte (1 bis 5).
*   **`:freq`**: Frequenz in MHz (Dezimalpunkt verwenden).

**Besonderheit:**
Wenn in den Einstellungen der **"Autom. Band-Wechsel"** aktiviert ist, schaltet die Spalte automatisch auf das entsprechende Amateurband um, falls die Frequenz in einen neuen Bereich fällt.

**Beispiel:**
```bash
# Setzt Spalte 1 auf 144.300 MHz
curl http://<IP>:3000/api/qrg/1/144.300
```

---

## 2. QSO Logging & Manuelle Spots

Markiert ein Rufzeichen als "gearbeitet" (Worked) und erstellt/aktualisiert optional einen Frequenzeintrag.

**Endpunkt:** `GET /api/qso/:band/:call/:freq?`

*   **`:band`**: Das Band (z.B. `2m`, `70cm`, `20m`).
*   **`:call`**: Das Rufzeichen (Callsign).
*   **`:freq`** *(Optional)*: Frequenz in MHz.

**Verhalten:**
1.  Das Rufzeichen wird für das angegebene Band in die **"Worked"-Liste** aufgenommen (Farbe: Grün).
2.  Wenn eine **Frequenz** mitgegeben wird:
    *   Ist das Rufzeichen bereits in der DX-Spot-Liste, wird lediglich dessen **Frequenz aktualisiert** (der Eintrag bleibt im Cluster-Design).
    *   Ist das Rufzeichen noch nicht vorhanden, wird ein **Manueller Spot** angelegt (Farbe: Gelb, Spotter: `DF0OT`).

**Beispiel:**
```bash
# Markiert DL1ABC auf 2m als gearbeitet
curl http://<IP>:3000/api/qso/2m/DL1ABC

# Markiert DL1ABC als gearbeitet und setzt/erzeugt einen Spot auf 144.350 MHz
curl http://<IP>:3000/api/qso/2m/DL1ABC/144.350
```

---

## 3. Worked QSOs zurücksetzen

Löscht alle gearbeiteten Stationen und entfernt alle manuell erstellten Spots.

**Endpunkt:** `POST /api/qso/reset`

**Beispiel:**
```bash
curl -X POST http://<IP>:3000/api/qso/reset
```

---

## 4. Konfiguration abrufen

Gibt die aktuelle Systemkonfiguration im JSON-Format zurück.

**Endpunkt:** `GET /api/config`

**Beispiel:**
```bash
curl http://<IP>:3000/api/config
```

---

## Sicherheitshinweis
Die API ist aktuell ohne Authentifizierung im lokalen Netzwerk erreichbar. Stellen Sie sicher, dass der Port 3000 nur für autorisierte Geräte zugänglich ist.
