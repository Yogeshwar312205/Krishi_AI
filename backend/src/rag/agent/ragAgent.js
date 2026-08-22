const queryProcessor = require('./queryProcessor');
const intentClassifier = require('./intentClassifier');
const router = require('./router');
const sessionManager = require('./sessionManager');
const promptInjection = require('../security/promptInjection');
const outputGuard = require('../security/outputGuard');
const geminiService = require('../service/geminiService');
const citationBuilder = require('../citations/citationBuilder');
const logger = require('../../utils/logger');
const { SYSTEM_PROMPT } = require('./prompts');

class RAGAgent {
  /**
   * Main Agent entry point.
   * Processes query through language detection, intent classification, multi-turn session tracking, query routing, tool execution/RAG retrieval, Gemini generation, and output guardrails.
   * @param {string} userMessage 
   * @param {object} user - Authenticated JWT user object (req.user)
   * @param {string} conversationId 
   */
  async processQuery(userMessage, user, conversationId = null) {
    const startTime = Date.now();

    // 1. Sanitize & Defense
    const cleanQuery = promptInjection.sanitizeUserInput(userMessage);
    if (!cleanQuery || cleanQuery.length < 2) {
      return {
        answer: "Please ask a valid question about KrishiFlow.",
        language: 'en',
        intent: 'UNKNOWN',
        dataSource: 'none',
        grounded: true,
        sources: [],
        toolUsed: null
      };
    }

    // 2. Query Processor (Language & Entity Extraction)
    let processedQuery = queryProcessor.process(cleanQuery);

    // Initial Intent Detection before session context merge
    const initialIntent = intentClassifier.classify(cleanQuery, processedQuery.entities);

    // Multi-turn Conversation Context Management (Enforce zero state leakage)
    const effectiveConvId = conversationId || (user ? String(user._id || user.id) : null);
    if (effectiveConvId) {
      processedQuery = sessionManager.applyContext(effectiveConvId, {
        ...processedQuery,
        cleanQuery
      }, initialIntent);
    }

    const { language, entities } = processedQuery;

    // Final Intent Classification with merged entities
    const intent = intentClassifier.classify(cleanQuery, entities);
    logger.info(`[RAGAgent] Query: "${cleanQuery}" | Lang: ${language} | Intent: ${intent} | Entities: ${JSON.stringify(entities)} | ConvId: ${effectiveConvId}`);

    // Clarification Handling: If market specified but no commodity available in current turn or session history
    if ((intent === 'LIVE_MARKET_PRICE' || entities.market) && !entities.commodity && entities.market) {
      let clarifyMsg = `Which commodity would you like price data for in ${entities.market} APMC? (e.g. Onion, Tomato, Potato, Wheat)`;
      if (language === 'hi') clarifyMsg = `आप ${entities.market} APMC में किस फसल का भाव जानना चाहते हैं? (जैसे प्याज, टमाटर, आलू, गेहूं)`;
      if (language === 'mr') clarifyMsg = `तुम्हाला ${entities.market} APMC बाजारात कोणत्या पिकाचा भाव हवा आहे? (उदा. कांदा, टोमॅटो, बटाटा, गहू)`;

      return {
        answer: clarifyMsg,
        language,
        intent,
        dataSource: 'none',
        grounded: true,
        sources: [],
        toolUsed: null
      };
    }

    // Update Session Context for subsequent follow-up turns
    if (effectiveConvId) {
      sessionManager.updateSession(effectiveConvId, {
        commodity: entities.commodity,
        market: entities.market,
        marketObj: entities.marketObj,
        intent,
        language
      });
    }

    // 4. Router Execution
    const routeResult = await router.route(processedQuery, intent, user);
    const { mode, toolResult, ragChunks, toolUsed, dataSource } = routeResult;

    let rawAnswer = '';

    // Path A: Pure Live Data Tool / DB Tool
    if (mode === 'TOOL_ONLY') {
      if (toolUsed === 'getUserVehicles') {
        const toolContext = `<user_vehicles_data>\n${JSON.stringify(toolResult, null, 2)}\n</user_vehicles_data>`;
        rawAnswer = await geminiService.generateAnswer(
          SYSTEM_PROMPT,
          cleanQuery,
          toolContext,
          language
        );
      } else {
        if (!toolResult.success || !toolResult.records || toolResult.records.length === 0) {
          let emptyMsg = toolResult.message;
          if (!emptyMsg) {
            emptyMsg = `I couldn't find verified ${entities.commodity || 'crop'} price data for ${entities.market || 'this region'} APMC.`;
            if (language === 'hi') emptyMsg = `मुझे ${entities.market || 'इस क्षेत्र'} APMC मंडी में ${entities.commodity || 'इस फसल'} का सत्यापित मूल्य डेटा नहीं मिला।`;
            if (language === 'mr') emptyMsg = `मला ${entities.market || 'या बाजारात'} APMC ${entities.commodity || 'या पिकाचा'} पडताळलेला भाव डेटा मिळाला नाही.`;
          }
          
          return {
            answer: emptyMsg,
            language,
            intent,
            dataSource,
            grounded: true,
            sources: [],
            toolUsed
          };
        }

        // Format Tool XML context for Gemini
        const toolContext = `<live_market_data>\n${JSON.stringify(toolResult, null, 2)}\n</live_market_data>`;
        rawAnswer = await geminiService.generateAnswer(
          SYSTEM_PROMPT,
          cleanQuery,
          toolContext,
          language
        );
      }
    } 
    // Path B: Combined (Live Data + RAG Knowledge Rules)
    else if (mode === 'COMBINED') {
      if (!toolResult?.success && ragChunks.length === 0) {
        let emptyMsg = toolResult?.message || `I couldn't find verified ${entities.commodity || 'crop'} price or transport data for ${entities.market || 'this region'} APMC.`;
        return {
          answer: emptyMsg,
          language,
          intent,
          dataSource,
          grounded: true,
          sources: [],
          toolUsed
        };
      }

      const ragContextStr = ragChunks.length > 0 ? promptInjection.formatSecureContext(ragChunks) : 'NO_RAG_CONTEXT';
      const toolContextStr = toolResult?.success ? `<live_market_data>\n${JSON.stringify(toolResult, null, 2)}\n</live_market_data>` : '';
      const combinedContext = `${toolContextStr}\n\n${ragContextStr}`;

      rawAnswer = await geminiService.generateAnswer(
        SYSTEM_PROMPT,
        cleanQuery,
        combinedContext,
        language
      );
    } 
    // Path C: Pure RAG Knowledge Query
    else {
      if (!ragChunks || ragChunks.length === 0) {
        let refusalMsg = "I couldn't find enough verified information in the KrishiFlow knowledge base to answer that.";
        if (language === 'hi') refusalMsg = "मुझे कृषिप्रवाह (KrishiFlow) के ज्ञान आधार में इस प्रश्न का पर्याप्त उत्तर नहीं मिला।";
        if (language === 'mr') refusalMsg = "मला कृषीप्रवाह (KrishiFlow) च्या ज्ञान कोशात या प्रश्नाचे पुरेसे उत्तर मिळाले नाही.";

        return {
          answer: refusalMsg,
          language,
          intent,
          dataSource,
          grounded: true,
          sources: [],
          toolUsed: null
        };
      }

      const formattedContext = promptInjection.formatSecureContext(ragChunks);
      rawAnswer = await geminiService.generateAnswer(
        SYSTEM_PROMPT,
        cleanQuery,
        formattedContext,
        language
      );
    }

    // 5. Output Security Guardrail (Scrub secrets)
    let sanitizedAnswer = outputGuard.sanitizeAnswer(rawAnswer);

    // 5b. Strict Market Validation Guardrail (Ensure REQUESTED MARKET = RESPONSE MARKET)
    if ((intent === 'LIVE_MARKET_PRICE' || intent === 'COMBINED') && (entities.market || toolResult?.requestedMarket)) {
      const targetMarket = toolResult?.requestedMarket || entities.market;
      const searchTerms = entities.marketObj?.searchTerms || [targetMarket.toLowerCase()];
      const answerLower = sanitizedAnswer.toLowerCase();
      
      const marketCheckList = [
        { name: 'Deola', terms: ['deola', 'devala', 'devla', 'देवळा', 'देवला'] },
        { name: 'Lasalgaon', terms: ['lasalgaon', 'लासलगाव'] },
        { name: 'Pimpalgaon Baswant', terms: ['pimpalgaon', 'पिंपळगाव'] },
        { name: 'Kalwan', terms: ['kalwan', 'kalvan', 'कळवण', 'कलवण'] },
        { name: 'Nashik', terms: ['nashik', 'nasik', 'नाशिक'] },
        { name: 'Mumbai APMC', terms: ['vashi', 'mumbai', 'वाशी', 'मुंबई'] },
        { name: 'Pune APMC', terms: ['pune', 'पुणे'] },
        { name: 'Solapur APMC', terms: ['solapur', 'सोलापूर'] }
      ];

      // Detect if answer contains any unrequested market with word boundaries
      const hasMarketMismatch = marketCheckList.some(mItem => {
        const isMentionedInAnswer = mItem.terms.some(t => {
          const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:^|\\s|\\b)${escaped}(?:$|\\s|\\b)`, 'i');
          return regex.test(answerLower);
        });
        const isTargetMarket = searchTerms.some(st => 
          mItem.terms.some(t => t.toLowerCase() === st.toLowerCase())
        );
        return isMentionedInAnswer && !isTargetMarket;
      });

      if (hasMarketMismatch) {
        logger.warn(`[RAGAgent Guardrail] Market Mismatch Detected! User requested: "${targetMarket}", but answer contained unrequested market mention. Overriding with strict backend response.`);
        
        if (toolResult && toolResult.success && toolResult.records && toolResult.records.length > 0) {
          const top = toolResult.records[0];
          const isLive = toolResult.isLiveGovtData !== false;
          const dateLabel = top.arrivalDate || toolResult.latestArrivalDate || new Date().toISOString().split('T')[0];
          const rateKg = top.ratePerKg || (top.modalPricePerQuintal / 100);

          if (isLive) {
            sanitizedAnswer = `Today's live market rate for ${entities.commodity || top.commodity || 'produce'} at ${targetMarket} Mandi is ₹${rateKg}/kg (Modal Price: ₹${top.modalPricePerQuintal}/quintal, Arrival Date: ${dateLabel}). Source: Government Agmarknet API (data.gov.in).`;
          } else {
            sanitizedAnswer = `Cached / Fallback Data as of ${dateLabel}: Market rate for ${entities.commodity || top.commodity || 'produce'} at ${targetMarket} Mandi is ₹${rateKg}/kg (Modal Price: ₹${top.modalPricePerQuintal}/quintal, Date: ${dateLabel}).`;
          }
        } else {
          sanitizedAnswer = toolResult?.message || `I couldn't find verified ${entities.commodity || 'crop'} price data for ${targetMarket} APMC.`;
        }
      }
    }

    // 6. Build Citations
    const citations = citationBuilder.buildCitations(ragChunks, toolResult);

    const duration = Date.now() - startTime;
    logger.info(`[RAGAgent] Completed in ${duration}ms | Intent: ${intent} | Sources: ${citations.length}`);

    return {
      answer: sanitizedAnswer,
      language,
      intent,
      dataSource,
      grounded: true,
      sources: citations,
      toolUsed
    };
  }
}

module.exports = new RAGAgent();
