import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest


class Sprint1BMigrationTests(unittest.TestCase):
    def test_upgrades_populated_sprint_zero_database(self) -> None:
        backend_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "legacy-sprint-zero.db"
            environment = os.environ.copy()
            environment["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
            environment["APP_ENV"] = "test"

            subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "0001_initial_schema"],
                cwd=backend_root,
                env=environment,
                check=True,
                capture_output=True,
                text=True,
            )

            connection = sqlite3.connect(database_path)
            try:
                connection.execute(
                    "INSERT INTO projects (id, name, description, status, is_synthetic) "
                    "VALUES (1, 'Legacy demo', 'Sprint 0 record', 'sprint-0', 1)"
                )
                connection.execute(
                    "INSERT INTO territories "
                    "(id, project_id, name, country, province, latitude, longitude, is_synthetic) "
                    "VALUES (1, 1, 'Legacy territory', 'Ecuador', 'Galapagos', -0.9, -89.6, 1)"
                )
                connection.execute(
                    "INSERT INTO climate_data "
                    "(id, territory_id, source_name, source_url, observed_at, temperature_c, "
                    "precipitation_mm, humidity_percent, raw_payload, is_synthetic) "
                    "VALUES (1, 1, 'Legacy synthetic source', 'https://example.org', "
                    "'2026-07-26 18:00:00', 25.0, 0.0, 80.0, '{}', 1)"
                )
                connection.execute(
                    "INSERT INTO observations "
                    "(id, project_id, territory_id, created_by_id, category, description, hazard, exposure, "
                    "vulnerability, latitude, longitude, observed_at, status, is_synthetic) "
                    "VALUES (1, 1, 1, NULL, 'waste', 'Legacy synthetic observation', 2, 2, 2, "
                    "-0.9, -89.6, '2026-07-26 18:00:00', 'pending', 1)"
                )
                connection.execute(
                    "INSERT INTO evidence "
                    "(id, observation_id, evidence_type, uri, description, is_synthetic) "
                    "VALUES (1, 1, 'url', 'https://example.org/evidence', 'Legacy evidence', 1)"
                )
                connection.commit()
            finally:
                connection.close()

            subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=backend_root,
                env=environment,
                check=True,
                capture_output=True,
                text=True,
            )

            connection = sqlite3.connect(database_path)
            try:
                climate = connection.execute(
                    "SELECT retrieved_at, data_provenance FROM climate_data WHERE id = 1"
                ).fetchone()
                observation = connection.execute(
                    "SELECT created_at, data_provenance, synthetic_confirmed, record_title "
                    "FROM observations WHERE id = 1"
                ).fetchone()
                evidence = connection.execute(
                    "SELECT observed_at, data_provenance FROM evidence WHERE id = 1"
                ).fetchone()
                reference_projects = connection.execute(
                    "SELECT COUNT(*) FROM projects WHERE name LIKE 'InfinityAtlas Climate & Health MRV %'"
                ).fetchone()[0]
                reference_territories = connection.execute(
                    "SELECT COUNT(*) FROM territories WHERE name = 'San Cristobal'"
                ).fetchone()[0]
                territory_timezone = connection.execute(
                    "SELECT timezone FROM territories WHERE id = 1"
                ).fetchone()[0]
                operational_users = connection.execute(
                    "SELECT COUNT(*) FROM users"
                ).fetchone()[0]
                new_tables = {
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    ).fetchall()
                }
            finally:
                connection.close()

            self.assertEqual(climate, ("2026-07-26 18:00:00", "synthetic_demo"))
            self.assertEqual(
                observation,
                ("2026-07-26 18:00:00", "synthetic_demo", 1, "Observation #1"),
            )
            self.assertEqual(evidence, ("2026-07-26 18:00:00", "synthetic_demo"))
            self.assertEqual(reference_projects, 0)
            self.assertEqual(reference_territories, 0)
            self.assertEqual(territory_timezone, "UTC")
            self.assertEqual(operational_users, 0)
            self.assertIn("auth_sessions", new_tables)
            self.assertIn("audit_events", new_tables)


if __name__ == "__main__":
    unittest.main()
