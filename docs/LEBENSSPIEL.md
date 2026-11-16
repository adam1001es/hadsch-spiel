# Lebensspiel Mekka & Medina – Übergabe für einen neuen Chat

Dieses Dokument ist der Startpunkt für den nächsten Ausbau: ein **freies Lebensspiel in Mekka und Medina** nach dem Hadsch.
Ein „halal Open-World-Spiel“: herumlaufen, Bus/Auto fahren, Ballon fliegen, halal Geld verdienen, Geschäfte eröffnen, Autos kaufen,
Gutes tun – **ohne Gewalt, ohne Verbotenes, respektvoll**. Eigene Spielidee im Genre, **kein Nachbau** eines bestehenden Spiels
(keine Namen, Figuren, Karten, Logos oder Musik anderer Spiele).

Der Nutzer programmiert nicht selbst, testet auf iPhone (Safari/Firefox) und Laptop und spricht Deutsch.
Das Spiel läuft unter **https://hadsch.islamlernen.at** (GitHub Pages mit eigener Domain, `public/CNAME`): Push auf `main` genügt.
**Keine ZIP-Datei mehr schicken** (FTP wird nicht mehr gebraucht).

---

## 1. Ausgangslage (was schon da ist)

Repo `adam1001es/hadsch-spiel` – Three.js 0.170, Vite 5, reines JavaScript. Deployment: Push auf `main` → GitHub Pages
(https://adam1001es.github.io/hadsch-spiel/). Regeln in `CLAUDE.md` gelten weiter (Build vor jedem Commit, Layout-Checks 390×844,
820×1180, 1440×900, Touch + Maus/Tastatur, nach dem Push kurz auf Deutsch berichten).

Bereits gebaut und wiederverwendbar:

| Datei | Inhalt |
|---|---|
| `src/stations/meccaCity.js` | Mekka/Medina nach echtem Stadtplan (Koordinaten wie Hadsch-Stationen, Moschee bei 0,0, Süden +z): Mekka = Haram-Modell, Marmorplatz, Abraj al-Bait, Ibrahim-al-Khalil-Boulevard mit Läden, Querstraße mit Verkehr, Südplatz (Bus, Ballon, Bauhof-Wegweiser). Medina = Nabawi, Vorplatz mit Schirmen, Hotels, König-Faisal-Boulevard, Straße, Platz. `LAYOUT` je Stadt. Erlebnis-Orte leuchten (interact.js), Infotafeln an Wahrzeichen. |
| `src/life/clock.js`, `prayer.js`, `minimap.js` | **Spieluhr** (1 Spielstunde = 90 s, `hp-life-clock`, Tag/Nacht), **Gebete** (Zeiten in `content/life.js` PRAYERS, Adhan-Text mit Quelle, Aufnahme `public/assets/audio/adhan.mp3` falls vorhanden, sonst Hinweiston; `prayer.spot()` für Orte zum Beten, Halte-Handlung zur Qibla, Gemeinschaftsgebet `gathering`), **Karte** (Kreis oben rechts, große Karte mit Zoom/Verschieben, Orte → Hinführen per `player.guideTo`). Jede Lebensspiel-Station ruft `showMinimap(ctx, info)` und `createPrayer(...)` auf. |
| `src/stations/haramVisit.js`, `nabawiVisit.js` | Frei in der Haram (Kaaba, Tawaf-Rundenzähler, Gebetskreise) und in der Prophetenmoschee (Säulenhalle, Rawda mit Hadith-Quelle, Minbar, Reihen zur Qibla). Erreichbar über die Eingangsschilder auf den Plätzen. |
| `src/world/cityscape.js` | **Stadtbausteine (Lebensspiel):** Hochhäuser per InstancedMesh mit Fassaden in Metern (Stile mecca/glass/medina, Ladensockel, Rücksprünge), `abrajAlBait()` (601 m, Uhr zeigt Spielzeit), `createTraffic()` (Autos/Taxis/Busse, Ampel, Zebrastreifen, bremsen für Menschen), `umbrellas()` (Nabawi-Schirme), `walkable()` (Vereinigung von Rechtecken). |
| `src/world/hejaz.js` | **Eine Landschaft** mit Mekka (0,0), Medina (0,−3400) und kurviger Autobahn (`roadX(z)`, Höhe `H(x,z)`), fahrende Busse. Maßstab stark verkleinert (Anzeige rechnet ×100 → echte km). |
| `src/stations/balloon.js` | Ballonflug in der Hejaz-Welt (Brenner halten = steigen, Reise-Autopilot zur anderen Stadt). Exportiert `city()` (Häuserblöcke), `clockTower()`, `nabawi()`. |
| `src/stations/drive.js` | Busfahrt zwischen den Städten (Kamera hinter dem Bus). |
| `src/stations/kaabaDoor.js`, `kaabaInside.js` | Tür der Kaaba öffnet sich, Innenraum. |
| `src/core/player.js` | Spielfigur (Joystick links, rechts wischen = Umschauen, WASD), Kollision (`circle`, `box`, `rect`, `inside`, `fn`), Posen. |
| `src/world/crowd.js` + `agents.js` | Menschenmengen per InstancedMesh, 3D-Modelle nahe der Kamera; `createAgents()` = Leute laufen Wegpunkte ab (stehen, beten, Dua …). |
| `src/core/ui.js` | HUD, `ui.prompt(label, fn)` (goldener Aktionsknopf), `ui.toast`, `ui.info`, `ui.hold`, Menü-Knopf, „i“-Knopf am Handy. |
| `src/core/multi.js` | Zusammen spielen: alle Online-Spieler am selben Ort automatisch sichtbar (Anfangsbuchstabe), optional privater Raum (MQTT über WebSocket, HiveMQ). |
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

