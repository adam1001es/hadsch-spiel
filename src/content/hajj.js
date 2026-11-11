// Einzige Quelle für alle Texte im Spiel. Vereinfachte Lerndarstellung (Hadsch at-Tamattu').

export const TALBIYAH = {
  ar: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
  tr: 'Labbaika llāhumma labbaik, labbaika lā scharīka laka labbaik, inna l-ḥamda wa n-niʿmata laka wa l-mulk, lā scharīka lak.',
  de: 'Hier bin ich, o Allah, hier bin ich. Hier bin ich, Du hast keinen Teilhaber, hier bin ich. Alles Lob, alle Gnade und alle Herrschaft gehören Dir. Du hast keinen Teilhaber.',
};

export const RABBANA = {
  ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
  tr: 'Rabbanā ātinā fi d-dunyā ḥasanatan wa fi l-āchirati ḥasanatan wa qinā ʿadhāba n-nār.',
  de: 'Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes und bewahre uns vor der Strafe des Feuers. (Sure 2:201)',
};

export const SAFA_AYAH = {
  ar: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ',
  tr: 'Inna ṣ-ṣafā wa l-marwata min schaʿāʾiri llāh.',
  de: 'Safa und Marwa gehören zu den Kultzeichen Allahs. (Sure 2:158)',
};

export const ARAFAT_DHIKR = {
  ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
  tr: 'Lā ilāha illa llāhu waḥdahu lā scharīka lah, lahu l-mulku wa lahu l-ḥamd, wa huwa ʿalā kulli schayʾin qadīr.',
  de: 'Es gibt keinen Gott außer Allah, dem Einzigen ohne Teilhaber. Ihm gehört die Herrschaft und das Lob, und Er hat Macht über alles.',
};

export const DISCLAIMER =
  'Vereinfachte Lerndarstellung des Hadsch at-Tamattu\'. Details unterscheiden sich je nach Rechtsschule. Für deine eigene Pilgerfahrt frag einen Gelehrten.';

// Reihenfolge = Spielablauf. `id` muss zu einer Datei in src/stations/ passen (sonst Info-Station).
export const STATIONS = [
  {
    id: 'miqat', day: 'Vor dem 8. Dhul-Hiddscha', title: 'Miqat & Ihram',
    intro: 'Am Miqat beginnt der Weihezustand (Ihram). Ghusl, Ihram-Kleidung anlegen, Absicht für die Umrah fassen und die Talbiyah sprechen.',
    steps: ['Ghusl & Ihram anlegen', 'Niyya: Labbaika ʿumratan', 'Talbiyah sprechen'],
  },
  {
    id: 'tawaf', kind: 'umrah', hour: 21, day: 'Umrah · Mekka', title: 'Tawaf der Umrah',
    intro: 'Beginne an der grünen Linie beim Schwarzen Stein. Die Kaaba bleibt links, 7 Runden. Männer: rechte Schulter frei (Idtiba\'), in den ersten 3 Runden zügige kurze Schritte (Raml).',
  },
  {
    id: 'sai', umrah: true, day: 'Umrah', title: 'Sa\'i zwischen Safa und Marwa',
    intro: '7 Strecken, Beginn auf Safa, Ende auf Marwa – in Erinnerung an Hadschar, die hier nach Wasser für Ismail suchte. Danach Haare kürzen (Taqsir): Die Umrah ist vollständig.',
  },
  {
    id: 'mina', phase: 'd8', day: '8. Dhul-Hiddscha · Tarwiya', title: 'Mina',
    intro: 'Neuer Ihram mit der Absicht für den Hadsch (Labbaika ḥaddschan). In Mina betest du Dhuhr, Asr, Maghrib, Isha und Fajr – verkürzt, aber jedes zu seiner Zeit.',
  },
  {
    id: 'arafat', day: '9. Dhul-Hiddscha · Tag von Arafa', title: 'Arafat',
    intro: 'Der Aufenthalt in Arafat (Wuquf) ist der Kern des Hadsch. Dhuhr und Asr zusammengelegt und verkürzt, dann Dua bis Sonnenuntergang.',
  },
  {
    id: 'muzdalifa', day: 'Nacht zum 10. Dhul-Hiddscha', title: 'Muzdalifa',
    intro: 'Maghrib und Isha zusammen beten, Kieselsteine sammeln (Kichererbsen-Größe), unter freiem Himmel schlafen, Fajr beten und vor Sonnenaufgang nach Mina ziehen.',
  },
  {
    id: 'jamarat', list: ['aqaba'], hour: 8.5, day: '10. Dhul-Hiddscha · Yaum an-Nahr', title: 'Dschamrat al-Aqaba',
    intro: 'Nur die große Dschamra: 7 Steine, bei jedem Wurf „Allahu Akbar“. Der Stein muss im Becken landen. Mit dem ersten Wurf endet die Talbiyah.',
  },
  {
    id: 'mina', phase: 'd10', day: '10. Dhul-Hiddscha', title: 'Opfer & Rasur',
    intro: 'Für Tamattu\' ist ein Opfertier (Hady) Pflicht, heute meist per Gutschein organisiert. Männer rasieren (Halq) oder kürzen (Taqsir), Frauen kürzen eine Fingerspitzenlänge. Erstes Tahallul: Alle Ihram-Verbote enden außer der Ehe.',
  },
  {
    id: 'tawaf', kind: 'ifada', hour: 16, day: '10. Dhul-Hiddscha', title: 'Tawaf al-Ifada',
    intro: 'Eine Säule (Rukn) des Hadsch. 7 Runden, ohne Raml und Idtiba\'.',
  },
  {
    id: 'sai', umrah: false, day: '10. Dhul-Hiddscha', title: 'Sa\'i des Hadsch',
    intro: '7 Strecken von Safa nach Marwa. Danach endet auch das letzte Ihram-Verbot (zweites Tahallul).',
  },
  {
    id: 'jamarat', list: ['ula', 'wusta', 'aqaba'], hour: 14.5, day: '11.–12. Dhul-Hiddscha · Taschriq', title: 'Die drei Dschamarat',
    intro: 'Nach dem Mittag: kleine, mittlere, dann große Dschamra, je 7 Steine. Nach den ersten beiden Richtung Qibla Dua machen. Am 12. wiederholen; wer bis Sonnenuntergang bleibt, wirft auch am 13.',
  },
  {
    id: 'tawaf', kind: 'wada', hour: 22.5, day: 'Abreise', title: 'Abschieds-Tawaf',
    intro: 'Der Tawaf al-Wada\' ist das Letzte vor der Abreise. Frauen in der Menstruation sind davon befreit.',
  },
];

