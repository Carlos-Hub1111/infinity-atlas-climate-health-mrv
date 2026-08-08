from datetime import datetime, timezone
import unittest

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.models import Base, ClimateData, Project, Territory
from app.services.climate import ClimateProviderError, ClimateReading, OpenMeteoClient
from app.services.climate.open_meteo import transform_open_meteo_response
from app.services.climate_data import get_current_climate

SAMPLE_PAYLOAD = {
    "latitude": -0.8787346,
    "longitude": -89.57547,
    "utc_offset_seconds": -21600,
    "timezone": "Pacific/Galapagos",
    "current_units": {
        "time": "iso8601",
        "interval": "seconds",
        "temperature_2m": "°C",
        "relative_humidity_2m": "%",
        "apparent_temperature": "°C",
        "precipitation": "mm",
        "weather_code": "wmo code",
    },
    "current": {
        "time": "2026-07-26T14:00",
        "interval": 900,
        "temperature_2m": 26.6,
        "relative_humidity_2m": 81,
        "apparent_temperature": 31.1,
        "precipitation": 0.3,
        "weather_code": 55,
    },
}


class OpenMeteoAdapterTests(unittest.TestCase):
    def test_transforms_provider_response_to_internal_reading(self) -> None:
        retrieved_at = datetime(2026, 7, 26, 20, 5, tzinfo=timezone.utc)

        reading = transform_open_meteo_response(
            SAMPLE_PAYLOAD,
            source_url="https://api.open-meteo.com/v1/forecast?test=true",
            retrieved_at=retrieved_at,
        )

        self.assertEqual(reading.source_name, "Open-Meteo Weather Forecast API")
        self.assertEqual(reading.observed_at, datetime(2026, 7, 26, 20, 0, tzinfo=timezone.utc))
        self.assertEqual(reading.retrieved_at, retrieved_at)
        self.assertEqual(reading.temperature_c, 26.6)
        self.assertEqual(reading.relative_humidity_percent, 81)
        self.assertEqual(reading.apparent_temperature_c, 31.1)
        self.assertEqual(reading.precipitation_mm, 0.3)
        self.assertEqual(reading.weather_code, 55)

    def test_fetches_current_conditions_with_mocked_http(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.url.host, "api.open-meteo.com")
            self.assertIn("temperature_2m", str(request.url))
            return httpx.Response(200, json=SAMPLE_PAYLOAD)

        client = OpenMeteoClient(timeout_seconds=2, transport=httpx.MockTransport(handler))

        reading = client.fetch_current(latitude=-0.9002, longitude=-89.6127)

        self.assertEqual(reading.temperature_c, 26.6)
        self.assertIn("latitude=-0.9002", reading.source_url)

    def test_wraps_provider_failure_without_exposing_transport_details(self) -> None:
        def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(503, json={"reason": "temporary"})

        client = OpenMeteoClient(timeout_seconds=2, transport=httpx.MockTransport(handler))

        with self.assertRaisesRegex(ClimateProviderError, "temporarily unavailable"):
            client.fetch_current(latitude=-0.9002, longitude=-89.6127)


class ClimateStorageAndFallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as db:
            project = Project(
                name="Test project",
                description="Controlled test fixture",
                status="active",
                is_synthetic=False,
            )
            db.add(project)
            db.flush()
            territory = Territory(
                project_id=project.id,
                name="San Cristobal",
                country="Ecuador",
                province="Galapagos",
                latitude=-0.9002,
                longitude=-89.6127,
                is_synthetic=False,
            )
            db.add(territory)
            db.commit()
            self.territory_id = territory.id

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_stores_source_timestamps_and_returns_stale_record_on_failure(self) -> None:
        reading = ClimateReading(
            source_name="Open-Meteo Weather Forecast API",
            source_url="https://api.open-meteo.com/v1/forecast?mock=true",
            observed_at=datetime(2026, 7, 26, 20, 0, tzinfo=timezone.utc),
            retrieved_at=datetime(2026, 7, 26, 20, 5, tzinfo=timezone.utc),
            temperature_c=26.6,
            relative_humidity_percent=81,
            apparent_temperature_c=31.1,
            precipitation_mm=0.3,
            weather_code=55,
            raw_payload='{"mock":true}',
        )

        class SuccessClient:
            def fetch_current(self, **_kwargs: float) -> ClimateReading:
                return reading

        class FailingClient:
            def fetch_current(self, **_kwargs: float) -> ClimateReading:
                raise ClimateProviderError("Open-Meteo is temporarily unavailable.")

        with Session(self.engine) as db:
            territory = db.get(Territory, self.territory_id)
            first = get_current_climate(
                db=db,
                territory=territory,
                client=SuccessClient(),
                cache_ttl_seconds=900,
            )
            stored_id = first.record.id

        with Session(self.engine) as db:
            stored = db.scalar(select(ClimateData).where(ClimateData.id == stored_id))
            self.assertEqual(stored.source_name, "Open-Meteo Weather Forecast API")
            self.assertEqual(stored.source_url, reading.source_url)
            self.assertIsNotNone(stored.observed_at)
            self.assertIsNotNone(stored.retrieved_at)
            self.assertEqual(stored.data_provenance, "public_real")
            self.assertFalse(stored.is_synthetic)

            territory = db.get(Territory, self.territory_id)
            fallback = get_current_climate(
                db=db,
                territory=territory,
                client=FailingClient(),
                cache_ttl_seconds=-1,
            )

        self.assertEqual(fallback.record.id, stored_id)
        self.assertTrue(fallback.is_stale)


if __name__ == "__main__":
    unittest.main()
