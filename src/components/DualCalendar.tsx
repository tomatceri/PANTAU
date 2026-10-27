import React, { useState } from 'react';
import { Project, DailyReport, UserRole } from '../types';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, MessageCircle, 
  AlertTriangle, AlertCircle, Clock, Eye, Edit3, 
  HelpCircle, Check, Info, CalendarDays
} from 'lucide-react';
import { getRealTodayStr, formatIndonesianDate } from '../utils/formDefaults';
import {
  getCalendarDayStatusStyle,
  getMonthCalendarSummary,
  INDONESIAN_MONTH_NAMES,
  INDONESIAN_DAY_NAMES,
  parseLocalDate,
} from '../utils/calendarStatus';

interface DualCalendarProps {
  project: Project;
  reports: DailyReport[];
  currentRole: UserRole;
  currentYear: number;
  currentMonth: number;
  todayStr: string;
  onMonthChange: (year: number, month: number) => void;
  onSelectDate: (date: string) => void;
  onTriggerEscalation: (date: string) => void;
}

export const DualCalendar: React.FC<DualCalendarProps> = ({
  project,
  reports,
  currentRole,
  currentYear,
  currentMonth,
  todayStr,
  onMonthChange,
  onSelectDate,
}) => {
  // Real-time current date from user system clock
  const realNow = new Date();
  const realYear = realNow.getFullYear();
  const realMonth = realNow.getMonth(); // 0-indexed
  const realTodayStr = todayStr || getRealTodayStr();

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'submitted' | 'needs_revision' | 'overdue'>('all');
  const [waToast, setWaToast] = useState<string | null>(null);

  const monthNames = INDONESIAN_MONTH_NAMES;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onMonthChange(currentYear - 1, 11);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onMonthChange(currentYear + 1, 0);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    onMonthChange(realYear, realMonth);
  };

  const handleJumpToDemoMonth = () => {
    onMonthChange(2026, 9); // Oktober 2026
  };

  // Days in month calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Minggu
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Create grid cells (including empty padding for leading days)
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(d);
  }


  const getReportForDay = (day: number): DailyReport | undefined => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${mStr}-${dStr}`;
    return reports.find((r) => r.reportDate === dateStr);
  };

  const getDayStatusStyle = (day: number, report?: DailyReport) => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${mStr}-${dStr}`;
    return getCalendarDayStatusStyle(project, dateStr, report, realTodayStr);
  };

  // WhatsApp Reminder Handler
  const handleSendWhatsAppReminder = (dateStr: string, report?: DailyReport) => {
    const [year, month, day] = dateStr.split('-');
    const dateObj = parseLocalDate(dateStr);
    const formattedIndoDate = `${INDONESIAN_DAY_NAMES[dateObj.getDay()]}, ${parseInt(day, 10)} ${monthNames[parseInt(month, 10) - 1]} ${year}`;

    const isRevision = report?.approvalStatus === 'needs_revision';
    const statusText = isRevision 
      ? 'Perlu Revisi (Ada Catatan Perbaikan dari PMO)' 
      : 'Terlambat / Belum Diserahkan ke PMO';

    const message = 
`*PENGINGAT LAPORAN HARIAN PROYEK (TIM PMO)*

Halo Tim Kontraktor *${project.contractorName}*,

Pemberitahuan resmi dari Tim PMO untuk:
📌 *Proyek:* ${project.name} (${project.code})
📅 *Tanggal Laporan:* ${formattedIndoDate}
⚠️ *Status:* ${statusText}

${isRevision 
  ? 'Catatan PMO: Harap segera membuka portal dan memperbarui data laporan sesuai catatan revisi yang telah kami berikan.'
  : 'Laporan harian untuk tanggal ini tercatat belum diisi/dikirim. Mohon agar segera mengisi data kehadiran pekerja, peralatan, cuaca, dan progres fisik hari ini.'}

Terima kasih atas kerja samanya.
_Salam, PMO: ${project.pmoLead}_`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    setWaToast(`Pesan pengingat WhatsApp untuk tanggal ${parseInt(day, 10)} ${monthNames[parseInt(month, 10) - 1]} siap dikirim ke kontraktor!`);
    setTimeout(() => {
      setWaToast(null);
    }, 4500);
  };

  // Unified monthly summary matching every calendar cell 1:1
  const monthSummary = getMonthCalendarSummary(project, reports, currentYear, currentMonth, realTodayStr);
  const countOverdueRed = monthSummary.overdueCount;
  const unsubmittedDaysList = monthSummary.overdueDetails;

  return (
    <div className="space-y-4">
      {/* Toast Notification when WhatsApp triggered */}
      {waToast && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{waToast}</span>
          </div>
          <button
            onClick={() => setWaToast(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* PENGINGAT LAPORAN HARIAN DI TAMPILAN KONTRAKTOR */}
      {currentRole === 'contractor' ? (
        <div className="space-y-3">
          {/* Active Deadline Reminder Box Berlogo Alarm */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                  ⏰
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">
                      Pengingat Laporan Harian Kontraktor
                    </h2>
                    {unsubmittedDaysList.length > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                        {unsubmittedDaysList.length} Tanggal Belum Diisi
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Semua Tanggal Telah Terisi
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-slate-500">
                      · Batas Cut-off: Setiap Pagi Jam 09:00 WIB (H+1)
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {reports.find((r) => r.reportDate === todayStr)?.approvalStatus === 'submitted' ? (
                      <span className="text-blue-800 font-medium">
                        ✓ Laporan hari ini ({formatIndonesianDate(todayStr).split(',')[0]} / {todayStr}) telah berhasil dikirim ke PMO dan sedang menunggu review verifikasi.
                      </span>
                    ) : reports.find((r) => r.reportDate === todayStr)?.approvalStatus === 'approved' ? (
                      <span className="text-emerald-800 font-medium">
                        ✓ Laporan hari ini ({formatIndonesianDate(todayStr).split(',')[0]} / {todayStr}) telah disetujui resmi oleh Tim PMO.
                      </span>
                    ) : (
                      <span>
                        Laporan hari ini (<strong>{formatIndonesianDate(todayStr)}</strong>) masih berstatus draft / siap diisi kontraktor.
                      </span>
                    )}
                  </p>

                  {/* Daftar tanggal yang belum diisi (tanpa kedip-kedip, interaktif bisa diklik) */}
                  {unsubmittedDaysList.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Perhatian: Terdapat {unsubmittedDaysList.length} laporan tanggal merah yang terlewat dan wajib segera dilengkapi!</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {unsubmittedDaysList.map((item) => (
                          <button
                            key={item.dateStr}
                            type="button"
                            onClick={() => onSelectDate(item.dateStr)}
                            className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-red-50 text-slate-800 hover:text-red-800 border border-slate-300 hover:border-red-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            title={`Buka dan isi laporan tanggal ${item.label}`}
                          >
                            <CalendarDays className="w-3 h-3 text-red-500" />
                            <span>{item.label}</span>
                            <span className="text-[10px] text-blue-600 font-semibold">Isi →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-end md:self-start">
                <button
                  type="button"
                  onClick={() => onSelectDate(todayStr)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Isi Hari Ini ({formatIndonesianDate(todayStr).split(',')[0]})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick 3-Step Guide */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Panduan 3 Langkah:</span>
              <span>1. Klik tanggal di kalender</span>
              <span>→</span>
              <span>2. Isi pekerja, alat & cuaca (bisa pakai Salin Data Kemarin)</span>
              <span>→</span>
              <span>3. Klik tombol hijau Kirim ke PMO</span>
            </div>
          </div>
        </div>
      ) : (
        /* SPECIAL GUIDANCE & ALERT FOR PMO */
        <div className="bg-blue-50/80 border border-blue-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
              🛡️
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Panel Pengawasan & Verifikasi PMO</span>
                {countOverdueRed > 0 && (
                  <span className="font-mono text-xs px-2 py-0.5 bg-red-600 text-white rounded-full font-bold">
                    {countOverdueRed} Laporan Terlambat
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Tinjau laporan bertanda <strong>Biru (Submitted)</strong> untuk disahkan, atau klik tombol{' '}
                <strong className="text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded font-mono">Ingatkan via WA</strong>{' '}
                pada tanggal bertanda <strong>Merah</strong> untuk mengirim pesan pengingat langsung ke nomor kontraktor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KALENDER MONITORING HARIAN CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        {/* Month Selector & Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded hover:bg-white text-slate-700 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 w-48 text-center">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded hover:bg-white text-slate-700 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleJumpToToday}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                currentYear === realYear && currentMonth === realMonth
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={`Bulan & tanggal hari ini (${formatIndonesianDate(realTodayStr)})`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>Hari Ini ({formatIndonesianDate(realTodayStr)})</span>
            </button>

            {(currentYear !== 2026 || currentMonth !== 9) && (
              <button
                type="button"
                onClick={handleJumpToDemoMonth}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 shadow-xs"
                title="Buka data proyek di bulan simulasi Oktober 2026"
              >
                <span>📂 Data Simulasi (Okt 2026)</span>
              </button>
            )}
          </div>

          {/* Filter Status Sesuai 4 Kategori Warna */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold border ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua Tanggal
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold flex items-center gap-1.5 border ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span>Approved</span>
            </button>

            <button
              onClick={() => setStatusFilter('submitted')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold flex items-center gap-1.5 border ${
                statusFilter === 'submitted'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
              <span>Submitted</span>
            </button>

            <button
              onClick={() => setStatusFilter('needs_revision')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold flex items-center gap-1.5 border ${
                statusFilter === 'needs_revision'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
              <span>Perlu Revisi</span>
            </button>

            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-semibold flex items-center gap-1.5 border ${
                statusFilter === 'overdue'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-800 border-red-200 hover:bg-red-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" />
              <span>Terlambat</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 pt-2">
          {/* Day of Week Headers (Indonesian) */}
          {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dw, idx) => (
            <div
              key={dw}
              className={`text-center py-2 text-xs font-bold uppercase tracking-wider rounded bg-slate-50 border border-slate-100 ${
                idx === 0 ? 'text-red-600 font-extrabold' : 'text-slate-700'
              }`}
            >
              {dw}
            </div>
          ))}

          {/* Days Cells */}
          {calendarCells.map((day, cellIdx) => {
            if (day === null) {
              return <div key={`empty-${cellIdx}`} className="min-h-32 bg-transparent" />;
            }

            const report = getReportForDay(day);
            const mStr = String(currentMonth + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const dateStr = `${currentYear}-${mStr}-${dStr}`;
            const isToday = dateStr === todayStr;
            const style = getDayStatusStyle(day, report);

            // Filtering check
            if (statusFilter !== 'all') {
              if (statusFilter === 'approved' && style.category !== 'approved') {
                return <div key={dateStr} className="min-h-32 opacity-20 border border-slate-200 rounded-lg p-2" />;
              }
              if (statusFilter === 'submitted' && style.category !== 'submitted') {
                return <div key={dateStr} className="min-h-32 opacity-20 border border-slate-200 rounded-lg p-2" />;
              }
              if (statusFilter === 'needs_revision' && style.category !== 'needs_revision') {
                return <div key={dateStr} className="min-h-32 opacity-20 border border-slate-200 rounded-lg p-2" />;
              }
              if (statusFilter === 'overdue' && style.category !== 'overdue') {
                return <div key={dateStr} className="min-h-32 opacity-20 border border-slate-200 rounded-lg p-2" />;
              }
            }

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-34 rounded-xl border-2 p-2.5 flex flex-col justify-between transition-all cursor-pointer relative group hover:shadow-md ${style.bg} ${style.border} ${
                  isToday ? 'ring-2 ring-blue-600 !border-blue-600 shadow-sm' : ''
                }`}
              >
                {/* Top Row: Tanggal + Status Dot */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-base font-bold tabular-nums ${
                        isToday
                          ? 'w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs shadow-xs'
                          : 'text-slate-900'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 border border-blue-300 px-1.5 py-0.2 rounded flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Hari Ini
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Info: Clean status without color names */}
                <div className="my-1.5 space-y-1">
                  {style.label && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded leading-tight ${style.badgeBg} truncate max-w-full block`}>
                        {style.label}
                      </span>
                    </div>
                  )}

                  {report?.reportNumber && (
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      {report.reportNumber}
                    </div>
                  )}

                  {/* PMO Revision Note alert if needs revision */}
                  {report?.approvalStatus === 'needs_revision' && (
                    <div className="text-[10px] text-amber-900 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded line-clamp-1">
                      ⚠️ Ada Catatan Revisi
                    </div>
                  )}
                </div>

                {/* Bottom Action Area: Mode Kontraktor vs Mode PMO */}
                <div className="pt-1.5 border-t border-slate-200/80">
                  {currentRole === 'contractor' ? (
                    /* KONTRAKTOR ACTION: Sangat jelas dan mudah diklik */
                    style.category === 'approved' ? (
                      <div className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Disetujui (Lihat)</span>
                      </div>
                    ) : style.category === 'submitted' ? (
                      <div className="text-blue-700 text-[11px] font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Menunggu PMO</span>
                      </div>
                    ) : style.category === 'needs_revision' ? (
                      <div className="text-amber-800 text-[11px] font-normal flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Perbaiki laporan</span>
                      </div>
                    ) : style.category === 'overdue' ? (
                      <div className="text-red-700 text-[11px] font-normal flex items-center gap-1 bg-red-50/90 px-1.5 py-0.5 rounded border border-red-200/80">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Isi laporan sekarang</span>
                      </div>
                    ) : (
                      <div className="text-slate-600 group-hover:text-blue-700 text-[11px] font-normal flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                        <span>{report ? 'Buka Laporan' : 'Isi Laporan'}</span>
                      </div>
                    )
                  ) : (
                    /* PMO ACTION: Ada opsi langsung INGATKAN VIA WA jika laporan belum / terlambat / perlu revisi */
                    <div className="space-y-1">
                      {style.canRemindWa ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsAppReminder(dateStr, report);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-md transition-all shadow-xs"
                          title="Klik untuk langsung kirim pesan pengingat WhatsApp ke Kontraktor"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>Ingatkan via WA</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 group-hover:text-blue-700">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>{report?.approvalStatus === 'approved' ? 'Lihat Arsip' : 'Review Laporan'}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
