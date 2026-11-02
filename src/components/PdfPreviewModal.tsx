import React, { useState, useEffect } from 'react';
import { DailyReport, Project } from '../types';
import { exportDailyReportPdf } from '../utils/pdfExport';
import { OfficialDailyReportView } from './OfficialDailyReportView';
import { X, Printer, FileDown, ZoomIn, Maximize2, FileText } from 'lucide-react';

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

  const [isExporting, setIsExporting] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Dimensions: Standard A4 width at 96 DPI is ~794px
  const isMobile = viewportWidth < 820;
  const paperBaseWidth = 794;
  // Account for container padding (16px left/right on mobile)
  const availableWidth = Math.max(280, viewportWidth - 24);
  const scaleFactor = isMobile && zoomMode === 'fit'
    ? Math.min(1, availableWidth / paperBaseWidth)
    : 1;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-1 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-5xl w-full my-auto flex flex-col max-h-[96vh] overflow-hidden border border-slate-700">
        {/* Top Action Bar (Mobile-Optimized: X is pinned and ALWAYS visible without horizontal scroll) */}
        <div className="p-3 bg-slate-900 text-white shrink-0 rounded-t-xl sm:rounded-t-2xl no-print space-y-2.5">
          {/* Row 1: Title & Pinned Close Button X */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm text-white truncate">
                  Pratinjau Dokumen Cetak Standar (1:1)
                </div>
                <div className="font-mono text-[10px] text-slate-300 truncate">
                  {report.docCode || 'AAA/CONS/FM-014'} · Tanggal: {report.reportDate}
                </div>
              </div>
            </div>

            {/* Pinned Close Button: ALWAYS visible on top right */}
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
              title="Tutup (Esc)"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Actions (Download PDF, Print, Zoom Toggle) - Fits 100% on Mobile */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Memproses PDF...' : 'Download PDF Resmi'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Hardcopy</span>
              </button>
            </div>

            {/* Scale / Fit Toggle for Mobile Screens */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setZoomMode((prev) => (prev === 'fit' ? 'full' : 'fit'))}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                {zoomMode === 'fit' ? (
                  <>
                    <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Zoom 100%</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pas Layar HP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Printable Paper Document Canvas (Centered & Cleanly Scaled on Mobile) */}
        <div className="p-2 sm:p-6 overflow-x-auto overflow-y-auto bg-slate-200/90 flex justify-center flex-1 min-h-0">
          <div
            className="transition-transform duration-150 origin-top flex justify-center shrink-0"
            style={{
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top center',
              width: `${paperBaseWidth}px`,
              // Collapse empty whitespace caused by CSS scale
              marginBottom: scaleFactor < 1 ? `-${Math.round((1 - scaleFactor) * 1180)}px` : undefined,
            }}
          >
            <OfficialDailyReportView report={report} project={project} />
          </div>
        </div>
      </div>
    </div>
  );
};
