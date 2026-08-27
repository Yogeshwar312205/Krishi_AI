const axios = require('axios');
const logger = require('../../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Sends prompt and context payload to Gemini API for grounded completion.
   * @param {string} systemPrompt 
   * @param {string} userQuestion 
   * @param {string} formattedContext 
   * @param {string} language 
   * @returns {Promise<string>}
   */
  async generateAnswer(systemPrompt, userQuestion, formattedContext, language = 'en') {
    const isRealKey = this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && !this.apiKey.includes('your_');

    if (isRealKey) {
      try {
        const modelName = (this.model || 'gemini-1.5-flash').replace(/^models\//, '');
        const keyPreview = this.apiKey.substring(0, 6) + '...' + this.apiKey.substring(this.apiKey.length - 4);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        
        logger.info(`[GeminiService] Calling Gemini REST API | Model: ${modelName} | Endpoint: v1beta | KeyPreview: ${keyPreview}`);

        const url = `${endpoint}?key=${this.apiKey}`;
        
        const langDirective = language === 'mr'
          ? "CRITICAL MANDATORY LANGUAGE DIRECTIVE: The user asked in MARATHI (मराठी). You MUST write your ENTIRE response strictly in MARATHI (मराठी in Devanagari script). Do NOT reply in English or Hindi!"
          : language === 'hi'
          ? "CRITICAL MANDATORY LANGUAGE DIRECTIVE: The user asked in HINDI (हिंदी). You MUST write your ENTIRE response strictly in HINDI (हिंदी in Devanagari script). Do NOT reply in English or Marathi!"
          : "Respond in English.";

        const payload = {
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
            temperature: 0.2, // Low temperature for high factual grounding
            maxOutputTokens: 800
          }
        };

        const response = await axios.post(url, payload, { timeout: 12000 });

        const candidates = response.data?.candidates;
        if (candidates && candidates.length > 0) {
          const text = candidates[0].content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err) {
        const errorDetails = err.response?.data?.error?.message || err.message;
        const statusCode = err.response?.status || 'Network/Timeout';
        logger.warn(`[GeminiService] Gemini API generateContent failed (HTTP ${statusCode}): ${errorDetails}. Falling back to internal grounded synthesizer.`);
      }
    }

    // High-precision internal grounded response synthesizer when API Key is absent or rate-limited
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
