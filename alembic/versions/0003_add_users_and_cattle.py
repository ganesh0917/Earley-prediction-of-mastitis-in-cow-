"""Add user, profile, and cattle models

Revision ID: 0003_add_users_and_cattle
Revises: 0002_add_health_records
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_add_users_and_cattle"
down_revision = "0002_add_health_records"
branch_labels = None
depends_on = None

def upgrade():
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"])

    # Create user_profiles table
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("email", sa.String(150), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("farm_id", sa.String(50), nullable=True, unique=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("total_cattle", sa.Integer(), nullable=True),
        sa.Column("health_status", sa.String(50), nullable=False, server_default="Healthy"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])
    op.create_index("ix_user_profiles_email", "user_profiles", ["email"])

    # Create cattle_profiles table
    op.create_table(
        "cattle_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("age", sa.String(50), nullable=True),
        sa.Column("breed", sa.String(100), nullable=True),
        sa.Column("cattle_id", sa.String(50), nullable=False, unique=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="Healthy"),
        sa.Column("health_score", sa.Integer(), nullable=True),
        sa.Column("milk_yield", sa.String(50), nullable=True),
        sa.Column("lactation", sa.String(50), nullable=True),
        sa.Column("disease_history", sa.String(255), nullable=True),
        sa.Column("vaccination", sa.String(255), nullable=True),
        sa.Column("last_milk_test", sa.String(255), nullable=True),
        sa.Column("feeding_practices", sa.String(255), nullable=True),
        sa.Column("milking_schedule", sa.String(255), nullable=True),
        sa.Column("health_risk", sa.String(50), nullable=True),
        sa.Column("scc_count", sa.String(100), nullable=True),
        sa.Column("vet_interventions", sa.String(255), nullable=True),
        sa.Column("last_checkup", sa.String(10), nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cattle_profiles_device_id", "cattle_profiles", ["device_id"])
    op.create_index("ix_cattle_profiles_cattle_id", "cattle_profiles", ["cattle_id"])

def downgrade():
    op.drop_table("cattle_profiles")
    op.drop_table("user_profiles")
    op.drop_table("users")
