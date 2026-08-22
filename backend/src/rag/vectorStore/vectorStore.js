/**
 * Abstract Vector Store Interface
 */
class VectorStore {
  async insert(chunk) {
    throw new Error('VectorStore.insert must be implemented');
  }

  async insertMany(chunks) {
    throw new Error('VectorStore.insertMany must be implemented');
  }

  async update(chunkId, data) {
    throw new Error('VectorStore.update must be implemented');
  }

  async delete(chunkId) {
    throw new Error('VectorStore.delete must be implemented');
  }

  async search(queryVector, options = {}) {
    throw new Error('VectorStore.search must be implemented');
  }

  async clear() {
    throw new Error('VectorStore.clear must be implemented');
  }
}

module.exports = VectorStore;
