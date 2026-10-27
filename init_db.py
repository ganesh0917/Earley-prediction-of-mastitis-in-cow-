#!/usr/bin/env python3
"""Initialize the database and create all tables"""

from app.db import engine, Base
from app import models
from app.seed import seed

# Import all models to register them
models.User
models.UserProfile
models.Device
models.Sensor
models.SensorReading
models.LocationReading
models.AlertThreshold
models.Alert
models.HealthRecord
models.CattleProfile

# Create all tables
Base.metadata.create_all(bind=engine)
print("✓ Database initialized successfully")
print("✓ All tables created")

# Seed the database with test data
print("✓ Seeding database with test data...")
seed()
print("✓ Database seeded successfully")
