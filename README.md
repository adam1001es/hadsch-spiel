# Hadsch-Pfad

3D-Lernspiel über die Stationen des Hadsch, spielbar im Handy-Browser (Three.js + Vite).

## Spielen
Nach jedem Push auf `main` baut GitHub Actions das Spiel und veröffentlicht es auf GitHub Pages.
Einmalig aktivieren: **Settings → Pages → Source: GitHub Actions**.

Direkt zu einer Station springen: Link mit `#s2` am Ende (Station 2 = Tawaf).

## Stand
- Fertig: Grundgerüst, Startbildschirm, Tawaf (Stationen 2, 9, 12).
- Platzhalter: alle anderen Stationen zeigen Text und Schritte. Reihenfolge und Inhalte: `src/content/hajj.js`.

## Mit Claude Code weiterbauen
Regeln und Struktur stehen in `CLAUDE.md`. Gute nächste Aufträge, jeweils einzeln:
1. „Baue die Station Sa'i (src/stations/sai.js) nach CLAUDE.md.“
2. „Baue Arafat mit Jabal ar-Rahma und Sonnenuntergang.“
3. „Baue Muzdalifa: Steine durch Antippen sammeln.“
4. „Baue die Dschamarat mit Wurf-Mechanik.“
5. „Baue Miqat und Mina.“
6. „Ersetze die Platzhalter-Texturen durch echte CC0-Texturen von Polyhaven.“
