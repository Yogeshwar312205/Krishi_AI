class HybridSearch {
  /**
   * Computes keyword overlap score between query and chunk content.
   * @param {string} query 
   * @param {object} chunk 
   * @returns {number} keyword score in range [0, 1]
   */
  computeKeywordScore(query, chunk) {
    if (!query || !chunk || !chunk.content) return 0;

    const queryTokens = query.toLowerCase().match(/[\w\u0900-\u097F]+/g) || [];
    if (queryTokens.length === 0) return 0;

    const textToMatch = `${chunk.title} ${chunk.section} ${chunk.content}`.toLowerCase();
    
    let matches = 0;
    for (const token of queryTokens) {
      if (token.length > 2 && textToMatch.includes(token)) {
        matches += 1;
      }
    }

    return matches / queryTokens.length;
  }

  /**
   * Combines vector search results with keyword match scoring.
   * @param {Array<object>} vectorResults 
   * @param {string} rawQuery 
   * @param {number} vectorWeight default 0.7 
   * @param {number} keywordWeight default 0.3
   */
  mergeAndRank(vectorResults, rawQuery, vectorWeight = 0.7, keywordWeight = 0.3) {
    if (!Array.isArray(vectorResults)) return [];

    const scoredList = vectorResults.map(item => {
      const vecScore = item.score || 0;
      const kwScore = this.computeKeywordScore(rawQuery, item);
      const combinedScore = (vecScore * vectorWeight) + (kwScore * keywordWeight);

      return {
        ...item,
        score: parseFloat(combinedScore.toFixed(4)),
        vectorScore: vecScore,
        keywordScore: kwScore
      };
    });

    // Sort descending by combined score
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList;
  }
}

module.exports = new HybridSearch();
