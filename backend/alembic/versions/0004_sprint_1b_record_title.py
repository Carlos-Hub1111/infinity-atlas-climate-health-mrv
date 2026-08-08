"""Add the required short record title.

Revision ID: 0004_sprint_1b_title
Revises: 0003_sprint_1b
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_sprint_1b_title"
down_revision: Union[str, None] = "0003_sprint_1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "observations",
        sa.Column("record_title", sa.String(length=80), nullable=True),
    )
    connection = op.get_bind()
    observations = sa.table(
        "observations",
        sa.column("id", sa.Integer()),
        sa.column("record_title", sa.String(length=80)),
    )
    for observation_id in connection.execute(sa.select(observations.c.id)).scalars():
        connection.execute(
            observations.update()
            .where(observations.c.id == observation_id)
            .values(record_title=f"Observation #{observation_id}")
        )
    with op.batch_alter_table("observations") as batch:
        batch.alter_column(
            "record_title",
            existing_type=sa.String(length=80),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_column("record_title")
