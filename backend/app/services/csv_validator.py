import io
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List

def validate_csv_with_pandas(file_bytes: bytes, filename: str) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Parses and inspects uploaded CSV bytes with Pandas as specified in PRD Section 8, 9, and 12.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if len(file_bytes) == 0:
        return False, {}, ["File kosong atau tidak memiliki baris data."]

    lower_fn = filename.lower()
    df = None

    if lower_fn.endswith(('.xlsx', '.xls')):
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
        except Exception as e:
            return False, {}, [f"Gagal membaca file Excel (.xlsx / .xls): {str(e)}"]
    else:
        # Try different encodings and separators
        for enc in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                content_str = file_bytes.decode(enc)
                stream = io.StringIO(content_str)
                temp_df = pd.read_csv(stream, sep=None, engine='python', keep_default_na=True)
                if len(temp_df.columns) > 1:
                    df = temp_df
                    break
                elif df is None:
                    df = temp_df
            except Exception:
                continue

        if df is None:
            return False, {}, ["File tidak dapat didekode atau diproses sebagai CSV yang valid."]

    if df.empty and len(df.columns) == 0:
        return False, {}, ["File dataset kosong."]

    if len(df) == 0:
        return False, {}, ["File hanya berisi baris header tanpa baris data."]

    # Check header
    columns = [str(col).strip() for col in df.columns]
    seen_cols = set()
    for idx, col in enumerate(columns):
        if not col or col.startswith("Unnamed:"):
            errors.append(f"Header kolom pada posisi indeks ke-{idx + 1} kosong.")
        elif col.lower() in seen_cols:
            errors.append(f"Ditemukan nama kolom duplikat pada baris header: '{col}'.")
        else:
            seen_cols.add(col.lower())

    if errors:
        return False, {}, errors

    total_rows = int(len(df))
    total_columns = int(len(columns))

    # Calculate missing values
    missing_by_column_series = df.isna().sum()
    missing_by_column: Dict[str, int] = {str(k): int(v) for k, v in missing_by_column_series.items()}
    missing_values_total = int(missing_by_column_series.sum())

    if missing_values_total > 0:
        warnings.append(f"Ditemukan {missing_values_total} nilai kosong (missing values) pada dataset.")

    # Duplicate rows count and extraction
    duplicate_rows = int(df.duplicated().sum())
    if duplicate_rows > 0:
        warnings.append(f"Ditemukan {duplicate_rows} baris duplikat pada dataset.")

    # Collect problematic rows (duplicates and missing values) with exact row numbers
    problematic_rows_dict = {}
    row_signatures = {}

    for idx, row in df.iterrows():
        excel_row_num = int(idx) + 2  # Row 1 is header
        sig = tuple(str(v) for v in row.values)
        row_dict = {col: (None if pd.isna(val) else str(val)) for col, val in row.items()}

        if sig in row_signatures:
            first_seen_row = row_signatures[sig]
            if excel_row_num not in problematic_rows_dict:
                problematic_rows_dict[excel_row_num] = {
                    "row_number": excel_row_num,
                    "data_row_index": int(idx) + 1,
                    "issues": [],
                    "row_data": row_dict,
                }
            problematic_rows_dict[excel_row_num]["issues"].append({
                "type": "duplicate",
                "message": f"Duplikat persis dari baris ke-{first_seen_row}",
                "duplicate_of_row": first_seen_row,
                "suggested_action": f"Baris ini identik dengan baris ke-{first_seen_row}. Hapus baris ke-{excel_row_num} di Excel jika tidak disengaja.",
            })
        else:
            row_signatures[sig] = excel_row_num

        # Check missing values in row
        for col in columns:
            val = row[col]
            if pd.isna(val) or str(val).strip() == "" or str(val).strip().lower() in ["na", "nan", "null"]:
                if excel_row_num not in problematic_rows_dict:
                    problematic_rows_dict[excel_row_num] = {
                        "row_number": excel_row_num,
                        "data_row_index": int(idx) + 1,
                        "issues": [],
                        "row_data": row_dict,
                    }
                problematic_rows_dict[excel_row_num]["issues"].append({
                    "type": "missing_value",
                    "column": col,
                    "message": f"Nilai kosong (missing value) pada kolom '{col}'",
                    "suggested_action": f"Lengkapi nilai kosong pada kolom '{col}' di baris ke-{excel_row_num}.",
                })

    problematic_rows = list(problematic_rows_dict.values())

    # Check constant single-value columns
    for col in columns:
        if df[col].nunique(dropna=True) == 1:
            warnings.append(f"Kolom '{col}' hanya memiliki 1 nilai unik konstan.")

    # Prepare preview of first 10 rows
    preview_df = df.head(10).replace({np.nan: None})
    preview_rows = preview_df.to_dict(orient="records")

    status = "valid_with_warnings" if warnings else "valid"

    data = {
        "total_rows": total_rows,
        "total_columns": total_columns,
        "columns": columns,
        "missing_values_total": missing_values_total,
        "missing_values_by_column": missing_by_column,
        "duplicate_rows": duplicate_rows,
        "problematic_rows": problematic_rows,
        "problematic_rows_count": len(problematic_rows),
        "validation_status": status,
        "warnings": warnings,
        "preview": preview_rows,
    }

    return True, data, []
