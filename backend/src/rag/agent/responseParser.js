class ResponseParser {
  /**
   * Formats answer payload with sources and metadata
   */
  formatResponse(answerText, language, citations, retrievalStats = {}) {
    return {
      answer: answerText || "I couldn't process an answer at this time.",
      language: language || 'en',
      sources: citations || [],
      retrieval: {
        chunksRetrieved: retrievalStats.chunksRetrieved || 0,
        maxRelevanceScore: retrievalStats.maxScore || 0,
        meetsThreshold: retrievalStats.meetsThreshold !== false,
        userRole: retrievalStats.userRole || 'farmer'
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new ResponseParser();
