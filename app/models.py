from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base
import hashlib

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))  # farmer or veterinarian
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    profile: Mapped["UserProfile"] = relationship(back_populates="user", cascade="all, delete-orphan")
    
    def set_password(self, password: str):
        """Hash and set password"""
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(150), nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    farm_id: Mapped[str] = mapped_column(String(50), nullable=True, unique=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    total_cattle: Mapped[int | None] = mapped_column(Integer, nullable=True)
    health_status: Mapped[str] = mapped_column(String(50), default="Healthy")  # Healthy, Monitoring, Alert
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    user: Mapped["User"] = relationship(back_populates="profile")

class Device(Base):
    __tablename__ = "devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    device_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    sensors: Mapped[list["Sensor"]] = relationship(back_populates="device", cascade="all, delete-orphan")
class Sensor(Base):
    __tablename__ = "sensors"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    sensor_type: Mapped[str] = mapped_column(String(50), index=True)
    unit: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(100))
    device: Mapped[Device] = relationship(back_populates="sensors")
class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    sensor_id: Mapped[int | None] = mapped_column(ForeignKey("sensors.id"), nullable=True, index=True)
    sensor_type: Mapped[str] = mapped_column(String(50), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    source: Mapped[str] = mapped_column(String(30), default="simulated")
class LocationReading(Base):
    __tablename__ = "location_readings"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    altitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
class AlertThreshold(Base):
    __tablename__ = "alert_thresholds"
    id: Mapped[int] = mapped_column(primary_key=True)
    sensor_type: Mapped[str] = mapped_column(String(50), unique=True)
    min_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True, index=True)
    sensor_reading_id: Mapped[int | None] = mapped_column(ForeignKey("sensor_readings.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="warning")
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class HealthRecord(Base):
    __tablename__ = "health_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD format
    disease: Mapped[str] = mapped_column(String(100))
    antibiotic: Mapped[str] = mapped_column(String(100))
    dosage: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="Active")
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class CattleProfile(Base):
    __tablename__ = "cattle_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[str] = mapped_column(String(50), nullable=True)
    breed: Mapped[str] = mapped_column(String(100), nullable=True)
    cattle_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="Healthy")  # Healthy, Monitoring, Alert
    health_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    milk_yield: Mapped[str] = mapped_column(String(50), nullable=True)
    lactation: Mapped[str] = mapped_column(String(50), nullable=True)
    disease_history: Mapped[str] = mapped_column(String(255), nullable=True)
    vaccination: Mapped[str] = mapped_column(String(255), nullable=True)
    last_milk_test: Mapped[str] = mapped_column(String(255), nullable=True)
    feeding_practices: Mapped[str] = mapped_column(String(255), nullable=True)
    milking_schedule: Mapped[str] = mapped_column(String(255), nullable=True)
    health_risk: Mapped[str] = mapped_column(String(50), nullable=True)
    scc_count: Mapped[str] = mapped_column(String(100), nullable=True)
    vet_interventions: Mapped[str] = mapped_column(String(255), nullable=True)
    last_checkup: Mapped[str] = mapped_column(String(10), nullable=True)
    location: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class EnvironmentalData(Base):
    __tablename__ = "environmental_data"
    __table_args__ = (Index("ix_environmental_location_recorded_at", "latitude", "longitude", "recorded_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    rainfall: Mapped[float] = mapped_column(Float, nullable=False)
    wind_speed: Mapped[float] = mapped_column(Float, nullable=False)
    uv_index: Mapped[float] = mapped_column(Float, nullable=False)
    pressure: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

class MilkKitReading(Base):
    __tablename__ = "milk_kit_readings"
    __table_args__ = (Index("ix_milk_kit_cow_timestamp", "cow_id", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cow_id: Mapped[str] = mapped_column(String(50), index=True)
    device_id: Mapped[str] = mapped_column(String(100), index=True)
    ph: Mapped[float] = mapped_column(Float)
    conductivity: Mapped[float] = mapped_column(Float)
    temperature: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

class CollarReading(Base):
    __tablename__ = "collar_readings"
    __table_args__ = (Index("ix_collar_readings_cow_timestamp", "cow_id", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cow_id: Mapped[str] = mapped_column(String(50), index=True)
    device_id: Mapped[str] = mapped_column(String(100), index=True)
    body_temperature: Mapped[float] = mapped_column(Float)
    ambient_temperature: Mapped[float] = mapped_column(Float)
    hall_raw: Mapped[int] = mapped_column(Integer)
    hall_distance_cm: Mapped[float] = mapped_column(Float)
    activity: Mapped[float] = mapped_column(Float)
    activity_status: Mapped[str] = mapped_column(String(40))
    accel_x: Mapped[float] = mapped_column(Float)
    accel_y: Mapped[float] = mapped_column(Float)
    accel_z: Mapped[float] = mapped_column(Float)
    gyro_x: Mapped[float] = mapped_column(Float)
    gyro_y: Mapped[float] = mapped_column(Float)
    gyro_z: Mapped[float] = mapped_column(Float)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    satellites: Mapped[int] = mapped_column(Integer)
    altitude: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
