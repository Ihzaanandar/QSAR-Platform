import React, { useState } from 'react';
import { Upload, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  currentView: 'home' | 'upload';
  onNavigate: (view: 'home' | 'upload') => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onScrollToSection }) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: 'home' | 'upload', sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(view);
    if (sectionId) {
      setTimeout(() => onScrollToSection(sectionId), 60);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Brand Zone */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
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
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {t.nav.brand}
          </span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => handleNavClick('home')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-blue-600 cursor-pointer ${
              currentView === 'home' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            {t.nav.home}
          </button>
          <button
            onClick={() => handleNavClick('upload')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-blue-600 cursor-pointer ${
              currentView === 'upload' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            {t.nav.upload}
          </button>
          <button
            onClick={() => handleNavClick('home', 'how-it-works')}
            className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.howItWorks}
          </button>
          <button
            onClick={() => handleNavClick('home', 'about')}
            className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.about}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher />

          {/* Primary Action Button */}
          <button
            onClick={() => handleNavClick('upload')}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden xs:inline">{t.nav.uploadDataset}</span>
            <span className="xs:hidden">{t.nav.upload}</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-lg">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'home'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.nav.home}
          </button>

          <button
            onClick={() => handleNavClick('upload')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'upload'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.nav.upload}
          </button>

          <button
            onClick={() => handleNavClick('home', 'how-it-works')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t.nav.howItWorks}
          </button>

          <button
            onClick={() => handleNavClick('home', 'about')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t.nav.about}
          </button>
        </div>
      )}
    </header>
  );
};
