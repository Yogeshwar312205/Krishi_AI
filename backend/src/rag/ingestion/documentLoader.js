const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

class DocumentLoader {
  /**
   * Reads a markdown file and parses YAML frontmatter + content.
   * @param {string} filePath 
   */
  loadMarkdownFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Knowledge file not found at: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    return this.parseFrontmatter(raw, filePath);
  }

  /**
   * Simple YAML frontmatter parser without external dependencies.
   * @param {string} rawContent 
   * @param {string} sourcePath 
   */
  parseFrontmatter(rawContent, sourcePath = '') {
    const filename = path.basename(sourcePath, path.extname(sourcePath));
    const defaultMeta = {
      documentId: filename,
      title: filename,
      source: 'krishiflow-docs',
      url: `/docs/${filename}`,
      language: 'en',
      accessLevel: 'public',
      roles: ['farmer', 'logistics', 'buyer', 'admin'],
      sensitivity: 'public'
    };

    if (!rawContent.startsWith('---')) {
      return { metadata: defaultMeta, content: rawContent.trim() };
    }

    const endIdx = rawContent.indexOf('---', 3);
    if (endIdx === -1) {
      return { metadata: defaultMeta, content: rawContent.trim() };
    }

    const frontmatterText = rawContent.substring(3, endIdx).trim();
    const content = rawContent.substring(endIdx + 3).trim();

    const metadata = { ...defaultMeta };
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();

        // Handle string array format: ["farmer", "logistics"]
        if (val.startsWith('[') && val.endsWith(']')) {
          try {
            val = JSON.parse(val.replace(/'/g, '"'));
          } catch (e) {
            val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
          }
        } else if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }

        metadata[key] = val;
      }
    }

    return { metadata, content };
  }

  /**
   * Loads all markdown documents from a directory
   * @param {string} dirPath 
   */
  loadDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      logger.warn(`Directory not found: ${dirPath}`);
      return [];
    }

    const files = fs.readdirSync(dirPath);
    const docs = [];

    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.txt')) {
        const fullPath = path.join(dirPath, file);
        try {
          const doc = this.loadMarkdownFile(fullPath);
          docs.push(doc);
        } catch (err) {
          logger.error(`Error loading document ${file}: ${err.message}`);
        }
      }
    }

    return docs;
  }
}

module.exports = new DocumentLoader();
