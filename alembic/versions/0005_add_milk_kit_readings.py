"""Store MQTT milk-kit readings.

Revision ID: 0005_add_milk_kit_readings
Revises: 0004_add_environmental_data
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_add_milk_kit_readings"
down_revision = "0004_add_environmental_data"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "milk_kit_readings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cow_id", sa.String(length=50), nullable=False),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        sa.Column("ph", sa.Float(), nullable=False),
        sa.Column("conductivity", sa.Float(), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_milk_kit_readings_cow_id", "milk_kit_readings", ["cow_id"])
    op.create_index("ix_milk_kit_readings_device_id", "milk_kit_readings", ["device_id"])
    op.create_index("ix_milk_kit_readings_timestamp", "milk_kit_readings", ["timestamp"])
    op.create_index("ix_milk_kit_cow_timestamp", "milk_kit_readings", ["cow_id", "timestamp"])


def downgrade():
    op.drop_index("ix_milk_kit_cow_timestamp", table_name="milk_kit_readings")
    op.drop_index("ix_milk_kit_readings_timestamp", table_name="milk_kit_readings")
    op.drop_index("ix_milk_kit_readings_device_id", table_name="milk_kit_readings")
    op.drop_index("ix_milk_kit_readings_cow_id", table_name="milk_kit_readings")
    op.drop_table("milk_kit_readings")
