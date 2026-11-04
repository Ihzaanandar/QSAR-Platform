import React from 'react';
import { ArrowRight, FileSpreadsheet, ShieldCheck, Database, Info, CheckCircle2, Brain, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroSectionProps {
  onStartUpload: () => void;
  onTrainModel?: () => void;
  onPredictCompounds?: () => void;
  onLearnMore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartUpload,
  onTrainModel,
  onPredictCompounds,
  onLearnMore
}) => {
  const { t, language } = useLanguage();
  const isId = language === 'id';

  return (
    <div className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Version 2.0 pill notice */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-6">
          <Info className="w-3.5 h-3.5" />
          <span>Multi-Target QSAR Modeling & Bioactivity Prediction Platform · v2.0</span>
        </div>

        {/* Hero Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 font-mono">
                {t.hero.subtitle}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Multi-Target <br />
                <span className="text-blue-600">QSAR Platform</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                {isId
                  ? 'Platform terpadu untuk melatih model QSAR multi-target dari ChEMBL atau CSV in-house, serta memprediksi afinitas bioaktivitas senyawa tanaman dengan analisis domain penerapan.'
                  : 'An integrated platform to train multi-target QSAR models from ChEMBL or custom CSVs, and predict herbal plant bioactivities with applicability domain confidence.'}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={onPredictCompounds || onStartUpload}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isId ? 'Prediksi Senyawa Tanaman' : 'Predict Compounds'}</span>
              </button>
              {onTrainModel && (
                <button
                  onClick={onTrainModel}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm sm:text-base font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm whitespace-nowrap cursor-pointer"
                >
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>{isId ? 'Latih Model QSAR' : 'Train QSAR Model'}</span>
                </button>
              )}
            </div>

            {/* Quick trust metrics */}
            <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.hero.trustNoAccount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Morgan ECFP4 Fingerprints</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bemis-Murcko Scaffold Split</span>
              </div>
            </div>
          </div>

          {/* Right Column: Molecular Illustration & Interactive Floating Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl filter blur-xl opacity-70 -z-10" />

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-xl relative">
                {/* Simulated 3D Molecular graphic using SVG */}
                <div className="w-full h-44 rounded-xl bg-slate-900 overflow-hidden relative flex items-center justify-center p-4">
                  {/* Molecular bonds and nodes */}
                  <svg className="w-full h-full" viewBox="0 0 360 160" fill="none">
                    {/* Background grid */}
                    <defs>
                      <linearGradient id="bondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                      </linearGradient>
                      <radialGradient id="atomCarbon" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#334155" />
                      </radialGradient>
                      <radialGradient id="atomOxygen" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </radialGradient>
                      <radialGradient id="atomNitrogen" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </radialGradient>
                    </defs>

                    {/* Bonds lines */}
                    <line x1="60" y1="80" x2="120" y2="50" stroke="url(#bondGrad)" strokeWidth="4" />
                    <line x1="120" y1="50" x2="180" y2="80" stroke="url(#bondGrad)" strokeWidth="4" />
                    <line x1="180" y1="80" x2="240" y2="50" stroke="url(#bondGrad)" strokeWidth="4" />
                    <line x1="240" y1="50" x2="300" y2="80" stroke="url(#bondGrad)" strokeWidth="4" />
                    <line x1="120" y1="50" x2="120" y2="120" stroke="url(#bondGrad)" strokeWidth="4" />
                    <line x1="180" y1="80" x2="180" y2="140" stroke="url(#bondGrad)" strokeWidth="4" strokeDasharray="4 4" />
                    <line x1="240" y1="50" x2="270" y2="20" stroke="url(#bondGrad)" strokeWidth="4" />

                    {/* Atom spheres */}
                    <circle cx="60" cy="80" r="14" fill="url(#atomCarbon)" />
                    <text x="60" y="84" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">C</text>

                    <circle cx="120" cy="50" r="16" fill="url(#atomNitrogen)" />
                    <text x="120" y="54" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">N</text>

                    <circle cx="180" cy="80" r="15" fill="url(#atomCarbon)" />
                    <text x="180" y="84" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">C</text>

                    <circle cx="240" cy="50" r="16" fill="url(#atomCarbon)" />
                    <text x="240" y="54" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">C</text>

                    <circle cx="300" cy="80" r="14" fill="url(#atomOxygen)" />
                    <text x="300" y="84" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">O</text>

                    <circle cx="120" cy="120" r="12" fill="url(#atomOxygen)" />
                    <text x="120" y="124" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">O</text>

                    <circle cx="180" cy="140" r="10" fill="#93c5fd" />
                    <text x="180" y="143" textAnchor="middle" fill="#1e3a8a" fontSize="8" fontWeight="bold">H</text>

                    <circle cx="270" cy="20" r="11" fill="url(#atomNitrogen)" />
                    <text x="270" y="24" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">N</text>
                  </svg>

                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-400/30">
                    SMILES / Descriptors
                  </div>
                </div>

                {/* Simulated CSV Data Preview Card (As on Reference Board 1) */}
                <div className="mt-4 border border-slate-200 rounded-xl bg-slate-50/80 p-3 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-slate-700 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                      Contoh Struktur CSV
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 font-medium">Status: Valid</span>
                  </div>

                  <table className="w-full text-left font-mono text-[11px] text-slate-600">
                    <thead>
                      <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-200/60">
                        <th className="pb-1">Compound</th>
                        <th className="pb-1">Desc_1</th>
                        <th className="pb-1">Desc_2</th>
                        <th className="pb-1 text-right">Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 text-slate-900 font-medium">C1CCC</td>
                        <td className="py-1">0.12</td>
                        <td className="py-1">1.45</td>
                        <td className="py-1 text-right font-semibold text-blue-600">5.2</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-900 font-medium">CCO</td>
                        <td className="py-1">0.33</td>
                        <td className="py-1">0.98</td>
                        <td className="py-1 text-right font-semibold text-blue-600">4.1</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-900 font-medium">CCN</td>
                        <td className="py-1">0.11</td>
                        <td className="py-1">1.23</td>
                        <td className="py-1 text-right font-semibold text-blue-600">6.7</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Value Proposition Cards (Directly matching Reference Board 2) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Easy to Use</h3>
            <p className="text-sm text-slate-600">
              Antarmuka upload drag-and-drop yang intuitif tanpa perlu konfigurasi rumit atau akun pengguna.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Data Validation</h3>
            <p className="text-sm text-slate-600">
              Pemeriksaan otomatis terhadap konsistensi baris, header, jumlah missing values, dan duplikasi data.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Ready for Analysis</h3>
            <p className="text-sm text-slate-600">
              Dapatkan pratinjau data instan dan ringkasan metrik sebelum melangkah ke pemodelan QSAR masa depan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
