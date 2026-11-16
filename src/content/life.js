// Texte für das Lebensspiel (Mekka & Medina nach dem Hadsch). Eigene Datei – hajj.js bleibt unverändert.

export const BUILDYARD = {
  title: 'Sandstein-Bauhof',
  day: 'In der Wüste',
  sign: ['ورشة البناء', 'Sandstein-Bauhof →'],
  go: '🧱 Zum Sandstein-Bauhof fahren',
  back: (medina) => `🚌 Mit dem Bus zurück nach ${medina ? 'Medina' : 'Mekka'}`,
  backShort: (medina) => `Zurück nach ${medina ? 'Medina' : 'Mekka'}`,
  intro: 'Willkommen im Sandstein-Bauhof! Hier baust du frei: Häuser, Mauern, Brunnen, Türme. '
    + '<b>Tippe</b> auf den Boden oder auf einen Stein, um daneben einen neuen Stein zu setzen (am Laptop: klicken). '
    + 'Mit dem Knopf <b>⛏ Abbauen</b> nimmst du Steine wieder weg. Neues Material holst du dir an den leuchtenden Stapeln am Rand '
    + '– oder tippe unten rechts auf das Material. Dein Bau wird automatisch gespeichert. Im Raum „Zusammen spielen“ baut ihr gemeinsam.',
  keys: 'Tastatur: 1–6 Material wählen, R = Bauen/Abbauen umschalten.',
  fact: '<b>Wusstest du?</b> In den alten Städten des Hedschas, etwa in der Altstadt von Dschidda, baute man mit Korallen- und Naturstein, Lehm und Holz. '
    + 'Hölzerne Erker vor den Fenstern (Rawashin) spendeten Schatten und ließen den Wind durch die Häuser ziehen.',
  build: '🧱 Bauen',
  remove: '⛏ Abbauen',
  take: (n) => `${n} nehmen`,
  taken: (n) => `${n} in der Hand`,
  far: 'Zu weit weg – geh näher heran.',
  full: 'Der Bauhof ist voll – baue erst etwas ab.',
  synced: 'Gemeinsamer Bau geladen',
};

// Baustoffe (eigene, im Browser gezeichnete Texturen)
export const MATERIALS = [
  { id: 'sand', name: 'Sandstein' },
  { id: 'mud', name: 'Lehmziegel' },
  { id: 'coral', name: 'Korallenstein' },
  { id: 'marble', name: 'Marmor' },
  { id: 'wood', name: 'Palmholz' },
  { id: 'tile', name: 'Fliese' },
];

// Die Städte (Lebensspiel): Infotafeln an echten Orten – vereinfachte Lerndarstellung
export const CITY = {
  haramDo: '📜 Über die Masjid al-Haram',
  haram: '<b>Masjid al-Haram</b> – die Heilige Moschee in Mekka mit der Kaaba in der Mitte. Sie ist die größte Moschee der Welt und wurde '
    + 'immer wieder erweitert. Der große Marmorplatz im Süden liegt zwischen der Moschee und dem Uhrturm; zu den Gebetszeiten beten hier '
    + 'Tausende Menschen unter freiem Himmel.',
  clockDo: '📜 Über den Uhrturm',
  clock: '<b>Abraj al-Bait</b> – der Gebäudekomplex direkt südlich der Haram mit Hotels, Geschäften und dem Uhrturm. Der Turm ist etwa '
    + '601 Meter hoch und gehört zu den höchsten Gebäuden der Welt; jedes der vier Zifferblätter misst etwa 43 Meter. Ganz oben glänzt ein goldener Halbmond.',
  nabawiDo: '📜 Über die Masjid an-Nabawi',
  nabawi: '<b>Masjid an-Nabawi</b> – die Moschee des Propheten ﷺ in Medina. Er hat sie nach der Hidschra selbst mit seinen Gefährten gebaut; '
    + 'heute ist sie um ein Vielfaches größer. Unter der <b>Grünen Kuppel</b> liegt die Grabkammer des Propheten ﷺ. '
    + 'Auf dem Vorplatz spenden riesige Schirme Schatten – tagsüber werden sie geöffnet, abends wieder geschlossen.',
  street: (medina) => (medina ? ['طريق الملك فيصل', 'König-Faisal-Straße'] : ['شارع إبراهيم الخليل', 'Ibrahim-al-Khalil-Straße']),
  shops: [['تمور', 'Datteln'], ['عطور', 'Parfüm · Oud'], ['مكتبة', 'Bücher'], ['مطعم', 'Restaurant'], ['ملابس', 'Kleidung'], ['سبح وسجاد', 'Tasbih & Teppiche'], ['ذهب', 'Goldschmied'], ['هدايا', 'Geschenke'], ['حلويات', 'Süßes'], ['عصير', 'Saft']],
  hotel: ['فندق', 'Hotel'],
  taxi: '🚕 Taxi-Stand',
  crossInfo: 'Rot heißt warten – die Autos halten aber auch so für Fußgänger an.',
};

