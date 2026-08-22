class AccessFilter {
  /**
   * Normalizes legacy role names to canonical KrishiFlow roles.
   * Canonical roles: 'farmer', 'logistics', 'buyer', 'admin'
   * @param {string} rawRole 
   * @returns {string}
   */
  normalizeRole(rawRole) {
    if (!rawRole) return 'farmer';
    const r = rawRole.toLowerCase().trim();
    if (r.includes('driver') || r.includes('transporter') || r.includes('fleet') || r.includes('logistics')) {
      return 'logistics';
    }
    if (r.includes('trader') || r.includes('buyer') || r.includes('apmc')) {
      return 'buyer';
    }
    if (r.includes('admin')) {
      return 'admin';
    }
    return 'farmer';
  }

  /**
   * Evaluates whether a user with given role is authorized to view a specific knowledge chunk.
   * @param {object} user 
   * @param {object} chunk 
   * @returns {boolean}
   */
  isAuthorized(user, chunk) {
    if (!chunk) return false;
    
    // Public chunks accessible to everyone
    if (chunk.accessLevel === 'public') return true;

    // Admin role has access to all non-confidential/internal docs
    const userRole = this.normalizeRole(user?.role);
    if (userRole === 'admin') return true;

    // Check role array
    if (chunk.roles && Array.isArray(chunk.roles)) {
      const allowedRoles = chunk.roles.map(r => this.normalizeRole(r));
      return allowedRoles.includes(userRole);
    }

    return false;
  }

  /**
   * Filters an array of candidate chunks against the authenticated user's credentials.
   * @param {Array<object>} chunks 
   * @param {object} user 
   * @returns {Array<object>}
   */
  filterAuthorizedChunks(chunks, user) {
    if (!Array.isArray(chunks)) return [];
    return chunks.filter(chunk => this.isAuthorized(user, chunk));
  }
}

module.exports = new AccessFilter();
