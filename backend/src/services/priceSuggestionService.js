const axios = require('axios');
const logger = require('../utils/logger');

const MODEL_MOVE_PCT = 5;

const realGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY || '';
  return key && key !== 'your_gemini_api_key_here' && !key.includes('your_') ? key : null;
};

/** The price model may soften, but never replace, the rule-based decision. */
const buildPriceDecision = ({ advice, forecast }) => {
  const rule = advice?.recommendation || null;
  const modelAvailable = Boolean(forecast?.available && Number.isFinite(forecast?.changePct));
  const changePct = modelAvailable ? Number(forecast.changePct) : null;
  const modelSignal = !modelAvailable ? 'unavailable'
    : changePct >= MODEL_MOVE_PCT ? 'rise'
      : changePct <= -MODEL_MOVE_PCT ? 'fall' : 'steady';
  const isHold = rule === 'HOLD' || rule === 'HOLD_STRONG';
  const isSell = rule === 'SELL_SOON';
  const move = changePct == null ? null : `${Math.abs(changePct).toFixed(1)}%`;

  let recommendation = rule;
  let policy = 'rule-based recommendation retained; no model forecast to combine';

  if (rule === 'SELL_NOW') {
    // Crop-quality risk is time-critical; a price forecast never overrides it.
    policy = modelAvailable && modelSignal !== 'steady'
      ? `urgent sell retained despite a forecast ${modelSignal} of ${move}: weather/quality risk is time-critical`
      : 'urgent sell retained: weather/quality risk is time-critical';
  } else if (isSell && modelSignal === 'rise') {
    recommendation = 'HOLD';
    policy = `forecast points to a ${move} rise, so SELL_SOON is softened to HOLD`;
  } else if (isHold && modelSignal === 'fall') {
    recommendation = 'SELL_SOON';
    policy = `forecast points to a ${move} fall, so HOLD is softened to SELL_SOON`;
  } else if (isSell && modelSignal === 'fall') {
    policy = `forecast agrees: a ${move} fall is expected, so the sell-soon call stands`;
  } else if (isHold && modelSignal === 'rise') {
    policy = `forecast agrees: a ${move} rise is expected, so the hold stands`;
  } else if (modelAvailable && modelSignal === 'steady') {
    policy = `forecast is roughly flat (${move}), so the rule-based call stands`;
  } else if (!modelAvailable) {
    policy = 'rule-based recommendation retained; model forecast unavailable';
  }
  return { recommendation, ruleRecommendation: rule, modelSignal, modelAvailable, modelChangePct: changePct, policy, thresholdPct: MODEL_MOVE_PCT };
};

const languageInstruction = (language) => (language === 'hi' ? 'Write only Hindi in Devanagari.'
  : language === 'mr' ? 'Write only Marathi in Devanagari.' : 'Write only English.');

const cleanExplanation = (value) => {
  if (!value || typeof value !== 'object' || typeof value.summary !== 'string') return null;
  const reasons = Array.isArray(value.reasons) ? value.reasons.filter((item) => typeof item === 'string').slice(0, 3) : [];
  return { summary: value.summary.slice(0, 360), reasons: reasons.map((item) => item.slice(0, 220)), caution: typeof value.caution === 'string' ? value.caution.slice(0, 220) : '' };
};

// A quota failure must not leave the decision unexplained. This fallback is
// assembled only from the same deterministic inputs sent to Gemini and is
// marked so the UI never presents it as an AI-generated explanation.
const fallbackExplanation = ({ advice, forecast, decision, language, source }) => {
  const action = decision.recommendation;
  const summary = language === 'hi'
    ? (action === 'SELL_NOW' ? 'अभी बेचें।' : action === 'SELL_SOON' ? 'एक-दो दिन में बेचें।' : 'अभी रुकना ठीक है।')
    : language === 'mr'
      ? (action === 'SELL_NOW' ? 'आता विक्री करा.' : action === 'SELL_SOON' ? 'एक-दोन दिवसांत विक्री करा.' : 'आत्ता थांबणे योग्य आहे.')
      : (action === 'SELL_NOW' ? 'Sell now.' : action === 'SELL_SOON' ? 'Sell within a day or two.' : 'Holding for now is reasonable.');
  const reasons = [...(advice?.reasons || []).slice(0, 2)];
  if (forecast?.available && Number.isFinite(forecast.changePct)) {
    reasons.push(`The trained model estimates a ${forecast.changePct >= 0 ? '+' : ''}${forecast.changePct}% move over ${forecast.horizonPeriods} reporting periods.`);
  } else if (forecast?.reason) {
    reasons.push(`Model forecast unavailable: ${forecast.reason}.`);
  }
  return {
    available: true,
    fallback: true,
    source,
    summary,
    reasons: reasons.slice(0, 3),
    caution: language === 'hi' ? 'यह मार्गदर्शन है, निश्चित भाव नहीं।'
      : language === 'mr' ? 'हे मार्गदर्शन आहे, हमीचा भाव नाही.'
        : 'This is guidance, not a promised price.',
  };
};

