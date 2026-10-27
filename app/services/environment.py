from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.schemas import EnvironmentalCurrent


class EnvironmentalProviderError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def fetch_environment(latitude: float | None = None, longitude: float | None = None) -> EnvironmentalCurrent:
    settings = get_settings()
    if settings.environment_provider != "open_meteo":
        raise EnvironmentalProviderError("Environmental data provider is not configured.", 503)

    latitude = settings.environment_latitude if latitude is None else latitude
    longitude = settings.environment_longitude if longitude is None else longitude
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,rain,wind_speed_10m,uv_index,surface_pressure,cloud_cover",
        "temperature_unit": "celsius",
        "wind_speed_unit": "ms",
        "precipitation_unit": "mm",
        "timeformat": "iso8601",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = await client.get(settings.environment_base_url, params=params)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise EnvironmentalProviderError("Environmental data provider timed out.", 504) from exc
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        raise EnvironmentalProviderError("Environmental data provider is unavailable.", 502) from exc

    try:
        payload = response.json()
        current = payload["current"]
        timestamp = datetime.fromisoformat(current["time"].replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return EnvironmentalCurrent(
            latitude=latitude,
            longitude=longitude,
            temperature=current["temperature_2m"],
            humidity=current["relative_humidity_2m"],
            rain=current["rain"],
            wind_speed=current["wind_speed_10m"],
            uv_index=current["uv_index"],
            pressure=current["surface_pressure"],
            cloud_cover=current.get("cloud_cover"),
            timestamp=timestamp,
            source="open_meteo",
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise EnvironmentalProviderError("Environmental data provider returned an invalid response.", 502) from exc
