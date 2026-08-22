class Chunker {
  /**
   * Intelligently chunks a document preserving headings, sections, and context.
   * @param {object} doc - { metadata, content }
   * @param {object} options - { maxChunkSize: 1000, overlap: 100 }
   * @returns {Array<object>} array of chunk objects
   */
  chunkDocument(doc, options = {}) {
    const { metadata, content } = doc;
    const { maxChunkSize = 1200 } = options;
    const chunks = [];

    // Split content by markdown section headers (## or ###)
    const sectionRegex = /(?=(?:^|\n)#{1,3}\s+)/g;
    const rawSections = content.split(sectionRegex).filter(s => s.trim().length > 0);

    let chunkIndex = 1;

    for (const rawSec of rawSections) {
      const trimmedSec = rawSec.trim();

      // Extract section title if present
      let sectionTitle = metadata.title || 'General';
      const headerMatch = trimmedSec.match(/^(#{1,3})\s+(.+)$/m);
      if (headerMatch) {
        sectionTitle = headerMatch[2].trim();
      }

      // If section fits in one chunk
      if (trimmedSec.length <= maxChunkSize) {
        chunks.push(this.createChunkObj(metadata, sectionTitle, trimmedSec, chunkIndex++));
      } else {
        // Sub-chunk long sections by paragraphs
        const paragraphs = trimmedSec.split(/\n\s*\n/);
        let currentBuffer = '';

        for (const para of paragraphs) {
          if ((currentBuffer + para).length > maxChunkSize && currentBuffer.length > 0) {
            chunks.push(this.createChunkObj(metadata, sectionTitle, currentBuffer.trim(), chunkIndex++));
            currentBuffer = para + '\n\n';
          } else {
            currentBuffer += para + '\n\n';
          }
        }

        if (currentBuffer.trim().length > 0) {
          chunks.push(this.createChunkObj(metadata, sectionTitle, currentBuffer.trim(), chunkIndex++));
        }
      }
    }

    return chunks;
  }

  createChunkObj(metadata, section, content, index) {
    const chunkId = `${metadata.documentId || 'doc'}-chunk-${String(index).padStart(2, '0')}`;

    return {
      documentId: metadata.documentId || 'doc',
      documentName: metadata.documentId ? `${metadata.documentId}.md` : 'doc.md',
      chunkId,
      title: metadata.title || 'KrishiFlow Knowledge Base',
      section,
      topic: metadata.topic || 'GENERAL',
      content,
      source: metadata.source || 'krishiflow-docs',
      url: metadata.url || '',
      language: metadata.language || 'en',
      accessLevel: metadata.accessLevel || 'public',
      roles: metadata.roles || ['farmer', 'logistics', 'buyer', 'admin'],
      sensitivity: metadata.sensitivity || 'public',
      version: metadata.version || '1.0',
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = new Chunker();
