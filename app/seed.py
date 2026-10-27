from app.db import Base, engine, SessionLocal
from app.models import Device, Sensor, AlertThreshold, User, UserProfile
def seed():
    Base.metadata.create_all(engine)
    db=SessionLocal()
    try:
      threshold_defaults=[("temperature",37.5,39.5,"°C"),("ph",3.4,4.6,"pH"),("conductivity",3.4,4.6,"mS/cm"),("milk_temperature",28.4,29.6,"°C")]
      for sensor_type, min_value, max_value, unit in threshold_defaults:
        threshold=db.query(AlertThreshold).filter(AlertThreshold.sensor_type==sensor_type).first()
        if threshold:
          threshold.min_value=min_value; threshold.max_value=max_value; threshold.unit=unit; threshold.enabled=True
        else:
          db.add(AlertThreshold(sensor_type=sensor_type,min_value=min_value,max_value=max_value,unit=unit))
      db.flush()
      # Create test users if they don't exist
      if not db.query(User).filter(User.username == "farm123").first():
        user = User(username="farm123", role="farmer")
        user.set_password("123")
        db.add(user)
        db.flush()
        # Create user profile
        profile = UserProfile(user_id=user.id, first_name="Demo", last_name="Farmer", farm_id="FARM-123", total_cattle=10, health_status="Healthy")
        db.add(profile)
      
      # Create veterinarian test user
      if not db.query(User).filter(User.username == "vet123").first():
        vet_user = User(username="vet123", role="veterinarian")
        vet_user.set_password("123")
        db.add(vet_user)
        db.flush()
        # Create vet profile
        vet_profile = UserProfile(user_id=vet_user.id, first_name="Demo", last_name="Veterinarian", location="Central Clinic", health_status="Active")
        db.add(vet_profile)
      
      # Return if devices already seeded
      if db.query(Device).count(): 
        db.commit()
        return
      
      collar=Device(name="ESP32 Collar 001",device_type="collar"); kit=Device(name="ESP32 Milk Kit 001",device_type="milk_kit"); env=Device(name="Farm Environment API",device_type="environment")
      db.add_all([collar,kit,env]); db.flush()
      specs=[(collar,"temperature","°C","Internal temperature"),(collar,"activity","%","Activity"),(collar,"rumination","min/day","Rumination"),(kit,"ph","pH","Milk pH"),(kit,"conductivity","mS/cm","Conductivity"),(kit,"temperature","°C","Milk temperature"),(kit,"milk_yield","L","Milk yield"),(env,"humidity","%","Humidity"),(env,"soil_moisture","%","Soil moisture")]
      db.add_all([Sensor(device_id=d.id,sensor_type=t,unit=u,name=n) for d,t,u,n in specs]);  db.commit()
    finally: db.close()
if __name__=="__main__": seed()
