import React, { useState } from 'react';
import { FileSpreadsheet, Download, Check, Info, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../context/LanguageContext';

export const FormatExampleCard: React.FC = () => {
  const { t } = useLanguage();
  const [activeFormat, setActiveFormat] = useState<'excel' | 'csv'>('excel');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const sampleData = [
    {
      id: 'MOL_001',
      smiles: 'CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5',
      name: 'Imatinib',
      type: 'Kinase Inhibitor',
    },
    {
      id: 'MOL_002',
      smiles: 'CS(=O)(=O)CC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(=C(C=C4)OCC5=CC(=CC=C5)F)Cl',
      name: 'Lapatinib',
      type: 'Kinase Inhibitor',
    },
    {
      id: 'MOL_003',
      smiles: 'COC1=C(C=C2C(=C1)C=CC(=O)O2)O',
      name: 'L-Scopoletin',
      type: 'Coumarin derivative',
    },
    {
      id: 'MOL_004',
      smiles: 'CC1=C(C2=C(C=C1)C(=O)C3=C(C2=O)C=CC(=C3O)O)O',
      name: 'Morindone',
      type: 'Anthraquinone',
    },
  ];

  const handleDownloadCsv = () => {
    const csvContent = [
      'ID,Smiles,Nama_Senyawa,Keterangan',
      ...sampleData.map((d) => `"${d.id}","${d.smiles}","${d.name}","${d.type}"`),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_dataset_qsar.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('CSV');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleDownloadXlsx = () => {
    const rows = [
      ['ID', 'Smiles', 'Nama_Senyawa', 'Keterangan'],
      ...sampleData.map((d) => [d.id, d.smiles, d.name, d.type]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 45 }, { wch: 18 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dataset_Molekul');
    XLSX.writeFile(wb, 'template_dataset_qsar.xlsx');

    setDownloadSuccess('Excel');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top Header with Format Tabs */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{t.formatGuide.title}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {t.formatGuide.subtitle}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFormat('excel')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer ${
              activeFormat === 'excel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.formatGuide.tabExcel}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormat('csv')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer ${
              activeFormat === 'csv'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t.formatGuide.tabCsv}</span>
          </button>
        </div>
      </div>

      {/* Visual Mockup Container */}
      <div className="p-3 sm:p-5 bg-slate-900 text-white relative">
        {activeFormat === 'excel' ? (
          /* Realistic Excel Window Graphic */
          <div className="rounded-xl border border-slate-700 bg-white text-slate-900 overflow-hidden shadow-xl text-xs font-sans">
            {/* Excel Title Bar */}
            <div className="bg-[#107c41] text-white px-3 py-2 flex items-center justify-between font-medium text-[11px] gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
                <span className="font-semibold tracking-wide truncate">
                  template_dataset_qsar.xlsx <span className="hidden sm:inline">- Microsoft Excel</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-emerald-100 text-[10px] shrink-0">
                <span className="bg-emerald-700/60 px-2 py-0.5 rounded">Sheet 1</span>
              </div>
            </div>

            {/* Excel Formula Bar */}
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center gap-2 text-[11px] font-mono text-slate-600">
              <span className="font-bold text-slate-400 select-none">fx</span>
              <span className="border-l border-slate-300 pl-2 text-slate-800">
                CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)...
              </span>
            </div>

            {/* Spreadsheet Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-300 select-none">
                    <th className="w-8 py-1.5 text-center border-r border-slate-300 bg-slate-200/70 text-[10px]">
                      &nbsp;
                    </th>
                    <th className="py-1.5 px-3 border-r border-slate-300 font-bold text-slate-700">
                      A
                    </th>
                    <th className="py-1.5 px-3 border-r border-slate-300 font-bold text-slate-700">
                      B
                    </th>
                    <th className="py-1.5 px-3 border-r border-slate-300 font-bold text-slate-700">
                      C
                    </th>
                    <th className="py-1.5 px-3 font-bold text-slate-700">
                      D
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Header Row */}
                  <tr className="border-b border-slate-300 bg-emerald-50/60 font-semibold text-slate-900">
                    <td className="text-center border-r border-slate-300 bg-slate-200/50 text-[10px] text-slate-500 font-bold select-none">
                      1
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200">
                      <div className="flex items-center gap-1 text-slate-900">
                        <span>ID</span>
                        <span className="text-[9px] px-1 rounded bg-slate-200 text-slate-600 font-normal">{t.formatGuide.optionalBadge}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 bg-emerald-100/80">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                        <span>Smiles</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-700 text-white uppercase font-bold">{t.formatGuide.requiredBadge}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200">
                      <span>Nama_Senyawa</span>
                    </td>
                    <td className="py-2 px-3">
                      <span>Keterangan</span>
                    </td>
                  </tr>

                  {/* Row 2: Data Row 1 */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="text-center border-r border-slate-300 bg-slate-200/50 text-[10px] text-slate-400 font-bold select-none">
                      2
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-700">
                      MOL_001
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-800 truncate max-w-xs ring-2 ring-emerald-500 ring-inset bg-emerald-50/20">
                      CC1=C(C=C(C=C1)NC(=O)...)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600">
                      Imatinib
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      Kinase Inhibitor
                    </td>
                  </tr>

                  {/* Row 3: Data Row 2 */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="text-center border-r border-slate-300 bg-slate-200/50 text-[10px] text-slate-400 font-bold select-none">
                      3
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-700">
                      MOL_002
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-800 truncate max-w-xs">
                      CS(=O)(=O)CC1=CC=C(O1)...
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600">
                      Lapatinib
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      Kinase Inhibitor
                    </td>
                  </tr>

                  {/* Row 4: Data Row 3 */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="text-center border-r border-slate-300 bg-slate-200/50 text-[10px] text-slate-400 font-bold select-none">
                      4
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-700">
                      MOL_003
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-800 truncate max-w-xs">
                      COC1=C(C=C2C(=C1)C=CC...
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600">
                      L-Scopoletin
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      Coumarin
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Clean CSV Code Style Graphic */
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs overflow-x-auto shadow-xl space-y-1">
            <div className="text-[11px] text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-blue-400">template_dataset_qsar.csv (Plain Text / Comma-Separated)</span>
              <span className="text-[10px] text-slate-500">Encoding: UTF-8</span>
            </div>
            <div className="pt-2 text-emerald-400 font-bold">
              <span className="text-slate-500 select-none mr-3">1</span>
              ID,Smiles,Nama_Senyawa,Keterangan
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500 select-none mr-3">2</span>
              MOL_001,CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5,Imatinib,Kinase Inhibitor
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500 select-none mr-3">3</span>
              MOL_002,CS(=O)(=O)CC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(=C(C=C4)OCC5=CC(=CC=C5)F)Cl,Lapatinib,Kinase Inhibitor
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500 select-none mr-3">4</span>
              MOL_003,COC1=C(C=C2C(=C1)C=CC(=O)O2)O,L-Scopoletin,Coumarin
            </div>
          </div>
        )}

        {/* Visual Callout Annotations */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
          <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-lg flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <div>
              <p className="font-bold text-emerald-300">{t.formatGuide.calloutSmilesTitle}</p>
              <p className="text-slate-400 text-[10px]">
                {t.formatGuide.calloutSmilesDesc}
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-lg flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 shrink-0" />
            <div>
              <p className="font-bold text-blue-300">{t.formatGuide.calloutIdTitle}</p>
              <p className="text-slate-400 text-[10px]">
                {t.formatGuide.calloutIdDesc}
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-2.5 rounded-lg flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
            <div>
              <p className="font-bold text-amber-300">{t.formatGuide.calloutCleanTitle}</p>
              <p className="text-slate-400 text-[10px]">
                {t.formatGuide.calloutCleanDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer with Download Template Buttons */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{t.formatGuide.downloadPrompt}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleDownloadXlsx}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            {downloadSuccess === 'Excel' ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{t.formatGuide.downloadExcel}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            {downloadSuccess === 'CSV' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{t.formatGuide.downloadCsv}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