### Spiel-Übersicht: eine Welt, viele Dinge zum Ausprobieren
Alles liegt in **einer** zusammenhängenden Welt (Hejaz-Landschaft aus `hejaz.js`) mit **einem** Stil: halbrealistisch, warme
Sandfarben, weiche Low-Poly-Formen, PBR-Material. Unterschiedlich sind die **Tätigkeiten**, nicht die Grafikstile. Man erreicht
jeden Ort zu Fuß, mit Bus, Taxi, eigenem Auto oder Ballon; Schilder an der Straße zeigen, was dort wartet (kein Pfeil, kein Zwang).

| Zone | Wo | Was man dort tut | Art |
|---|---|---|---|
| **Altstadt & Markt** | Mekka/Medina, Straßen um die Moschee | Datteln, Zamzam, Tauben, Läden besuchen, kleine Jobs (Datteln verkaufen, Zamzam verteilen) | Erleben, erste Riyal/Hasanat |
| **Geschäftsviertel** | Hochhäuser bei Mekka | Büro im Wolkenkratzer: bewerben (Fragen beantworten), arbeiten (Minispiele: Lager, Kasse, Buchhaltung), handeln (fair, ohne Zins), später eigene Firma | realistischer Alltag, Geld |
| **Autohaus & Tankstelle** | Stadtrand an der Autobahn | Autos ansehen, kaufen (erfundene Modelle), tanken, Taxi-Job annehmen | kaufen/fahren |
| **Wohnen** | Wohnviertel | eigene Wohnung kaufen/einrichten, Spielstand „zu Hause“ | Besitz |
| **Sandstein-Bauhof** ✅ (erste Version) | Wüste außerhalb der Stadt; Wegweiser in Mekka, `#bauhof` | Bauspiel mit **Sandstein- und Lehmziegeln** auf einem Raster: Häuser, Brunnen, Mauern frei bauen, zusammen mit Mitspielern; fertige Häuser kann man vermieten (Einkommen) | Kreativ-Bauen (eigene Idee, kein Nachbau eines Block-Spiels) |
| **Oase & Dattelplantage** | bei Medina | ernten, sortieren, verkaufen; Bewässerung | Arbeit/Natur |
| **Ausflugsziele** | Jabal an-Nur, Quba, Uhud | hinfahren/hinwandern, Lerntext lesen | Lernen |
| **Himmel** | überall | Ballonflug zwischen den Städten | Reisen |

**Menü-Regel (Nutzer):** Im Startmenü steht nur „Die Straßen von Mekka und Medina“. Alle neuen Bereiche erscheinen **in der Welt**
(leuchtende Wegweiser in Mekka und Medina, später an der Autobahn) – nie als eigener Menüpunkt.

Ein gemeinsames Fundament für alle Zonen: `interact.js` (Randleuchten), Geld/Hasanat (`hp-life`), Multiplayer (`multi.js`),
dieselbe Spielfigur und Steuerung. Neue Zonen hängen sich als Ort in der Hejaz-Welt an, nicht als eigenes Spiel.

