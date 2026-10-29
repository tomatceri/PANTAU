import React, { useState } from 'react';
import { Project, DailyReport, UserRole } from '../types';
import { 
  Building2, MapPin, Plus, ArrowRight, CheckCircle2, 
  AlertTriangle, AlertCircle, Calendar, Clock, Eye, 
  ShieldCheck, HardHat, Info, ChevronRight, CheckCheck, 
  RotateCcw, RefreshCw, Trash2 
} from 'lucide-react';
import { getRealTodayStr } from '../utils/formDefaults';
import { getMonthCalendarSummary, parseLocalDate } from '../utils/calendarStatus';

interface ProjectListProps {
  projects: Project[];
  allReports: DailyReport[];
  currentRole: UserRole;
  onSelectProject: (project: Project) => void;
  onSelectReportForReview: (project: Project, reportDate: string) => void;
  onAddProject: (newProject: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onToggleProjectStatus?: (projectId: string, newStatus: 'Active' | 'Completed') => void;
  onSyncFromCloud?: () => Promise<void>;
  isSyncingCloud?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  allReports,
  currentRole,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onSelectReportForReview,
  onToggleProjectStatus,
  onSyncFromCloud,
  isSyncingCloud,
}) => {
  // Real-time today string & current month/year for synchronized calendar counters
  const todayStr = getRealTodayStr();
  const todayDateObj = parseLocalDate(todayStr);
  const currentYear = todayDateObj.getFullYear();
  const currentMonth = todayDateObj.getMonth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectFilterTab, setProjectFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contractor, setContractor] = useState('');
  const [pmo, setPmo] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(todayStr);

  // Find all reports pending PMO review across all projects
  const pendingApprovalReports = allReports.filter(
    (r) => r.approvalStatus === 'submitted' || r.approvalStatus === 'under_review'
  );

  // Find all reports needing revision by contractors across all projects
  const needsRevisionReports = allReports.filter(
    (r) => r.approvalStatus === 'needs_revision'
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      contractorName: contractor.trim() || 'PT Kontraktor Lapangan',
      pmoLead: pmo.trim() || 'Tim Pengawas PMO',
      location: location.trim() || 'Lokasi Proyek',
      coordinates: '-6.2088° S, 106.8456° E',
      startDate: startDate || todayStr,
      targetDate: '2027-12-31',
      status: 'Active',
      description: 'Pekerjaan konstruksi dan pelaporan progres fisik harian.',
      targetSubmissionHour: 9,
    };

    onAddProject(newProj);
    setName('');
    setCode('');
    setContractor('');
    setPmo('');
    setLocation('');
    setStartDate(todayStr);
    setShowAddModal(false);
    onSelectProject(newProj);
  };

  const filteredProjects = projects.filter((p) => {
    if (projectFilterTab === 'active') return p.status !== 'Completed';
    if (projectFilterTab === 'completed') return p.status === 'Completed';
    return true;
  });

  const activeCount = projects.filter((p) => p.status !== 'Completed').length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* HERO BANNER: JELASKAN KEPANJANGAN PANTAU & PORTAL PERAN */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-100 text-xs font-semibold">
            <span className="font-extrabold text-white">PANTAU</span>
            <span aria-hidden="true">·</span>
            <span>Project Activity, Notification, Tracking &amp; Approval Unit</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Sistem Informasi &amp; Monitoring Laporan Harian Proyek
          </h1>

          <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
            <strong className="text-white font-bold">PANTAU</strong> merupakan singkatan dari{' '}
            <strong className="text-cyan-200 font-semibold">
              Project Activity, Notification, Tracking &amp; Approval Unit
            </strong>{' '}
            — unit sistem pelaporan progres konstruksi harian terpadu untuk pencatatan aktivitas lapangan, pengingat otomatis, pemantauan kalender real-time, serta verifikasi dan persetujuan dokumen resmi.
          </p>

          {/* Active Role Context Only (Strict Interface Separation) */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            {currentRole === 'contractor' ? (
              <div className="px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold bg-amber-400 text-slate-950 shadow-xs">
                <HardHat className="w-4 h-4 shrink-0" />
                <span>Portal Kontraktor (@kontraktor): Isi absensi, alat, cuaca, dokumentasi foto &amp; tindak lanjuti revisi</span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold bg-blue-400 text-slate-950 shadow-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Portal Pengawas PMO (@pmo): Verifikasi laporan harian, setujui/revisi dokumen &amp; kirim pengingat keterlambatan</span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KHUSUS KONTRAKTOR VIEW: PENGINGAT REVISI LAPORAN */}
      {currentRole === 'contractor' && (
        <div className="bg-amber-50/70 border-2 border-amber-400 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                📝
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Pengingat Revisi Laporan</span>
                  {needsRevisionReports.length > 0 ? (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-amber-600 text-white rounded-full">
                      {needsRevisionReports.length} Laporan Perlu Direvisi Segera
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-emerald-600 text-white rounded-full">
                      Tidak Ada Revisi Pending
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Daftar laporan harian yang dikembalikan oleh Tim Pengawas PMO dengan catatan perbaikan yang wajib segera diperbarui oleh kontraktor.
                </p>
              </div>
            </div>
          </div>

          {needsRevisionReports.length > 0 ? (
            <div className="divide-y divide-slate-200 border border-amber-200 rounded-lg overflow-hidden bg-white">
              {needsRevisionReports.map((rep) => {
                const repProject = projects.find((p) => p.id === rep.projectId) || projects[0];
                const latestNote =
                  rep.revisionNotes && rep.revisionNotes.length > 0
                    ? rep.revisionNotes[rep.revisionNotes.length - 1]
                    : null;

                return (
                  <div key={rep.id} className="p-3.5 space-y-2 hover:bg-amber-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {repProject.name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Tanggal Laporan: {rep.reportDate}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectReportForReview(repProject, rep.reportDate)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Buka & Perbaiki Laporan Sekarang →</span>
                      </button>
                    </div>

                    {latestNote && (
                      <div className="bg-amber-50/90 border border-amber-200 rounded p-2 text-xs text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-900">
                            Catatan Perbaikan PMO ({latestNote.author}):{' '}
                          </span>
                          <span className="italic text-slate-800">"{latestNote.text}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Bagus Sekali!</strong> Saat ini tidak ada laporan yang memerlukan revisi. Semua laporan yang dikirim telah disetujui atau sedang dalam antrean review PMO.
              </div>
            </div>
          )}
        </div>
      )}



      {/* KHUSUS PMO VIEW: WIDGET DAFTAR LAPORAN YANG MEMERLUKAN PERSETUJUAN */}
      {currentRole === 'pmo' && (
        <div className="bg-white border-2 border-blue-500/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Laporan Menunggu Persetujuan PMO</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                    {pendingApprovalReports.length} Laporan
                  </span>
                </h2>
                <p className="text-xs text-slate-600">
                  Laporan harian yang telah dikirim oleh kontraktor dan siap diverifikasi oleh tim pengawas PMO.
                </p>
              </div>
            </div>

            {needsRevisionReports.length > 0 && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 self-start sm:self-auto">
                {needsRevisionReports.length} Laporan Sedang Dalam Status Revisi
              </span>
            )}
          </div>

          {/* Pending Reports List */}
          {pendingApprovalReports.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {pendingApprovalReports.map((rep) => {
                const repProject = projects.find((p) => p.id === rep.projectId) || projects[0];

                return (
                  <div
                    key={rep.id}
                    className="p-3.5 bg-slate-50/60 hover:bg-blue-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {repProject.name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-bold text-blue-700">
                          Tanggal Laporan: {rep.reportDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>Kontraktor: <strong className="text-slate-800">{repProject.contractorName}</strong></span>
                        <span>·</span>
                        <span>PMO Lead: {repProject.pmoLead}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectReportForReview(repProject, rep.reportDate)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review & Setujui Laporan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Semua Laporan Telah Selesai Diverifikasi.</strong> Tidak ada laporan baru yang menunggu persetujuan PMO saat ini.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION HEADER: DAFTAR PROYEK DENGAN FILTER AKTIF / SELESAI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Daftar Proyek Konstruksi</span>
            <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {projects.length} Proyek Total
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Silakan klik salah satu kartu proyek di bawah untuk membuka <strong>Kalender Monitoring Harian</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Status Proyek: Aktif vs Selesai */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setProjectFilterTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                projectFilterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({projects.length})
            </button>
            <button
              onClick={() => setProjectFilterTab('active')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                projectFilterTab === 'active'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Aktif ({activeCount})</span>
            </button>
            <button
              onClick={() => setProjectFilterTab('completed')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                projectFilterTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏁 Selesai ({completedCount})</span>
            </button>
          </div>

          {onSyncFromCloud && (
            <button
              type="button"
              onClick={onSyncFromCloud}
              disabled={isSyncingCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
              title="Perbarui & sinkronkan data proyek serta laporan dari Vercel / Cloud Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
              <span>{isSyncingCloud ? 'Sinkronisasi...' : 'Sinkron dari Vercel / Cloud'}</span>
            </button>
          )}

          {currentRole === 'pmo' && (
            <button
              type="button"
              onClick={() => {
                setName('');
                setCode('');
                setContractor('');
                setPmo('');
                setLocation('');
                setStartDate(todayStr);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Proyek Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* GRID KARTU PROYEK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProjects.map((proj) => {
          const projReports = allReports.filter((r) => r.projectId === proj.id);
          const projSummary = getMonthCalendarSummary(
            proj,
            projReports,
            currentYear,
            currentMonth,
            todayStr
          );
          const approvedCount = projSummary.approvedCount;
          const submittedCount = projSummary.submittedCount;
          const revisionCount = projSummary.needsRevisionCount;
          const isCompleted = proj.status === 'Completed';
          const overdueCount = projSummary.overdueCount;

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className={`border-2 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4 ${
                isCompleted 
                  ? 'bg-slate-50/70 border-slate-300 hover:border-slate-400 opacity-90' 
                  : 'bg-white border-slate-200 hover:border-blue-500'
              }`}
            >
              <div className="space-y-3">
                {/* Status Peninjauan, Status Aktif/Selesai & Tombol Penyelesaian Proyek */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {submittedCount > 0 && currentRole === 'pmo' && !isCompleted && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-300">
                        {submittedCount} Perlu Ditinjau
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">
                        <span>🏁 Proyek Selesai</span>
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Proyek Aktif</span>
                      </span>
                    )}

                    {/* Fitur Penyelesaian Proyek: Toggle Status */}
                    {onToggleProjectStatus && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleProjectStatus(proj.id, isCompleted ? 'Active' : 'Completed');
                        }}
                        className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors border ${
                          isCompleted
                            ? 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={isCompleted ? 'Aktifkan kembali proyek ini' : 'Tandai proyek ini telah selesai dikerjakan'}
                      >
                        {isCompleted ? 'Aktifkan Lagi' : 'Tandai Selesai'}
                      </button>
                    )}

                    {/* Fitur Hapus Proyek (Khusus PMO) */}
                    {currentRole === 'pmo' && onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(proj);
                        }}
                        className="text-[11px] font-semibold px-2 py-1 rounded transition-colors border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex items-center gap-1 shadow-2xs"
                        title="Hapus proyek ini secara permanen"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nama Proyek */}
                <div>
                  <h3 className={`text-base md:text-lg font-bold transition-colors leading-snug ${
                    isCompleted ? 'text-slate-700' : 'text-slate-900 group-hover:text-blue-700'
                  }`}>
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{proj.description}</p>
                </div>

                {/* Metadata Lapangan */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Kontraktor: <strong className="text-slate-900">{proj.contractorName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Project Manager: <strong className="text-slate-900">{proj.pmoLead}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{proj.location}</span>
                  </div>
                </div>

                {/* Kepatuhan Status Sesuai 4 Kategori */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                    <div className="text-[10px] text-emerald-800 font-semibold">Disetujui</div>
                    <div className="font-mono font-bold text-emerald-700 text-base">{approvedCount}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="text-[10px] text-blue-800 font-semibold">Menunggu</div>
                    <div className="font-mono font-bold text-blue-700 text-base">{submittedCount}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <div className="text-[10px] text-amber-800 font-semibold">Revisi</div>
                    <div className="font-mono font-bold text-amber-700 text-base">{revisionCount}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="text-[10px] text-red-800 font-semibold">Terlambat</div>
                    <div className="font-mono font-bold text-red-700 text-base">{overdueCount}</div>
                  </div>
                </div>
              </div>

              {/* Tombol Utama Buka Kalender */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{isCompleted ? 'Lihat Arsip Kalender Proyek Selesai' : 'Pilih Proyek & Buka Kalender'}</span>
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL TAMBAH PROYEK BARU */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Proyek Konstruksi Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Proyek</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemasangan Pipa Transmisi Air Baku"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">PR/PO ID</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PR-2026-001 / PO-98124 / RTS-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kontraktor</label>
                <input
                  type="text"
                  placeholder="Contoh: PT. Bestindo Putra Mandiri"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Manager</label>
                <input
                  type="text"
                  placeholder="Contoh: Simun Riyanto / Winduri Purba"
                  value={pmo}
                  onChange={(e) => setPmo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lokasi Proyek</label>
                <input
                  type="text"
                  placeholder="Contoh: Unit Prasedimentasi"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Proyek</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Simpan & Buka Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PROYEK */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Proyek Konstruksi?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-rose-50/60 border border-rose-200 p-3.5 rounded-lg">
              <p>
                Anda akan menghapus proyek <strong className="text-slate-900">"{projectToDelete.name}"</strong> (ID: <span className="font-mono font-bold text-slate-900">{projectToDelete.code}</span>).
              </p>
              <p className="text-rose-800 font-medium">
                ⚠️ Seluruh data histori kalender harian dan laporan verifikasi terkait proyek ini akan ikut terhapus dari sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject) {
                    onDeleteProject(projectToDelete.id);
                  }
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Proyek Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
