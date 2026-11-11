# Texturen & Himmelsbilder

Alle Dateien stammen von **Poly Haven** (https://polyhaven.com) und stehen unter **CC0** (gemeinfrei).
Sie wurden für das Spiel eingefärbt bzw. verkleinert.

| Datei | Quelle (Poly Haven) | Bearbeitung |
|---|---|---|
| `marble_floor_diff/nor/rough.jpg` | Textur `marble_01` (2K) | zu weißem Marmor aufgehellt, Rauheit poliert |
| `kiswa_diff/nor/rough.jpg` | Textur `floral_jacquard` (1K) | auf Schwarz eingefärbt (Webmuster der Kiswa) |
| `../hdri/night.hdr` | HDRI `st_peters_square_night` (1K) | – (Umgebungslicht bei Nacht) |
| `../hdri/day.hdr` | HDRI `kloofendal_43d_clear_puresky` (1K) | – (Umgebungslicht am Tag) |

Namensschema für neue Materialien: `<name>_diff.jpg`, `<name>_nor.jpg` (OpenGL-Normalen), `<name>_rough.jpg`.
Laden im Code: `pbr('<name>', [wiederholungX, wiederholungY])` aus `src/world/assets.js`.
Hizam-Kalligrafie und Türornamente werden bewusst stilisiert per Canvas gezeichnet (`src/world/textures.js`).

## Kiswa-Stickerei (CC BY 4.0)

| Datei | Quelle | Bearbeitung |
|---|---|---|
| `hizam_a.jpg`, `hizam_b.jpg`, `kiswa_panels.png`, `sitara.jpg` (+ `_mr.jpg`) | Texturen aus „Holy Kaaba – Mecca – Low Poly“ von **haidarzafermoayad**, https://sketchfab.com/3d-models/holy-kaaba-mecca-low-poly-08ea4704d00c40419094487e9646648d, Lizenz **CC BY 4.0** (http://creativecommons.org/licenses/by/4.0/) | zugeschnitten, 2× vergrößert, geschärft; `_mr.jpg` = selbst erzeugte Metall-/Rauheitsmaske für die Goldfäden |

Nur die Texturen werden verwendet, nicht die Geometrie des Modells.
