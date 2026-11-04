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

// ============================================================================
// QSAR PLATFORM v2.0 TYPE DEFINITIONS
// ============================================================================

export interface TargetMetadata {
  chembl_id: string;
  pref_name: string;
  target_type: string;
  organism: string;
  synonyms: string[];
  description?: string;
}

export interface ModelBenchmarkMetrics {
  r2: number;
  rmse: number;
  mae: number;
  q2: number;
  spearman: number;
}

export interface BenchmarkComparisonItem {
  model_name: string;
  test_r2: number;
  test_rmse: number;
  test_mae: number;
  cv_q2: number;
  cv_rmse_mean: number;
  cv_rmse_std: number;
  spearman: number;
  train_time_sec: number;
  is_best?: boolean;
}

export interface ModelScatterPoint {
  actual: number;
  predicted: number;
  residual: number;
  compound_id: string;
  smiles?: string;
}

export interface TrainingQualitySummary {
  total_raw_records: number;
  valid_curated_records: number;
  unique_compounds: number;
  invalid_smiles: number;
  duplicate_records: number;
  pic50_min?: number;
  pic50_max?: number;
  pic50_mean?: number;
  pic50_std?: number;
  activity_distribution?: Array<{ range: string; count: number }>;
}

export interface TrainingJobResult {
  job_id: string;
  target_chembl_id: string;
  target_name: string;
  endpoint: string;
  unit: string;
  organism: string;
  dataset_quality: TrainingQualitySummary;
  benchmark_comparison: BenchmarkComparisonItem[];
  best_model_name: string;
  best_metrics: ModelBenchmarkMetrics;
  scatter_plot: ModelScatterPoint[];
  split_summary: {
    method: string;
    train_size: number;
    test_size: number;
    cv_folds?: number;
  };
}

export interface TrainingJobStatusData {
  job_id: string;
  status: 'queued' | 'fetching_data' | 'curating_data' | 'preprocessing' | 'training' | 'evaluating' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  error_message?: string | null;
  chembl_target_id?: string;
  target_name?: string;
  endpoint?: string;
  has_results: boolean;
}

export interface QSARModelItem {
  id: string;
  model_name: string;
  chembl_target_id: string;
  target_name: string;
  organism: string;
  endpoint: string;
  unit: string;
  algorithm: string;
  version: string;
  status: 'available' | 'training' | 'error';
  metrics?: ModelBenchmarkMetrics;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface MultiTargetPredictionItem {
  row_index: number;
  compound_id: string;
  smiles: string;
  canonical_smiles: string | null;
  predicted_pIC50: number | null;
  predicted_IC50_nM: number | null;
  activity_class: 'Active' | 'Moderate' | 'Inactive' | null;
  nearest_tanimoto: number | null;
  applicability_status: 'In Domain' | 'Borderline' | 'Out of Domain' | null;
  status: 'SUCCESS' | 'FAILED';
  error_reason?: string | null;
}

export interface MultiTargetPredictionResult {
  success: boolean;
  prediction_id: string;
  target: string;
  target_chembl_id: string;
  model_name: string;
  endpoint: string;
  unit: string;
  algorithm: string;
  summary: {
    total_compounds: number;
    valid_compounds: number;
    invalid_compounds: number;
    duplicate_structures: number;
    active_count: number;
    moderate_count: number;
    inactive_count: number;
    mean_tanimoto: number | null;
    processing_time_sec: number;
  };
  predictions: MultiTargetPredictionItem[];
  download_url: string;
}

