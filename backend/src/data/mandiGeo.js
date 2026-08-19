/**
 * Real coordinates for the Maharashtra APMC markets that appear in the
 * data.gov.in Agmarknet feed (resource 35985678-…).
 *
 * Why this file exists: agmarknetService.js previously ran unlisted market
 * names through a string hash to invent a lat/lon. Distance drives freight,
 * freight drives net profit, and net profit is the entire product — so a
 * fabricated coordinate silently fabricated the answer the farmer acts on.
 *
 * Two tiers, and the tier is reported to the caller as `geoPrecision`:
 *   'market'   — the APMC yard itself (or the town it sits in). Listed below.
 *   'district' — the district headquarters town. Used for the ~240 smaller
 *                markets not individually listed; distance is then accurate to
 *                the district, not the yard, and the UI says so.
 * Nothing is ever invented. A market whose district is also unknown comes back
 * with `coordinates: null` and is excluded from distance-based ranking rather
 * than given a plausible-looking number.
 *
 * TODO(data): Agmarknet publishes no coordinates. The complete mapping would
 * come from the DMI market master list; until then, extend MARKET_COORDS by
 * hand only with coordinates you have actually looked up.
 */

/** District HQ towns — every district present in the Maharashtra feed. */
const DISTRICT_COORDS = {
  'ahilyanagar': { lat: 19.0952, lon: 74.7496, town: 'Ahilyanagar' },
  'ahmednagar': { lat: 19.0952, lon: 74.7496, town: 'Ahilyanagar' },
  'akola': { lat: 20.7002, lon: 77.0082, town: 'Akola' },
  'amarawati': { lat: 20.9374, lon: 77.7796, town: 'Amravati' },
  'amravati': { lat: 20.9374, lon: 77.7796, town: 'Amravati' },
  'beed': { lat: 18.9891, lon: 75.7601, town: 'Beed' },
  'bhandara': { lat: 21.1667, lon: 79.6500, town: 'Bhandara' },
  'buldhana': { lat: 20.5292, lon: 76.1806, town: 'Buldhana' },
  'chandrapur': { lat: 19.9615, lon: 79.2961, town: 'Chandrapur' },
  'chattrapati sambhajinagar': { lat: 19.8762, lon: 75.3433, town: 'Chh. Sambhajinagar' },
  'chhatrapati sambhajinagar': { lat: 19.8762, lon: 75.3433, town: 'Chh. Sambhajinagar' },
  'aurangabad': { lat: 19.8762, lon: 75.3433, town: 'Chh. Sambhajinagar' },
  'dharashiv': { lat: 18.1860, lon: 76.0419, town: 'Dharashiv' },
  'osmanabad': { lat: 18.1860, lon: 76.0419, town: 'Dharashiv' },
  'dhule': { lat: 20.9042, lon: 74.7749, town: 'Dhule' },
  'gadchiroli': { lat: 20.1809, lon: 80.0034, town: 'Gadchiroli' },
  'gondiya': { lat: 21.4624, lon: 80.1961, town: 'Gondia' },
  'hingoli': { lat: 19.7173, lon: 77.1490, town: 'Hingoli' },
  'jalgaon': { lat: 21.0077, lon: 75.5626, town: 'Jalgaon' },
  'jalna': { lat: 19.8410, lon: 75.8864, town: 'Jalna' },
  'kolhapur': { lat: 16.7050, lon: 74.2433, town: 'Kolhapur' },
  'latur': { lat: 18.4088, lon: 76.5604, town: 'Latur' },
  'mumbai': { lat: 19.0760, lon: 72.8777, town: 'Mumbai' },
  'nagpur': { lat: 21.1458, lon: 79.0882, town: 'Nagpur' },
  'nanded': { lat: 19.1383, lon: 77.3210, town: 'Nanded' },
  'nandurbar': { lat: 21.3667, lon: 74.2400, town: 'Nandurbar' },
  'nashik': { lat: 19.9975, lon: 73.7898, town: 'Nashik' },
  'palghar': { lat: 19.6967, lon: 72.7699, town: 'Palghar' },
  'parbhani': { lat: 19.2686, lon: 76.7708, town: 'Parbhani' },
  'pune': { lat: 18.5204, lon: 73.8567, town: 'Pune' },
  'raigad': { lat: 18.6414, lon: 72.8722, town: 'Alibag' },
  'ratnagiri': { lat: 16.9902, lon: 73.3120, town: 'Ratnagiri' },
  'sangli': { lat: 16.8524, lon: 74.5815, town: 'Sangli' },
  'satara': { lat: 17.6805, lon: 74.0183, town: 'Satara' },
  'solapur': { lat: 17.6599, lon: 75.9064, town: 'Solapur' },
  'wardha': { lat: 20.7453, lon: 78.6022, town: 'Wardha' },
  'washim': { lat: 20.1114, lon: 77.1330, town: 'Washim' },
  'yavatmal': { lat: 20.3888, lon: 78.1204, town: 'Yavatmal' },
  'sindhudurg': { lat: 16.1300, lon: 73.6600, town: 'Sindhudurg' },
  'thane': { lat: 19.2183, lon: 72.9781, town: 'Thane' },
};

