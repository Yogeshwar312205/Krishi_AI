class IntentClassifier {
  /**
   * Classifies query intent based on full semantic meaning rather than isolated keywords.
   * @param {string} query 
   * @param {object} entities - { commodity, market, state }
   * @returns {string} intent type
   */
  classify(query, entities = {}) {
    if (!query) return 'UNKNOWN';
    const lower = query.toLowerCase().trim();

    // 1. Logistics, VRP, Route Optimization & Dispatch Workflows (HIGHER PRIORITY than plain vehicle keywords)
    const isLogisticsVrpQuery =
      lower.includes('vrp') ||
      lower.includes('insertion') ||
      lower.includes('route') ||
      lower.includes('routing') ||
      lower.includes('optimization') ||
      lower.includes('dispatch') ||
      lower.includes('assigned') ||
      lower.includes('assignment') ||
      lower.includes('pickup request') ||
      lower.includes('haversine') ||
      lower.includes('solver') ||
      lower.includes('capacity');

    if (isLogisticsVrpQuery) {
      return 'LOGISTICS_WORKFLOW';
    }

    // 2. Vehicle Registration Specific Intent
    const isVehicleRegistrationQuery =
      lower.includes('register') ||
      lower.includes('registration') ||
      lower.includes('add vehicle') ||
      lower.includes('new vehicle') ||
      lower.includes('supported vehicle') ||
      lower.includes('vehicles supported') ||
      lower.includes('vehicles can be registered') ||
      (lower.includes('what vehicles') && !lower.includes('assigned')) ||
      lower.includes('reefer spec') ||
      lower.includes('freighter spec') ||
      lower.includes('vehicle type');

    if (isVehicleRegistrationQuery) {
      return 'VEHICLE_REGISTRATION';
    }

    // 3. Live Market Price vs Combined Queries
    const hasPriceKeyword =
      lower.includes('price') ||
      lower.includes('rate') ||
      lower.includes('cost') ||
      lower.includes('भाव') ||
      lower.includes('दर') ||
      lower.includes('मंडी') ||
      lower.includes('बाजार') ||
      lower.includes('mandi') ||
      lower.includes('today');

    const hasProfitKeyword =
      lower.includes('profit') ||
      lower.includes('net') ||
      lower.includes('revenue') ||
      lower.includes('transport') ||
      lower.includes('नफा') ||
      lower.includes('कमाई') ||
      lower.includes('खर्च');

    const isLocationFollowup = /^at\s+/i.test(lower) || /^in\s+/i.test(lower) || lower.startsWith('what about');

    if (hasPriceKeyword && hasProfitKeyword && (entities.commodity || entities.market)) {
      return 'COMBINED';
    }

    // Explicit live market price query
    if (hasPriceKeyword && (entities.commodity || entities.market)) {
      return 'LIVE_MARKET_PRICE';
    }

    if (isLocationFollowup && (entities.market || entities.commodity)) {
      return 'LIVE_MARKET_PRICE';
    }

    if (entities.commodity && entities.market) {
      return 'LIVE_MARKET_PRICE';
    }

    if (hasProfitKeyword) {
      return 'PROFIT_CALCULATION';
    }

    // 4. Role & Technical Intents
    if (lower.includes('farmer') || lower.includes('crop listing') || lower.includes('शेतकरी')) {
      return 'FARMER_WORKFLOW';
    }

    if (lower.includes('buyer') || lower.includes('agreed rate') || lower.includes('deal') || lower.includes('apmc')) {
      return 'APMC_WORKFLOW';
    }

    if (lower.includes('architecture') || lower.includes('mongodb') || lower.includes('express') || lower.includes('microservice')) {
      return 'TECHNICAL';
    }

    // 5. Fallback to General Knowledge
    return 'KNOWLEDGE';
  }
}

module.exports = new IntentClassifier();
