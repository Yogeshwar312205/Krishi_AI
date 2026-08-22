const { getAgmarknetLivePrices } = require('../../services/agmarknetService');
const marketResolver = require('../agent/marketResolver');
const logger = require('../../utils/logger');

class MarketTool {
  constructor() {
    this.name = 'getLiveMandiPrices';
    this.description = 'Fetches verified real-time mandi prices from Government of India Agmarknet feed.';
  }

  /**
   * Executes live market query.
   * @param {object} params - { commodity, market, marketObj, state, language }
   */
  async execute(params = {}) {
    const commodity = params.commodity || 'Onion';
    const rawMarketFilter = params.market || '';
    const stateFilter = params.state || 'Maharashtra';
    const language = params.language || 'en';

    // Resolve market terms via marketResolver if available
    const resolvedMarket = params.marketObj || (rawMarketFilter ? marketResolver.resolveMarket(rawMarketFilter) : null);
    const searchTerms = resolvedMarket ? resolvedMarket.searchTerms : (rawMarketFilter ? [rawMarketFilter.toLowerCase()] : []);
    const canonicalMarketName = resolvedMarket ? resolvedMarket.canonicalName : rawMarketFilter;

    try {
      const data = await getAgmarknetLivePrices(commodity, stateFilter);

      const isLive = data.isLiveGovtData !== false;
      const dataSourceLabel = isLive ? 'data.gov.in / Agmarknet (Live)' : 'cached';
      const sourceName = isLive ? 'Govt Agmarknet API (data.gov.in)' : 'KrishiFlow Mandi Intelligence (Cached / Fallback)';

      if (!data.records || data.records.length === 0) {
        let msg = `I couldn't find verified ${commodity} price data for ${canonicalMarketName || stateFilter} APMC.`;
        if (language === 'hi') msg = `मुझे ${canonicalMarketName || stateFilter} APMC मंडी में ${commodity} का सत्यापित मूल्य डेटा नहीं मिला।`;
        if (language === 'mr') msg = `मला ${canonicalMarketName || stateFilter} APMC बाजारात ${commodity} चा पडताळलेला भाव डेटा मिळाला नाही.`;

        return {
          success: false,
          toolUsed: this.name,
          source: sourceName,
          dataSource: dataSourceLabel,
          isLiveGovtData: isLive,
          commodity,
          requestedMarket: canonicalMarketName || 'All',
          state: stateFilter,
          message: msg,
          records: []
        };
      }

      let filteredRecords = data.records;

      if (rawMarketFilter) {
        filteredRecords = data.records.filter(r => 
          marketResolver.matchesMarket(r.mandi, r.district, searchTerms)
        );

        // Strict Validation: Explicit User Market MUST NOT fall back to other markets
        if (filteredRecords.length === 0) {
          let notFoundMsg = `I couldn't find verified ${commodity} price data for ${canonicalMarketName || rawMarketFilter} APMC.`;
          if (language === 'hi') notFoundMsg = `मुझे ${canonicalMarketName || rawMarketFilter} APMC मंडी में ${commodity} का सत्यापित मूल्य डेटा नहीं मिला।`;
          if (language === 'mr') notFoundMsg = `मला ${canonicalMarketName || rawMarketFilter} APMC बाजारात ${commodity} चा पडताळलेला भाव डेटा मिळाला नाही।`;

          return {
            success: false,
            toolUsed: this.name,
            source: sourceName,
            dataSource: dataSourceLabel,
            isLiveGovtData: isLive,
            commodity,
            requestedMarket: canonicalMarketName || rawMarketFilter,
            message: notFoundMsg,
            records: []
          };
        }
      }

      // If no market specified, return top state records (e.g. top 5)
      const recordsToReturn = rawMarketFilter ? filteredRecords : data.records.slice(0, 5);

      return {
        success: true,
        toolUsed: this.name,
        source: sourceName,
        dataSource: dataSourceLabel,
        isLiveGovtData: isLive,
        commodity,
        requestedMarket: canonicalMarketName || 'All',
        matchedRecordsCount: recordsToReturn.length,
        latestArrivalDate: data.latestArrivalDate || new Date().toISOString().split('T')[0],
        records: recordsToReturn.map(r => ({
          marketName: r.mandi,
          district: r.district,
          state: r.state,
          commodity: r.commodity,
          modalPricePerQuintal: r.modalPricePerQuintal,
          ratePerKg: r.rate,
          minPricePerQuintal: r.minPricePerQuintal,
          maxPricePerQuintal: r.maxPricePerQuintal,
          arrivalDate: r.arrivalDate
        }))
      };
    } catch (err) {
      logger.error(`[MarketTool] Government API fetch failed: ${err.message}`);
      return {
        success: false,
        toolUsed: this.name,
        source: 'KrishiFlow Mandi Intelligence (Cached / Fallback)',
        dataSource: 'fallback',
        isLiveGovtData: false,
        commodity,
        error: err.message,
        records: []
      };
    }
  }
}

module.exports = new MarketTool();
