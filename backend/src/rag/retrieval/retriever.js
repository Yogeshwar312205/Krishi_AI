const embeddingService = require('../embeddings/embeddingService');
const { mongoVectorStore } = require('../vectorStore/mongoVectorStore');
const mockVectorStore = require('../vectorStore/mockVectorStore');
const accessFilter = require('../security/accessFilter');
const hybridSearch = require('./hybridSearch');
const reranker = require('./reranker');
const logger = require('../../utils/logger');

class Retriever {
  /**
   * Detects user query language: 'hi' (Hindi), 'mr' (Marathi), or 'en' (English).
   * @param {string} text 
   * @returns {string} 'en' | 'hi' | 'mr'
   */
  detectLanguage(text) {
    if (!text) return 'en';

    // Check for Devanagari script characters (\u0900 - \u097F)
    const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    if (devanagariCount > 0) {
      // Check for distinctive Marathi keywords vs Hindi
      const marathiWords = ['नफा', 'कसा', 'आहे', 'काय', 'गाडी', 'शेतकरी', 'बाजार'];
      const textLower = text.toLowerCase();
      const isMarathi = marathiWords.some(w => textLower.includes(w));
      return isMarathi ? 'mr' : 'hi';
    }

    return 'en';
  }

  /**
   * Translates common Hindi/Marathi Devanagari terms to English keywords for cross-lingual vector/hybrid search.
   * @param {string} text 
   * @returns {string}
   */
  normalizeQueryText(text) {
    if (!text) return '';
    let normalized = text;

    const termMap = {
      'नफा': 'profit net revenue',
      'कसा': 'how calculate',
      'गणना': 'calculate formula equation',
      'शेतकरी': 'farmer',
      'किसान': 'farmer',
      'बाजार': 'mandi market rate',
      'दर': 'board rate price',
      'गाडी': 'vehicle transport truck fleet',
      'ड्रायव्हर': 'driver logistics'
    };

    for (const [key, val] of Object.entries(termMap)) {
      if (normalized.includes(key)) {
        normalized += ' ' + val;
      }
    }

    return normalized;
  }

  /**
   * Performs end-to-end retrieval for a user question.
   * @param {string} query 
   * @param {object} user 
   * @param {object} options 
   */
  async retrieve(query, user, options = {}) {
    const topK = parseInt(process.env.RAG_TOP_K || '5', 10);
    const language = this.detectLanguage(query);
    const searchQuery = this.normalizeQueryText(query);

    // 1. Generate query embedding
    const { vector: queryVector } = await embeddingService.generateEmbedding(searchQuery);

    // 2. Fetch candidates from vector store with user role permissions
    const normalizedRole = accessFilter.normalizeRole(user?.role);
    const vectorCandidates = await mongoVectorStore.search(queryVector, {
      topK: 15,
      filter: { userRole: normalizedRole }
    });

    // 3. Strict RBAC authorization filter
    let authorizedCandidates = accessFilter.filterAuthorizedChunks(vectorCandidates, user);

    // 3b. Topic metadata filtering if specified
    if (options.topicFilter) {
      const topicMatches = authorizedCandidates.filter(c => c.topic === options.topicFilter);
      if (topicMatches.length > 0) {
        authorizedCandidates = topicMatches;
      }
    }

    // 4. Hybrid search (vector + keyword score combination)
    const hybridScored = hybridSearch.mergeAndRank(authorizedCandidates, searchQuery);

    // 5. Rerank & Threshold enforcement
    const { chunks, meetsThreshold, maxScore } = reranker.rerank(hybridScored, topK);

    logger.info(`[Retriever] Query: "${query}" | Lang: ${language} | Role: ${normalizedRole} | Retrieved: ${chunks.length} chunks (MaxScore: ${maxScore})`);

    return {
      chunks,
      language,
      meetsThreshold,
      maxScore,
      userRole: normalizedRole
    };
  }
}

module.exports = new Retriever();
