const { TOWN_COORDS, MARKET_COORDS, DISTRICT_COORDS } = require('../../data/mandiGeo');

function levenshtein(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) tmp[i] = [i];
  for (j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = a[i - 1] === b[j - 1] 
        ? tmp[i - 1][j - 1] 
        : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
    }
  }
  return tmp[a.length][b.length];
}

function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

/**
 * Verified Market Aliases Map.
 * Maps common variations (English, Devanagari, spelling variants) to official Agmarknet feed names.
 * DO NOT add unverified guesses. All entries mapped to actual Agmarknet market names.
 */
const VERIFIED_MARKET_MAP = {
  // Deola / Devala / Devla
  'deola': { canonical: 'Devala', searchTerms: ['devala', 'deola', 'devla', 'देवळा', 'देवला'] },
  'devala': { canonical: 'Devala', searchTerms: ['devala', 'deola', 'devla', 'देवळा', 'देवला'] },
  'devla': { canonical: 'Devala', searchTerms: ['devala', 'deola', 'devla', 'देवळा', 'देवला'] },
  'देवळा': { canonical: 'Devala', searchTerms: ['devala', 'deola', 'devla', 'देवळा', 'देवला'] },
  'देवला': { canonical: 'Devala', searchTerms: ['devala', 'deola', 'devla', 'देवळा', 'देवला'] },

  // Kalvan / Kalwan / कळवण
  'kalvan': { canonical: 'Kalwan', searchTerms: ['kalwan', 'kalvan', 'कळवण', 'कलवण'] },
  'kalwan': { canonical: 'Kalwan', searchTerms: ['kalwan', 'kalvan', 'कळवण', 'कलवण'] },
  'कळवण': { canonical: 'Kalwan', searchTerms: ['kalwan', 'kalvan', 'कळवण', 'कलवण'] },
  'कलवण': { canonical: 'Kalwan', searchTerms: ['kalwan', 'kalvan', 'कळवण', 'कलवण'] },

  // Lasalgaon
  'lasalgaon': { canonical: 'Lasalgaon', searchTerms: ['lasalgaon', 'niphad', 'लासलगाव'] },
  'लासलगाव': { canonical: 'Lasalgaon', searchTerms: ['lasalgaon', 'niphad', 'लासलगाव'] },

  // Pimpalgaon Baswant
  'pimpalgaon': { canonical: 'Pimpalgaon Baswant', searchTerms: ['pimpalgaon', 'pimpalgaon baswant', 'pimapalagon', 'पिंपळगाव'] },
  'पिंपळगाव': { canonical: 'Pimpalgaon Baswant', searchTerms: ['pimpalgaon', 'pimpalgaon baswant', 'pimapalagon', 'पिंपळगाव'] },
  'pimapalagon': { canonical: 'Pimpalgaon Baswant', searchTerms: ['pimpalgaon', 'pimpalgaon baswant', 'pimapalagon', 'पिंपळगाव'] },

  // Nashik
  'nashik': { canonical: 'Nashik', searchTerms: ['nasik', 'nashik', 'नाशिक'] },
  'nasik': { canonical: 'Nashik', searchTerms: ['nasik', 'nashik', 'नाशिक'] },
  'नाशिक': { canonical: 'Nashik', searchTerms: ['nasik', 'nashik', 'नाशिक'] },

  // Mumbai / Vashi
  'vashi': { canonical: 'Mumbai APMC', searchTerms: ['vashi', 'mumbai', 'वाशी', 'मुंबई'] },
  'mumbai': { canonical: 'Mumbai APMC', searchTerms: ['vashi', 'mumbai', 'वाशी', 'मुंबई'] },
  'वाशी': { canonical: 'Mumbai APMC', searchTerms: ['vashi', 'mumbai', 'वाशी', 'मुंबई'] },
  'मुंबई': { canonical: 'Mumbai APMC', searchTerms: ['vashi', 'mumbai', 'वाशी', 'मुंबई'] },

  // Pune
  'pune': { canonical: 'Pune', searchTerms: ['pune', 'पुणे', 'moshi', 'manjri'] },
  'पुणे': { canonical: 'Pune', searchTerms: ['pune', 'पुणे', 'moshi', 'manjri'] },

  // Sangamner
  'sangamner': { canonical: 'Sangamner', searchTerms: ['sangamner', 'संगमनेर'] },
  'संगमनेर': { canonical: 'Sangamner', searchTerms: ['sangamner', 'संगमनेर'] },

  // Yeola
  'yeola': { canonical: 'Yeola', searchTerms: ['yeola', 'येवला'] },
  'येवला': { canonical: 'Yeola', searchTerms: ['yeola', 'येवला'] },

  // Manmad
  'manmad': { canonical: 'Manmad', searchTerms: ['manmad', 'मनमाड'] },
  'मनमाड': { canonical: 'Manmad', searchTerms: ['manmad', 'मनमाड'] },

  // Solapur
  'solapur': { canonical: 'Solapur', searchTerms: ['solapur', 'सोलापूर'] },
  'सोलापूर': { canonical: 'Solapur', searchTerms: ['solapur', 'सोलापूर'] },

  // Nagpur
  'nagpur': { canonical: 'Nagpur', searchTerms: ['nagpur', 'नागपूर'] },
  'नागपूर': { canonical: 'Nagpur', searchTerms: ['nagpur', 'नागपूर'] }
};

