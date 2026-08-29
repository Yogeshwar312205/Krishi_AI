const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * A current, generally-available model to fall back to when the configured
 * GEMINI_MODEL has been retired by Google (a 404 "no longer available" — which
 * is exactly what a stale `gemini-1.5-flash` / `gemini-2.x` value in .env now
 * returns). `-lite` and the `-latest` alias are the stable, low-latency choice
 * for short grounded answers.
 */
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const RETIRED_MODEL_HINT = /no longer available|is not found for API version|not supported for generateContent/i;

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).replace(/^models\//, '');
  }

  /** Pulls the first text part out of a generateContent response, skipping any
   *  thought-only parts that thinking models (Gemini 3.x flash) emit first. */
  extractText(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (typeof p?.text === 'string' && p.text.trim()) return p.text.trim();
    }
    return '';
  }

  buildPayload(systemPrompt, userQuestion, formattedContext, language) {
    const langDirective = language === 'mr'
      ? "MANDATORY LANGUAGE: Write the ENTIRE response in MARATHI (मराठी, Devanagari script). Keep only numbers, ₹, units, market names and model terms (e.g. XGBoost, SELL_SOON) as-is. Do NOT reply in English or Hindi."
      : language === 'hi'
      ? "MANDATORY LANGUAGE: Write the ENTIRE response in HINDI (हिंदी, Devanagari script). Keep only numbers, ₹, units, market names and model terms (e.g. XGBoost, SELL_SOON) as-is. Do NOT reply in English or Marathi."
      : "MANDATORY LANGUAGE: Write the ENTIRE response in English, even if the context or question contains other languages.";

    return {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: `\n${langDirective}` },
            { text: `\nUSER QUESTION (${language}): ${userQuestion}` },
            { text: `\nRETRIEVED CONTEXT:\n${formattedContext}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        // Headroom for a trilingual answer PLUS the reasoning tokens the 3.x
        // flash "thinking" models spend before the visible answer.
        maxOutputTokens: 2048
      }
    };
  }

  async callModel(modelName, payload) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
    const response = await axios.post(url, payload, { timeout: 20000 });
    return this.extractText(response.data);
  }

  /**
   * Sends prompt and context payload to Gemini API for grounded completion.
   * @returns {Promise<string>}
   */
  async generateAnswer(systemPrompt, userQuestion, formattedContext, language = 'en') {
    const isRealKey = this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && !this.apiKey.includes('your_');

    if (isRealKey) {
      const payload = this.buildPayload(systemPrompt, userQuestion, formattedContext, language);
      const keyPreview = this.apiKey.substring(0, 6) + '...' + this.apiKey.substring(this.apiKey.length - 4);

      // Try the configured model; if Google has retired it, retry once on a
      // current model so a stale .env doesn't silently disable the assistant.
      const attempts = this.model === DEFAULT_MODEL ? [this.model] : [this.model, DEFAULT_MODEL];
      for (let i = 0; i < attempts.length; i += 1) {
        const modelName = attempts[i];
        try {
          logger.info(`[GeminiService] generateContent | Model: ${modelName}${i > 0 ? ' (fallback)' : ''} | Key: ${keyPreview}`);
          const text = await this.callModel(modelName, payload);
          if (text) {
            if (i > 0) {
              logger.warn(`[GeminiService] Configured model "${this.model}" is unavailable; served "${modelName}". Update GEMINI_MODEL in backend/.env.`);
            }
            return text;
          }
          logger.warn(`[GeminiService] Model ${modelName} returned no text part.`);
        } catch (err) {
          const errorDetails = err.response?.data?.error?.message || err.message;
          const statusCode = err.response?.status || 'Network/Timeout';
          const retriable = i + 1 < attempts.length && (statusCode === 404 || RETIRED_MODEL_HINT.test(errorDetails));
          logger.warn(`[GeminiService] generateContent failed (HTTP ${statusCode}) on ${modelName}: ${errorDetails}.${retriable ? ' Retrying on ' + DEFAULT_MODEL + '.' : ' Falling back to internal grounded synthesizer.'}`);
          if (!retriable) break;
        }
      }
    }

    // Internal grounded response synthesizer when the key is absent, the model
    // is unavailable, or the API is rate-limited.
    return this.synthesizeGroundedFallback(userQuestion, formattedContext, language);
  }

  /**
   * Internal grounded fallback synthesizer when LLM API call is not available.
   * Extracts exact facts from retrieved context XML blocks.
   */
  synthesizeGroundedFallback(userQuestion, formattedContext, language) {
    if (!formattedContext || formattedContext === 'NO_CONTEXT_FOUND') {
      if (language === 'hi') {
        return "मुझे कृषिप्रवाह (KrishiFlow) के ज्ञान आधार (Knowledge Base) में इस प्रश्न का पर्याप्त उत्तर नहीं मिला।";
      }
      if (language === 'mr') {
        return "मला कृषीप्रवाह (KrishiFlow) च्या ज्ञान कोशात या प्रश्नाचे पुरेसे उत्तर मिळाले नाही.";
      }
      return "I couldn't find sufficient verified information in the KrishiFlow knowledge base to answer that.";
    }

    let extractedText = '';

    // Handle Live Market Data JSON
    if (formattedContext.includes('<live_market_data>')) {
      const marketMatch = formattedContext.match(/<live_market_data>([\s\S]*?)<\/live_market_data>/);
      if (marketMatch) {
        try {
          const data = JSON.parse(marketMatch[1].trim());
          if (data.records && data.records.length > 0) {
            const topRecord = data.records[0];
            const commodity = data.commodity || topRecord.commodity || 'Produce';
            const market = topRecord.marketName || data.requestedMarket || 'Mandi';
            const price = topRecord.ratePerKg || (topRecord.modalPricePerQuintal / 100);
            const date = topRecord.arrivalDate || data.latestArrivalDate;

            const isLive = data.isLiveGovtData !== false;
            const dateLabel = date || new Date().toISOString().split('T')[0];

            const commodityMrMap = { 'Onion': 'कांदा', 'Tomato': 'टोमॅटो', 'Potato': 'बटाटा', 'Wheat': 'गहू', 'Pomegranate': 'डाळिंब', 'Grapes': 'द्राक्ष', 'Maize': 'मका', 'Chilly Capsicum': 'मिरची' };
            const commodityHiMap = { 'Onion': 'प्याज', 'Tomato': 'टमाटर', 'Potato': 'आलू', 'Wheat': 'गेहूं', 'Pomegranate': 'अनार', 'Grapes': 'अंगूर', 'Maize': 'मक्का', 'Chilly Capsicum': 'मिर्च' };
            const commodityHi = commodityHiMap[commodity] || commodity;
            const commodityMr = commodityMrMap[commodity] || commodity;

            if (isLive) {
              if (language === 'hi') {
                extractedText += `आज ${market} मंडी में ${commodityHi} का सत्यापित लाइव भाव: ₹${price}/किग्रा (Modal Price: ₹${topRecord.modalPricePerQuintal}/क्विंटल, तारीख: ${dateLabel})। स्रोत: Agmarknet (data.gov.in)\n\n`;
              } else if (language === 'mr') {
                extractedText += `आज ${market} बाजारात ${commodityMr} चा पडताळलेला थेट भाव: ₹${price}/किग्रॅ (Modal Price: ₹${topRecord.modalPricePerQuintal}/क्विंटल, दिनांक: ${dateLabel}). स्रोत: Agmarknet (data.gov.in)\n\n`;
              } else {
                extractedText += `Today's live market rate for ${commodity} at ${market} Mandi is ₹${price}/kg (Modal Price: ₹${topRecord.modalPricePerQuintal}/quintal, Arrival Date: ${dateLabel}). Source: Government Agmarknet API (data.gov.in).\n\n`;
              }
            } else {
              if (language === 'hi') {
                extractedText += `कैश्ड / फ़ॉलबैक डेटा (तारीख: ${dateLabel}): ${market} मंडी में ${commodityHi} का दर: ₹${price}/किग्रा (Modal Price: ₹${topRecord.modalPricePerQuintal}/क्विंटal)।\n\n`;
              } else if (language === 'mr') {
                extractedText += `कॅश केलेला / फ़ॉलबॅक डेटा (दिनांक: ${dateLabel}): ${market} बाजारात ${commodityMr} चा दर: ₹${price}/किग्रॅ (Modal Price: ₹${topRecord.modalPricePerQuintal}/क्विंटल).\n\n`;
              } else {
                extractedText += `Cached / Fallback Data as of ${dateLabel}: Market rate for ${commodity} at ${market} Mandi is ₹${price}/kg (Modal Price: ₹${topRecord.modalPricePerQuintal}/quintal, Date: ${dateLabel}).\n\n`;
              }
            }
          }
        } catch (e) {
          logger.warn(`Failed to parse live market JSON in fallback: ${e.message}`);
        }
      }
    }

    // Handle User Registered Vehicles Data JSON
    if (formattedContext.includes('<user_vehicles_data>')) {
      const vehicleMatch = formattedContext.match(/<user_vehicles_data>([\s\S]*?)<\/user_vehicles_data>/);
      if (vehicleMatch) {
        try {
          const data = JSON.parse(vehicleMatch[1].trim());
          if (!data.success) {
            return language === 'mr' ? "तुमची वाहने पाहण्यासाठी वापरकर्ता प्रमाणीकरण आवश्यक आहे." : language === 'hi' ? "अपने पंजीकृत वाहन देखने के लिए लॉगिन आवश्यक है।" : "User authentication is required to view your registered vehicles.";
          }
          if (data.count === 0) {
            return language === 'mr'
              ? "तुमच्या कृषीप्रवाह खात्याशी **0 नोंदणीकृत वाहने** जोडलेली आहेत. तुम्ही फ्लीट व्यवस्थापन विभागातून नवीन वाहन जोडण्याची नोंदणी करू शकता."
              : language === 'hi'
              ? "आपके कृषिफ्लो खाते से **0 पंजीकृत वाहन** जुड़े हैं। आप फ्लीट प्रबंधन से नया वाहन जोड़ सकते हैं।"
              : "You currently have **0 registered vehicles** linked to your KrishiFlow account. You can register a new vehicle anytime from the Fleet Management tab.";
          }

          if (language === 'mr') {
            let vList = `तुमच्या मालकीची सध्या **${data.count} नोंदणीकृत वाहने** कृषीप्रवाह मध्ये उपलब्ध आहेत:\n\n`;
            data.vehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleNo}** (${v.vehicleType}, क्षमता: ${v.capacityKg} किग्रॅ, ड्रायव्हर: ${v.driverName || 'अपरिभाषित'}, स्थिती: ${v.status})\n`;
            });
            return vList;
          } else if (language === 'hi') {
            let vList = `आपके स्वामित्व वाले **${data.count} पंजीकृत वाहन** कृषिफ्लो में उपलब्ध हैं:\n\n`;
            data.vehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleNo}** (${v.vehicleType}, क्षमता: ${v.capacityKg} किग्रा, चालक: ${v.driverName || 'अपरिभाषित'}, स्थिति: ${v.status})\n`;
            });
            return vList;
          } else {
            let vList = `You currently own **${data.count} registered vehicle(s)** in KrishiFlow:\n\n`;
            data.vehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleNo}** (${v.vehicleType}, Capacity: ${v.capacityKg} kg, Driver: ${v.driverName || 'Unassigned'}, Status: ${v.status})\n`;
            });
            return vList;
          }
        } catch (e) {
          logger.warn(`Failed to parse user vehicles JSON in fallback: ${e.message}`);
        }
      }
    }

    // Handle User Trips Data JSON
    if (formattedContext.includes('<user_trips_data>')) {
      const tripMatch = formattedContext.match(/<user_trips_data>([\s\S]*?)<\/user_trips_data>/);
      if (tripMatch) {
        try {
          const data = JSON.parse(tripMatch[1].trim());
          if (!data.success) {
            return language === 'mr' ? "तुमच्या ट्रिप्स पाहण्यासाठी प्रमाणीकरण आवश्यक आहे." : language === 'hi' ? "आपकी ट्रिप देखने के लिए लॉगिन आवश्यक है।" : "User authentication is required to view your trip history.";
          }
          if (!data.trips || data.trips.length === 0) {
            return language === 'mr'
              ? "तुमच्या कृषीप्रवाह खात्यात सध्या **0 जुन्या ट्रिप्स** नोंदवलेल्या आहेत."
              : language === 'hi'
              ? "आपके कृषिफ्लो खाते में वर्तमान में **0 पुरानी ट्रिप** दर्ज हैं।"
              : "You currently have **0 completed or recorded trips** in your KrishiFlow trip history.";
          }

          if (language === 'mr') {
            let tList = `कृषीप्रवाह मधील तुमच्या जुन्या सहली (Trips) आणि उत्पन्नाचा तपशील:\n\n`;
            tList += `* **एकूण ट्रिप्स:** ${data.totalTrips}\n`;
            tList += `* **पूर्ण झालेल्या ट्रिप्स:** ${data.completedTripsCount}\n`;
            tList += `* **एकूण उत्पन्न / कमाई:** ₹${data.totalEarnings.toLocaleString('en-IN')}\n\n`;
            tList += `**सहलींचा तपशील:**\n`;
            data.trips.forEach((t, idx) => {
              tList += `${idx + 1}. **${t.cropType} माल (${t.quantityKg} किग्रॅ)** | मार्ग: ${t.origin} ➔ ${t.destination} | वाहन: ${t.vehicleNo} (ड्रायव्हर: ${t.driverName}, फोन: ${t.driverPhone}) | उत्पन्न: ₹${t.tripEarnings} | स्थिती: **${t.status}** (तारीख: ${t.pickupDate})\n`;
            });
            return tList;
          } else if (language === 'hi') {
            let tList = `कृषिफ्लो में आपकी पिछली यात्राओं (Trips) और कमाई का विवरण:\n\n`;
            tList += `* **कुल ट्रिप:** ${data.totalTrips}\n`;
            tList += `* **पूर्ण ट्रिप:** ${data.completedTripsCount}\n`;
            tList += `* **कुल कमाई:** ₹${data.totalEarnings.toLocaleString('en-IN')}\n\n`;
            tList += `**ट्रिप विवरण:**\n`;
            data.trips.forEach((t, idx) => {
              tList += `${idx + 1}. **${t.cropType} फसल (${t.quantityKg} किग्रा)** | रूट: ${t.origin} ➔ ${t.destination} | वाहन: ${t.vehicleNo} (चालक: ${t.driverName}, फोन: ${t.driverPhone}) | कमाई: ₹${t.tripEarnings} | स्थिति: **${t.status}** (तारीख: ${t.pickupDate})\n`;
            });
            return tList;
          } else {
            let tList = `Here are your recorded trip details and earnings in KrishiFlow:\n\n`;
            tList += `* **Total Trips:** ${data.totalTrips}\n`;
            tList += `* **Completed Trips:** ${data.completedTripsCount}\n`;
            tList += `* **Total Revenue / Freight Earnings:** ₹${data.totalEarnings.toLocaleString('en-IN')}\n\n`;
            tList += `**Trip Breakdown:**\n`;
            data.trips.forEach((t, idx) => {
              tList += `${idx + 1}. **${t.cropType} Cargo (${t.quantityKg} kg)** | Route: ${t.origin} ➔ ${t.destination} | Vehicle: ${t.vehicleNo} (Driver: ${t.driverName}, Ph: ${t.driverPhone}) | Earnings: ₹${t.tripEarnings} | Status: **${t.status}** (Date: ${t.pickupDate})\n`;
            });
            return tList;
          }
        } catch (e) {
          logger.warn(`Failed to parse user trips JSON in fallback: ${e.message}`);
        }
      }
    }

    // Handle Available Platform Vehicles Data JSON
    if (formattedContext.includes('<available_vehicles_data>')) {
      const availMatch = formattedContext.match(/<available_vehicles_data>([\s\S]*?)<\/available_vehicles_data>/);
      if (availMatch) {
        try {
          const data = JSON.parse(availMatch[1].trim());
          if (!data.availableVehicles || data.availableVehicles.length === 0) {
            return language === 'mr' ? "कृषीप्रवाह नेटवर्कवर सध्या कोणतीही वाहने उपलब्ध नाहीत." : language === 'hi' ? "नेटवर्क पर वर्तमान में कोई वाहन उपलब्ध नहीं हैं।" : "There are currently no active transport vehicles available in the KrishiFlow logistics network.";
          }

          if (language === 'mr') {
            let vList = `कृषीप्रवाह नेटवर्कवर उपलब्ध असलेली वाहतूक वाहने आणि त्यांचे दर:\n\n`;
            data.availableVehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleType}** (${v.vehicleNo}) | क्षमता: ${v.capacityKg} किग्रॅ | **भाडे दर:** ₹${v.ratePerKm}/किमी | बेस हब: ${v.baseLocation} | स्थिती: ${v.status} | ड्रायव्हर: ${v.driverName} (${v.driverPhone})\n`;
            });
            return vList;
          } else if (language === 'hi') {
            let vList = `कृषिफ्लो नेटवर्क पर उपलब्ध परिवहन वाहन और उनके दर:\n\n`;
            data.availableVehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleType}** (${v.vehicleNo}) | क्षमता: ${v.capacityKg} किग्रा | **भाड़ा दर:** ₹${v.ratePerKm}/किमी | बेस हब: ${v.baseLocation} | स्थिति: ${v.status} | चालक: ${v.driverName} (${v.driverPhone})\n`;
            });
            return vList;
          } else {
            let vList = `Here are the active logistics vehicles available for farm pickup and transport:\n\n`;
            data.availableVehicles.forEach((v, idx) => {
              vList += `${idx + 1}. **${v.vehicleType}** (${v.vehicleNo}) | Capacity: ${v.capacityKg} kg | **Freight Rate:** ₹${v.ratePerKm}/km | Base Hub: ${v.baseLocation} | Status: ${v.status} | Driver: ${v.driverName} (${v.driverPhone})\n`;
            });
            return vList;
          }
        } catch (e) {
          logger.warn(`Failed to parse available vehicles JSON in fallback: ${e.message}`);
        }
      }
    }

    // Any text already extracted above (e.g. the live market line) is kept and
    // the tool sections below append to it, so a "net profit" query still shows
    // the price line together with the spoilage estimate.
    const lead = () => (extractedText.trim() ? extractedText.trim() + '\n\n' : '');

    // Handle Price Forecast JSON
    if (formattedContext.includes('<price_forecast_data>')) {
      const m = formattedContext.match(/<price_forecast_data>([\s\S]*?)<\/price_forecast_data>/);
      if (m) {
        try {
          const d = JSON.parse(m[1].trim());
          const crop = d.commodity || 'crop';
          const rec = d.recommendation || d.ruleRecommendation || 'no clear call';
          const cur = d.currentPricePerKg;
          const f = d.forecast || {};
          const recMr = { SELL_NOW: 'आताच विका', SELL_SOON: 'एक-दोन दिवसांत विका', HOLD: 'घाई नाही', HOLD_STRONG: 'थांबा' };
          const recHi = { SELL_NOW: 'अभी बेचें', SELL_SOON: 'एक-दो दिन में बेचें', HOLD: 'जल्दी नहीं', HOLD_STRONG: 'रुकें' };
          let s;
          if (language === 'hi') {
            s = `${crop} — सुझाव: **${recHi[rec] || rec}**।\n`;
            if (cur) s += `• अभी का भाव: लगभग ₹${cur}/किग्रा\n`;
            if (f.available) s += `• मॉडल अनुमान: ${f.horizonPeriods} अवधि में ₹${f.predictedPricePerKg}/किग्रा (${f.changePct >= 0 ? '+' : ''}${f.changePct}%)\n`;
            else s += `• प्रशिक्षित मॉडल के पास इस फसल के लिए अभी भरोसेमंद अनुमान नहीं है; हाल के रुझान और नियम-आधारित सलाह पर भरोसा करें।\n`;
            s += `\nस्रोत: KrishiFlow मूल्य इंजन (XGBoost + नियम-आधारित स्कोरर)। यह सलाह है, गारंटी नहीं।`;
          } else if (language === 'mr') {
            s = `${crop} — सल्ला: **${recMr[rec] || rec}**.\n`;
            if (cur) s += `• सध्याचा भाव: सुमारे ₹${cur}/किग्रॅ\n`;
            if (f.available) s += `• मॉडेल अंदाज: ${f.horizonPeriods} कालावधींत ₹${f.predictedPricePerKg}/किग्रॅ (${f.changePct >= 0 ? '+' : ''}${f.changePct}%)\n`;
            else s += `• प्रशिक्षित मॉडेलकडे या पिकासाठी सध्या विश्वासार्ह अंदाज नाही; अलीकडचा कल आणि नियम-आधारित सल्ला पाहा.\n`;
            s += `\nस्रोत: KrishiFlow किंमत इंजिन (XGBoost + नियम-आधारित स्कोरर). हा सल्ला आहे, हमी नाही.`;
          } else {
            s = `${crop} — recommendation: **${rec}**.\n`;
            if (cur) s += `• Current price: about ₹${cur}/kg\n`;
            if (f.available) s += `• Model estimate: ₹${f.predictedPricePerKg}/kg over ${f.horizonPeriods} periods (${f.changePct >= 0 ? '+' : ''}${f.changePct}%)\n`;
            else s += `• The trained model has nothing reliable for this crop right now; go by the recent trend and the rule-based call.\n`;
            s += `\nSource: KrishiFlow price engine (XGBoost + rule-based scorer). This is guidance, not a guarantee.`;
          }
          return lead() + s;
        } catch (e) {
          logger.warn(`Failed to parse price_forecast JSON in fallback: ${e.message}`);
        }
      }
    }

    // Handle Transport Spoilage Risk JSON
    if (formattedContext.includes('<transport_risk_data>')) {
      const m = formattedContext.match(/<transport_risk_data>([\s\S]*?)<\/transport_risk_data>/);
      if (m) {
        try {
          const d = JSON.parse(m[1].trim());
          const a = d.assessment || {};
          const realTemp = d.weather?.temperatureC != null;
          const tC = realTemp ? d.weather.temperatureC : a.ambientTempC;
          const km = a.distanceKm;
          const hrs = a.transitHours;
          const open = a.openTruckSpoilagePct;
          const cold = a.refrigeratedSpoilagePct;
          const saveRs = a.refrigeratedSavingRupees;
          const crop = d.commodity || 'crop';
          const dAssumed = d.distanceAssumed;
          let s;
          if (language === 'hi') {
            s = `${tC}°C पर ${km} किमी (लगभग ${hrs} घंटे) के सफ़र में ${crop} की अनुमानित ख़राबी:\n\n`;
            s += `• खुले ट्रक में: लगभग ${open}%\n• ठंडी (रेफ्रिजरेटेड) गाड़ी में: लगभग ${cold}%\n`;
            if (saveRs) s += `• ठंडी गाड़ी से बचत: लगभग ₹${saveRs}\n`;
            if (dAssumed) s += `\n(दूरी नहीं बताई गई थी, इसलिए एक सामान्य ${km} किमी सफ़र माना गया है।)`;
            s += `\n\nस्रोत: KrishiFlow स्पॉयलेज मॉडल (Q10)${realTemp ? ' + Open-Meteo मौसम' : ''}।`;
          } else if (language === 'mr') {
            s = `${tC}°C तापमानात ${km} किमी (सुमारे ${hrs} तास) प्रवासात ${crop} ची अंदाजे नासाडी:\n\n`;
            s += `• उघड्या ट्रकमध्ये: सुमारे ${open}%\n• थंड (रेफ्रिजरेटेड) गाडीत: सुमारे ${cold}%\n`;
            if (saveRs) s += `• थंड गाडीमुळे बचत: सुमारे ₹${saveRs}\n`;
            if (dAssumed) s += `\n(अंतर दिलेले नव्हते, म्हणून नेहमीचा ${km} किमी प्रवास गृहीत धरला आहे.)`;
            s += `\n\nस्रोत: KrishiFlow स्पॉयलेज मॉडेल (Q10)${realTemp ? ' + Open-Meteo हवामान' : ''}.`;
          } else {
            s = `Estimated ${crop} spoilage over a ${km} km haul (about ${hrs} h) at ${tC}°C:\n\n`;
            s += `• Open truck: about ${open}%\n• Refrigerated van: about ${cold}%\n`;
            if (saveRs) s += `• A refrigerated van saves roughly ₹${saveRs}\n`;
            if (dAssumed) s += `\n(No distance was given, so a typical ${km} km haul is assumed.)`;
            s += `\n\nSource: KrishiFlow spoilage model (Q10)${realTemp ? ' + Open-Meteo weather' : ''}.`;
          }
          return lead() + s;
        } catch (e) {
          logger.warn(`Failed to parse transport_risk JSON in fallback: ${e.message}`);
        }
      }
    }

    // Handle RAG Document XML
    const docMatches = formattedContext.match(/<document[^>]*>([\s\S]*?)<\/document>/g) || [];
    if (docMatches.length > 0) {
      extractedText += docMatches.map(d => d.replace(/<\/?document[^>]*>/g, '').trim()).join('\n\n');
    }

    if (!extractedText.trim()) {
      if (language === 'hi') return "मुझे इस प्रश्न का पर्याप्त उत्तर नहीं मिला।";
      if (language === 'mr') return "मला या प्रश्नाचे पुरेसे उत्तर मिळाले नाही.";
      return "I couldn't find sufficient verified information to answer that.";
    }

    if (language === 'hi') {
      return `कृषिप्रवाह (KrishiFlow) ज्ञान आधार एवं मंडी डेटा उत्तर:\n\n${extractedText.substring(0, 700)}`;
    }
    if (language === 'mr') {
      return `कृषीप्रवाह (KrishiFlow) ज्ञान व बाजार दर माहितीनुसार उत्तर:\n\n${extractedText.substring(0, 700)}`;
    }

    return `Based on verified KrishiFlow data:\n\n${extractedText.substring(0, 700)}`;
  }
}

module.exports = new GeminiService();
