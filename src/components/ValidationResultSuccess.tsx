import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Database,
  Hash,
  Table,
  Columns as ColumnsIcon,
  Info,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Loader2,
  Search,
  Activity,
  Layers,
  Copy,
  CheckCheck
} from 'lucide-react';
import { DatasetSummary, QsarPredictionResult, ProblematicRowItem } from '../types/dataset';
import { runQsarPrediction, getPredictionCsvDownloadUrl, getDatasetIssues } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

interface ValidationResultSuccessProps {
  dataset: DatasetSummary;
  onReset: () => void;
}

export const ValidationResultSuccess: React.FC<ValidationResultSuccessProps> = ({ dataset, onReset }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'columns' | 'issues' | 'predictions'>('overview');
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<QsarPredictionResult | null>(
    dataset.qsar_predictions || null
  );
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<'all' | 'active' | 'moderate' | 'inactive'>('all');
  const [issueFilter, setIssueFilter] = useState<'all' | 'duplicate' | 'missing'>('all');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);
  const [selectedSmilesCol, setSelectedSmilesCol] = useState<string>(
    dataset.smiles_column_name || dataset.columns[0] || 'smiles'
  );

  const [internalProblematicRows, setInternalProblematicRows] = useState<ProblematicRowItem[]>(
    dataset.problematic_rows || []
  );
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);

  // Auto-fetch problematic rows if dataset was loaded before backend tracking was active
  useEffect(() => {
    if (dataset.problematic_rows && dataset.problematic_rows.length > 0) {
      setInternalProblematicRows(dataset.problematic_rows);
      return;
    }

    if (dataset.dataset_id && (dataset.duplicate_rows > 0 || dataset.missing_values_total > 0)) {
      setIsLoadingIssues(true);
      getDatasetIssues(dataset.dataset_id)
        .then((resData) => {
          if (resData.success && resData.data?.problematic_rows && resData.data.problematic_rows.length > 0) {
            setInternalProblematicRows(resData.data.problematic_rows);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch dataset issues from server:', err);
        })
        .finally(() => {
          setIsLoadingIssues(false);
        });
    }
  }, [dataset.dataset_id, dataset.problematic_rows, dataset.duplicate_rows, dataset.missing_values_total]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const hasWarnings = dataset.warnings && dataset.warnings.length > 0;
  const problematicRows = internalProblematicRows.length > 0
    ? internalProblematicRows
    : (dataset.problematic_rows || []);
  const totalIssuesCount = dataset.problematic_rows_count ?? problematicRows.length;

  const duplicateIssueCount = problematicRows.filter((item) =>
    item.issues.some((i) => i.type === 'duplicate')
  ).length || dataset.duplicate_rows || 0;
  const missingIssueCount = problematicRows.filter((item) =>
    item.issues.some((i) => i.type === 'missing_value')
  ).length || (dataset.missing_values_total > 0 ? dataset.missing_values_total : 0);

  const filteredProblematicRows = problematicRows.filter((item) => {
    if (issueFilter === 'all') return true;
    if (issueFilter === 'duplicate') return item.issues.some((i) => i.type === 'duplicate');
    if (issueFilter === 'missing') return item.issues.some((i) => i.type === 'missing_value');
    return true;
  });

  const handleDownloadIssuesCsv = () => {
    if (!problematicRows || problematicRows.length === 0) return;
    
    const headers = ['No_Baris_Excel', 'Index_Data', 'Jenis_Masalah', 'Pesan_Masalah', 'Panduan_Perbaikan', ...dataset.columns];
    const rows = problematicRows.map((item) => {
      const issueTypes = item.issues.map((i) => i.type).join('; ');
      const issueMessages = item.issues.map((i) => i.message).join('; ');
      const suggestedActions = item.issues.map((i) => i.suggested_action).join('; ');
      const dataVals = dataset.columns.map((c) => {
        const val = item.row_data?.[c];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      });
      return [
        item.row_number,
        item.data_row_index,
        `"${issueTypes}"`,
        `"${issueMessages}"`,
        `"${suggestedActions}"`,
        ...dataVals,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `${dataset.filename.replace(/\.(csv|xlsx|xls)$/i, '')}_problematic_rows.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyRowData = (item: any, idx: number) => {
    const formatted = Object.entries(item.row_data || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    navigator.clipboard.writeText(formatted);
    setCopiedRowIdx(idx);
    setTimeout(() => setCopiedRowIdx(null), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${dataset.filename.replace(/\.(csv|xlsx|xls)$/i, '')}_validation_summary.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPredictionJson = () => {
    if (!predictionResult) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(predictionResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${dataset.filename.replace(/\.(csv|xlsx|xls)$/i, '')}_idh1_predictions.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRunPrediction = async (customCol?: string) => {
    setIsPredicting(true);
    setPredictionError(null);
    setActiveTab('predictions');
    const colToUse = customCol || selectedSmilesCol;
    try {
      const res = await runQsarPrediction(dataset.dataset_id, colToUse);
      if (res.success && res.data) {
        setPredictionResult(res.data);
      } else {
        setPredictionError(res.message || res.errors?.[0] || 'Gagal menjalankan prediksi model QSAR.');
      }
    } catch (err: any) {
      setPredictionError(err.message || 'Koneksi ke backend server gagal saat memproses model.');
    } finally {
      setIsPredicting(false);
    }
  };

  const copySmiles = (smiles: string, idx: number) => {
    navigator.clipboard.writeText(smiles);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner Alert (Matching Reference Board 1 & 2) */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          hasWarnings
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                hasWarnings ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {hasWarnings ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {hasWarnings
                  ? t.success.warningTitle
                  : t.success.successTitle}
              </h3>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  hasWarnings ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {hasWarnings
                  ? t.success.warningDesc
                  : t.success.successDesc}
              </p>
              
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                {dataset.smiles_column_detected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-blue-700 bg-blue-100/70 border border-blue-200/80">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {language === 'id' 
                      ? `Kolom SMILES terdeteksi (${dataset.smiles_column_name || 'smiles'}). Model QSAR IDH1 siap memprediksi!`
                      : `SMILES column detected (${dataset.smiles_column_name || 'smiles'}). IDH1 QSAR Model is ready!`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-slate-700 bg-slate-100 border border-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {language === 'id'
                      ? 'Model QSAR IDH1 siap memprediksi menggunakan kolom struktur dataset.'
                      : 'IDH1 QSAR model is ready to predict using dataset structure column.'}
                  </span>
                )}
                {hasWarnings && (
                  <span className="text-[11px] font-medium text-amber-800">
                    {language === 'id' 
                      ? '(Catatan peringatan tidak menghalangi proses prediksi)' 
                      : '(Warnings do not block the prediction workflow)'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <button
              onClick={() => handleRunPrediction()}
              disabled={isPredicting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isPredicting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.prediction.btnRunning}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {predictionResult 
                      ? (language === 'id' ? 'Lihat Hasil Prediksi' : 'View Predictions') 
                      : (hasWarnings 
                          ? (language === 'id' ? '⚡ Tetap Jalankan Prediksi QSAR' : '⚡ Proceed with QSAR Prediction') 
                          : t.prediction.btnRun)}
                  </span>
                </>
              )}
            </button>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.success.btnReplace}</span>
            </button>
          </div>
        </div>

        {/* Warning bullets if any */}
        {hasWarnings && (
          <div className="mt-4 pt-3 border-t border-amber-200/60 text-xs text-amber-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-amber-900">
                {t.success.warningCatatan}
              </p>
              {problematicRows.length > 0 && (
                <button
                  onClick={() => setActiveTab('issues')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-200/80 hover:bg-amber-300 text-amber-950 transition-colors cursor-pointer border border-amber-300/70 shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5 text-amber-900" />
                  <span>{t.success.viewIssuesBtn} ({problematicRows.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {dataset.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Segmented Tab Controls (Responsive Horizontal Scrollable on Mobile) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="overflow-x-auto scrollbar-none pb-1 lg:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100 rounded-xl w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>{t.success.tabOverview}</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{t.success.tabPreview} ({Math.min(dataset.total_rows, 10)} Rows)</span>
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'columns'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ColumnsIcon className="w-4 h-4" />
              <span>{t.success.tabColumns} ({dataset.total_columns})</span>
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'issues'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : problematicRows.length > 0
                  ? 'text-amber-800 hover:bg-amber-100/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeTab === 'issues' ? 'text-white' : problematicRows.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>{t.success.tabIssues}</span>
              {problematicRows.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'issues' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  {problematicRows.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('predictions');
                if (!predictionResult && !isPredicting && dataset.smiles_column_detected) {
                  handleRunPrediction();
                }
              }}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === 'predictions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'predictions' ? 'text-amber-300' : 'text-blue-600'}`} />
              <span>{t.success.tabPredictions}</span>
              {predictionResult && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'predictions' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {predictionResult.summary.valid_compounds}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 flex-wrap sm:flex-nowrap">
          {activeTab === 'issues' && problematicRows.length > 0 && (
            <button
              onClick={handleDownloadIssuesCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-800" />
              <span>{t.success.exportIssuesCsv}</span>
            </button>
          )}
          {activeTab === 'predictions' && predictionResult && (
            <a
              href={getPredictionCsvDownloadUrl(dataset.dataset_id)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download Prediksi (CSV)</span>
            </a>
          )}
          {activeTab === 'predictions' && predictionResult && (
            <button
              onClick={handleDownloadPredictionJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download JSON Prediksi</span>
            </button>
          )}
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Summary (JSON)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Dataset Summary Card (Left 7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>{t.success.summaryTitle}</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  ID: {dataset.dataset_id.slice(0, 8)}...
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblFileName}</span>
                  <span className="font-semibold text-slate-900 font-mono text-xs sm:text-sm truncate max-w-xs">
                    {dataset.filename}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblFileSize}</span>
                  <span className="font-semibold text-slate-900 font-mono text-xs sm:text-sm">
                    {formatFileSize(dataset.file_size_bytes)}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblTotalRows}</span>
                  <span className="font-semibold text-slate-900 font-mono text-xs sm:text-sm tabular-nums">
                    {dataset.total_rows.toLocaleString()}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblTotalCols}</span>
                  <span className="font-semibold text-slate-900 font-mono text-xs sm:text-sm tabular-nums">
                    {dataset.total_columns}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblMissingVals}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold font-mono text-xs sm:text-sm tabular-nums ${
                        dataset.missing_values_total > 0 ? 'text-amber-600' : 'text-slate-900'
                      }`}
                    >
                      {dataset.missing_values_total.toLocaleString()}
                    </span>
                    {dataset.missing_values_total > 0 && (
                      <button
                        onClick={() => {
                          setIssueFilter('missing');
                          setActiveTab('issues');
                        }}
                        className="text-[11px] font-medium text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        {language === 'id' ? 'Lihat baris' : 'View rows'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblDuplicateRows}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold font-mono text-xs sm:text-sm tabular-nums ${
                        dataset.duplicate_rows > 0 ? 'text-amber-600' : 'text-slate-900'
                      }`}
                    >
                      {dataset.duplicate_rows}
                    </span>
                    {dataset.duplicate_rows > 0 && (
                      <button
                        onClick={() => {
                          setIssueFilter('duplicate');
                          setActiveTab('issues');
                        }}
                        className="text-[11px] font-medium text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        {language === 'id' ? 'Lihat baris' : 'View rows'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{t.success.lblValidationStatus}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      dataset.validation_status === 'valid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {dataset.validation_status === 'valid' ? 'Valid' : t.success.statusWarning}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">{language === 'id' ? 'Waktu Diunggah' : 'Uploaded At'}</span>
                  <span className="text-slate-600 font-mono text-xs">
                    {new Date(dataset.uploaded_at).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Status & Invariants Check (Right 5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Validation Status Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h4 className="text-base font-bold text-slate-900">{t.success.statusCardTitle}</h4>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-bold text-emerald-950">{t.success.statusValid}</h5>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {t.success.statusValidDesc}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.success.checkFormatOk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.success.checkHeaderOk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.success.checkColsOk} ({dataset.total_columns} {language === 'id' ? 'kolom' : 'columns'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t.success.checkRowsOk} ({dataset.total_rows} {language === 'id' ? 'baris' : 'rows'})</span>
                  </div>
                </div>
              </div>

              {/* Columns Quick List Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">{t.success.columnsCardTitle} ({dataset.columns.length})</h4>
                  <button
                    onClick={() => setActiveTab('columns')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    {t.success.columnsCardLink}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {dataset.columns.map((colName, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-slate-50 font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 w-5 text-right">{index + 1}</span>
                        <span className="font-semibold text-slate-800 truncate">{colName}</span>
                      </div>
                      {dataset.missing_values_by_column[colName] > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {dataset.missing_values_by_column[colName]} missing
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inline Preview Teaser */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Preview Data (First {Math.min(dataset.total_rows, 5)} Rows)
                </h4>
                <p className="text-xs text-slate-500">
                  Pratinjau cuplikan awal untuk memverifikasi kesesuaian kolom dan nilai.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('preview')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <span>Lihat Seluruh 10 Baris Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100/80 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-slate-400 w-12 text-center">#</th>
                    {dataset.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 whitespace-nowrap font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dataset.preview.slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-center font-semibold bg-slate-50/50">
                        {rowIdx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        return (
                          <td
                            key={col}
                            className={`py-2.5 px-3 whitespace-nowrap max-w-xs truncate ${
                              isNull ? 'text-slate-300 italic' : 'text-slate-700'
                            }`}
                          >
                            {isNull ? '—' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Data Preview (First {dataset.preview.length} Rows)
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan maksimal 10 baris pertama dari {dataset.total_rows.toLocaleString()} total baris data.
              </p>
            </div>

            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {dataset.total_columns} kolom · {dataset.preview.length} baris pratinjau
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5 text-slate-400 w-12 text-center bg-slate-200/50">#</th>
                  {dataset.columns.map((col) => (
                    <th key={col} className="py-3 px-3.5 whitespace-nowrap font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataset.preview.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-400 text-center font-bold bg-slate-50">
                      {rowIdx + 1}
                    </td>
                    {dataset.columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;
                      return (
                        <td
                          key={col}
                          className={`py-2.5 px-3.5 whitespace-nowrap max-w-sm truncate tabular-nums ${
                            isNull ? 'text-slate-300 italic' : 'text-slate-800'
                          }`}
                        >
                          {isNull ? '<empty>' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COLUMN INFORMATION */}
      {activeTab === 'columns' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Column Information & Inferred Types
              </h3>
              <p className="text-xs text-slate-500">
                Struktur data, deteksi tipe data (number/string/boolean), jumlah nilai kosong, dan nilai sampel.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total: {dataset.columns.length} kolom
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 font-bold">Column Name</th>
                  <th className="py-3 px-3 font-bold">Inferred Type</th>
                  <th className="py-3 px-3 font-bold">Missing Count</th>
                  <th className="py-3 px-3 font-bold">Missing %</th>
                  <th className="py-3 px-3 font-bold">Unique Vals</th>
                  <th className="py-3 px-3 font-bold">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(dataset.column_details || []).map((col) => (
                  <tr key={col.index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-center font-bold">{col.index + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{col.name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          col.inferredType === 'number'
                            ? 'bg-blue-50 text-blue-700'
                            : col.inferredType === 'boolean'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {col.inferredType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">
                      {col.missingCount > 0 ? (
                        <span className="text-amber-600 font-semibold">{col.missingCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">
                      {col.missingPercentage > 0 ? (
                        <span className="text-amber-600">{col.missingPercentage}%</span>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-slate-700">{col.uniqueCount}</td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                      {col.sampleValues && col.sampleValues.length > 0
                        ? col.sampleValues.slice(0, 3).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PROBLEMATIC ROWS */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t.success.issuesTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {t.success.issuesSubtitle}
              </p>
            </div>

            {problematicRows.length > 0 && (
              <button
                onClick={handleDownloadIssuesCsv}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-700" />
                <span>{t.success.exportIssuesCsv}</span>
              </button>
            )}
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  {t.success.issueSummaryTotal}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-950 mt-1">
                {problematicRows.length}
              </div>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                {language === 'id' ? 'Baris memerlukan perhatian' : 'Rows requiring attention'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
                  {t.success.issueSummaryDuplicates}
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-950 mt-1">
                {duplicateIssueCount}
              </div>
              <p className="text-[11px] text-rose-800/80 mt-0.5">
                {language === 'id' ? 'Baris memiliki salinan identik' : 'Rows have identical copy'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-orange-50/80 border border-orange-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-900 uppercase tracking-wider">
                  {t.success.issueSummaryMissing}
                </span>
                <span className="w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-orange-950 mt-1">
                {missingIssueCount}
              </div>
              <p className="text-[11px] text-orange-800/80 mt-0.5">
                {language === 'id' ? 'Baris memiliki sel kosong' : 'Rows have empty cell'}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setIssueFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                issueFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.success.filterAllIssues} ({problematicRows.length})
            </button>
            <button
              onClick={() => setIssueFilter('duplicate')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                issueFilter === 'duplicate'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.success.filterDuplicates} ({duplicateIssueCount})
            </button>
            <button
              onClick={() => setIssueFilter('missing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                issueFilter === 'missing'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.success.filterMissing} ({missingIssueCount})
            </button>
          </div>

          {/* Loading or Empty State */}
          {isLoadingIssues ? (
            <div className="p-12 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-600">
                {language === 'id' ? 'Memuat dan menganalisis detail baris bermasalah...' : 'Loading issue details...'}
              </p>
            </div>
          ) : problematicRows.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-950">{t.success.noIssuesTitle}</h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">{t.success.noIssuesDesc}</p>
            </div>
          ) : filteredProblematicRows.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
              {language === 'id'
                ? 'Tidak ada baris yang sesuai dengan filter kategori masalah ini.'
                : 'No rows match this selected issue filter category.'}
            </div>
          ) : (
            /* Table of Problematic Rows */
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap font-bold w-36">
                      {t.success.colExcelRow}
                    </th>
                    <th className="py-3 px-3.5 whitespace-nowrap font-bold w-64">
                      {t.success.colIssueType}
                    </th>
                    <th className="py-3 px-3.5 whitespace-nowrap font-bold w-80">
                      {t.success.colSuggestedAction}
                    </th>
                    <th className="py-3 px-3.5 whitespace-nowrap font-bold">
                      {t.success.colRowContent}
                    </th>
                    <th className="py-3 px-3.5 whitespace-nowrap font-bold text-center w-20">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProblematicRows.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors align-top">
                      {/* Excel Row # */}
                      <td className="py-3.5 px-3.5">
                        <div className="inline-flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            Baris #{item.row_number}
                          </span>
                          <span className="text-[10px] text-slate-500 pl-1 font-sans">
                            Data ke-{item.data_row_index}
                          </span>
                        </div>
                      </td>

                      {/* Detected Issues */}
                      <td className="py-3.5 px-3.5">
                        <div className="space-y-1.5 font-sans">
                          {item.issues.map((issue, iIdx) => (
                            <div key={iIdx} className="space-y-1">
                              {issue.type === 'duplicate' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                    <Copy className="w-3 h-3 text-rose-600" />
                                    {t.success.badgeDuplicate} (Baris #{issue.duplicate_of_row})
                                  </span>
                                  <p className="text-xs text-rose-900 font-medium">
                                    {issue.message}
                                  </p>
                                </div>
                              ) : issue.type === 'missing_value' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                                    <AlertTriangle className="w-3 h-3 text-orange-600" />
                                    {t.success.badgeMissing} ({issue.column})
                                  </span>
                                  <p className="text-xs text-orange-950 font-medium">
                                    {issue.message}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-700">
                                  {issue.message}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Suggested Action */}
                      <td className="py-3.5 px-3.5">
                        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950 font-sans leading-relaxed space-y-1">
                          {item.issues.map((issue, iIdx) => (
                            <p key={iIdx} className="text-[11px]">
                              💡 {issue.suggested_action}
                            </p>
                          ))}
                        </div>
                      </td>

                      {/* Row Content */}
                      <td className="py-3.5 px-3.5">
                        <div className="space-y-1 text-xs">
                          {dataset.columns.map((col) => {
                            const val = item.row_data?.[col];
                            const isNull =
                              val === undefined ||
                              val === null ||
                              String(val).trim() === '' ||
                              String(val).trim().toLowerCase() === 'na';
                            return (
                              <div
                                key={col}
                                className="flex items-baseline gap-2 bg-slate-50 border border-slate-200/70 px-2 py-1 rounded"
                              >
                                <span className="font-semibold text-slate-500 shrink-0 text-[11px]">
                                  {col}:
                                </span>
                                <span
                                  className={`truncate max-w-sm sm:max-w-md ${
                                    isNull ? 'text-rose-500 italic font-bold' : 'text-slate-800'
                                  }`}
                                  title={String(val ?? '')}
                                >
                                  {isNull ? '<kosong / missing>' : String(val)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Action: Copy Row */}
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          onClick={() => copyRowData(item, idx)}
                          title="Salin isi baris data ini"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          {copiedRowIdx === idx ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QSAR IDH1 PREDICTIONS */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Model & Target Specs Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
              <Sparkles className="w-64 h-64 text-white" />
            </div>
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30 backdrop-blur-xs flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-300" />
                  Target: IDH1 (Homo sapiens)
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-white/10 text-slate-200 border border-white/10">
                  ChEMBL: CHEMBL2007625
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Model: Random Forest Regressor
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{t.prediction.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-3xl leading-relaxed">
                  {t.prediction.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isPredicting && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  {language === 'id' ? 'Menjalankan Inferensi Model QSAR IDH1...' : 'Running IDH1 QSAR Model Inference...'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {language === 'id' 
                    ? 'Standardisasi struktur SMILES dengan RDKit, pembentukan 1024-bit Morgan Fingerprint, inferensi Random Forest, dan evaluasi Applicability Domain.'
                    : 'Standardizing SMILES via RDKit, computing 1024-bit Morgan Fingerprints, Random Forest inference, and Applicability Domain evaluation.'}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {predictionError && !isPredicting && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">{t.prediction.errorTitle}</h4>
                  <p className="text-xs text-rose-800 mt-1">{predictionError}</p>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => handleRunPrediction()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  {language === 'id' ? 'Coba Prediksi Lagi' : 'Retry Prediction'}
                </button>
              </div>
            </div>
          )}

          {/* Not Predicted Yet */}
          {!predictionResult && !isPredicting && !predictionError && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              
              <div className="space-y-2 max-w-lg mx-auto">
                <h4 className="text-lg font-bold text-slate-900">
                  {language === 'id' 
                    ? 'Dataset Siap untuk Prediksi Aktivitas Molekuler IDH1' 
                    : 'Dataset Ready for IDH1 Bioactivity Prediction'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'id'
                    ? 'Model machine learning Random Forest IDH1 akan memproses struktur SMILES, menghitung nilai afinitas biologis (pIC50 & IC50 nM), serta mengukur batas ruang kimiawi (Applicability Domain).'
                    : 'The IDH1 Random Forest model will process SMILES structures, infer binding affinities (pIC50 & IC50 nM), and assess the chemical Applicability Domain.'}
                </p>
              </div>

              {/* Warnings Reassurance Notice */}
              {hasWarnings && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-lg mx-auto text-left flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {language === 'id' ? 'Dataset Memiliki Catatan / Peringatan Validasi' : 'Dataset Has Validation Warnings'}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {language === 'id'
                        ? 'Catatan validasi (seperti baris duplikat atau nilai kosong di kolom lain) tidak menghentikan proses prediksi. Model tetap dapat memproses molekul yang valid dan menandai baris bermasalah jika ada.'
                        : 'Validation notes (such as duplicate rows or missing values in other columns) do not stop the prediction. The model will process all valid molecules.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Column Selection Control */}
              <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{t.prediction.selectSmilesLabel}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {dataset.columns.length} {language === 'id' ? 'kolom tersedia' : 'columns available'}
                  </span>
                </div>
                <select
                  value={selectedSmilesCol}
                  onChange={(e) => setSelectedSmilesCol(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dataset.columns.map((c) => (
                    <option key={c} value={c}>
                      {c} {c === dataset.smiles_column_name ? (language === 'id' ? ' ★ (Terdeteksi sebagai SMILES)' : ' ★ (Detected as SMILES)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={() => handleRunPrediction(selectedSmilesCol)}
                  className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {hasWarnings 
                      ? (language === 'id' ? '⚡ Tetap Jalankan Prediksi QSAR IDH1' : '⚡ Proceed with IDH1 QSAR Prediction') 
                      : (language === 'id' ? 'Mulai Prediksi QSAR IDH1 Sekarang' : 'Start IDH1 QSAR Prediction Now')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Prediction Result Display */}
          {predictionResult && !isPredicting && (
            <div className="space-y-6">
              {/* Summary Metric Cards (Optimized for Mobile/Tablet) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t.prediction.totalPredicted}
                  </span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {predictionResult.summary.total_compounds}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                    {predictionResult.summary.valid_compounds} {language === 'id' ? 'valid' : 'valid'}
                  </p>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    {t.prediction.activeLabel}
                  </span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                    {predictionResult.summary.active_count}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-700">
                    {t.prediction.activeSub}
                  </p>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    {t.prediction.moderateLabel}
                  </span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600 tabular-nums">
                    {predictionResult.summary.moderate_count}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-amber-700">
                    {t.prediction.moderateSub}
                  </p>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t.prediction.avgPic50}
                  </span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-blue-600 tabular-nums">
                    {predictionResult.summary.mean_pIC50 ?? '—'}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    {language === 'id' ? 'Rentang:' : 'Range:'} [{predictionResult.summary.min_pIC50} - {predictionResult.summary.max_pIC50}]
                  </p>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1 lg:col-span-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Mean Tanimoto AD
                  </span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-purple-600 tabular-nums">
                    {predictionResult.summary.mean_tanimoto ?? '—'}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    {language === 'id' ? 'Kemiripan ChEMBL' : 'ChEMBL Similarity'}
                  </p>
                </div>
              </div>

              {/* Search, Filter, and Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
                  {/* Search Box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={t.prediction.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-7 py-2 sm:py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {/* Filter Pills with Horizontal Scroll on Mobile */}
                  <div className="overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-max">
                      <button
                        onClick={() => setFilterClass('all')}
                        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                          filterClass === 'all'
                            ? 'bg-white text-slate-900 font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.prediction.filterAll} ({predictionResult.predictions.length})
                      </button>
                      <button
                        onClick={() => setFilterClass('active')}
                        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                          filterClass === 'active'
                            ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        {t.prediction.filterActive} ({predictionResult.summary.active_count})
                      </button>
                      <button
                        onClick={() => setFilterClass('moderate')}
                        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                          filterClass === 'moderate'
                            ? 'bg-amber-500 text-white font-semibold shadow-xs'
                            : 'text-amber-700 hover:text-amber-900'
                        }`}
                      >
                        {t.prediction.filterModerate} ({predictionResult.summary.moderate_count})
                      </button>
                      <button
                        onClick={() => setFilterClass('inactive')}
                        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                          filterClass === 'inactive'
                            ? 'bg-slate-700 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.prediction.filterInactive} ({predictionResult.summary.inactive_count})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <a
                    href={getPredictionCsvDownloadUrl(dataset.dataset_id)}
                    download
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer w-full md:w-auto whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.prediction.btnDownloadCsv}</span>
                  </a>
                </div>
              </div>

              {/* Table of Predictions */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colId}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colSmiles}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colPic50}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colIc50}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colClass}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colSimilarity}</th>
                        <th className="py-3 px-3 font-bold">{t.prediction.colDomain}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {predictionResult.predictions
                        .filter((p) => {
                          if (filterClass === 'active') return p.activity_class?.includes('Active');
                          if (filterClass === 'moderate') return p.activity_class?.includes('Moderate');
                          if (filterClass === 'inactive') return p.activity_class?.includes('Inactive');
                          return true;
                        })
                        .filter((p) => {
                          if (!searchTerm) return true;
                          const term = searchTerm.toLowerCase();
                          return (
                            p.compound_id.toLowerCase().includes(term) ||
                            (p.canonical_smiles && p.canonical_smiles.toLowerCase().includes(term)) ||
                            p.input_smiles.toLowerCase().includes(term)
                          );
                        })
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 text-center font-bold">
                              {p.row_index + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                              {p.compound_id}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">
                              <div className="flex items-center gap-1.5 group">
                                <span className="truncate" title={p.canonical_smiles || p.input_smiles}>
                                  {p.canonical_smiles || p.input_smiles}
                                </span>
                                {p.canonical_smiles && (
                                  <button
                                    onClick={() => copySmiles(p.canonical_smiles!, idx)}
                                    title={t.prediction.copySmiles}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                  >
                                    {copiedIdx === idx ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono tabular-nums text-slate-900">
                              {p.predicted_pIC50 !== null ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">
                                  {p.predicted_pIC50.toFixed(3)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                              {p.predicted_IC50_nM !== null
                                ? p.predicted_IC50_nM >= 1000
                                ? `${(p.predicted_IC50_nM / 1000).toFixed(2)} \u03bcM`
                                : `${p.predicted_IC50_nM.toFixed(1)} nM`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {p.status !== 'Success' ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                  {p.status}
                                </span>
                              ) : p.activity_class?.includes('Active') ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  {language === 'id' ? 'Aktif (≥ 6.0)' : 'Active (≥ 6.0)'}
                                </span>
                              ) : p.activity_class?.includes('Moderate') ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  {language === 'id' ? 'Moderat' : 'Moderate'}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  {language === 'id' ? 'Inaktif (< 5.0)' : 'Inactive (< 5.0)'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums">
                              {p.nearest_tanimoto !== null ? (
                                <span
                                  className={`font-semibold ${
                                    p.nearest_tanimoto >= 0.3
                                      ? 'text-emerald-700'
                                      : p.nearest_tanimoto >= 0.2
                                      ? 'text-amber-700'
                                      : 'text-purple-700'
                                  }`}
                                >
                                  {p.nearest_tanimoto.toFixed(3)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                              {p.applicability_status ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-medium ${
                                    p.applicability_status.includes('Within')
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : p.applicability_status.includes('Borderline')
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-purple-50 text-purple-700'
                                  }`}
                                >
                                  {p.applicability_status}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Footer (Responsive Stacking for Mobile) */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>{language === 'id' ? 'Unggah Dataset Lain' : 'Upload Another Dataset'}</span>
        </button>

        {/* Prediction Trigger Action Button */}
        <button
          onClick={() => handleRunPrediction(selectedSmilesCol)}
          disabled={isPredicting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isPredicting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.prediction.btnRunning}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {predictionResult 
                  ? (language === 'id' ? 'Lihat Hasil Prediksi QSAR' : 'View QSAR Predictions') 
                  : (hasWarnings 
                      ? (language === 'id' ? '⚡ Tetap Jalankan Prediksi QSAR' : '⚡ Proceed with QSAR Prediction') 
                      : t.prediction.btnRun)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
