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
