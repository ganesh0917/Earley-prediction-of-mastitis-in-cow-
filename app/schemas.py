from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class ORM(BaseModel): model_config = ConfigDict(from_attributes=True)
class DeviceIn(BaseModel): name: str = Field(min_length=1, max_length=100); device_type: str; status: str = "active"
class DeviceOut(DeviceIn, ORM): id: int; created_at: datetime
class SensorIn(BaseModel): device_id: int; sensor_type: str; unit: str; name: str
class SensorOut(SensorIn, ORM): id: int
class ReadingIn(BaseModel): device_id: int; sensor_id: int | None = None; sensor_type: str; value: float; unit: str; timestamp: datetime | None = None; source: str = "api"
class ReadingOut(ReadingIn, ORM): id: int; timestamp: datetime
class LocationIn(BaseModel): device_id: int; latitude: float = Field(ge=-90, le=90); longitude: float = Field(ge=-180, le=180); altitude: float | None = None; speed: float | None = Field(default=None, ge=0); timestamp: datetime | None = None
class LocationOut(LocationIn, ORM): id: int; timestamp: datetime
class ThresholdIn(BaseModel): sensor_type: str; min_value: float | None = None; max_value: float | None = None; unit: str; enabled: bool = True
class ThresholdOut(ThresholdIn, ORM): id: int
class AlertOut(ORM): id: int; device_id: int | None; sensor_reading_id: int | None; severity: str; message: str; status: str; created_at: datetime
class EnvironmentalReadingIn(BaseModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    temperature: float = Field(allow_inf_nan=False)
    humidity: float = Field(ge=0, le=100, allow_inf_nan=False)
    rainfall: float = Field(ge=0, allow_inf_nan=False)
    wind_speed: float = Field(ge=0, allow_inf_nan=False)
    uv_index: float = Field(ge=0, allow_inf_nan=False)
    pressure: float = Field(gt=0, allow_inf_nan=False)
    timestamp: datetime | None = None

class EnvironmentalReadingOut(ORM):
    latitude: float
    longitude: float
    temperature: float
    humidity: float
    rainfall: float
    wind_speed: float
    uv_index: float
    pressure: float
    id: int
    recorded_at: datetime

class EnvironmentalSnapshot(BaseModel):
    latitude: float
    longitude: float
    temperature: float
    humidity: float
    rainfall: float
    wind_speed: float
    uv_index: float
    pressure: float
    timestamp: datetime

class EnvironmentalCurrent(BaseModel):
    latitude: float
    longitude: float
    temperature: float
    humidity: float
    pressure: float
    rain: float
    cloud_cover: float | None = None
    wind_speed: float
    uv_index: float
    timestamp: datetime
    source: str

class MilkKitPayload(BaseModel):
    cow_id: str = Field(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    device_id: str = Field(min_length=1, max_length=100)
    sensor: str = "milk_kit"
    ph: float = Field(ge=0, le=14, allow_inf_nan=False)
    conductivity: float = Field(ge=0, allow_inf_nan=False)
    temperature: float = Field(ge=-20, le=100, allow_inf_nan=False)
    risk_score: int = Field(ge=0)
    status: str = Field(min_length=1, max_length=40)

class MilkKitReadingOut(ORM):
    id: int
    cow_id: str
    device_id: str
    ph: float
    conductivity: float
    temperature: float
    risk_score: int
    status: str
    timestamp: datetime

class CollarPayload(BaseModel):
    cow_id: str = Field(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    device_id: str = Field(min_length=1, max_length=100)
    sensor: str = "cow_collar"
    body_temperature: float = Field(allow_inf_nan=False)
    ambient_temperature: float = Field(allow_inf_nan=False)
    hall_raw: int = Field(ge=0, le=4095)
    hall_distance_cm: float = Field(ge=0, le=4, allow_inf_nan=False)
    activity: float = Field(ge=0, allow_inf_nan=False)
    activity_status: str = Field(pattern=r"^(RESTING|LOW_ACTIVITY|NORMAL_ACTIVITY|HIGH_ACTIVITY)$")
    accel_x: float = Field(allow_inf_nan=False)
    accel_y: float = Field(allow_inf_nan=False)
    accel_z: float = Field(allow_inf_nan=False)
    gyro_x: float = Field(allow_inf_nan=False)
    gyro_y: float = Field(allow_inf_nan=False)
    gyro_z: float = Field(allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    satellites: int = Field(ge=0)
    altitude: float = Field(allow_inf_nan=False)

class CollarReadingOut(ORM):
    id: int
    cow_id: str
    device_id: str
    sensor: str = "cow_collar"
    body_temperature: float
    ambient_temperature: float
    hall_raw: int
    hall_distance_cm: float
    activity: float
    activity_status: str
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    latitude: float
    longitude: float
    satellites: int
    altitude: float
    timestamp: datetime

class HealthRecordIn(BaseModel): device_id: int; date: str; disease: str; antibiotic: str; dosage: str; status: str = "Active"; notes: str | None = None
class HealthRecordOut(HealthRecordIn, ORM): id: int; created_at: datetime; updated_at: datetime
class UserLogin(BaseModel): username: str; password: str
class UserRegister(BaseModel): username: str; password: str; role: str; first_name: str | None = None; last_name: str | None = None
class UserAuthOut(ORM): id: int; username: str; role: str; created_at: datetime
class UserProfileIn(BaseModel): first_name: str | None = None; last_name: str | None = None; email: str | None = None; phone: str | None = None; farm_id: str | None = None; location: str | None = None; total_cattle: int | None = None; health_status: str = "Healthy"
class UserProfileOut(UserProfileIn, ORM): id: int; user_id: int; created_at: datetime; updated_at: datetime
class CattleProfileIn(BaseModel): device_id: int; name: str; age: str | None = None; breed: str | None = None; cattle_id: str; status: str = "Healthy"; health_score: int | None = None; milk_yield: str | None = None; lactation: str | None = None; disease_history: str | None = None; vaccination: str | None = None; last_milk_test: str | None = None; feeding_practices: str | None = None; milking_schedule: str | None = None; health_risk: str | None = None; scc_count: str | None = None; vet_interventions: str | None = None; last_checkup: str | None = None; location: str | None = None
class CattleProfileOut(CattleProfileIn, ORM): id: int; created_at: datetime; updated_at: datetime
