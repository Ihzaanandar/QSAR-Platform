import React from 'react';
import { Atom, ShieldAlert, Layers, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AboutSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-12 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 font-mono">
            {t.about.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {t.about.heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            {t.about.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* What is QSAR */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Atom className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {t.about.qsarTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.qsarP1}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.qsarP2}
            </p>
          </div>

          {/* Prototype Scope & Invariants */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {t.about.scopeTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.scopeP1}
            </p>

            <ul className="space-y-2 text-xs text-slate-700 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.about.scopeItem1}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.about.scopeItem2}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.about.scopeItem3}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.about.scopeItem4}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
