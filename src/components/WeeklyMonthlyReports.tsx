import React, { useState } from 'react';
import { Project, DailyReport, WeeklyReport, MonthlyReport, UserRole, SignatoryInfo } from '../types';
import { exportWeeklyReportPdf, exportMonthlyReportPdf } from '../utils/pdfExport';
import { downloadMonthlyZipPackage } from '../utils/zipGenerator';
import { 
  FileText, Calendar, CloudRain, Users, Clock, 
  Archive, FileDown, CheckCircle2, ShieldCheck, Check
} from 'lucide-react';

interface WeeklyMonthlyReportsProps {
  project: Project;
  dailyReports: DailyReport[];
  weeklyReports: WeeklyReport[];
  monthlyReport: MonthlyReport;
  currentRole: UserRole;
  onUpdateWeekly: (updated: WeeklyReport) => void;
  onUpdateMonthly: (updated: MonthlyReport) => void;
}

export const WeeklyMonthlyReports: React.FC<WeeklyMonthlyReportsProps> = ({
  project,
  dailyReports,
  weeklyReports,
  monthlyReport,
  currentRole,
  onUpdateWeekly,
  onUpdateMonthly,
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeekId, setSelectedWeekId] = useState(weeklyReports[0]?.id || '');
  const [showSignWeekly, setShowSignWeekly] = useState(false);
  const [showSignMonthly, setShowSignMonthly] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Form states for simple Name & Title verification
  const [verifierName, setVerifierName] = useState('');
  const [verifierTitle, setVerifierTitle] = useState('');

  const activeWeekly = weeklyReports.find((w) => w.id === selectedWeekId) || weeklyReports[0];

  const getAggregatedWeekData = (week: WeeklyReport) => {
    const matchingDailies = dailyReports.filter((d) => week.dailyReportIds.includes(d.id));
    const totalManpowerHours = matchingDailies.reduce((sum, d) => {
      const dayHours = d.manpower.reduce((sub, m) => sub + m.count * m.hoursWorked, 0);
      return sum + dayHours;
    }, 0);

    const totalDowntimeHours = matchingDailies.reduce((sum, d) => sum + d.weather.downtimeHours, 0);
    const weatherDelayDaysCount = matchingDailies.filter((d) => d.weather.claimEligible).length;

    return {
      matchingDailies,
      totalManpowerHours: totalManpowerHours || week.totalManpowerHours,
      totalDowntimeHours: totalDowntimeHours || week.totalDowntimeHours,
      weatherDelayDaysCount: weatherDelayDaysCount || week.weatherDelayDaysCount,
    };
  };

  const handleOpenWeeklySign = () => {
    setVerifierName(currentRole === 'pmo' ? project.pmoLead : 'Engr. David Santoso, ST');
    setVerifierTitle(currentRole === 'pmo' ? 'PMO Resident Engineer' : 'Contractor Site Manager');
    setShowSignWeekly(true);
  };

  const handleConfirmSignWeekly = () => {
    if (!activeWeekly) return;
    const signatory: SignatoryInfo = {
      signedBy: verifierName.trim() || (currentRole === 'pmo' ? project.pmoLead : 'Engr. David Santoso'),
      title: verifierTitle.trim() || (currentRole === 'pmo' ? 'PMO Resident Engineer' : 'Contractor Site Manager'),
      timestamp: new Date().toLocaleString('id-ID'),
    };

    const updated: WeeklyReport = {
      ...activeWeekly,
      approvalStatus: currentRole === 'pmo' ? 'approved' : activeWeekly.approvalStatus,
      contractorSignatory: currentRole === 'contractor' ? signatory : activeWeekly.contractorSignatory,
      pmoSignatory: currentRole === 'pmo' ? signatory : activeWeekly.pmoSignatory,
    };
    onUpdateWeekly(updated);
    setShowSignWeekly(false);
  };

  const handleOpenMonthlySign = () => {
    setVerifierName(currentRole === 'pmo' ? project.pmoLead : 'Engr. David Santoso, ST');
    setVerifierTitle(currentRole === 'pmo' ? 'PMO Project Director' : 'Contractor Project Director');
    setShowSignMonthly(true);
  };

  const handleConfirmSignMonthly = () => {
    const signatory: SignatoryInfo = {
      signedBy: verifierName.trim() || (currentRole === 'pmo' ? project.pmoLead : 'Engr. David Santoso'),
      title: verifierTitle.trim() || (currentRole === 'pmo' ? 'PMO Project Director' : 'Contractor Project Director'),
      timestamp: new Date().toLocaleString('id-ID'),
    };

    const updated: MonthlyReport = {
      ...monthlyReport,
      approvalStatus: currentRole === 'pmo' ? 'approved' : monthlyReport.approvalStatus,
      contractorSignatory: currentRole === 'contractor' ? signatory : monthlyReport.contractorSignatory,
      pmoSignatory: currentRole === 'pmo' ? signatory : monthlyReport.pmoSignatory,
    };
    onUpdateMonthly(updated);
    setShowSignMonthly(false);
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadMonthlyZipPackage(
        project,
        monthlyReport.monthName,
        monthlyReport.year,
        dailyReports,
        weeklyReports,
        monthlyReport
      );
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Selector: Weekly vs Monthly */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Rekapitulasi Progres (Mingguan & Bulanan)
          </h2>
          <p className="text-xs text-slate-500">
            Agregasi otomatis mengompilasi seluruh laporan harian terverifikasi tanpa perlu entri ganda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'weekly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Mingguan
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paket Eksekutif Bulanan
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isDownloadingZip ? 'Membuat ZIP...' : 'Export Paket Bulanan (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* WEEKLY CONSOLIDATION VIEW */}
      {activeTab === 'weekly' && activeWeekly && (() => {
        const aggregated = getAggregatedWeekData(activeWeekly);

        return (
          <div className="space-y-4">
            {/* Week Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {weeklyReports.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeekId(w.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex items-center gap-2 ${
                    w.id === activeWeekly.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Minggu ke-{w.weekNumber} ({w.startDate} - {w.endDate})</span>
                  {w.approvalStatus === 'approved' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Weekly Header Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Rekap Progres Mingguan - Minggu ke-{activeWeekly.weekNumber} ({activeWeekly.year})
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {activeWeekly.reportNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Periode: {activeWeekly.startDate} s/d {activeWeekly.endDate} · Diagregasi otomatis dari {aggregated.matchingDailies.length} laporan harian
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportWeeklyReportPdf(activeWeekly, project)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download PDF Mingguan</span>
                  </button>

                  <button
                    onClick={handleOpenWeeklySign}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{currentRole === 'pmo' ? 'Verifikasi PMO' : 'Pengesahan Kontraktor'}</span>
                  </button>
                </div>
              </div>

              {/* Aggregated KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-xs flex items-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Total Jam Orang (Man-Hours)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                    {aggregated.totalManpowerHours.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">jam kerja kumulatif</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-xs flex items-center gap-1 mb-1">
                    <CloudRain className="w-3.5 h-3.5 text-amber-600" />
                    <span>Downtime Cuaca Hujan</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-600 tabular-nums">
                    {aggregated.totalDowntimeHours} jam
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {aggregated.weatherDelayDaysCount} hari hujan lebat
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-xs flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Capaian Progres</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
                    {activeWeekly.overallProgressPercent}%
                  </div>
                  <div className="text-[11px] text-slate-400">terhadap rencana</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-slate-500 text-xs flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Status Persetujuan</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-1">
                    {activeWeekly.approvalStatus === 'approved' ? 'Disetujui PMO' : 'Menunggu Review'}
                  </div>
                  <div className="text-[11px] text-slate-400">7/7 laporan lengkap</div>
                </div>
              </div>

              {/* Weekly Narrative Description */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ringkasan Narasi Eksekutif & Catatan Lintasan Kritis
                </label>
                <textarea
                  rows={3}
                  value={activeWeekly.summary}
                  onChange={(e) =>
                    onUpdateWeekly({ ...activeWeekly, summary: e.target.value })
                  }
                  className="w-full text-xs p-3 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Signatures status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-700">Penanggung Jawab Kontraktor</span>
                  <p className="font-bold text-slate-800">{activeWeekly.contractorSignatory?.signedBy || 'Engr. David Santoso, ST'}</p>
                  <p className="text-slate-500">{activeWeekly.contractorSignatory?.title || 'Site Project Manager'}</p>
                  <p className="text-[10px] text-slate-400 italic">* Tanda tangan basah pada lembar hardcopy fisik.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-700">Verifikasi PMO Resident</span>
                  <p className="font-bold text-slate-800">{activeWeekly.pmoSignatory?.signedBy || project.pmoLead}</p>
                  <p className="text-slate-500">{activeWeekly.pmoSignatory?.title || 'PMO Resident Engineer'}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    {activeWeekly.approvalStatus === 'approved' ? '✓ Disetujui & Diverifikasi PMO' : 'Menunggu Review PMO'}
                  </p>
                </div>
              </div>
            </div>

            {/* Simple Verification Modal for Weekly */}
            {showSignWeekly && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    {currentRole === 'pmo' ? 'Verifikasi Mingguan oleh PMO' : 'Pengesahan Mingguan Kontraktor'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tanda tangan basah tetap dilakukan secara fisik pada lembar hardcopy. Masukkan nama dan jabatan penanggung jawab:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={verifierName}
                        onChange={(e) => setVerifierName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Posisi</label>
                      <input
                        type="text"
                        value={verifierTitle}
                        onChange={(e) => setVerifierTitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowSignWeekly(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSignWeekly}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                    >
                      Konfirmasi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MONTHLY EXECUTIVE PACKAGE VIEW */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Laporan Eksekutif Bulanan - {monthlyReport.monthName} {monthlyReport.year}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {monthlyReport.reportNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {project.name} ({project.code}) · Berkas resmi verifikasi sertifikat pembayaran & EOT
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportMonthlyReportPdf(monthlyReport, project)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download PDF Bulanan</span>
                </button>

                <button
                  onClick={handleOpenMonthlySign}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{currentRole === 'pmo' ? 'Persetujuan PMO' : 'Pengesahan Kontraktor'}</span>
                </button>
              </div>
            </div>

            {/* Monthly High-Level Audit Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-500 text-xs mb-1">Hari Kerja Terpantau</div>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {monthlyReport.totalWorkingDays} hari
                </div>
                <div className="text-[11px] text-slate-400">shift terlaksana</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-500 text-xs mb-1">Kumulatif Tenaga Kerja</div>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {monthlyReport.totalManpowerHeadcountSum.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400">shift-pekerja</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-500 text-xs mb-1">Klaim Hambatan Cuaca</div>
                <div className="text-xl font-bold font-mono text-amber-600 tabular-nums">
                  {monthlyReport.totalDowntimeHours} jam
                </div>
                <div className="text-[11px] text-slate-400">
                  {monthlyReport.weatherDelayClaimsTotal} hari berhak klaim EOT
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-slate-500 text-xs mb-1">Kemajuan Progres Bulan Ini</div>
                <div className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
                  +{monthlyReport.monthlyProgressDelta}%
                </div>
                <div className="text-[11px] text-slate-400">tercapai di bulan ini</div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Narasi Eksekutif Bersama PMO & Kontraktor
              </label>
              <textarea
                rows={3}
                value={monthlyReport.executiveSummary}
                onChange={(e) =>
                  onUpdateMonthly({ ...monthlyReport, executiveSummary: e.target.value })
                }
                className="w-full text-xs p-3 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* One-Click Monthly ZIP Export Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Archive className="w-4 h-4 text-slate-700" />
                  <span>Paket Arsip Lengkap Bulanan (.ZIP)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Membundel seluruh {dailyReports.length} laporan harian, rekap mingguan, ledger CSV, dan resume eksekutif ke dalam satu file ZIP terstruktur untuk audit resmi.
                </p>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
              >
                {isDownloadingZip ? 'Mengompresi Arsip...' : 'Download Paket Lengkap (.zip)'}
              </button>
            </div>
          </div>

          {/* Simple Verification Modal for Monthly */}
          {showSignMonthly && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Pengesahan Laporan Bulanan ({monthlyReport.monthName} {monthlyReport.year})
                </h3>
                <p className="text-xs text-slate-500">
                  Tanda tangan basah dilakukan pada dokumen fisik. Masukkan nama dan jabatan penanggung jawab:
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Posisi</label>
                    <input
                      type="text"
                      value={verifierTitle}
                      onChange={(e) => setVerifierTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSignMonthly(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSignMonthly}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                  >
                    Konfirmasi Pengesahan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