**Sandstein-Bauhof (gebaut):** `src/stations/buildyard.js`, Texte in `src/content/life.js`. Raster 240×240 Zellen à 0,5 m (120 × 120 m), 48 Lagen (24 m), Speicherstand v2 (v1 wird in die Mitte übernommen);
6 Baustoffe mit eigenen Canvas-Texturen (Sandstein, Lehmziegel, Korallenstein, Marmor, Palmholz, Fliese), ein InstancedMesh je Baustoff.
Tippen/Klicken = Stein setzen bzw. abbauen (Voxel-Strahl, Reichweite 12 m), Stapel am Rand leuchten (Material nehmen), Figur steigt eine
Stufe hoch, Mauern halten auf. Speichern: `hp-bauhof` bzw. `hp-bauhof-raum-<Code>`. Zusammen bauen nur im privaten Raum:
`multi.send/on` (Ereignisse `b` = Stein, `bq`/`bs` = Bau anfragen/schicken); öffentlich baut jeder für sich (kein Kaputtmachen durch Fremde).
Später: Häuser vermieten (Einkommen), Bauaufträge, Dach-/Treppenteile, Wegweiser an der Autobahn in der Hejaz-Welt.

### Modelle vom Nutzer (Sketchfab)
- Format: **GLB, Texture size 1k**. Vor dem Einbau verkleinern (Ziel 1–2 MB je Modell, 5–15 Tsd. Flächen), Quelle + Lizenz in
  `public/assets/models/README.md` und in der Anleitung nennen (CC BY: Name des Erstellers + Link).
- **Nicht verwenden**: Modelle aus anderen Spielen oder in deren Look (z. B. Karten mit originalen Block-Texturen eines bekannten
  Bauspiels – die Texturen gehören dem Spielehersteller, auch wenn das Modell als CC BY markiert ist), echte Automarken/Logos,
  echte Personen, „Editorial“-Lizenzen.
  Abgelehnt: „Minecraft 3D Map Desert Village“ (HuyAC) – enthält den Original-Texturatlas des Spiels; stattdessen eigener
  Sandstein-Bauhof mit eigenen Texturen.

### Zusammen spielen (Multiplayer) – Pflicht
Das Lebensspiel muss von Anfang an **gemeinsam spielbar** sein – auf `src/core/multi.js` aufbauen (Raum-Code, MQTT über
WebSocket, HiveMQ; funktioniert im Mobilfunk und in Schul-WLANs; keine Namen, kein Chat, kein Konto).
- **Ohne Raum**: Alle, die gleichzeitig online sind, sehen sich automatisch am selben Ort (eigenes MQTT-Thema je Ort,
  höchstens die 14 nächsten werden gezeigt). Über dem Kopf nur der **Anfangsbuchstabe** des Vornamens. Optional privater Raum per Code.
  Abschaltbar im Menü (settings.online).
- Mitspieler sieht man überall im Lebensspiel (Straßen, Autobahn, Medina), auch **in Fahrzeugen**: eigenes Auto, Bus, Ballon
  der anderen am Himmel. Dazu `myState()` um Fahrzeug-Typ und -Position erweitern (z. B. `v: 'car' | 'bus' | 'balloon'`).
- Gemeinsame Aktionen: zusammen in einem Auto/Bus mitfahren (Beifahrer), gemeinsam einen Laden betreiben, sich gegenseitig
  Datteln/Zamzam schenken (Sadaqa), gemeinsam zum Gebet gehen.
- Geld/Besitz bleibt pro Gerät (localStorage); im Raum wird nur übertragen, was die anderen sehen müssen.
- Kein Wettbewerb gegeneinander mit Schaden, kein Stehlen – nur Kooperation und freundlicher Vergleich (z. B. Hasanat-Tafel).
- Datenschutz: öffentlicher Server → nur Spieldaten, nie Namen; ein eigener Server für Schulen ist später möglich.

### Fahrzeuge: selbst fahren oder automatisch (Wunsch des Nutzers)
Der Nutzer liefert eigene 3D-Modelle (Tripo): **Autos, Helikopter, Fahrrad, E-Scooter** (dazu Bus und Ballon, schon vorhanden).
Für **jedes** Fahrzeug gibt es immer zwei Möglichkeiten:
- **Selbst steuern**: Joystick/WASD lenken, Gas/Bremse (Auto, Bus, Fahrrad, E-Scooter); Helikopter zusätzlich steigen/sinken
  (Halten-Knopf wie beim Ballon). Fußgänger werden nie angefahren (automatisch bremsen/ausweichen).
- **Automatisch fahren lassen**: Ziel wählen (z. B. „Nach Medina“, „Zur Masjid an-Nabawi“, „Zum Bauhof“), das Fahrzeug fährt
  allein die Straße/Autobahn entlang (Helikopter/Ballon fliegen direkt), man kann sich umschauen; jederzeit übernehmen = selbst steuern.