/**
 * Individually located market yards, keyed by the feed's exact `Market` string
 * lowercased. These are the high-volume markets — between them they carry most
 * of the state's reported arrivals, so most rows the farmer actually sees are
 * yard-accurate rather than district-accurate.
 */
const MARKET_COORDS = {
  // Mumbai / Konkan
  'mumbai apmc': { lat: 19.0760, lon: 73.0044, town: 'Vashi, Navi Mumbai' },
  'mumbai- fruit market apmc': { lat: 19.0728, lon: 73.0104, town: 'Vashi, Navi Mumbai' },
  'mumbai-onion & potato market apmc': { lat: 19.0710, lon: 73.0090, town: 'Vashi, Navi Mumbai' },
  'kalyan apmc': { lat: 19.2403, lon: 73.1305, town: 'Kalyan' },
  'panvel apmc': { lat: 18.9894, lon: 73.1175, town: 'Panvel' },
  'ratnagiri (nachane) apmc': { lat: 16.9902, lon: 73.3120, town: 'Ratnagiri' },

  // Pune
  'pune apmc': { lat: 18.4938, lon: 73.8757, town: 'Gultekdi, Pune' },
  'pune(moshi) apmc': { lat: 18.6820, lon: 73.8480, town: 'Moshi' },
  'pune(manjri) apmc': { lat: 18.5090, lon: 73.9560, town: 'Manjri' },
  'pune(khadiki) apmc': { lat: 18.5640, lon: 73.8460, town: 'Khadki' },
  'pune(pimpri) apmc': { lat: 18.6298, lon: 73.7997, town: 'Pimpri' },
  'manchar apmc': { lat: 19.0000, lon: 73.9400, town: 'Manchar' },
  'khed apmc': { lat: 18.8700, lon: 73.8800, town: 'Rajgurunagar' },
  'khed(chakan) apmc': { lat: 18.7597, lon: 73.8636, town: 'Chakan' },
  'junnar(narayangaon) apmc': { lat: 19.0770, lon: 73.9770, town: 'Narayangaon' },
  'junnar(otur) apmc': { lat: 19.2870, lon: 73.9450, town: 'Otur' },
  'baramati apmc': { lat: 18.1514, lon: 74.5815, town: 'Baramati' },

  // Nashik
  'nasik apmc': { lat: 20.0130, lon: 73.7900, town: 'Nashik' },
  'nashik(devlali) apmc': { lat: 19.9450, lon: 73.8360, town: 'Devlali' },
  'pimpalgaon baswant apmc': { lat: 20.1750, lon: 73.9850, town: 'Pimpalgaon Baswant' },
  'pimpalgaon baswant(saykheda) apmc': { lat: 20.1750, lon: 73.9850, town: 'Pimpalgaon Baswant' },
  'lasalgaon(niphad) apmc': { lat: 20.1400, lon: 74.2400, town: 'Lasalgaon' },

  // Nagpur / Vidarbha
  'nagpur apmc': { lat: 21.1710, lon: 79.1470, town: 'Kalamna, Nagpur' },
  'kamthi apmc': { lat: 21.2260, lon: 79.1970, town: 'Kamptee' },
  'hingna - apmc': { lat: 21.1000, lon: 78.9500, town: 'Hingna' },
  'kalmeshwar apmc': { lat: 21.2320, lon: 78.9200, town: 'Kalmeshwar' },
  'ramtek apmc': { lat: 21.3950, lon: 79.3280, town: 'Ramtek' },
  'hinganghat apmc': { lat: 20.5480, lon: 78.8390, town: 'Hinganghat' },
  'chandrapur(ganjwad) apmc': { lat: 19.9615, lon: 79.2961, town: 'Chandrapur' },
  'amrawati(frui & veg. market) apmc': { lat: 20.9374, lon: 77.7796, town: 'Amravati' },
  'amarawati apmc': { lat: 20.9374, lon: 77.7796, town: 'Amravati' },
  'akola apmc': { lat: 20.7002, lon: 77.0082, town: 'Akola' },
  'malkapur apmc': { lat: 20.8850, lon: 76.2050, town: 'Malkapur' },
  'khamgaon apmc': { lat: 20.7070, lon: 76.5670, town: 'Khamgaon' },
  'mangrulpeer apmc': { lat: 20.3130, lon: 77.3450, town: 'Mangrulpir' },

  // Marathwada
  'chattrapati sambhajinagar apmc': { lat: 19.9020, lon: 75.3520, town: 'Jadhavwadi' },
  'jalana apmc': { lat: 19.8410, lon: 75.8864, town: 'Jalna' },
  'gevrai apmc': { lat: 19.2620, lon: 75.7500, town: 'Gevrai' },
  'paithan apmc': { lat: 19.4760, lon: 75.3850, town: 'Paithan' },
  'lasur station apmc': { lat: 19.9970, lon: 75.6260, town: 'Lasur Station' },
  'dharashiv apmc': { lat: 18.1860, lon: 76.0419, town: 'Dharashiv' },

  // Khandesh
  'jalgaon apmc': { lat: 21.0077, lon: 75.5626, town: 'Jalgaon' },
  'bhusaval apmc': { lat: 21.0435, lon: 75.7850, town: 'Bhusawal' },
  'apmc pachora': { lat: 20.6650, lon: 75.3530, town: 'Pachora' },
  'shirpur apmc': { lat: 21.3490, lon: 74.8800, town: 'Shirpur' },

  // Ahilyanagar
  'ahilyanagar apmc': { lat: 19.0952, lon: 74.7496, town: 'Ahilyanagar' },
  'rahata apmc': { lat: 19.7130, lon: 74.4830, town: 'Rahata' },
  'rahuri apmc': { lat: 19.3910, lon: 74.6480, town: 'Rahuri' },
  'shrirampur apmc': { lat: 19.6190, lon: 74.6600, town: 'Shrirampur' },

  // Western Maharashtra
  'shri.siddheshwar  apmc': { lat: 17.6599, lon: 75.9064, town: 'Solapur' },
  'akluj apmc': { lat: 17.8830, lon: 75.0170, town: 'Akluj' },
  'barshi apmc': { lat: 18.2330, lon: 75.6920, town: 'Barshi' },
  'karmala apmc': { lat: 18.4090, lon: 75.1930, town: 'Karmala' },
  'mangal wedha apmc': { lat: 17.5150, lon: 75.4550, town: 'Mangalwedha' },
  'dudhani apmc': { lat: 17.2620, lon: 76.3720, town: 'Dudhani' },
  'karad apmc': { lat: 17.2890, lon: 74.1820, town: 'Karad' },
  'satara apmc': { lat: 17.6805, lon: 74.0183, town: 'Satara' },
  'vai apmc': { lat: 17.9500, lon: 73.8900, town: 'Wai' },
  'vaduj apmc': { lat: 17.5900, lon: 74.4400, town: 'Vaduj' },
  'islampur apmc': { lat: 17.0450, lon: 74.2600, town: 'Islampur' },
  'vita apmc': { lat: 17.2750, lon: 74.5400, town: 'Vita' },
  'sangli(phale, bhajipala market) apmc': { lat: 16.8524, lon: 74.5815, town: 'Sangli' },
  'kolhapur apmc': { lat: 16.7050, lon: 74.2433, town: 'Kolhapur' },
};

