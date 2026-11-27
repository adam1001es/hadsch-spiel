// Texte für das Lebensspiel (Mekka & Medina nach dem Hadsch). Eigene Datei – hajj.js bleibt unverändert.

export const BUILDYARD = {
  title: 'Sandstein-Bauhof',
  day: 'In der Wüste',
  sign: ['ورشة البناء', 'Sandstein-Bauhof →'],
  go: '🧱 Zum Sandstein-Bauhof fahren',
  back: (medina) => `🚌 Mit dem Bus zurück nach ${medina ? 'Medina' : 'Mekka'}`,
  backShort: (medina) => `Zurück nach ${medina ? 'Medina' : 'Mekka'}`,
  intro: 'Willkommen im Sandstein-Bauhof – einer riesigen Wüste zum Bauen, bis hinauf in die Berge! '
    + '<b>Tippen</b> auf Boden oder Stein = Stein oder Gegenstand setzen (am Laptop: klicken). <b>⛏ Abbauen</b> nimmt Steine und Gegenstände weg. '
    + 'Im <b>Baukasten</b> (Knopf unten rechts) gibt es Steine und fertige Dinge: Hocker, Tisch, Bett, Sofa, Gebetsteppich, Lagerfeuer, Bäume, Laternen … '
    + '<b>Springen</b> und <b>Fliegen</b> mit den runden Knöpfen. Alle, die gerade im Bauhof sind, bauen <b>gemeinsam</b> und sehen die Bauten der anderen. Es wird automatisch gespeichert.',
  keys: 'Tastatur: W/A/S/D gehen, Leertaste = springen (beim Fliegen: hoch), C = runter, V = Fliegen an/aus, I = Baukasten, 1–9 Steine, R = Bauen/Abbauen.',
  fact: '<b>Wusstest du?</b> In den alten Städten des Hedschas, etwa in der Altstadt von Dschidda, baute man mit Korallen- und Naturstein, Lehm und Holz. '
    + 'Hölzerne Erker vor den Fenstern (Rawashin) spendeten Schatten und ließen den Wind durch die Häuser ziehen.',
  build: '🧱 Bauen',
  remove: '⛏ Abbauen',
  take: (n) => `${n} nehmen`,
  taken: (n) => `${n} in der Hand`,
  far: 'Zu weit weg – geh näher heran.',
  full: 'Der Bauhof ist voll – baue erst etwas ab.',
  synced: 'Bauten der anderen geladen',
  box: '🧰 Baukasten', boxTitle: 'Baukasten', blocks: 'Steine', items: 'Fertige Dinge', mosque: 'Moschee bauen',
  jump: 'Springen', fly: 'Fliegen', flyOn: 'Fliegen: an – ▲/▼ zum Steigen und Sinken', flyOff: 'Fliegen: aus',
  shared: (n) => `${n} ${n === 1 ? 'Mitspieler baut' : 'Mitspieler bauen'} mit`,
};

