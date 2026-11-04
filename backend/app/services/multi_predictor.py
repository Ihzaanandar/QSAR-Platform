import math
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator
from rdkit.Chem.MolStandardize import rdMolStandardize
from sqlalchemy.orm import Session
from app.database import QSARModel
from app.services.model_store import load_model_package

MORGAN_RADIUS = 2
MORGAN_N_BITS = 1024
_fp_generator = rdFingerprintGenerator.GetMorganGenerator(
    radius=MORGAN_RADIUS,
    fpSize=MORGAN_N_BITS,
    includeChirality=False,
)
_uncharger = rdMolStandardize.Uncharger()


def standardize_compound_smiles(smiles: str) -> Optional[str]:
    """Standardize SMILES string for inference."""
    if not smiles or not isinstance(smiles, str) or str(smiles).strip().lower() in ('nan', 'none', ''):
        return None
    try:
        mol = Chem.MolFromSmiles(str(smiles).strip())
        if mol is None:
            return None
        mol = rdMolStandardize.Cleanup(mol)
        mol = rdMolStandardize.FragmentParent(mol)
        mol = _uncharger.uncharge(mol)
        Chem.SanitizeMol(mol)
        return Chem.MolToSmiles(mol, canonical=True, isomericSmiles=True)
    except Exception:
        return None


def calculate_tanimoto_similarity(query_fp: np.ndarray, ref_fps: Optional[np.ndarray]) -> Optional[float]:
    """Compute maximum Tanimoto similarity against training reference set."""
    if ref_fps is None or len(ref_fps) == 0:
        return None
    try:
        intersections = np.dot(ref_fps, query_fp)
        q_sum = np.sum(query_fp)
        ref_sums = np.sum(ref_fps, axis=1)
        unions = ref_sums + q_sum - intersections
        valid_mask = unions > 0
        tanimoto = np.zeros(len(ref_fps), dtype=np.float32)
        tanimoto[valid_mask] = intersections[valid_mask] / unions[valid_mask]
        return round(float(np.max(tanimoto)), 3)
    except Exception:
        return None


