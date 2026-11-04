from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DatasetSummaryResponse(BaseModel):
    dataset_id: str
    filename: str
    file_size_bytes: int
    total_rows: int
    total_columns: int
    columns: List[str]
    column_details: Optional[List[Dict[str, Any]]] = None
    missing_values_total: int
    missing_values_by_column: Dict[str, int]
    duplicate_rows: int
    problematic_rows: Optional[List[Dict[str, Any]]] = None
    problematic_rows_count: Optional[int] = None
    validation_status: str
    warnings: List[str]
    preview: List[Dict[str, Any]]
    uploaded_at: str
    smiles_column_detected: Optional[bool] = None
    smiles_column_name: Optional[str] = None
    qsar_predictions: Optional[Dict[str, Any]] = None

class ApiResponseSuccess(BaseModel):
    success: bool = True
    message: str
    data: DatasetSummaryResponse

class ApiResponseError(BaseModel):
    success: bool = False
    message: str
    errors: List[str]
