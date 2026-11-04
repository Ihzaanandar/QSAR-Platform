import React from 'react';
import { FileSpreadsheet, Brain, Play, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HowItWorksProps {
  onStartUpload: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksProps> = ({ onStartUpload }) => {
  const { t } = useLanguage();

  const steps = [
    {
      number: '01',
      title: t.howItWorks.step1Title,
      description: t.howItWorks.step1Desc,
      icon: FileSpreadsheet,
    },
    {
      number: '02',
      title: t.howItWorks.step2Title,
      description: t.howItWorks.step2Desc,
      icon: Brain,
    },
    {
      number: '03',
      title: t.howItWorks.step3Title,
      description: t.howItWorks.step3Desc,
      icon: Play,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 font-mono">
            {t.howItWorks.tag}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t.howItWorks.heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            {t.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black font-mono text-blue-600/30">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-medium text-slate-400">
                  <span>{t.howItWorks.stepOf.replace('{current}', String(idx + 1)).replace('{total}', '3')}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onStartUpload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <span>{t.howItWorks.ctaStart}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
