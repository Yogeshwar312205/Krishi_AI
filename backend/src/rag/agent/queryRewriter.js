class QueryRewriter {
  /**
   * Generates optimized query string and metadata topic filter based on query and intent.
   * @param {string} cleanQuery 
   * @param {string} intent 
   * @returns {{ searchString: string, topicFilter: string|null }}
   */
  rewrite(cleanQuery, intent) {
    let topicFilter = null;
    let searchString = cleanQuery;

    switch (intent) {
      case 'VEHICLE_REGISTRATION':
        topicFilter = 'VEHICLE_REGISTRATION';
        searchString = `supported vehicle types registration mini truck heavy freighter refrigerated van e-pickup payload capacity ${cleanQuery}`;
        break;
      case 'LOGISTICS_WORKFLOW':
        topicFilter = 'LOGISTICS_WORKFLOW';
        searchString = `VRP vehicle insertion route optimization fleet vehicle capacity pickup request dispatch solver heuristics ${cleanQuery}`;
        break;
      case 'FARMER_WORKFLOW':
        topicFilter = 'FARMER_WORKFLOW';
        break;
      case 'APMC_WORKFLOW':
        topicFilter = 'APMC_WORKFLOW';
        break;
      case 'TECHNICAL':
        topicFilter = 'TECHNICAL';
        break;
      default:
        topicFilter = null;
    }

    return {
      searchString,
      topicFilter
    };
  }
}

module.exports = new QueryRewriter();
