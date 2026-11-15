# Lebensspiel Mekka & Medina – Übergabe für einen neuen Chat

Dieses Dokument ist der Startpunkt für den nächsten Ausbau: ein **freies Lebensspiel in Mekka und Medina** nach dem Hadsch.
Ein „halal Open-World-Spiel“: herumlaufen, Bus/Auto fahren, Ballon fliegen, halal Geld verdienen, Geschäfte eröffnen, Autos kaufen,
Gutes tun – **ohne Gewalt, ohne Verbotenes, respektvoll**. Eigene Spielidee im Genre, **kein Nachbau** eines bestehenden Spiels
(keine Namen, Figuren, Karten, Logos oder Musik anderer Spiele).

Der Nutzer programmiert nicht selbst, testet auf iPhone (Safari/Firefox) und Laptop und spricht Deutsch.
Er lädt das Spiel zusätzlich per FTP auf islamlernen.at/hadsch/ hoch (Ordner `public/hadsch`) → nach jeder Änderung `dist/` als
`hadsch-komplett.zip` packen und schicken.

---

## 1. Ausgangslage (was schon da ist)

Repo `adam1001es/hadsch-spiel` – Three.js 0.170, Vite 5, reines JavaScript. Deployment: Push auf `main` → GitHub Pages
(https://adam1001es.github.io/hadsch-spiel/). Regeln in `CLAUDE.md` gelten weiter (Build vor jedem Commit, Layout-Checks 390×844,
820×1180, 1440×900, Touch + Maus/Tastatur, nach dem Push kurz auf Deutsch berichten).

Bereits gebaut und wiederverwendbar:

| Datei | Inhalt |
|---|---|
| `src/stations/meccaCity.js` | Straßen von Mekka/Medina (`where: 'mecca' \| 'medina'`): Marmor-Fußgängerzone, Läden, Dattelstand, Zamzam, Tauben füttern, Ballon, Bushaltestelle. Erlebnis-Orte in `SPOTS` (Knopf erscheint in der Nähe). |
| `src/world/hejaz.js` | **Eine Landschaft** mit Mekka (0,0), Medina (0,−3400) und kurviger Autobahn (`roadX(z)`, Höhe `H(x,z)`), fahrende Busse. Maßstab stark verkleinert (Anzeige rechnet ×100 → echte km). |
| `src/stations/balloon.js` | Ballonflug in der Hejaz-Welt (Brenner halten = steigen, Reise-Autopilot zur anderen Stadt). Exportiert `city()` (Häuserblöcke), `clockTower()`, `nabawi()`. |
| `src/stations/drive.js` | Busfahrt zwischen den Städten (Kamera hinter dem Bus). |
| `src/stations/kaabaDoor.js`, `kaabaInside.js` | Tür der Kaaba öffnet sich, Innenraum. |
| `src/core/player.js` | Spielfigur (Joystick links, rechts wischen = Umschauen, WASD), Kollision (`circle`, `box`, `rect`, `inside`, `fn`), Posen. |
| `src/world/crowd.js` + `agents.js` | Menschenmengen per InstancedMesh, 3D-Modelle nahe der Kamera; `createAgents()` = Leute laufen Wegpunkte ab (stehen, beten, Dua …). |
| `src/core/ui.js` | HUD, `ui.prompt(label, fn)` (goldener Aktionsknopf), `ui.toast`, `ui.info`, `ui.hold`, Menü-Knopf, „i“-Knopf am Handy. |
| `src/core/multi.js` | Zusammen spielen per Raum-Code (MQTT über WebSocket, HiveMQ). |
| `src/core/sfx.js` | Leise Geräusche (Schritte, Bus, Trinken, Brenner …), alles im Browser erzeugt. |
| `src/core/stations.js` | Szenenwechsel: `ctx.city(from, where)`, `ctx.balloon(where)`, `ctx.drive(from, to)`, `ctx.reward()` (Kaaba). |
| `public/assets/models/` | Bus, Ballon, Maqam, Pilger/Pilgerinnen (Tripo/Sketchfab, Quellen in `README.md` dort). |

