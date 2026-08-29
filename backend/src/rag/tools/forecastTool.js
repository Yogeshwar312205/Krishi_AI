const { getAgmarknetLivePrices, getAgmarknetHistory } = require('../../services/agmarknetService');
const { callPriceContext, callPriceForecast, callModelInfo } = require('../../services/aiEngineService');
const { buildPriceDecision } = require('../../services/priceSuggestionService');
const logger = require('../../utils/logger');

/**
 * Gives the RAG agent the same "sell now or wait / where is the price heading"
 * intelligence the Prices screen shows: the trained XGBoost 7-period forecast,
 * the rule-based weather + momentum context scorer, and the deterministic
 * combined recommendation. Mirrors controllers/orchestratorController.getSellAdvice
 * without the HTTP hop.
 *
 * Every branch degrades: if the Python engine is down the tool still returns the
 * live Agmarknet baseline and says the forecast is unavailable.
 */
class ForecastTool {
  constructor() {
    this.name = 'getPriceForecast';
    this.description = 'Trained XGBoost 7-period price forecast, weather/momentum context scorer, and the combined sell-now / wait recommendation for a crop.';
  }

  /**
   * @param {object} params - { commodity, market, user, language }
   */
  async execute(params = {}) {
    const crop = params.commodity || 'Tomato';
    const state = 'Maharashtra';

    try {
      const [live, history, modelInfo] = await Promise.all([
        getAgmarknetLivePrices(crop, state),
        getAgmarknetHistory(crop, state, 21),
        callModelInfo(),
      ]);

      const modal = (live.records || [])
        .map((r) => Number(r.modalPricePerKg))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);
      const baseline = modal.length ? modal[Math.floor(modal.length / 2)] : null;

      const days = history.days || [];
      const historyPerKg = days.map((d) => Number(d.avgRatePerKg)).filter((n) => Number.isFinite(n) && n > 0);
      const trailingAvg = historyPerKg.length
        ? Math.round((historyPerKg.reduce((s, n) => s + n, 0) / historyPerKg.length) * 100) / 100
        : null;

      const median = (values) => {
        const v = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
        return v.length ? v[Math.floor(v.length / 2)] / 100 : undefined;
      };

      let advice = null;
      let forecast = { available: false, reason: 'forecast engine unreachable' };
      let engineStatus = 'trained XGBoost forecast + rule-based context scorer';

      const [ctxRes, fcRes] = await Promise.allSettled([
        callPriceContext({
          cropType: crop,
          baselinePricePerKg: baseline,
          currentPricePerKg: baseline,
          trailingAvgPricePerKg: trailingAvg,
        }),
        callPriceForecast({
          cropType: crop,
          historyPerKg,
          historyDates: days.map((d) => d.date),
          minPricePerKg: median((live.records || []).map((r) => Number(r.minPricePerQuintal))),
          maxPricePerKg: median((live.records || []).map((r) => Number(r.maxPricePerQuintal))),
        }),
      ]);
      if (ctxRes.status === 'fulfilled') advice = ctxRes.value;
      if (fcRes.status === 'fulfilled') forecast = fcRes.value;
      if (ctxRes.status === 'rejected' || fcRes.status === 'rejected') {
        engineStatus = 'partially unavailable — live Agmarknet baseline retained';
      }

      const decision = advice ? buildPriceDecision({ advice, forecast }) : null;

      return {
        success: true,
        toolUsed: this.name,
        source: 'KrishiFlow price engine (XGBoost forecast + rule-based scorer) over data.gov.in Agmarknet',
        dataSource: 'KrishiFlow Price Forecast',
        commodity: crop,
        state,
        isLiveGovtData: live.isLiveGovtData !== false,
        currentPricePerKg: baseline,
        trailingAvgPricePerKg: trailingAvg,
        recommendation: decision?.recommendation || advice?.recommendation || null,
        ruleRecommendation: decision?.ruleRecommendation || advice?.recommendation || null,
        combinedPolicy: decision?.policy || null,
        contextAdvice: advice ? {
          recommendation: advice.recommendation,
          contextAdjustmentPct: advice.contextAdjustmentPct,
          reasons: advice.reasons || [],
          weatherUsed: Boolean(advice.weather),
        } : null,
        forecast: forecast?.available ? {
          available: true,
          horizonPeriods: forecast.horizonPeriods,
          lastKnownPricePerKg: forecast.lastKnownPricePerKg,
          predictedPricePerKg: forecast.predictedPricePerKg,
          changePct: forecast.changePct,
          withheldChangePct: forecast.withheldChangePct,
        } : {
          available: false,
          reason: forecast?.reason || 'not available',
          withheldChangePct: forecast?.withheldChangePct,
        },
        modelCoverage: {
          trainedCrops: modelInfo?.commodities || modelInfo?.trainedCommodities || null,
          state: modelInfo?.state || 'Maharashtra',
          modelAvailable: modelInfo?.available !== false,
          modelStatus: modelInfo?.status?.reason || (modelInfo?.available === false ? 'model unavailable' : 'healthy'),
        },
        engineStatus,
      };
    } catch (err) {
      logger.error(`[ForecastTool] Failed: ${err.message}`);
      return {
        success: false,
        toolUsed: this.name,
        source: 'KrishiFlow Price Forecast',
        dataSource: 'unavailable',
        commodity: crop,
        message: `Could not build a price forecast for ${crop} right now.`,
        forecast: { available: false, reason: err.message },
      };
    }
  }
}

module.exports = new ForecastTool();
