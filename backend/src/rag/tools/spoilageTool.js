const { getLiveGovtWeather } = require('../../services/agmarknetService');
const { assessHaul } = require('../../services/spoilageService');
const logger = require('../../utils/logger');

/**
 * Answers "will my crop spoil on the way / should I use a refrigerated van /
 * what does the weather do to my load" using the same Q10 spoilage math the
 * Prices screen puts into the net-profit ranking, plus the live temperature at
 * the farm.
 */
class SpoilageTool {
  constructor() {
    this.name = 'getTransportSpoilageRisk';
    this.description = 'Estimates crop spoilage in transit (open truck vs refrigerated) using the Q10 decay model and live weather at the farm.';
  }

  /**
   * @param {object} params - { commodity, distanceKm, user, language }
   */
  async execute(params = {}) {
    const commodity = params.commodity || 'Tomato';
    // Distance the query mentioned, else a representative Maharashtra haul.
    const parsedKm = Number(params.distanceKm);
    const distanceKm = Number.isFinite(parsedKm) && parsedKm > 0 ? parsedKm : 150;
    const distanceAssumed = !(Number.isFinite(parsedKm) && parsedKm > 0);

    // Weather at the farmer's registered location when we have it; a central
    // Maharashtra point otherwise. Coordinates are [lng, lat].
    const coords = params.user?.location?.coordinates;
    const hasCoords = Array.isArray(coords) && coords.length === 2
      && Number.isFinite(coords[0]) && Number.isFinite(coords[1]);
    const lat = hasCoords ? coords[1] : 19.9975;
    const lon = hasCoords ? coords[0] : 73.7898;

    try {
      const weather = await getLiveGovtWeather(lat, lon);
      const ambientC = weather && weather.temperature != null ? weather.temperature : undefined;

      const assessment = assessHaul({ cropType: commodity, distanceKm, ambientC });

      return {
        success: true,
        toolUsed: this.name,
        source: ambientC != null
          ? 'KrishiFlow spoilage model (Q10) + Open-Meteo weather'
          : 'KrishiFlow spoilage model (Q10), assumed road temperature',
        dataSource: 'KrishiFlow Spoilage Model',
        commodity,
        distanceKm,
        distanceAssumed,
        weather: {
          temperatureC: ambientC != null ? ambientC : null,
          assumedTemperatureC: ambientC == null ? assessment.ambientTempC : null,
          locationBasis: hasCoords ? 'farm' : 'central Maharashtra',
          source: weather?.source || 'unavailable',
        },
        assessment,
      };
    } catch (err) {
      logger.error(`[SpoilageTool] Failed: ${err.message}`);
      // The math does not need the network — fall back to the assumed temp.
      const assessment = assessHaul({ cropType: commodity, distanceKm });
      return {
        success: true,
        toolUsed: this.name,
        source: 'KrishiFlow spoilage model (Q10), assumed road temperature',
        dataSource: 'KrishiFlow Spoilage Model',
        commodity,
        distanceKm,
        distanceAssumed,
        weather: { temperatureC: null, assumedTemperatureC: assessment.ambientTempC, locationBasis: 'default', source: 'unavailable' },
        assessment,
      };
    }
  }
}

module.exports = new SpoilageTool();
