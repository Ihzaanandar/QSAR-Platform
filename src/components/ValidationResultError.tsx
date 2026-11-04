import React from 'react';
import { XCircle, AlertOctagon, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ValidationResultErrorProps {
  message?: string;
  errors: string[];
  fileName?: string;
  onRetry: () => void;
}

export const ValidationResultError: React.FC<ValidationResultErrorProps> = ({
  message,
  errors,
  fileName,
  onRetry,
}) => {
  const { t } = useLanguage();

  return (
    <div className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Red Alert Banner */}
      <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-5 sm:p-6 text-rose-950 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-rose-900">
              {t.error.title}
            </h3>
            <p className="text-xs sm:text-sm text-rose-800">
              {message || t.error.desc}
            </p>
            {fileName && (
              <p className="text-xs font-mono text-rose-700/80 pt-1">
                {t.error.filePrefix} <strong>{fileName}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Errors Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <span>{t.error.heading}</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.error.subtitle}
          </p>
        </div>

        <ul className="space-y-3">
          {errors.map((err, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800"
            >
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✕
              </div>
              <span className="leading-relaxed font-mono">{err}</span>
            </li>
          ))}
        </ul>

        {/* Guidance tip */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
          <p className="font-semibold">{t.error.tipsHeading}</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800">
            <li>{t.error.tips1}</li>
            <li>{t.error.tips2}</li>
            <li>{t.error.tips3}</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-start">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.error.retryBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