- Umschalten per Knopf „Selbst fahren / Automatisch“ (wie Autopilot im Hadsch-Teil, `createAutopilot` in `src/core/kit.js`).
- Strecke Mekka ↔ Medina: Autobahn aus `src/world/hejaz.js` (`roadX(z)`) bzw. das Straßennetz der Städte (`createTraffic`).
- Einsteigen über Randleuchten (Blau = fahren). Die Hauptfigur sitzt sichtbar im/auf dem Fahrzeug (Pose `sit`, Skelett in `src/core/rigged.js`).
- Modelle verkleinern wie gehabt (`tools/convert_bus2.html`: Ausrichtung Front +z, Länge in Metern, ~10–15 Tsd. Flächen).
- Multiplayer: Fahrzeug-Typ und Position mitsenden, andere sieht man im Fahrzeug.

- **Autos fertig vorbereitet:** `public/assets/models/cars/*.glb` (10 Stück, siehe README dort, CC BY 4.0 Comrade1280): Front +z,
  Räder `wheel_fl/fr/rl/rr` einzeln drehbar. Sportwagen = `sport.glb` (kein Markenauto verwenden).
- **Motorrad fertig vorbereitet:** `public/assets/models/vehicles/motorbike.glb` (CC BY 4.0 Yakpower, Markenschriftzug entfernt, Front +z, 2 m) – im Spiel „Motorrad“ nennen.
- **Weitere Fahrzeuge fertig:** `vehicles/escooter.glb`, `vehicles/bicycle.glb`, `vehicles/ebike.glb`, `vehicles/dirtbike_<farbe>.glb` (6 Farben, Räder drehbar), `vehicles/helicopter.glb` – Details in `public/assets/models/vehicles/README.md`.
- **Lizenzen:** nur CC BY oder CC0 (kein NC = nicht-kommerziell, kein SA nötig), keine echten Marken (Porsche, Hubschrauber-Hersteller …).

### Amanah-Ausleihe (Wunsch des Nutzers) – so kommt man an Fahrzeuge
Fahrzeuge sind **leicht zu finden** und werden **ausgeliehen**, nicht gestohlen (Amanah = anvertrautes Gut):
- Fahrende Autos/Motorräder/Busse im Verkehr (`createTraffic`) und geparkte Fahrzeuge leuchten blau, wenn man nah ist.
- Knopf „✋ Anhalten & fragen“ → Fahrzeug hält an, Fahrer steigt kurz aus, kurze Sprechblase
  („Salam! Darf ich dein Auto ausleihen?“ – „Wa alaikum salam, gern – es ist eine Amanah, bring es gut zurück!“), alles in 1–2 s.
- Spieler steigt ein (Figur sichtbar sitzend), Fahrer wartet am Straßenrand oder geht zu Fuß weiter.
- Fahren: **selbst steuern** oder **automatisch** (Ziel wählen, z. B. Masjid an-Nabawi, Medina, Bauhof); jederzeit umschalten.
- „Zurückgeben“-Knopf: Fahrzeug wird ordentlich abgestellt, Fahrer bedankt sich; ehrliches Zurückgeben gibt Hasanat.
  Wer das Fahrzeug weit weg stehen lässt, bekommt einen freundlichen Hinweis (keine Strafe, kein Diebstahl, keine Verfolgung).
- Gilt für Autos (`public/assets/models/cars/*.glb`), Motorrad (`vehicles/motorbike.glb`), Bus (`bus.glb`),
  Helikopter: `public/assets/models/vehicles/helicopter.glb` (CC BY 4.0 surveytown, Rotoren `rotor_main`/`rotor_tail` drehbar). Das MD-902 (CC BY-NC) nicht verwenden.
- Zusätzlich an festen Orten (Taxistand/Parkplatz am Haram, Busbahnhof) ein Fahrzeug, damit man immer schnell eins findet.
- ✅ **Gebaut (erste Version):** `src/life/vehicles.js` (`makeVehicle(world, kind, { driver })`: Modelle laden/klonen, Scheiben
  durchsichtig, Räder drehen `roll(v, dt, steer)`, Motorrad-Räder aus der Form erkannt, `seat()` = Sitzplatz, `SPEC` je Fahrzeug),
  `src/life/borrow.js` (`createBorrow(ctx, { player, interact, traffic, stands, area, people, destinations, route, map, where })`:
  Anhalten & fragen mit Sprechblasen, Taxistand, Fahrmodus über `player.ride`, selbst/automatisch, Fußgänger-Bremse, Aussteigen,
  Zurückgeben mit Dank bzw. freundlichem Hinweis + Kartenziel, Fahrt in die andere Stadt über `ctx.drive(from, to, { vehicle })`,
  Ankunft im Fahrzeug `arriveWith`). `createTraffic` nutzt die echten Modelle (`hold/take/giveBack`). Haltungen `drive`/`ride`
  in `rigged.js`/`player.js`. Multiplayer: `myState().v` = Fahrzeug, Mitspieler sitzen sichtbar im Fahrzeug.
  Taxistand: Mekka am Südplatz (30 | 501), Medina (75 | 461). Helikopter noch nicht eingebaut. Gute Taten: `hp-life.amanah`.

