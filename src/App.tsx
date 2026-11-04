/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, AppView } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { UploadSection } from './components/UploadSection';
import { ProcessingState } from './components/ProcessingState';
import { ValidationResultSuccess } from './components/ValidationResultSuccess';
import { ValidationResultError } from './components/ValidationResultError';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { TrainModelPage } from './components/TrainModel/TrainModelPage';
import { PredictCompoundsPage } from './components/PredictCompounds/PredictCompoundsPage';
import { ModelLibraryPage } from './components/ModelLibrary/ModelLibraryPage';
import { DocumentationPage } from './components/Documentation/DocumentationPage';
import { DatasetSummary } from './types/dataset';
import { uploadDatasetFile } from './lib/api';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  // Upload/validation state for legacy dataset validator
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [datasetResult, setDatasetResult] = useState<DatasetSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorList, setErrorList] = useState<string[]>([]);

  const handleUpload = async (file: File) => {
    setSelectedFileName(file.name);
    setUploadState('processing');

    const result = await uploadDatasetFile(file);

    if (result.success) {
      setDatasetResult(result.data);
      setUploadState('success');
    } else {
      setErrorMessage(result.message);
      setErrorList(result.errors || ['Terjadi kesalahan saat memvalidasi berkas CSV / Excel.']);
      setUploadState('error');
    }
  };

  const handleReset = () => {
    setUploadState('idle');
    setDatasetResult(null);
    setErrorMessage('');
    setErrorList([]);
  };

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

  const handleUseModelForPrediction = (modelId: string) => {
    setSelectedModelId(modelId);
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
              onStartUpload={() => navigateTo('upload')}
              onTrainModel={() => navigateTo('train')}
              onPredictCompounds={() => navigateTo('predict')}
              onLearnMore={() => handleScrollToSection('how-it-works')}
            />

            {/* Embedded Quick Upload CTA Section on Home */}
            <div className="bg-slate-100/60 py-12 border-t border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      {t.hero.ctaTryUpload}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {t.hero.ctaTryUploadDesc}
                    </p>
                  </div>
                </div>

                {uploadState === 'idle' && (
                  <UploadSection
                    onUploadFile={handleUpload}
                    isLoading={false}
                  />
                )}

                {uploadState === 'processing' && (
                  <ProcessingState fileName={selectedFileName} />
                )}

                {uploadState === 'success' && datasetResult && (
                  <ValidationResultSuccess
                    dataset={datasetResult}
                    onReset={handleReset}
                  />
                )}

                {uploadState === 'error' && (
                  <ValidationResultError
                    message={errorMessage}
                    errors={errorList}
                    fileName={selectedFileName}
                    onRetry={handleReset}
                  />
                )}
              </div>
            </div>

            <HowItWorksSection onStartUpload={() => navigateTo('upload')} />
            <AboutSection />
          </>
        )}

        {/* VIEW 2: TRAIN MODEL (FEATURE 1) */}
        {currentView === 'train' && (
          <TrainModelPage
            onNavigateToPredict={(modelId) => {
              if (modelId) setSelectedModelId(modelId);
              navigateTo('predict');
            }}
            onNavigateToModels={() => navigateTo('models')}
          />
        )}

        {/* VIEW 3: PREDICT COMPOUNDS (FEATURE 2) */}
        {currentView === 'predict' && (
          <PredictCompoundsPage
            initialModelId={selectedModelId}
            onNavigateToTrain={() => navigateTo('train')}
            onNavigateToModels={() => navigateTo('models')}
          />
        )}

        {/* VIEW 4: MODEL LIBRARY */}
        {currentView === 'models' && (
          <ModelLibraryPage
            onUseForPrediction={handleUseModelForPrediction}
            onNavigateToTrain={() => navigateTo('train')}
          />
        )}

        {/* VIEW 5: DOCUMENTATION */}
        {currentView === 'docs' && (
          <DocumentationPage />
        )}

        {/* VIEW 6: ABOUT */}
        {currentView === 'about' && (
          <div className="py-8">
            <AboutSection />
          </div>
        )}

        {/* VIEW 7: DATASET VALIDATOR (LEGACY UPLOAD) */}
        {currentView === 'upload' && (
          <div className="py-8">
            {uploadState === 'idle' && (
              <UploadSection
                onUploadFile={handleUpload}
                isLoading={false}
              />
            )}

            {uploadState === 'processing' && (
              <ProcessingState fileName={selectedFileName} />
            )}

            {uploadState === 'success' && datasetResult && (
              <ValidationResultSuccess
                dataset={datasetResult}
                onReset={handleReset}
              />
            )}

            {uploadState === 'error' && (
              <ValidationResultError
                message={errorMessage}
                errors={errorList}
                fileName={selectedFileName}
                onRetry={handleReset}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
