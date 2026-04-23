# Changelog - Multi-Bandmap

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei festgehalten.

---

## [0.2.3] - 2026-04-23
### Geändert
- **UI**: Statuszeile aktualisiert (Cluster-Adresse hinzugefügt, Byte-Counter entfernt, Copyright auf DD6ZJ geändert).
- **UI**: Statusmeldungen im System-Log werden nun gelb dargestellt, um sie von DX-Spots abzuheben.

## [0.2.2] - 2026-04-23
### Hinzugefügt
- **Konfiguration**: DX-Cluster Host, Port und Rufzeichen sind jetzt über das Einstellungsmenü konfigurierbar.
- **Feature**: Optionaler Login am Cluster. Wenn das Rufzeichen leer ist, wird kein Login-Kommando gesendet.
- **Stabilität**: Automatischer Reconnect zum Cluster bei Konfigurationsänderungen.

## [0.2.1] - 2026-04-23
### Geändert
- **Branding**: App-Name in "Multi-Bandmap" geändert.
- **UI**: Versionsnummer oben links neben dem App-Namen hinzugefügt.
- **Dokumentation**: API-Dokumentation und Proxmox-Anleitung aktualisiert.

## [0.2.0] - 2026-04-23
### Hinzugefügt
- **API**: Neuer Endpunkt `/api/qrg/` für Frequenz-Updates.
- **Feature**: Automatischer Band-Wechsel bei Frequenzänderung (ein-/ausschaltbar).
- **Dokumentation**: Ersteinrichtung der `DOCS` mit Proxmox- und API-Anleitungen.

### Behoben
- **Stabilität**: Flackern beim Laden neuer Daten behoben (Vite-Watcher für Datendateien deaktiviert).
- **Stabilität**: WebSocket-Verbindung wird bei Einstellungsänderungen nicht mehr zurückgesetzt.
- **Performance**: Optimierte Berechnung der Spot-Listen zur Reduzierung der UI-Last.
