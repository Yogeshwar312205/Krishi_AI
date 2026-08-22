class PromptInjectionDefense {
  /**
   * Sanitizes user input string against prompt injection attack patterns.
   * @param {string} input 
   * @returns {string}
   */
  sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') return '';

    // Strip known prompt injection jailbreak patterns
    let clean = input
      .replace(/ignore\s+all\s+previous\s+instructions/gi, '[filtered]')
      .replace(/forget\s+all\s+prior\s+prompts/gi, '[filtered]')
      .replace(/you\s+are\s+now\s+a/gi, '[filtered]')
      .replace(/system:\s*/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, ''); // strip HTML tags

    return clean.trim();
  }

  /**
   * Wraps context chunks inside secure structural XML delimiters.
   * @param {Array<object>} chunks 
   * @returns {string}
   */
  formatSecureContext(chunks) {
    if (!chunks || chunks.length === 0) return 'NO_CONTEXT_FOUND';

    let formatted = '<retrieved_context>\n';
    chunks.forEach((c, idx) => {
      formatted += `<document index="${idx + 1}" title="${this.escapeXml(c.title)}" section="${this.escapeXml(c.section)}">\n`;
      formatted += `${this.escapeXml(c.content)}\n`;
      formatted += `</document>\n`;
    });
    formatted += '</retrieved_context>';

    return formatted;
  }

  escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = new PromptInjectionDefense();
