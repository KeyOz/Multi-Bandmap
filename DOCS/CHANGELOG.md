# Changelog - Multi-Bandmap

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei festgehalten.

---

## [0.3.2] - 2026-09-02
### Hinzugefügt
- **Kanalspezifischer Kontinent-Filter**: Jeder Kanal kann nun gezielt nach Kontinenten (EU, NA, SA, AS, AF, OC, AN) gefiltert werden (z. B. nur Europa für UKW-Bänder 2m/70cm). Schnellauswahl-Presets für „Nur Europa (UKW)“, „Europa & Nordamerika“ und „Alle Kontinente“. Einstellbar auf DX-Station, Spotter oder beide.
- **Kanal-Verwaltung & Konfigurations-Modal**: Neues Menü „Kanäle“ in der oberen Leiste mit Spalten-Sichtbarkeitsschaltern und Schnellaktionen. Ausführliches Konfigurationsfenster mit Reitern für jeden Kanal.
- **Vektorbasierte Landesflaggen (Windows-Unterstützung)**: Umstellung von systemabhängigen Unicode-Schriftart-Emojis auf scharfe Vektor-SVG-Flaggen (`CountryFlag`). Dadurch werden Landesflaggen auch unter Windows 10/11 stets als bunte Grafiken anstelle von Textkürzeln dargestellt.
- **Aktive Filter-Badges**: Direktes Feedback im Spaltenkopf über aktive Kontinent-Filter mit 1-Klick-Öffnen der Kanaleinstellungen und Hinweisen bei gefilterten Spots.

### Verbessert
- **Richtungsanzeige (QTE) vergrößert & kompakte Ausrichtung**: Die Richtungsanzeige (Pfeilsymbol und Gradangabe) in den Band-Spalten wurde um 5 Pixel vergrößert (17px Pfeil, 16px Schriftgröße) für optimale Ablesbarkeit. Um horizontalen Platz zu schaffen, werden Maidenhead-Locator und Entfernung (QRB in km) nun platzsparend übereinander gestapelt links neben der vergrößerten Richtungsplakette dargestellt.

### Behoben
- **Einstellungsfenster (Klick auf Eingabefelder)**: Behoben, dass sich das Einstellungs-Dropdown bei Klick in ein Eingabefeld (Host, Port, Login, QTH-Locator) sofort schloss. Der Dropdown-Container wurde mit `data-dropdown="true"` versehen, die Event-Weiterleitung abgesichert und ein zusätzlicher Speichern-Button sowie Bestätigung per Enter-Taste ergänzt.

## [0.3.1] - 2026-08-30
### Hinzugefügt
- **Akustischer Hinweiston bei Spot-Alarm**: Neue Option in den Einstellungen mit Test-Button zum Abspielen eines dezenten, zweistimmigen Chimes beim Aktivieren einer Alarm-Markierung (Glocken-Icon).
- **Spot-Historie im Tooltip**: Neuer „Historie“-Button in der Spot-Detailansicht (Tooltip). Beim Anklicken wird direkt eine Liste der letzten 5 Spots dieser spezifischen DX-Station über alle Bänder hinweg mit Band, Frequenz, Spotter und UTC-Zeit angezeigt.
- **Spot-Alarm / Visuelle Markierung**: Glocken-Icon in jeder Spot-Zeile zur Stationsmarkierung. Aktivierte Spots erhalten einen pulsierenden Rahmen in der jeweiligen Spalten-Akzentfarbe samt leuchtendem Hintergrund. Sobald die Station als gearbeitet (Worked QSO) erkannt oder geloggt wird, schaltet sich die visuelle Markierung automatisch ab.
- **Flaggen-Schalter**: Neuer Schalter im Anzeige-Menü zum flexiblen Ein- und Ausblenden der Landesflaggen neben den Rufzeichen.

### Verbessert
- **Frequenz-Darstellung**: Frequenzspalte verbreitert und Anzeige auf durchgehend 3 Nachkommastellen formatiert, auch bei Frequenzen über 1000 MHz (z. B. 1296.200 MHz).
- **Layout & Ausrichtung**: Vollständige vertikal mittige Ausrichtung von Frequenz, Rufzeichen und Richtungsangaben in den Band-Spalten.
- **Responsives Verhalten**: Automatisches Ausblenden von Landesflaggen und QRB-Kilometern auf kleinen Monitoren/Displays zur optimalen Platzausnutzung bei dauerhafter Sichtbarkeit von Rufzeichen und Peilungsrichtung (QTE).
- **Locator-Erkennung**: Zusätzliche automatische Erkennung von Maidenhead-Grid-Locators aus Spot-Kommentaren für Spots ohne Datenbankeintrag.

## [0.3.0] - 2026-08-29
### Hinzugefügt
- **Spalten-Farben**: Individuelle Akzentfarben für jede Band-Spalte mit Farbwähler im Spaltenkopf (12 Farbpresets + freier HEX-Color-Picker).
- **Detail-Tooltips**: Vollständige Übernahme der gewählten Spaltenfarbe in den Spot-Detail-Hover-Boxen (Header, Locator-Badge, QRB/QTE-Kennzahlen, Kommentarrahmen).
- **DXCC & Flaggen**: Vollständige Überarbeitung der DXCC-Erkennung mit Länderflaggen für DX- und Spotter-Stationen inklusive umfassender Präfix-Tabelle und Auswertung von Schrägstrich-Rufzeichen (z. B. `EA8/DL1ABC`, `/P`, etc.).
- **QRB & QTE**: Berechnung von Entfernung (in km) und Peilung mit drehendem Richtungspfeil basierend auf dem eigenen QTH-Locator.
- **Dokumentation**: Ausführliche Update-Anleitung (`DOCS/update_guide.md`) für Upgrades von älteren Versionen (z. B. 0.2.3).

## [0.2.4] - 2026-07-27
### Hinzugefügt
- **Konfiguration**: Neues Eingabefeld für den eigenen QTH Locator in den Einstellungen hinzugefügt und dauerhaft abgespeichert.
- **UI**: Eigener QTH Locator wird in der Statuszeile neben dem Rufzeichen in eckigen Klammern angezeigt.

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
