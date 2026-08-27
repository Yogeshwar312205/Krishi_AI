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

      const resolvedSource = toolResult.isLiveGovtData !== false ? 'data.gov.in + Knowledge Base' : 'fallback + Knowledge Base';

      return {
        mode: 'COMBINED',
        toolResult,
        ragChunks: ragResult.chunks || [],
        toolUsed: 'getLiveMandiPrices',
        dataSource: resolvedSource,
        retrievalStats: ragResult
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