def predict_compounds_with_model(
    db: Session,
    model_id: str,
    df_compounds: pd.DataFrame,
    id_col: str = "ID",
    smiles_col: str = "Smiles",
    similarity_threshold: float = 0.35
) -> Dict[str, Any]:
    """
    Run multi-target QSAR predictions on compound dataset using selected model.
    """
    start_time = time.time()

    # Fetch model record
    model_record = db.query(QSARModel).filter(QSARModel.id == model_id).first()
    if not model_record:
        raise ValueError(f"Model ID '{model_id}' tidak ditemukan di Model Library.")

    if model_record.status != "available":
        raise ValueError(f"Model '{model_record.model_name}' berstatus '{model_record.status}' dan tidak siap untuk prediksi.")

    # Load model artifact package
    pkg = load_model_package(model_record.model_storage_path)
    estimator = pkg["model"] if isinstance(pkg, dict) and "model" in pkg else pkg

    # Load reference fingerprints for Applicability Domain if available
    ref_fps = None
    ref_fp_path = Path(model_record.model_storage_path).parent / "training_reference_fingerprints.npz"
    if not ref_fp_path.exists():
        # Fallback to idh1_qsar_artifacts if default IDH1 model
        alt_path = Path(__file__).resolve().parent.parent.parent / "idh1_qsar_artifacts" / "training_reference_fingerprints.npz"
        if alt_path.exists():
            ref_fp_path = alt_path

    if ref_fp_path.exists():
        try:
            ref_data = np.load(str(ref_fp_path), allow_pickle=True)
            if "X" in ref_data:
                ref_fps = ref_data["X"].astype(np.uint8)
        except Exception as e:
            print(f"Warning: Failed to load reference fingerprints: {e}")

    total_rows = len(df_compounds)
    canonical_cache: Dict[str, Optional[str]] = {}
    fp_cache: Dict[str, Optional[np.ndarray]] = {}
    pred_cache: Dict[str, float] = {}
    sim_cache: Dict[str, Optional[float]] = {}

    results = []
    valid_count = 0
    invalid_count = 0
    seen_structures = set()
    duplicate_structures_count = 0

    pic50_values = []

    for idx, row in df_compounds.iterrows():
        cmpd_id = str(row.get(id_col) or f"CMPD_{idx+1}")
        raw_smiles = str(row.get(smiles_col) or "")

        if raw_smiles not in canonical_cache:
            canonical_cache[raw_smiles] = standardize_compound_smiles(raw_smiles)

        canon = canonical_cache[raw_smiles]

        if not canon:
            invalid_count += 1
            results.append({
                "row_index": idx + 1,
                "compound_id": cmpd_id,
                "raw_smiles": raw_smiles,
                "canonical_smiles": None,
                "predicted_pic50": None,
                "predicted_ic50_nm": None,
                "activity_class": "Invalid",
                "tanimoto_similarity": None,
                "in_domain": False,
                "status": "Invalid SMILES"
            })
            continue

        valid_count += 1
        if canon in seen_structures:
            duplicate_structures_count += 1
        else:
            seen_structures.add(canon)

        # Compute or retrieve fingerprint & prediction
        if canon not in fp_cache:
            try:
                mol = Chem.MolFromSmiles(canon)
                fp = _fp_generator.GetFingerprint(mol)
                arr = np.zeros((MORGAN_N_BITS,), dtype=np.uint8)
                DataStructs.ConvertToNumpyArray(fp, arr)
                fp_cache[canon] = arr

                # Model inference
                pred_val = float(estimator.predict(arr.reshape(1, -1))[0])
                pred_cache[canon] = round(pred_val, 2)

                # Similarity
                sim_cache[canon] = calculate_tanimoto_similarity(arr, ref_fps)
            except Exception:
                fp_cache[canon] = None
                pred_cache[canon] = None
                sim_cache[canon] = None

        pic50 = pred_cache.get(canon)
        sim = sim_cache.get(canon)

        if pic50 is not None:
            pic50_values.append(pic50)
            # IC50 in nM = 10^(9 - pIC50)
            ic50_nm = round(float(10 ** (9.0 - pic50)), 2)

            # Classify
            if pic50 >= 7.0:
                act_class = "Highly Active"
            elif pic50 >= 5.0:
                act_class = "Moderately Active"
            else:
                act_class = "Inactive"

            in_domain = bool(sim is not None and sim >= similarity_threshold) if sim is not None else True

            results.append({
                "row_index": idx + 1,
                "compound_id": cmpd_id,
                "raw_smiles": raw_smiles,
                "canonical_smiles": canon,
                "predicted_pic50": pic50,
                "predicted_ic50_nm": ic50_nm,
                "activity_class": act_class,
                "tanimoto_similarity": sim,
                "in_domain": in_domain,
                "status": "Valid"
            })
        else:
            results.append({
                "row_index": idx + 1,
                "compound_id": cmpd_id,
                "raw_smiles": raw_smiles,
                "canonical_smiles": canon,
                "predicted_pic50": None,
                "predicted_ic50_nm": None,
                "activity_class": "Failed",
                "tanimoto_similarity": None,
                "in_domain": False,
                "status": "Inference Error"
            })

    elapsed_time = round(time.time() - start_time, 2)

    active_cnt = sum(1 for r in results if r["activity_class"] == "Highly Active")
    mod_cnt = sum(1 for r in results if r["activity_class"] == "Moderately Active")
    inact_cnt = sum(1 for r in results if r["activity_class"] == "Inactive")

    avg_pic50 = round(float(np.mean(pic50_values)), 2) if pic50_values else 0.0

    return {
        "model_info": {
            "model_id": model_record.id,
            "model_name": model_record.model_name,
            "target_chembl_id": model_record.chembl_target_id,
            "target_name": model_record.target_name,
            "endpoint": model_record.endpoint,
            "unit": model_record.unit,
            "algorithm": model_record.algorithm
        },
        "summary": {
            "total_compounds": total_rows,
            "valid_compounds": valid_count,
            "invalid_compounds": invalid_count,
            "duplicate_structures": duplicate_structures_count,
            "unique_structures": len(seen_structures),
            "highly_active_count": active_cnt,
            "moderately_active_count": mod_cnt,
            "inactive_count": inact_cnt,
            "average_predicted_pic50": avg_pic50,
            "processing_time_seconds": elapsed_time
        },
        "disclaimer": "Catatan: Nilai prediksi komputasional (in-silico QSAR) adalah estimasi berbasis kemiripan pola molekuler dan bukan pengganti uji aktivitas biologis in-vitro / in-vivo laboratorium.",
        "results": results
    }

