import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import pandas as pd
from app.database import SessionLocal, TrainingJob, QSARModel
from app.services.chembl_service import get_target_details, fetch_target_bioactivities
from app.services.dataset_curator import curate_and_preprocess_dataset
from app.services.pipeline_trainer import train_benchmark_models
from app.services.model_store import save_trained_model


# In-memory cache for fast status polling
job_cache: Dict[str, Dict[str, Any]] = {}


def update_job_status(job_id: str, status: str, progress: int, current_step: str, error_message: Optional[str] = None, results: Optional[Dict[str, Any]] = None):
    """Update training job status in both memory and database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    if job_id in job_cache:
        job_cache[job_id]["status"] = status
        job_cache[job_id]["progress"] = progress
        job_cache[job_id]["current_step"] = current_step
        if error_message:
            job_cache[job_id]["error_message"] = error_message
        if results:
            job_cache[job_id]["results"] = results
        if status in ("completed", "failed"):
            job_cache[job_id]["completed_at"] = now_iso

    db = SessionLocal()
    try:
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        if job:
            job.status = status
            job.progress = progress
            job.current_step = current_step
            if error_message:
                job.error_message = error_message
            if results:
                job.results_json = results
            if status in ("completed", "failed"):
                job.completed_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        print(f"Warning: Failed to update job in DB: {e}")
    finally:
        db.close()


def run_training_pipeline_task(
    job_id: str,
    source_type: str,
    chembl_target_id: Optional[str],
    target_name: Optional[str],
    organism: Optional[str],
    endpoint: str = "IC50",
    unit: str = "nM",
    custom_records: Optional[list] = None,
    test_size: float = 0.2,
    cv_folds: int = 5,
    random_state: int = 42,
    optimize_hyperparams: bool = False
):
    """
    Asynchronous worker task that executes the 7-step QSAR training workflow.
    """
    try:
        # Step 1: Data acquisition
        if source_type == "chembl":
            update_job_status(job_id, "fetching_data", 10, "Mengambil data target dan bioaktivitas dari ChEMBL API...")
            target_meta = get_target_details(chembl_target_id)
            target_name = target_name or target_meta["pref_name"]
            organism = organism or target_meta["organism"]

            def on_progress(current, total):
                prog = min(30, 10 + int((current / max(total, 1)) * 20))
                update_job_status(job_id, "fetching_data", prog, f"Mengunduh data ChEMBL: {current} dari {total} data...")

            raw_records, fetch_summary = fetch_target_bioactivities(
                target_chembl_id=chembl_target_id,
                standard_type=endpoint,
                max_records=2500,
                progress_callback=on_progress
            )
        else:
            update_job_status(job_id, "curating_data", 15, "Membaca berkas dataset pelatihan...")
            raw_records = custom_records or []
            target_name = target_name or "Custom Target"
            organism = organism or "Homo sapiens"

        if not raw_records:
            raise ValueError(f"Tidak ada data bioaktivitas {endpoint} yang ditemukan untuk target {chembl_target_id}.")

        # Step 2: Curation and Quality Check
        update_job_status(job_id, "curating_data", 35, "Memvalidasi struktur SMILES dan membersihkan data...")
        df_curated, quality_summary = curate_and_preprocess_dataset(
            records=raw_records,
            endpoint=endpoint,
            unit=unit
        )

        # Save dataset summary to job
        db = SessionLocal()
        try:
            job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
            if job:
                job.dataset_summary = quality_summary
                job.target_name = target_name
                job.organism = organism
                db.commit()
        finally:
            db.close()

        # Step 3 & 4: Model Training and Cross Validation
        update_job_status(job_id, "training", 50, "Melatih model-model kandidat (Random Forest, Extra Trees, SVR, MLP)...")

        def on_train_progress(step_desc, prog):
            update_job_status(job_id, "training", prog, step_desc)

        train_results = train_benchmark_models(
            df=df_curated,
            split_method="scaffold",
            test_size=test_size,
            cv_folds=cv_folds,
            random_state=random_state,
            optimize_hyperparams=optimize_hyperparams,
            progress_callback=on_train_progress
        )

        # Step 5: Evaluation
        update_job_status(job_id, "evaluating", 90, "Menghitung metrik evaluasi dan memilih model terbaik...")

        final_payload = {
            "target_chembl_id": chembl_target_id,
            "target_name": target_name,
            "organism": organism,
            "endpoint": endpoint,
            "unit": unit,
            "dataset_quality": quality_summary,
            "split_summary": train_results["split_summary"],
            "model_comparison": train_results["model_comparison"],
            "best_model_name": train_results["best_model_name"],
            "best_metrics": train_results["best_metrics"],
            "evaluation_charts": train_results["evaluation_charts"]
        }

        # Cache trained estimator in memory so user can confirm save
        job_cache[job_id]["_best_estimator"] = train_results["best_estimator"]
        job_cache[job_id]["_train_fingerprints"] = train_results["train_fingerprints"]

        update_job_status(job_id, "completed", 100, "Pelatihan dan evaluasi model selesai dengan sukses!", results=final_payload)

    except Exception as e:
        print(f"Error in training job {job_id}: {e}")
        update_job_status(job_id, "failed", 0, "Pelatihan model gagal.", error_message=str(e))


def start_training_job_async(
    source_type: str,
    chembl_target_id: Optional[str],
    target_name: Optional[str],
    organism: Optional[str],
    endpoint: str = "IC50",
    unit: str = "nM",
    custom_records: Optional[list] = None,
    test_size: float = 0.2,
    cv_folds: int = 5,
    random_state: int = 42,
    optimize_hyperparams: bool = False
) -> str:
    """Creates a new training job and starts the background worker thread."""
    job_id = str(uuid.uuid4())

    db = SessionLocal()
    try:
        new_job = TrainingJob(
            id=job_id,
            source_type=source_type,
            chembl_target_id=chembl_target_id,
            target_name=target_name,
            organism=organism,
            endpoint=endpoint,
            unit=unit,
            status="queued",
            progress=0,
            current_step="Tugas pelatihan dimasukkan ke antrean..."
        )
        db.add(new_job)
        db.commit()
    finally:
        db.close()

    job_cache[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "current_step": "Tugas pelatihan dimasukkan ke antrean...",
        "source_type": source_type,
        "chembl_target_id": chembl_target_id,
        "target_name": target_name,
        "endpoint": endpoint,
        "unit": unit
    }

    # Start background execution
    t = threading.Thread(
        target=run_training_pipeline_task,
        kwargs={
            "job_id": job_id,
            "source_type": source_type,
            "chembl_target_id": chembl_target_id,
            "target_name": target_name,
            "organism": organism,
            "endpoint": endpoint,
            "unit": unit,
            "custom_records": custom_records,
            "test_size": test_size,
            "cv_folds": cv_folds,
            "random_state": random_state,
            "optimize_hyperparams": optimize_hyperparams
        },
        daemon=True
    )
    t.start()

    return job_id