// Gebetszeiten im Spiel: ungefähre Durchschnittszeiten (Umm-al-Qura-Kalender), echte Zeiten ändern sich mit der Jahreszeit.
// iqama: Minuten zwischen Adhan und Gemeinschaftsgebet (wie in der Haram üblich, gerundet). rakat: Pflichtgebet (Fard).
export const PRAYERS = {
  mecca: [
    { id: 'fajr', name: 'Fajr', ar: 'الفجر', t: 5 * 60 + 15, iqama: 25, rakat: 2 },
    { id: 'dhuhr', name: 'Dhuhr', ar: 'الظهر', t: 12 * 60 + 20, iqama: 20, rakat: 4 },
    { id: 'asr', name: 'Asr', ar: 'العصر', t: 15 * 60 + 40, iqama: 20, rakat: 4 },
    { id: 'maghrib', name: 'Maghrib', ar: 'المغرب', t: 18 * 60 + 5, iqama: 10, rakat: 3 },
    { id: 'isha', name: 'Isha', ar: 'العشاء', t: 19 * 60 + 35, iqama: 20, rakat: 4 },
  ],
  medina: [
    { id: 'fajr', name: 'Fajr', ar: 'الفجر', t: 5 * 60 + 20, iqama: 25, rakat: 2 },
    { id: 'dhuhr', name: 'Dhuhr', ar: 'الظهر', t: 12 * 60 + 25, iqama: 20, rakat: 4 },
    { id: 'asr', name: 'Asr', ar: 'العصر', t: 15 * 60 + 45, iqama: 20, rakat: 4 },
    { id: 'maghrib', name: 'Maghrib', ar: 'المغرب', t: 18 * 60 + 10, iqama: 10, rakat: 3 },
    { id: 'isha', name: 'Isha', ar: 'العشاء', t: 19 * 60 + 40, iqama: 20, rakat: 4 },
  ],
};

// Wortlaut des Adhan (Gebetsruf). Quelle: Sunan Abi Dawud 499 (Hadith von Abdullah ibn Zaid); der Zusatz beim Fajr: Sunan Abi Dawud 500.
export const ADHAN = {
  lines: [
    ['اللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ', 'Allāhu akbar, Allāhu akbar (2×)', 'Allah ist größer (als alles).'],
    ['أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ', 'Aschhadu an lā ilāha illa-llāh (2×)', 'Ich bezeuge, dass es keinen Gott gibt außer Allah.'],
    ['أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللّٰهِ', 'Aschhadu anna Muhammadan rasūlu-llāh (2×)', 'Ich bezeuge, dass Muhammad der Gesandte Allahs ist.'],
    ['حَيَّ عَلَى الصَّلَاةِ', 'Hayya ʿala-s-salāh (2×)', 'Kommt zum Gebet.'],
    ['حَيَّ عَلَى الْفَلَاحِ', 'Hayya ʿala-l-falāh (2×)', 'Kommt zum Erfolg.'],
    ['الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', 'As-salātu chairun mina-n-naum (2×, nur beim Fajr)', 'Das Gebet ist besser als der Schlaf.', 'fajr'],
    ['اللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ', 'Allāhu akbar, Allāhu akbar', 'Allah ist größer.'],
    ['لَا إِلٰهَ إِلَّا اللّٰهُ', 'Lā ilāha illa-llāh', 'Es gibt keinen Gott außer Allah.'],
  ],
  source: 'Wortlaut nach Sunan Abi Dawud 499 und 500. (Beim ersten „Allāhu akbar“ sagen viele Rechtsschulen es 4×.)',
};

