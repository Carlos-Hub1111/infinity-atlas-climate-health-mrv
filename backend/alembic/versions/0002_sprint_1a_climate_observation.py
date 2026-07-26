"""Add Sprint 1A climate provenance and observation evidence fields.

Revision ID: 0002_sprint_1a
Revises: 0001_initial_schema
Create Date: 2026-07-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_sprint_1a"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REFERENCE_PROJECT_NAME = "Infinity Atlas Climate & Health MRV Pilot"
REFERENCE_TERRITORY_NAME = "San Cristobal"


def upgrade() -> None:
    op.add_column(
        "climate_data",
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("climate_data", sa.Column("apparent_temperature_c", sa.Float(), nullable=True))
    op.add_column("climate_data", sa.Column("weather_code", sa.Integer(), nullable=True))
    op.add_column(
        "climate_data",
        sa.Column(
            "data_provenance",
            sa.String(length=40),
            nullable=False,
            server_default="public_real",
        ),
    )

    op.add_column(
        "observations",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "observations",
        sa.Column(
            "source_name",
            sa.String(length=160),
            nullable=False,
            server_default="Sprint 0 legacy record",
        ),
    )
    op.add_column(
        "observations",
        sa.Column(
            "responsible_role",
            sa.String(length=160),
            nullable=False,
            server_default="Unassigned monitoring role",
        ),
    )
    op.add_column(
        "observations",
        sa.Column(
            "data_provenance",
            sa.String(length=40),
            nullable=False,
            server_default="controlled_test",
        ),
    )
    op.add_column(
        "observations",
        sa.Column("synthetic_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.add_column(
        "evidence",
        sa.Column(
            "source_name",
            sa.String(length=160),
            nullable=False,
            server_default="Sprint 0 legacy evidence",
        ),
    )
    op.add_column(
        "evidence",
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "evidence",
        sa.Column(
            "data_provenance",
            sa.String(length=40),
            nullable=False,
            server_default="controlled_test",
        ),
    )

    connection = op.get_bind()
    connection.execute(sa.text("UPDATE climate_data SET retrieved_at = observed_at WHERE retrieved_at IS NULL"))
    connection.execute(sa.text("UPDATE observations SET created_at = observed_at WHERE created_at IS NULL"))
    connection.execute(
        sa.text(
            "UPDATE evidence SET observed_at = "
            "(SELECT observations.observed_at FROM observations WHERE observations.id = evidence.observation_id) "
            "WHERE observed_at IS NULL"
        )
    )
    connection.execute(
        sa.text(
            "UPDATE climate_data SET data_provenance = "
            "CASE WHEN is_synthetic = :synthetic THEN :synthetic_demo ELSE :public_real END"
        ),
        {"synthetic": True, "synthetic_demo": "synthetic_demo", "public_real": "public_real"},
    )
    connection.execute(
        sa.text(
            "UPDATE observations SET data_provenance = "
            "CASE WHEN is_synthetic = :synthetic THEN :synthetic_demo ELSE :controlled_test END, "
            "synthetic_confirmed = CASE WHEN is_synthetic = :synthetic THEN :confirmed ELSE :not_confirmed END"
        ),
        {
            "synthetic": True,
            "synthetic_demo": "synthetic_demo",
            "controlled_test": "controlled_test",
            "confirmed": True,
            "not_confirmed": False,
        },
    )
    connection.execute(
        sa.text(
            "UPDATE evidence SET data_provenance = "
            "CASE WHEN is_synthetic = :synthetic THEN :synthetic_demo ELSE :controlled_test END"
        ),
        {"synthetic": True, "synthetic_demo": "synthetic_demo", "controlled_test": "controlled_test"},
    )

    with op.batch_alter_table("climate_data") as batch_op:
        batch_op.alter_column(
            "retrieved_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
    with op.batch_alter_table("observations") as batch_op:
        batch_op.alter_column(
            "created_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
    with op.batch_alter_table("evidence") as batch_op:
        batch_op.alter_column(
            "observed_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )

    project_id = connection.execute(
        sa.text("SELECT id FROM projects WHERE name = :name ORDER BY id LIMIT 1"),
        {"name": REFERENCE_PROJECT_NAME},
    ).scalar_one_or_none()
    if project_id is None:
        connection.execute(
            sa.text(
                "INSERT INTO projects (name, description, status, is_synthetic) "
                "VALUES (:name, :description, :status, :is_synthetic)"
            ),
            {
                "name": REFERENCE_PROJECT_NAME,
                "description": "Sprint 1A public climate and territorial observation pilot.",
                "status": "active",
                "is_synthetic": False,
            },
        )
        project_id = connection.execute(
            sa.text("SELECT id FROM projects WHERE name = :name ORDER BY id LIMIT 1"),
            {"name": REFERENCE_PROJECT_NAME},
        ).scalar_one()

    territory_exists = connection.execute(
        sa.text(
            "SELECT id FROM territories WHERE project_id = :project_id AND name = :name "
            "ORDER BY id LIMIT 1"
        ),
        {"project_id": project_id, "name": REFERENCE_TERRITORY_NAME},
    ).scalar_one_or_none()
    if territory_exists is None:
        connection.execute(
            sa.text(
                "INSERT INTO territories "
                "(project_id, name, country, province, latitude, longitude, is_synthetic) "
                "VALUES (:project_id, :name, :country, :province, :latitude, :longitude, :is_synthetic)"
            ),
            {
                "project_id": project_id,
                "name": REFERENCE_TERRITORY_NAME,
                "country": "Ecuador",
                "province": "Galapagos",
                "latitude": -0.9002,
                "longitude": -89.6127,
                "is_synthetic": False,
            },
        )


def downgrade() -> None:
    connection = op.get_bind()
    project_id = connection.execute(
        sa.text("SELECT id FROM projects WHERE name = :name ORDER BY id LIMIT 1"),
        {"name": REFERENCE_PROJECT_NAME},
    ).scalar_one_or_none()
    if project_id is not None:
        connection.execute(
            sa.text("DELETE FROM territories WHERE project_id = :project_id AND name = :name"),
            {"project_id": project_id, "name": REFERENCE_TERRITORY_NAME},
        )
        connection.execute(
            sa.text("DELETE FROM projects WHERE id = :project_id"),
            {"project_id": project_id},
        )

    op.drop_column("evidence", "data_provenance")
    op.drop_column("evidence", "observed_at")
    op.drop_column("evidence", "source_name")
    op.drop_column("observations", "synthetic_confirmed")
    op.drop_column("observations", "data_provenance")
    op.drop_column("observations", "responsible_role")
    op.drop_column("observations", "source_name")
    op.drop_column("observations", "created_at")
    op.drop_column("climate_data", "data_provenance")
    op.drop_column("climate_data", "weather_code")
    op.drop_column("climate_data", "apparent_temperature_c")
    op.drop_column("climate_data", "retrieved_at")
