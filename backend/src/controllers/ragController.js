const ragAgent = require('../rag/agent/ragAgent');
const indexer = require('../rag/ingestion/indexer');
const mockVectorStore = require('../rag/vectorStore/mockVectorStore');
const logger = require('../utils/logger');

/**
 * RAG Chat Endpoint
 * POST /api/rag/chat
 */
const handleRagChat = async (req, res) => {
  try {
    const { message, conversationId, language } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a valid "message" string.'
      });
    }

    // Authenticated user comes strictly from JWT middleware (protect)
    const user = req.user;

    // The client can pin the reply language (the assistant's language toggle).
    // Only a supported code is honoured; anything else lets the agent detect it
    // from the text.
    const preferredLanguage = ['en', 'hi', 'mr'].includes(language) ? language : null;

    const response = await ragAgent.processQuery(message, user, conversationId, preferredLanguage);

    return res.json({
      success: true,
      data: response
    });
  } catch (err) {
    logger.error(`RAG Chat Controller error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process RAG question',
      error: err.message
    });
  }
};

/**
 * Re-index Knowledge Base Endpoint (Admin / Trigger)
 * POST /api/rag/index
 */
const triggerIndexing = async (req, res) => {
  try {
    const result = await indexer.indexKnowledgeBase();
    return res.json({
      success: true,
      message: 'Knowledge base indexing completed successfully.',
      details: result
    });
  } catch (err) {
    logger.error(`RAG Indexing error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Indexing failed',
      error: err.message
    });
  }
};

/**
 * RAG Health Check & Metrics Endpoint
 * GET /api/rag/health
 */
const getRagHealth = async (req, res) => {
  try {
    const chunks = await mockVectorStore.getAll();
    return res.json({
      status: 'online',
      service: 'KrishiFlow RAG Subsystem',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      totalChunksIndexed: chunks.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
};

/**
 * List Knowledge Base Document Sources
 * GET /api/rag/sources
 */
const getSources = async (req, res) => {
  try {
    const chunks = await mockVectorStore.getAll();
    const docMap = new Map();

    chunks.forEach(c => {
      if (!docMap.has(c.documentId)) {
        docMap.set(c.documentId, {
          documentId: c.documentId,
          title: c.title,
          source: c.source,
          url: c.url,
          accessLevel: c.accessLevel,
          language: c.language,
          sectionsCount: 1
        });
      } else {
        const existing = docMap.get(c.documentId);
        existing.sectionsCount += 1;
      }
    });

    return res.json({
      success: true,
      sources: Array.from(docMap.values())
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  handleRagChat,
  triggerIndexing,
  getRagHealth,
  getSources
};
