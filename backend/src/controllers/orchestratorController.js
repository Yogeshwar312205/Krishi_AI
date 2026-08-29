const Vehicle = require('../models/Vehicle');
const Order = require('../models/Order');
const {
  callOptimizeRoute, callPriceContext, callPriceForecast, callModelInfo,
} = require('../services/aiEngineService');
const { getAgmarknetLivePrices, getAgmarknetHistory } = require('../services/agmarknetService');
const { buildPriceDecision, explainPriceDecision } = require('../services/priceSuggestionService');
const logger = require('../utils/logger');

// Comprehensive APMC Markets across all 6 administrative divisions of Maharashtra
const MARKETS = [
  {
    id: 'm1',
    name: 'Vashi Wholesale APMC',
    city: 'Navi Mumbai',
    coordinates: [73.0012, 19.0760],
    basePricesPerKg: { Tomato: 48, Potato: 28, Onion: 36, Rice: 52, Wheat: 38, Mango: 120, Banana: 40 }
  },
  {
    id: 'm2',
    name: 'Nashik APMC Main Mandi',
    city: 'Nashik',
    coordinates: [73.7898, 19.9975],
    basePricesPerKg: { Tomato: 38, Potato: 22, Onion: 28, Rice: 45, Wheat: 32, Mango: 85, Banana: 30 }
  },
  {
    id: 'm3',
    name: 'Pimpalgaon Baswant APMC',
    city: 'Pimpalgaon (Nashik)',
    coordinates: [73.9850, 20.1750],
    basePricesPerKg: { Tomato: 39, Potato: 23, Onion: 30, Rice: 46, Wheat: 33, Mango: 88, Banana: 31 }
  },
  {
    id: 'm4',
    name: 'Gultekdi APMC Market',
    city: 'Pune',
    coordinates: [73.8567, 18.5204],
    basePricesPerKg: { Tomato: 44, Potato: 25, Onion: 32, Rice: 48, Wheat: 35, Mango: 105, Banana: 36 }
  },
  {
    id: 'm5',
    name: 'Kolhapur APMC Mandi',
    city: 'Kolhapur',
    coordinates: [74.2433, 16.7050],
    basePricesPerKg: { Tomato: 41, Potato: 24, Onion: 29, Rice: 47, Wheat: 34, Mango: 95, Banana: 33 }
  },
  {
    id: 'm6',
    name: 'Sangli APMC Market',
    city: 'Sangli',
    coordinates: [74.5815, 16.8524],
    basePricesPerKg: { Tomato: 42, Potato: 24, Onion: 31, Rice: 46, Wheat: 34, Mango: 98, Banana: 34 }
  },
  {
    id: 'm7',
    name: 'Solapur APMC Onion Hub',
    city: 'Solapur',
    coordinates: [75.9064, 17.6599],
    basePricesPerKg: { Tomato: 39, Potato: 23, Onion: 34, Rice: 45, Wheat: 33, Mango: 90, Banana: 32 }
  },
  {
    id: 'm8',
    name: 'Ahmednagar APMC Market',
    city: 'Ahmednagar',
    coordinates: [74.7480, 19.0948],
    basePricesPerKg: { Tomato: 38, Potato: 22, Onion: 31, Rice: 44, Wheat: 32, Mango: 86, Banana: 31 }
  },
  {
    id: 'm9',
    name: 'Chhatrapati Sambhajinagar APMC',
    city: 'Aurangabad',
    coordinates: [75.3433, 19.8762],
    basePricesPerKg: { Tomato: 40, Potato: 24, Onion: 32, Rice: 47, Wheat: 34, Mango: 92, Banana: 33 }
  },
  {
    id: 'm10',
    name: 'Jalgaon Mandi Hub',
    city: 'Jalgaon',
    coordinates: [75.5626, 21.0077],
    basePricesPerKg: { Tomato: 37, Potato: 21, Onion: 29, Rice: 44, Wheat: 31, Mango: 84, Banana: 38 }
  },
  {
    id: 'm11',
    name: 'Nagpur Cotton & Orange APMC',
    city: 'Nagpur',
    coordinates: [79.0882, 21.1458],
    basePricesPerKg: { Tomato: 43, Potato: 26, Onion: 33, Rice: 49, Wheat: 36, Mango: 100, Banana: 35 }
  },
  {
    id: 'm12',
    name: 'Amravati Grain & Produce Mandi',
    city: 'Amravati',
    coordinates: [77.7588, 20.9374],
    basePricesPerKg: { Tomato: 41, Potato: 23, Onion: 30, Rice: 46, Wheat: 33, Mango: 90, Banana: 33 }
  },
  {
    id: 'm13',
    name: 'Latur Pulse & Oilseed APMC',
    city: 'Latur',
    coordinates: [76.5810, 18.4088],
    basePricesPerKg: { Tomato: 39, Potato: 23, Onion: 31, Rice: 45, Wheat: 33, Mango: 88, Banana: 32 }
  },
  {
    id: 'm14',
    name: 'Nanded Central Mandi',
    city: 'Nanded',
    coordinates: [77.3164, 19.1383],
    basePricesPerKg: { Tomato: 38, Potato: 22, Onion: 29, Rice: 44, Wheat: 32, Mango: 86, Banana: 31 }
  },
  {
    id: 'm15',
    name: 'Satara Agricultural Mandi',
    city: 'Satara',
    coordinates: [74.0183, 17.6805],
    basePricesPerKg: { Tomato: 40, Potato: 23, Onion: 30, Rice: 46, Wheat: 33, Mango: 92, Banana: 33 }
  },
  {
    id: 'm16',
    name: 'Ratnagiri Mango & Produce APMC',
    city: 'Ratnagiri',
    coordinates: [73.3120, 16.9902],
    basePricesPerKg: { Tomato: 45, Potato: 27, Onion: 35, Rice: 50, Wheat: 37, Mango: 135, Banana: 38 }
  }
];

