import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Database,
  ArrowRight,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const DocumentationPage: React.FC = () => {
  const { language } = useLanguage();
  const isId = language === 'id';

  const [activeTab, setActiveTab] = useState<'methodology' | 'curation' | 'models' | 'api'>('methodology');

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Scientific Guide & API Reference</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {isId ? 'Dokumentasi Sistem & Metodologi QSAR' : 'QSAR Platform Documentation & Methodology'}
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-3xl">
          {isId
            ? 'Panduan metodologi komputasi kemoinformatika, standarisasi kurasi molekuler OECD, dan referensi protokol REST API versi 2.0.'
            : 'Comprehensive technical documentation covering cheminformatics curation pipelines, OECD validation principles, and REST API specification.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'methodology', label: isId ? 'Alur Metodologi QSAR' : 'QSAR Methodology' },
          { id: 'curation', label: isId ? 'Protokol Kurasi RDKit' : 'Curation Protocol' },
          { id: 'models', label: isId ? 'Algoritma & Evaluasi' : 'ML Benchmark & Metrics' },
          { id: 'api', label: isId ? 'Referensi REST API' : 'REST API Reference' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: QSAR Methodology */}
      {activeTab === 'methodology' && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-xl font-bold text-slate-900">
            {isId ? 'Prinsip Validasi Model QSAR (Pedoman OECD)' : 'OECD Principles for QSAR Validation'}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Platform Multi-Target QSAR v2.0 dirancang dengan mematuhi 5 prinsip validasi pedoman OECD (Organization for Economic Co-operation and Development) untuk menjamin reliabilitas saintifik hasil prediksi komputasi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-blue-700">1. Defined Endpoint</span>
              <p className="text-xs text-slate-600">
                Satu model didedikasikan secara ketat untuk satu endpoint aktivitas terdefinisi (seperti IC50 dalam satuan nM) dan target protein yang jelas, tanpa mencampurkan tipe pengukuran berbeda.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-blue-700">2. Unambiguous Algorithm</span>
              <p className="text-xs text-slate-600">
                Menggunakan algoritma pembelajaran mesin deterministik dan benchmark komparatif (Random Forest, Extra Trees, SVR, MLP) dengan hyperparameter yang terdokumentasi.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-blue-700">3. Defined Domain of Applicability</span>
              <p className="text-xs text-slate-600">
                Setiap senyawa yang diprediksi dinilai batas keandalannya melalui kemiripan struktural Tanimoto terhadap ruang kimiawi data latih (Applicability Domain).
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-blue-700">4. Goodness-of-Fit, Robustness & Predictivity</span>
              <p className="text-xs text-slate-600">
                Evaluasi komprehensif membedakan fitting training, validasi internal (GroupKFold Cross-Validation Q²), dan prediksi eksternal (Test Set R²).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Curation Protocol */}
      {activeTab === 'curation' && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-xl font-bold text-slate-900">
            {isId ? 'Tahapan Standarisasi & Kurasi Kemoinformatika' : 'Cheminformatics Curation Pipeline'}
          </h3>
          <p className="text-sm text-slate-600">
            Data mentah dari ChEMBL atau file CSV yang diunggah diproses melalui pipa pengolahan data molekuler terstandardisasi:
          </p>

          <ol className="list-decimal pl-5 space-y-3 text-xs text-slate-700">
            <li>
              <strong>Sanitasi SMILES & Parsing RDKit:</strong> Notasi struktur diurai menjadi representasi objek molekul RDKit. Struktur dengan valensi kimia tidak valid dieliminasi secara otomatis.
            </li>
            <li>
              <strong>Salt Stripping (Pembersihan Garam):</strong> Fragmen anorganik dan kation/anion pelarut (seperti Na+, Cl-, TFA) dihilangkan menggunakan <em>SaltRemover</em> agar hanya menyisakan molekul organik utama.
            </li>
            <li>
              <strong>Netralisasi Muatan (Uncharging):</strong> Senyawa dinetralkan pada gugus fungsi terionisasi untuk memastikan representasi kanonikal netral.
            </li>
            <li>
              <strong>Generasi SMILES Kanonikal Isomerik:</strong> Menghasilkan representasi string SMILES tunggal yang unik untuk menghindari inkonsistensi representasi isomer.
            </li>
            <li>
              <strong>Penanganan Duplikasi (Duplicate Handling):</strong> Senyawa dengan SMILES kanonikal identik diagregasi menggunakan nilai median aktivitas biologis, bukan dibuang secara sepihak.
            </li>
            <li>
              <strong>Konversi pIC50:</strong> Nilai konsentrasi IC50 (dalam satuan nM) diubah ke skala logaritmik:
              <div className="my-2 p-3 bg-slate-100 rounded font-mono font-bold text-slate-900">
                pIC50 = 9 - log10(IC50_in_nM)
              </div>
            </li>
            <li>
              <strong>Ekstraksi Fingerprint Molekuler:</strong> Menggunakan Extended Connectivity Fingerprint (ECFP4 / Morgan Fingerprint) beradius 2 dengan panjang vektor 1024-bit.
            </li>
          </ol>
        </div>
      )}

      {/* Tab 3: Models & Metrics */}
      {activeTab === 'models' && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-xl font-bold text-slate-900">
            {isId ? 'Arsitektur Model & Metrik Evaluasi' : 'Model Architecture & Evaluation Metrics'}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3">Metrik</th>
                  <th className="p-3">Deskripsi Saintifik</th>
                  <th className="p-3">Kriteria Keberhasilan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="p-3 font-mono font-bold">R² (Coefficient of Determination)</td>
                  <td className="p-3">Proporsi variansi aktivitas biologis aktual yang mampu dijelaskan oleh model pada test set.</td>
                  <td className="p-3 font-semibold text-emerald-700">R² &gt; 0.60</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold">Q² (Cross-Validation Score)</td>
                  <td className="p-3">Kemampuan generalisasi prediktif internal melalui validasi silang GroupKFold.</td>
                  <td className="p-3 font-semibold text-emerald-700">Q² &gt; 0.50</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold">RMSE (Root Mean Squared Error)</td>
                  <td className="p-3">Deviasi kuadrat rata-rata antara nilai pIC50 aktual dan prediksi.</td>
                  <td className="p-3 font-semibold text-slate-700">Semakin rendah (&lt; 0.80)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold">Spearman Rank Correlation</td>
                  <td className="p-3">Korelasi monotonik peringkat senyawa dari yang paling poten ke yang kurang aktif.</td>
                  <td className="p-3 font-semibold text-blue-700">Spearman &gt; 0.65</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: REST API Reference */}
      {activeTab === 'api' && (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {isId ? 'Spesifikasi Antarmuka REST API Backend' : 'REST API Specification'}
            </h3>
            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded">
              v2.0.0
            </span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">GET</span>
                <span className="font-bold">/api/v1/targets/{'{chembl_id}'}</span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Mengambil metadata target protein (pref_name, organism, target_type, synonyms) dari ChEMBL API.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">POST</span>
                <span className="font-bold">/api/v1/training/jobs</span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Memulai background job pelatihan model QSAR (ChEMBL API atau CSV upload). Mengembalikan job_id.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">GET</span>
                <span className="font-bold">/api/v1/training/jobs/{'{job_id}'}</span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Polling status progress pekerjaan pelatihan secara real-time.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">GET</span>
                <span className="font-bold">/api/v1/models</span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Menampilkan daftar seluruh model QSAR yang tersimpan di Model Library dengan metrik evaluasinya.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">POST</span>
                <span className="font-bold">/api/v1/predictions?model_id={'{id}'}</span>
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Mengunggah berkas CSV senyawa herbal (ID & Smiles) untuk dihitung nilai prediksi pIC50 dan IC50 (nM).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

