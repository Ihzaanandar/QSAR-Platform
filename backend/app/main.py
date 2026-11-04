import io
import os
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, status, Query, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
import pandas as pd

from app.database import init_db, SessionLocal, QSARModel, TrainingJob, PredictionJob
from app.schemas.dataset import ApiResponseSuccess, ApiResponseError, DatasetSummaryResponse
from app.services.csv_validator import validate_csv_with_pandas
from app.services.qsar_predictor import run_prediction_on_csv
from app.services.chembl_service import validate_chembl_target_id, get_target_details, fetch_target_bioactivities
from app.services.model_store import seed_default_idh1_model, save_trained_model, load_model_package
from app.services.training_worker import start_training_job_async, job_cache
from app.services.multi_predictor import predict_compounds_with_model

app = FastAPI(
    title="QSAR Platform API v2.0",
    description="Multi-Target QSAR Modeling, Training & Prediction Platform Backend",
    version="2.0.0",
)

# Configuration from environment variables
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "15"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent.parent / "data" / "uploads"))
PREDICTIONS_DIR = Path(os.getenv("PREDICTIONS_DIR", Path(__file__).resolve().parent.parent / "data" / "predictions"))

# Ensure storage directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory store for dataset validation
db_dataset_store: Dict[str, Dict[str, Any]] = {}
prediction_results_cache: Dict[str, Dict[str, Any]] = {}

