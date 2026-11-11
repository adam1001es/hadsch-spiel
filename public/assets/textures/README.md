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