/**
 * Taluka towns, matched by name *inside* the feed's market string.
 *
 * The feed writes the same town half a dozen ways — "Nandgaon APMC",
 * "APMC Nandurbar", "Barshi(Vairag) APMC", "Washim(Ansing) APMC",
 * "Agricultural Produce Market Committee Sillod" — so an exact-string table
 * would need every spelling. Matching a known town name inside the string
 * covers all of them with one entry.
 *
 * `district` disambiguates repeated town names (Karjat and Kalamb each exist in
 * two districts) and guards against a substring hitting the wrong market: a
 * candidate whose district contradicts the row's District is discarded.
 *
 * Without this layer every market in a district collapses onto the district
 * town — so Lasalgaon, Manmad and Yeola all measured the same distance from a
 * Nashik farm, and a ranking built on freight had nothing to rank.
 */
const TOWN_COORDS = {
  'lasalgaon': { lat: 20.1400, lon: 74.2400, district: 'nashik' },
  'manmad': { lat: 20.2500, lon: 74.4400, district: 'nashik' },
  'yeola': { lat: 20.0430, lon: 74.4890, district: 'nashik' },
  'sinner': { lat: 19.8460, lon: 74.0000, district: 'nashik' },
  'satana': { lat: 20.6000, lon: 74.2000, district: 'nashik' },
  'malegaon': { lat: 20.5540, lon: 74.5250, district: 'nashik' },
  'nandgaon': { lat: 20.3070, lon: 74.6580, district: 'nashik' },
  'devala': { lat: 20.5300, lon: 73.9200, district: 'nashik' },
  'chandwad': { lat: 20.3300, lon: 74.2450, district: 'nashik' },
  'ghoti': { lat: 19.7150, lon: 73.6300, district: 'nashik' },
  'kalwan': { lat: 20.4900, lon: 73.9300, district: 'nashik' },
  'abhona': { lat: 20.5500, lon: 73.9300, district: 'nashik' },
  'dindori': { lat: 20.2000, lon: 73.8300, district: 'nashik' },
  'niphad': { lat: 20.0800, lon: 74.1100, district: 'nashik' },
  'umrane': { lat: 20.7200, lon: 74.1000, district: 'nashik' },
  'akole': { lat: 19.5300, lon: 74.0100, district: 'ahilyanagar' },
  'sangamner': { lat: 19.5700, lon: 74.2100, district: 'ahilyanagar' },
  'kopargaon': { lat: 19.8830, lon: 74.4770, district: 'ahilyanagar' },
  'shevgaon': { lat: 19.3500, lon: 75.2300, district: 'ahilyanagar' },
  'jamkhed': { lat: 18.6500, lon: 75.3100, district: 'ahilyanagar' },
  'vambori': { lat: 19.3000, lon: 74.5600, district: 'ahilyanagar' },
  'newasa': { lat: 19.5400, lon: 74.9300, district: 'ahilyanagar' },
  'pathardi': { lat: 19.1700, lon: 75.1800, district: 'ahilyanagar' },
  'shrigonda': { lat: 18.6200, lon: 74.7000, district: 'ahilyanagar' },
  'parner': { lat: 19.0000, lon: 74.4400, district: 'ahilyanagar' },
  'shirur': { lat: 18.8300, lon: 74.3800, district: 'pune' },
  'indapur': { lat: 18.1200, lon: 75.0200, district: 'pune' },
  'daund': { lat: 18.4600, lon: 74.5800, district: 'pune' },
  'saswad': { lat: 18.3400, lon: 74.0300, district: 'pune' },
  'bhor': { lat: 18.1500, lon: 73.8400, district: 'pune' },
  'patan': { lat: 17.3700, lon: 73.9000, district: 'satara' },
  'phaltan': { lat: 17.9900, lon: 74.4300, district: 'satara' },
  'koregaon': { lat: 17.7000, lon: 74.1600, district: 'satara' },
  'mhaswad': { lat: 17.6300, lon: 74.7900, district: 'satara' },
  'tasgaon': { lat: 17.0400, lon: 74.6100, district: 'sangli' },
  'palus': { lat: 17.1000, lon: 74.4500, district: 'sangli' },
  'ashta': { lat: 16.9500, lon: 74.4000, district: 'sangli' },
  'jat': { lat: 17.0400, lon: 75.2100, district: 'sangli' },
  'vadgaonpeth': { lat: 16.7700, lon: 74.3500, district: 'kolhapur' },
  'laxmipuri': { lat: 16.7050, lon: 74.2433, district: 'kolhapur' },
  'ichalkaranji': { lat: 16.7000, lon: 74.4700, district: 'kolhapur' },
  'gadhinglaj': { lat: 16.2200, lon: 74.3500, district: 'kolhapur' },
  'vairag': { lat: 18.0500, lon: 75.7800, district: 'solapur' },
  'pandharpur': { lat: 17.6800, lon: 75.3300, district: 'solapur' },
  'kurduwadi': { lat: 18.0900, lon: 75.4200, district: 'solapur' },
  'sangole': { lat: 17.4400, lon: 75.1900, district: 'solapur' },
  'chalisgaon': { lat: 20.4600, lon: 75.0100, district: 'jalgaon' },
  'chopada': { lat: 21.2500, lon: 75.3000, district: 'jalgaon' },
  'parola': { lat: 20.8800, lon: 75.1200, district: 'jalgaon' },
  'amalner': { lat: 21.0400, lon: 75.0600, district: 'jalgaon' },
  'raver': { lat: 21.2500, lon: 76.0300, district: 'jalgaon' },
  'dondaicha': { lat: 21.3200, lon: 74.5700, district: 'dhule' },
  'sakri': { lat: 20.9900, lon: 74.3200, district: 'dhule' },
  'shirpur': { lat: 21.3490, lon: 74.8800, district: 'dhule' },
  'nandurbar': { lat: 21.3667, lon: 74.2400, district: 'nandurbar' },
  'shahada': { lat: 21.5400, lon: 74.4700, district: 'nandurbar' },
  'taloda': { lat: 21.5600, lon: 74.2100, district: 'nandurbar' },
  'gangapur': { lat: 19.6900, lon: 75.0100, district: 'chattrapati sambhajinagar' },
  'vaijpur': { lat: 19.9200, lon: 74.7300, district: 'chattrapati sambhajinagar' },
  'sillod': { lat: 20.3000, lon: 75.6500, district: 'chattrapati sambhajinagar' },
  'kannad': { lat: 20.2500, lon: 75.1400, district: 'chattrapati sambhajinagar' },
  'majalgaon': { lat: 19.1500, lon: 76.1900, district: 'beed' },
  'dharur': { lat: 18.8300, lon: 76.1100, district: 'beed' },
  'ambejogai': { lat: 18.7300, lon: 76.3800, district: 'beed' },
  'parli': { lat: 18.8500, lon: 76.5300, district: 'beed' },
  'ausa': { lat: 18.2500, lon: 76.5000, district: 'latur' },
  'ahmedpur': { lat: 18.7000, lon: 76.9400, district: 'latur' },
  'udgir': { lat: 18.3900, lon: 77.1200, district: 'latur' },
  'nilanga': { lat: 18.1200, lon: 76.7500, district: 'latur' },
  'tuljapur': { lat: 18.0100, lon: 76.0700, district: 'dharashiv' },
  'kalamb': { lat: 18.5600, lon: 76.0300, district: 'dharashiv' },
  'bhoom': { lat: 18.4700, lon: 75.6700, district: 'dharashiv' },
  'bhokar': { lat: 19.2100, lon: 77.7100, district: 'nanded' },
  'kinwat': { lat: 19.6200, lon: 78.2000, district: 'nanded' },
  'deglur': { lat: 18.5500, lon: 77.5800, district: 'nanded' },
  'gangakhed': { lat: 18.9700, lon: 76.7500, district: 'parbhani' },
  'sailu': { lat: 19.4700, lon: 76.4600, district: 'parbhani' },
  'basmat': { lat: 19.3200, lon: 77.1600, district: 'hingoli' },
  'kalamnuri': { lat: 19.6700, lon: 77.3100, district: 'hingoli' },
  'partur': { lat: 19.5900, lon: 76.2100, district: 'jalna' },
  'ambad': { lat: 19.6100, lon: 75.7900, district: 'jalna' },
  'bhokardan': { lat: 20.2700, lon: 75.7700, district: 'jalna' },
  'lonar': { lat: 19.9800, lon: 76.5300, district: 'buldhana' },
  'deoulgaon raja': { lat: 19.9000, lon: 76.0400, district: 'buldhana' },
  'mehkar': { lat: 20.1500, lon: 76.5700, district: 'buldhana' },
  'mehekar': { lat: 20.1500, lon: 76.5700, district: 'buldhana' },
  'nandura': { lat: 20.8300, lon: 76.4600, district: 'buldhana' },
  'shegaon': { lat: 20.7900, lon: 76.7000, district: 'buldhana' },
  'chikhli': { lat: 20.3500, lon: 76.2600, district: 'buldhana' },
  'jalgaon jamod': { lat: 21.0500, lon: 76.5300, district: 'buldhana' },
  'murtizapur': { lat: 20.7300, lon: 77.3700, district: 'akola' },
  'akot': { lat: 21.0900, lon: 77.0600, district: 'akola' },
  'balapur': { lat: 20.6700, lon: 76.7700, district: 'akola' },
  'telhara': { lat: 21.0300, lon: 76.8700, district: 'akola' },
  'karanja': { lat: 20.4800, lon: 77.4900, district: 'washim' },
  'manora': { lat: 20.2900, lon: 77.3800, district: 'washim' },
  'ansing': { lat: 20.1114, lon: 77.1330, district: 'washim' },
  'risod': { lat: 19.9700, lon: 76.7800, district: 'washim' },
  'vani': { lat: 20.0500, lon: 78.9500, district: 'yavatmal' },
  'digras': { lat: 20.1100, lon: 77.7200, district: 'yavatmal' },
  'pusad': { lat: 19.9100, lon: 77.5800, district: 'yavatmal' },
  'umarkhed': { lat: 19.6000, lon: 77.6900, district: 'yavatmal' },
  'ghatanji': { lat: 20.1400, lon: 78.3100, district: 'yavatmal' },
  'arni': { lat: 19.9500, lon: 77.7500, district: 'yavatmal' },
  'chandur bazar': { lat: 21.2400, lon: 77.7300, district: 'amarawati' },
  'achalpur': { lat: 21.2600, lon: 77.5100, district: 'amarawati' },
  'anajngaon': { lat: 21.1600, lon: 77.3100, district: 'amarawati' },
  'nandgaon khandeshwar': { lat: 20.7900, lon: 77.9500, district: 'amarawati' },
  'daryapur': { lat: 20.9300, lon: 77.3300, district: 'amarawati' },
  'morshi': { lat: 21.3300, lon: 78.0100, district: 'amarawati' },
  'katol': { lat: 21.2700, lon: 78.5800, district: 'nagpur' },
  'savner': { lat: 21.3900, lon: 78.9200, district: 'nagpur' },
  'umred': { lat: 20.8500, lon: 79.3300, district: 'nagpur' },
  'narkhed': { lat: 21.4300, lon: 78.5300, district: 'nagpur' },
  'sindi': { lat: 20.8100, lon: 78.7900, district: 'wardha' },
  'arvi': { lat: 20.9900, lon: 78.2300, district: 'wardha' },
  'pulgaon': { lat: 20.7200, lon: 78.3200, district: 'wardha' },
  'pen': { lat: 18.7370, lon: 73.0960, district: 'raigad' },
  'alibag': { lat: 18.6414, lon: 72.8722, district: 'raigad' },
  'vasai': { lat: 19.3900, lon: 72.8300, district: 'palghar' },
  'dahanu': { lat: 19.9700, lon: 72.7300, district: 'palghar' },
  'warora': { lat: 20.2300, lon: 79.0000, district: 'chandrapur' },
  'rajura': { lat: 19.7800, lon: 79.3600, district: 'chandrapur' },
};

