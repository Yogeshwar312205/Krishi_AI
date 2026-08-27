const marketResolver = require('./marketResolver');

class QueryProcessor {
  /**
   * Processes raw user query to detect language, extract entities, and format search terms.
   * @param {string} rawQuery 
   */
  process(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return {
        originalQuery: '',
        cleanQuery: '',
        language: 'en',
        entities: { commodity: null, market: null, marketObj: null, state: 'Maharashtra', district: null }
      };
    }

    const cleanQuery = rawQuery.trim().replace(/\s+/g, ' ');
    const language = this.detectLanguage(cleanQuery);
    const entities = this.extractEntities(cleanQuery);
    const normalizedQuery = this.normalizeQueryText(cleanQuery);

    return {
      originalQuery: rawQuery,
      cleanQuery,
      normalizedQuery,
      language,
      entities
    };
  }

  detectLanguage(text) {
    const lower = text.toLowerCase();
    const devanagariRegex = /[\u0900-\u097F]/;

    // Check for Romanized Marathi / Marathi in Latin script
    const marathiLatinMarkers = ['madhye', 'kiti', 'gadhya', 'majhya', 'bhav', 'kay', 'ahe', 'kasa', 'trips', 'junya', 'dakhva', 'shatkar', 'nafa', 'uplabdh', 'vahatuk'];
    const hasLatinMarathi = marathiLatinMarkers.some(m => lower.includes(m));

    if (!devanagariRegex.test(text)) {
      return hasLatinMarathi ? 'mr' : 'en';
    }

    // Comprehensive Marathi Devanagari Markers vs Hindi
    const marathiMarkers = [
      'आहे', 'आहेत', 'कांदा', 'देवळा', 'नाना', 'शेतकरी', 'मध्ये', 'कसा', 'मोजतो', 'मोजतात',
      'करावे', 'गाडी', 'गाड्या', 'भाजी', 'भाव', 'किती', 'कळवण', 'बाजारात', 'दर', 'जुन्या',
      'ट्रिप्स', 'माहिती', 'द्या', 'माझ्याकडे', 'कोणत्या', 'कोणते', 'उपलब्ध', 'नफा', 'माझ्या',
      'पाहिजे', 'दाखवा', 'करतो', 'मिळेल', 'सांगा', 'चालक', 'उत्पन्न', 'सहली'
    ];

    let marathiCount = 0;
    for (const marker of marathiMarkers) {
      if (text.includes(marker)) marathiCount++;
    }

    // Default Devanagari to Marathi for Maharashtra agricultural domain unless Hindi specific markers match
    const hindiMarkers = ['क्या', 'कैसा', 'कैसे', 'बताओ', 'दिखाओ', 'कितना', 'गाड़ियां', 'कौनसी', 'कौनसे'];
    let hindiCount = 0;
    for (const hMarker of hindiMarkers) {
      if (text.includes(hMarker)) hindiCount++;
    }

    if (marathiCount > 0 || (devanagariRegex.test(text) && hindiCount === 0)) {
      return 'mr';
    }

    return 'hi';
  }

  extractEntities(text) {
    const lowerText = text.toLowerCase();
    const entities = {
      commodity: null,
      market: null,
      marketObj: null,
      state: 'Maharashtra',
      district: null
    };

    // Commodity Mapping Dictionary (Multilingual)
    const commodityMap = [
      { keys: ['onion', 'कांदा', 'कांद्याचा', 'कांदे', 'कांद्याचे', 'कांद्या', 'प्याज', 'प्याज़'], name: 'Onion' },
      { keys: ['tomato', 'टोमॅटो', 'टोमॅटोचा', 'टोमॅटोचे', 'टमाटर', 'टमाटर का'], name: 'Tomato' },
      { keys: ['potato', 'बटाटा', 'बटाटे', 'बटाट्याचा', 'बटाट्याचे', 'आलू', 'आलू का'], name: 'Potato' },
      { keys: ['wheat', 'गहू', 'गव्हाचा', 'गव्हाचे', 'गेहूं', 'गेहूं का'], name: 'Wheat' },
      { keys: ['pomegranate', 'डाळिंब', 'डाळिंबाचा', 'अनार'], name: 'Pomegranate' },
      { keys: ['grapes', 'द्राक्षे', 'द्राक्ष', 'द्राक्षांचा', 'अंगूर'], name: 'Grapes' },
      { keys: ['maize', 'मका', 'मक्का'], name: 'Maize' },
      { keys: ['chilli', 'मिरची', 'मिर्च'], name: 'Chilly Capsicum' }
    ];

    for (const item of commodityMap) {
      if (item.keys.some(k => lowerText.includes(k))) {
        entities.commodity = item.name;
        break;
      }
    }

    // Market Resolution using MarketResolver
    const resolved = marketResolver.resolveMarket(text);
    if (resolved) {
      entities.market = resolved.canonicalName;
      entities.marketObj = resolved;
    }

    return entities;
  }

  normalizeQueryText(text) {
    let normalized = text;
    const termMap = {
      'नफा': 'profit net revenue',
      'कसा': 'how calculate',
      'गणना': 'calculate formula equation',
      'शेतकरी': 'farmer',
      'किसान': 'farmer',
      'बाजार': 'mandi market rate',
      'भाव': 'price rate modal',
      'दर': 'board rate price',
      'गाडी': 'vehicle transport truck fleet',
      'ड्रायव्हर': 'driver logistics'
    };

    for (const [key, val] of Object.entries(termMap)) {
      if (normalized.includes(key)) {
        normalized += ' ' + val;
      }
    }

    return normalized;
  }
}

module.exports = new QueryProcessor();
