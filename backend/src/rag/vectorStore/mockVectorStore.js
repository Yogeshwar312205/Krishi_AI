const VectorStore = require('./vectorStore');
const embeddingService = require('../embeddings/embeddingService');
const logger = require('../../utils/logger');

class MockVectorStore extends VectorStore {
  constructor() {
    super();
    this.chunks = [];
  }

  async insert(chunk) {
    this.chunks = this.chunks.filter(c => c.chunkId !== chunk.chunkId);
    this.chunks.push({
      ...chunk,
      createdAt: chunk.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async insertMany(chunks) {
    for (const chunk of chunks) {
      await this.insert(chunk);
    }
    logger.info(`[MockVectorStore] Ingested ${chunks.length} chunks into in-memory store. Total: ${this.chunks.length}`);
  }

  async update(chunkId, data) {
    const idx = this.chunks.findIndex(c => c.chunkId === chunkId);
    if (idx !== -1) {
      this.chunks[idx] = {
        ...this.chunks[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
    }
  }

  async delete(chunkId) {
    this.chunks = this.chunks.filter(c => c.chunkId !== chunkId);
  }

  async clear() {
    this.chunks = [];
  }

  async getAll() {
    return this.chunks;
  }

  /**
   * Vector similarity search with RBAC and metadata filtering.
   * @param {number[]} queryVector 
   * @param {object} options 
   */
  async search(queryVector, options = {}) {
    const { topK = 5, minScore = 0.0, filter = {} } = options;

    let candidates = [...this.chunks];

    // Filter by accessLevel
    if (filter.accessLevel) {
      if (Array.isArray(filter.accessLevel)) {
        candidates = candidates.filter(c => filter.accessLevel.includes(c.accessLevel));
      } else {
        candidates = candidates.filter(c => c.accessLevel === filter.accessLevel);
      }
    }

    // Filter by user role permissions
    if (filter.userRole) {
      const normalizedRole = filter.userRole.toLowerCase();
      candidates = candidates.filter(c => {
        if (c.accessLevel === 'public') return true;
        if (!c.roles || c.roles.length === 0) return true;
        return c.roles.map(r => r.toLowerCase()).includes(normalizedRole);
      });
    }

    // Filter by sensitivity
    if (filter.maxSensitivity) {
      const levels = { public: 1, internal: 2, confidential: 3, restricted: 4 };
      const maxLvl = levels[filter.maxSensitivity] || 4;
      candidates = candidates.filter(c => (levels[c.sensitivity] || 1) <= maxLvl);
    }

    // Compute similarity scores
    const scored = candidates.map(chunk => {
      let score = 0;
      if (queryVector && chunk.vector && queryVector.length === chunk.vector.length) {
        score = embeddingService.cosineSimilarity(queryVector, chunk.vector);
      }
      return { chunk, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter(item => item.score >= minScore)
      .slice(0, topK)
      .map(item => ({
        ...item.chunk,
        score: parseFloat(item.score.toFixed(4))
      }));
  }
}

module.exports = new MockVectorStore();
