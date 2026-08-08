"""Add auditable soft deletion for institutional observations.

Revision ID: 0006_soft_delete
Revises: 0005_sprint_1c_geo
Create Date: 2026-08-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_soft_delete"
down_revision: Union[str, None] = "0005_sprint_1c_geo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.add_column(
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.add_column(
            sa.Column(
                "deleted_by_id",
                sa.Integer(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column("deletion_reason", sa.String(length=500), nullable=True)
        )
        batch.create_foreign_key(
            "fk_observations_deleted_by_id_users",
            "users",
            ["deleted_by_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_constraint(
            "fk_observations_deleted_by_id_users",
            type_="foreignkey",
        )
        batch.drop_column("deletion_reason")
        batch.drop_column("deleted_by_id")
        batch.drop_column("deleted_at")
        batch.drop_column("is_deleted")