Einstieg zum Testen: `…/#mekka`, `…/#medina`, `…/#ballon`, `…/#kaaba`.

---

## 2. Ziel: Lebensspiel

### Kernidee
Freie Welt Mekka ↔ Medina. Man **sieht sofort, was man tun kann**: alles Interaktive bekommt ein **leichtes Randleuchten**
(goldener Umriss/Fresnel-Glow), sobald man in der Nähe ist – Bus, Autotür, Ballonkorb, Dattelstand, Zamzam-Spender, Ladentür,
Job-Tafel, Tauben … Antippen bzw. goldener Knopf = Handlung. **Keine Aufgabenpfeile, keine Pflichtmissionen** – Erleben.

### Randleuchten (technischer Vorschlag)
- Ein gemeinsames Modul `src/life/interact.js`: Liste von Objekten `{ obj, label, radius, run, glowColor }`.
- In der Nähe (z. B. < 6 m): Glow einblenden, in < 2,5 m den Aktionsknopf zeigen.
- Glow günstig: zweite, leicht vergrößerte Kopie (`BackSide`, additiv, Fresnel im Shader, pulsiert sanft) **oder** emissive
  Farbe hochfahren. Kein Postprocessing (OutlinePass) – zu teuer für alte Handys.
- Farbcode: Gold = benutzen, Grün = kaufen/verdienen, Blau = fahren/reisen.

### Halal Geld & Wirtschaft (Ideen)
- **Jobs**: Taxi-/Busfahrer (Pilger zu Zielen bringen), Datteln verkaufen, Zamzam an Pilger verteilen (Sadaqa, kein Lohn, aber
  „Hasanat“-Punkte), Lieferdienst, Reiseführer (Quizfragen beantworten), Gebetsteppiche/Tasbih im Laden verkaufen.
- **Geschäfte eröffnen/ausbauen**: Dattelladen, Parfümladen (Oud), Buchladen, Restaurant – Einkommen pro Spielzeit, Mitarbeiter.
- **Kaufen**: Autos (eigene, erfundene Modelle – keine echten Marken/Logos), Wohnungen, Laden-Upgrades.
- **Islamische Regeln im Spiel**: kein Zins (Riba), kein Glücksspiel, kein Diebstahl, keine Gewalt, keine Waffen, keine Polizei-
  Verfolgungsjagden. Ehrlicher Handel (Waage, faire Preise) wird belohnt. **Zakat** einmal pro „Jahr“ (2,5 % über dem Nisab) als
  Spielmechanik mit Erklärung. Sadaqa gibt Hasanat-Punkte (zweite Währung neben Riyal).
- Gebetszeiten: Adhan ertönt, Läden schließen kurz, wer zum Gebet geht, bekommt Hasanat.

### Fahren & Reisen
- Bus (vorhanden), eigenes Auto (fahrbar mit Joystick/WASD), Taxi, Ballon (vorhanden), optional Schnellzug Mekka–Medina.
- **Autos fahren niemanden um**: Fußgänger weichen aus bzw. das Auto bremst automatisch.

### Orte (Beispiele)
- Mekka: Straßen um die Haram, Uhrturm, Markt, Jabal an-Nur (Höhle Hira, Lerntext), Hotels, Tankstelle, Autohaus.
- Medina: Masjid an-Nabawi (von außen), Dattelplantagen, Quba-Moschee, Uhud-Berg (Lerntext).
- Respekt: Moscheen/Kaaba nur würdevoll, keine „Spaß“-Aktionen dort; vereinfachte Darstellung, keine echten Personen.

### Zusammen spielen (Multiplayer) – Pflicht
Das Lebensspiel muss von Anfang an **gemeinsam spielbar** sein – auf `src/core/multi.js` aufbauen (Raum-Code, MQTT über
WebSocket, HiveMQ; funktioniert im Mobilfunk und in Schul-WLANs; keine Namen, kein Chat, kein Konto).
- Mitspieler sieht man überall im Lebensspiel (Straßen, Autobahn, Medina), auch **in Fahrzeugen**: eigenes Auto, Bus, Ballon
  der anderen am Himmel. Dazu `myState()` um Fahrzeug-Typ und -Position erweitern (z. B. `v: 'car' | 'bus' | 'balloon'`).
