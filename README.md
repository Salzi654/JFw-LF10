# LF 10 – Jugendfeuerwehr Harsewinkel (Starter)

Dieses Repository ist ein **lauffähiges Entwicklungsgerüst**, noch nicht die fertige, originalgetreue Website. Die 3D-Szene ist bewusst ein Platzhalter: keine Fahrzeugdetails oder Ausrüstungspositionen wurden als echt ausgegeben.

## Voraussetzungen
- Node.js 20 oder neuer
- npm

## Lokal starten
```bash
npm install
cp .env.example .env
# SESSION_SECRET und ADMIN_SETUP_KEY in .env durch lange, zufällige Werte ersetzen
npm run dev
```
Frontend: http://localhost:5173  
API: http://localhost:3001/api/health

Die Datenbank wird beim ersten Start unter `data/lf10.sqlite` angelegt.

## Erstes Admin-Konto sicher anlegen
1. `.env` lokal mit einem langen zufälligen `ADMIN_SETUP_KEY` und `SESSION_SECRET` konfigurieren.
2. Server starten.
3. Einmalig den Setup-Endpunkt aufrufen, z. B. mit curl:
```bash
curl -X POST http://localhost:3001/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"setupKey":"DEIN_SETUP_KEY","username":"admin","password":"EIN_LANGES_EINMALIGES_PASSWORT"}'
```
4. Nach erfolgreicher Einrichtung den `ADMIN_SETUP_KEY` aus der produktiven Umgebung entfernen und den Server neu starten.
5. Das Admin-Passwort niemals in Quellcode, GitHub oder Frontend-Dateien schreiben.

**Wichtig:** Das Admin-Setup ist serverseitig abgesichert, aber das Admin-Login-UI und die Verwaltungsoberfläche müssen noch ergänzt werden. Vor öffentlichem Hosting zusätzlich HTTPS, persistenten Session-Store, CSRF-Schutz, Backups und Produktionskonfiguration einrichten.

## Einladungscodes
Die API enthält Endpunkte für das Erstellen, Auflisten, Aktivieren/Deaktivieren und Löschen von Codes. Admin-Endpunkte verlangen eine Admin-Sitzung. Das Admin-UI dafür ist noch nicht gebaut. Codes werden gehasht gespeichert; der Klartext wird nur beim Erstellen einmal zurückgegeben. Die Oberfläche zur Anzeige/Kopie muss diesen Wert dann sofort anzeigen.

## Aktueller Stand
- Interaktive Three.js-Szene mit Drehen/Zoomen
- Anklickbare Platzhalter-Geräteräume mit Öffnen/Schließen
- Suchfeld für Bereiche
- einfache Lern-/Quiz-Platzhalter
- API mit SQLite, Einladungscodeprüfung, Admin-Ersteinrichtung und grundlegenden Verwaltungs-Endpunkten
- **Noch nicht fertig:** fotorealistisches Fahrzeugmodell, reale Rollladenmechanik, Mannschaftskabine und Sitz-Stauräume, echte Ausrüstungsdaten, vollständige Admin-Oberfläche, vollständige Quizlogik, Deployment- und Sicherheitshärtung

## Backup
Vor Updates Server stoppen und `data/lf10.sqlite` sowie hochgeladene Bilder sichern. In Produktion automatische, getestete Backups verwenden. Niemals `data/` oder `.env` in Git committen.