// Two compact examples lock the format while keeping each request token-light.
const buildPrompt = (facts, language) => `You explain a farm selling suggestion. Use ONLY FACTS. Do not change action, add numbers, promise prices, or mention training. Return JSON only: {"summary":"...","reasons":["..."],"caution":"..."}. Max 3 reasons. ${languageInstruction(language)}
Example facts: {"action":"HOLD","rule":"SELL_SOON","model":{"available":true,"changePct":8},"policy":"forecast supports a rise"}
Example JSON: {"summary":"Hold for now.","reasons":["The model supports a higher rate.","The rule signal was not urgent."],"caution":"This is guidance, not a promised price."}
Example facts: {"action":"SELL_NOW","rule":"SELL_NOW","model":{"available":false},"policy":"urgent sell retained"}
Example JSON: {"summary":"Sell now.","reasons":["Crop conditions need quick action.","No model forecast was available."],"caution":"Confirm the buyer's offered rate."}
FACTS:${JSON.stringify(facts)}`;

const explainPriceDecision = async ({ crop, advice, forecast, decision, language = 'en' }) => {
  const key = realGeminiKey();
  if (!key) return fallbackExplanation({ advice, forecast, decision, language, source: 'Gemini not configured' });
  const facts = {
    crop, action: decision.recommendation, rule: decision.ruleRecommendation, policy: decision.policy,
    weatherRisk: advice?.weatherRisk?.available ? advice.weatherRisk.score : null,
    marketPressure: advice?.marketPressure ?? null,
    model: forecast?.available ? { available: true, horizonPeriods: forecast.horizonPeriods, lastKnownPricePerKg: forecast.lastKnownPricePerKg, predictedPricePerKg: forecast.predictedPricePerKg, changePct: forecast.changePct } : { available: false, reason: forecast?.reason || 'not available' },
  };
  try {
    const model = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').replace(/^models\//, '');

    // gemini-2.x / 3.x are "thinking" models: reasoning tokens are drawn from
    // maxOutputTokens, so a small cap leaves nothing for the actual answer and
    // the JSON comes back truncated ("Here is the JSON:"). Disable thinking for
    // this small structured task, and give the reply real headroom. The field
    // is only sent for models that understand it — 1.5 rejects unknown keys.
    const isThinkingModel = /gemini-(?:2\.|3\.|[3-9])/.test(model);
    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          reasons: { type: 'ARRAY', items: { type: 'STRING' } },
          caution: { type: 'STRING' },
        },
        required: ['summary', 'reasons', 'caution'],
      },
    };
    if (isThinkingModel) generationConfig.thinkingConfig = { thinkingBudget: 0 };

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      contents: [{ role: 'user', parts: [{ text: buildPrompt(facts, language) }] }],
      generationConfig,
    }, { timeout: 12000 });
    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const explanation = cleanExplanation(JSON.parse(raw));
    if (explanation) return { available: true, source: `Gemini ${model}`, ...explanation };
    logger.warn(`Price suggestion Gemini returned unusable payload: ${JSON.stringify(raw).slice(0, 200)}`);
  } catch (error) {
    logger.warn(`Price suggestion Gemini explanation unavailable: ${error.response?.status || error.message}`);
    return fallbackExplanation({
      advice, forecast, decision, language,
      source: `Gemini unavailable (${error.response?.status || 'request failed'})`,
    });
  }
  return fallbackExplanation({ advice, forecast, decision, language, source: 'Gemini returned no usable explanation' });
};

module.exports = { buildPriceDecision, explainPriceDecision };