- Gemeinsame Aktionen: zusammen in einem Auto/Bus mitfahren (Beifahrer), gemeinsam einen Laden betreiben, sich gegenseitig
  Datteln/Zamzam schenken (Sadaqa), gemeinsam zum Gebet gehen.
- Geld/Besitz bleibt pro Gerät (localStorage); im Raum wird nur übertragen, was die anderen sehen müssen.
- Kein Wettbewerb gegeneinander mit Schaden, kein Stehlen – nur Kooperation und freundlicher Vergleich (z. B. Hasanat-Tafel).
- Datenschutz: öffentlicher Server → nur Spieldaten, nie Namen; ein eigener Server für Schulen ist später möglich.

### Speichern
Spielstand (Geld, Hasanat, Besitz, Position) in `localStorage` (`hp-life`), mit Versionsnummer.

---

## 3. Leitplanken

- **Leistung**: muss auf alten Handys laufen. InstancedMesh, wenige Lichter, keine Schatten für Kleinkram, Modelle stark
  vereinfachen (siehe `tools/convert_*.html` – Tripo-Modelle haben ~2 Mio. Flächen → auf 5–15 Tsd. reduzieren).
- **Bedienung**: Figur nie verdecken (Knöpfe oben, „i“-Knopf am Handy), alles per Touch und Tastatur.
- **Inhalte**: Islamische Texte (Hadith, Dua, Ayat) nur korrekt und mit Quelle; Unsicheres als „vom Nutzer prüfen lassen“ markieren.
- **Keine Inhalte aus `src/content/hajj.js` ändern**, ohne dass der Nutzer es verlangt; neue Texte in eigene Datei
  `src/content/life.js`.
- Hadsch-Teil (12 Stationen) bleibt unverändert lauffähig; das Lebensspiel hängt sich an `ctx.city()` an.
- Eine Sache pro Schritt bauen, testen (Playwright-Screenshots), committen, pushen, ZIP schicken, auf Deutsch berichten.

---

## 4. Vorgeschlagene Reihenfolge

1. ✅ `interact.js` mit Randleuchten + Aktionsknopf; bestehende SPOTS (Datteln, Zamzam, Tauben, Ballon, Bus) darauf umstellen.
   Fertig: `src/life/interact.js` – `createInteract(ctx, player)`, dann `add({ obj|objs, label, run, color: 'gold'|'green'|'blue', x, z, radius, near, push, when })`,
   `update(dt)` im Loop, `dispose()`. Leuchten = Fresnel-Kopie je Mesh (teilt Geometrie/Instanzen), additiv, Tiefentest an (verdeckt die Figur nicht).
   Der Aktionsknopf übernimmt die Farbe (`ui.prompt(..., { tone })`).
   Multiplayer: Leuchten und Knopf sind lokal (jeder sieht sie nur für sich), Mitspieler bleiben sichtbar und werden nicht
   überstrahlt (getestet mit lokalem MQTT-Broker, `?mqtt=ws://127.0.0.1:8888`). Später können Mitspieler selbst ein Ziel sein:
   `interact.add({ obj: figur.root, color: 'green', label: 'Datteln schenken', … })` – der Aktionspunkt folgt bewegten Objekten.
2. Geldanzeige (Riyal + Hasanat) und Speichern; Multiplayer in allen Lebensspiel-Orten prüfen (Mitspieler sichtbar, auch in Fahrzeugen).
3. Erster Job: Datteln verkaufen am Stand (kleines Minispiel), dann Zamzam verteilen (Sadaqa).
4. Größere Stadt: mehrere Straßen/Plätze statt einer Straße, Kreuzungen, Ampeln.
5. Eigenes Auto kaufen und fahren (Autohaus, erfundene Modelle).
6. Laden eröffnen + Einkommen, Zakat-Mechanik.
7. Taxi-Job, Ausflugsziele (Jabal an-Nur, Quba, Uhud) mit Lerntexten.
8. Gebetszeiten/Adhan im Tagesablauf.