# Allow all origins (Vercel, Railway, localhost) seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initialize database tables and seed initial models."""
    try:
        init_db()
        seed_default_idh1_model()
    except Exception as e:
        print(f"Startup database initialization error: {e}")


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health_check():
    """Health-check endpoint for Railway and monitoring"""
    return {"status": "ok", "version": "2.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==============================================================================
# SECTION 1: ChEMBL TARGET & DATA RETRIEVAL
# ==============================================================================

@app.get("/api/v1/targets/{chembl_id}")
def get_target_info(chembl_id: str):
    """
    Lookup target metadata from ChEMBL Web Services API:
    pref_name, organism, target_type, synonyms.
    """
    clean_id = chembl_id.strip().upper()
    if not validate_chembl_target_id(clean_id):
        raise HTTPException(
            status_code=400,
            detail=f"Format Target ChEMBL ID tidak valid: '{chembl_id}'. Contoh valid: CHEMBL2007625, CHEMBL203"
        )
    try:
        meta = get_target_details(clean_id)
        return {"success": True, "data": meta}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Gagal mengambil informasi target dari ChEMBL: {str(e)}")


class ChemblFetchRequest(BaseModel):
    chembl_target_id: str
    standard_type: str = "IC50"
    max_records: int = 1500


@app.post("/api/v1/chembl/fetch")
def fetch_chembl_data(payload: ChemblFetchRequest):
    """
    Fetch bioactivity dataset from ChEMBL API for a target protein.
    """
    clean_id = payload.chembl_target_id.strip().upper()
    if not validate_chembl_target_id(clean_id):
        raise HTTPException(status_code=400, detail="Format Target ChEMBL ID tidak valid.")

    try:
        records, summary = fetch_target_bioactivities(
            target_chembl_id=clean_id,
            standard_type=payload.standard_type,
            max_records=payload.max_records
        )
        return {
            "success": True,
            "data": {
                "records_sample": records[:10],
                "summary": summary
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# SECTION 2: QSAR MODEL TRAINING WORKFLOW
# ==============================================================================

class StartTrainingRequest(BaseModel):
    source_type: str = "chembl"  # "chembl" or "upload"
    chembl_target_id: Optional[str] = None
    target_name: Optional[str] = None
    organism: Optional[str] = None
    endpoint: str = "IC50"
    unit: str = "nM"
    test_size: float = 0.2
    cv_folds: int = 5
    random_state: int = 42
    optimize_hyperparams: bool = False
    custom_records: Optional[List[Dict[str, Any]]] = None


@app.post("/api/v1/training/jobs")
def create_training_job(payload: StartTrainingRequest):
    """
    Launch a background job for Multi-Target QSAR model training.
    """
    if payload.source_type == "chembl":
        if not payload.chembl_target_id:
            raise HTTPException(status_code=400, detail="Target ChEMBL ID wajib diisi untuk sumber data ChEMBL.")
        clean_id = payload.chembl_target_id.strip().upper()
        if not validate_chembl_target_id(clean_id):
            raise HTTPException(status_code=400, detail="Format Target ChEMBL ID tidak valid.")
    elif payload.source_type == "upload":
        if not payload.custom_records or len(payload.custom_records) == 0:
            raise HTTPException(status_code=400, detail="Data training yang diunggah kosong.")
    else:
        raise HTTPException(status_code=400, detail="Tipe sumber data tidak didukung.")

    job_id = start_training_job_async(
        source_type=payload.source_type,
        chembl_target_id=payload.chembl_target_id.strip().upper() if payload.chembl_target_id else None,
        target_name=payload.target_name,
        organism=payload.organism,
        endpoint=payload.endpoint,
        unit=payload.unit,
        custom_records=payload.custom_records,
        test_size=payload.test_size,
        cv_folds=payload.cv_folds,
        random_state=payload.random_state,
        optimize_hyperparams=payload.optimize_hyperparams
    )

    return {
        "success": True,
        "message": "Pekerjaan pelatihan model berhasil dimulai di latar belakang.",
        "job_id": job_id
    }


@app.get("/api/v1/training/jobs/{job_id}")
def get_training_job_status(job_id: str, db=Depends(get_db)):
    """
    Get live progress status of a training job.
    """
    # Check fast memory cache first
    cached = job_cache.get(job_id)
    if cached:
        return {
            "success": True,
            "data": {
                "job_id": job_id,
                "status": cached.get("status"),
                "progress": cached.get("progress"),
                "current_step": cached.get("current_step"),
                "error_message": cached.get("error_message"),
                "chembl_target_id": cached.get("chembl_target_id"),
                "target_name": cached.get("target_name"),
                "endpoint": cached.get("endpoint"),
                "has_results": "_best_estimator" in cached or "results" in cached
            }
        }

    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Pekerjaan pelatihan tidak ditemukan.")

    return {
        "success": True,
        "data": {
            "job_id": job.id,
            "status": job.status,
            "progress": job.progress,
            "current_step": job.current_step,
            "error_message": job.error_message,
            "chembl_target_id": job.chembl_target_id,
            "target_name": job.target_name,
            "endpoint": job.endpoint,
            "has_results": job.results_json is not None
        }
    }


@app.get("/api/v1/training/jobs/{job_id}/results")
def get_training_job_results(job_id: str, db=Depends(get_db)):
    """
    Retrieve full evaluation metrics, benchmark comparison, and charts once training completes.
    """
    cached = job_cache.get(job_id)
    if cached and "results" in cached:
        return {"success": True, "data": cached["results"]}

    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Pekerjaan pelatihan tidak ditemukan.")

    if job.status == "failed":
        raise HTTPException(status_code=422, detail=job.error_message or "Pelatihan model gagal.")

    if job.status != "completed" or not job.results_json:
        raise HTTPException(status_code=400, detail=f"Pelatihan belum selesai. Status saat ini: {job.status}")

    return {"success": True, "data": job.results_json}


class SaveModelRequest(BaseModel):
    model_name: Optional[str] = None


@app.post("/api/v1/training/jobs/{job_id}/save")
def save_completed_training_model(job_id: str, payload: SaveModelRequest = Body(default=SaveModelRequest()), db=Depends(get_db)):
    """
    Permanently save best evaluated model into persistent storage and Model Library.
    """
    cached = job_cache.get(job_id)
    if not cached or "_best_estimator" not in cached:
        raise HTTPException(
            status_code=400,
            detail="Model hasil pelatihan tidak ditemukan dalam cache atau telah kedaluwarsa. Silakan jalankan pelatihan kembali."
        )

    results = cached.get("results", {})
    best_estimator = cached["_best_estimator"]
    train_fps = cached.get("_train_fingerprints")

    best_name = results.get("best_model_name", "Random Forest Regressor")
    target_id = results.get("target_chembl_id", "CHEMBL_TARGET")
    target_name = results.get("target_name", "Unknown Target")
    endpoint = results.get("endpoint", "IC50")
    unit = results.get("unit", "nM")
    organism = results.get("organism", "Homo sapiens")
    metrics = results.get("best_metrics", {})
    quality = results.get("dataset_quality", {})

    model_display_name = payload.model_name or f"{target_name} ({target_id}) {endpoint} Predictor"

    metadata = {
        "job_id": job_id,
        "training_records": quality.get("unique_compounds", 0),
        "fingerprint": "Morgan ECFP4 (radius=2, 1024-bit)",
        "split_method": results.get("split_summary", {}).get("method", "scaffold"),
        "best_algorithm": best_name,
        "saved_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        saved_record = save_trained_model(
            db=db,
            model_name=model_display_name,
            chembl_target_id=target_id,
            target_name=target_name,
            organism=organism,
            endpoint=endpoint,
            unit=unit,
            algorithm=best_name,
            estimator=best_estimator,
            train_fingerprints=train_fps,
            metrics=metrics,
            metadata=metadata
        )

        # Update job record with saved model ID
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        if job:
            job.saved_model_id = saved_record.id
            db.commit()

        return {
            "success": True,
            "message": f"Model '{model_display_name}' berhasil disimpan ke Model Library.",
            "data": {
                "model_id": saved_record.id,
                "model_name": saved_record.model_name,
                "algorithm": saved_record.algorithm,
                "metrics": saved_record.metrics_json,
                "status": saved_record.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan model: {str(e)}")


# ==============================================================================
# SECTION 3: MODEL LIBRARY
# ==============================================================================

@app.get("/api/v1/models")
def list_available_models(
    endpoint: Optional[str] = None,
    search: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Retrieve all models in Model Library with filtering and search options.
    """
    query = db.query(QSARModel)

    if endpoint:
        query = query.filter(QSARModel.endpoint == endpoint.upper())

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (QSARModel.model_name.ilike(s)) |
            (QSARModel.target_name.ilike(s)) |
            (QSARModel.chembl_target_id.ilike(s)) |
            (QSARModel.algorithm.ilike(s))
        )

    models = query.order_by(QSARModel.created_at.desc()).all()

    return {
        "success": True,
        "count": len(models),
        "data": [
            {
                "id": m.id,
                "model_name": m.model_name,
                "chembl_target_id": m.chembl_target_id,
                "target_name": m.target_name,
                "organism": m.organism,
                "endpoint": m.endpoint,
                "unit": m.unit,
                "algorithm": m.algorithm,
                "version": m.version,
                "status": m.status,
                "metrics": m.metrics_json,
                "metadata": m.metadata_json,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in models
        ]
    }


@app.get("/api/v1/models/{model_id}")
def get_model_details(model_id: str, db=Depends(get_db)):
    """
    Get detailed metrics, training history, and specification of a specific model.
    """
    m = db.query(QSARModel).filter(QSARModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model tidak ditemukan.")

    return {
        "success": True,
        "data": {
            "id": m.id,
            "model_name": m.model_name,
            "chembl_target_id": m.chembl_target_id,
            "target_name": m.target_name,
            "organism": m.organism,
            "endpoint": m.endpoint,
            "unit": m.unit,
            "algorithm": m.algorithm,
            "version": m.version,
            "status": m.status,
            "metrics": m.metrics_json,
            "metadata": m.metadata_json,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
    }


@app.delete("/api/v1/models/{model_id}")
def delete_model(model_id: str, db=Depends(get_db)):
    """
    Delete a model from Model Library and storage.
    """
    m = db.query(QSARModel).filter(QSARModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model tidak ditemukan.")

    # Remove file from disk if present
    try:
        p = Path(m.model_storage_path)
        if p.exists() and "idh1_general_qsar.joblib" not in p.name:
            if p.is_file():
                p.unlink()
            if p.parent.exists() and p.parent.name == model_id:
                import shutil
                shutil.rmtree(p.parent, ignore_errors=True)
    except Exception as e:
        print(f"Warning: Failed to delete model storage: {e}")

    db.delete(m)
    db.commit()

    return {"success": True, "message": f"Model '{m.model_name}' berhasil dihapus."}


@app.get("/api/v1/models/{model_id}/download")
def download_model_file(model_id: str, db=Depends(get_db)):
    """Download the trained .joblib model package."""
    m = db.query(QSARModel).filter(QSARModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model tidak ditemukan.")

    p = Path(m.model_storage_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Berkas model tidak ada di penyimpanan server.")

    clean_filename = f"{m.model_name.replace(' ', '_')}_{m.version}.joblib"
    return FileResponse(path=str(p), filename=clean_filename, media_type="application/octet-stream")


# ==============================================================================
# SECTION 4: PREDICT COMPOUNDS (MULTI-TARGET)
# ==============================================================================

@app.post("/api/v1/predictions")
async def run_compound_prediction(
    file: UploadFile = File(...),
    model_id: str = Query(...),
    db=Depends(get_db)
):
    """
    Accepts plant compound CSV (ID & Smiles), validates molecules, and computes
    bioactivity predictions using the chosen model from Model Library.
    """
    lower = file.filename.lower() if file.filename else ""
    if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Hanya file berekstensi .csv atau .xlsx yang didukung.")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File melebihi batas ukuran {MAX_UPLOAD_SIZE_MB} MB.")

    # Read into pandas safely with delimiter autodetection
    try:
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            # Try autodetection of comma vs semicolon vs tab
            text = content.decode("utf-8", errors="replace")
            first_line = text.split("\n")[0] if text else ""
            sep = ";" if first_line.count(";") > first_line.count(",") else ","
            df = pd.read_csv(io.StringIO(text), sep=sep)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Gagal membaca format CSV/Excel: {str(e)}")

    if df.empty or len(df.columns) < 1:
        raise HTTPException(status_code=422, detail="File dataset kosong atau tidak memiliki kolom.")

    # Find ID & Smiles columns
    smiles_col = None
    for c in df.columns:
        if str(c).strip().lower() in ("smiles", "canonical_smiles", "structure", "struktur", "mol_smiles"):
            smiles_col = c
            break

    if not smiles_col:
        # Fallback to column containing 'smiles' substring or first column
        for c in df.columns:
            if "smiles" in str(c).lower() or "structure" in str(c).lower():
                smiles_col = c
                break
        if not smiles_col and len(df.columns) == 1:
            smiles_col = df.columns[0]

    if not smiles_col:
        raise HTTPException(
            status_code=422,
            detail="Header kolom 'Smiles' atau 'structure' tidak ditemukan pada baris pertama berkas CSV."
        )

    id_col = None
    for c in df.columns:
        if str(c).strip().lower() in ("id", "compound_id", "mol_id", "nama", "name") and c != smiles_col:
            id_col = c
            break

    if not id_col:
        for c in df.columns:
            if c != smiles_col:
                id_col = c
                break

    try:
        result = predict_compounds_with_model(
            db=db,
            model_id=model_id,
            df_compounds=df,
            id_col=id_col or "ID",
            smiles_col=smiles_col
        )
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengeksekusi inferensi model: {str(e)}")

    prediction_id = str(uuid.uuid4())
    prediction_results_cache[prediction_id] = result

    # Save to database
    try:
        pred_job = PredictionJob(
            id=prediction_id,
            model_id=model_id,
            input_filename=file.filename or "compounds.csv",
            total_compounds=result["summary"]["total_compounds"],
            valid_compounds=result["summary"]["valid_compounds"],
            invalid_compounds=result["summary"]["invalid_compounds"],
            duplicate_structures=result["summary"]["duplicate_structures"],
            status="completed",
            summary_json=result["summary"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(pred_job)
        db.commit()
    except Exception as e:
        print(f"Warning: Failed to save prediction record in DB: {e}")

    # Generate CSV file for download
    csv_path = PREDICTIONS_DIR / f"{prediction_id}_results.csv"
    try:
        res_df = pd.DataFrame(result["results"])
        res_df.to_csv(csv_path, index=False)
    except Exception as e:
        print(f"Warning: Failed to save prediction CSV: {e}")

    return {
        "success": True,
        "prediction_id": prediction_id,
        "data": result
    }


@app.get("/api/v1/predictions/{prediction_id}")
def get_prediction_result(prediction_id: str):
    """Retrieve full prediction results by prediction ID."""
    cached = prediction_results_cache.get(prediction_id)
    if not cached:
        # Check CSV file on disk
        csv_path = PREDICTIONS_DIR / f"{prediction_id}_results.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            return {"success": True, "prediction_id": prediction_id, "data": {"results": df.to_dict(orient="records")}}
        raise HTTPException(status_code=404, detail="Hasil prediksi tidak ditemukan atau telah kedaluwarsa.")
    return {"success": True, "prediction_id": prediction_id, "data": cached}


@app.get("/api/v1/predictions/{prediction_id}/download")
def download_prediction_results_csv(prediction_id: str):
    """Download predictions table as CSV."""
    csv_path = PREDICTIONS_DIR / f"{prediction_id}_results.csv"
    if not csv_path.exists():
        # Check cache and create on the fly
        cached = prediction_results_cache.get(prediction_id)
        if cached and "results" in cached:
            df = pd.DataFrame(cached["results"])
            df.to_csv(csv_path, index=False)
        else:
            raise HTTPException(status_code=404, detail="Berkas hasil prediksi belum tersedia.")

    return FileResponse(
        path=str(csv_path),
        filename=f"qsar_predictions_{prediction_id[:8]}.csv",
        media_type="text/csv"
    )


# ==============================================================================
# SECTION 5: LEGACY DATASET VALIDATION (PRESERVED FOR BACKWARD COMPATIBILITY)
# ==============================================================================

@app.post("/api/v1/datasets", response_model=ApiResponseSuccess)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts CSV / Excel file upload via multipart/form-data.
    Reads with Pandas, validates structure, stores securely, and returns metadata + preview.
    """
    lower_filename = file.filename.lower() if file.filename else ""
    if not (lower_filename.endswith(".csv") or lower_filename.endswith(".xlsx") or lower_filename.endswith(".xls")):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ApiResponseError(
                message="Ekstensi file tidak valid.",
                errors=["Hanya file berformat .csv, .xlsx, atau .xls yang diizinkan untuk diunggah."]
            ).model_dump()
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > MAX_UPLOAD_SIZE_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content=ApiResponseError(
                message="Ukuran file melebihi batas maksimum.",
                errors=[f"File melebihi batas maksimum {MAX_UPLOAD_SIZE_MB} MB."]
            ).model_dump()
        )

    is_valid, parsed_data, errors = validate_csv_with_pandas(file_bytes, file.filename)

    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ApiResponseError(
                message="File tidak dapat diproses karena tidak memenuhi struktur dataset yang valid.",
                errors=errors
            ).model_dump()
        )

    dataset_id = str(uuid.uuid4())
    stored_filename = f"{dataset_id}.csv"
    storage_path = UPLOAD_DIR / stored_filename

    try:
        with open(storage_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        print(f"Warning: Failed to save to disk: {e}")

    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_size_bytes": file_size,
        "total_rows": parsed_data["total_rows"],
        "total_columns": parsed_data["total_columns"],
        "columns": parsed_data["columns"],
        "column_details": parsed_data.get("column_details"),
        "missing_values_total": parsed_data["missing_values_total"],
        "missing_values_by_column": parsed_data["missing_values_by_column"],
        "duplicate_rows": parsed_data["duplicate_rows"],
        "problematic_rows": parsed_data.get("problematic_rows"),
        "problematic_rows_count": parsed_data.get("problematic_rows_count"),
        "validation_status": parsed_data["validation_status"],
        "warnings": parsed_data["warnings"],
        "preview": parsed_data["preview"],
        "uploaded_at": now_iso,
        "smiles_column_detected": parsed_data.get("smiles_column_detected"),
        "smiles_column_name": parsed_data.get("smiles_column_name"),
    }

    db_dataset_store[dataset_id] = record

    return ApiResponseSuccess(
        message="Dataset uploaded and validated successfully",
        data=DatasetSummaryResponse(**record)
    )


@app.get("/api/v1/datasets/{dataset_id}", response_model=ApiResponseSuccess)
def get_dataset_metadata(dataset_id: str):
    if dataset_id not in db_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan.")
    return ApiResponseSuccess(
        message="Dataset metadata retrieved successfully",
        data=DatasetSummaryResponse(**db_dataset_store[dataset_id])
    )


@app.get("/api/v1/datasets/{dataset_id}/preview")
def get_dataset_preview(dataset_id: str):
    if dataset_id not in db_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan.")
    return {
        "success": True,
        "data": {
            "dataset_id": dataset_id,
            "preview": db_dataset_store[dataset_id]["preview"]
        }
    }


@app.get("/api/v1/datasets/{dataset_id}/issues")
def get_dataset_issues(dataset_id: str):
    if dataset_id not in db_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan.")
    record = db_dataset_store[dataset_id]
    return {
        "success": True,
        "data": {
            "problematic_rows": record.get("problematic_rows", []),
            "problematic_rows_count": record.get("problematic_rows_count", len(record.get("problematic_rows", []))),
            "duplicate_rows": record.get("duplicate_rows", 0),
            "missing_values_total": record.get("missing_values_total", 0),
        }
    }


@app.post("/api/v1/datasets/{dataset_id}/predict")
def predict_dataset_qsar(dataset_id: str):
    """
    Run IDH1 QSAR RandomForest model on uploaded dataset CSV.
    """
    if dataset_id not in db_dataset_store:
        raise HTTPException(status_code=404, detail="Dataset tidak ditemukan atau telah kedaluwarsa.")

    record = db_dataset_store[dataset_id]
    stored_filename = f"{dataset_id}.csv"
    input_path = UPLOAD_DIR / stored_filename

    if not input_path.exists():
        raise HTTPException(status_code=404, detail="File dataset fisik tidak ditemukan.")

    output_csv_path = UPLOAD_DIR / f"{dataset_id}_qsar_predictions.csv"
    output_json_path = UPLOAD_DIR / f"{dataset_id}_qsar_predictions.json"

    res = run_prediction_on_csv(
        input_csv_path=str(input_path),
        output_json_path=str(output_json_path),
        output_csv_path=str(output_csv_path)
    )

    if not res.get("success", False):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ApiResponseError(
                message="Gagal menjalankan inferensi model QSAR.",
                errors=[res.get("error", "Format data atau kolom SMILES tidak valid.")]
            ).model_dump()
        )

    record["qsar_predictions"] = res

    return {
        "success": True,
        "message": "Prediksi QSAR IDH1 berhasil dijalankan.",
        "data": res
    }


@app.get("/api/v1/datasets/{dataset_id}/predictions/download")
def download_predictions_csv(dataset_id: str):
    output_csv_path = UPLOAD_DIR / f"{dataset_id}_qsar_predictions.csv"
    if not output_csv_path.exists():
        stored_filename = f"{dataset_id}.csv"
        input_path = UPLOAD_DIR / stored_filename
        if input_path.exists():
            run_prediction_on_csv(
                input_csv_path=str(input_path),
                output_csv_path=str(output_csv_path)
            )

    if not output_csv_path.exists():
        raise HTTPException(status_code=404, detail="File hasil prediksi belum tersedia.")

    orig_name = db_dataset_store.get(dataset_id, {}).get("filename", "dataset")
    base_name = orig_name.rsplit(".", 1)[0]
    return FileResponse(
        path=str(output_csv_path),
        filename=f"{base_name}_idh1_predictions.csv",
        media_type="text/csv"
    )