export const PRAYER_UI = {
  adhanToast: (p) => `🕌 Adhan – Zeit für ${p.name}`,
  adhanHead: (p) => `Es ist Zeit für das ${p.name}-Gebet`,
  iqama: (p) => `${p.name}: Das Gemeinschaftsgebet beginnt`,
  pray: (p) => `🕌 ${p.name} beten (${p.rakat} Rak'at)`,
  prayed: (p) => `${p.name} gebetet – möge Allah es annehmen.`,
  hold: 'Halten: beten',
  none: 'Gerade ist keine Gebetszeit – das nächste Gebet kommt bald.',
  enterHaram: '🕋 In die Haram gehen (zur Kaaba)',
  enterNabawi: '🕌 In die Prophetenmoschee gehen',
  leaveHaram: 'Hinaus auf den Platz',
  leaveNabawi: 'Hinaus auf den Vorplatz',
  mosque: (n) => `🕌 ${n}`,
  mosqueNames: ['Moschee am Südplatz', 'Moschee an der Straße'],
  note: 'Gebetszeiten im Spiel sind ungefähre Durchschnittswerte – die echten Zeiten ändern sich mit der Jahreszeit. Zum Beten in die nächste Moschee gehen (leuchtet), in die Haram oder in die Prophetenmoschee.',
  haramTitle: 'In der Masjid al-Haram', nabawiTitle: 'In der Masjid an-Nabawi',
  haramIntro: 'Du bist in der Masjid al-Haram bei der Kaaba. Hier kannst du beten (Knopf oben) und – wenn du möchtest – einen freiwilligen Tawaf gehen: 7 Runden, die Kaaba immer links. Zur Gebetszeit stellen sich alle in Kreisen um die Kaaba auf.',
  nabawiIntro: 'Du bist in der Masjid an-Nabawi, der Moschee des Propheten ﷺ. Vorne (Süden) ist die Qibla-Wand mit der Gebetsnische. Der Bereich mit dem grünen Teppich ist die Rawda.',
  rawdaDo: '📜 Über die Rawda',
  rawda: '<b>Die Rawda</b> liegt zwischen dem früheren Haus des Propheten ﷺ und seiner Kanzel (Minbar). Er sagte: „Was zwischen meinem Haus und meiner Kanzel liegt, ist ein Garten von den Gärten des Paradieses.“ (Sahih al-Bukhari 1196, Sahih Muslim 1391)',
  tawafLap: (n) => `Tawaf: Runde ${n} von 7`,
  tawafDone: 'Tawaf vollendet – 7 Runden. Möge Allah es annehmen.',
  times: 'Gebetszeiten heute',
};

// Rastplatz mit Oasen-Moschee an der Autobahn Mekka–Medina (erfundener Ort, wie die echten Rastplätze mit Moschee)
export const REST = {
  title: 'Rastplatz Oasen-Moschee', day: 'Autobahn Mekka – Medina',
  stop: '🕌 Rast an der Oasen-Moschee',
  prayerStop: 'Der Bus hält zum Gebet an der Oasen-Moschee.',
  intro: 'Rast auf halbem Weg zwischen Mekka und Medina. Entlang der Autobahn gibt es Rastplätze mit Moscheen, damit Reisende unterwegs beten können. '
    + 'Geh durch die Palmenallee in den Hof: Am Waschplatz kannst du den Wudu machen, vor der Moschee beten (zur Gebetszeit leuchtet der Gebetsplatz). Der Bus wartet auf dem Parkplatz.',
  go: (to) => `🚌 Weiterfahren nach ${to === 'medina' ? 'Medina' : 'Mekka'}`,
  wuduDo: '💧 Wudu machen',
  wudu: '<b>Wudu – die Gebetswaschung</b> (vereinfacht): Absicht fassen, „Bismillah“ sagen, Hände waschen, Mund und Nase ausspülen, '
    + 'das Gesicht waschen, die Arme bis zu den Ellbogen (rechts zuerst), über den Kopf streichen, die Füße bis zu den Knöcheln waschen (rechts zuerst). '
    + 'Pflicht sind laut Koran: Gesicht, Arme bis zu den Ellbogen, über den Kopf streichen, Füße bis zu den Knöcheln (Sure 5, Vers 6). Vieles wird als Sunnah dreimal gemacht.',
  wuduHold: 'Halten: Wudu',
  wuduDone: 'Wudu fertig – jetzt kannst du beten.',
  kioskDo: '🥤 Erfrischung am Kiosk',
  kiosk: 'Am Kiosk gibt es Wasser, Saft und Datteln für die Weiterfahrt. Bismillah!',
  infoDo: '📜 Über Rastplätze',
  info: 'Auf der langen Autobahn zwischen Mekka und Medina gibt es Rastplätze mit Tankstelle, Laden und Moschee. '
    + 'Wer reist, darf nach den Regeln für Reisende Gebete verkürzen (4 Rak\'at → 2) – die Einzelheiten unterscheiden sich je nach Rechtsschule. Diese Moschee ist eine erfundene Lerndarstellung.',
};
