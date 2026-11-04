import sys
import os
import json
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import joblib
from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator
from rdkit.Chem.MolStandardize import rdMolStandardize

MORGAN_RADIUS = 2
MORGAN_N_BITS = 1024
MORGAN_INCLUDE_CHIRALITY = False

_fp_generator = rdFingerprintGenerator.GetMorganGenerator(
    radius=MORGAN_RADIUS,
    fpSize=MORGAN_N_BITS,
    includeChirality=MORGAN_INCLUDE_CHIRALITY,
)

def read_csv_safely(input_csv_path):
    lower = input_csv_path.lower()
    if lower.endswith('.xlsx') or lower.endswith('.xls'):
        try:
            return pd.read_excel(input_csv_path)
        except Exception as e:
            print(f"Warning: could not read with pd.read_excel: {e}", file=sys.stderr)

    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
    delimiters = [None, ';', ',', '\t', '|']
    for enc in encodings:
        for sep in delimiters:
            try:
                if sep is None:
                    df = pd.read_csv(input_csv_path, sep=None, engine='python', encoding=enc)
                else:
                    df = pd.read_csv(input_csv_path, sep=sep, encoding=enc)
                if len(df.columns) > 1:
                    return df
            except Exception:
                continue
    for enc in encodings:
        try:
            return pd.read_csv(input_csv_path, sep=None, engine='python', encoding=enc)
        except Exception:
            continue
    return pd.read_csv(input_csv_path, encoding='latin-1')

def find_smiles_column(df, preferred_col=None):
    if preferred_col and preferred_col in df.columns:
        return preferred_col

    candidates = [
        'smiles', 'canonical_smiles', 'canonical smiles', 'structure',
        'compound_smiles', 'mol_smiles', 'input_smiles', 'smiles_string',
        'struktur', 'notasi_smiles'
    ]
    for c in df.columns:
        if str(c).strip().lower() in candidates:
            return c

    for c in df.columns:
        low = str(c).strip().lower()
        if 'smiles' in low or 'structure' in low or 'struktur' in low:
            return c

    for c in df.columns:
        sample = df[c].dropna().astype(str).head(15)
        valid_count = 0
        for s in sample:
            clean_s = s.strip()
            if len(clean_s) > 1 and Chem.MolFromSmiles(clean_s) is not None:
                valid_count += 1
        if valid_count >= 2:
            return c

    if len(df.columns) == 1:
        return df.columns[0]

    return None

def find_id_column(df, smiles_col):
    candidates = ['id', 'compound_id', 'mol_id', 'molecule_id', 'name', 'compound_name', 'chembl_id', 'senyawa']
    for c in df.columns:
        if str(c).strip().lower() in candidates and c != smiles_col:
            return c
    for c in df.columns:
        if c != smiles_col:
            return c
    return None

def standardize_smiles(smiles):
    if smiles is None or pd.isna(smiles):
        return None
    s = str(smiles).strip()
    if not s or s.lower() == 'nan':
        return None
    try:
        mol = Chem.MolFromSmiles(s)
        if mol is None:
            return None
        mol = rdMolStandardize.Cleanup(mol)
        mol = rdMolStandardize.FragmentParent(mol)
        mol = rdMolStandardize.Uncharger().uncharge(mol)
        Chem.SanitizeMol(mol)
        return Chem.MolToSmiles(mol, canonical=True, isomericSmiles=True)
    except Exception:
        return None

def smiles_to_fp_array(canonical):
    if canonical is None:
        return None
    try:
        mol = Chem.MolFromSmiles(canonical)
        if mol is None:
            return None
        fp = _fp_generator.GetFingerprint(mol)
        arr = np.zeros((MORGAN_N_BITS,), dtype=np.uint8)
        DataStructs.ConvertToNumpyArray(fp, arr)
        return arr
    except Exception:
        return None

def calculate_max_tanimoto(query_fp, ref_fps):
    if query_fp is None or ref_fps is None or len(ref_fps) == 0:
        return None
    try:
        intersections = np.dot(ref_fps, query_fp)
        q_sum = np.sum(query_fp)
        ref_sums = np.sum(ref_fps, axis=1)
        unions = ref_sums + q_sum - intersections
        valid_mask = unions > 0
        tanimoto = np.zeros(len(ref_fps), dtype=np.float32)
        tanimoto[valid_mask] = intersections[valid_mask] / unions[valid_mask]
        return float(np.max(tanimoto))
    except Exception:
        return None

