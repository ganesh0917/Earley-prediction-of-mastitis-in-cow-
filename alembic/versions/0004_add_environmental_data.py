"""Add stored environmental weather readings.

Revision ID: 0004_add_environmental_data
Revises: 0003_add_users_and_cattle
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_add_environmental_data"
down_revision = "0003_add_users_and_cattle"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "environmental_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("humidity", sa.Float(), nullable=False),
        sa.Column("rainfall", sa.Float(), nullable=False),
        sa.Column("wind_speed", sa.Float(), nullable=False),
        sa.Column("uv_index", sa.Float(), nullable=False),
        sa.Column("pressure", sa.Float(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_environmental_data_recorded_at", "environmental_data", ["recorded_at"])
    op.create_index(
        "ix_environmental_location_recorded_at",
        "environmental_data",
        ["latitude", "longitude", "recorded_at"],
    )


def downgrade():
    op.drop_index("ix_environmental_location_recorded_at", table_name="environmental_data")
    op.drop_index("ix_environmental_data_recorded_at", table_name="environmental_data")
    op.drop_table("environmental_data")
