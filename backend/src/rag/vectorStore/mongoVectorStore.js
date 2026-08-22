const mongoose = require('mongoose');
const VectorStore = require('./vectorStore');
const mockVectorStore = require('./mockVectorStore');
const { getIsConnected } = require('../../config/db');
const logger = require('../../utils/logger');

const KnowledgeChunkSchema = new mongoose.Schema({
  documentId: { type: String, required: true, index: true },
  chunkId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  section: { type: String, default: 'General' },
  content: { type: String, required: true },
  source: { type: String, default: 'krishiflow-docs' },
  url: { type: String, default: '' },
  language: { type: String, default: 'en' },
  accessLevel: { type: String, enum: ['public', 'role', 'private', 'internal'], default: 'public' },
  roles: [{ type: String }],
  sensitivity: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], default: 'public' },
  vector: [{ type: Number }],
  metadata: { type: Object, default: {} }
}, { timestamps: true });

KnowledgeChunkSchema.index({ content: 'text', title: 'text', section: 'text' });

let KnowledgeChunkModel;
try {
  KnowledgeChunkModel = mongoose.model('KnowledgeChunk');
} catch (e) {
  KnowledgeChunkModel = mongoose.model('KnowledgeChunk', KnowledgeChunkSchema);
}

class MongoVectorStore extends VectorStore {
  async insert(chunk) {
    // Always mirror to mock store for zero-downtime resilience
    await mockVectorStore.insert(chunk);

    if (getIsConnected()) {
      try {
        await KnowledgeChunkModel.findOneAndUpdate(
          { chunkId: chunk.chunkId },
          chunk,
          { upsert: true, new: true }
        );
      } catch (err) {
        logger.warn(`MongoVectorStore insert notice: ${err.message}`);
      }
    }
  }

  async insertMany(chunks) {
    await mockVectorStore.insertMany(chunks);

    if (getIsConnected()) {
      try {
        const ops = chunks.map(chunk => ({
          updateOne: {
            filter: { chunkId: chunk.chunkId },
            update: { $set: chunk },
            upsert: true
          }
        }));
        await KnowledgeChunkModel.bulkWrite(ops);
        logger.info(`[MongoVectorStore] Bulk updated ${chunks.length} chunks in MongoDB.`);
      } catch (err) {
        logger.warn(`MongoVectorStore insertMany notice: ${err.message}`);
      }
    }
  }

  async update(chunkId, data) {
    await mockVectorStore.update(chunkId, data);
    if (getIsConnected()) {
      try {
        await KnowledgeChunkModel.updateOne({ chunkId }, { $set: data });
      } catch (err) {
        logger.warn(`MongoVectorStore update notice: ${err.message}`);
      }
    }
  }

  async delete(chunkId) {
    await mockVectorStore.delete(chunkId);
    if (getIsConnected()) {
      try {
        await KnowledgeChunkModel.deleteOne({ chunkId });
      } catch (err) {
        logger.warn(`MongoVectorStore delete notice: ${err.message}`);
      }
    }
  }

  async clear() {
    await mockVectorStore.clear();
    if (getIsConnected()) {
      try {
        await KnowledgeChunkModel.deleteMany({});
      } catch (err) {
        logger.warn(`MongoVectorStore clear notice: ${err.message}`);
      }
    }
  }

  async search(queryVector, options = {}) {
    // Delegate to memory/vector engine for guaranteed speed & fallback consistency
    return await mockVectorStore.search(queryVector, options);
  }
}

module.exports = {
  mongoVectorStore: new MongoVectorStore(),
  KnowledgeChunkModel
};