def run_prediction_on_csv(input_csv_path, output_json_path=None, output_csv_path=None, artifacts_dir='idh1_qsar_artifacts', preferred_smiles_col=None):
    if not os.path.exists(artifacts_dir):
        parent_artifacts = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'idh1_qsar_artifacts')
        if os.path.exists(parent_artifacts):
            artifacts_dir = parent_artifacts

    model_path = os.path.join(artifacts_dir, 'idh1_general_qsar.joblib')
    ref_fp_path = os.path.join(artifacts_dir, 'training_reference_fingerprints.npz')

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")

    artifact = joblib.load(model_path)
    model = artifact['model'] if isinstance(artifact, dict) and 'model' in artifact else artifact

    ref_fps = None
    if os.path.exists(ref_fp_path):
        try:
            ref_data = np.load(ref_fp_path, allow_pickle=True)
            if 'X' in ref_data:
                ref_fps = ref_data['X'].astype(np.uint8)
        except Exception as e:
            print(f"Warning: could not load reference fingerprints: {e}", file=sys.stderr)

    df = read_csv_safely(input_csv_path)

    if len(df.columns) == 1 and ';' in str(df.columns[0]):
        try:
            df = pd.read_csv(input_csv_path, sep=';', encoding='latin-1')
        except Exception:
            pass

    smiles_col = find_smiles_column(df, preferred_smiles_col)
    if not smiles_col:
        return {
            "success": False,
            "error": "Kolom struktur molekul (SMILES) tidak terdeteksi dalam dataset CSV."
        }

    id_col = find_id_column(df, smiles_col)

    results = []
    valid_fps = []
    valid_indices = []

    for idx, row in df.iterrows():
        raw_smiles = row[smiles_col]
        cid = str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"CMP_{idx + 1}"
        canonical = standardize_smiles(raw_smiles)

        rec = {
            "row_index": idx,
            "compound_id": cid,
            "input_smiles": str(raw_smiles) if pd.notna(raw_smiles) else "",
            "canonical_smiles": canonical,
            "predicted_pIC50": None,
            "predicted_IC50_nM": None,
            "activity_class": None,
            "nearest_tanimoto": None,
            "applicability_status": None,
            "status": "Invalid SMILES" if canonical is None else "Ready"
        }

        if canonical is not None:
            fp_arr = smiles_to_fp_array(canonical)
            if fp_arr is not None:
                valid_fps.append(fp_arr)
                valid_indices.append(idx)
            else:
                rec["status"] = "Fingerprint generation failed"

        results.append(rec)

    if valid_fps:
        X_batch = np.array(valid_fps, dtype=np.uint8)
        preds = model.predict(X_batch)

        for i, val_idx in enumerate(valid_indices):
            pic50 = float(preds[i])
            ic50_nm = float(10 ** (9 - pic50))
            
            tanimoto = None
            if ref_fps is not None:
                tanimoto = calculate_max_tanimoto(X_batch[i], ref_fps)

            if pic50 >= 6.0:
                act_class = "Active (High Potency)"
            elif pic50 >= 5.0:
                act_class = "Moderate Potency"
            else:
                act_class = "Inactive / Low Potency"

            if tanimoto is not None:
                app_status = "Within Domain (High Similarity)" if tanimoto >= 0.3 else ("Borderline Domain" if tanimoto >= 0.2 else "Outside Domain (Novel Scaffold)")
            else:
                app_status = "Unknown"

            results[val_idx]["predicted_pIC50"] = round(pic50, 4)
            results[val_idx]["predicted_IC50_nM"] = round(ic50_nm, 2)
            results[val_idx]["activity_class"] = act_class
            results[val_idx]["nearest_tanimoto"] = round(tanimoto, 4) if tanimoto is not None else None
            results[val_idx]["applicability_status"] = app_status
            results[val_idx]["status"] = "Success"

    valid_predictions = [r for r in results if r["status"] == "Success"]
    pic50_values = [r["predicted_pIC50"] for r in valid_predictions]
    tanimoto_values = [r["nearest_tanimoto"] for r in valid_predictions if r["nearest_tanimoto"] is not None]

    summary = {
        "total_compounds": len(results),
        "valid_compounds": len(valid_predictions),
        "invalid_compounds": len(results) - len(valid_predictions),
        "smiles_column": str(smiles_col),
        "id_column": str(id_col) if id_col else None,
        "available_columns": [str(c) for c in df.columns],
        "active_count": sum(1 for r in valid_predictions if r["activity_class"] == "Active (High Potency)"),
        "moderate_count": sum(1 for r in valid_predictions if r["activity_class"] == "Moderate Potency"),
        "inactive_count": sum(1 for r in valid_predictions if r["activity_class"] == "Inactive / Low Potency"),
        "mean_pIC50": round(float(np.mean(pic50_values)), 4) if pic50_values else None,
        "median_pIC50": round(float(np.median(pic50_values)), 4) if pic50_values else None,
        "min_pIC50": round(float(np.min(pic50_values)), 4) if pic50_values else None,
        "max_pIC50": round(float(np.max(pic50_values)), 4) if pic50_values else None,
        "mean_tanimoto": round(float(np.mean(tanimoto_values)), 4) if tanimoto_values else None,
    }

    output_data = {
        "success": True,
        "target": "IDH1 (Isocitrate Dehydrogenase 1)",
        "target_chembl_id": "CHEMBL2007625",
        "model_name": "Random Forest Regressor",
        "summary": summary,
        "predictions": results
    }

    if output_csv_path:
        out_df = df.copy()
        out_df["QSAR_Canonical_SMILES"] = [r["canonical_smiles"] for r in results]
        out_df["QSAR_Predicted_pIC50"] = [r["predicted_pIC50"] for r in results]
        out_df["QSAR_Predicted_IC50_nM"] = [r["predicted_IC50_nM"] for r in results]
        out_df["QSAR_Activity_Class"] = [r["activity_class"] for r in results]
        out_df["QSAR_Nearest_Tanimoto"] = [r["nearest_tanimoto"] for r in results]
        out_df["QSAR_Applicability_Status"] = [r["applicability_status"] for r in results]
        out_df["QSAR_Status"] = [r["status"] for r in results]
        out_df.to_csv(output_csv_path, index=False)
        output_data["output_csv_filename"] = os.path.basename(output_csv_path)

    if output_json_path:
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)

    return output_data
