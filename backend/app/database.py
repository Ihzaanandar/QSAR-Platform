import os
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL from environment (PostgreSQL on Railway or SQLite fallback for local dev)
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # Ensure local data directory exists
    local_data_dir = Path(__file__).resolve().parent.parent / "data"
    local_data_dir.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{local_data_dir / 'qsar_platform.db'}"
elif DATABASE_URL.startswith("postgres://"):
    # Fix for older Railway / Heroku postgres:// schema URI
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# SQLite connect args
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(String(64), primary_key=True, index=True)
    source_type = Column(String(32), default="chembl")  # "chembl" or "upload"
    chembl_target_id = Column(String(64), nullable=True)
    target_name = Column(String(128), nullable=True)
    organism = Column(String(128), nullable=True)
    endpoint = Column(String(32), default="IC50")
    unit = Column(String(32), default="nM")
    status = Column(String(32), default="queued")  # queued, fetching_data, curating_data, preprocessing, training, evaluating, saving_model, completed, failed
    progress = Column(Integer, default=0)
    current_step = Column(String(128), default="Initializing")
    dataset_summary = Column(JSON, nullable=True)
    results_json = Column(JSON, nullable=True)
    saved_model_id = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class QSARModel(Base):
    __tablename__ = "models"

    id = Column(String(64), primary_key=True, index=True)
    model_name = Column(String(128), nullable=False)
    chembl_target_id = Column(String(64), nullable=False, index=True)
    target_name = Column(String(128), nullable=False)
    organism = Column(String(128), default="Homo sapiens")
    endpoint = Column(String(32), default="IC50")
    unit = Column(String(32), default="nM")
    algorithm = Column(String(64), nullable=False)
    version = Column(String(32), default="1.0.0")
    status = Column(String(32), default="available")  # available, archived, deprecated
    model_storage_path = Column(String(256), nullable=False)
    metrics_json = Column(JSON, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PredictionJob(Base):
    __tablename__ = "prediction_jobs"

    id = Column(String(64), primary_key=True, index=True)
    model_id = Column(String(64), nullable=False, index=True)
    input_filename = Column(String(256), nullable=False)
    total_compounds = Column(Integer, default=0)
    valid_compounds = Column(Integer, default=0)
    invalid_compounds = Column(Integer, default=0)
    duplicate_structures = Column(Integer, default=0)
    status = Column(String(32), default="completed")  # processing, completed, failed
    result_storage_path = Column(String(256), nullable=True)
    summary_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)

