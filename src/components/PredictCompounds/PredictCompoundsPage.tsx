import React, { useState, useEffect } from 'react';
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
  Filter,
  Layers,
  ArrowRight,
  Info,
  Clock,
  RotateCcw
} from 'lucide-react';
import {
  getModelsList,
  predictCompoundsMulti,
  getPredictionDownloadUrl
} from '../../lib/api';
import {
  QSARModelItem,
  MultiTargetPredictionResult,
  MultiTargetPredictionItem
} from '../../types/dataset';
import { useLanguage } from '../../context/LanguageContext';

interface PredictCompoundsPageProps {
  initialModelId?: string;
  onNavigateToTrain?: () => void;
  onNavigateToModels?: () => void;
}

export const PredictCompoundsPage: React.FC<PredictCompoundsPageProps> = ({
  initialModelId,
  onNavigateToTrain,
  onNavigateToModels
}) => {
  const { language } = useLanguage();
  const isId = language === 'id';

  // Step state (1: Select Model, 2: Upload & Run, 3: Results)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Models state
  const [models, setModels] = useState<QSARModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId || '');
  const [modelFilterSearch, setModelFilterSearch] = useState<string>('');

  // File & Prediction state
  const [compoundFile, setCompoundFile] = useState<File | null>(null);
  const [filePreviewSummary, setFilePreviewSummary] = useState<any | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<MultiTargetPredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Search/filter table results
  const [tableSearch, setTableSearch] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (initialModelId) {
      setSelectedModelId(initialModelId);
    }
  }, [initialModelId]);

  const loadModels = async () => {
    setIsLoadingModels(true);
    const res = await getModelsList();
    setIsLoadingModels(false);
    if (res.success && res.data) {
      setModels(res.data);
      if (!selectedModelId && res.data.length > 0) {
        setSelectedModelId(res.data[0].id);
      }
    }
  };

  const handleFileDrop = (file: File) => {
    setCompoundFile(file);
    setPredictionError(null);

    // Quick preview
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
    if (!compoundFile || !selectedModelId) return;
    setIsPredicting(true);
    setPredictionError(null);

    const res = await predictCompoundsMulti(compoundFile, selectedModelId);
    setIsPredicting(false);

    if (res.success && res.data) {
      setPredictionResult(res.data);
      setCurrentStep(3);
    } else {
      setPredictionError(res.message || 'Gagal memproses prediksi senyawa.');
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

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
            ? 'Pilih model QSAR yang telah dilatih, unggah dataset CSV senyawa herbal (ID & Smiles), dan dapatkan estimasi afinitas pIC50, IC50 (nM), serta status Applicability Domain.'
            : 'Select a validated QSAR model, upload your herbal plant compound dataset (ID & Smiles), and predict bioactivities (pIC50, IC50 nM) with Applicability Domain confidence.'}
        </p>
      </div>

      {/* STEP 1: SELECT MODEL */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span>{isId ? 'Langkah 1: Pilih Model QSAR dari Model Library' : 'Step 1: Choose Model from Library'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isId ? 'Model yang terdaftar telah divalidasi dan siap untuk inferensi molekuler.' : 'Only validated models with benchmarked metrics are available.'}
                </p>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isId ? 'Cari target/model...' : 'Search models...'}
                  value={modelFilterSearch}
                  onChange={(e) => setModelFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {isLoadingModels ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat daftar model QSAR...</span>
              </div>
            ) : models.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-3">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p>Belum ada model QSAR yang tersimpan.</p>
                {onNavigateToTrain && (
                  <button
                    type="button"
                    onClick={onNavigateToTrain}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Latih Model Pertama
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models
                  .filter((m) =>
                    modelFilterSearch === '' ||
                    m.model_name.toLowerCase().includes(modelFilterSearch.toLowerCase()) ||
                    m.target_name.toLowerCase().includes(modelFilterSearch.toLowerCase()) ||
                    m.chembl_target_id.toLowerCase().includes(modelFilterSearch.toLowerCase())
                  )
                  .map((m) => {
                    const isSelected = selectedModelId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModelId(m.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-100 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono mb-1">
                              {m.chembl_target_id}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{m.model_name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{m.organism}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">ALGORITMA</span>
                            <span className="font-semibold text-slate-800">{m.algorithm}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ENDPOINT</span>
                            <span className="font-semibold text-blue-700">{m.endpoint} ({m.unit})</span>
                          </div>
                        </div>

                        {m.metrics && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-500">R²: <strong className="text-blue-700">{m.metrics.r2.toFixed(3)}</strong></span>
                            <span className="text-slate-500">Q²: <strong className="text-emerald-700">{m.metrics.q2.toFixed(3)}</strong></span>
                            <span className="text-slate-500">RMSE: <strong className="text-slate-700">{m.metrics.rmse.toFixed(3)}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedModelId}
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>{isId ? 'Lanjut: Unggah Senyawa Tanaman' : 'Continue: Upload Compounds'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD CSV & RUN PREDICTION */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Selected Model Reminder */}
          {selectedModel && (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">Model Terpilih:</span>
                  <h4 className="text-sm font-bold">{selectedModel.model_name}</h4>
                  <span className="text-xs text-slate-300">
                    Target: {selectedModel.target_name} ({selectedModel.chembl_target_id}) | Endpoint: {selectedModel.endpoint}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
              >
                Ganti Model
              </button>
            </div>
          )}

          {/* Upload Dropzone */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isId ? 'Langkah 2: Unggah Dataset Senyawa Tanaman' : 'Step 2: Upload Plant Compound Dataset'}
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

            {/* Scientific disclaimer notice */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1">
              <span className="font-bold block text-slate-800">Ketentuan Pemrosesan Sains:</span>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                <li>Struktur kanonikal distandarisasi menggunakan RDKit; garam anorganik dibersihkan secara otomatis.</li>
                <li>Molekul duplikat tetap dipertahankan pada baris asli dengan nilai prediksi yang konsisten.</li>
                <li>Setiap senyawa diuji terhadap ruang kimiawi (Applicability Domain) melalui koefisien kesamaan Tanimoto.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {isId ? 'Kembali ke Pilihan Model' : 'Back to Model Selection'}
            </button>

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
      )}

      {/* STEP 3: PREDICTION RESULTS */}
      {currentStep === 3 && predictionResult && (
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
                  Model: <strong>{predictionResult.model_name}</strong> | Target: <strong>{predictionResult.target} ({predictionResult.target_chembl_id})</strong>
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
                  download={`qsar_predictions_${predictionResult.target}_${predictionResult.prediction_id}.csv`}
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

          {/* Scientific Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">Disclaimer Saintifik:</span>
            <p>
              Prediksi bioaktivitas ini dihasilkan secara <em>in silico</em> menggunakan model Quantitative Structure-Activity Relationship (QSAR) berbasis machine learning.
              Hasil ditujukan sebagai panduan skrining dan prioritisasi pengujian eksperimental <em>in vitro</em> / <em>in vivo</em> dan tidak menggantikan validasi biologis basah.
            </p>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(2);
                setPredictionResult(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isId ? 'Prediksi Senyawa Lain' : 'Predict Another Dataset'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
