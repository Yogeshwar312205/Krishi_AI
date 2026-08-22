class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.ttlMs = 2 * 60 * 60 * 1000; // 2 hour session timeout
  }

  /**
   * Retrieves or initializes session state for conversationId.
   * @param {string} conversationId 
   */
  getSession(conversationId) {
    if (!conversationId) return null;
    const session = this.sessions.get(conversationId);
    if (!session) return null;

    if (Date.now() - session.updatedAt > this.ttlMs) {
      this.sessions.delete(conversationId);
      return null;
    }

    return session;
  }

  /**
   * Merges extracted entity & intent state into session.
   * Clears old entities if intent changes to an unrelated non-market intent.
   * @param {string} conversationId 
   * @param {object} extractedData - { commodity, market, marketObj, intent, language }
   */
  updateSession(conversationId, extractedData = {}) {
    if (!conversationId) return;

    const isLiveMarketIntent = extractedData.intent === 'LIVE_MARKET_PRICE' || extractedData.intent === 'COMBINED';

    if (!isLiveMarketIntent) {
      // Intent changed to unrelated topic (e.g. LOGISTICS_WORKFLOW, VEHICLE_REGISTRATION, KNOWLEDGE) -> Reset commodity & market
      this.sessions.set(conversationId, {
        commodity: null,
        market: null,
        marketObj: null,
        intent: extractedData.intent || 'KNOWLEDGE',
        language: extractedData.language || 'en',
        updatedAt: Date.now()
      });
      return;
    }

    const existing = this.getSession(conversationId) || {
      commodity: null,
      market: null,
      marketObj: null,
      intent: null,
      language: 'en'
    };

    const updated = {
      commodity: extractedData.commodity || existing.commodity,
      market: extractedData.market || existing.market,
      marketObj: extractedData.marketObj || existing.marketObj,
      intent: extractedData.intent || existing.intent,
      language: extractedData.language || existing.language,
      updatedAt: Date.now()
    };

    this.sessions.set(conversationId, updated);
  }

  /**
   * Inherits context ONLY when current turn is determined to be a follow-up to previous live-market context.
   * Clears irrelevant entities if current query is an independent non-market query.
   * @param {string} conversationId 
   * @param {object} current - { commodity, market, marketObj, intent, language, cleanQuery }
   * @param {string} classifiedIntent - Preliminary intent of current query
   */
  applyContext(conversationId, current, classifiedIntent) {
    if (!conversationId) return current;

    const previous = this.getSession(conversationId);
    if (!previous) return current;

    // If current query has a distinct non-market intent (e.g. LOGISTICS_WORKFLOW, VEHICLE_REGISTRATION), CLEAR entities!
    const isNonMarketIntent = classifiedIntent && classifiedIntent !== 'LIVE_MARKET_PRICE' && classifiedIntent !== 'COMBINED' && classifiedIntent !== 'UNKNOWN';
    
    if (isNonMarketIntent) {
      return {
        ...current,
        entities: {
          ...current.entities,
          commodity: null,
          market: null,
          marketObj: null
        }
      };
    }

    // Follow-up pattern detection: e.g. "at Kalvan", "in Pune", "what about Kalvan?", "कळवण"
    const lower = (current.cleanQuery || '').toLowerCase().trim();
    const isFollowupPattern = 
      /^(?:at|in|near|for|mandi|apmc)\s+/i.test(lower) ||
      lower.startsWith('what about') ||
      /\bat\b/i.test(lower) ||
      /\bin\b/i.test(lower);

    const merged = { ...current, entities: { ...current.entities } };

    // ONLY inherit commodity if previous intent was live market and current turn is a follow-up or live market query
    if (previous.intent === 'LIVE_MARKET_PRICE' || previous.intent === 'COMBINED') {
      if (!merged.entities.commodity && previous.commodity && (merged.entities.market || isFollowupPattern)) {
        merged.entities.commodity = previous.commodity;
      }
    }

    return merged;
  }
}

module.exports = new SessionManager();
