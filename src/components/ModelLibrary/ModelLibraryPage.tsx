import React, { useState, useEffect } from 'react';
import {
  Brain,
  Database,
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import {
  getModelsList,
  deleteModel,
  getModelDownloadUrl
} from '../../lib/api';
import { QSARModelItem } from '../../types/dataset';
import { useLanguage } from '../../context/LanguageContext';

interface ModelLibraryPageProps {
  onUseForPrediction: (modelId: string) => void;
  onNavigateToTrain: () => void;
}

export const ModelLibraryPage: React.FC<ModelLibraryPageProps> = ({
  onUseForPrediction,
  onNavigateToTrain
}) => {
  const { language } = useLanguage();
  const isId = language === 'id';

  const [models, setModels] = useState<QSARModelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, [selectedEndpoint]);

  const loadModels = async () => {
    setIsLoading(true);
    const res = await getModelsList(selectedEndpoint === 'ALL' ? undefined : selectedEndpoint);
    setIsLoading(false);
    if (res.success && res.data) {
      setModels(res.data);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(isId ? `Hapus model '${name}' dari Model Library?` : `Delete model '${name}'?`)) {
      return;
    }
    setDeletingId(id);
    const res = await deleteModel(id);
    setDeletingId(null);
    if (res.success) {
      setModels((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert(res.message || 'Gagal menghapus model.');
    }
  };

  const filteredModels = models.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      searchTerm === '' ||
      m.model_name.toLowerCase().includes(term) ||
      m.target_name.toLowerCase().includes(term) ||
      m.chembl_target_id.toLowerCase().includes(term) ||
      m.algorithm.toLowerCase().includes(term)
    );
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Persistent Model Repository</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            {isId ? 'Model Library' : 'Model Library'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isId
              ? 'Daftar model QSAR multi-target tervalidasi yang siap digunakan untuk inferensi aktivitas biologis senyawa.'
              : 'Browse and manage validated QSAR machine learning models ready for compound bioactivity inference.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToTrain}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isId ? 'Latih Model Baru' : 'Train New Model'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isId ? 'Cari berdasarkan nama model, target, atau algoritma...' : 'Search by model, target, or algorithm...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Endpoint Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {['ALL', 'IC50', 'EC50', 'Ki', 'Kd'].map((ep) => (
            <button
              key={ep}
              type="button"
              onClick={() => setSelectedEndpoint(ep)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedEndpoint === ep
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ep}
            </button>
          ))}
        </div>
      </div>

      {/* Model Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Memuat model...</span>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-4">
          <Database className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isId ? 'Tidak Ada Model Ditemukan' : 'No Models Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm
                ? (isId ? 'Tidak ada model yang cocok dengan kata kunci pencarian.' : 'No models matched your query.')
                : (isId ? 'Belum ada model tersimpan di database. Silakan latih model baru terlebih dahulu.' : 'No models persisted in database yet.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToTrain}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            {isId ? 'Latih Model Sekarang' : 'Train Model Now'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModels.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                      {m.chembl_target_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {m.endpoint} ({m.unit})
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                </div>

                {/* Title & Target */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{m.model_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <strong className="text-slate-700">{m.target_name}</strong> ({m.organism})
                  </p>
                </div>

                {/* Algoritma & Fingerprint */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ALGORITMA:</span>
                    <span className="font-semibold text-slate-800">{m.algorithm}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">VERSI:</span>
                    <span className="font-mono text-slate-700">{m.version}</span>
                  </div>
                </div>

                {/* Metrics */}
                {m.metrics && (
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">TEST R²</span>
                      <span className="font-mono font-bold text-blue-700">{m.metrics.r2.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CV Q²</span>
                      <span className="font-mono font-bold text-emerald-700">{m.metrics.q2.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">RMSE</span>
                      <span className="font-mono text-slate-700">{m.metrics.rmse.toFixed(3)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onUseForPrediction(m.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isId ? 'Gunakan untuk Prediksi' : 'Predict Compounds'}</span>
                </button>

                <a
                  href={getModelDownloadUrl(m.id)}
                  download={`${m.model_name.replace(/\s+/g, '_')}.joblib`}
                  title="Unduh Paket .joblib"
                  className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </a>

                {m.id !== 'idh1_general_default' && (
                  <button
                    type="button"
                    disabled={deletingId === m.id}
                    onClick={() => handleDelete(m.id, m.model_name)}
                    title="Hapus Model"
                    className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

