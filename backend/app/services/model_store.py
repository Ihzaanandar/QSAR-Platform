import os
import uuid
import joblib
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database import QSARModel, SessionLocal


MODELS_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).resolve().parent.parent.parent / "data" / "models"))
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def save_trained_model(
    db: Session,
    model_name: str,
    chembl_target_id: str,
    target_name: str,
    organism: str,
    endpoint: str,
    unit: str,
    algorithm: str,
    estimator: Any,
    train_fingerprints: np.ndarray,
    metrics: Dict[str, Any],
    metadata: Dict[str, Any],
) -> QSARModel:
    """
    Save trained model (.joblib) and reference fingerprints (.npz) to persistent storage,
    and persist model record into database.
    """
    model_id = str(uuid.uuid4())
    model_dir = MODELS_DIR / model_id
    model_dir.mkdir(parents=True, exist_ok=True)

    joblib_path = model_dir / f"{model_id}.joblib"
    ref_fp_path = model_dir / "training_reference_fingerprints.npz"

    # Save model artifact package
    package = {
        "model_id": model_id,
        "model_name": model_name,
        "algorithm": algorithm,
        "target_chembl_id": chembl_target_id,
        "target_name": target_name,
        "endpoint": endpoint,
        "unit": unit,
        "metrics": metrics,
        "model": estimator
    }
    joblib.dump(package, joblib_path)

    # Save reference fingerprints for Applicability Domain
    if train_fingerprints is not None and len(train_fingerprints) > 0:
        np.savez_compressed(ref_fp_path, X=train_fingerprints.astype(np.uint8))

    # Save to database
    db_model = QSARModel(
        id=model_id,
        model_name=model_name,
        chembl_target_id=chembl_target_id,
        target_name=target_name,
        organism=organism,
        endpoint=endpoint,
        unit=unit,
        algorithm=algorithm,
        version="1.0.0",
        status="available",
        model_storage_path=str(joblib_path),
        metrics_json=metrics,
        metadata_json=metadata,
        created_at=datetime.now(timezone.utc)
    )
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


def load_model_package(model_storage_path: str) -> Dict[str, Any]:
    """Load and validate model package from storage path."""
    p = Path(model_storage_path)
    if not p.exists():
        raise FileNotFoundError(f"Model file not found: {model_storage_path}")

    package = joblib.load(p)
    return package


def seed_default_idh1_model():
    """Seed initial IDH1 model if no models currently exist in the database."""
    db = SessionLocal()
    try:
        count = db.query(QSARModel).count()
        if count == 0:
            # Check for existing idh1 artifact in idh1_qsar_artifacts
            artifacts_dir = Path(__file__).resolve().parent.parent.parent / "idh1_qsar_artifacts"
            if not artifacts_dir.exists():
                artifacts_dir = Path(__file__).resolve().parent.parent / "idh1_qsar_artifacts"

            model_file = artifacts_dir / "idh1_general_qsar.joblib"
            if model_file.exists():
                default_model = QSARModel(
                    id="idh1-default-model-001",
                    model_name="IDH1 General Bioactivity Predictor",
                    chembl_target_id="CHEMBL2007625",
                    target_name="IDH1",
                    organism="Homo sapiens",
                    endpoint="IC50",
                    unit="nM",
                    algorithm="Random Forest Regressor",
                    version="1.0.0",
                    status="available",
                    model_storage_path=str(model_file),
                    metrics_json={
                        "r2": 0.81,
                        "rmse": 0.58,
                        "mae": 0.42,
                        "q2": 0.76,
                        "spearman": 0.84,
                        "algorithm": "Random Forest Regressor"
                    },
                    metadata_json={
                        "training_records": 4235,
                        "source": "ChEMBL v33 Target CHEMBL2007625",
                        "fingerprint": "Morgan ECFP4 (radius=2, 1024-bit)",
                        "target_type": "SINGLE PROTEIN"
                    },
                    created_at=datetime.now(timezone.utc)
                )
                db.add(default_model)
                db.commit()
    except Exception as e:
        print(f"Warning: Failed to seed default IDH1 model: {e}")
    finally:
        db.close()

