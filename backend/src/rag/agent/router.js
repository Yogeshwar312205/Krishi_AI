const toolRegistry = require('../tools/toolRegistry');
const retriever = require('../retrieval/retriever');
const queryRewriter = require('./queryRewriter');
const logger = require('../../utils/logger');

class Router {
  /**
   * Routes intent to tool execution, RAG retrieval, or combined context builder.
   * @param {object} processedQuery - Output from queryProcessor
   * @param {string} intent - Classified intent
   * @param {object} user - Authenticated JWT user object
   */
  async route(processedQuery, intent, user) {
    const { cleanQuery, entities, language } = processedQuery;
    const marketTool = toolRegistry.getTool('getLiveMandiPrices');

    // Path A: Pure Live Market Data Query
    if (intent === 'LIVE_MARKET_PRICE') {
      logger.info(`[Router] Routing to Live Market Data Tool for: ${entities.commodity || 'Onion'} / ${entities.market || 'All'}`);
      const toolResult = await marketTool.execute({
        commodity: entities.commodity || 'Onion',
        market: entities.market,
        marketObj: entities.marketObj,
        state: entities.state || 'Maharashtra',
        language
      });

      const resolvedSource = toolResult.dataSource || (toolResult.isLiveGovtData !== false ? 'data.gov.in / Agmarknet' : 'cached');

      return {
        mode: 'TOOL_ONLY',
        toolResult,
        ragChunks: [],
        toolUsed: 'getLiveMandiPrices',
        dataSource: resolvedSource
      };
    }

    // Path A2: User Personal Fleet Data Query (MongoDB)
    if (intent === 'USER_VEHICLES') {
      logger.info(`[Router] Routing to User Personal Fleet Database Tool`);
      const userVehicleTool = toolRegistry.getTool('getUserVehicles');
      const toolResult = await userVehicleTool.execute({ user });

      return {
        mode: 'TOOL_ONLY',
        toolResult,
        ragChunks: [],
        toolUsed: 'getUserVehicles',
        dataSource: 'KrishiFlow Personal Fleet Database'
      };
    }

    // Path A3: User Past Trips & Driver History Query (MongoDB)
    if (intent === 'USER_TRIPS') {
      logger.info(`[Router] Routing to User Past Trips Database Tool`);
      const userTripsTool = toolRegistry.getTool('getUserTrips');
      const toolResult = await userTripsTool.execute({ user });

      return {
        mode: 'TOOL_ONLY',
        toolResult,
        ragChunks: [],
        toolUsed: 'getUserTrips',
        dataSource: 'KrishiFlow Trip & Dispatch Database'
      };
    }

    // Path A4: Available Platform Vehicles & Rates Query (MongoDB)
    if (intent === 'AVAILABLE_FLEET') {
      logger.info(`[Router] Routing to Available Platform Fleet Database Tool`);
      const availableVehiclesTool = toolRegistry.getTool('getAvailableVehicles');
      const toolResult = await availableVehiclesTool.execute({ user });

      return {
        mode: 'TOOL_ONLY',
        toolResult,
        ragChunks: [],
        toolUsed: 'getAvailableVehicles',
        dataSource: 'KrishiFlow Platform Fleet Database'
      };
    }

    // Path A5: Crop Spoilage / Weather Risk in Transit
    if (intent === 'TRANSPORT_RISK') {
      logger.info(`[Router] Routing to Transport Spoilage Risk Tool for: ${entities.commodity || 'Tomato'}`);
      const spoilageTool = toolRegistry.getTool('getTransportSpoilageRisk');
      const kmMatch = cleanQuery.match(/(\d{2,4})\s*(?:km|kms|kilomet|किमी|किलोमीटर)/i);
      const toolResult = await spoilageTool.execute({
        commodity: entities.commodity || 'Tomato',
        distanceKm: kmMatch ? Number(kmMatch[1]) : undefined,
        user,
        language,
      });

      // Pull in the farmer guide's spoilage section so the model can pair the
      // numbers with the platform's own explanation of how they are used.
      const { searchString } = queryRewriter.rewrite(
        `crop spoilage transit refrigerated van net profit after spoilage ${cleanQuery}`,
        intent,
      );
      const ragResult = await retriever.retrieve(searchString, user, { topicFilter: 'FARMER_WORKFLOW' });

      return {
        mode: 'COMBINED',
        toolResult,
        ragChunks: ragResult.chunks || [],
        toolUsed: 'getTransportSpoilageRisk',
        dataSource: 'KrishiFlow Spoilage Model + Knowledge Base',
        retrievalStats: ragResult,
      };
    }

    // Path A6: Price Forecast / "sell now or wait"
    if (intent === 'PRICE_FORECAST') {
      logger.info(`[Router] Routing to Price Forecast Tool for: ${entities.commodity || 'Tomato'}`);
      const forecastTool = toolRegistry.getTool('getPriceForecast');
      const toolResult = await forecastTool.execute({
        commodity: entities.commodity || 'Tomato',
        market: entities.market,
        user,
        language,
      });

      const { searchString } = queryRewriter.rewrite(
        `price forecast sell now or wait trained XGBoost model weather momentum ${cleanQuery}`,
        intent,
      );
      const ragResult = await retriever.retrieve(searchString, user, { topicFilter: 'FARMER_WORKFLOW' });

      return {
        mode: 'COMBINED',
        toolResult,
        ragChunks: ragResult.chunks || [],
        toolUsed: 'getPriceForecast',
        dataSource: 'KrishiFlow Price Forecast + Knowledge Base',
        retrievalStats: ragResult,
      };
    }

    // Path B: Combined Query (Live Data + RAG Rules)
    if (intent === 'COMBINED' || (intent === 'PROFIT_CALCULATION' && entities.commodity)) {
      logger.info(`[Router] Routing to COMBINED execution (Live Tool + RAG Retrieval)`);
      const toolResult = await marketTool.execute({
        commodity: entities.commodity || 'Onion',
        market: entities.market,
        marketObj: entities.marketObj,
        state: entities.state || 'Maharashtra',
        language
      });

      const { searchString, topicFilter } = queryRewriter.rewrite(cleanQuery, intent);
      const ragResult = await retriever.retrieve(searchString, user, { topicFilter });

      // A "net profit" answer has to account for spoilage the same way the
      // Prices screen does, so pull the Q10 estimate in as extra context.
      let extraContext = '';
      try {
        const spoilageTool = toolRegistry.getTool('getTransportSpoilageRisk');
        const kmMatch = cleanQuery.match(/(\d{2,4})\s*(?:km|kms|kilomet|किमी|किलोमीटर)/i);
        const risk = await spoilageTool.execute({
          commodity: entities.commodity || 'Onion',
          distanceKm: kmMatch ? Number(kmMatch[1]) : undefined,
          user,
          language,
        });
        if (risk?.success) {
          extraContext = `<transport_risk_data>\n${JSON.stringify(risk, null, 2)}\n</transport_risk_data>`;
        }
      } catch (err) {
        logger.warn(`[Router] spoilage enrichment skipped: ${err.message}`);
      }

      const resolvedSource = toolResult.isLiveGovtData !== false ? 'data.gov.in + Knowledge Base' : 'fallback + Knowledge Base';

      return {
        mode: 'COMBINED',
        toolResult,
        ragChunks: ragResult.chunks || [],
        toolUsed: 'getLiveMandiPrices',
        dataSource: resolvedSource,
        retrievalStats: ragResult,
        extraContext,
      };
    }

    // Path C: RAG Knowledge Query (Vehicle Registration, Farmer, Technical, General Knowledge)
    logger.info(`[Router] Routing to RAG Knowledge Retrieval for intent: ${intent}`);
    const { searchString, topicFilter } = queryRewriter.rewrite(cleanQuery, intent);
    const ragResult = await retriever.retrieve(searchString, user, { topicFilter });

    return {
      mode: 'RAG_ONLY',
      toolResult: null,
      ragChunks: ragResult.chunks || [],
      toolUsed: null,
      dataSource: 'KrishiFlow Knowledge Base',
      retrievalStats: ragResult
    };
  }
}

module.exports = new Router();
