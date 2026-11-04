import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, ArrowUpRight, Download, Sparkles, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/samples';
import { FormatExampleCard } from './FormatExampleCard';
import { useLanguage } from '../context/LanguageContext';

interface UploadSectionProps {
  onUploadFile: (file: File) => void;
  isLoading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onUploadFile, isLoading }) => {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndSelectFile = (file: File) => {
    setClientError(null);

    // Check extension
    const validExts = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setClientError('Format file tidak didukung. Harap pilih file dengan ekstensi .csv, .xlsx, atau .xls.');
      setSelectedFile(null);
      return;
    }

    // Check size limit: 10 MB
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setClientError(`Ukuran file (${formatFileSize(file.size)}) melebihi batas maksimum 10 MB.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setClientError('File yang dipilih kosong (0 byte).');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    const blob = new Blob([sample.content], { type: 'text/csv' });
    const file = new File([blob], sample.filename, { type: 'text/csv' });
    validateAndSelectFile(file);
  };

  const handleDownloadSample = (sampleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    const blob = new Blob([sample.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sample.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (!selectedFile || isLoading) return;
    onUploadFile(selectedFile);
  };

  return (
    <div id="upload-section" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.upload.headerTitle}
          </h2>
          <p className="mt-1 text-sm sm:text-base text-slate-600">
            {t.upload.headerSubtitle}
          </p>
        </div>

        {/* Format Guide Visibility Toggle */}
        <button
          type="button"
          onClick={() => setShowFormatGuide((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>{showFormatGuide ? t.formatGuide.toggleHide : t.formatGuide.toggleShow}</span>
          {showFormatGuide ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Main Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dropzone and File Selection */}
        <div className="lg:col-span-8 space-y-4">
          {/* Format Example Card (Graphic Preview & Template Download) */}
          {showFormatGuide && (
            <div className="transition-all animate-in fade-in duration-200">
              <FormatExampleCard />
            </div>
          )}

          {/* Client Error Alert */}
          {clientError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t.upload.fileAlertTitle}</p>
                <p className="text-xs text-rose-700 mt-0.5">{clientError}</p>
              </div>
            </div>
          )}

          {/* Upload Drop Area */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
                  : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-3.5 sm:space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-slate-800">
                    {t.upload.dropTitle}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t.upload.dropSubtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {t.upload.chooseFile}
                </button>

                <p className="text-[11px] sm:text-xs text-slate-400 pt-1 font-mono">
                  {t.upload.dropLimit}
                </p>
              </div>
            </div>
          ) : (
            /* Selected File Card (Matching Reference Board 1 & 2) */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-semibold text-slate-900 break-all truncate">
                      {selectedFile.name}
                    </h4>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {formatFileSize(selectedFile.size)} · {selectedFile.name.toLowerCase().endsWith('.csv') ? 'CSV Document' : 'Excel Spreadsheet (.xlsx)'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRemoveFile}
                  title="Hapus file"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer text-center sm:text-left py-1"
                >
                  {t.upload.btnChangeFile}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{t.upload.btnUploadValidate}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Sample Dataset Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {t.upload.sampleHeader}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SAMPLE_DATASETS.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleLoadSample(sample.id)}
                  className="group p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/40 transition-all cursor-pointer flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                      <span className="truncate pr-1">{sample.name.split('(')[0].trim()}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {sample.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>
                      {sample.category === 'valid' ? '✓ Valid' : sample.category === 'warning' ? '⚠ Warnings' : '✕ Error test'}
                    </span>
                    <button
                      onClick={(e) => handleDownloadSample(sample.id, e)}
                      title="Download file CSV"
                      className="hover:text-blue-600 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>.csv</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: File Requirements & Best Practices */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>{t.upload.reqTitle}</span>
            </h3>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.upload.reqFormat}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.upload.reqHeader}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.upload.reqRows}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.upload.reqConsistent}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{t.upload.reqSmiles}</span>
              </li>
            </ul>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              {t.upload.encodingNote}
            </div>
          </div>

          {/* Prototype Boundary Notice Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">{t.upload.protoNoticeTitle}</p>
            <p className="leading-relaxed">
              {t.upload.protoNoticeDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
