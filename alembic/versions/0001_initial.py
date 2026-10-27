"""initial IoT schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa
revision="0001_initial"; down_revision=None; branch_labels=None; depends_on=None
def upgrade():
    op.create_table("devices",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("name",sa.String(100),nullable=False,unique=True),sa.Column("device_type",sa.String(50),nullable=False),sa.Column("status",sa.String(20),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("sensors",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("device_id",sa.Integer(),sa.ForeignKey("devices.id"),nullable=False),sa.Column("sensor_type",sa.String(50),nullable=False),sa.Column("unit",sa.String(20),nullable=False),sa.Column("name",sa.String(100),nullable=False)); op.create_index("ix_sensors_device_id","sensors",["device_id"]); op.create_index("ix_sensors_sensor_type","sensors",["sensor_type"])
    op.create_table("sensor_readings",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("device_id",sa.Integer(),sa.ForeignKey("devices.id"),nullable=False),sa.Column("sensor_id",sa.Integer(),sa.ForeignKey("sensors.id")),sa.Column("sensor_type",sa.String(50),nullable=False),sa.Column("value",sa.Float(),nullable=False),sa.Column("unit",sa.String(20),nullable=False),sa.Column("timestamp",sa.DateTime(timezone=True),nullable=False),sa.Column("source",sa.String(30),nullable=False)); op.create_index("ix_sensor_readings_device_id","sensor_readings",["device_id"]); op.create_index("ix_sensor_readings_sensor_id","sensor_readings",["sensor_id"]); op.create_index("ix_sensor_readings_sensor_type","sensor_readings",["sensor_type"]); op.create_index("ix_sensor_readings_timestamp","sensor_readings",["timestamp"])
    op.create_table("location_readings",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("device_id",sa.Integer(),sa.ForeignKey("devices.id"),nullable=False),sa.Column("latitude",sa.Float(),nullable=False),sa.Column("longitude",sa.Float(),nullable=False),sa.Column("altitude",sa.Float()),sa.Column("speed",sa.Float()),sa.Column("timestamp",sa.DateTime(timezone=True),nullable=False)); op.create_index("ix_location_readings_device_id","location_readings",["device_id"]); op.create_index("ix_location_readings_timestamp","location_readings",["timestamp"])
    op.create_table("alert_thresholds",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("sensor_type",sa.String(50),nullable=False,unique=True),sa.Column("min_value",sa.Float()),sa.Column("max_value",sa.Float()),sa.Column("unit",sa.String(20),nullable=False),sa.Column("enabled",sa.Boolean(),nullable=False))
    op.create_table("alerts",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("device_id",sa.Integer(),sa.ForeignKey("devices.id")),sa.Column("sensor_reading_id",sa.Integer(),sa.ForeignKey("sensor_readings.id")),sa.Column("severity",sa.String(20),nullable=False),sa.Column("message",sa.Text(),nullable=False),sa.Column("status",sa.String(20),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False)); op.create_index("ix_alerts_device_id","alerts",["device_id"])
def downgrade():
    op.drop_table("alerts"); op.drop_table("alert_thresholds"); op.drop_table("location_readings"); op.drop_table("sensor_readings"); op.drop_table("sensors"); op.drop_table("devices")
