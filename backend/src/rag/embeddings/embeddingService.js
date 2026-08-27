const axios = require('axios');
const logger = require('../../utils/logger');

class EmbeddingService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'embedding-001';
    this.vectorDim = 128; // Local fallback dimension
    this.hasWarnedFallback = false;
  }

  /**
   * Generates embedding vector for a given text string.
   * @param {string} text 
   * @returns {Promise<{ vector: number[], source: string }>}
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return { vector: new Array(this.vectorDim).fill(0), source: 'empty' };
    }

    const cleanText = text.trim().replace(/\s+/g, ' ');

    const isRealKey = this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && !this.apiKey.includes('your_');

    if (isRealKey) {
      const primaryModel = (this.embeddingModel || 'gemini-embedding-001').replace(/^models\//, '');
      const modelsToTry = Array.from(new Set([primaryModel, 'gemini-embedding-001', 'gemini-embedding-2', 'text-embedding-004']));

      for (const mName of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:embedContent?key=${this.apiKey}`;
          const response = await axios.post(url, {
            model: `models/${mName}`,
            content: { parts: [{ text: cleanText.substring(0, 2048) }] }
          }, { timeout: 6000 });

          if (response.data?.embedding?.values) {
            return {
              vector: response.data.embedding.values,
              source: `gemini-${mName}`
            };
          }
        } catch (err) {
          // Silent retry for fallback models
        }
      }
      
      if (!this.hasWarnedFallback) {
        logger.warn(`[EmbeddingService] Gemini Embedding API call failed or unavailable. Falling back to local TF-IDF vectorizer.`);
        this.hasWarnedFallback = true;
      }
    }

    // Local deterministic TF-IDF / hashing vectorizer fallback
    const vector = this.generateLocalVector(cleanText);
    return { vector, source: 'local-tfidf' };
  }

  /**
   * Batch embedding generation
   * @param {string[]} texts 
   */
  async generateBatchEmbeddings(texts) {
    const results = [];
    for (const text of texts) {
      const res = await this.generateEmbedding(text);
      results.push(res);
    }
    return results;
  }

  /**
   * Generates a 128-dimensional term frequency-hash vector for offline/fallback matching.
   * @param {string} text 
   * @returns {number[]}
   */
  generateLocalVector(text) {
    const vector = new Array(this.vectorDim).fill(0);
    const tokens = text.toLowerCase().match(/[\w\u0900-\u097F]+/g) || [];
    
    if (tokens.length === 0) return vector;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      for (let j = 0; j < token.length; j++) {
        hash = (hash << 5) - hash + token.charCodeAt(j);
        hash |= 0;
      }
      const index = Math.abs(hash) % this.vectorDim;
      vector[index] += 1;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.vectorDim; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.vectorDim; i++) vector[i] /= norm;
    }

    return vector;
  }

  /**
   * Calculates cosine similarity between two vector arrays.
   * @param {number[]} vecA 
   * @param {number[]} vecB 
   * @returns {number} similarity score in range [-1.0, 1.0]
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
  }
}

module.exports = new EmbeddingService();
