"""Store MQTT smart-collar readings.

Revision ID: 0006_add_collar_readings
Revises: 0005_add_milk_kit_readings
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa


revision = "0006_add_collar_readings"
down_revision = "0005_add_milk_kit_readings"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "collar_readings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cow_id", sa.String(length=50), nullable=False),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        sa.Column("body_temperature", sa.Float(), nullable=False),
        sa.Column("ambient_temperature", sa.Float(), nullable=False),
        sa.Column("hall_raw", sa.Integer(), nullable=False),
        sa.Column("hall_distance_cm", sa.Float(), nullable=False),
        sa.Column("activity", sa.Float(), nullable=False),
        sa.Column("activity_status", sa.String(length=40), nullable=False),
        sa.Column("accel_x", sa.Float(), nullable=False),
        sa.Column("accel_y", sa.Float(), nullable=False),
        sa.Column("accel_z", sa.Float(), nullable=False),
        sa.Column("gyro_x", sa.Float(), nullable=False),
        sa.Column("gyro_y", sa.Float(), nullable=False),
        sa.Column("gyro_z", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("satellites", sa.Integer(), nullable=False),
        sa.Column("altitude", sa.Float(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_collar_readings_cow_id", "collar_readings", ["cow_id"])
    op.create_index("ix_collar_readings_device_id", "collar_readings", ["device_id"])
    op.create_index("ix_collar_readings_timestamp", "collar_readings", ["timestamp"])
    op.create_index("ix_collar_readings_cow_timestamp", "collar_readings", ["cow_id", "timestamp"])


def downgrade():
    op.drop_index("ix_collar_readings_cow_timestamp", table_name="collar_readings")
    op.drop_index("ix_collar_readings_timestamp", table_name="collar_readings")
    op.drop_index("ix_collar_readings_device_id", table_name="collar_readings")
    op.drop_index("ix_collar_readings_cow_id", table_name="collar_readings")
    op.drop_table("collar_readings")
