const logger = require('../../utils/logger');

class OutputGuard {
  /**
   * Inspects and scrubs secrets/credentials from final answer string.
   * @param {string} answer 
   * @returns {string} sanitized answer
   */
  sanitizeAnswer(answer) {
    if (!answer || typeof answer !== 'string') return answer;

    let sanitized = answer;

    // Secret Patterns
    const patterns = [
      /krishi@2026/gi,
      /mongodb\+srv:\/\/[^\s]+/gi,
      /AIzaSy[A-Za-z0-9_-]{33}/gi,
      /JWT_SECRET\s*=\s*[^\s]+/gi,
      /password\s*:\s*`?[^\s`]+`?/gi,
      /admin123/gi
    ];

    let leaked = false;

    for (const pattern of patterns) {
      if (pattern.test(sanitized)) {
        leaked = true;
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
      }
    }

    if (leaked) {
      logger.warn('[OutputGuard] Redacted secret leakage attempt detected in output.');
    }

    return sanitized;
  }
}

module.exports = new OutputGuard();
