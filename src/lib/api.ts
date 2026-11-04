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
