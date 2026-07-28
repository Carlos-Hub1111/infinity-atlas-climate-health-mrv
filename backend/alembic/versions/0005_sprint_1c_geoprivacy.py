"""Add configurable public geolocation privacy.

Revision ID: 0005_sprint_1c_geo
Revises: 0004_sprint_1b_title
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_sprint_1c_geo"
down_revision: Union[str, None] = "0004_sprint_1b_title"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "observations",
        sa.Column(
            "public_location_mode",
            sa.String(length=20),
            nullable=False,
            server_default="approximate",
        ),
    )


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_column("public_location_mode")
