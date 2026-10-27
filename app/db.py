from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import PROJECT_ROOT, get_settings

url = make_url(get_settings().database_url)
# SQLite needs special handling for concurrency
if url.get_backend_name() == "sqlite":
    # Resolve relative database paths against the project, not the launch directory.
    if url.database and url.database != ":memory:" and not Path(url.database).is_absolute():
        url = url.set(database=str((PROJECT_ROOT / url.database).resolve()))
    engine = create_engine(url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(url, pool_pre_ping=True)
    
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
class Base(DeclarativeBase): pass
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
