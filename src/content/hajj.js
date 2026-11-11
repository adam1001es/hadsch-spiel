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

  miqat: {
    goGhusl: 'Waschhaus', ghusl: 'Ghusl nehmen',
    ghuslInfo: 'Vor dem Ihram: Ghusl (Ganzkörperwaschung). Danach die Ihram-Kleidung anlegen.',
    clothesQ: 'Welche Kleidung legt ein Mann für den Ihram an?',
    clothes: [
      { html: 'Zwei ungenähte weiße Tücher: Izar (um die Hüfte) und Rida\' (über die Schultern)', ok: true, why: 'Richtig. Frauen tragen ihre normale bedeckende Kleidung – ohne Niqab und ohne Handschuhe.' },
      { html: 'Ein weißes, genähtes Gewand mit Kopfbedeckung', ok: false, why: 'Männer tragen im Ihram keine genähte Kleidung und bedecken den Kopf nicht.' },
      { html: 'Normale Alltagskleidung', ok: false, why: 'Für Männer gilt besondere Kleidung: zwei ungenähte Tücher.' },
    ],
    clothesQF: 'Was trägt eine Frau im Ihram?',
    clothesF: [
      { html: 'Ihre normale bedeckende Kleidung – ohne Niqab und ohne Handschuhe', ok: true, why: 'Richtig. Männer tragen dagegen zwei ungenähte weiße Tücher (Izar und Rida\').' },
      { html: 'Zwei ungenähte weiße Tücher (Izar und Rida\')', ok: false, why: 'Das ist die Ihram-Kleidung der Männer. Frauen tragen ihre normale bedeckende Kleidung.' },
      { html: 'Bedeckende Kleidung mit Niqab und Handschuhen', ok: false, why: 'Im Ihram tragen Frauen keinen Niqab und keine Handschuhe.' },
    ],
    rulesF: [['Niqab oder Handschuhe tragen', true]],
    goMosque: 'Moschee', niyyaPlace: 'Niyya fassen',
    niyyaQ: 'Mit welcher Absicht beginnst du am Miqat (Hadsch at-Tamattu\')?',
    niyya: [
      { html: '<span class="ar">لَبَّيْكَ عُمْرَةً</span>Labbaika ʿumratan – Hier bin ich, für die Umrah.', ok: true, why: 'Richtig. Beim Tamattu\' kommt zuerst die Umrah; die Absicht für den Hadsch folgt am 8. Dhul-Hiddscha.' },
      { html: '<span class="ar">لَبَّيْكَ حَجًّا</span>Labbaika ḥaddschan – Hier bin ich, für den Hadsch.', ok: false, why: 'Diese Absicht fasst du beim Tamattu\' erst am 8. Dhul-Hiddscha in Mina.' },
    ],
    talbiyahQ: 'Sprich die Talbiyah: Tippe die Teile in der richtigen Reihenfolge an.',
    talbiyahParts: ['Labbaika llāhumma labbaik,', 'labbaika lā scharīka laka labbaik,', 'inna l-ḥamda wa n-niʿmata laka wa l-mulk,', 'lā scharīka lak.'],
    rulesQ: 'Was ist im Ihram verboten?',
    rules: [
      ['Parfüm benutzen', true], ['Haare oder Nägel schneiden', true], ['Jagen', true], ['Eheliche Intimität', true],
      ['Männer: Kopf bedecken, genähte Kleidung', true], ['Beten, Dhikr, Talbiyah', false], ['Wasser trinken und essen', false],
    ],
    rulesInfo: 'Ihram-Verbote: kein Parfüm, kein Haare- oder Nägelschneiden, keine Jagd, keine eheliche Intimität; Männer: Kopf nicht bedecken, keine genähte Kleidung.',
    goBus: 'Bus nach Mekka', bus: 'Nach Mekka reisen',
  },

  sai: {
    startInfo: 'Du stehst auf Safa. Hadschar lief hier sieben Mal zwischen den Hügeln, auf der Suche nach Wasser für ihren Sohn Ismail – bis Zamzam entsprang.',
    ayah: 'Ayah rezitieren & Dua', duaHill: 'Dua Richtung Kaaba',
    go: 'Lauf Richtung Marwa (Spur links der Mitte).', back: 'Zurück Richtung Safa (Spur rechts der Mitte).',
    green: 'Grüne Lichter: Hier eilen Männer.',
    greenF: 'Grüne Lichter: Hier eilen Männer – du gehst in deinem Tempo weiter.',
    taqsirF: 'Frauen kürzen eine Fingerspitzenlänge.', greenHint: 'Im grünen Bereich zügig laufen: Joystick weit ziehen oder Umschalt halten.',
    turn: 'Dua Richtung Kaaba, dann umkehren', faceKaaba: 'Richtung Kaaba (Pfeil)',
    taqsir: 'Haare kürzen (Taqsir)', taqsirGoal: 'Friseur bei Marwa',
    umrahDone: 'Die Umrah ist vollständig. Du verlässt den Ihram bis zum 8. Dhul-Hiddscha.',
    hajjDone: 'Damit endet auch das letzte Ihram-Verbot (zweites Tahallul).',
    exit: 'Ausgang',
  },

  mina8: {
    ihramQ: 'Am 8. Dhul-Hiddscha legst du erneut den Ihram an. Welche Absicht fasst du?',
    ihram: [
      { html: '<span class="ar">لَبَّيْكَ حَجًّا</span>Labbaika ḥaddschan – Hier bin ich, für den Hadsch.', ok: true, why: 'Richtig. Jetzt beginnt der Hadsch.' },
      { html: '<span class="ar">لَبَّيْكَ عُمْرَةً</span>Labbaika ʿumratan – Hier bin ich, für die Umrah.', ok: false, why: 'Die Umrah hast du schon vollendet. Jetzt geht es um den Hadsch.' },
    ],
    tentGoal: 'Dein Zelt', tent: 'Ins Zelt',
    prayers: [
      { name: 'Dhuhr', hour: 12.5, rakat: 2, opts: [2, 4], why: 'In Mina werden die Vierer-Gebete verkürzt: 2 Rak\'at.' },
      { name: 'Asr', hour: 15.67, rakat: 2, opts: [2, 4], why: 'Verkürzt auf 2 Rak\'at – aber nicht mit Dhuhr zusammengelegt, jedes zu seiner Zeit.' },
      { name: 'Maghrib', hour: 18.5, rakat: 3, opts: [2, 3], why: 'Maghrib wird nie verkürzt: 3 Rak\'at.' },
      { name: 'Isha', hour: 20, rakat: 2, opts: [2, 4], why: 'Isha verkürzt auf 2 Rak\'at.' },
      { name: 'Fajr', hour: 29.33, rakat: 2, opts: [2, 4], why: 'Fajr hat ohnehin 2 Rak\'at.' },
    ],
    prayQ: (n) => `Wie viele Rak'at betest du ${n} in Mina?`,
    sleep: 'In Mina übernachten', sleepHold: 'Halten: schlafen',
    note: 'Vierer-Gebete werden verkürzt, aber nicht zusammengelegt.',
    leave: 'Nach Sonnenaufgang nach Arafat', busGoal: 'Bus nach Arafat',
  },

  arafat: {
    start: 'Der Aufenthalt (Wuquf) ist der Kern des Hadsch – „Der Hadsch ist Arafat.“ Geh hinein in die Ebene von Arafat (Grenzschilder).',
    boundary: 'Grenze von Arafat', inside: 'Du bist in Arafat.',
    outside: 'Hier ist noch nicht Arafat – geh hinter die Grenzschilder.',
    prayQ: 'Wie betest du Dhuhr und Asr in Arafat?',
    pray: [
      { html: 'Zusammengelegt und verkürzt: je 2 Rak\'at, direkt nacheinander zur Zeit des Dhuhr', ok: true, why: 'Richtig. Nach der Predigt werden Dhuhr und Asr zusammengelegt und verkürzt.' },
      { html: 'Getrennt, jedes zu seiner Zeit, mit 4 Rak\'at', ok: false, why: 'In Arafat werden Dhuhr und Asr zusammengelegt und verkürzt.' },
    ],
    sermon: 'Predigt hören, Dhuhr & Asr beten',
    duaGoal: 'Platz mit Blick zum Jabal ar-Rahma',
    dua: 'Halten: Dua',
    duaTexts: ['ARAFAT', 'Astaghfirullah – Ich bitte Allah um Vergebung.', 'Bitte für deine Eltern, deine Familie und alle Muslime.', 'RABBANA', 'Bleib bis Sonnenuntergang.'],
    stay: 'Bleib bis Sonnenuntergang in Arafat.',
    leave: 'Nach Sonnenuntergang nach Muzdalifa', busGoal: 'Bus nach Muzdalifa',
  },

  muzdalifa: {
    start: 'Muzdalifa bei Nacht. Zuerst Maghrib und Isha zusammen beten.',
    prayQ: 'Wie betest du Maghrib und Isha in Muzdalifa?',
    pray: [
      { html: 'Zusammen: Maghrib 3 Rak\'at, dann Isha 2 Rak\'at', ok: true, why: 'Richtig. In Muzdalifa werden Maghrib und Isha zusammengelegt (Isha verkürzt).' },
      { html: 'Nur Maghrib, Isha erst morgen früh', ok: false, why: 'Beide werden in Muzdalifa zusammen gebetet.' },
    ],
    stones: 'Sammle 7 Kiesel: Tippe Steine in deiner Nähe an.',
    stonesInfo: 'Etwa so groß wie Kichererbsen. Für den 10. brauchst du 7; viele sammeln hier gleich alle 49 (bzw. 70).',
    tooFar: 'Geh näher heran (Joystick), dann tippen.',
    matGoal: 'Freie Matte', sleep: 'Halten: unter freiem Himmel schlafen',
    fajr: 'Fajr beten', masharGoal: 'Al-Mash\'ar al-Haram', dhikr: 'Halten: Dhikr',
    leave: 'Vor Sonnenaufgang nach Mina', busGoal: 'Weg nach Mina',
  },

  jamarat: {
    approach: 'Geh an den Rand des Beckens.',
    aim: 'Werfen: auf der rechten Seite nach unten ziehen (wie eine Schleuder) und loslassen. Seitlich ziehen = zielen.',
    valid: 'Allahu Akbar ✓', short: 'Zu kurz – der Stein muss im Becken landen. Wirf noch einmal.',
    long: 'Zu weit – der Stein muss im Becken landen. Wirf noch einmal.', miss: 'Daneben – der Stein muss im Becken landen. Wirf noch einmal.',
    talbiyahEnds: 'Die Talbiyah endet jetzt.',
    tooFar: 'Geh näher an das Becken heran.',
    names: { ula: ['الجمرة الصغرى', 'Kleine Dschamra (al-Ula)'], wusta: ['الجمرة الوسطى', 'Mittlere Dschamra (al-Wusta)'], aqaba: ['جمرة العقبة', 'Große Dschamra (al-Aqaba)'] },
    dua: 'Dua Richtung Qibla', duaGoal: 'Etwas zur Seite treten',
    next: 'Zur nächsten Dschamra', afterAll: 'Am 12. wiederholt sich das; wer Mina bis Sonnenuntergang am 12. nicht verlässt, wirft auch am 13.',
    toTawaf: 'Zum Abschieds-Tawaf', toMina: 'Weiter', exitGoal: 'Ausgang',
  },

  mina10: {
    hadyGoal: 'Hady-Schalter', hady: 'Hady-Gutschein zeigen',
    hadyInfo: 'Für Tamattu\' ist ein Opfertier (Hady) Pflicht – heute meist per offiziellem Gutschein; das Fleisch geht an Bedürftige.',
    barberGoal: 'Friseur',
    hairQ: 'Halq oder Taqsir?',
    hair: [
      { html: 'Halq – Kopf rasieren (Männer, besser)', ok: true, why: 'Halq ist für Männer besser. Frauen kürzen eine Fingerspitzenlänge.' },
      { html: 'Taqsir – Haare kürzen', ok: true, why: 'Auch Taqsir ist erlaubt. Frauen kürzen eine Fingerspitzenlänge.' },
    ],
    hairQF: 'Was machst du beim Haareschneiden als Frau?',
    hairF: [
      { html: 'Taqsir – eine Fingerspitzenlänge kürzen', ok: true, why: 'Richtig. Frauen kürzen eine Fingerspitzenlänge.' },
      { html: 'Halq – den Kopf rasieren', ok: false, why: 'Halq ist für Männer. Frauen kürzen eine Fingerspitzenlänge (Taqsir).' },
    ],
    tahallul: 'Erstes Tahallul: Alle Ihram-Verbote enden außer der ehelichen Intimität. Normale Kleidung ist erlaubt.',
    order: 'Die Reihenfolge Werfen → Opfer → Rasieren → Tawaf ist Sunnah; Abweichungen sind erlaubt.',
    clothesGoal: 'Zelt: Kleidung wechseln', clothes: 'Normale Kleidung anziehen',
    leave: 'Nach Mekka zum Tawaf al-Ifada', busGoal: 'Bus nach Mekka',
  },

  // Lernkarten je Station (gleiche Reihenfolge wie STATIONS). tasks: Aufgabenliste (s: true = Sunnah, freiwillig).
  learn: [
    {
      what: 'Der Miqat ist die Grenze, an der Pilger den Weihezustand (Ihram) beginnen.',
      why: 'Hier beginnt die Umrah – der erste Teil des Hadsch at-Tamattu\'.',
      tasks: [{ t: 'Zum Waschhaus gehen und Ghusl nehmen' }, { t: 'Ihram-Kleidung anlegen', tf: 'Ihram: bedeckende Kleidung (ohne Niqab und Handschuhe)' }, { t: 'In der Moschee die Absicht (Niyya) fassen' }, { t: 'Die Talbiyah sprechen', s: true }, { t: 'Die Ihram-Verbote kennenlernen' }, { t: 'Zum Bus nach Mekka gehen' }],
      fact: 'Männer tragen zwei ungenähte weiße Tücher (Izar und Rida\'), Frauen ihre normale bedeckende Kleidung.',
      recap: ['Ihram ist der Weihezustand – er beginnt am Miqat.', 'Männer tragen zwei ungenähte weiße Tücher.', 'Absicht für die Umrah: „Labbaika ʿumratan“.', 'Im Ihram verboten: z. B. Parfüm, Haare- und Nägelschneiden, Jagen.'],
      quiz: { q: 'Was bedeutet „Ihram“?', o: [{ html: 'Der Weihezustand der Pilger', ok: true, why: 'Richtig! Im Ihram gelten besondere Regeln.' }, { html: 'Der Name einer Moschee in Medina', ok: false, why: 'Nein – Ihram ist der Weihezustand der Pilger.' }, { html: 'Ein Gebet am Abend', ok: false, why: 'Nein – Ihram ist der Weihezustand der Pilger.' }] },
    },
    {
      what: 'Tawaf heißt: 7 Runden um die Kaaba – gegen den Uhrzeigersinn, die Kaaba immer links.',
      why: 'Der Tawaf gehört zur Umrah. Er beginnt und endet am Schwarzen Stein (grüne Linie).',
      tasks: [{ t: 'Zur grünen Linie am Schwarzen Stein gehen' }, { t: '7 Runden gehen – Kaaba links' }, { t: 'Bei jeder Runde: Istilam', s: true }, { t: '2 Rak\'at hinter Maqam Ibrahim', s: true }, { t: 'Zamzam trinken', s: true }, { t: 'Zum Ausgang (weiter zum Sa\'i)' }],
      fact: 'Raml: Männer gehen in den ersten 3 Runden des Umrah-Tawaf zügig mit kurzen Schritten.',
      recap: ['7 Runden, Start und Ende am Schwarzen Stein.', 'Die Kaaba ist immer links von dir.', 'Der Hijr Ismail gehört zur Kaaba – man geht außen herum.', 'Danach (Sunnah): 2 Rak\'at hinter Maqam Ibrahim und Zamzam.'],
      quiz: { q: 'Auf welcher Seite ist die Kaaba beim Tawaf?', o: [{ html: 'Links', ok: true, why: 'Richtig! Man geht gegen den Uhrzeigersinn.' }, { html: 'Rechts', ok: false, why: 'Nein – die Kaaba ist immer links.' }, { html: 'Das ist egal', ok: false, why: 'Doch, es ist wichtig: Die Kaaba ist immer links.' }] },
    },
    {
      what: 'Sa\'i heißt: 7 Strecken zwischen den Hügeln Safa und Marwa.',
      why: 'Erinnerung an Hadschar, die hier Wasser für ihren Sohn Ismail suchte – bis Zamzam entsprang.',
      tasks: [{ t: 'Auf Safa: Ayah und Dua', s: true }, { t: '7 Strecken laufen (Safa → Marwa = 1, zurück = 2 …)' }, { t: 'Im grünen Bereich eilen (Männer)', tf: 'Grüner Bereich: Männer eilen – du gehst normal' }, { t: 'Auf Marwa: Haare kürzen (Taqsir)', tf: 'Auf Marwa: eine Fingerspitzenlänge kürzen (Taqsir)' }, { t: 'Zum Ausgang gehen' }],
      fact: 'Hin- und Rückweg zählen je als eine Strecke – darum endest du nach 7 Strecken auf Marwa.',
      recap: ['Start auf Safa, Ende auf Marwa.', 'Zwischen den grünen Lichtern eilen Männer.', 'Die Umrah endet mit dem Haarekürzen (Taqsir).'],
      quiz: { q: 'Wo endet der Sa\'i?', o: [{ html: 'Auf Marwa', ok: true, why: 'Richtig! Nach 7 Strecken bist du auf Marwa.' }, { html: 'Auf Safa', ok: false, why: 'Nein – auf Safa beginnt der Sa\'i, er endet auf Marwa.' }, { html: 'An der Kaaba', ok: false, why: 'Nein – er endet auf Marwa.' }] },
    },
    {
      what: 'Am 8. Dhul-Hiddscha beginnt der Hadsch: neuer Ihram, dann geht es nach Mina.',
      why: 'In Mina betest du und übernachtest – am nächsten Morgen geht es nach Arafat.',
      tasks: [{ t: 'Ihram und Absicht für den Hadsch' }, { t: 'Zu deinem Zelt gehen' }, { t: 'Dhuhr, Asr, Maghrib und Isha beten (verkürzt)' }, { t: 'In Mina übernachten' }, { t: 'Fajr beten' }, { t: 'Zum Bus nach Arafat' }],
      fact: 'Vierer-Gebete werden auf 2 Rak\'at verkürzt, aber nicht zusammengelegt – jedes zu seiner Zeit.',
      recap: ['Absicht für den Hadsch: „Labbaika ḥaddschan“.', 'In Mina: Vierer-Gebete verkürzt, nicht zusammengelegt.', 'Maghrib bleibt bei 3 Rak\'at.'],
      quiz: { q: 'Wie viele Rak\'at betest du Isha in Mina?', o: [{ html: '2', ok: true, why: 'Richtig! Isha wird verkürzt.' }, { html: '4', ok: false, why: 'Nein – in Mina wird Isha auf 2 verkürzt.' }, { html: '3', ok: false, why: 'Nein – 3 Rak\'at hat Maghrib.' }] },
    },
    {
      what: 'Am 9. stehen die Pilger in der Ebene von Arafat (Wuquf) – bis Sonnenuntergang.',
      why: '„Der Hadsch ist Arafat“: Der Aufenthalt in Arafat ist der Kern des Hadsch.',
      tasks: [{ t: 'Über die Grenze nach Arafat gehen' }, { t: 'Dhuhr und Asr zusammen und verkürzt beten' }, { t: 'Platz suchen und zur Qibla Dua machen' }, { t: 'Bis Sonnenuntergang bleiben' }, { t: 'Zum Bus nach Muzdalifa' }],
      fact: 'Der Hügel Jabal ar-Rahma liegt in Arafat. Man kann überall innerhalb der Grenzen von Arafat stehen.',
      recap: ['Der Wuquf in Arafat ist der Kern des Hadsch.', 'Dhuhr und Asr: zusammengelegt und verkürzt.', 'Man bleibt bis Sonnenuntergang.'],
      quiz: { q: 'Bis wann bleibst du in Arafat?', o: [{ html: 'Bis Sonnenuntergang', ok: true, why: 'Richtig!' }, { html: 'Bis Mittag', ok: false, why: 'Nein – man bleibt bis Sonnenuntergang.' }, { html: 'Nur eine Stunde', ok: false, why: 'Nein – man bleibt bis Sonnenuntergang.' }] },
    },
    {
      what: 'In der Nacht zum 10. übernachten die Pilger unter freiem Himmel in Muzdalifa.',
      why: 'Hier sammelt man die Steine für das Werfen an den Dschamarat.',
      tasks: [{ t: 'Maghrib und Isha zusammen beten' }, { t: '7 Kiesel sammeln' }, { t: 'Auf einer Matte schlafen' }, { t: 'Fajr beten' }, { t: 'Dhikr am al-Mash\'ar al-Haram', s: true }, { t: 'Vor Sonnenaufgang nach Mina' }],
      fact: 'Die Steine sind etwa so groß wie Kichererbsen.',
      recap: ['Maghrib und Isha werden in Muzdalifa zusammen gebetet.', 'Man sammelt kleine Steine für die Dschamarat.', 'Vor Sonnenaufgang geht es weiter nach Mina.'],
      quiz: { q: 'Wofür sammelt man in Muzdalifa Steine?', o: [{ html: 'Für das Werfen an den Dschamarat', ok: true, why: 'Richtig!' }, { html: 'Als Andenken', ok: false, why: 'Nein – sie sind für das Werfen an den Dschamarat.' }, { html: 'Zum Bauen der Zelte', ok: false, why: 'Nein – sie sind für das Werfen an den Dschamarat.' }] },
    },
    {
      what: 'Am 10. (Yaum an-Nahr) wirfst du 7 Steine auf die große Dschamra (al-Aqaba).',
      why: 'Mit dem ersten Wurf endet die Talbiyah.',
      tasks: [{ t: 'Zum Becken der großen Dschamra gehen' }, { t: '7 Steine werfen – bei jedem „Allahu Akbar“' }, { t: 'Weiter zu Opfer und Rasur' }],
      fact: 'Am 10. wirft man nur auf die große Dschamra – an den folgenden Tagen auf alle drei.',
      recap: ['Am 10. nur die große Dschamra: 7 Steine.', 'Bei jedem Wurf: „Allahu Akbar“.', 'Der Stein muss im Becken landen.'],
      quiz: { q: 'Was sagst du bei jedem Wurf?', o: [{ html: '„Allahu Akbar“', ok: true, why: 'Richtig!' }, { html: '„Labbaik“', ok: false, why: 'Nein – die Talbiyah endet mit dem ersten Wurf. Man sagt „Allahu Akbar“.' }, { html: 'Nichts', ok: false, why: 'Man sagt bei jedem Wurf „Allahu Akbar“.' }] },
    },
    {
      what: 'Opfer (Hady) und Haare scheren oder kürzen – danach darfst du den Ihram ablegen (erstes Tahallul).',
      why: 'Für den Hadsch at-Tamattu\' ist das Opfer Pflicht; das Fleisch geht an Bedürftige.',
      tasks: [{ t: 'Am Hady-Schalter das Opfer bestätigen' }, { t: 'Beim Friseur: Halq oder Taqsir', tf: 'Beim Friseur: eine Fingerspitzenlänge kürzen (Taqsir)' }, { t: 'Normale Kleidung anziehen' }, { t: 'Zum Bus nach Mekka' }],
      fact: 'Die Reihenfolge Werfen → Opfer → Rasieren → Tawaf ist Sunnah – Abweichungen sind erlaubt.',
      recap: ['Hady: Pflicht beim Tamattu\', meist per Gutschein.', 'Männer: Halq (besser) oder Taqsir; Frauen kürzen eine Fingerspitzenlänge.', 'Erstes Tahallul: alle Verbote enden außer der ehelichen Intimität.'],
      quiz: { q: 'Welches Ihram-Verbot gilt nach dem ersten Tahallul noch?', o: [{ html: 'Die eheliche Intimität', ok: true, why: 'Richtig! Sie endet erst mit dem zweiten Tahallul.' }, { html: 'Normale Kleidung zu tragen', ok: false, why: 'Nein – normale Kleidung ist jetzt erlaubt.' }, { html: 'Keines mehr', ok: false, why: 'Doch: Die eheliche Intimität bleibt noch verboten.' }] },
    },
    {
      what: 'Tawaf al-Ifada: 7 Runden um die Kaaba – wie beim ersten Tawaf.',
      why: 'Er ist eine Säule (Rukn) des Hadsch – ohne ihn ist der Hadsch nicht vollständig.',
      tasks: [{ t: 'Zur grünen Linie am Schwarzen Stein' }, { t: '7 Runden gehen – Kaaba links' }, { t: 'Bei jeder Runde: Istilam', s: true }, { t: '2 Rak\'at hinter Maqam Ibrahim', s: true }, { t: 'Zamzam trinken', s: true }, { t: 'Zum Ausgang (weiter zum Sa\'i)' }],
      fact: 'Diesmal ohne Raml und Idtiba\' – und in normaler Kleidung.',
      recap: ['Tawaf al-Ifada ist eine Säule des Hadsch.', '7 Runden, Kaaba links, ohne Raml.'],
      quiz: { q: 'Was ist der Tawaf al-Ifada?', o: [{ html: 'Eine Säule (Rukn) des Hadsch', ok: true, why: 'Richtig!' }, { html: 'Ein freiwilliger Tawaf', ok: false, why: 'Nein – er ist eine Säule des Hadsch.' }, { html: 'Der Abschieds-Tawaf', ok: false, why: 'Nein – der Abschieds-Tawaf kommt ganz am Ende.' }] },
    },
    {
      what: 'Sa\'i des Hadsch: wieder 7 Strecken von Safa nach Marwa.',
      why: 'Danach endet auch das letzte Ihram-Verbot (zweites Tahallul).',
      tasks: [{ t: 'Auf Safa: Dua', s: true }, { t: '7 Strecken laufen' }, { t: 'Im grünen Bereich eilen (Männer)', tf: 'Grüner Bereich: Männer eilen – du gehst normal' }, { t: 'Zum Ausgang gehen' }],
      fact: 'Wie bei der Umrah: Start auf Safa, Ende auf Marwa.',
      recap: ['7 Strecken, Start Safa, Ende Marwa.', 'Danach: zweites Tahallul – alle Ihram-Verbote enden.'],
      quiz: { q: 'Wie viele Strecken hat der Sa\'i?', o: [{ html: '7', ok: true, why: 'Richtig!' }, { html: '5', ok: false, why: 'Nein – es sind 7.' }, { html: '3', ok: false, why: 'Nein – es sind 7.' }] },
    },
    {
      what: 'Am 11. und 12. wirfst du nach dem Mittag auf alle drei Dschamarat – je 7 Steine.',
      why: 'Die Reihenfolge ist: kleine → mittlere → große Dschamra.',
      tasks: [{ t: 'Kleine Dschamra: 7 Steine' }, { t: 'Dua Richtung Qibla', s: true }, { t: 'Mittlere Dschamra: 7 Steine' }, { t: 'Dua Richtung Qibla', s: true }, { t: 'Große Dschamra: 7 Steine (danach kein Dua)' }, { t: 'Zum Ausgang' }],
      fact: 'Wer Mina am 12. bis Sonnenuntergang nicht verlässt, wirft auch am 13.',
      recap: ['Nach dem Mittag: klein → mittel → groß, je 7 Steine.', 'Dua nach der kleinen und der mittleren – nicht nach der großen.'],
      quiz: { q: 'In welcher Reihenfolge wirfst du am 11. und 12.?', o: [{ html: 'Klein → mittel → groß', ok: true, why: 'Richtig!' }, { html: 'Groß → mittel → klein', ok: false, why: 'Nein – man beginnt mit der kleinen.' }, { html: 'Die Reihenfolge ist egal', ok: false, why: 'Nein – klein, mittel, dann groß.' }] },
    },
    {
      what: 'Der Abschieds-Tawaf (Tawaf al-Wada\') ist das Letzte vor der Abreise aus Mekka.',
      why: 'Frauen in der Menstruation sind davon befreit.',
      tasks: [{ t: 'Zur grünen Linie am Schwarzen Stein' }, { t: '7 Runden gehen – Kaaba links' }, { t: 'Bei jeder Runde: Istilam', s: true }, { t: 'Zum Ausgang – Hadsch abschließen' }],
      fact: 'Danach ist die Pilgerfahrt vollständig.',
      recap: ['Der Abschieds-Tawaf ist das Letzte vor der Abreise.', 'Frauen in der Menstruation sind befreit.'],
      quiz: { q: 'Wann macht man den Abschieds-Tawaf?', o: [{ html: 'Vor der Abreise aus Mekka', ok: true, why: 'Richtig!' }, { html: 'Am 8. Dhul-Hiddscha', ok: false, why: 'Nein – er kommt ganz am Ende, vor der Abreise.' }, { html: 'In Arafat', ok: false, why: 'Nein – er findet an der Kaaba statt, vor der Abreise.' }] },
    },
  ],

  hello: (n) => n ? `Salam, ${n}!` : 'Salam!',
  wellDone: (n) => n ? `Gut gemacht, ${n}!` : 'Gut gemacht!',
  coach: {
    stickTouch: 'Lege deinen Daumen unten links auf den Kreis und schiebe ihn nach oben – so gehst du.',
    stickKeys: 'Drücke W (oder ↑), um zu gehen. Mit A und D gehst du seitlich.',
    lookTouch: 'Wische rechts über den Bildschirm, um dich umzuschauen.',
    lookKeys: 'Ziehe mit der Maus oder drücke ← →, um dich umzuschauen.',
    follow: 'Siehst du die goldene Lichtsäule? Folge den Pfeilen am Boden dorthin.',
    prompt: 'Tippe auf den goldenen Knopf, um die Handlung auszuführen.',
    hold: 'Halte den grünen Knopf gedrückt – solange du hältst, geht es weiter.',
    great: 'Super! Jetzt kannst du dich bewegen.',
  },
};
