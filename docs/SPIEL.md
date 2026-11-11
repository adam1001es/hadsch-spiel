# Hadsch-Pfad – Spieldesign

Vollständige Beschreibung aller Stationen. Claude Code baut danach, **eine Station pro Auftrag**.
Texte, Gebete und Reihenfolge stehen zusätzlich in `src/content/hajj.js` (gleicher Inhalt, für den Code).

## 1. Grundidee
- Der Spieler erlebt die Pilgerfahrt (Hadsch at-Tamattu') vom Miqat bis zum Abschieds-Tawaf.
- Ruhig, würdevoll, lehrreich. Kein Zeitdruck, kein Verlieren. Fehler werden erklärt, nicht bestraft.
- Ziel-Gerät: iPhone im Hochformat, Browser. Ziel 30+ FPS.
- Sprache: Deutsch. Gebete immer dreifach: Arabisch (mit Vokalzeichen), Umschrift, deutsche Bedeutung.

## 2. Steuerung (überall gleich)
- **Gehen**: runder Knopf unten rechts gedrückt halten.
- **Umschauen**: auf dem Bild wischen.
- **Antippen**: Dinge in der Welt auswählen (z. B. Steine sammeln).
- **Aktionsknöpfe** im Panel unten: Pflicht-Schritte grün gefüllt, Sunnah-Schritte gold umrandet mit Zusatz „Sunnah“.
- Am PC: Leertaste/W = Gehen, Maus ziehen = Umschauen.

## 3. Bildschirm
- Oben: Tag (z. B. „9. Dhul-Hiddscha · Tag von Arafa“), Stationsname, 12 Rauten als Fortschritt, großer Zähler (z. B. „Runde 3 / 7“).
- Unten: Panel mit Erklärtext, Gebet, Aktionsknöpfen; rechts der Gehen-Knopf. Panel darf max. 46 % der Höhe einnehmen.
- Kurze Meldungen (Toasts) in der Mitte oben, z. B. „Runde 2 ✓“.
- Zwischen Stationen Überblendung über Schwarz.
- Startbildschirm: Kamera kreist um die Kaaba bei Nacht. Titel „Hadsch-Pfad“, Hinweis, Knopf „Bismillah – Beginnen“, darunter alle Stationen zum direkten Springen.
- Testlink je Station: `…/#s1` bis `…/#s12`.

## 4. Grafik-Stil
- Realistisch, warmes Licht, Dunst in der Wüste, klare Sternennächte.
- Tageszeit läuft über `sky.setHour()` / `sky.animateTo()`; nachts schaltet sich künstliches Licht an (`sky.state.artificial = 1`).
- Menschen: einfache Figuren per InstancedMesh. Männer in weißem Ihram, Frauen in Weiß, Schwarz oder gedeckten Farben. Keine Gesichter.
- Spieler-Figur mit goldenem Ring am Boden, damit man sich findet.
- Echte Texturen (CC0) später in `public/assets/textures`, bis dahin Canvas-Platzhalter.

## 5. Stationen

### Station 1 – Miqat & Ihram (vor dem 8. Dhul-Hiddscha)
- **Ort**: Moschee Dhul-Hulaifa (Abyar Ali) bei Medina. Weiße Moschee mit Minarett, Palmen, Berge, Nachmittag (16 Uhr).
- **Kamera**: kreist langsam um die Spieler-Figur.
- **Ablauf**:
  1. Knopf „Ghusl & Ihram anlegen“ → Figur wechselt von bunter Kleidung zu Weiß.
     Text: Männer tragen zwei ungenähte weiße Tücher (Izar und Rida'), Frauen ihre normale bedeckende Kleidung ohne Niqab und Handschuhe.
  2. Knopf „Niyya für die Umrah“ → zeigt „لَبَّيْكَ عُمْرَةً – Labbaika ʿumratan – Hier bin ich, für die Umrah.“
  3. Knopf „Talbiyah sprechen“ → zeigt die Talbiyah (aus `hajj.js`).
  4. Kurze Liste der Ihram-Verbote: kein Parfüm, kein Haare- oder Nägelschneiden, keine Jagd, keine eheliche Intimität, Männer: Kopf nicht bedecken, keine genähte Kleidung.
  5. Knopf „Nach Mekka reisen“ → nächste Station.

### Station 2 – Tawaf der Umrah (fertig gebaut)
- **Ort**: Masjid al-Haram bei Nacht (21 Uhr), hell beleuchtet.
- **Mechanik**: Gehen halten → Figur läuft im Kreis (Radius ca. 17,5 m) gegen den Uhrzeigersinn, Kaaba links. 7 Runden, gezählt an der grünen Linie beim Schwarzen Stein.
- **Sunnah**: Bei jeder Runde am Schwarzen Stein Knopf „✋ Bismillah, Allahu Akbar“ (Istilam). Zwischen Rukn al-Yamani und Schwarzem Stein erscheint Sure 2:201. Sonst: „Freies Dua und Dhikr“.
- Raml: in Runde 1–3 etwas schneller. Hinweis auf Idtiba' im Einleitungstext.
- **Ende**: Sunnah-Knöpfe „2 Rak'at hinter Maqam Ibrahim“ und „Zamzam trinken“, dann „Weiter“.
- **Wiederverwendet** für Station 9 (Tawaf al-Ifada, 16 Uhr, Spieler in normaler Kleidung, kein Raml) und Station 12 (Abschieds-Tawaf, 22:30 Uhr, danach Endbildschirm).

### Station 3 – Sa'i zwischen Safa und Marwa
- **Ort**: der überdachte Mas'a-Gang. Marmorboden, Säulenreihen links/rechts und in der Mitte, Mittelbarriere trennt die Laufrichtungen, helle Deckenpaneele, Arkaden an den Wänden.
  Safa am einen Ende, Marwa am anderen: jeweils ein freiliegender Felshügel hinter Glasbrüstung, darüber ein Schild „الصفا · As-Safa“ bzw. „المروة · Al-Marwa“.
  In der Mitte des Gangs ein Abschnitt mit **grünen Leuchtstreifen** an der Decke (Anfang und Ende markiert).
- **Länge im Spiel**: ca. 90 m (echt ca. 450 m); grüner Abschnitt etwa bei 38–60 %.
- **Mechanik**:
  1. Start auf Safa. Text zur Geschichte Hadschars. Sunnah-Knopf „Ayah rezitieren & Dua“ zeigt Sure 2:158 (aus `hajj.js`). Pflicht-Knopf „Losgehen“.
  2. Gehen halten → Figur läuft Richtung Marwa (Spur links der Mitte). Im grünen Bereich: Toast „Zwischen den grünen Lichtern eilen Männer“, Figur läuft schneller.
  3. Am Ende angekommen: Zähler „Strecke 1 / 7 ✓“, Knopf „Dua Richtung Kaaba & umkehren“. Dann zurück (Spur rechts der Mitte).
  4. Nach 7 Strecken endet man auf **Marwa**.
- **Mitpilger**: ca. 400, die links Richtung Marwa und rechts Richtung Safa laufen; im grünen Bereich schneller.
- **Ende Umrah** (Station 3): Knopf „Haare kürzen (Taqsir)“ → Text „Die Umrah ist vollständig. Du verlässt den Ihram bis zum 8. Dhul-Hiddscha.“ → „Weiter“.
- **Ende Hadsch** (Station 10): Text „Damit endet auch das letzte Ihram-Verbot (zweites Tahallul).“ → „Zurück nach Mina“.

### Station 4 – Mina, 8. Dhul-Hiddscha (Yaum at-Tarwiya)
- **Ort**: Tal mit Tausenden weißen Zelten (Raster, Pyramidendach), umgeben von Felsbergen. Kamera erhöht am Hang, Blick über die Zeltstadt.
- **Ablauf** (jeder Knopf animiert die Uhrzeit vorwärts):
  1. „Ihram & Niyya für den Hadsch“ → „لَبَّيْكَ حَجًّا – Labbaika ḥaddschan“. Start 9 Uhr.
  2. „Dhuhr beten (2 Rak'at)“ → 12:30 Uhr
  3. „Asr beten (2 Rak'at)“ → 15:40 Uhr
  4. „Maghrib beten (3 Rak'at)“ → 18:30 Uhr, Zelte beginnen zu leuchten
  5. „Isha beten (2 Rak'at)“ → 20:00 Uhr
  6. „In Mina übernachten“ → Nacht mit Sternen, bis 5:00 Uhr
  7. „Fajr beten“ → 5:20 Uhr
  8. „Nach Sonnenaufgang nach Arafat“ → nächste Station
- Hinweis: Vierer-Gebete werden verkürzt, aber **nicht** zusammengelegt.

### Station 5 – Arafat, 9. Dhul-Hiddscha
- **Ort**: weite Ebene, Berge am Horizont, der Felshügel **Jabal ar-Rahma** mit weißer Säule auf der Spitze. Tausende Pilger, viele sitzend, einige Zelte, Bäume (Neem), weiße Schirme.
- **Kamera**: auf Augenhöhe in der Menge, Blick zum Berg, frei umschaubar.
- **Ablauf**:
  1. Start 11:45 Uhr. Text: Der Aufenthalt (Wuquf) ist der Kern des Hadsch – „Der Hadsch ist Arafat.“
  2. Knopf „Predigt hören, Dhuhr & Asr zusammen beten“ → 13:15 Uhr.
  3. Gehen-Knopf wird zu **„Dua“**: Halten lässt die Zeit bis Sonnenuntergang (18:30) laufen, ca. 30 Sekunden gesamt. Großer Zähler zeigt die Uhrzeit.
     Wechselnde Texte während der Zeit: Arafat-Dhikr (aus `hajj.js`) → „Astaghfirullah – Ich bitte Allah um Vergebung“ → „Bitte für deine Eltern, deine Familie und alle Muslime“ → Sure 2:201 → „Bleib bis Sonnenuntergang“.
  4. Sonnenuntergang mit warmem Himmel. Knopf „Nach Sonnenuntergang nach Muzdalifa“.

### Station 6 – Muzdalifa, Nacht zum 10.
- **Ort**: offene Ebene bei Nacht, Pilger schlafen auf Matten auf dem Boden, Straßenlaternen in Reihen, in der Ferne die Moschee al-Mash'ar al-Haram mit beleuchteten Minaretten. Warmes Laternenlicht nahe der Kamera.
- **Kamera**: steht, blickt schräg auf den Boden vor dem Spieler.
- **Ablauf**:
  1. Knopf „Maghrib & Isha zusammen beten“.
  2. **Steine sammeln**: ca. 140 kleine Kiesel liegen am Boden. Antippen → Stein fliegt in den Beutel, Zähler „Steine 3 / 7“. Ziel 7.
     Text: Steine etwa so groß wie Kichererbsen. Für den 10. brauchst du 7; viele sammeln hier gleich alle 49 (bzw. 70).
  3. Knopf „Unter freiem Himmel schlafen“ → Nacht bis 5:00 Uhr.
  4. Sunnah-Knopf „Dhikr am al-Mash'ar al-Haram“ nach dem Fajr-Gebet, Dämmerung.
  5. Knopf „Vor Sonnenaufgang nach Mina“.

### Station 7 – Dschamrat al-Aqaba, 10. Dhul-Hiddscha
- **Ort**: Jamarat-Brücke (mehrstöckig, Betondecken auf Säulen). Die Dschamra ist eine lange ovale Steinwand (ca. 26 m lang) in einem Becken mit niedrigem Rand. Pilger stehen am Beckenrand. Schild mit Namen über der Wand.
- **Kamera**: vor dem Becken, Blick auf die Wand.
- **Wurf-Mechanik**: rechts eine senkrechte Leiste mit grünem Zielbereich, eine Nadel pendelt auf und ab. Knopf „Werfen – Allahu Akbar“:
  - Nadel im grünen Bereich → Stein trifft die Wand und fällt ins Becken ✓.
  - Zu niedrig → Stein fällt vor das Becken. Zu hoch → Stein fliegt darüber.
  - Ungültige Würfe zählen nicht, kurze Erklärung: „Der Stein muss im Becken landen – wirf noch einmal.“
- **Ablauf**: 7 gültige Würfe. Beim ersten Wurf Toast „Die Talbiyah endet jetzt“. Danach „Weiter“.

### Station 8 – Opfer & Rasur (10. Dhul-Hiddscha)
- **Ort**: Mina am Vormittag (10:30 Uhr), wie Station 4.
- **Ablauf**:
  1. Text zum Hady (für Tamattu' Pflicht, heute meist per offiziellem Gutschein; das Fleisch geht an Bedürftige). Knopf „Opfer bestätigt“.
  2. Wahl: „Halq – Kopf rasieren (Männer, besser)“ oder „Taqsir – Haare kürzen“. Hinweis: Frauen kürzen eine Fingerspitzenlänge.
  3. Text: Erstes Tahallul – alle Ihram-Verbote enden außer der ehelichen Intimität. Normale Kleidung erlaubt.
  4. Hinweis: Die Reihenfolge Werfen → Opfer → Rasieren → Tawaf ist Sunnah; Abweichungen sind erlaubt.
  5. Knopf „Nach Mekka zum Tawaf al-Ifada“.

### Station 9 – Tawaf al-Ifada → siehe Station 2 (Variante `ifada`).

### Station 10 – Sa'i des Hadsch → siehe Station 3 (Variante ohne Taqsir).

### Station 11 – Die drei Dschamarat (11.–12. Dhul-Hiddscha)
- **Ort und Mechanik** wie Station 7, nachmittags (14:30 Uhr).
- **Ablauf**: Nacheinander kleine (al-Ula), mittlere (al-Wusta), große (al-Aqaba) Dschamra, je 7 gültige Würfe. Zwischen den Säulen Überblendung, Schild wechselt.
  - Nach der kleinen und mittleren: Sunnah-Knopf „Dua Richtung Qibla“, dann „Zur nächsten Dschamra“.
  - Nach der großen: kein Dua. Text: Am 12. wiederholt sich das; wer Mina bis Sonnenuntergang am 12. nicht verlässt, wirft auch am 13.
  - Knopf „Zum Abschieds-Tawaf“.

### Station 12 – Abschieds-Tawaf → siehe Station 2 (Variante `wada`), danach Endbildschirm.

## 6. Endbildschirm
- Morgendämmerung über Mekka.
- „حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا – Ḥaddschan mabrūran wa dhanban maghfūrā – Ein angenommener Hadsch und vergebene Sünden.“
- Übersicht: alle Stationen ✓ und Liste der erfüllten Sunnah-Schritte (z. B. „Sunnah: 6 von 8“).
- Knopf „Nochmal spielen“.

## 7. Sunnah-Schritte (für die Auswertung)
Talbiyah, Istilam in jeder Runde, 2 Rak'at hinter Maqam Ibrahim, Zamzam, Dua auf Safa und Marwa, Dhikr am al-Mash'ar al-Haram, Dua nach den ersten beiden Dschamarat.
Gezählt wird nur, was der Spieler wirklich angetippt hat. Kein Tadel bei Auslassen.

## 8. Ausbaustufen (später, nur auf Wunsch)
- Echte CC0-Texturen und Normal-Maps.
- Hintergrundklang (Talbiyah-Atmosphäre, Wind, Menge) – nur nach erstem Antippen abspielbar.
- Sprachauswahl (Deutsch / Arabisch / Englisch).
- Quiz nach jeder Station.
