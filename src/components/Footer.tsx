import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                Q
              </div>
              <span className="text-sm font-bold text-white tracking-tight">
                QSAR Platform
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {t.footer.brandDesc}
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <p className="text-slate-200 font-semibold">{t.footer.specTitle}</p>
            <p>{t.footer.specFrontend}</p>
            <p>{t.footer.specBackend}</p>
            <p>{t.footer.specProtocol}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 text-slate-500 text-center sm:text-left">
          <p>{t.footer.rights}</p>
          <p className="sm:text-right">
            {t.footer.note}
          </p>
        </div>
      </div>
    </footer>
  );
};
