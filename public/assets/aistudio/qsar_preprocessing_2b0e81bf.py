import numpy as np
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

def standardize_smiles(smiles):
    if smiles is None:
        return None
    mol = Chem.MolFromSmiles(str(smiles).strip())
    if mol is None:
        return None
    mol = rdMolStandardize.Cleanup(mol)
    mol = rdMolStandardize.FragmentParent(mol)
    mol = rdMolStandardize.Uncharger().uncharge(mol)
    Chem.SanitizeMol(mol)
    return Chem.MolToSmiles(mol, canonical=True, isomericSmiles=True)

def smiles_to_fp_array(smiles):
    canonical = standardize_smiles(smiles)
    if canonical is None:
        return None, None
    mol = Chem.MolFromSmiles(canonical)
    fp = _fp_generator.GetFingerprint(mol)
    arr = np.zeros((MORGAN_N_BITS,), dtype=np.uint8)
    DataStructs.ConvertToNumpyArray(fp, arr)
    return canonical, arr

def predict_smiles(smiles, artifact):
    canonical, arr = smiles_to_fp_array(smiles)
    if arr is None:
        return None
    predicted_pic50 = float(artifact["model"].predict(arr.reshape(1, -1))[0])
    predicted_ic50_nm = float(10 ** (9 - predicted_pic50))
    return {
        "canonical_smiles": canonical,
        "predicted_pIC50": predicted_pic50,
        "predicted_IC50_nM": predicted_ic50_nm,
    }