class MarketResolver {
  /**
   * Resolves a raw text query or word into a verified market resolution object.
   * @param {string} text 
   * @returns {{ canonicalName: string, searchTerms: string[], rawInput: string } | null}
   */
  resolveMarket(text) {
    if (!text || typeof text !== 'string') return null;

    const clean = text.trim().toLowerCase();
    const words = clean.split(/\s+/);

    // 1. Direct match in verified alias map
    for (const [key, val] of Object.entries(VERIFIED_MARKET_MAP)) {
      if (clean === key || clean.includes(key)) {
        return {
          canonicalName: val.canonical,
          searchTerms: val.searchTerms,
          rawInput: key
        };
      }
      for (const word of words) {
        if (word.length >= 5 && stringSimilarity(word, key) > 0.75) {
          return {
            canonicalName: val.canonical,
            searchTerms: val.searchTerms,
            rawInput: word
          };
        }
      }
    }

    // 2. Check TOWN_COORDS from mandiGeo.js
    for (const town of Object.keys(TOWN_COORDS)) {
      if (clean.includes(town)) {
        const canonical = town.charAt(0).toUpperCase() + town.slice(1);
        return {
          canonicalName: canonical,
          searchTerms: [town],
          rawInput: town
        };
      }
      for (const word of words) {
        if (word.length >= 5 && stringSimilarity(word, town) > 0.75) {
          const canonical = town.charAt(0).toUpperCase() + town.slice(1);
          return {
            canonicalName: canonical,
            searchTerms: [town],
            rawInput: word
          };
        }
      }
    }

    // 3. Check MARKET_COORDS from mandiGeo.js
    for (const mName of Object.keys(MARKET_COORDS)) {
      const cleanMName = mName.replace(/ apmc/g, '').trim();
      if (clean.includes(cleanMName)) {
        const canonical = cleanMName.charAt(0).toUpperCase() + cleanMName.slice(1);
        return {
          canonicalName: canonical,
          searchTerms: [cleanMName],
          rawInput: cleanMName
        };
      }
      for (const word of words) {
        if (word.length >= 5 && stringSimilarity(word, cleanMName) > 0.75) {
          const canonical = cleanMName.charAt(0).toUpperCase() + cleanMName.slice(1);
          return {
            canonicalName: canonical,
            searchTerms: [cleanMName],
            rawInput: word
          };
        }
      }
    }

    // 4. Check DISTRICT_COORDS from mandiGeo.js
    for (const dist of Object.keys(DISTRICT_COORDS)) {
      if (clean.includes(dist)) {
        const canonical = dist.charAt(0).toUpperCase() + dist.slice(1);
        return {
          canonicalName: canonical,
          searchTerms: [dist],
          rawInput: dist
        };
      }
      for (const word of words) {
        if (word.length >= 5 && stringSimilarity(word, dist) > 0.75) {
          const canonical = dist.charAt(0).toUpperCase() + dist.slice(1);
          return {
            canonicalName: canonical,
            searchTerms: [dist],
            rawInput: word
          };
        }
      }
    }

    // 5. Pattern extraction for unknown market names (e.g. "at Kalvan", "in Lalvan", "Lalvan APMC", "ललवण बाजारात")
    const marketPatterns = [
      /(?:at|in|near|for|mandi|apmc)\s+([a-zA-Z]{3,15})/i,
      /([a-zA-Z]{3,15})\s+(?:[a-zA-Z]+\s+)*(?:apmc|market|mandi|bazar|price|rate)/i,
      /([\u0900-\u097F]{3,15})\s+(?:[^\s]+\s+)*(?:बाजारात|मंडी|भाव|दर)/
    ];

    for (const pattern of marketPatterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].toLowerCase();
        // Ignore generic words and common question words
        const stopwords = [
          'today', 'price', 'rate', 'onion', 'tomato', 'potato', 'wheat', 'crop', 'mandi', 'market',
          'apmc', 'kaanda', 'bhava', 'what', 'where', 'when', 'which', 'who', 'how', 'why', 'are', 'is',
          'was', 'were', 'have', 'has', 'had', 'the', 'can', 'will', 'show', 'list', 'rules', 'for', 'all',
          'some', 'any', 'tell', 'give', 'get'
        ];
        if (!stopwords.includes(extracted)) {
          const canonical = extracted.charAt(0).toUpperCase() + extracted.slice(1);
          return {
            canonicalName: canonical,
            searchTerms: [extracted],
            rawInput: extracted
          };
        }
      }
    }

    return null;
  }

  /**
   * Validates whether an Agmarknet record mandi name matches the target search terms strictly.
   * @param {string} recordMandi 
   * @param {string} recordDistrict 
   * @param {string[]} searchTerms 
   * @returns {boolean}
   */
  matchesMarket(recordMandi = '', recordDistrict = '', searchTerms = []) {
    if (!recordMandi || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      return false;
    }

    const lowerMandi = recordMandi.toLowerCase();
    const lowerDistrict = (recordDistrict || '').toLowerCase();
    const mandiWords = lowerMandi.split(/[\s\(\)\-\_]+/);

    return searchTerms.some(term => {
      const lowerTerm = term.toLowerCase();
      if (lowerMandi.includes(lowerTerm) || lowerDistrict === lowerTerm) return true;

      if (lowerTerm.length >= 5) {
        for (const word of mandiWords) {
          if (stringSimilarity(lowerTerm, word) > 0.75) return true;
        }
      }

      return false;
    });
  }
}

module.exports = new MarketResolver();
