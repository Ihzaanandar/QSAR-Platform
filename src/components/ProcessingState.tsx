import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ProcessingStateProps {
  fileName?: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ fileName }) => {
  const { t } = useLanguage();

  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center px-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-12 max-w-lg w-full shadow-lg space-y-5 sm:space-y-6">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          {/* Animated circular loader */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            {t.processing.title}
          </h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            {t.processing.desc}
          </p>
          {fileName && (
            <p className="text-xs font-mono text-slate-400 pt-2 truncate max-w-xs mx-auto">
              {t.processing.filePrefix} {fileName}
            </p>
          )}
        </div>

        {/* Progress simulation bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
};