/**
 * Great-circle distance in km. Road distance is longer; ROAD_FACTOR below is
 * the correction, applied where a distance is presented as a driving distance.
 */
const haversineKm = (aLat, aLon, bLat, bLon) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Straight-line km × 1.3 is the usual planning approximation for Indian road
 * networks. It is an approximation and is labelled as one in the UI — better
 * than presenting a crow-flies number as a truck's journey.
 */
const ROAD_FACTOR = 1.3;

const roadDistanceKm = (aLat, aLon, bLat, bLon) =>
  Math.round(haversineKm(aLat, aLon, bLat, bLon) * ROAD_FACTOR);

/**
 * Resolves a feed row to a coordinate, most precise source first.
 * Returns `{ coordinates: null, geoPrecision: 'unknown' }` when neither the
 * market nor its district is known — never a synthesised position.
 */
const locateMarket = (marketName = '', districtName = '') => {
  const market = String(marketName).trim().toLowerCase();
  const district = String(districtName).trim().toLowerCase();

  const exact = MARKET_COORDS[market];
  if (exact) {
    return { lat: exact.lat, lon: exact.lon, geoPrecision: 'market', place: exact.town };
  }

  // Longest town name wins: "Pune(Moshi) APMC" contains both "pune" and
  // "moshi", and the sub-yard is the more precise of the two.
  const townMatches = Object.entries(TOWN_COORDS)
    .filter(([town, coords]) => market.includes(town) && (!district || coords.district === district))
    .sort((a, b) => b[0].length - a[0].length);
  if (townMatches.length) {
    const [town, coords] = townMatches[0];
    return {
      lat: coords.lat,
      lon: coords.lon,
      geoPrecision: 'market',
      place: town.replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }

  const byDistrict = DISTRICT_COORDS[district];
  if (byDistrict) {
    return { lat: byDistrict.lat, lon: byDistrict.lon, geoPrecision: 'district', town: byDistrict.town, place: byDistrict.town };
  }

  // The feed sometimes writes the district into the market string, e.g.
  // "Malharshree Khajgi Krushi Utpann Bajar, Chandanpuri Tal Malegaon, Nashik".
  const mentioned = Object.keys(DISTRICT_COORDS).find((d) => market.includes(d));
  if (mentioned) {
    const c = DISTRICT_COORDS[mentioned];
    return { lat: c.lat, lon: c.lon, geoPrecision: 'district', place: c.town };
  }

  return { lat: null, lon: null, geoPrecision: 'unknown', place: districtName || null };
};

module.exports = {
  DISTRICT_COORDS,
  MARKET_COORDS,
  TOWN_COORDS,
  haversineKm,
  roadDistanceKm,
  locateMarket,
  ROAD_FACTOR,
};
