/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, AppView } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { TrainModelPage } from './components/TrainModel/TrainModelPage';
import { PredictCompoundsPage } from './components/PredictCompounds/PredictCompoundsPage';
import { DocumentationPage } from './components/Documentation/DocumentationPage';
import { TrainingJobResult } from './types/dataset';
import { useLanguage } from './context/LanguageContext';
import { Brain, Play, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const { t, language } = useLanguage();
  const isId = language === 'id';
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [activeModel, setActiveModel] = useState<TrainingJobResult | null>(null);

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPredict = (trainedModel: TrainingJobResult) => {
    setActiveModel(trainedModel);
    setCurrentView('predict');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        onScrollToSection={handleScrollToSection}
      />

      <main className="flex-1">
        {/* VIEW 1: HOME */}
        {currentView === 'home' && (
          <>
            <HeroSection
              onStartUpload={() => navigateTo('train')}
              onTrainModel={() => navigateTo('train')}
              onPredictCompounds={() => navigateTo('predict')}
              onLearnMore={() => handleScrollToSection('how-it-works')}
            />

            {/* 2-Step In-Session Workflow Overview replacing the old upload validator */}
            <div className="bg-slate-100/70 py-14 border-t border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 font-mono">
                    ALUR KERJA TANPA STORAGE (IN-SESSION)
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    {isId ? 'Latih Model Baru & Prediksi Secara Instan' : 'Train & Predict Directly In-Session'}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {isId
                      ? 'Untuk efisiensi dan menghindari pemakaian persistent cloud storage, platform ini beroperasi secara in-session: latih model QSAR Anda terlebih dahulu, lalu langsung uji senyawa tanaman Anda.'
                      : 'Operating in-session eliminates cloud storage limits: train your custom QSAR model first, then immediately predict plant compounds.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {/* Step 1: Latih Model */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-blue-300 transition-all">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-lg">
                        1
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {isId ? 'Langkah 1: Latih Model QSAR' : 'Step 1: Train QSAR Model'}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isId
                          ? 'Unggah dataset bioaktivitas target Anda (SMILES & nilai aktivitas). Sistem melakukan standarisasi RDKit, scaffold splitting, dan benchmark 5 algoritma regresi (Random Forest, Extra Trees, SVR, MLP).'
                          : 'Upload target bioactivity dataset. System standardizes molecules with RDKit, executes scaffold split, and benchmarks regression algorithms.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('train')}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                    >
                      <Brain className="w-4 h-4" />
                      <span>{isId ? 'Mulai Latih Model' : 'Start Training Model'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step 2: Prediksi Senyawa */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-emerald-300 transition-all">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-lg">
                        2
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {isId ? 'Langkah 2: Prediksi Senyawa Tanaman' : 'Step 2: Predict Plant Compounds'}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isId
                          ? 'Setelah model selesai dilatih, langsung unggah file CSV senyawa herbal Anda (ID & Smiles) untuk mengestimasi pIC50, IC50 (nM), dan status batas ruang kimiawi (Applicability Domain).'
                          : 'Once trained, immediately upload plant compound CSV (ID & Smiles) to predict pIC50, IC50 (nM), and chemical Applicability Domain.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('predict')}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isId ? 'Prediksi Senyawa' : 'Predict Compounds'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Zero storage note */}
                <div className="max-w-4xl mx-auto p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>
                    {isId
                      ? 'Privasi & Bebas Biaya Storage: Seluruh model hasil pelatihan berada di memori sesi aktif dan tidak disimpan ke server penyimpanan permanen.'
                      : 'Privacy & Zero Persistent Storage: Models are computed in active session memory and discarded upon refresh, eliminating storage costs.'}
                  </span>
                </div>
              </div>
            </div>

            <HowItWorksSection onStartUpload={() => navigateTo('train')} />
            <AboutSection />
          </>
        )}

        {/* VIEW 2: TRAIN MODEL (FEATURE 1) */}
        {currentView === 'train' && (
          <TrainModelPage
            onProceedToPredict={handleProceedToPredict}
          />
        )}

        {/* VIEW 3: PREDICT COMPOUNDS (FEATURE 2) */}
        {currentView === 'predict' && (
          <PredictCompoundsPage
            activeModel={activeModel}
            onNavigateToTrain={() => navigateTo('train')}
          />
        )}

        {/* VIEW 4: DOCUMENTATION */}
        {currentView === 'docs' && (
          <DocumentationPage />
        )}

        {/* VIEW 5: ABOUT */}
        {currentView === 'about' && (
          <div className="py-8">
            <AboutSection />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
