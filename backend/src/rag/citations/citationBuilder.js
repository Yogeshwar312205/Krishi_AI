class CitationBuilder {
  /**
   * Transforms array of retrieved chunks into structured, unique source citations.
   * @param {Array<object>} chunks 
   * @returns {Array<object>} array of unique citation objects
   */
  buildCitations(chunks, toolResult = null) {
    const citations = [];
    const seenKeys = new Set();

    if (toolResult && toolResult.success && toolResult.records?.length > 0) {
      citations.push({
        documentId: 'agmarknet-govt-feed',
        title: `Live Agmarknet Mandi Rates (${toolResult.commodity || 'Produce'})`,
        section: `${toolResult.requestedMarket || 'Maharashtra Mandis'} (Date: ${toolResult.latestArrivalDate})`,
        source: toolResult.source || 'data.gov.in / Agmarknet',
        url: 'https://data.gov.in',
        snippet: `Verified daily market price postings for ${toolResult.commodity} across ${toolResult.matchedRecordsCount} reporting markets.`
      });
      seenKeys.add('agmarknet-govt-feed');
    }

    if (toolResult && toolResult.toolUsed === 'getPriceForecast') {
      const f = toolResult.forecast || {};
      const section = f.available
        ? `${toolResult.commodity} · ${f.changePct >= 0 ? '+' : ''}${f.changePct}% over ${f.horizonPeriods} periods`
        : `${toolResult.commodity} · model output not available`;
      citations.push({
        documentId: 'krishiflow-price-forecast',
        title: `Price forecast & sell/hold call (${toolResult.commodity})`,
        section,
        source: toolResult.source || 'KrishiFlow price engine (XGBoost + rule-based scorer)',
        url: '/farmer/profit-calculator',
        snippet: `Recommendation: ${toolResult.recommendation || 'n/a'}. Current ₹${toolResult.currentPricePerKg || '?'}/kg. ${toolResult.engineStatus || ''}`.trim()
      });
      seenKeys.add('krishiflow-price-forecast');
    }

    if (toolResult && toolResult.toolUsed === 'getTransportSpoilageRisk' && toolResult.assessment) {
      const a = toolResult.assessment;
      citations.push({
        documentId: 'krishiflow-spoilage-model',
        title: `Spoilage estimate (${toolResult.commodity})`,
        section: `${a.distanceKm} km haul · ${a.transitHours} h · ${a.ambientTempC}°C`,
        source: toolResult.source || 'KrishiFlow spoilage model (Q10)',
        url: '/docs/farmer-guide',
        snippet: `Open truck ${a.openTruckSpoilagePct}% vs refrigerated ${a.refrigeratedSpoilagePct}%. Formula: ${a.formula}.`
      });
      seenKeys.add('krishiflow-spoilage-model');
    }

    if (Array.isArray(chunks) && chunks.length > 0) {
      chunks.forEach(chunk => {
        const key = `${chunk.documentId}-${chunk.section}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          citations.push({
            documentId: chunk.documentId || 'krishiflow-doc',
            title: chunk.title || 'KrishiFlow Knowledge Base',
            section: chunk.section || 'General',
            source: chunk.source || 'krishiflow-docs',
            url: chunk.url || '/docs',
            snippet: chunk.content ? chunk.content.substring(0, 150) + '...' : ''
          });
        }
      });
    }

    return citations;
  }
}

module.exports = new CitationBuilder();
