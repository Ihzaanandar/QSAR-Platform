import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center bg-slate-100 hover:bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all ${className}`}
      title={language === 'id' ? 'Ganti ke Bahasa Inggris' : 'Switch to Indonesian'}
    >
      <div className="flex items-center px-1.5 text-slate-500">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
          language === 'id'
            ? 'bg-white text-blue-700 shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>ID</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
          language === 'en'
            ? 'bg-white text-blue-700 shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>EN</span>
      </button>
    </div>
  );
};

