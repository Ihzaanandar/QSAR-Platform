export interface ColumnDetail {
  name: string;
  index: number;
  inferredType: 'number' | 'string' | 'boolean' | 'empty';
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean | null)[];
}

export interface ProblematicRowIssue {
  type: 'duplicate' | 'missing_value' | 'invalid_smiles' | 'inconsistent_columns';
  column?: string;
  message: string;
  duplicate_of_row?: number;
  suggested_action: string;
}

export interface ProblematicRowItem {
  row_number: number; // 1-based row in Excel/CSV (Row 1 is header, Row 2 is first data row)
  data_row_index: number; // 1-based index among data rows
  issues: ProblematicRowIssue[];
  row_data: Record<string, any>;
}

export interface DatasetSummary {
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  columns: string[];
  column_details?: ColumnDetail[];
  missing_values_total: number;
  missing_values_by_column: Record<string, number>;
  duplicate_rows: number;
  problematic_rows?: ProblematicRowItem[];
  problematic_rows_count?: number;
  validation_status: 'valid' | 'valid_with_warnings' | 'rejected';
  warnings: string[];
  errors?: string[];
  preview: Record<string, any>[];
  uploaded_at: string;
  smiles_column_detected?: boolean;
  smiles_column_name?: string | null;
  qsar_predictions?: QsarPredictionResult;
}

export interface QsarPredictionItem {
  row_index: number;
  compound_id: string;
  input_smiles: string;
  canonical_smiles: string | null;
  predicted_pIC50: number | null;
  predicted_IC50_nM: number | null;
  activity_class: string | null;
  nearest_tanimoto: number | null;
  applicability_status: string | null;
  status: string;
}

export interface QsarPredictionSummary {
  total_compounds: number;
  valid_compounds: number;
  invalid_compounds: number;
  smiles_column: string;
  id_column: string | null;
  active_count: number;
  moderate_count: number;
  inactive_count: number;
  mean_pIC50: number | null;
  median_pIC50: number | null;
  min_pIC50: number | null;
  max_pIC50: number | null;
  mean_tanimoto: number | null;
}

export interface QsarPredictionResult {
  success: boolean;
  target: string;
  target_chembl_id: string;
  model_name: string;
  summary: QsarPredictionSummary;
  predictions: QsarPredictionItem[];
  output_csv_filename?: string;
  error?: string;
}

export interface ApiSuccessResponse {
  success: true;
  message: string;
  data: DatasetSummary;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: string[];
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

export interface SampleDatasetInfo {
  id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
  category: 'valid' | 'warning' | 'error';
  filename: string;
}