// Baustoffe (eigene, im Browser gezeichnete Texturen)
// Fertige Gegenstände im Bauhof (eigene, einfache 3D-Formen)
export const ITEMS = [
  { id: 'teppich', name: 'Gebetsteppich', icon: '🧎' }, { id: 'hocker', name: 'Hocker', icon: '🪑' }, { id: 'tisch', name: 'Tisch', icon: '🍽️' },
  { id: 'bank', name: 'Bank', icon: '🪵' }, { id: 'bett', name: 'Bett', icon: '🛏️' }, { id: 'sofa', name: 'Sofa', icon: '🛋️' },
  { id: 'feuer', name: 'Lagerfeuer', icon: '🔥' }, { id: 'laterne', name: 'Laterne', icon: '🏮' }, { id: 'palme', name: 'Palme', icon: '🌴' },
  { id: 'baum', name: 'Baum', icon: '🌳' }, { id: 'pflanze', name: 'Pflanze', icon: '🪴' }, { id: 'zelt', name: 'Zelt', icon: '⛺' },
  { id: 'brunnen', name: 'Brunnen', icon: '⛲' }, { id: 'kiste', name: 'Kiste', icon: '📦' }, { id: 'kamel', name: 'Kamel', icon: '🐪' },
  // Moschee-Bauteile (cat: 'moschee' → eigener Bereich im Baukasten)
  { id: 'kuppel', name: 'Kuppel', icon: '🕌', cat: 'moschee' }, { id: 'kuppelk', name: 'Kleine Kuppel', icon: '⚪', cat: 'moschee' },
  { id: 'kuppelg', name: 'Grüne Kuppel', icon: '🟢', cat: 'moschee' }, { id: 'minarett', name: 'Minarett', icon: '🗼', cat: 'moschee' },
  { id: 'halbmond', name: 'Halbmond-Spitze', icon: '☪️', cat: 'moschee' }, { id: 'bogen', name: 'Torbogen', icon: '🚪', cat: 'moschee' },
  { id: 'saeule', name: 'Säule', icon: '🏛️', cat: 'moschee' }, { id: 'mihrab', name: 'Mihrab (Gebetsnische)', icon: '🧭', cat: 'moschee' },
  { id: 'minbar', name: 'Minbar (Kanzel)', icon: '🪜', cat: 'moschee' }, { id: 'reihen', name: 'Gebetsreihen (Teppich)', icon: '🟥', cat: 'moschee' },
  { id: 'rehal', name: 'Koranständer', icon: '📖', cat: 'moschee' }, { id: 'leuchter', name: 'Moschee-Leuchter', icon: '🪔', cat: 'moschee' },
  { id: 'wudu', name: 'Waschplatz (Wudu)', icon: '🚰', cat: 'moschee' }, { id: 'schuhe', name: 'Schuhregal', icon: '👞', cat: 'moschee' },
  { id: 'fenster', name: 'Bogenfenster', icon: '🪟', cat: 'moschee' },
];
export const MATERIALS = [
  { id: 'sand', name: 'Sandstein' },
  { id: 'mud', name: 'Lehmziegel' },
  { id: 'coral', name: 'Korallenstein' },
  { id: 'marble', name: 'Marmor' },
  { id: 'wood', name: 'Palmholz' },
  { id: 'tile', name: 'Fliese' },
  { id: 'basalt', name: 'Basalt' },
  { id: 'glass', name: 'Glas' },
  { id: 'green', name: 'Hecke' },
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

// Amanah-Ausleihe: Fahrzeuge werden höflich ausgeliehen und ehrlich zurückgegeben (kein Stehlen, keine Verfolgung)
export const BORROW = {
  hail: '✋ Anhalten & fragen',
  ask: '✋ Fahrer fragen',
  // richtiger Artikel je Fahrzeug: „deinen Helikopter“, „dein Motorrad“, „deine Limousine“ …
  askLine: (name) => {
    const m = { Helikopter: 'deinen Helikopter', Bus: 'deinen Bus', SUV: 'deinen SUV', Minivan: 'deinen Minivan', Kleinwagen: 'deinen Kleinwagen', Pickup: 'deinen Pickup', Sportwagen: 'deinen Sportwagen', Geländewagen: 'deinen Geländewagen', Kombi: 'deinen Kombi',
      'E-Scooter': 'deinen E-Scooter', Limousine: 'deine Limousine', Motorrad: 'dein Motorrad', Geländemotorrad: 'dein Geländemotorrad', Fahrrad: 'dein Fahrrad', 'E-Bike': 'dein E-Bike', Coupé: 'dein Coupé', Schrägheck: 'dein Auto' };
    return `As-salāmu ʿalaikum! Darf ich ${m[name] || 'dein Fahrzeug'} ausleihen?`;
  },
  yesLine: 'Wa ʿalaikumu s-salām! Gern – es ist eine Amanah, bring es gut zurück!',
  enter: (name) => `🔑 Einsteigen (${name})`,
  self: '🕹️ Selbst fahren', auto: '🧭 Automatisch',
  exit: '🚪 Aussteigen', give: '🤝 Zurückgeben',
  thanks: 'Jazāk Allāhu khairan! Danke, dass du es gut zurückgebracht hast.',
  hasanat: 'Ehrlich zurückgegeben – eine gute Tat (Amanah gehalten).',
  far: (where) => `Bring es bitte zurück zu ${where} – die Karte zeigt dir den Weg.`,
  ownerName: 'dem Fahrer', standName: 'dem Taxistand',
  standReturn: 'Danke! Der Fahrer holt es hier am Taxistand ab.',
  braking: 'Vorsicht – Fußgänger! Das Fahrzeug bremst.',
  rent: (name) => `🔑 Ausleihen: ${name}`,
  rentBack: 'Abgestellt – danke, dass du gut darauf aufgepasst hast!',
  landFirst: 'Erst landen (Runter), dann aussteigen.',
  noLandKaaba: 'Hier nicht landen – über der Kaaba und dem Mataf wird aus Respekt nicht geflogen und nicht gelandet.',
  noLandNabawi: 'Hier nicht landen – auf der Prophetenmoschee wird aus Respekt nicht gelandet.',
  noLandMosque: 'Bitte nicht auf einer Moschee landen – such dir einen freien Platz.',
  heli: '🚁 Helikopter-Landeplatz',
  arrived: (n) => `Angekommen: ${n}`,
  choose: 'Wohin soll es gehen?',
  stand: ['موقف سيارات الأجرة', 'Taxi & Verleih'],
  info: '<b>Amanah</b> heißt: etwas, das dir anvertraut wurde. Wer sich ein Fahrzeug ausleiht, fährt vorsichtig, hält Fußgängern an und bringt es so zurück, wie er es bekommen hat. '
    + 'Fahren: linker Daumen auf die Lenkfläche (Gas kommt von selbst), rechter Daumen Bremse – in der Kurve bei Tempo = Drift, im Stand = rückwärts. ⚡ Nitro einmal antippen. Am Laptop W/A/S/D, Umschalt = Nitro, Leertaste = Bremse/Drift. Tacho antippen = eigene Einstellung.',
};

// Selbst fahren zwischen Mekka und Medina (eine Landschaft, mehrere Strecken). Maßstab verkleinert, Anzeige in echten km.
export const ROADTRIP = {
  day: 'Unterwegs',
  title: (to) => `Nach ${to === 'medina' ? 'Medina' : 'Mekka'}`,
  intro: 'Du fährst selbst! Drei Strecken führen zwischen Mekka und Medina: die <b>Autobahn</b> (schnell), die <b>Bergstraße</b> (Kurven durch die Berge) '
    + 'und die <b>Wüstenpiste</b> durch das Sandmeer mit Dünen und Sprungschanzen. Unterwegs liegen Dörfer mit Moscheen und der Rastplatz mit der Oasen-Moschee. '
    + 'Goldene Ringe sind <b>Parkours</b> – fahr hindurch und schlag deine Bestzeit. Die Karte oben rechts zeigt alles.',
  fork: ['طريق الجبل · الطريق السريع · طريق الصحراء', '← Bergstraße  ·  Autobahn ↑  ·  Wüstenpiste →'],
  forkBack: ['طريق الجبل · الطريق السريع · طريق الصحراء', '← Wüstenpiste  ·  Autobahn ↑  ·  Bergstraße →'],
  km: (city, km) => `→ ${city} · ${km} km`,
  courses: { wueste: 'Wüsten-Parkour', berg: 'Berg-Parkour' },
  courseStart: (n) => `🏁 ${n} – los! Fahr durch alle goldenen Ringe.`,
  courseRing: (n, i, all, t) => `${n} · Ring ${i}/${all} · ${t}`,
  courseDone: (n, t, best) => `🏆 ${n} geschafft in ${t}${best ? ' – neue Bestzeit!' : ''}`,
  courseBest: (t) => `Bestzeit: ${t}`,
  rest: '🕌 Rastplatz mit Oasen-Moschee',
  village: (n) => `Willkommen im ${n}`,
  arrive: (c) => `Willkommen in ${c === 'medina' ? 'Medina' : 'Mekka'}!`,
};

// Betretbare Läden und Aussichtsplattform (src/life/shops.js). Kein Geld: alles zum Ausprobieren.
export const SHOPS = {
  types: {
    kleidung: { name: 'Kleidung · Thobe & Abaya', sign: ['ملابس', 'Kleidung · Thobe & Abaya'], colors: ['#e9e2d4', '#d9cfbd', '#f4efe6', '#8a6a4a'], awning: 0x2c3a4a },
    autos: { name: 'Autogalerie', sign: ['معرض سيارات', 'Autogalerie'], colors: ['#2b2f34', '#202327', '#e9edf0', '#3a4148'], awning: 0x2b2f34 },
    reise: { name: 'Reisebüro', sign: ['وكالة سفر', 'Reisebüro'], colors: ['#e8eef2', '#d6e2ea', '#f2f6f8', '#3a7bbf'], awning: 0x3a7bbf },
    doener: { name: 'Döner · Shawarma', sign: ['شاورما', 'Döner · Shawarma'], colors: ['#c9b48e', '#b59e78', '#f3e6cc', '#7a3b1e'], awning: 0xb5402a },
    parfum: { name: 'Parfüm · Oud', sign: ['عطور', 'Parfüm · Oud'], colors: ['#efe6d6', '#e0d3bd', '#f6f0e4', '#5a2e4a'], awning: 0x5a2e4a },
    datteln: { name: 'Datteln & Süßes', sign: ['تمور', 'Datteln & Süßes'], colors: ['#d9c39a', '#c8ae82', '#f4ead6', '#6b4426'], awning: 0x6b4426 },
    buero: { name: 'Büro · Hochhaus', sign: ['مكتب', 'Büro'], colors: ['#d8dde2', '#c8ced5', '#f2f4f6', '#4a5560'], awning: 0x4a5560 },
    buecher: { name: 'Bücher', sign: ['مكتبة', 'Bücher'], colors: ['#e6dccb', '#d6c9b2', '#f3ede2', '#2f5a3e'], awning: 0x2f5a3e },
  },
  enter: (n) => `Eintreten: ${n}`,
  welcome: (n) => `Willkommen bei „${n}“`,
  exit: 'Hinausgehen',
  wear: (n) => `Anziehen: ${n}`,
  worn: (n) => `Neue Kleidung: ${n} – steht dir gut!`,
  outfitsM: [{ name: 'Thobe Creme', c: 0xe9e4d8 }, { name: 'Thobe Grau', c: 0x8a9099 }, { name: 'Thobe Dunkelblau', c: 0x2c3a4a }, { name: 'Thobe Braun', c: 0x6b5240 }, { name: 'Thobe Oliv', c: 0x5c6448 }],
  outfitsF: [{ name: 'Abaya Schwarz', c: 0x1f1f24 }, { name: 'Abaya Dunkelblau', c: 0x2c3a4a }, { name: 'Abaya Braun', c: 0x5a4636 }, { name: 'Abaya Grau', c: 0x5d6168 }, { name: 'Abaya Oliv', c: 0x4a5040 }],
  testDrive: (n) => `Probefahrt: ${n}`,
  carBanner: 'PROBEFAHRT · KOSTENLOS',
  trips: [
    { id: 'medina', img: 'medina', title: 'Medina', icon: '✈️', label: 'Reise nach Medina' },
    { id: 'mecca', img: 'mecca', title: 'Mekka', icon: '✈️', label: 'Reise nach Mekka' },
    { id: 'coast', img: 'sea', title: 'Rotes Meer', icon: '🌊', label: 'Rotes Meer · Jetski' },
    { id: 'road', img: 'rocks', title: 'Autobahn', icon: '🛣️', label: 'Autobahn-Abenteuer' },
  ],
  menu: ['Döner im Fladenbrot', 'Shawarma-Teller', 'Falafel', 'Ayran', 'Frischer Saft'],
  order: 'Bestellen',
  orders: ['Ein Döner mit Salat – bitte schön! Bismillah und guten Appetit 🥙', 'Ein Shawarma-Teller mit Reis – guten Appetit!', 'Falafel mit Hummus – frisch aus der Pfanne!', 'Ein kühles Ayran – erfrischend bei der Hitze!'],
  smell: 'Duft testen',
  smells: ['Oud – warm und holzig 🌳', 'Rose aus Taif – blumig 🌹', 'Moschus – sanft und frisch ✨', 'Amber – süß und warm 🍯'],
  taste: 'Datteln probieren',
  tastes: ['Ajwa-Datteln aus Medina – weich und süß', 'Sukkari-Datteln – fast wie Karamell', 'Medjool-Datteln – groß und saftig', 'Ma\'amoul – Gebäck mit Dattelfüllung'],
  browse: 'Stöbern',
  browsed: 'Viele Bücher auf Arabisch und anderen Sprachen – zum Lesen und Lernen.',
  elevatorUp: (m) => `Aufzug zur Aussichtsplattform (${m} m)`,
  elevatorDown: 'Aufzug nach unten',
  onTop: (m) => `Aussichtsplattform in ${m} m Höhe – schau dich um!`,
  soon: 'Kommt bald!',
};

// Geld (Saudi-Riyal, SAR) und Preise in den Läden (src/life/wallet.js, src/life/shops.js)
export const PRICES = {
  outfit: 60, doener: 12, parfum: 35, datteln: 8, buch: 20,
  cars: { sport: 4000, suv: 2500, coupe: 3200 },
  buy: (n, p) => `Kaufen: ${n} (${p} SAR)`,
  buyPlain: (p) => `Kaufen (${p} SAR)`,
  noMoney: (p, have) => `Zu wenig Geld: ${p} SAR nötig, du hast ${have} SAR – verdiene mehr mit Jobs (💼)`,
  bookBought: 'Ein schönes Buch – viel Freude beim Lesen! 📖',
  carOwned: 'Dein Auto – losfahren',
  carBought: (n) => `Glückwunsch! Der ${n} gehört dir. Unten „🔑 Mein Auto“ ruft ihn jederzeit.`,
};

// Jobs (src/life/jobs.js): ehrliche Arbeit für ein Einkommen
export const JOBS = {
  title: 'Jobs · Arbeit',
  sub: 'Verdiene Geld mit kleinen Aufträgen und kaufe dir davon etwas in den Läden.',
  board: ['وظائف', 'Jobs · Arbeit'],
  open: '💼 Jobs',
  myCar: '🔑 Mein Auto',
  boardDo: '💼 Jobs ansehen',
  cancel: 'Aktuellen Job abbrechen',
  cancelled: 'Job abgebrochen',
  busy: 'Erst den aktuellen Job beenden (oder abbrechen)',
  list: [
    { id: 'taxi', icon: '🚕', name: 'Taxifahrer', info: 'Fahrgast abholen und ans Ziel bringen (mit einem Auto)', pay: '30–90 SAR' },
    { id: 'delivery', icon: '🥙', name: 'Lieferdienst', info: 'Essen beim Döner abholen und schnell liefern', pay: '25–40 SAR' },
    { id: 'help', icon: '🤝', name: 'Pilger helfen', info: 'Einen Pilger, der sich verlaufen hat, zur Moschee begleiten', pay: '20 SAR + gute Tat' },
    { id: 'office', icon: '💼', name: 'Büro-Job', info: 'Im Hochhaus fünf Akten am Computer bearbeiten', pay: '60 SAR' },
  ],
  taxi: { start: 'Taxi-Job: Hol den Fahrgast ab (Ziel auf der Karte). Du brauchst ein Auto – z. B. am Taxistand.', pick: 'Fahrgast abholen', drop: (n) => `Fahrgast nach „${n}“ bringen`, inCar: 'Mit einem Auto abholen – steig zuerst ein', aboard: 'Fahrgast eingestiegen: „As-salamu alaikum!“', done: (p) => `Angekommen! „Jazak Allahu khairan“ – ${p} SAR verdient 🚕` },
  delivery: { start: 'Lieferdienst: Hol das Essen beim Döner-Laden ab.', pick: 'Essen beim Döner abholen', got: 'Essen abgeholt 🥡 – schnell liefern!', drop: (n) => `Essen liefern: ${n}`, done: (p, fast) => `Geliefert${fast ? ' – super schnell!' : ''} ${p} SAR verdient 🥙` },
  help: { start: 'Ein Pilger hat sich verlaufen – finde ihn (Ziel auf der Karte).', find: 'Pilger finden', follow: 'Der Pilger folgt dir – bring ihn zur Moschee', goal: 'Pilger zur Moschee begleiten', thanks: '„Möge Allah dich belohnen!“ – 20 SAR und eine gute Tat 🤝' },
  office: { start: 'Büro-Job: Geh zum Hochhaus am Boulevard (Ziel auf der Karte).', go: 'Zum Büro im Hochhaus', enter: '💼 Ins Büro gehen', task: (k) => `Akte ${k}/5 bearbeiten (leuchtender Schreibtisch)`, file: '📄 Akte bearbeiten', fileDone: (k) => `Akte ${k}/5 erledigt ✔`, done: 'Feierabend! 60 SAR verdient 💼' },
};
