"""Add health records table

Revision ID: 0002_add_health_records
Revises: 0001_initial
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_add_health_records"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "health_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("disease", sa.String(100), nullable=False),
        sa.Column("antibiotic", sa.String(100), nullable=False),
        sa.Column("dosage", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_health_records_device_id", "health_records", ["device_id"])

def downgrade():
    op.drop_table("health_records")
