"""
Current-conditions weather, from the OpenWeather "Current Weather Data" API.

    https://api.openweathermap.org/data/2.5/weather?lat=..&lon=..&appid=KEY&units=metric

Only the free current-weather endpoint is used. The key comes from
OPENWEATHER_API_KEY (see app/core/config.py and ai-engine/.env.example).

House rule for this repo: everything degrades instead of failing. No key, a
network error, or a malformed response all return `{"available": False, ...}`
with the reason attached, and the caller (price_service.SECTION 2) drops the
weather term from its score rather than blocking.

Stdlib only — no `requests`/`httpx` dependency. Results are cached in-process
for 20 minutes per rounded coordinate, matching the Node side's Open-Meteo
cache, because the price screen can ask for this once per render.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import settings

_OWM_URL = "https://api.openweathermap.org/data/2.5/weather"
_CACHE_TTL_S = 20 * 60
_HTTP_TIMEOUT_S = 4.0

# key: "lat,lon" rounded to 2dp -> {"expires": epoch, "value": {...}}
_cache: dict[str, dict] = {}


def _cache_key(lat: float, lon: float) -> str:
    return f"{lat:.2f},{lon:.2f}"


def _classify(owm: dict) -> dict:
    """Flatten the bits of the OpenWeather payload the scorer actually uses."""
    main = owm.get("main", {})
    wind = owm.get("wind", {})
    weather_arr = owm.get("weather", []) or [{}]
    condition = weather_arr[0].get("main", "Unknown")   # Rain / Clouds / Clear / Thunderstorm ...
    description = weather_arr[0].get("description", "")

    # OpenWeather reports rain volume under "rain": {"1h": mm} only when it is
    # actually raining; absence means zero.
    rain_1h_mm = float(owm.get("rain", {}).get("1h", 0.0) or 0.0)
    snow_1h_mm = float(owm.get("snow", {}).get("1h", 0.0) or 0.0)

    return {
        "available": True,
        "temperatureC": _num(main.get("temp")),
        "feelsLikeC": _num(main.get("feels_like")),
        "humidityPct": _num(main.get("humidity")),
        "windMps": _num(wind.get("speed")),
        "condition": condition,
        "description": description,
        "rain1hMm": rain_1h_mm,
        "snow1hMm": snow_1h_mm,
        "isPrecipitating": rain_1h_mm > 0.0 or snow_1h_mm > 0.0 or condition in (
            "Rain", "Drizzle", "Thunderstorm", "Snow",
        ),
        "observedAt": owm.get("dt"),
        "place": owm.get("name") or None,
        "source": "OpenWeather Current Weather API",
    }


def _num(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def _unavailable(reason: str) -> dict:
    return {
        "available": False,
        "reason": reason,
        "temperatureC": None,
        "humidityPct": None,
        "windMps": None,
        "condition": None,
        "rain1hMm": None,
        "isPrecipitating": None,
        "source": "OpenWeather unavailable",
    }


def get_current_weather(lat: float, lon: float, *, use_cache: bool = True) -> dict:
    """
    Current conditions at (lat, lon). Never raises — see module docstring.
    """
    if lat is None or lon is None:
        return _unavailable("no coordinates supplied")

    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        return _unavailable("coordinates not numeric")

    if not settings.OPENWEATHER_API_KEY:
        return _unavailable("OPENWEATHER_API_KEY not configured")

    key = _cache_key(lat, lon)
    now = time.time()
    if use_cache:
        hit = _cache.get(key)
        if hit and hit["expires"] > now:
            return hit["value"]

    query = urllib.parse.urlencode({
        "lat": f"{lat:.4f}",
        "lon": f"{lon:.4f}",
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    })
    url = f"{_OWM_URL}?{query}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "KrishiFlow-AIEngine/1.0"})
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # 401 = bad/absent key, 429 = rate limited — both are "just skip weather".
        return _unavailable(f"HTTP {e.code} from OpenWeather")
    except Exception as e:  # noqa: BLE001 - deliberately broad: any failure => degrade
        return _unavailable(f"request failed: {e.__class__.__name__}")

    if str(payload.get("cod")) not in ("200", "None") and payload.get("main") is None:
        return _unavailable(f"OpenWeather error: {payload.get('message', 'unknown')}")

    value = _classify(payload)
    if use_cache:
        _cache[key] = {"expires": now + _CACHE_TTL_S, "value": value}
    return value
