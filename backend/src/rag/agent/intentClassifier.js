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

    // 0. Spoilage / weather risk to a load in transit. Checked before the
    // logistics block because "will my tomato spoil on the route to Vashi"
    // contains "route" — but the real question is about perishability, not VRP.
    const isTransportRiskQuery =
      lower.includes('spoil') ||
      lower.includes('spoilage') ||
      lower.includes('perish') ||
      lower.includes('rot ') || lower.endsWith('rot') ||
      lower.includes('go bad') ||
      lower.includes('wilt') ||
      lower.includes('reefer') ||
      lower.includes('refrigerated van') ||
      lower.includes('cold chain') ||
      lower.includes('cold storage') ||
      lower.includes('cold van') ||
      lower.includes('weather') ||
      lower.includes('temperature') ||
      lower.includes('how hot') ||
      lower.includes('नासाडी') ||
      lower.includes('सडेल') ||
      lower.includes('खराब होईल') ||
      lower.includes('खराब हो') ||
      lower.includes('हवामान') ||
      lower.includes('मौसम') ||
      lower.includes('तापमान') ||
      lower.includes('थंड गाडी') ||
      lower.includes('ठंडी गाड़ी') ||
      lower.includes('nasadi') ||
      lower.includes('havaman');

    if (isTransportRiskQuery) {
      return 'TRANSPORT_RISK';
    }

    // 0b. Price forecast / "sell now or wait". Checked before the plain price
    // block so "will the tomato price rise" routes to the trained model, not to
    // a live-rate lookup.
    const isForecastQuery =
      lower.includes('forecast') ||
      lower.includes('predict') ||
      lower.includes('prediction') ||
      lower.includes('projection') ||
      lower.includes('outlook') ||
      lower.includes('trend') ||
      lower.includes('next week') ||
      lower.includes('next 7') ||
      lower.includes('coming days') ||
      lower.includes('days ahead') ||
      lower.includes('will the price') ||
      lower.includes('will price') ||
      lower.includes('price go up') ||
      lower.includes('price go down') ||
      lower.includes('price rise') ||
      lower.includes('price fall') ||
      lower.includes('prices rise') ||
      lower.includes('prices fall') ||
      lower.includes('going up') ||
      lower.includes('going down') ||
      lower.includes('sell now or wait') ||
      lower.includes('sell or wait') ||
      lower.includes('wait or sell') ||
      lower.includes('should i sell') ||
      lower.includes('should i wait') ||
      lower.includes('sell or hold') ||
      lower.includes('hold or sell') ||
      lower.includes('अंदाज') ||
      lower.includes('भाकित') ||
      lower.includes('वाढेल') ||
      lower.includes('घसरेल') ||
      lower.includes('भाव वाढ') ||
      lower.includes('विकू की थांबू') ||
      lower.includes('विकावे की थांबावे') ||
      lower.includes('बेचूँ या रुकूँ') ||
      lower.includes('भाव बढ़ेगा') ||
      lower.includes('भाव गिरेगा') ||
      lower.includes('आगे भाव') ||
      lower.includes('viku ki thambu') ||
      lower.includes('vadhel') ||
      lower.includes('ghasrel');

    if (isForecastQuery) {
      return 'PRICE_FORECAST';
    }

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

    // 1b. User Personal Registered Vehicles Query (DB query)
    const isUserVehiclesQuery =
      lower.includes('i own') ||
      (lower.includes('my vehicle') && !lower.includes('trip')) ||
      (lower.includes('my vehicles') && !lower.includes('trip')) ||
      (lower.includes('my truck') && !lower.includes('trip')) ||
      (lower.includes('my trucks') && !lower.includes('trip')) ||
      lower.includes('my fleet') ||
      lower.includes('vehicles i have') ||
      (lower.includes('how many vehicle') || lower.includes('how many vehicles')) ||
      (lower.includes('show my') && lower.includes('vehicle')) ||
      (lower.includes('list my') && lower.includes('vehicle')) ||
      lower.includes('माझ्याकडे') ||
      lower.includes('माझ्या मालकीच्या') ||
      lower.includes('माझ्या गाड्या') ||
      lower.includes('किती गाड्या') ||
      lower.includes('माझं वाहन') ||
      lower.includes('majhyakade') ||
      lower.includes('majhya gadhya');

    if (isUserVehiclesQuery) {
      return 'USER_VEHICLES';
    }

    // 1c. User Past Trips & Driver History Query (DB query)
    const isUserTripsQuery =
      lower.includes('trip') ||
      lower.includes('trips') ||
      lower.includes('previous trip') ||
      lower.includes('completed trip') ||
      lower.includes('past trip') ||
      lower.includes('past trips') ||
      lower.includes('amount generated') ||
      lower.includes('trip revenue') ||
      lower.includes('trip details') ||
      lower.includes('driver details') ||
      lower.includes('earnings from trip') ||
      lower.includes('orders completed') ||
      lower.includes('history of trips') ||
      lower.includes('deliveries') ||
      lower.includes('सहली') ||
      lower.includes('ट्रिप्स') ||
      lower.includes('जुन्या ट्रिप्स') ||
      lower.includes('आधीच्या सहली') ||
      lower.includes('माझ्या ट्रिप्स') ||
      lower.includes('ट्रिपची माहिती') ||
      lower.includes('junya trips') ||
      lower.includes('sahali');

    if (isUserTripsQuery) {
      return 'USER_TRIPS';
    }

    // 1d. Available Platform Vehicles & Transport Rates Query (DB query)
    const isAvailableFleetQuery =
      lower.includes('available vehicle') ||
      lower.includes('available vehicles') ||
      lower.includes('available truck') ||
      lower.includes('available trucks') ||
      lower.includes('vehicles available') ||
      lower.includes('vehicles are available') ||
      lower.includes('vehicle is available') ||
      lower.includes('trucks available') ||
      lower.includes('trucks are available') ||
      lower.includes('transport rate') ||
      lower.includes('transport rates') ||
      lower.includes('vehicle rate') ||
      lower.includes('vehicle rates') ||
      lower.includes('rate per km') ||
      lower.includes('freight rate') ||
      lower.includes('trucks for hire') ||
      lower.includes('उपलब्ध गाड्या') ||
      lower.includes('गाड्या उपलब्ध') ||
      lower.includes('उपलब्ध ट्रक') ||
      lower.includes('वाहतूक दर') ||
      lower.includes('भाडे दर') ||
      lower.includes('uplabdh gadhya') ||
      lower.includes('vahatuk dar');

    if (isAvailableFleetQuery) {
      return 'AVAILABLE_FLEET';
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
      lower.includes('worth it') ||
      lower.includes('worth sending') ||
      lower.includes('worth the') ||
      lower.includes('take home') ||
      lower.includes('take-home') ||
      lower.includes('नफा') ||
      lower.includes('कमाई') ||
      lower.includes('परवडेल') ||
      lower.includes('खर्च');

    const isLocationFollowup = /^at\s+/i.test(lower) || /^in\s+/i.test(lower) || lower.startsWith('what about');

    if (hasPriceKeyword && hasProfitKeyword && (entities.commodity || entities.market)) {
      return 'COMBINED';
    }

    // A profit / net / "worth it" question about a specific crop or market is a
    // COMBINED query even without a bare "price" word — it needs the live rate,
    // the freight rules AND the spoilage estimate the COMBINED path now pulls in.
    if (hasProfitKeyword && (entities.commodity || entities.market)) {
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
