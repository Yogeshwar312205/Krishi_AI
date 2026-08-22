class Reranker {
  constructor() {
    this.minThreshold = parseFloat(process.env.RAG_RELEVANCE_THRESHOLD || '0.48');
  }

  /**
   * Filters and ranks candidate chunks, enforcing min threshold.
   * @param {Array<object>} candidates 
   * @param {number} topK 
   * @returns {{ chunks: Array<object>, meetsThreshold: boolean, maxScore: number }}
   */
  rerank(candidates, topK = 5) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { chunks: [], meetsThreshold: false, maxScore: 0 };
    }

    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const maxScore = sorted[0]?.score || 0;

    const filtered = sorted.filter(c => c.score >= this.minThreshold).slice(0, topK);

    return {
      chunks: filtered,
      meetsThreshold: filtered.length > 0 && maxScore >= this.minThreshold,
      maxScore
    };
  }
}

module.exports = new Reranker();
