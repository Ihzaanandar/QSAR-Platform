import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from scipy.stats import spearmanr
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.model_selection import GroupKFold, KFold, train_test_split
from app.services.dataset_curator import generate_fingerprints_array


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate standard QSAR regression evaluation metrics."""
    r2 = float(r2_score(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(math.sqrt(mse))
    mae = float(mean_absolute_error(y_true, y_pred))
    
    spearman_corr, _ = spearmanr(y_true, y_pred)
    spearman = float(spearman_corr) if not np.isnan(spearman_corr) else 0.0

    return {
        "r2": round(r2, 3),
        "rmse": round(rmse, 3),
        "mae": round(mae, 3),
        "spearman": round(spearman, 3)
    }


def split_by_scaffold(df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """
    Split dataset into train and test indices by Bemis-Murcko molecular scaffold.
    Ensures structural diversity between training and test partitions.
    """
    scaffold_dict: Dict[str, List[int]] = {}
    for idx, scaf in enumerate(df["scaffold"]):
        scaffold_dict.setdefault(scaf, []).append(idx)

    # Sort scaffold sets by size
    scaffold_sets = sorted(list(scaffold_dict.values()), key=lambda x: len(x), reverse=True)

    n_total = len(df)
    n_test_target = int(math.ceil(n_total * test_size))
    
    train_indices = []
    test_indices = []

    # Assign scaffolds to test set until target reached
    for scaf_indices in scaffold_sets:
        if len(test_indices) + len(scaf_indices) <= n_test_target:
            test_indices.extend(scaf_indices)
        else:
            train_indices.extend(scaf_indices)

    if not test_indices:
        # Fallback to random stratified split if scaffolds too few
        train_idx, test_idx = train_test_split(np.arange(n_total), test_size=test_size, random_state=random_state)
        return train_idx, test_idx

    return np.array(train_indices), np.array(test_indices)


def train_benchmark_models(
    df: pd.DataFrame,
    split_method: str = "scaffold",
    test_size: float = 0.2,
    cv_folds: int = 5,
    random_state: int = 42,
    optimize_hyperparams: bool = False,
    progress_callback=None
) -> Dict[str, Any]:
    """
    Train benchmark models (Random Forest, Extra Trees, SVR, MLP, Dummy Baseline),
    evaluate internal GroupKFold CV and test holdout, and identify the best model.
    """
    if len(df) < 25:
        raise ValueError("Jumlah senyawa unik terlalu sedikit untuk melatih model QSAR yang valid (minimal 25 senyawa).")

    # Generate Morgan Fingerprints
    X, valid_idx = generate_fingerprints_array(df["canonical_smiles"].tolist())
    df_valid = df.iloc[valid_idx].reset_index(drop=True)
    y = df_valid["pic50"].values

    if split_method == "scaffold" and "scaffold" in df_valid.columns:
        train_idx, test_idx = split_by_scaffold(df_valid, test_size=test_size, random_state=random_state)
    else:
        train_idx, test_idx = train_test_split(np.arange(len(df_valid)), test_size=test_size, random_state=random_state)

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    # Setup Cross-Validation
    scaffolds_train = df_valid.iloc[train_idx]["scaffold"].values
    unique_scafs, scaf_labels = np.unique(scaffolds_train, return_inverse=True)

    if len(unique_scafs) >= cv_folds:
        cv = GroupKFold(n_splits=cv_folds)
        cv_split = list(cv.split(X_train, y_train, groups=scaf_labels))
    else:
        cv = KFold(n_splits=cv_folds, shuffle=True, random_state=random_state)
        cv_split = list(cv.split(X_train, y_train))

    # Define candidate model architectures
    models_to_evaluate = {
        "Random Forest": RandomForestRegressor(
            n_estimators=250 if not optimize_hyperparams else 350,
            max_depth=None,
            min_samples_split=3,
            n_jobs=-1,
            random_state=random_state
        ),
        "Extra Trees": ExtraTreesRegressor(
            n_estimators=250,
            min_samples_split=3,
            n_jobs=-1,
            random_state=random_state
        ),
        "Support Vector Regressor (SVR)": SVR(
            kernel="rbf",
            C=3.0,
            epsilon=0.1
        ),
        "MLP Regressor": MLPRegressor(
            hidden_layer_sizes=(128, 64),
            max_iter=350,
            random_state=random_state,
            early_stopping=True
        ),
        "Dummy Baseline": DummyRegressor(strategy="mean")
    }

    results = []
    trained_estimators = {}
    total_models = len(models_to_evaluate)

    for i, (name, model) in enumerate(models_to_evaluate.items()):
        if progress_callback:
            progress_callback(f"Evaluating {name} ({i+1}/{total_models})", int(40 + (i / total_models) * 45))

        # Perform Cross Validation (Calculate Q2)
        cv_q2_scores = []
        for cv_tr_idx, cv_val_idx in cv_split:
            m_cv = model.__class__(**model.get_params())
            m_cv.fit(X_train[cv_tr_idx], y_train[cv_tr_idx])
            y_cv_pred = m_cv.predict(X_train[cv_val_idx])
            cv_q2_scores.append(r2_score(y_train[cv_val_idx], y_cv_pred))

        mean_q2 = float(np.mean(cv_q2_scores))

        # Train on full training set
        model.fit(X_train, y_train)
        trained_estimators[name] = model

        # Predict on Test holdout
        y_test_pred = model.predict(X_test)
        metrics = calculate_metrics(y_test, y_test_pred)
        metrics["q2"] = round(mean_q2, 3)
        metrics["algorithm"] = name

        results.append({
            "name": name,
            "metrics": metrics,
            "predictions_sample": [
                {"actual": round(float(a), 2), "predicted": round(float(p), 2)}
                for a, p in zip(y_test[:100], y_test_pred[:100])
            ]
        })

    # Pick best model based on highest test R2 and Q2 (excluding Dummy)
    valid_candidates = [r for r in results if r["name"] != "Dummy Baseline"]
    best_candidate = max(valid_candidates, key=lambda x: (x["metrics"]["r2"] + x["metrics"]["q2"]))

    # Prepare detailed visualization payload for best model
    best_name = best_candidate["name"]
    best_model = trained_estimators[best_name]
    y_test_pred_best = best_model.predict(X_test)
    y_train_pred_best = best_model.predict(X_train)

    scatter_data = [
        {"actual": float(round(a, 2)), "predicted": float(round(p, 2)), "set": "test"}
        for a, p in zip(y_test, y_test_pred_best)
    ]
    scatter_data.extend([
        {"actual": float(round(a, 2)), "predicted": float(round(p, 2)), "set": "train"}
        for a, p in zip(y_train[:150], y_train_pred_best[:150])
    ])

    residual_data = [
        {"actual": float(round(a, 2)), "residual": float(round(a - p, 2))}
        for a, p in zip(y_test, y_test_pred_best)
    ]

    return {
        "best_model_name": best_name,
        "best_estimator": best_model,
        "train_fingerprints": X_train,
        "model_comparison": results,
        "best_metrics": best_candidate["metrics"],
        "evaluation_charts": {
            "scatter_plot": scatter_data[:300],
            "residuals": residual_data[:300],
            "metrics_comparison": [
                {"model": r["name"], "r2": r["metrics"]["r2"], "q2": r["metrics"]["q2"], "rmse": r["metrics"]["rmse"]}
                for r in results
            ]
        },
        "split_summary": {
            "method": split_method,
            "total_compounds": len(df_valid),
            "train_compounds": len(X_train),
            "test_compounds": len(X_test),
            "cv_folds": cv_folds
        }
    }
