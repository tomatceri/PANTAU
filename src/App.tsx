import React, { useState, useEffect } from 'react';
import { 
  Project, DailyReport, UserRole, EscalationAlert 
} from './types';
import { 
  INITIAL_PROJECTS, INITIAL_DAILY_REPORTS, 
  INITIAL_ESCALATION_ALERTS 
} from './data/initialData';
import { 
  DEFAULT_BOQ_ITEMS, DEFAULT_BOM_ITEMS, DEFAULT_MANPOWER, 
  DEFAULT_EQUIPMENT, DEFAULT_ATTENDEES, createDefault24hWeather,
  getRealTodayStr, formatIndonesianDate 
} from './utils/formDefaults';
import { getMonthCalendarSummary, parseLocalDate } from './utils/calendarStatus';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { ProjectList } from './components/ProjectList';
import { DualCalendar } from './components/DualCalendar';
import { DailyReportForm } from './components/DailyReportForm';
import { EscalationModal } from './components/EscalationModal';
import { SupabaseModal } from './components/SupabaseModal';
import { 
  saveReportToSupabase, 
  loadReportsFromSupabase,
  inferProjectsFromReports,
  getStoredCustomProjects,
  saveStoredCustomProjects,
  subscribeToSupabaseReports,
  registerProjectMeta
} from './services/supabaseReportService';
import { CheckCircle2, AlertTriangle, AlertCircle, CalendarDays, Database, Trash2 } from 'lucide-react';

const AUTH_SESSION_KEY = 'pantau_auth_session';

interface AuthSession {
  role: UserRole;
  username: string;
}

