import { DailyReport, Project } from '../types';

export type CalendarDayCategory =
  | 'approved'
  | 'needs_revision'
  | 'submitted'
  | 'overdue'
  | 'rest-day'
  | 'today'
  | 'future';

export interface CalendarDayStatusStyle {
  category: CalendarDayCategory;
  bg: string;
  border: string;
  badgeBg: string;
  indicator: string;
  label: string;
  desc: string;
  canRemindWa: boolean;
}

export const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const INDONESIAN_DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatYearMonthDay(year: number, monthZeroIndexed: number, day: number): string {
  const mStr = String(monthZeroIndexed + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${year}-${mStr}-${dStr}`;
}

/**
 * Single source of truth for classifying any calendar date so that
 * Calendar cells, Top Summary cards (Hijau, Biru, Oranye, Merah),
 * Project List counters, and PMO Escalation Reminders are 100% synchronized.
 */
export function getCalendarDayStatusStyle(
  project: Project,
  dateStr: string,
  report: DailyReport | undefined,
  todayStr: string
): CalendarDayStatusStyle {
  const dateObj = parseLocalDate(dateStr);
  const isSunday = dateObj.getDay() === 0;
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isCompletedProject = project.status === 'Completed';
  const isBeforeProjectStart = Boolean(project.startDate && dateStr < project.startDate);

  // Explicit rest-day entries (e.g., Sunday security log marked isRestDay / 'rest-day')
  if (report && (report.isRestDay || report.submissionTiming === 'rest-day')) {
    return {
      category: 'rest-day',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-500 border border-slate-200',
      indicator: 'bg-slate-300',
      label: 'Hari Libur',
      desc: 'Hari libur / tidak ada pekerjaan wajib.',
      canRemindWa: false,
    };
  }

  // 1. HIJAU (Approved)
  if (report && report.approvalStatus === 'approved') {
    return {
      category: 'approved',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-400 hover:border-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
      indicator: 'bg-emerald-500',
      label: 'Approved',
      desc: 'Laporan telah diverifikasi dan disetujui resmi oleh Tim PMO.',
      canRemindWa: false,
    };
  }

  // 2. ORANYE (Perlu Revisi)
  if (report && report.approvalStatus === 'needs_revision') {
    return {
      category: 'needs_revision',
      bg: 'bg-amber-50/80',
      border: 'border-amber-400 hover:border-amber-600',
      badgeBg: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      indicator: 'bg-amber-500',
      label: 'Perlu Revisi',
      desc: 'Laporan dikembalikan oleh PMO dengan catatan perbaikan yang wajib direvisi kontraktor.',
      canRemindWa: true,
    };
  }

  // 3. BIRU (Submitted)
  if (report && (report.approvalStatus === 'submitted' || report.approvalStatus === 'under_review')) {
    return {
      category: 'submitted',
      bg: 'bg-blue-50/70',
      border: 'border-blue-400 hover:border-blue-600',
      badgeBg: 'bg-blue-100 text-blue-900 border border-blue-300 font-bold',
      indicator: 'bg-blue-500',
      label: 'Submitted',
      desc: 'Laporan telah dikirim oleh kontraktor dan sedang menunggu review PMO.',
      canRemindWa: false,
    };
  }

  // Hari Libur (Minggu) tanpa laporan kerja aktif
  if (isSunday) {
    return {
      category: 'rest-day',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-500 border border-slate-200',
      indicator: 'bg-slate-300',
      label: 'Hari Libur',
      desc: 'Hari libur / tidak ada pekerjaan wajib.',
      canRemindWa: false,
    };
  }

  // Proyek selesai atau tanggal sebelum proyek dimulai (tidak dihitung terlambat kecuali ada draft overdue eksplisit)
  if (isCompletedProject || isBeforeProjectStart) {
    return {
      category: 'future',
      bg: 'bg-white',
      border: 'border-slate-200 text-slate-400',
      badgeBg: 'bg-slate-100 text-slate-400 border border-slate-200',
      indicator: 'bg-slate-300',
      label: '',
      desc: isCompletedProject ? 'Proyek telah selesai.' : 'Sebelum tanggal mulai proyek.',
      canRemindWa: false,
    };
  }

  // 4. MERAH (Terlambat / Lewat / Belum Diisi hingga hari dibuka dashboard)
  if (isPast) {
    return {
      category: 'overdue',
      bg: 'bg-red-50/70',
      border: 'border-red-300 hover:border-red-500',
      badgeBg: 'bg-red-100 text-red-800 border border-red-200 font-bold',
      indicator: 'bg-red-500',
      label: 'Terlambat',
      desc: 'Laporan terlewat dan belum diisi/dikirim kontraktor.',
      canRemindWa: true,
    };
  }

  // Hari Ini (Today) belum diserahkan
  if (isToday) {
    return {
      category: 'today',
      bg: 'bg-sky-50/60',
      border: 'border-sky-400 ring-2 ring-sky-200',
      badgeBg: 'bg-sky-100 text-sky-900 border border-sky-300 font-bold',
      indicator: 'bg-sky-500',
      label: 'Draft Hari Ini',
      desc: 'Laporan harian hari ini, siap diisi dan dikirim.',
      canRemindWa: false,
    };
  }

  // Future days
  return {
    category: 'future',
    bg: 'bg-white',
    border: 'border-slate-200 text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-400 border border-slate-200',
    indicator: 'bg-slate-300',
    label: '',
    desc: 'Tanggal mendatang.',
    canRemindWa: false,
  };
}

export interface MonthCalendarSummary {
  approvedCount: number;
  submittedCount: number;
  needsRevisionCount: number;
  overdueCount: number;
  overdueDates: string[];
  overdueDetails: { day: number; dateStr: string; label: string }[];
}

export function getMonthCalendarSummary(
  project: Project,
  projectReports: DailyReport[],
  year: number,
  monthZeroIndexed: number,
  todayStr: string
): MonthCalendarSummary {
  const totalDays = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const reportMap = new Map<string, DailyReport>();
  for (const r of projectReports) {
    reportMap.set(r.reportDate, r);
  }

  let approvedCount = 0;
  let submittedCount = 0;
  let needsRevisionCount = 0;
  const overdueDates: string[] = [];
  const overdueDetails: { day: number; dateStr: string; label: string }[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatYearMonthDay(year, monthZeroIndexed, d);
    const rep = reportMap.get(dateStr);
    const status = getCalendarDayStatusStyle(project, dateStr, rep, todayStr);

    if (status.category === 'approved') {
      approvedCount++;
    } else if (status.category === 'submitted') {
      submittedCount++;
    } else if (status.category === 'needs_revision') {
      needsRevisionCount++;
    } else if (status.category === 'overdue') {
      overdueDates.push(dateStr);
      overdueDetails.push({
        day: d,
        dateStr,
        label: `${d} ${INDONESIAN_MONTH_NAMES[monthZeroIndexed]}`,
      });
    }
  }

  return {
    approvedCount,
    submittedCount,
    needsRevisionCount,
    overdueCount: overdueDates.length,
    overdueDates,
    overdueDetails,
  };
}
