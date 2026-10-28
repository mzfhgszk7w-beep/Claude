// Alle Länder für das Länder-Menü der HTML-Ausgabe: ISO-Code → Name und Kontinent. Die Flagge wird aus dem
// ISO-Code berechnet. „Naher Osten & Golf“ ist eine eigene Gruppe (Leser lebt in Dubai).
export const CONTINENTS = ['Europa', 'Naher Osten & Golf', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien'];

const groups = {
  'Europa': {
    EU: 'Europäische Union', DE: 'Deutschland', AL: 'Albanien', AD: 'Andorra', AM: 'Armenien', AT: 'Österreich',
    BY: 'Belarus', BE: 'Belgien', BA: 'Bosnien und Herzegowina', BG: 'Bulgarien', HR: 'Kroatien', CY: 'Zypern',
    CZ: 'Tschechien', DK: 'Dänemark', EE: 'Estland', FI: 'Finnland', FR: 'Frankreich', GE: 'Georgien',
    GR: 'Griechenland', HU: 'Ungarn', IS: 'Island', IE: 'Irland', IT: 'Italien', XK: 'Kosovo', LV: 'Lettland',
    LI: 'Liechtenstein', LT: 'Litauen', LU: 'Luxemburg', MT: 'Malta', MD: 'Moldau', MC: 'Monaco', ME: 'Montenegro',
    NL: 'Niederlande', MK: 'Nordmazedonien', NO: 'Norwegen', PL: 'Polen', PT: 'Portugal', RO: 'Rumänien',
    RU: 'Russland', SM: 'San Marino', RS: 'Serbien', SK: 'Slowakei', SI: 'Slowenien', ES: 'Spanien',
    SE: 'Schweden', CH: 'Schweiz', TR: 'Türkei', UA: 'Ukraine', GB: 'Großbritannien', VA: 'Vatikanstadt',
  },
  'Naher Osten & Golf': {
    AE: 'VAE', SA: 'Saudi-Arabien', QA: 'Katar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', YE: 'Jemen',
    IR: 'Iran', IQ: 'Irak', IL: 'Israel', PS: 'Palästinensische Gebiete', JO: 'Jordanien', LB: 'Libanon',
    SY: 'Syrien', EG: 'Ägypten',
  },
  'Asien': {
    AF: 'Afghanistan', AZ: 'Aserbaidschan', BD: 'Bangladesch', BT: 'Bhutan', BN: 'Brunei', KH: 'Kambodscha',
    CN: 'China', HK: 'Hongkong', IN: 'Indien', ID: 'Indonesien', JP: 'Japan', KZ: 'Kasachstan', KG: 'Kirgisistan',
    LA: 'Laos', MY: 'Malaysia', MV: 'Malediven', MN: 'Mongolei', MM: 'Myanmar', NP: 'Nepal', KP: 'Nordkorea',
    PK: 'Pakistan', PH: 'Philippinen', SG: 'Singapur', KR: 'Südkorea', LK: 'Sri Lanka', TW: 'Taiwan',
    TJ: 'Tadschikistan', TH: 'Thailand', TL: 'Osttimor', TM: 'Turkmenistan', UZ: 'Usbekistan', VN: 'Vietnam',
  },
  'Afrika': {
    DZ: 'Algerien', AO: 'Angola', BJ: 'Benin', BW: 'Botswana', BF: 'Burkina Faso', BI: 'Burundi', CV: 'Kap Verde',
    CM: 'Kamerun', CF: 'Zentralafrikanische Republik', TD: 'Tschad', KM: 'Komoren', CG: 'Republik Kongo',
    CD: 'DR Kongo', CI: 'Elfenbeinküste', DJ: 'Dschibuti', GQ: 'Äquatorialguinea', ER: 'Eritrea', SZ: 'Eswatini',
    ET: 'Äthiopien', GA: 'Gabun', GM: 'Gambia', GH: 'Ghana', GN: 'Guinea', GW: 'Guinea-Bissau', KE: 'Kenia',
    LS: 'Lesotho', LR: 'Liberia', LY: 'Libyen', MG: 'Madagaskar', MW: 'Malawi', ML: 'Mali', MR: 'Mauretanien',
    MU: 'Mauritius', MA: 'Marokko', MZ: 'Mosambik', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', RW: 'Ruanda',
    ST: 'São Tomé und Príncipe', SN: 'Senegal', SC: 'Seychellen', SL: 'Sierra Leone', SO: 'Somalia',
    ZA: 'Südafrika', SS: 'Südsudan', SD: 'Sudan', TZ: 'Tansania', TG: 'Togo', TN: 'Tunesien', UG: 'Uganda',
    ZM: 'Sambia', ZW: 'Simbabwe',
  },
  'Nordamerika': {
    US: 'USA', CA: 'Kanada', MX: 'Mexiko', AG: 'Antigua und Barbuda', BS: 'Bahamas', BB: 'Barbados', BZ: 'Belize',
    CR: 'Costa Rica', CU: 'Kuba', DM: 'Dominica', DO: 'Dominikanische Republik', SV: 'El Salvador', GD: 'Grenada',
    GT: 'Guatemala', HT: 'Haiti', HN: 'Honduras', JM: 'Jamaika', NI: 'Nicaragua', PA: 'Panama', PR: 'Puerto Rico',
    KN: 'St. Kitts und Nevis', LC: 'St. Lucia', VC: 'St. Vincent und die Grenadinen', TT: 'Trinidad und Tobago',
    GL: 'Grönland',
  },
  'Südamerika': {
    AR: 'Argentinien', BO: 'Bolivien', BR: 'Brasilien', CL: 'Chile', CO: 'Kolumbien', EC: 'Ecuador', GY: 'Guyana',
    PY: 'Paraguay', PE: 'Peru', SR: 'Suriname', UY: 'Uruguay', VE: 'Venezuela',
  },
  'Ozeanien': {
    AU: 'Australien', NZ: 'Neuseeland', FJ: 'Fidschi', PG: 'Papua-Neuguinea', SB: 'Salomonen', VU: 'Vanuatu',
    WS: 'Samoa', TO: 'Tonga', KI: 'Kiribati', FM: 'Mikronesien', MH: 'Marshallinseln', PW: 'Palau',
    NR: 'Nauru', TV: 'Tuvalu',
  },
};

// Flagge aus dem ISO-Code (Regional Indicator Symbols). Kosovo hat kein offizielles Flaggen-Emoji.
const flagOf = (code) => (code === 'XK' ? '🇽🇰' : [...code].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join(''));

export const COUNTRIES = {};
for (const [continent, list] of Object.entries(groups)) {
  for (const [code, name] of Object.entries(list)) COUNTRIES[code] = { name, flag: flagOf(code), continent };
}