### Wünsche des Nutzers zu Fahrzeugen und Freiheit (verbindlich)
- **Einfache Steuerung**: beim Fahren vier große Knöpfe **Vor ▲, Zurück ▼, Links ◀, Rechts ▶** (Touch, gedrückt halten);
  am Laptop W/A/S/D bzw. Pfeiltasten. Beim Helikopter/Ballon zusätzlich **Hoch** und **Runter**. Kein komplizierter Joystick nötig.
- **Keine Sperren**: Die Figur darf zu Fuß und mit jedem Fahrzeug **überall** hin – keine unsichtbaren Wände, keine gesperrten
  Straßen oder Bereiche, auch in die Wüste und auf die Berge (Motorrad/Geländewagen!). Nur echte Hindernisse (Gebäude) blockieren.
- **Helikopter darf überall landen**, nur **nicht direkt auf der Kaaba und nicht auf der Prophetenmoschee** (dort sanft abweisen
  mit kurzem Hinweis). Auch keine Landung mitten auf dem Mataf/in Moscheen (Respekt).
- **Fahrzeuge immer in der Nähe**: Egal wo die Figur ist (Stadt, Autobahn, Wüste) – in wenigen Metern steht immer ein
  E-Scooter, Fahrrad, Motorrad oder Auto bereit (nachrücken/erscheinen außerhalb des Blickfelds, wenn man sich entfernt).
- **Fahrende Autos und Busse anhalten**: Knopf „✋ Anhalten & fragen“ → Fahrer hält, sagt kurz Ja (Amanah), man fährt selbst
  weiter – siehe Abschnitt „Amanah-Ausleihe“. Immer schnell (1–2 s), keine langen Dialoge.
- Immer wählbar: **selbst fahren** oder **automatisch fahren** (Ziel wählen).
- ✅ **Gebaut:** Fahrknöpfe `#driveCtl` (▲▼◀▶, Helikopter Hoch/Runter; Laptop WASD/Pfeile, Leertaste/C) in `borrow.js`; Mekka/Medina ohne
  unsichtbare Wände (nur Gebäude-Kollision aus `towers.footprints` mit Höhe `h`, Haram/Nabawi als Block, Boden folgt dem Gelände);
  Verleih-Fahrzeuge erscheinen hinter der Figur, wenn keins in 22 m steht (`keepNearby`); Helikopter-Landeplatz auf dem Südplatz,
  `noLand()` verbietet Landen auf Haram/Kaaba, Prophetenmoschee und Moscheen (Hinweis, sanft angehoben). Alle Fahrzeuge aus
  `vehicles/` eingebunden (`SMALL_KINDS`, Helikopter-Sitz aus der Form berechnet). Restaurant-/Rastplatz-/Bauhof-Orte haben noch eigene Grenzen.

### Hauptfigur (Stand)
Junge/Mann: geriggte Tripo-Figur (`src/core/rigged.js`, Modelle `player_m*.glb`) in drei Kleidungen (Alltag, Ihram bedeckt, Ihram
Schulter frei), Gehen aus der Datei, Stehen/Gebet/Sitzen/Dua/Werfen als eigene Haltungen. Für Fahrzeuge: Haltung `sit` verwenden bzw.
eine eigene Haltung „fahren“ (Hände am Lenker) in `DEF` ergänzen. Mädchen/Frau: noch die alte Figur (geriggte Version folgt vom Nutzer).

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
- Eine Sache pro Schritt bauen, testen (Playwright-Screenshots), committen, pushen, auf Deutsch berichten.

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
   Danach (siehe Spiel-Übersicht): Geschäftsviertel mit Büro-Job, Sandstein-Bauhof in der Wüste, Oase/Dattelplantage, Wohnung.
8. ✅ Gebetszeiten/Adhan im Tagesablauf, Moscheen zum Beten, Haram/Nabawi von innen, Karte (siehe oben). Offen: echte Adhan-Aufnahme (frei lizenziert) in `public/assets/audio/adhan.mp3` legen.
