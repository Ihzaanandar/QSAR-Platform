import React, { useState } from 'react';
import { Sparkles, Brain, Database, BookOpen, Info, CheckCircle2, Menu, X, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export type AppView = 'home' | 'train' | 'predict' | 'models' | 'docs' | 'about' | 'upload';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onScrollToSection?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onScrollToSection }) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(view);
    if (sectionId && onScrollToSection) {
      setTimeout(() => onScrollToSection(sectionId), 60);
    }
  };

  const navLinks: { id: AppView; label: string; icon?: React.ReactNode }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'train', label: t.nav.trainModel || 'Train Model' },
    { id: 'predict', label: t.nav.predictCompounds || 'Predict Compounds' },
    { id: 'models', label: t.nav.modelLibrary || 'Model Library' },
    { id: 'docs', label: t.nav.documentation || 'Documentation' },
    { id: 'about', label: t.nav.about || 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="19" r="2" />
              <path d="M10.5 10.5 6.5 17.5" />
              <path d="m13.5 13.5 4-7" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                {t.nav.brand}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-md">
                v2.0
              </span>
            </div>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer text-xs xl:text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          {/* Quick link to legacy dataset validation */}
          <button
            onClick={() => handleNavClick('upload')}
            className={`px-2.5 py-1.5 rounded-lg transition-all text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer ${
              currentView === 'upload' ? 'bg-slate-100 text-slate-900 font-medium' : ''
            }`}
            title="Validator Format CSV/Excel"
          >
            {t.nav.upload || 'Dataset Validator'}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher />

          {/* Predict Compounds Action Button */}
          <button
            onClick={() => handleNavClick('predict')}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">{t.nav.predictCompounds || 'Predict Compounds'}</span>
            <span className="sm:hidden">Prediksi</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-1.5 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{link.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => handleNavClick('upload')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors text-slate-500 hover:bg-slate-50 ${
                currentView === 'upload' ? 'bg-slate-100 text-slate-900 font-medium' : ''
              }`}
            >
              📊 {t.nav.upload || 'Dataset Validator (CSV/Excel)'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