export default function App() {
  // Authentication session state (strictly separates Contractor & PMO interfaces)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthSession;
        if (
          (parsed.role === 'contractor' && parsed.username === '@kontraktor') ||
          (parsed.role === 'pmo' && parsed.username === '@pmo')
        ) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  // Application State - Initialized with initial projects + any custom projects saved in browser
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = getStoredCustomProjects();
    const map = new Map<string, Project>();
    INITIAL_PROJECTS.forEach((p) => {
      map.set(p.id, p);
      registerProjectMeta(p);
    });
    stored.forEach((p) => {
      map.set(p.id, p);
      registerProjectMeta(p);
    });
    return Array.from(map.values());
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const currentRole: UserRole = authSession?.role || 'contractor';
  const [activeTab, setActiveTab] = useState<'calendar' | 'daily'>('calendar');

  const [dailyReports, setDailyReports] = useState<DailyReport[]>(INITIAL_DAILY_REPORTS);
  const [escalationLog, setEscalationLog] = useState<EscalationAlert[]>(INITIAL_ESCALATION_ALERTS);

  // Active daily report being edited / viewed
  const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);

  // Modals state & Cloud sync status
  const [isEscalationOpen, setIsEscalationOpen] = useState(false);
  const [escalationDate, setEscalationDate] = useState<string | undefined>(undefined);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseNotification, setSupabaseNotification] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  // Function to sync both projects and reports from Supabase (Cloud & Vercel shared DB)
  const syncFromSupabase = React.useCallback(async (silent = false) => {
    if (!silent) setIsSyncingCloud(true);
    try {
      const remoteReports = await loadReportsFromSupabase();
      if (remoteReports && remoteReports.length > 0) {
        setDailyReports((prev) => {
          const map = new Map<string, DailyReport>();
          prev.forEach((r) => map.set(r.id, r));
          remoteReports.forEach((r) => map.set(r.id, r));
          return Array.from(map.values());
        });

        // Automatically infer and discover any projects from remote reports
        setProjects((prev) => {
          const updated = inferProjectsFromReports(remoteReports, prev);
          return updated;
        });

        if (!silent) {
          setSupabaseNotification(`✓ Berhasil menyinkronkan data dari Cloud/Vercel (${remoteReports.length} laporan)`);
          setTimeout(() => setSupabaseNotification(''), 4000);
        }
      }
    } catch (err) {
      console.warn('[Sync] Failed to sync from cloud:', err);
    } finally {
      if (!silent) setIsSyncingCloud(false);
    }
  }, []);

  // Initial load & automatic sync with Cloud / Vercel
  useEffect(() => {
    syncFromSupabase(true);

    // Auto-sync whenever user focuses the window (e.g. returning from Vercel tab)
    const handleWindowFocus = () => {
      syncFromSupabase(true);
    };
    window.addEventListener('focus', handleWindowFocus);

    // Subscribe to realtime database changes from Supabase
    const unsubscribe = subscribeToSupabaseReports(() => {
      syncFromSupabase(true);
    });

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      unsubscribe();
    };
  }, [syncFromSupabase]);

  // Real-time current date state (auto-updates per day dashboard is opened)
  const [todayStr, setTodayStr] = useState<string>(() => getRealTodayStr());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  useEffect(() => {
    const syncToday = () => {
      const latestToday = getRealTodayStr();
      setTodayStr((prev) => {
        if (prev !== latestToday) {
          const dt = parseLocalDate(latestToday);
          setCalendarYear(dt.getFullYear());
          setCalendarMonth(dt.getMonth());
          return latestToday;
        }
        return prev;
      });
    };

    syncToday();
    const intervalId = window.setInterval(syncToday, 60_000);
    window.addEventListener('focus', syncToday);
    document.addEventListener('visibilitychange', syncToday);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncToday);
      document.removeEventListener('visibilitychange', syncToday);
    };
  }, []);

  // Reports for current project
  const currentProjectDailies = selectedProject
    ? dailyReports.filter((r) => r.projectId === selectedProject.id)
    : [];
  const todayReport = currentProjectDailies.find((r) => r.reportDate === todayStr);

  // Sinkron penuh 1:1 antara Summary (Hijau, Biru, Oranye, Merah), Reminder Keterlambatan, dan Kalender aktual
  const calendarSummary = React.useMemo(() => {
    if (!selectedProject) {
      return {
        approvedCount: 0,
        submittedCount: 0,
        needsRevisionCount: 0,
        overdueCount: 0,
        overdueDates: [] as string[],
        overdueDetails: [],
      };
    }
    return getMonthCalendarSummary(
      selectedProject,
      currentProjectDailies,
      calendarYear,
      calendarMonth,
      todayStr
    );
  }, [selectedProject, currentProjectDailies, calendarYear, calendarMonth, todayStr]);

  const {
    approvedCount,
    submittedCount,
    needsRevisionCount,
    overdueCount,
    overdueDates,
  } = calendarSummary;

  // Handler: Select a date to view or create daily report
  const handleSelectDate = (date: string) => {
    setSelectedReportDate(date);
    setActiveTab('daily');
  };

  // Handler: Add or update a daily report (stores in React state & Supabase database)
  const handleSaveDailyReport = (updatedReport: DailyReport) => {
    setDailyReports((prev) => {
      const index = prev.findIndex((r) => r.id === updatedReport.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = updatedReport;
        return copy;
      }
      return [...prev, updatedReport];
    });

    // Store all form "laporan harian" in Supabase database
    saveReportToSupabase(updatedReport).then((res) => {
      if (res.success) {
        setSupabaseNotification(`✓ Laporan ${updatedReport.reportNumber || updatedReport.reportDate} berhasil disimpan ke Supabase!`);
      } else {
        setSupabaseNotification(`ℹ Data disimpan lokal (${res.message})`);
      }
      setTimeout(() => setSupabaseNotification(''), 4500);
    });
  };

  // Handler: Add project (persist to memory, localStorage, and metadata)
  const handleAddProject = (newProj: Project) => {
    registerProjectMeta(newProj);
    setProjects((prev) => {
      const next = [...prev, newProj];
      saveStoredCustomProjects(next);
      return next;
    });
  };

  // Handler: Trigger escalation modal for a date
  const handleTriggerEscalation = (date: string) => {
    setEscalationDate(date);
    setIsEscalationOpen(true);
  };

  const handleSendEscalation = (alert: EscalationAlert) => {
    setEscalationLog((prev) => [alert, ...prev]);
  };

  // Handler: Toggle project completion status (Active vs Completed)
  const handleToggleProjectStatus = (projectId: string, newStatus: 'Active' | 'Completed') => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p));
      saveStoredCustomProjects(next);
      return next;
    });
    if (selectedProject?.id === projectId) {
      setSelectedProject((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Handler: Delete project (strictly PMO only)
  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projectId);
      saveStoredCustomProjects(next);
      return next;
    });
    setDailyReports((prev) => prev.filter((r) => r.projectId !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setSelectedReportDate(null);
    }
    setSupabaseNotification('✓ Proyek berhasil dihapus.');
    setTimeout(() => setSupabaseNotification(''), 3000);
  };

  // Current active report for Daily Report Form
  const activeDailyReport = selectedProject && selectedReportDate
    ? currentProjectDailies.find((r) => r.reportDate === selectedReportDate) || {
        id: `rep-${Date.now()}`,
        projectId: selectedProject.id,
        reportNumber: `REP-D-${selectedReportDate.replace(/-/g, '')}`,
        reportDate: selectedReportDate,
        nomorBpmpo: `BPMPO/2026/X/${selectedReportDate.replace(/-/g, '').slice(-3)}`,
        docCode: 'AAA/CONS/FM-014 Rev01',
        docEffectiveDate: '14 Juli 2025',
        docFooterCode: 'Daily Report-P2-ND000-JDU-09',
        submissionTiming: selectedReportDate < todayStr ? 'late' : 'upcoming',
        approvalStatus: 'draft',
        weather: { condition: 'Sunny', downtimeHours: 0, claimEligible: false, delayReason: '' },
        hourlyWeather: createDefault24hWeather('empty'),
        boqItems: [],
        bomItems: [],
        manpower: [],
        equipment: [],
        attendees: [
          { id: 'att-1', nama: '', jabatan: 'Supervisor', instansi: '' },
          { id: 'att-2', nama: '', jabatan: 'HSE', instansi: '' },
        ],
        materials: [],
        activities: [],
        photos: [],
        revisionNotes: [],
      }
    : selectedProject
    ? currentProjectDailies.find((r) => r.reportDate === todayStr) || currentProjectDailies[0]
    : null;

  const handleLoginSuccess = (role: UserRole, username: string) => {
    const session: AuthSession = { role, username };
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore storage errors
    }
    setSelectedProject(null);
    setSelectedReportDate(null);
    setActiveTab('calendar');
    setIsEscalationOpen(false);
    setAuthSession(session);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      // ignore storage errors
    }
    setSelectedProject(null);
    setSelectedReportDate(null);
    setActiveTab('calendar');
    setIsEscalationOpen(false);
    setAuthSession(null);
  };

  if (!authSession) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <Header
        currentRole={currentRole}
        loggedInUsername={authSession.username}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
          if (tab === 'calendar') setSelectedReportDate(null);
        }}
        overdueCount={overdueCount}
        onOpenEscalations={() => {
          setEscalationDate(undefined);
          setIsEscalationOpen(true);
        }}
        selectedProject={selectedProject}
        onBackToProjects={() => {
          setSelectedProject(null);
          setSelectedReportDate(null);
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Floating Supabase Sync Notification */}
      {supabaseNotification && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{supabaseNotification}</span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
        {/* VIEW 1: PROJECT SELECTION (If no project selected) */}
        {!selectedProject ? (
          <ProjectList
            projects={projects}
            allReports={dailyReports}
            currentRole={currentRole}
            onSelectProject={(p) => {
              const latestToday = getRealTodayStr();
              const dt = parseLocalDate(latestToday);
              setTodayStr(latestToday);
              setCalendarYear(dt.getFullYear());
              setCalendarMonth(dt.getMonth());
              setSelectedProject(p);
              setActiveTab('calendar');
              setSelectedReportDate(null);
            }}
            onSelectReportForReview={(proj, reportDate) => {
              const latestToday = getRealTodayStr();
              const dt = parseLocalDate(reportDate);
              setTodayStr(latestToday);
              setCalendarYear(dt.getFullYear());
              setCalendarMonth(dt.getMonth());
              setSelectedProject(proj);
              setSelectedReportDate(reportDate);
              setActiveTab('daily');
            }}
            onAddProject={handleAddProject}
            onToggleProjectStatus={handleToggleProjectStatus}
            onDeleteProject={handleDeleteProject}
            onSyncFromCloud={() => syncFromSupabase(false)}
            isSyncingCloud={isSyncingCloud}
          />
        ) : (
          /* VIEW 2: INSIDE SELECTED PROJECT WORKSPACE */
          <div className="space-y-5">
            {/* Project Header Banner & Status Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900">
                      {selectedProject.name}
                    </h1>
                    {selectedProject.status === 'Completed' ? (
                      <span className="text-xs text-slate-700 font-bold bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">
                        🏁 Proyek Selesai
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1" />
                        Proyek Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                    <span>Kontraktor: <strong className="text-slate-900">{selectedProject.contractorName}</strong></span>
                    <span>·</span>
                    <span>PMO Lead: <strong className="text-slate-900">{selectedProject.pmoLead}</strong></span>
                    <span>·</span>
                    <span>Lokasi: {selectedProject.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Fitur Penyelesaian Proyek */}
                  <button
                    onClick={() =>
                      handleToggleProjectStatus(
                        selectedProject.id,
                        selectedProject.status === 'Completed' ? 'Active' : 'Completed'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
                    title={
                      selectedProject.status === 'Completed'
                        ? 'Aktifkan kembali proyek ini'
                        : 'Tandai proyek ini telah selesai dikerjakan'
                    }
                  >
                    <span>
                      {selectedProject.status === 'Completed' ? 'Aktifkan Lagi' : 'Tandai Selesai'}
                    </span>
                  </button>

                  {/* Fitur Hapus Proyek (PMO Only) */}
                  {currentRole === 'pmo' && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Apakah Anda yakin ingin menghapus proyek "${selectedProject.name}"? Semua laporan harian proyek ini juga akan dihapus.`
                          )
                        ) {
                          handleDeleteProject(selectedProject.id);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors shadow-xs"
                      title="Hapus proyek ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Proyek</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Cards - Sinkron penuh dengan 4 warna status Kalender Monitoring */}
              {activeTab === 'calendar' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                  {/* Hijau (Approved) */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                      <span>Hijau (Approved)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                      {approvedCount}
                    </div>
                    <div className="text-[10px] text-emerald-800">laporan disetujui resmi PMO</div>
                  </div>

                  {/* Biru (Submitted) */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <div className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                      <span>Biru (Submitted)</span>
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-blue-700 tabular-nums mt-1">
                      {submittedCount}
                    </div>
                    <div className="text-[10px] text-blue-800">laporan menunggu review PMO</div>
                  </div>

                  {/* Oranye (Perlu Revisi) */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                      <span>Oranye (Revisi)</span>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums mt-1">
                      {needsRevisionCount}
                    </div>
                    <div className="text-[10px] text-amber-800">perlu perbaikan kontraktor</div>
                  </div>

                  {/* Merah (Terlambat) */}
                  <div className="bg-red-50/70 border border-red-200 rounded-lg p-3">
                    <div className="text-[11px] font-bold text-red-900 flex items-center justify-between">
                      <span>Merah (Terlambat)</span>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-700 tabular-nums mt-1">
                      {overdueCount}
                    </div>
                    <div className="text-[10px] text-red-800">belum dikirim / perlu diisi</div>
                  </div>

                  {/* Laporan Hari Ini */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2 sm:col-span-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Hari Ini ({formatIndonesianDate(todayStr).split(',')[0]} / {todayStr})</span>
                      <CalendarDays className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-2 truncate">
                      {todayReport?.approvalStatus === 'approved' 
                        ? '✓ Disetujui PMO' 
                        : todayReport?.approvalStatus === 'submitted' 
                        ? '⏳ Menunggu Review PMO' 
                        : todayReport?.approvalStatus === 'needs_revision'
                        ? '⚠️ Perlu Revisi'
                        : '📝 Siap Diisi Kontraktor'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      <button
                        onClick={() => handleSelectDate(todayStr)}
                        className="text-blue-700 hover:underline font-bold"
                      >
                        Buka Laporan Hari Ini →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TAB CONTENT: KALENDER MONITORING */}
            {activeTab === 'calendar' && (
              <DualCalendar
                project={selectedProject}
                reports={currentProjectDailies}
                currentRole={currentRole}
                currentYear={calendarYear}
                currentMonth={calendarMonth}
                todayStr={todayStr}
                onMonthChange={(year, month) => {
                  setCalendarYear(year);
                  setCalendarMonth(month);
                }}
                onSelectDate={handleSelectDate}
                onTriggerEscalation={handleTriggerEscalation}
              />
            )}

            {/* TAB CONTENT: FORM LAPORAN HARIAN */}
            {activeTab === 'daily' && activeDailyReport && (
              <DailyReportForm
                report={activeDailyReport}
                project={selectedProject}
                allReports={dailyReports}
                currentRole={currentRole}
                onSaveReport={handleSaveDailyReport}
                onBack={() => {
                  setActiveTab('calendar');
                  setSelectedReportDate(null);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* WhatsApp & Email Escalation / Pengingat Modal */}
      {selectedProject && (
        <EscalationModal
          isOpen={isEscalationOpen}
          onClose={() => setIsEscalationOpen(false)}
          project={selectedProject}
          reports={currentProjectDailies}
          overdueDates={overdueDates}
          todayStr={todayStr}
          escalationLog={escalationLog}
          onSendEscalation={handleSendEscalation}
          preselectedDate={escalationDate}
          currentRole={currentRole}
          onSelectDate={handleSelectDate}
        />
      )}

      {/* Supabase Database Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        dailyReports={dailyReports}
        onReportsReloaded={(newReports) => {
          setDailyReports(newReports);
        }}
      />

      {/* Clean Professional Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-700">PANTAU · Project Activity, Notification, Tracking &amp; Approval Unit</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Kalender 4 Warna Interaktif · Batas Pengiriman H+1 Jam 09:00 · Smart Escalation PMO
          </span>
        </div>
      </footer>
    </div>
  );
}
