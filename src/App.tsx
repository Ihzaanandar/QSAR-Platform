/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { UploadSection } from './components/UploadSection';
import { ProcessingState } from './components/ProcessingState';
import { ValidationResultSuccess } from './components/ValidationResultSuccess';
import { ValidationResultError } from './components/ValidationResultError';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { DatasetSummary } from './types/dataset';
import { uploadDatasetFile } from './lib/api';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<'home' | 'upload'>('home');
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

  const navigateToUpload = () => {
    setCurrentView('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToSection={handleScrollToSection}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <>
            <HeroSection
              onStartUpload={navigateToUpload}
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

            <HowItWorksSection onStartUpload={navigateToUpload} />
            <AboutSection />
          </>
        )}

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
