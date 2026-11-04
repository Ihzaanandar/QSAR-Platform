import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator
from rdkit.Chem.MolStandardize import rdMolStandardize
from rdkit.Chem.Scaffolds import MurckoScaffold

MORGAN_RADIUS = 2
MORGAN_N_BITS = 1024
_fp_generator = rdFingerprintGenerator.GetMorganGenerator(
    radius=MORGAN_RADIUS,
    fpSize=MORGAN_N_BITS,
    includeChirality=False,
)

# Salt remover setup
_salt_remover = rdMolStandardize.FragmentRemover()
_uncharger = rdMolStandardize.Uncharger()


def standardize_molecule(smiles: str) -> Optional[Tuple[str, str]]:
    """
    Standardize a SMILES string:
    1. Parse SMILES
    2. Salt / solvent fragment removal
    3. Neutralize / uncharge functional groups
    4. Return (canonical_isomeric_smiles, scaffold_smiles) or None if invalid.
    """
    if not smiles or not isinstance(smiles, str) or smiles.strip().lower() in ('nan', 'none', ''):
        return None

    try:
        mol = Chem.MolFromSmiles(smiles.strip())
        if mol is None:
            return None

        # Clean up and fragment parent
        mol = rdMolStandardize.Cleanup(mol)
        mol = rdMolStandardize.FragmentParent(mol)
        mol = _uncharger.uncharge(mol)
        Chem.SanitizeMol(mol)

        canonical = Chem.MolToSmiles(mol, canonical=True, isomericSmiles=True)
        if not canonical:
            return None

        # Calculate Bemis-Murcko scaffold
        scaffold = MurckoScaffold.MurckoScaffoldSmiles(mol=mol, includeChirality=False)
        return canonical, scaffold
    except Exception:
        return None


def calculate_pic50(value_nm: float) -> Optional[float]:
    """Convert IC50 in nM to logarithmic pIC50: pIC50 = 9 - log10(IC50_nM)"""
    if value_nm is None or value_nm <= 0:
        return None
    try:
        pic50 = 9.0 - math.log10(value_nm)
        # Filter extreme unphysical ranges (typically 2.0 to 12.0)
        if pic50 < 1.0 or pic50 > 14.0:
            return None
        return round(float(pic50), 3)
    except Exception:
        return None