export const ENDING = {
  ar: 'حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا',
  tr: 'Ḥaddschan mabrūran wa dhanban maghfūrā',
  de: 'Ein angenommener Hadsch und vergebene Sünden.',
};

// ---------------------------------------------------------------------------
// Texte für die interaktiven Stationen (Hinweise, Wissensfragen). Inhaltlich nach docs/SPIEL.md und CLAUDE.md.
export const TEXT = {
  controls: 'Gehen: Joystick links (Laptop: W A S D, Umschalt = zügig). Umschauen: rechts wischen (Laptop: Maus ziehen oder ← →).',
  tawaf: {
    start: 'Stell dich an die grüne Linie beim Schwarzen Stein und geh los – die Kaaba bleibt immer links von dir.',
    wrongWay: 'Andere Richtung: Beim Tawaf ist die Kaaba immer links von dir (gegen den Uhrzeigersinn).',
    hijrIn: 'Du bist im Hijr Ismail. Er gehört zur Kaaba – eine Runde hindurch zählt nicht. Geh außen herum.',
    hijrLap: 'Diese Runde ging durch den Hijr und zählt nicht. Geh sie noch einmal außen herum.',
    istilam: '✋ Istilam: Bismillah, Allahu Akbar',
    istilamInfo: 'Am Schwarzen Stein: zu ihm hin grüßen (Istilam) mit „Bismillah, Allahu Akbar“ – bei jeder Runde.',
    raml: 'Raml (nur Männer, nur im Tawaf der Umrah): Runden 1–3 mit zügigen, kurzen Schritten – Joystick weit ziehen oder Umschalt halten.',
    free: 'Freies Dua und Dhikr, in jeder Sprache.',
    yemeni: 'Zwischen Rukn al-Yamani und Schwarzem Stein:',
    done: 'Der Tawaf ist vollständig.',
    doneWada: 'Der Abschieds-Tawaf ist vollständig.',
    after: 'Sunnah: Geh hinter Maqam Ibrahim (goldene Säule) und bete 2 Rak\'at, dann trink Zamzam. Danach weiter zum Ausgang (grün).',
    maqamGoal: 'Hinter Maqam Ibrahim', zamzamGoal: 'Zamzam', exitGoal: 'Ausgang',
    maqamPray: '2 Rak\'at beten', zamzamDrink: 'Zamzam trinken',
  },
};
