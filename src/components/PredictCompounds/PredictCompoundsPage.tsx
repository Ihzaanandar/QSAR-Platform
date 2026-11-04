import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Brain,
  ShieldCheck,
  Search,
  ArrowRight,
  Info,
  RotateCcw
} from 'lucide-react';
import {
  predictCompoundsMulti,
  getPredictionDownloadUrl
} from '../../lib/api';
import {
  TrainingJobResult,
  MultiTargetPredictionResult,
  MultiTargetPredictionItem
} from '../../types/dataset';
import { useLanguage } from '../../context/LanguageContext';

interface PredictCompoundsPageProps {
  activeModel: TrainingJobResult | null;
  onNavigateToTrain: () => void;
}

export const PredictCompoundsPage: React.FC<PredictCompoundsPageProps> = ({
  activeModel,
  onNavigateToTrain
}) => {
  const { language } = useLanguage();
  const isId = language === 'id';

  // File & Prediction state
  const [compoundFile, setCompoundFile] = useState<File | null>(null);
  const [filePreviewSummary, setFilePreviewSummary] = useState<any | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<MultiTargetPredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Search/filter table results
  const [tableSearch, setTableSearch] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  const handleFileDrop = (file: File) => {
    setCompoundFile(file);
    setPredictionError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const sep = lines[0].includes(';') ? ';' : ',';
        const cols = lines[0].split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
        setFilePreviewSummary({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          totalRows: lines.length - 1,
          columns: cols
        });
      }
    };
    reader.readAsText(file.slice(0, 50000));
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = `ID,Smiles\nCMP001,COc1ccc(C=CC(=O)CC(=O)C=Cc2ccc(O)c(OC)c2)cc1O\nCMP002,O=C(O)c1cc(O)c(O)c(O)c1\nCMP003,c1cc(c(cc1C2=C(C(=O)c3c(cc(cc3O2)O)O)O)O)O\nCMP004,c1cc(ccc1/C=C/c2cc(cc(c2)O)O)O\nCMP005,COc1cc(/C=C/C(=O)O)ccc1O\nCMP006,CC(=O)Oc1ccccc1C(=O)O\nCMP007,CN1C=NC2=C1C(=O)N(C(=O)N2C)C\nCMP008,CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_plant_compounds.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRunPrediction = async () => {
    if (!compoundFile || !activeModel) return;
    setIsPredicting(true);
    setPredictionError(null);

    const res = await predictCompoundsMulti(compoundFile, activeModel.job_id || 'active_session');
    setIsPredicting(false);

    if (res.success && res.data) {
      setPredictionResult(res.data);
    } else {
      setPredictionError(res.message || 'Gagal memproses prediksi senyawa.');
    }
  };

  // Filtered results
  const filteredPredictions = predictionResult?.predictions.filter((item) => {
    const matchesSearch =
      tableSearch === '' ||
      item.compound_id.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (item.canonical_smiles && item.canonical_smiles.toLowerCase().includes(tableSearch.toLowerCase())) ||
      item.smiles.toLowerCase().includes(tableSearch.toLowerCase());

    const matchesActivity =
      activityFilter === 'ALL' ||
      item.activity_class === activityFilter;

    return matchesSearch && matchesActivity;
  }) || [];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Feature 2: Multi-Target Plant Compound Bioactivity Predictor</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {isId ? 'Prediksi Bioaktivitas Senyawa Tanaman' : 'Plant Compound Bioactivity Prediction'}
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-3xl">
          {isId
            ? 'Unggah dataset CSV senyawa herbal (ID & Smiles), lalu dapatkan estimasi afinitas pIC50, IC50 (nM), serta status Applicability Domain menggunakan model QSAR aktif sesi ini.'
            : 'Upload your plant compound dataset (ID & Smiles) to predict bioactivities (pIC50, IC50 nM) using the active session QSAR model.'}
        </p>
      </div>

      {/* IF NO ACTIVE MODEL TRAINED YET IN THIS SESSION */}
      {!activeModel ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isId ? 'Latih Model QSAR Terlebih Dahulu' : 'Train a QSAR Model First'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              {isId
                ? 'Untuk menghindari pemakaian penyimpanan berbayar (persistent storage), sistem ini bekerja secara in-session. Anda perlu melatih model terlebih dahulu di menu Latih Model sebelum dapat memprediksi senyawa tanaman.'
                : 'To avoid persistent cloud storage costs, the platform runs in-session. Please train your QSAR model first before predicting plant compound activities.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToTrain}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            <span>{isId ? 'Mulai Latih Model QSAR Sekarang' : 'Start Training Model'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* IF MODEL HAS BEEN TRAINED IN THIS SESSION */
        <div className="space-y-6">
          {/* Active Model Banner */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Model Aktif Sesi Ini (In-Memory)</span>
              </div>
              <h3 className="text-xl font-bold">{activeModel.best_model_name}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: <strong>{activeModel.target_name}</strong> | Endpoint: <strong>{activeModel.endpoint} ({activeModel.unit})</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="px-3 py-1.5 bg-white/10 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">TEST R²</span>
                  <span className="font-mono font-bold text-amber-300">{activeModel.best_metrics.r2.toFixed(3)}</span>
                </div>
                <div className="px-3 py-1.5 bg-white/10 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">CV Q²</span>
                  <span className="font-mono font-bold text-emerald-300">{activeModel.best_metrics.q2.toFixed(3)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToTrain}
                className="px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Ganti/Latih Ulang
              </button>
            </div>
          </div>

          {/* STEP: UPLOAD CSV & RUN PREDICTION */}
          {!predictionResult ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isId ? 'Unggah Dataset Senyawa Tanaman (CSV / Excel)' : 'Upload Plant Compound Dataset (CSV / Excel)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isId
                      ? 'Format file CSV atau Excel wajib memiliki kolom header "ID" dan "Smiles".'
                      : 'File must contain "ID" and "Smiles" headers. Comma or semicolon delimiters supported.'}
                  </p>
                </div>

                {/* Sample file download */}
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isId ? 'Unduh Contoh CSV Senyawa Tanaman' : 'Download Sample CSV'}</span>
                </button>
              </div>

              {/* Drop area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="compound-file-input"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileDrop(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="compound-file-input" className="cursor-pointer block space-y-2">
                  <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto" />
                  <span className="text-sm font-semibold text-slate-800 block">
                    {compoundFile ? compoundFile.name : (isId ? 'Klik untuk memilih file CSV atau seret ke sini' : 'Click to select CSV or drag & drop here')}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Format didukung: .csv (koma/titik koma), .xlsx, .xls (maks 15 MB)
                  </span>
                </label>
              </div>

              {/* Preview Card */}
              {filePreviewSummary && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <strong className="block font-bold text-emerald-800">
                      Berkas siap diproses: {filePreviewSummary.fileName} ({filePreviewSummary.fileSize})
                    </strong>
                    <span className="text-emerald-700">
                      Memuat perkiraan {filePreviewSummary.totalRows} baris senyawa. Kolom: {filePreviewSummary.columns.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Struktur CSV Valid</span>
                  </div>
                </div>
              )}

              {predictionError && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Gagal Menjalankan Prediksi:</strong>
                    <span>{predictionError}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!compoundFile || isPredicting}
                  onClick={handleRunPrediction}
                  className="inline-flex items-center gap-2 px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isPredicting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isPredicting ? (isId ? 'Memproses Prediksi...' : 'Predicting...') : (isId ? 'Jalankan Prediksi Bioaktivitas' : 'Run Prediction')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* PREDICTION RESULTS */
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Compounds</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
                    {predictionResult.summary.total_compounds}
                  </span>
                  <span className="text-[10px] text-slate-400">senyawa diproses</span>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Successful</span>
                  <span className="text-xl font-extrabold text-emerald-800 mt-0.5 block">
                    {predictionResult.summary.valid_compounds}
                  </span>
                  <span className="text-[10px] text-emerald-600">terprediksi valid</span>
                </div>

                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Invalid SMILES</span>
                  <span className="text-xl font-extrabold text-rose-800 mt-0.5 block">
                    {predictionResult.summary.invalid_compounds}
                  </span>
                  <span className="text-[10px] text-rose-600">struktur gagal diurai</span>
                </div>

                <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Active (&lt;1000 nM)</span>
                  <span className="text-xl font-extrabold text-blue-800 mt-0.5 block">
                    {predictionResult.summary.active_count}
                  </span>
                  <span className="text-[10px] text-blue-600">potensi tinggi</span>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Moderate</span>
                  <span className="text-xl font-extrabold text-amber-800 mt-0.5 block">
                    {predictionResult.summary.moderate_count}
                  </span>
                  <span className="text-[10px] text-amber-600">afinitas sedang</span>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Processing Time</span>
                  <span className="text-xl font-extrabold text-indigo-800 mt-0.5 block">
                    {predictionResult.summary.processing_time_sec.toFixed(2)}s
                  </span>
                  <span className="text-[10px] text-indigo-600">inferensi ML</span>
                </div>
              </div>

              {/* Results Table Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isId ? 'Tabel Hasil Prediksi Bioaktivitas Senyawa' : 'Compound Bioactivity Predictions'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Model: <strong>{activeModel.best_model_name}</strong> | Target: <strong>{activeModel.target_name}</strong>
                    </p>
                  </div>

                  {/* Action buttons and filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Filter ID/SMILES..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Filter Activity */}
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white font-medium"
                    >
                      <option value="ALL">Semua Aktivitas</option>
                      <option value="Active">Hanya Active</option>
                      <option value="Moderate">Hanya Moderate</option>
                      <option value="Inactive">Hanya Inactive</option>
                    </select>

                    {/* Download CSV */}
                    <a
                      href={getPredictionDownloadUrl(predictionResult.prediction_id)}
                      download={`qsar_predictions_${predictionResult.prediction_id}.csv`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isId ? 'Unduh Hasil (CSV)' : 'Download CSV'}</span>
                    </a>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Compound ID</th>
                        <th className="py-2.5 px-3">Struktur Kanonikal (SMILES)</th>
                        <th className="py-2.5 px-3 text-right">Prediksi pIC50</th>
                        <th className="py-2.5 px-3 text-right">Prediksi IC50 (nM)</th>
                        <th className="py-2.5 px-3 text-center">Kelas Aktivitas</th>
                        <th className="py-2.5 px-3 text-center">Applicability Domain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredPredictions.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{row.row_index}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{row.compound_id}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-xs truncate" title={row.canonical_smiles || row.smiles}>
                            {row.canonical_smiles || row.smiles}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                            {row.predicted_pIC50 !== null ? row.predicted_pIC50.toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                            {row.predicted_IC50_nM !== null ? `${row.predicted_IC50_nM.toLocaleString()} nM` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.activity_class === 'Active' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Active
                              </span>
                            )}
                            {row.activity_class === 'Moderate' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Moderate
                              </span>
                            )}
                            {row.activity_class === 'Inactive' && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                                Inactive
                              </span>
                            )}
                            {!row.activity_class && (
                              <span className="text-rose-600 text-[11px]">Invalid SMILES</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.applicability_status === 'In Domain' && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold" title={`Tanimoto: ${row.nearest_tanimoto?.toFixed(2)}`}>
                                In Domain ({row.nearest_tanimoto?.toFixed(2)})
                              </span>
                            )}
                            {row.applicability_status === 'Borderline' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold" title={`Tanimoto: ${row.nearest_tanimoto?.toFixed(2)}`}>
                                Borderline ({row.nearest_tanimoto?.toFixed(2)})
                              </span>
                            )}
                            {row.applicability_status === 'Out of Domain' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold" title={`Tanimoto: ${row.nearest_tanimoto?.toFixed(2)}`}>
                                Out of Domain ({row.nearest_tanimoto?.toFixed(2)})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPredictionResult(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isId ? 'Prediksi Senyawa Lain' : 'Predict Another Dataset'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
