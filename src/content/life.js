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
