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
