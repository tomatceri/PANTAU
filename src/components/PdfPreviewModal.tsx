import React from 'react';
import { DailyReport, Project } from '../types';
import { exportDailyReportPdf } from '../utils/pdfExport';
import { OfficialDailyReportView } from './OfficialDailyReportView';
import { X, Printer, FileDown } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport | null;
  project: Project;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  report,
  project,
}) => {
  if (!isOpen || !report) return null;

  const [isExporting, setIsExporting] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportDailyReportPdf(report, project);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-auto flex flex-col max-h-[96vh]">
        {/* Top Action Bar */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0 rounded-t-xl no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Pratinjau Dokumen Cetak Standar (1:1)</span>
            <span className="font-mono text-xs text-slate-300">
              ({report.docCode || 'AAA/CONS/FM-014'} · {report.reportDate})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Hardcopy</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Memproses PDF...' : 'Download PDF Resmi'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <OfficialDailyReportView report={report} project={project} />
        </div>
      </div>
    </div>
  );
};