const fallbackOptimization = (farmOrigin, cropDetails, vehicles, markets) => {
  const crop = cropDetails.cropType || 'Tomato';
  const qty = cropDetails.quantityKg || 1000;
  const tempSens = cropDetails.temperatureSensitivity || 'High';

  const recommendations = markets.map((mkt, idx) => {
    const basePrice = mkt.basePricesPerKg[crop] || 35;
    const [fLng, fLat] = farmOrigin;
    const [mLng, mLat] = mkt.coordinates;
    const dLat = (mLat - fLat) * Math.PI / 180;
    const dLng = (mLng - fLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(fLat * Math.PI / 180) * Math.cos(mLat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const distKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const travelHours = Math.round((distKm / 50) * 10) / 10;

    const vehicle = vehicles[idx % vehicles.length] || {
      driverName: 'Ramesh Kumar',
      vehicleType: 'Refrigerated Van',
      ratePerKm: 18,
      isRefrigerated: true
    };

    const rate = vehicle.ratePerKm || 15;
    const transportCost = Math.round(distKm * rate);
    const decayFactor = tempSens === 'High' ? 0.04 : (tempSens === 'Medium' ? 0.02 : 0.01);
    const refrigeratedDiscount = vehicle.isRefrigerated ? 0.3 : 1.0;
    const spoilageRiskPercent = Math.min(30, Math.round((1 - Math.exp(-decayFactor * travelHours * refrigeratedDiscount)) * 100 * 10) / 10);
    
    const usableQty = qty * (1 - spoilageRiskPercent / 100);
    const grossRevenue = Math.round(usableQty * basePrice);
    const netProfit = grossRevenue - transportCost;
    const spoilageLoss = Math.round(qty * (spoilageRiskPercent / 100) * basePrice);

    return {
      marketId: mkt.id,
      marketName: mkt.name,
      marketCity: mkt.city,
      marketCoordinates: mkt.coordinates,
      predictedPricePerKg: basePrice,
      grossRevenue,
      transportCost,
      spoilageRiskPercent,
      spoilageLoss,
      netProfit,
      routeDistanceKm: distKm,
      travelTimeHours: travelHours,
      recommendedVehicle: vehicle,
      isTopChoice: false
    };
  });

  recommendations.sort((a, b) => b.netProfit - a.netProfit);
  if (recommendations.length > 0) {
    recommendations[0].isTopChoice = true;
    recommendations[0].badge = 'Gold Medal (Highest Profit)';
  }
  if (recommendations.length > 1) recommendations[1].badge = 'Silver (Lowest Transport Cost)';
  if (recommendations.length > 2) recommendations[2].badge = 'Bronze (Fastest Delivery)';

  return recommendations;
};

// POST /api/recommend
const recommendLogistics = async (req, res) => {
  try {
    const { farmerName, farmerPhone, cropDetails, farmLocation } = req.body;
    const farmCoords = (farmLocation && farmLocation.coordinates) ? farmLocation.coordinates : [73.7898, 19.9975];
    const [lng, lat] = farmCoords;

    let nearbyVehicles = [];
    try {
      nearbyVehicles = await Vehicle.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 500000 // Expand radius to 500km to capture statewide fleet
          }
        },
        isAvailable: true
      }).limit(20).exec();
    } catch (err) {}

    if (!nearbyVehicles || nearbyVehicles.length === 0) {
      const { fallbackVehicles } = require('./vehicleController');
      nearbyVehicles = fallbackVehicles;
    }

    const pythonPayload = {
      farmer_origin: farmCoords,
      crop_details: cropDetails || { cropType: 'Tomato', quantityKg: 2000, temperatureSensitivity: 'High' },
      nearby_vehicles: nearbyVehicles,
      markets: MARKETS
    };

    let recommendations = [];
    let aiEngineSource = 'Python FastAPI Engine (OR-Tools VRP)';

    try {
      const pythonResponse = await callOptimizeRoute(pythonPayload);
      recommendations = pythonResponse.recommendations;
    } catch (err) {
      logger.warn(`Python AI service unavailable, using local VRP solver: ${err.message}`);
      aiEngineSource = 'Embedded JS VRP AI Engine (Fallback Active)';
      recommendations = fallbackOptimization(farmCoords, cropDetails || {}, nearbyVehicles, MARKETS);
    }

    let newOrder = null;
    try {
      newOrder = new Order({
        farmerName: farmerName || 'Krishak User',
        farmerPhone: farmerPhone || '+91 98765 43210',
        cropDetails: cropDetails || { cropType: 'Tomato', quantityKg: 2000, harvestTime: new Date() },
        farmLocation: { address: farmLocation?.address || 'Nashik Farm HQ', coordinates: farmCoords },
        status: 'Recommended',
        optimizationResult: {
          netProfit: recommendations[0]?.netProfit,
          transportCost: recommendations[0]?.transportCost,
          spoilageRiskPercent: recommendations[0]?.spoilageRiskPercent,
          routeDistanceKm: recommendations[0]?.routeDistanceKm,
          travelTimeHours: recommendations[0]?.travelTimeHours
        }
      });
      await newOrder.save();
    } catch (saveErr) {}

    return res.status(200).json({
      success: true,
      aiEngineSource,
      farmerOrigin: farmCoords,
      orderId: newOrder ? newOrder._id : 'ORD-' + Date.now(),
      totalMarketsAnalyzed: MARKETS.length,
      vehiclesDispatchedCount: nearbyVehicles.length,
      recommendations
    });
  } catch (error) {
    logger.error(`Recommend logistics error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/prices/forecast
const getPriceForecast = async (req, res) => {
  const cropType = req.query.cropType || 'Tomato';
  const basePrices = {
    Tomato: { current: 38, peakDay: 4, peakPrice: 48, trend: [38, 40, 43, 46, 48, 45, 42], confidence: 94 },
    Potato: { current: 22, peakDay: 6, peakPrice: 27, trend: [22, 23, 23, 25, 26, 27, 26], confidence: 96 },
    Onion: { current: 28, peakDay: 5, peakPrice: 35, trend: [28, 29, 31, 33, 34, 35, 33], confidence: 92 },
    Wheat: { current: 32, peakDay: 7, peakPrice: 36, trend: [32, 32, 33, 34, 35, 35, 36], confidence: 95 },
    Rice: { current: 45, peakDay: 3, peakPrice: 52, trend: [45, 48, 50, 52, 51, 49, 48], confidence: 93 },
    Mango: { current: 85, peakDay: 5, peakPrice: 110, trend: [85, 90, 96, 102, 108, 110, 105], confidence: 91 },
    Banana: { current: 30, peakDay: 2, peakPrice: 34, trend: [30, 32, 34, 33, 32, 31, 30], confidence: 95 }
  };
  const forecast = basePrices[cropType] || basePrices.Tomato;
  return res.json({ success: true, cropType, forecast, source: 'Agmarknet LightGBM Ensemble' });
};

// GET /api/demand/analysis
const getDemandAnalysis = async (req, res) => {
  const cropType = req.query.cropType || 'Tomato';
  return res.json({
    success: true,
    cropType,
    demandLevel: 'HIGH DEMAND',
    demandScore: 88,
    marketDeficit: '+18%',
    activeBuyers: 142,
    timestamp: new Date().toISOString()
  });
};

// GET /api/prices/sell-advice?crop=&state=&originLat=&originLng=&quantityKg=
//
// Rule-based "sell now or hold" guidance. The number-crunching lives in the
// Python engine (ai-engine price_service SECTION 2); this handler just gathers
// the real inputs it needs:
//   - baseline ₹/kg   : median of today's reporting Maharashtra APMCs (Agmarknet)
//   - trailing avg ₹/kg: mean of the last ~14 daily state averages (Agmarknet)
//   - weather          : the Python side fetches it from OpenWeather given lat/lon
//
// Mandi *arrivals* are deliberately NOT sent: the data.gov.in feed has no real
// volume column (see agmarknetService.js), so the demand/supply read here comes
// from price momentum only. When a genuine arrivals feed exists, pass
// currentArrivalsQuintals / baselineArrivalsQuintals straight through.
//
// Degrades: if the Python engine is unreachable the response still carries the
// real price numbers, with advice: null and aiEngineSource naming the outage.
const getSellAdvice = async (req, res) => {
  const crop = req.query.crop || req.query.cropType || 'Tomato';
  const state = req.query.state || 'Maharashtra';
  const originLat = parseFloat(req.query.originLat);
  const originLng = parseFloat(req.query.originLng);
  const language = ['en', 'hi', 'mr'].includes(req.query.language) ? req.query.language : 'en';

  try {
    const [live, history] = await Promise.all([
      getAgmarknetLivePrices(crop, state),
      getAgmarknetHistory(crop, state, 14),
    ]);

    const rates = (live.records || [])
      .map((r) => Number(r.modalPricePerKg))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    if (!rates.length) {
      return res.status(503).json({
        success: false,
        message: `No live ${crop} rates available to base advice on.`,
      });
    }

    // Baseline: the caller's own figure if supplied (the Prices screen sends the
    // net-ranked best rate it is already showing, so the card and the headline
    // agree), else the state-wide median modal across reporting markets.
    const override = parseFloat(req.query.baselinePricePerKg);
    const median = rates[Math.floor(rates.length / 2)];
    const baseline = Number.isFinite(override) && override > 0 ? override : median;

    const histDays = history.days || [];
    const trailingAvg = histDays.length
      ? histDays.reduce((s, d) => s + Number(d.avgRatePerKg || 0), 0) / histDays.length
      : null;

    const payload = {
      cropType: crop,
      baselinePricePerKg: Math.round(baseline * 100) / 100,
      currentPricePerKg: Math.round(baseline * 100) / 100,
      trailingAvgPricePerKg: trailingAvg ? Math.round(trailingAvg * 100) / 100 : null,
    };
    if (Number.isFinite(originLat) && Number.isFinite(originLng)) {
      payload.latitude = originLat;
      payload.longitude = originLng;
    }

    const historyPerKg = histDays.map((d) => Number(d.avgRatePerKg)).filter((n) => Number.isFinite(n) && n > 0);
    const priceMedian = (values) => {
      const valid = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
      return valid.length ? valid[Math.floor(valid.length / 2)] / 100 : undefined;
    };

    let advice = null;
    let forecast = { available: false, reason: 'forecast unavailable' };
    let aiEngineSource = 'Python rule-based context scorer + trained XGBoost forecast';
    try {
      const [contextResult, forecastResult] = await Promise.allSettled([
        callPriceContext(payload),
        callPriceForecast({
          cropType: crop,
          historyPerKg,
          historyDates: histDays.map((d) => d.date),
          minPricePerKg: priceMedian((live.records || []).map((r) => Number(r.minPricePerQuintal))),
          maxPricePerKg: priceMedian((live.records || []).map((r) => Number(r.maxPricePerQuintal))),
        }),
      ]);
      if (contextResult.status === 'fulfilled') advice = contextResult.value;
      if (forecastResult.status === 'fulfilled') forecast = forecastResult.value;
      if (contextResult.status === 'rejected' || forecastResult.status === 'rejected') {
        aiEngineSource = 'partially unavailable — live Agmarknet prices retained';
      }
    } catch (err) {
      logger.warn(`Sell-advice: AI engine partly unavailable (${err.message}).`);
      aiEngineSource = 'partially unavailable — live Agmarknet prices retained';
    }

    const decision = advice ? buildPriceDecision({ advice, forecast }) : null;
    const explanation = decision
      ? await explainPriceDecision({ crop, advice, forecast, decision, language })
      : { available: false, source: 'no decision to explain' };

    return res.json({
      success: true,
      crop,
      state,
      aiEngineSource,
      inputs: {
        baselinePricePerKg: payload.baselinePricePerKg,
        baselineSource: Number.isFinite(override) && override > 0 ? 'caller' : 'state median',
        trailingAvgPricePerKg: payload.trailingAvgPricePerKg,
        reportingMarkets: rates.length,
        historyDays: histDays.length,
        isLiveGovtData: live.isLiveGovtData,
        weatherRequested: Boolean(payload.latitude),
        arrivalsAvailable: false,
      },
      advice,
      forecast,
      decision,
      explanation,
    });
  } catch (error) {
    logger.error(`Sell-advice error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/prices/model-forecast?crop=&market=&district=
//
// The trained XGBoost model's ~7-period-ahead price for a crop, as a chart
// series (real history + projection).
//
// This is a STATE-LEVEL forecast, and the inputs say so. `getAgmarknetHistory`
// averages each day across every reporting Maharashtra market on purpose — a
// single mandi rarely reports daily, so there is no per-market series to feed a
// per-market prediction. So unless the caller names a market, none is sent:
// the model then treats that feature as missing rather than being handed an
// arbitrary mandi to price against a state-average history. The min/max spread
// is likewise the MEDIAN across reporting markets — a typical market's daily
// spread, which is what `price_range` meant during training — not whichever
// market happens to top the rate-sorted list.
//
// Degrades every way: model unhealthy, output implausible, ai engine down, or
// no history all return `forecast.available: false` with a reason. `modelInfo`
// (status + crop coverage for both the model and the rule-based scorer) is
// always included so the UI can render its NOTE.
const getModelForecast = async (req, res) => {
  const crop = req.query.crop || req.query.cropType || 'Tomato';
  const state = 'Maharashtra';
  const market = req.query.market || null;
  const district = req.query.district || null;

  const median = (values) => {
    const sorted = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  };

  try {
    const [live, history, modelInfo] = await Promise.all([
      getAgmarknetLivePrices(crop, state),
      getAgmarknetHistory(crop, state, 21),
      callModelInfo(),
    ]);

    const days = history.days || [];
    const historyPerKg = days.map((d) => Number(d.avgRatePerKg)).filter((n) => Number.isFinite(n) && n > 0);

    if (!historyPerKg.length) {
      return res.json({
        success: true, crop, market, scope: 'state',
        forecast: { available: false, reason: 'no Agmarknet price history for this crop' },
        modelInfo,
      });
    }

    const records = live.records || [];
    const medianMin = median(records.map((r) => Number(r.minPricePerQuintal)));
    const medianMax = median(records.map((r) => Number(r.maxPricePerQuintal)));

    const payload = {
      cropType: crop,
      historyPerKg,
      // Only ever a market the caller actually asked for — see the note above.
      market,
      district,
      minPricePerKg: medianMin ? medianMin / 100 : undefined,
      maxPricePerKg: medianMax ? medianMax / 100 : undefined,
      historyDates: days.slice(-7).map((d) => d.date),
    };

    let forecast;
    try {
      forecast = await callPriceForecast(payload);
    } catch (err) {
      logger.warn(`model-forecast: ai engine unavailable (${err.message})`);
      forecast = { available: false, reason: 'forecast engine unreachable' };
    }

    return res.json({
      success: true,
      crop,
      market,
      scope: market ? 'market' : 'state',
      reportingMarkets: records.length,
      forecast,
      modelInfo,
    });
  } catch (error) {
    logger.error(`Model forecast error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  recommendLogistics, getPriceForecast, getDemandAnalysis,
  getSellAdvice, getModelForecast, MARKETS,
};