def curate_and_preprocess_dataset(
    records: List[Dict[str, Any]],
    endpoint: str = "IC50",
    unit: str = "nM",
    allowed_relations: Tuple[str, ...] = ("=", "==", "~"),
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Curates raw bioactivity records into an ML-ready dataset:
    - Excludes non-exact relations (<, >, etc.)
    - Removes invalid SMILES
    - Standardizes molecules
    - Computes pIC50
    - Handles duplicated structures (aggregates via median pIC50)
    - Returns curated DataFrame and statistical quality audit metrics.
    """
    raw_count = len(records)
    if raw_count == 0:
        raise ValueError("Dataset kosong atau tidak memiliki data bioaktivitas.")

    df_raw = pd.DataFrame(records)

    # Filter standard relation
    if "standard_relation" in df_raw.columns:
        valid_rel_mask = df_raw["standard_relation"].astype(str).str.strip().isin(allowed_relations)
        df_filtered = df_raw[valid_rel_mask].copy()
    else:
        df_filtered = df_raw.copy()

    # Filter positive numeric values
    val_col = "standard_value" if "standard_value" in df_filtered.columns else "value"
    df_filtered = df_filtered[pd.to_numeric(df_filtered[val_col], errors="coerce") > 0].copy()
    df_filtered[val_col] = pd.to_numeric(df_filtered[val_col])

    # SMILES Standardization
    smiles_col = "canonical_smiles" if "canonical_smiles" in df_filtered.columns else "smiles"
    if smiles_col not in df_filtered.columns:
        for c in df_filtered.columns:
            if "smiles" in c.lower() or "structure" in c.lower():
                smiles_col = c
                break

    curated_rows = []
    invalid_smiles_count = 0

    for _, row in df_filtered.iterrows():
        raw_smiles = str(row[smiles_col])
        res = standardize_molecule(raw_smiles)
        if res is None:
            invalid_smiles_count += 1
            continue

        canonical_smi, scaffold_smi = res
        val_nm = float(row[val_col])
        pic50 = calculate_pic50(val_nm)

        if pic50 is None:
            continue

        mol_id = str(row.get("molecule_chembl_id") or row.get("id") or f"CMPD_{len(curated_rows)+1}")

        curated_rows.append({
            "molecule_id": mol_id,
            "raw_smiles": raw_smiles,
            "canonical_smiles": canonical_smi,
            "scaffold": scaffold_smi,
            "standard_value": val_nm,
            "standard_units": unit,
            "pic50": pic50,
        })

    if not curated_rows:
        raise ValueError("Tidak ada senyawa yang valid setelah standarisasi SMILES dan konversi nilai pIC50.")

    df_curated = pd.DataFrame(curated_rows)

    # Duplicate resolution by unique canonical SMILES
    raw_valid_structures = len(df_curated)
    unique_structures_count = df_curated["canonical_smiles"].nunique()
    duplicates_count = raw_valid_structures - unique_structures_count

    # Group by canonical SMILES: take median pIC50 and keep first molecule_id and scaffold
    df_unique = df_curated.groupby("canonical_smiles").agg({
        "molecule_id": "first",
        "scaffold": "first",
        "standard_value": "median",
        "standard_units": "first",
        "pic50": "median"
    }).reset_index()

    df_unique["pic50"] = df_unique["pic50"].round(3)

    # Quality check audit summary
    pic50_vals = df_unique["pic50"].values
    quality_summary = {
        "raw_records": raw_count,
        "valid_filtered_records": raw_valid_structures,
        "invalid_smiles_count": invalid_smiles_count,
        "duplicate_records_merged": duplicates_count,
        "unique_compounds": len(df_unique),
        "unique_scaffolds": int(df_unique["scaffold"].nunique()),
        "activity_distribution": {
            "min_pic50": float(np.min(pic50_vals)),
            "max_pic50": float(np.max(pic50_vals)),
            "mean_pic50": round(float(np.mean(pic50_vals)), 2),
            "median_pic50": round(float(np.median(pic50_vals)), 2),
            "std_pic50": round(float(np.std(pic50_vals)), 2),
            "active_count (pIC50>=7)": int(np.sum(pic50_vals >= 7.0)),
            "moderate_count (5<=pIC50<7)": int(np.sum((pic50_vals >= 5.0) & (pic50_vals < 7.0))),
            "inactive_count (pIC50<5)": int(np.sum(pic50_vals < 5.0)),
        },
        "target_endpoint": endpoint,
        "unit": unit
    }

    return df_unique, quality_summary


def generate_fingerprints_array(smiles_list: List[str]) -> Tuple[np.ndarray, List[int]]:
    """
    Generate Morgan fingerprints (1024-bit, radius 2) for a list of SMILES.
    Returns (X_matrix_uint8, valid_indices).
    """
    fps = []
    valid_indices = []

    for idx, smi in enumerate(smiles_list):
        try:
            mol = Chem.MolFromSmiles(smi)
            if mol is None:
                continue
            fp = _fp_generator.GetFingerprint(mol)
            arr = np.zeros((MORGAN_N_BITS,), dtype=np.uint8)
            DataStructs.ConvertToNumpyArray(fp, arr)
            fps.append(arr)
            valid_indices.append(idx)
        except Exception:
            continue

    if not fps:
        raise ValueError("Gagal membuat Morgan Fingerprints untuk struktur molekul yang diberikan.")

    return np.array(fps, dtype=np.uint8), valid_indices

