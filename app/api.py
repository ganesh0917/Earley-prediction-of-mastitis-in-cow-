from datetime import datetime, timedelta, timezone
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas
from app.services.environment import EnvironmentalProviderError, fetch_environment

router = APIRouter(prefix="/api/v1")
environment_router = APIRouter(prefix="/api")
def one(db, model, id):
    item = db.get(model, id)
    if not item: raise HTTPException(404, f"{model.__tablename__[:-1].title()} not found")
    return item
@router.get("/health")
def health(): return {"status": "ok"}

# User Authentication & Profile Management
@router.post("/auth/register", response_model=schemas.UserAuthOut, status_code=201)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.scalar(select(models.User).where(models.User.username == data.username)):
        raise HTTPException(409, "Username already exists")
    user = models.User(username=data.username, role=data.role)
    user.set_password(data.password)
    db.add(user)
    db.flush()
    profile = models.UserProfile(user_id=user.id, first_name=data.first_name, last_name=data.last_name)
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user

@router.post("/auth/login", response_model=schemas.UserAuthOut)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.username == data.username))
    if not user or not user.verify_password(data.password):
        raise HTTPException(401, "Invalid username or password")
    return user

@router.get("/users/{user_id}", response_model=schemas.UserAuthOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return one(db, models.User, user_id)

@router.get("/users/{user_id}/profile", response_model=schemas.UserProfileOut)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.scalar(select(models.UserProfile).where(models.UserProfile.user_id == user_id))
    if not profile: raise HTTPException(404, "Profile not found")
    return profile

@router.patch("/users/{user_id}/profile", response_model=schemas.UserProfileOut)
def update_user_profile(user_id: int, data: schemas.UserProfileIn, db: Session = Depends(get_db)):
    one(db, models.User, user_id)
    profile = db.scalar(select(models.UserProfile).where(models.UserProfile.user_id == user_id))
    if not profile: raise HTTPException(404, "Profile not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/devices", response_model=list[schemas.DeviceOut])
def list_devices(db: Session = Depends(get_db)): return db.scalars(select(models.Device).order_by(models.Device.id)).all()
@router.post("/devices", response_model=schemas.DeviceOut, status_code=201)
def create_device(data: schemas.DeviceIn, db: Session = Depends(get_db)):
    item=models.Device(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@router.get("/devices/{device_id}", response_model=schemas.DeviceOut)
def get_device(device_id:int, db:Session=Depends(get_db)): return one(db, models.Device, device_id)
@router.get("/sensors", response_model=list[schemas.SensorOut])
def list_sensors(device_id:int|None=None, db:Session=Depends(get_db)):
    q=select(models.Sensor); q=q.where(models.Sensor.device_id==device_id) if device_id else q; return db.scalars(q).all()
@router.post("/sensors", response_model=schemas.SensorOut, status_code=201)
def create_sensor(data:schemas.SensorIn, db:Session=Depends(get_db)):
    one(db, models.Device, data.device_id); item=models.Sensor(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
def check_alert(db, reading):
    threshold_type=reading.sensor_type
    if reading.sensor_type=="temperature":
        device=db.get(models.Device, reading.device_id)
        if device and device.device_type=="milk_kit": threshold_type="milk_temperature"
    t=db.scalar(select(models.AlertThreshold).where(models.AlertThreshold.sensor_type==threshold_type))
    if t and t.enabled and ((t.min_value is not None and reading.value<t.min_value) or (t.max_value is not None and reading.value>t.max_value)):
        db.add(models.Alert(device_id=reading.device_id, sensor_reading_id=reading.id, severity="warning", message=f"{reading.sensor_type} reading {reading.value} {reading.unit} is outside configured limits"))
@router.post("/readings", response_model=schemas.ReadingOut, status_code=201)
def create_reading(data:schemas.ReadingIn, db:Session=Depends(get_db)):
    one(db, models.Device, data.device_id)
    if data.sensor_id: one(db, models.Sensor, data.sensor_id)
    values=data.model_dump(); values["timestamp"] = values["timestamp"] or datetime.now(timezone.utc)
    item=models.SensorReading(**values); db.add(item); db.flush(); check_alert(db,item); db.commit(); db.refresh(item); return item
@router.get("/readings/current", response_model=list[schemas.ReadingOut])
def current_readings(device_id:int|None=None, db:Session=Depends(get_db)):
    q=select(models.SensorReading).order_by(models.SensorReading.timestamp.desc()); rows=db.scalars(q).all(); seen=set(); out=[]
    for r in rows:
        key=(r.device_id,r.sensor_type)
        if (device_id is None or r.device_id==device_id) and key not in seen: seen.add(key); out.append(r)
    return out
@router.get("/readings/history", response_model=list[schemas.ReadingOut])
def history(device_id:int|None=None, sensor_type:str|None=None, start:datetime|None=None, end:datetime|None=None, limit:int=Query(500,le=2000), db:Session=Depends(get_db)):
    q=select(models.SensorReading)
    if device_id: q=q.where(models.SensorReading.device_id==device_id)
    if sensor_type: q=q.where(models.SensorReading.sensor_type==sensor_type)
    if start: q=q.where(models.SensorReading.timestamp>=start)
    if end: q=q.where(models.SensorReading.timestamp<=end)
    return db.scalars(q.order_by(models.SensorReading.timestamp.desc()).limit(limit)).all()

@router.get("/cows/{cow_id}/milk/latest", response_model=schemas.MilkKitReadingOut)
def latest_milk_reading(cow_id: str, db: Session = Depends(get_db)):
    reading = db.scalar(select(models.MilkKitReading).where(models.MilkKitReading.cow_id == cow_id).order_by(models.MilkKitReading.timestamp.desc()))
    if not reading:
        raise HTTPException(404, "No milk-kit reading is available for this cow.")
    return reading

@router.get("/cows/{cow_id}/collar/latest", response_model=schemas.CollarReadingOut)
def latest_collar_reading(cow_id: str, db: Session = Depends(get_db)):
    reading = db.scalar(
        select(models.CollarReading)
        .where(models.CollarReading.cow_id == cow_id)
        .order_by(models.CollarReading.timestamp.desc())
    )
    if not reading:
        raise HTTPException(404, "No collar reading is available for this cow.")
    return reading

@router.get("/cows/{cow_id}/milk/history", response_model=list[schemas.MilkKitReadingOut])
def milk_reading_history(
    cow_id: str,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    if start and end and start > end:
        raise HTTPException(422, "The start time must be before the end time.")
    query = select(models.MilkKitReading).where(models.MilkKitReading.cow_id == cow_id)
    if start:
        query = query.where(models.MilkKitReading.timestamp >= start)
    if end:
        query = query.where(models.MilkKitReading.timestamp <= end)
    return db.scalars(query.order_by(models.MilkKitReading.timestamp.desc()).limit(limit)).all()
@router.post("/locations", response_model=schemas.LocationOut, status_code=201)
def create_location(data:schemas.LocationIn, db:Session=Depends(get_db)):
    one(db,models.Device,data.device_id); values=data.model_dump(); values["timestamp"] = values["timestamp"] or datetime.now(timezone.utc); item=models.LocationReading(**values); db.add(item); db.commit(); db.refresh(item); return item
@router.get("/locations/current", response_model=list[schemas.LocationOut])
def current_locations(device_id:int|None=None, db:Session=Depends(get_db)):
    q=select(models.LocationReading).order_by(models.LocationReading.timestamp.desc()); seen=set(); out=[]
    for r in db.scalars(q):
        if (device_id is None or r.device_id==device_id) and r.device_id not in seen: seen.add(r.device_id); out.append(r)
    return out
@router.get("/locations/history", response_model=list[schemas.LocationOut])
def location_history(device_id:int, limit:int=Query(500,le=2000), db:Session=Depends(get_db)): return db.scalars(select(models.LocationReading).where(models.LocationReading.device_id==device_id).order_by(models.LocationReading.timestamp.desc()).limit(limit)).all()
@router.get("/environment/current", response_model=schemas.EnvironmentalCurrent)
async def environment_current(db:Session=Depends(get_db)):
    env=await fetch_environment(); dev=db.scalar(select(models.Device).where(models.Device.device_type=="environment"))
    if dev:
        for key, unit in [("temperature","°C"),("humidity","%"),("pressure","hPa"),("rain","mm"),("cloud_cover","%")]:
            value=getattr(env,key)
            if value is not None: db.add(models.SensorReading(device_id=dev.id,sensor_type=key,value=value,unit=unit,timestamp=env.timestamp,source=env.source))
        for key, unit in [("wind_speed", "m/s"), ("uv_index", "index")]:
            value=getattr(env,key)
            if value is not None: db.add(models.SensorReading(device_id=dev.id,sensor_type=key,value=value,unit=unit,timestamp=env.timestamp,source=env.source))
        db.commit()
    return env
@router.get("/environment/history", response_model=list[schemas.ReadingOut])
def environment_history(sensor_type:str|None=None, limit:int=Query(500,le=2000), db:Session=Depends(get_db)):
    q=select(models.SensorReading).where(models.SensorReading.source!="simulated")
    if sensor_type:q=q.where(models.SensorReading.sensor_type==sensor_type)
    return db.scalars(q.order_by(models.SensorReading.timestamp.desc()).limit(limit)).all()
@environment_router.get("/environment", response_model=schemas.EnvironmentalSnapshot)
async def get_environmental_data(
    latitude: float = Query(..., ge=-90, le=90, allow_inf_nan=False),
    longitude: float = Query(..., ge=-180, le=180, allow_inf_nan=False),
):
    try:
        current = await fetch_environment(latitude, longitude)
    except EnvironmentalProviderError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return schemas.EnvironmentalSnapshot(
        latitude=current.latitude,
        longitude=current.longitude,
        temperature=current.temperature,
        humidity=current.humidity,
        rainfall=current.rain,
        wind_speed=current.wind_speed,
        uv_index=current.uv_index,
        pressure=current.pressure,
        timestamp=current.timestamp,
    )


@environment_router.post("/environment/save", response_model=schemas.EnvironmentalReadingOut, status_code=201)
def save_environmental_data(data: schemas.EnvironmentalReadingIn, db: Session = Depends(get_db)):
    values = data.model_dump(exclude={"timestamp"})
    reading = models.EnvironmentalData(
        **values,
        recorded_at=data.timestamp or datetime.now(timezone.utc),
    )
    try:
        db.add(reading)
        db.commit()
        db.refresh(reading)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(500, "Unable to store environmental data.") from exc
    return reading


@environment_router.get("/environment/history", response_model=list[schemas.EnvironmentalReadingOut])
def environmental_data_history(
    latitude: float | None = Query(None, ge=-90, le=90, allow_inf_nan=False),
    longitude: float | None = Query(None, ge=-180, le=180, allow_inf_nan=False),
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    if start and end and start > end:
        raise HTTPException(422, "The start time must be before the end time.")
    query = select(models.EnvironmentalData)
    if latitude is not None:
        query = query.where(models.EnvironmentalData.latitude == latitude)
    if longitude is not None:
        query = query.where(models.EnvironmentalData.longitude == longitude)
    if start:
        query = query.where(models.EnvironmentalData.recorded_at >= start)
    if end:
        query = query.where(models.EnvironmentalData.recorded_at <= end)
    try:
        return db.scalars(query.order_by(models.EnvironmentalData.recorded_at.desc()).limit(limit)).all()
    except SQLAlchemyError as exc:
        raise HTTPException(500, "Unable to retrieve environmental history.") from exc


@router.get("/alerts", response_model=list[schemas.AlertOut])
def alerts(status:str|None=None, db:Session=Depends(get_db)):
    q=select(models.Alert)
    if status:q=q.where(models.Alert.status==status)
    return db.scalars(q.order_by(models.Alert.created_at.desc())).all()
@router.patch("/alerts/{alert_id}/resolve", response_model=schemas.AlertOut)
def resolve_alert(alert_id:int, db:Session=Depends(get_db)):
    item=one(db,models.Alert,alert_id); item.status="resolved"; db.commit(); db.refresh(item); return item
@router.get("/alert-thresholds", response_model=list[schemas.ThresholdOut])
def thresholds(db:Session=Depends(get_db)): return db.scalars(select(models.AlertThreshold)).all()
@router.post("/alert-thresholds", response_model=schemas.ThresholdOut, status_code=201)
def create_threshold(data:schemas.ThresholdIn, db:Session=Depends(get_db)):
    item=models.AlertThreshold(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@router.post("/simulate", status_code=201)
def simulate(count:int=Query(1,ge=1,le=100), db:Session=Depends(get_db)):
    devices=db.scalars(select(models.Device)).all()
    if not devices: raise HTTPException(400,"Create devices/sensors first, or run seed")
    sensors=db.scalars(select(models.Sensor)).all(); now=datetime.now(timezone.utc); created=0
    ranges={"temperature":(37.5,39.5),"activity":(40,90),"rumination":(300,600),"ph":(3.4,4.6),"conductivity":(3.4,4.6),"milk_yield":(5,18),"humidity":(50,85),"soil_moisture":(25,55)}
    for i in range(count):
        for s in sensors:
            low,high=(28.4,29.6) if s.sensor_type=="temperature" and s.device.device_type=="milk_kit" else ranges.get(s.sensor_type,(0,100)); r=models.SensorReading(device_id=s.device_id,sensor_id=s.id,sensor_type=s.sensor_type,value=round(random.uniform(low,high),2),unit=s.unit,timestamp=now-timedelta(minutes=i*5),source="simulated"); db.add(r); db.flush(); check_alert(db,r); created+=1
        collar=next((d for d in devices if d.device_type=="collar"),None)
        if collar: db.add(models.LocationReading(device_id=collar.id,latitude=11.0168+random.uniform(-.003,.003),longitude=76.9558+random.uniform(-.003,.003),altitude=430,speed=random.uniform(0,4),timestamp=now-timedelta(minutes=i*5)))
    db.commit(); return {"created_readings":created}

@router.get("/health-records", response_model=list[schemas.HealthRecordOut])
def list_health_records(device_id:int|None=None, db:Session=Depends(get_db)):
    q=select(models.HealthRecord)
    if device_id: q=q.where(models.HealthRecord.device_id==device_id)
    return db.scalars(q.order_by(models.HealthRecord.date.desc())).all()

@router.post("/health-records", response_model=schemas.HealthRecordOut, status_code=201)
def create_health_record(data:schemas.HealthRecordIn, db:Session=Depends(get_db)):
    one(db, models.Device, data.device_id)
    item=models.HealthRecord(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item

@router.get("/health-records/{record_id}", response_model=schemas.HealthRecordOut)
def get_health_record(record_id:int, db:Session=Depends(get_db)):
    return one(db, models.HealthRecord, record_id)

@router.patch("/health-records/{record_id}", response_model=schemas.HealthRecordOut)
def update_health_record(record_id:int, data:schemas.HealthRecordIn, db:Session=Depends(get_db)):
    item=one(db, models.HealthRecord, record_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item

@router.delete("/health-records/{record_id}", status_code=204)
def delete_health_record(record_id:int, db:Session=Depends(get_db)):
    item=one(db, models.HealthRecord, record_id)
    db.delete(item); db.commit()

@router.get("/cattle-profiles", response_model=list[schemas.CattleProfileOut])
def list_cattle_profiles(device_id:int|None=None, db:Session=Depends(get_db)):
    q=select(models.CattleProfile)
    if device_id: q=q.where(models.CattleProfile.device_id==device_id)
    return db.scalars(q.order_by(models.CattleProfile.updated_at.desc())).all()

@router.post("/cattle-profiles", response_model=schemas.CattleProfileOut, status_code=201)
def create_cattle_profile(data:schemas.CattleProfileIn, db:Session=Depends(get_db)):
    one(db, models.Device, data.device_id)
    item=models.CattleProfile(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item

@router.get("/cattle-profiles/{cattle_id}", response_model=schemas.CattleProfileOut)
def get_cattle_profile(cattle_id:int, db:Session=Depends(get_db)):
    return one(db, models.CattleProfile, cattle_id)

@router.patch("/cattle-profiles/{cattle_id}", response_model=schemas.CattleProfileOut)
def update_cattle_profile(cattle_id:int, data:schemas.CattleProfileIn, db:Session=Depends(get_db)):
    item=one(db, models.CattleProfile, cattle_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item

@router.delete("/cattle-profiles/{cattle_id}", status_code=204)
def delete_cattle_profile(cattle_id:int, db:Session=Depends(get_db)):
    item=one(db, models.CattleProfile, cattle_id)
    db.delete(item); db.commit()
