const path = require('path');
const documentLoader = require('./documentLoader');
const chunker = require('./chunker');
const embeddingService = require('../embeddings/embeddingService');
const { mongoVectorStore } = require('../vectorStore/mongoVectorStore');
const logger = require('../../utils/logger');

class Indexer {
  /**
   * Runs the full indexing pipeline for the knowledge base directory
   * @param {string} customDir 
   */
  async indexKnowledgeBase(customDir) {
    const kbDir = customDir || path.join(__dirname, '..', 'knowledgeBase');
    logger.info(`[Indexer] Starting knowledge base indexing from: ${kbDir}`);

    const docs = documentLoader.loadDirectory(kbDir);
    if (docs.length === 0) {
      logger.warn(`[Indexer] No documents found to index in ${kbDir}`);
      return { success: false, documentsIndexed: 0, chunksIndexed: 0 };
    }

    let allChunks = [];
    for (const doc of docs) {
      const chunks = chunker.chunkDocument(doc);
      allChunks = allChunks.concat(chunks);
    }

    logger.info(`[Indexer] Generated ${allChunks.length} chunks from ${docs.length} documents. Generating embeddings...`);

    // Generate vector embeddings for all chunks
    const embeddedChunks = [];
    for (const chunk of allChunks) {
      // Include document title, section, and content in embedding context
      const embeddingText = `Title: ${chunk.title}\nSection: ${chunk.section}\nContent: ${chunk.content}`;
      const { vector } = await embeddingService.generateEmbedding(embeddingText);

      embeddedChunks.push({
        ...chunk,
        vector
      });
    }

    // Insert into vector store
    await mongoVectorStore.insertMany(embeddedChunks);

    logger.info(`[Indexer] Indexing complete! ${docs.length} documents, ${embeddedChunks.length} chunks stored.`);

    return {
      success: true,
      documentsIndexed: docs.length,
      chunksIndexed: embeddedChunks.length
    };
  }
}

module.exports = new Indexer();
