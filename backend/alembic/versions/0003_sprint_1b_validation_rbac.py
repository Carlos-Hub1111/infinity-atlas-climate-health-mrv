"""Add Sprint 1B authentication, validation, risk, and audit structures.

Revision ID: 0003_sprint_1b
Revises: 0002_sprint_1a
Create Date: 2026-07-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_sprint_1b"
down_revision: Union[str, None] = "0002_sprint_1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    def add_column_if_missing(table_name: str, column: sa.Column) -> None:
        existing = {item["name"] for item in inspector.get_columns(table_name)}
        if column.name not in existing:
            op.add_column(table_name, column)

    add_column_if_missing("users", sa.Column("username", sa.String(length=80), nullable=True))
    add_column_if_missing(
        "users", sa.Column("password_hash", sa.String(length=500), nullable=True)
    )
    add_column_if_missing(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    add_column_if_missing(
        "users", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True)
    )
    add_column_if_missing(
        "territories",
        sa.Column("timezone", sa.String(length=80), nullable=False, server_default="UTC"),
    )
    add_column_if_missing(
        "validations",
        sa.Column("previous_status", sa.String(length=40), nullable=True),
    )
    add_column_if_missing("risk_scores", sa.Column("hazard", sa.Integer(), nullable=True))
    add_column_if_missing("risk_scores", sa.Column("exposure", sa.Integer(), nullable=True))
    add_column_if_missing(
        "risk_scores", sa.Column("vulnerability", sa.Integer(), nullable=True)
    )
    add_column_if_missing(
        "risk_scores",
        sa.Column("data_provenance", sa.String(length=40), nullable=True),
    )
    add_column_if_missing(
        "risk_scores",
        sa.Column("calculated_by_id", sa.Integer(), nullable=True),
    )
    add_column_if_missing(
        "risk_scores",
        sa.Column(
            "is_clinical_diagnosis",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    connection.execute(
        sa.text(
            "UPDATE users SET username = 'legacy-user-' || id, "
            "password_hash = '!unusable-sprint-1b', is_active = :inactive, "
            "created_at = CURRENT_TIMESTAMP"
        ),
        {"inactive": False},
    )
    connection.execute(
        sa.text(
            "UPDATE territories SET timezone = "
            "CASE WHEN name IN ('San Cristobal', 'San Cristobal Demo Territory') "
            "THEN 'Pacific/Galapagos' ELSE 'UTC' END"
        )
    )
    connection.execute(
        sa.text("UPDATE validations SET previous_status = 'pending' WHERE previous_status IS NULL")
    )
    connection.execute(
        sa.text(
            "UPDATE risk_scores SET "
            "hazard = (SELECT observations.hazard FROM observations "
            "WHERE observations.id = risk_scores.observation_id), "
            "exposure = (SELECT observations.exposure FROM observations "
            "WHERE observations.id = risk_scores.observation_id), "
            "vulnerability = (SELECT observations.vulnerability FROM observations "
            "WHERE observations.id = risk_scores.observation_id), "
            "data_provenance = (SELECT observations.data_provenance FROM observations "
            "WHERE observations.id = risk_scores.observation_id)"
        )
    )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("username", existing_type=sa.String(length=80), nullable=False)
        batch_op.alter_column(
            "password_hash",
            existing_type=sa.String(length=500),
            nullable=False,
        )
        batch_op.alter_column(
            "created_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
        batch_op.create_unique_constraint("uq_users_username", ["username"])

    with op.batch_alter_table("validations") as batch_op:
        batch_op.alter_column(
            "previous_status",
            existing_type=sa.String(length=40),
            nullable=False,
        )

    with op.batch_alter_table("risk_scores") as batch_op:
        batch_op.alter_column("hazard", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("exposure", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("vulnerability", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column(
            "data_provenance",
            existing_type=sa.String(length=40),
            nullable=False,
        )
        batch_op.create_foreign_key(
            "fk_risk_scores_calculated_by_id_users",
            "users",
            ["calculated_by_id"],
            ["id"],
        )
        batch_op.drop_column("confidence_score")

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(length=80), nullable=False, unique=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_role", sa.String(length=80), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("previous_state", sa.String(length=80), nullable=True),
        sa.Column("new_state", sa.String(length=80), nullable=True),
        sa.Column("comment", sa.String(length=500), nullable=True),
        sa.Column("methodology_version", sa.String(length=80), nullable=True),
    )
    op.create_index(
        "ix_audit_events_entity",
        "audit_events",
        ["entity_type", "entity_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_events_entity", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("auth_sessions")

    with op.batch_alter_table("risk_scores") as batch_op:
        batch_op.add_column(
            sa.Column("confidence_score", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.drop_column("is_clinical_diagnosis")
        batch_op.drop_column("calculated_by_id")
        batch_op.drop_column("data_provenance")
        batch_op.drop_column("vulnerability")
        batch_op.drop_column("exposure")
        batch_op.drop_column("hazard")

    op.drop_column("validations", "previous_status")
    op.drop_column("territories", "timezone")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_username", type_="unique")
        batch_op.drop_column("created_at")
        batch_op.drop_column("is_active")
        batch_op.drop_column("password_hash")
        batch_op.drop_column("username")
