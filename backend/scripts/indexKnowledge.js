require('dotenv').config();
const indexer = require('../src/rag/ingestion/indexer');
const logger = require('../src/utils/logger');

async function main() {
  logger.info('=== KrishiFlow RAG Knowledge Base Indexer ===');
  try {
    const result = await indexer.indexKnowledgeBase();
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    logger.error(`Indexing script error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();
