# Hadsch-Spiel – Regeln für Claude Code

3D-Lernspiel über den Hadsch (Hadsch at-Tamattu'), spielbar im Browser auf Smartphone, Tablet und Laptop.
Der Nutzer testet über GitHub Pages (iPhone und Laptop). Er programmiert nicht selbst.

## Tech-Stack
- Three.js (npm `three`), Vite, reines JavaScript (ES-Module), kein Framework.
- Deployment: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`), bei jedem Push auf `main`.
- `vite.config.js` nutzt `base: './'`, damit Pages unter `/<repo>/` funktioniert.

## Arbeitsweise
- **Vor jeder Station `docs/SPIEL.md` lesen**: Dort stehen Ort, Ablauf, Mechanik und Texte jeder Station.
- Immer nur **eine Station pro Aufgabe** bauen oder verbessern, dann committen und pushen.
- Vor jedem Commit `npm run build` ausführen; der Build muss fehlerfrei sein.
- Nach dem Push dem Nutzer kurz auf Deutsch sagen, was sich geändert hat und was er testen soll.
- **Alles muss auf Smartphone, Tablet und Laptop funktionieren** (Hoch- und Querformat, Touch und Maus/Tastatur).
  Vor jedem Commit Layout bei ca. 390×844, 820×1180 und 1440×900 prüfen (z. B. Playwright-Screenshots).
- **Pädagogisch aufbauen** (Zielgruppe Schüler, siehe `docs/SPIEL.md` 3a): jede Station hat eine Lernkarte in `TEXT.learn`
  (Aufgaben, Zusammenfassung, Quiz) und meldet erledigte Aufgaben mit `ctx.mission.done(i)`; Ziele immer mit `goTo`/`pointGoal` (Pfeile).
- Wenn eine Station fertig ist: in `public/anleitung.html` im Array `S` bei dieser Station `done:true` setzen.
- Keine Inhalte aus `src/content/hajj.js` erfinden oder ändern, ohne dass der Nutzer es verlangt.

## Struktur
```
src/
  main.js              Einstieg: Renderer, Loop, Stationswechsel
  core/
    engine.js          Renderer, Kamera, Szene, Resize, Render-Loop
    sky.js             Himmel, Sonne, Tag-Nacht (setHour)
    input.js           Touch: Halten = Gehen, Wischen = Umschauen, Tippen
    ui.js              HUD, Infotext, Aktionsknöpfe, Zähler, Toasts
    stations.js        Stationsliste und Wechsel mit Überblendung
  world/
    kaaba.js           Kaaba, Hijr Ismail, Maqam Ibrahim
    haram.js           Masjid al-Haram (Boden, Arkaden, Minarette)
    crowd.js           Menschenmengen per InstancedMesh (Teile je nach Person)
    people.js          Formen (Ihram, Abaya, Khimar, Ghutra …) und Herkunftsregionen mit Hautfarben/Kleidung
    assets.js          Lädt echte CC0-Texturen (pbr) und HDRI-Umgebungslicht
    textures.js        Canvas-Texturen (Hizam-Kalligrafie stilisiert, Tür, Arkaden)
    terrain.js         Gelände (Mina, Arafat, Muzdalifa)
  stations/            Eine Datei pro Station, exportiert create(ctx)
  content/hajj.js      ALLE Texte, Gebete, Regeln (einzige Quelle)
public/assets/textures Texturen (Poly Haven, CC0), Quellen im README dort
public/assets/hdri     Himmelsbilder für Umgebungslicht (Poly Haven, CC0)
public/anleitung.html  Übersicht & Anleitung (runder Kartenknopf oben rechts im Spiel)
```

## Station-Schnittstelle
Jede Datei in `src/stations/` exportiert `create(ctx)` und gibt `{ update(dt), dispose() }` zurück.
`ctx` enthält `{ engine, sky, ui, input, next, content }`. `next()` wechselt zur nächsten Station.

## Grafik-Ziele
- Realistisch, aber flüssig auf Smartphone und Tablet: Pixelratio max. 2, Schattenkarte max. 2048, Menschen per InstancedMesh.
- PBR (`MeshStandardMaterial`), ACES-Tonemapping, sRGB-Ausgabe, Nebel, Bloom nur wenn die FPS reichen.
- Kaaba ca. 13,1 m hoch, Seiten ca. 11–12,8 m; schwarze Kiswa mit goldenem Band (Hizam) auf ca. 2/3 Höhe,
  goldene Tür auf der Nordost-Seite nahe dem Schwarzen Stein, Hijr Ismail als halbrunde Mauer auf der Nordwest-Seite.

## Inhaltliche Regeln (Hadsch at-Tamattu')
- Tawaf: 7 Runden, Start und Ende am Schwarzen Stein, Kaaba immer links (gegen den Uhrzeigersinn von oben).
  Raml und Idtiba' nur im ersten Tawaf (Umrah), nur Männer. Danach Sunnah: 2 Rak'at hinter Maqam Ibrahim, Zamzam.
- Sa'i: 7 Strecken, Start Safa, Ende Marwa. Männer eilen zwischen den grünen Lichtern.
- Umrah endet mit Taqsir. Am 8. erneut Ihram für den Hadsch, Mina: Gebete verkürzt, nicht zusammengelegt.
- 9.: Arafat, Dhuhr+Asr zusammengelegt und verkürzt, Wuquf bis Sonnenuntergang.
- Nacht zum 10.: Muzdalifa, Maghrib+Isha zusammengelegt, Steine sammeln, vor Sonnenaufgang nach Mina.
- 10.: nur Dschamrat al-Aqaba (7 Steine, Takbir), Talbiyah endet mit dem ersten Wurf; Opfer (Hady), Halq/Taqsir,
  Tawaf al-Ifada, Sa'i. Reihenfolge ist Sunnah, Abweichungen erlaubt.
- 11.–12. (13. optional): nach dem Mittag alle drei Dschamarat (klein → mittel → groß), je 7; Dua nach den ersten beiden.
- Abschieds-Tawaf vor der Abreise (Frauen in der Menstruation befreit).
- Respektvolle Darstellung: keine Gewalt, keine Witze, keine echten Personen.
- Kalligrafie auf der Kiswa: echte, lesbare Schrift ist erlaubt (Entscheidung des Nutzers), aber nur scharf, unverzerrt und
  in würdiger Qualität (z. B. aus geprüften 3D-Modellen mit freier Lizenz). Sonst stilisiert lassen (aktueller Stand).
- Hinweis im Spiel: vereinfachte Lerndarstellung, Details unterscheiden sich je nach Rechtsschule.
