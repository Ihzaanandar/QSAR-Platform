import { ApiResponse, QsarPredictionResult, ProblematicRowItem } from '../types/dataset';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function uploadDatasetFile(file: File): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/datasets`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data as ApiResponse;
  } catch (error: any) {
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
