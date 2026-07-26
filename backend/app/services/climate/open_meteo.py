from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from typing import Any

import httpx

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
CURRENT_VARIABLES = (
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "weather_code",
)


class ClimateProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class ClimateReading:
    source_name: str
    source_url: str
    observed_at: datetime
    retrieved_at: datetime
    temperature_c: float
    relative_humidity_percent: float
    apparent_temperature_c: float
    precipitation_mm: float
    weather_code: int
    raw_payload: str


def _required_number(data: dict[str, Any], key: str) -> float:
    value = data.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ClimateProviderError(f"Open-Meteo response is missing numeric field: {key}")
    return float(value)


def transform_open_meteo_response(
    payload: dict[str, Any],
    *,
    source_url: str,
    retrieved_at: datetime | None = None,
) -> ClimateReading:
    current = payload.get("current")
    if not isinstance(current, dict):
        raise ClimateProviderError("Open-Meteo response does not contain current conditions.")

    observed_value = current.get("time")
    offset_seconds = payload.get("utc_offset_seconds")
    if not isinstance(observed_value, str) or not isinstance(offset_seconds, int):
        raise ClimateProviderError("Open-Meteo response has an invalid observation timestamp.")

    try:
        local_timezone = timezone(timedelta(seconds=offset_seconds))
        observed_at = datetime.fromisoformat(observed_value).replace(tzinfo=local_timezone).astimezone(timezone.utc)
    except ValueError as exc:
        raise ClimateProviderError("Open-Meteo response has an unreadable observation timestamp.") from exc

    humidity = _required_number(current, "relative_humidity_2m")
    if not 0 <= humidity <= 100:
        raise ClimateProviderError("Open-Meteo relative humidity is outside the expected range.")

    weather_code_value = current.get("weather_code")
    if isinstance(weather_code_value, bool) or not isinstance(weather_code_value, int):
        raise ClimateProviderError("Open-Meteo response has an invalid WMO weather code.")

    return ClimateReading(
        source_name="Open-Meteo Weather Forecast API",
        source_url=source_url,
        observed_at=observed_at,
        retrieved_at=retrieved_at or datetime.now(timezone.utc),
        temperature_c=_required_number(current, "temperature_2m"),
        relative_humidity_percent=humidity,
        apparent_temperature_c=_required_number(current, "apparent_temperature"),
        precipitation_mm=_required_number(current, "precipitation"),
        weather_code=weather_code_value,
        raw_payload=json.dumps(payload, ensure_ascii=True, separators=(",", ":")),
    )


class OpenMeteoClient:
    def __init__(
        self,
        *,
        timeout_seconds: float,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.timeout_seconds = timeout_seconds
        self.transport = transport

    def fetch_current(self, *, latitude: float, longitude: float) -> ClimateReading:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": ",".join(CURRENT_VARIABLES),
            "timezone": "auto",
        }
        try:
            with httpx.Client(
                timeout=self.timeout_seconds,
                transport=self.transport,
                headers={"User-Agent": "InfinityAtlas-Climate-Health-MRV/0.2"},
            ) as client:
                response = client.get(OPEN_METEO_FORECAST_URL, params=params)
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
            raise ClimateProviderError("Open-Meteo is temporarily unavailable.") from exc

        if not isinstance(payload, dict):
            raise ClimateProviderError("Open-Meteo returned an unexpected response.")

        return transform_open_meteo_response(payload, source_url=str(response.request.url))
