import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from app.schemas.dataset import ApiResponseSuccess, ApiResponseError, DatasetSummaryResponse
from app.services.csv_validator import validate_csv_with_pandas
from app.services.qsar_predictor import run_prediction_on_csv

app = FastAPI(
    title="QSAR Platform API",
    description="Backend API for QSAR Molecular Dataset Validation (Prototype v1.0)",
    version="1.0.0",
)

# Configuration from environment variables
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/data/uploads"))

# Ensure private upload dir exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory store for prototype
db_dataset_store: Dict[str, Dict[str, Any]] = {}

# Allow all origins (Vercel, Railway, localhost) seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health-check endpoint for Railway and monitoring"""
    return {"status": "ok"}

@app.post("/api/v1/datasets", response_model=ApiResponseSuccess)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts CSV file upload via multipart/form-data.
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
                message="File tidak dapat diproses karena tidak memenuhi struktur CSV yang valid.",
                errors=errors
            ).model_dump()
        )

    dataset_id = str(uuid.uuid4())
    stored_filename = f"{dataset_id}.csv"
    storage_path = UPLOAD_DIR / stored_filename

    # Save to private volume
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
        "missing_values_total": parsed_data["missing_values_total"],
        "missing_values_by_column": parsed_data["missing_values_by_column"],
        "duplicate_rows": parsed_data["duplicate_rows"],
        "validation_status": parsed_data["validation_status"],
        "warnings": parsed_data["warnings"],
        "preview": parsed_data["preview"],
        "uploaded_at": now_iso
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
    Computes Morgan fingerprints, pIC50, predicted IC50 nM, activity class, and Tanimoto similarity.
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

    # Store prediction result in record cache
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
        # Check if we can run it now
        stored_filename = f"{dataset_id}.csv"
        input_path = UPLOAD_DIR / stored_filename
        if input_path.exists():
            run_prediction_on_csv(
                input_csv_path=str(input_path),
                output_csv_path=str(output_csv_path)
            )

    if not output_csv_path.exists():
        raise HTTPException(status_code=404, detail="File hasil prediksi tidak ditemukan. Jalankan prediksi terlebih dahulu.")

    orig_name = db_dataset_store.get(dataset_id, {}).get("filename", "dataset")
    base_name = orig_name.rsplit(".", 1)[0]
    return FileResponse(
        path=str(output_csv_path),
        filename=f"{base_name}_idh1_predictions.csv",
        media_type="text/csv"
    )

