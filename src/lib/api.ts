import {
  ApiResponse,
  QsarPredictionResult,
  ProblematicRowItem,
  TargetMetadata,
  TrainingJobStatusData,
  TrainingJobResult,
  QSARModelItem,
  MultiTargetPredictionResult
} from '../types/dataset';

function normalizeBaseUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/\/$/, '');
  // If user entered domain without protocol (e.g. qsar-platform-production.up.railway.app), prepend https://
  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
}

const PROD_RAILWAY_URL = 'https://qsar-platform-production.up.railway.app';

const rawEnvUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = rawEnvUrl
  ? normalizeBaseUrl(rawEnvUrl)
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? PROD_RAILWAY_URL : '');

export async function uploadDatasetFile(file: File): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/datasets`, {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!API_BASE_URL && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return {
          success: false,
          message: 'Backend API belum terhubung ke Vercel.',
          errors: [
            'Frontend Vercel belum mengetahui URL backend Railway Anda. Silakan tambahkan Environment Variable "VITE_API_URL" pada dashboard Vercel, lalu klik Redeploy.',
          ],
        };
      }
      return {
        success: false,
        message: 'Server backend tidak merespons dalam format JSON.',
        errors: [`Status server: ${response.status} ${response.statusText}. Pastikan server backend sedang aktif.`],
      };
    }

    const data = await response.json();
    return data as ApiResponse;
  } catch (error: any) {
    if (!API_BASE_URL && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return {
        success: false,
        message: 'Backend API belum terhubung ke Vercel.',
        errors: [
          'Frontend Vercel belum mengetahui URL backend Railway Anda. Silakan tambahkan Environment Variable "VITE_API_URL" pada dashboard Vercel, lalu klik Redeploy.',
        ],
      };
    }
    return {
      success: false,
      message: 'Gagal terhubung ke server backend.',
      errors: [error?.message || 'Koneksi jaringan terputus atau server tidak merespons.'],
    };
  }
}

export async function runQsarPrediction(
  datasetId: string,
  smilesColumn?: string
): Promise<{ success: boolean; data?: QsarPredictionResult; message?: string; errors?: string[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/datasets/${datasetId}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ smiles_column: smilesColumn }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'Gagal terhubung ke model QSAR.',
        errors: [`Respons server bukan JSON (Status ${response.status}). Pastikan backend Railway aktif.`],
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke modul inferensi QSAR.',
      errors: [error?.message || 'Koneksi ke backend server gagal saat prediksi molekuler.'],
    };
  }
}

export async function getDatasetIssues(datasetId: string): Promise<{
  success: boolean;
  data?: {
    problematic_rows: ProblematicRowItem[];
    problematic_rows_count: number;
    duplicate_rows: number;
    missing_values_total: number;
  };
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/datasets/${datasetId}/issues`);
    return await res.json();
  } catch {
    return { success: false };
  }
}

export function getPredictionCsvDownloadUrl(datasetId: string): string {
  return `${API_BASE_URL}/api/v1/datasets/${datasetId}/predictions/download`;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// QSAR PLATFORM v2.0 API FUNCTIONS
// ============================================================================

export async function fetchTargetInfo(chemblId: string): Promise<{
  success: boolean;
  data?: TargetMetadata;
  message?: string;
}> {
  try {
    const cleanId = chemblId.trim().toUpperCase();
    const res = await fetch(`${API_BASE_URL}/api/v1/targets/${cleanId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || `Target ${chemblId} tidak ditemukan di ChEMBL.` };
    }
    const json = await res.json();
    return { success: true, data: json.data };
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal menghubungi server backend.' };
  }
}

export async function fetchChemblData(chemblTargetId: string, standardType = 'IC50', maxRecords = 1500): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chembl/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chembl_target_id: chemblTargetId.trim().toUpperCase(),
        standard_type: standardType,
        max_records: maxRecords
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || 'Gagal mengambil data bioaktivitas dari ChEMBL.' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal menghubungi server backend.' };
  }
}

export interface StartTrainingPayload {
  source_type: 'chembl' | 'upload';
  chembl_target_id?: string;
  target_name?: string;
  organism?: string;
  endpoint?: string;
  unit?: string;
  test_size?: number;
  cv_folds?: number;
  random_state?: number;
  optimize_hyperparams?: boolean;
  custom_records?: Array<Record<string, any>>;
}

export async function startTrainingJob(payload: StartTrainingPayload): Promise<{
  success: boolean;
  job_id?: string;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/training/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || 'Gagal memulai pekerjaan pelatihan model.' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal menghubungi server backend.' };
  }
}

export async function getTrainingJobStatus(jobId: string): Promise<{
  success: boolean;
  data?: TrainingJobStatusData;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/training/jobs/${jobId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || 'Gagal memeriksa status pelatihan.' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Koneksi ke backend terputus.' };
  }
}

export async function getTrainingJobResults(jobId: string): Promise<{
  success: boolean;
  data?: TrainingJobResult;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/training/jobs/${jobId}/results`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || 'Gagal mengambil hasil evaluasi pelatihan.' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Koneksi ke backend terputus.' };
  }
}

export async function saveTrainingModel(jobId: string, modelName?: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/training/jobs/${jobId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: modelName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || 'Gagal menyimpan model ke Model Library.' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal menghubungi server backend.' };
  }
}

export async function getModelsList(endpoint?: string, search?: string): Promise<{
  success: boolean;
  count: number;
  data: QSARModelItem[];
}> {
  try {
    const params = new URLSearchParams();
    if (endpoint && endpoint !== 'ALL') params.append('endpoint', endpoint);
    if (search) params.append('search', search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/models${qs}`);
    if (!res.ok) return { success: false, count: 0, data: [] };
    return await res.json();
  } catch {
    return { success: false, count: 0, data: [] };
  }
}

export async function getModelDetails(modelId: string): Promise<{
  success: boolean;
  data?: QSARModelItem;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/models/${modelId}`);
    if (!res.ok) return { success: false, message: 'Model tidak ditemukan.' };
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function deleteModel(modelId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/models/${modelId}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export function getModelDownloadUrl(modelId: string): string {
  return `${API_BASE_URL}/api/v1/models/${modelId}/download`;
}

export async function predictCompoundsMulti(file: File, modelId: string): Promise<{
  success: boolean;
  data?: MultiTargetPredictionResult;
  message?: string;
  errors?: string[];
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/v1/predictions?model_id=${encodeURIComponent(modelId)}`, {
      method: 'POST',
      body: formData
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'Server backend tidak merespons dalam format JSON.',
        errors: [`Status server: ${res.status}. Pastikan server backend sedang aktif.`]
      };
    }

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: json.detail || 'Gagal memproses prediksi senyawa.',
        errors: [json.detail || `HTTP Error ${res.status}`]
      };
    }

    return { success: true, data: json.data };
  } catch (e: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke backend server saat menjalankan prediksi.',
      errors: [e.message || 'Koneksi jaringan terputus.']
    };
  }
}

export function getPredictionDownloadUrl(predictionId: string): string {
  return `${API_BASE_URL}/api/v1/predictions/${predictionId}/download`;
}

