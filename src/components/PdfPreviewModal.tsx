import React, { useState, useEffect } from 'react';
import { DailyReport, Project } from '../types';
import { exportDailyReportPdf, generateDailyReportPdfBlobUrl } from '../utils/pdfExport';
import { OfficialDailyReportView } from './OfficialDailyReportView';
import { X, Printer, FileDown, ZoomIn, Maximize2, FileText, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'pdf' | 'web'>('pdf');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(true);
  const [genError, setGenError] = useState<string | null>(null);

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate real PDF blob URL for 100% identical preview
  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    setIsGeneratingPdf(true);
    setGenError(null);

    generateDailyReportPdfBlobUrl(report, project)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setPdfBlobUrl(url);
        setIsGeneratingPdf(false);
      })
      .catch((err) => {
        console.error('Failed to generate PDF blob preview:', err);
        if (active) {
          setIsGeneratingPdf(false);
          setGenError('Tidak dapat memuat PDF viewer interaktif di browser ini.');
          setViewMode('web');
        }
      });

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [report, project]);

  const handlePrint = () => {
    if (viewMode === 'pdf' && pdfBlobUrl) {
      const iframe = document.getElementById('native-pdf-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.print();
          return;
        } catch {
          // fallback to window.print
        }
      }
    }
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

  const handleOpenInNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    }
  };

  // Dimensions: Standard A4 width at 96 DPI is ~794px
  const isMobile = viewportWidth < 820;
  const paperBaseWidth = 794;
  const availableWidth = Math.max(280, viewportWidth - 24);
  const scaleFactor = isMobile && zoomMode === 'fit'
    ? Math.min(1, availableWidth / paperBaseWidth)
    : 1;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-1 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full my-auto flex flex-col h-[94vh] max-h-[96vh] overflow-hidden border border-slate-700 text-white">
        {/* Top Action Bar */}
        <div className="p-3 bg-slate-900 text-white shrink-0 rounded-t-xl sm:rounded-t-2xl no-print space-y-2.5 border-b border-slate-800">
          {/* Row 1: Title, View Switcher & Pinned Close Button X */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-2">
                  <span>Pratinjau Dokumen Cetak Standar</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700 hidden sm:inline-block">
                    100% Persis Hasil Download
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-300 truncate">
                  {report.docCode || 'AAA/CONS/FM-014'} · Tanggal: {report.reportDate}
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === 'pdf'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Lihat file PDF resmi asli yang sama persis saat diunduh"
                >
                  <FileText className="w-3 h-3" />
                  <span>PDF Asli</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('web')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === 'web'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Lihat pratinjau halaman web dokumen"
                >
                  <span>Format Web</span>
                </button>
              </div>

              {/* Pinned Close Button */}
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ml-1"
                title="Tutup (Esc)"
                aria-label="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Actions (Download PDF, Print, Open New Tab) */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap pt-0.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Memproses PDF...' : 'Download PDF Resmi'}</span>
              </button>

              {pdfBlobUrl && (
                <button
                  onClick={handleOpenInNewTab}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                  title="Buka dokumen PDF di tab baru untuk zoom/cetak penuh"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Buka di Tab Baru</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Hardcopy</span>
              </button>
            </div>

            {/* Mobile scale toggle (only in web format mode) */}
            {isMobile && viewMode === 'web' && (
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

        {/* Document Container */}
        <div className="flex-1 min-h-0 bg-slate-950 flex flex-col items-center overflow-hidden">
          {viewMode === 'pdf' ? (
            <div className="w-full h-full flex flex-col items-center justify-center relative p-1 sm:p-3">
              {isGeneratingPdf ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-sm font-medium">Menyiapkan PDF resmi persis 1:1 hasil unduhan...</p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  id="native-pdf-iframe"
                  src={pdfBlobUrl}
                  className="w-full h-full rounded-lg bg-white border border-slate-700 shadow-2xl"
                  title="Pratinjau PDF Asli Resmi"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-300">
                  <p className="text-sm text-red-400 font-semibold">{genError || 'Gagal memuat pratinjau PDF.'}</p>
                  <button
                    onClick={() => setViewMode('web')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500"
                  >
                    Beralih ke Pratinjau Web
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 sm:p-6 overflow-x-auto overflow-y-auto bg-slate-200/90 w-full flex justify-center flex-1 min-h-0">
              <div
                className="transition-transform duration-150 origin-top flex justify-center shrink-0"
                style={{
                  transform: `scale(${scaleFactor})`,
                  transformOrigin: 'top center',
                  width: `${paperBaseWidth}px`,
                  marginBottom: scaleFactor < 1 ? `-${Math.round((1 - scaleFactor) * 1180)}px` : undefined,
                }}
              >
                <OfficialDailyReportView report={report} project={project} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
